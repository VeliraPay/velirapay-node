import type { Page } from '../page.ts';
import type { ApiKeyCreateParams, ApiKeyUpdateParams, PageParams, RequestOptions } from '../params.ts';
import { ApiKey } from '../resources/api-key.ts';
import { path, Service } from './service.ts';

/** The /v1/api-keys endpoints. Reading needs api_keys:read and changing api_keys:write, and a key never reaches further than the key that asks. */
export class ApiKeyService extends Service {
    /** List the account's active keys in the API key's mode, newest first, without the keys themselves. */
    async list(params: PageParams = {}): Promise<Page<ApiKey>> {
        return this.page('/v1/api-keys', params, (apiKey) => new ApiKey(apiKey));
    }

    /** Iterate over every active key, newest first, fetching pages as they are reached. */
    async *iterator(params: Omit<PageParams, 'page'> = {}): AsyncGenerator<ApiKey, void, undefined> {
        yield* (await this.list(params)).autoPagingIterator();
    }

    /**
     * Create a key in the API key's mode. Its key property holds the key itself, shown this once; leaving permissions out gives full access.
     *
     * The answer is never kept for the idempotency key, so when it is lost, the library's retry or a repeat throws a ConflictError whose
     * wasReplayed() is true: the key was made, but cannot be shown again. Find it with list() by its name and createdAt, revoke() it,
     * and create another with a fresh idempotency key.
     */
    async create(params: ApiKeyCreateParams, options?: RequestOptions): Promise<ApiKey> {
        return new ApiKey(await this.request('POST', '/v1/api-keys', params, options));
    }

    /** Change a key's name, permissions or allowed_ips, only those given; null permissions gives full access and null allowed_ips anywhere. */
    async update(id: string, params: ApiKeyUpdateParams, options?: RequestOptions): Promise<ApiKey> {
        return new ApiKey(await this.request('PATCH', path('/v1/api-keys/%s', id), params, options));
    }

    /** Revoke a key, which is refused from its next request. */
    async revoke(id: string, options?: RequestOptions): Promise<void> {
        await this.respond('DELETE', path('/v1/api-keys/%s', id), undefined, options);
    }
}
