import { readFileSync } from 'node:fs';
import { VeliraPayClient, type ClientOptions } from '../src/index.ts';

/** A fetch that answers with queued responses and records every request. */
export class MockFetch {
    readonly requests: Request[] = [];
    readonly #queue: (Response | Error)[] = [];

    /** Queue responses or errors for the next requests. */
    queue(...responses: (Response | Error)[]): this {
        this.#queue.push(...responses);

        return this;
    }

    /** Queue a JSON response. */
    json(body: unknown, status = 200, headers: Record<string, string> = {}): this {
        return this.queue(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } }));
    }

    /** Queue an answer without a body, such as a 204. */
    empty(status = 204): this {
        return this.queue(new Response(null, { status }));
    }

    readonly fetch = async (url: string, init: RequestInit): Promise<Response> => {
        const request = new Request(url, init);
        this.requests.push(request);

        const next = this.#queue.shift();

        if (next === undefined) {
            throw new Error(`No response was queued for ${request.method} ${request.url}.`);
        }

        if (next instanceof Error) {
            throw next;
        }

        return next;
    };

    /** The most recent request. */
    lastRequest(): Request {
        const request = this.requests.at(-1);

        if (request === undefined) {
            throw new Error('No request was sent.');
        }

        return request;
    }
}

/** A client that sends its requests to the mocked fetch, without retries unless asked. */
export function client(http: MockFetch, apiKey = 'vp_test_secret', options: ClientOptions = {}): VeliraPayClient {
    return new VeliraPayClient(apiKey, { fetch: http.fetch, maxRetries: 0, ...options });
}

/** A JSON fixture, decoded. */
export function fixture(name: string): Record<string, unknown> {
    return JSON.parse(payload(name)) as Record<string, unknown>;
}

/** A JSON fixture, exactly as it is on disk. */
export function payload(name: string): string {
    return readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8');
}

/** Objects wrapped in a list response. */
export function listResponse(data: unknown[], page: { currentPage?: number; lastPage?: number; perPage?: number; total?: number } = {}): Record<string, unknown> {
    const { currentPage = 1, lastPage = 1, perPage = 25, total = data.length } = page;

    return {
        data,
        links: { first: null, last: null, prev: null, next: null },
        meta: {
            current_page: currentPage,
            from: data.length === 0 ? null : (currentPage - 1) * perPage + 1,
            last_page: lastPage,
            path: 'https://api.velirapay.com/v1/charges',
            per_page: perPage,
            to: data.length === 0 ? null : (currentPage - 1) * perPage + data.length,
            total,
        },
    };
}

/** A request's JSON body, decoded. */
export async function body(request: Request): Promise<unknown> {
    return JSON.parse(await request.clone().text());
}

/** A request's path. */
export function pathOf(request: Request): string {
    return new URL(request.url).pathname;
}

/** A request's query parameters. */
export function queryOf(request: Request): Record<string, string> {
    return Object.fromEntries(new URL(request.url).searchParams);
}
