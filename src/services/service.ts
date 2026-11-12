import { InvalidArgumentError, UnexpectedResponseError } from '../errors.ts';
import type { ApiResponse } from '../http/api-response.ts';
import type { HttpTransport } from '../http/transport.ts';
import { Page, type PagePosition } from '../page.ts';
import type { RequestOptions } from '../params.ts';
import { isRecord, type ApiResource, type Attributes } from '../resources/api-resource.ts';

/** A class of page, such as Page itself or one that reads more of the list's meta. */
type PageKind<T extends ApiResource, P extends Page<T>> = new (data: T[], position: PagePosition, fetch: (page: number) => Promise<P>, meta: Attributes) => P;

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

    /** Fetch one page of a list, as a Page unless another kind is given. */
    protected async page<T extends ApiResource, P extends Page<T> = Page<T>>(path: string, params: object, hydrate: (attributes: Attributes) => T, kind: PageKind<T, P> = Page as unknown as PageKind<T, P>): Promise<P> {
        const response = await this.transport.request('GET', path, params);
        const data = list(response).map(hydrate);
        const metadata = meta(response);
        const currentPage = integer(metadata['current_page'], 1);

        return new kind(data, {
            currentPage,
            lastPage: integer(metadata['last_page'], currentPage),
            perPage: integer(metadata['per_page'], data.length),
            total: integer(metadata['total'], data.length),
        }, (page) => this.page(path, { ...params, page }, hydrate, kind), metadata);
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

/** A copy of the params with the amounts under the given keys, alone or in a list, written as the API reads them. */
export function withDecimalAmounts<T extends object>(params: T, ...keys: string[]): T {
    const copy: Attributes = { ...(params as Attributes) };

    for (const key of keys) {
        if (Object.hasOwn(copy, key)) {
            const value = copy[key];

            copy[key] = Array.isArray(value) ? value.map((item: unknown) => decimalAmount(item, key)) : decimalAmount(value, key);
        }
    }

    return copy as T;
}

/** An amount as the API reads it: a string as it is, and a number written out in full, since the API refuses exponent notation such as 5e-7. */
function decimalAmount(value: unknown, key: string): unknown {
    if (typeof value !== 'number') {
        return value;
    }

    if (!Number.isFinite(value)) {
        throw new InvalidArgumentError(`The ${key} must be a finite number, or a string such as "49.90", not ${value}.`);
    }

    // String() gives the shortest digits that read back as the same number, so moving its point loses nothing.
    const [, sign = '', whole = '', fraction = '', exponent] = /^(-?)(\d+)(?:\.(\d+))?e([+-]\d+)$/.exec(String(value)) ?? [];

    if (exponent === undefined) {
        return String(value);
    }

    const digits = whole + fraction;
    const point = whole.length + Number(exponent);

    if (point <= 0) {
        return `${sign}0.${'0'.repeat(-point)}${digits}`;
    }

    return point >= digits.length ? `${sign}${digits}${'0'.repeat(point - digits.length)}` : `${sign}${digits.slice(0, point)}.${digits.slice(point)}`;
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
