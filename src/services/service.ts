import { InvalidArgumentError, UnexpectedResponseError } from '../errors.ts';
import type { ApiResponse } from '../http/api-response.ts';
import type { HttpTransport } from '../http/transport.ts';
import { Page } from '../page.ts';
import type { RequestOptions } from '../params.ts';
import { isRecord, type ApiResource, type Attributes } from '../resources/api-resource.ts';

/** The requests shared by every group of endpoints. */
export abstract class Service {
    protected readonly transport: HttpTransport;

    constructor(transport: HttpTransport) {
        this.transport = transport;
    }

    /** Send a request and return the object under the response's "data" key. */
    protected async request(method: string, path: string, body?: object, options?: RequestOptions): Promise<Attributes> {
        return data(await this.respond(method, path, body, options));
    }

    /** Send a request and return the whole response, for answers whose meta matters too. */
    protected respond(method: string, path: string, body?: object, options?: RequestOptions): Promise<ApiResponse> {
        return this.transport.request(method, path, {}, body, options?.idempotencyKey);
    }

    /** Fetch one page of a list. */
    protected async page<T extends ApiResource>(path: string, params: object, hydrate: (attributes: Attributes) => T): Promise<Page<T>> {
        const response = await this.transport.request('GET', path, params);
        const data = list(response).map(hydrate);
        const json = response.json();
        const meta = isRecord(json['meta']) ? json['meta'] : {};
        const currentPage = integer(meta['current_page'], 1);

        return new Page(data, {
            currentPage,
            lastPage: integer(meta['last_page'], currentPage),
            perPage: integer(meta['per_page'], data.length),
            total: integer(meta['total'], data.length),
        }, (page) => this.page(path, { ...params, page }, hydrate));
    }
}

/** Read the object under a response's "data" key. */
export function data(response: ApiResponse): Attributes {
    const value = response.json()['data'];

    if (!isRecord(value)) {
        throw new UnexpectedResponseError('The VeliraPay API answered without the object it was asked for.', response);
    }

    return value;
}

/** Read what is under a response's "meta" key. */
export function meta(response: ApiResponse): Attributes {
    const value = response.json()['meta'];

    return isRecord(value) ? value : {};
}

/** Read the objects of the list under a response's "data" key. */
export function list(response: ApiResponse): Attributes[] {
    const value = response.json()['data'];

    if (!Array.isArray(value)) {
        throw new UnexpectedResponseError('The VeliraPay API answered without the list it was asked for.', response);
    }

    return value.filter(isRecord);
}

/** Build a path with the given ids escaped into its %s placeholders. */
export function path(format: string, ...ids: string[]): string {
    let index = 0;

    return format.replace(/%s/g, () => {
        const id = ids[index++];

        if (typeof id !== 'string' || id.trim() === '') {
            throw new InvalidArgumentError(`The id in ${format.replace(/%s/g, '{id}')} cannot be empty.`);
        }

        // Fetch would read these as the current and parent path, and send the request elsewhere.
        if (id === '.' || id === '..') {
            throw new InvalidArgumentError(`The id in ${format.replace(/%s/g, '{id}')} cannot be "${id}".`);
        }

        return encodeURIComponent(id);
    });
}

/** Read an integer from list metadata. */
function integer(value: unknown, fallback: number): number {
    if (typeof value === 'number' && Number.isInteger(value)) {
        return value;
    }

    return typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : fallback;
}
