import { randomUUID } from 'node:crypto';
import { ApiError, ConnectionError, InvalidArgumentError } from '../errors.ts';
import { ApiResponse } from './api-response.ts';

/** A fetch implementation, such as the global one. */
export type Fetch = (url: string, init: RequestInit) => Promise<Response>;

/** How the transport reaches the API. */
export interface TransportOptions {
    apiKey: string;
    fetch: Fetch;
    baseUrl: string;
    maxRetries: number;
    maxRetryAfter: number;
    timeout: number;
    userAgent: string;
    sleep?: (seconds: number) => Promise<void>;
}

/** The statuses worth another attempt for any request, Cloudflare's 520 to 524 for an origin it got no answer from included. */
const RETRYABLE_STATUSES = [429, 502, 503, 504, 520, 521, 522, 523, 524];

/** The codes Node gives a connection that could not be made or was cut off, which a fetch implementation may throw as they are. */
const NETWORK_ERROR_CODES = ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EPIPE', 'EAI_AGAIN', 'ENOTFOUND', 'EHOSTUNREACH', 'ENETUNREACH'];

/** Sends requests to the VeliraPay API and turns its answers into responses or errors. */
export class HttpTransport {
    readonly #options: TransportOptions;
    readonly #sleep: (seconds: number) => Promise<void>;
    #lastResponse: ApiResponse | null = null;

    constructor(options: TransportOptions) {
        this.#options = options;
        this.#sleep = options.sleep ?? ((seconds) => new Promise((resolve) => setTimeout(resolve, seconds * 1000)));
    }

    /** Send a request and return the successful response. */
    async request(method: string, path: string, query: object = {}, body?: object, idempotencyKey?: string): Promise<ApiResponse> {
        method = method.toUpperCase();

        if (typeof idempotencyKey === 'string' && idempotencyKey.trim() === '') {
            throw new InvalidArgumentError('An idempotency key cannot be blank: give one such as order-1042-attempt-1, or leave it out.');
        }

        // A retried write must not be carried out twice, so every attempt carries the same key.
        if (method !== 'GET' && idempotencyKey === undefined && this.#options.maxRetries > 0) {
            idempotencyKey = randomUUID();
        }

        const url = this.#url(path, query);
        const headers = this.#headers(body !== undefined, idempotencyKey);
        const payload = body === undefined ? undefined : encode(body);
        let attempt = 0;

        while (true) {
            let response: ApiResponse;

            try {
                response = await this.#send(method, url, headers, payload);
            } catch (error) {
                if (!isNetworkError(error)) {
                    throw error;
                }

                if (attempt >= this.#options.maxRetries) {
                    throw new ConnectionError(`Could not reach the VeliraPay API: ${this.#reason(error)}`, { cause: error });
                }

                await this.#sleep(backoff(attempt++));

                continue;
            }

            this.#lastResponse = response;

            if (response.isSuccessful()) {
                return response;
            }

            const delay = this.#retryDelay(method, response, attempt);

            if (delay === null) {
                throw ApiError.fromResponse(response);
            }

            await this.#sleep(delay);
            attempt++;
        }
    }

    /** The response to the most recent request. */
    lastResponse(): ApiResponse | null {
        return this.#lastResponse;
    }

    /** Send one attempt of a request. */
    async #send(method: string, url: string, headers: Headers, body: string | undefined): Promise<ApiResponse> {
        const response = await this.#options.fetch(url, {
            method,
            headers,
            body,
            redirect: 'manual',
            signal: AbortSignal.timeout(Math.ceil(this.#options.timeout * 1000)),
        });

        return new ApiResponse(response.status, response.headers, await response.text());
    }

    /** How long to wait before trying a failed request again, or null when it should not be retried. */
    #retryDelay(method: string, response: ApiResponse, attempt: number): number | null {
        if (attempt >= this.#options.maxRetries) {
            return null;
        }

        const retryAfter = response.retryAfter();

        // A conflict that says when to come back is an earlier request with the same idempotency key still being processed.
        const retryable = RETRYABLE_STATUSES.includes(response.status)
            || (response.status === 500 && method === 'GET')
            || (response.status === 409 && retryAfter !== null);

        if (!retryable) {
            return null;
        }

        if (retryAfter === null) {
            return backoff(attempt);
        }

        return retryAfter <= this.#options.maxRetryAfter ? retryAfter : null;
    }

    /** The address of a path, with its query string. */
    #url(path: string, query: object): string {
        const url = `${this.#options.baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
        const search = new URLSearchParams();

        for (const [key, value] of Object.entries(query)) {
            appendQuery(search, key, value);
        }

        const queryString = search.toString();

        return queryString === '' ? url : `${url}?${queryString}`;
    }

    /** The headers every attempt of a request carries. */
    #headers(hasBody: boolean, idempotencyKey: string | undefined): Headers {
        const headers = new Headers({
            Authorization: `Bearer ${this.#options.apiKey}`,
            Accept: 'application/json',
            'User-Agent': this.#options.userAgent,
        });

        if (hasBody) {
            headers.set('Content-Type', 'application/json');
        }

        if (idempotencyKey !== undefined) {
            try {
                headers.set('Idempotency-Key', idempotencyKey);
            } catch (error) {
                throw new InvalidArgumentError(`The idempotency key cannot be sent as a header: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
            }
        }

        return headers;
    }

    /** Say why a request could not reach the API. */
    #reason(error: unknown): string {
        if (error instanceof Error && error.name === 'TimeoutError') {
            return `no answer within ${this.#options.timeout} seconds.`;
        }

        const cause = error instanceof Error && error.cause instanceof Error ? error.cause : error;
        const code = typeof cause === 'object' && cause !== null && 'code' in cause && typeof cause.code === 'string' ? cause.code : null;

        if (cause instanceof Error && cause.message !== '') {
            return cause.message;
        }

        return code ?? (error instanceof Error ? error.message : String(error));
    }
}

/** Whether fetch failed to reach the API, or to read its answer, rather than the code calling it failing. */
function isNetworkError(error: unknown): boolean {
    if (error instanceof TypeError) {
        return true;
    }

    if (!(error instanceof Error)) {
        return false;
    }

    // node-fetch reports a connection or a body read that failed as a FetchError of the "system" type.
    if (error.name === 'TimeoutError' || error.name === 'AbortError' || (error.name === 'FetchError' && 'type' in error && error.type === 'system')) {
        return true;
    }

    return 'code' in error && typeof error.code === 'string' && NETWORK_ERROR_CODES.includes(error.code);
}

/** The wait before an attempt, in seconds: half a second, doubling each time, with some jitter. */
function backoff(attempt: number): number {
    return Math.min(8, 0.5 * 2 ** attempt) * (0.75 + Math.random() * 0.5);
}

/** Encode a request body as JSON. */
function encode(body: object): string {
    try {
        return JSON.stringify(body);
    } catch (error) {
        throw new InvalidArgumentError(`The request could not be encoded as JSON: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
    }
}

/** Add a parameter to a query string, leaving out null and undefined. */
function appendQuery(search: URLSearchParams, key: string, value: unknown): void {
    if (value === null || value === undefined) {
        return;
    }

    if (Array.isArray(value)) {
        for (const item of value) {
            appendQuery(search, `${key}[]`, item);
        }
    } else if (value instanceof Date) {
        search.append(key, value.toISOString());
    } else if (typeof value === 'boolean') {
        search.append(key, value ? '1' : '0');
    } else if (typeof value === 'object') {
        for (const [name, item] of Object.entries(value)) {
            appendQuery(search, `${key}[${name}]`, item);
        }
    } else {
        search.append(key, String(value));
    }
}
