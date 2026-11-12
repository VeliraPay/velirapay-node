import type { ApiResponse } from '../http/api-response.ts';
import type { Page } from '../page.ts';
import type { PageParams, RequestOptions, WebhookDeliveryListParams, WebhookEndpointCreateParams, WebhookEndpointUpdateParams } from '../params.ts';
import { WebhookDelivery, WebhookEndpoint } from '../resources/webhook-endpoint.ts';
import { data, meta, path, Service } from './service.ts';

/** The /v1/webhook-endpoints endpoints. Changing them needs webhook_endpoints:write. */
export class WebhookEndpointService extends Service {
    /** List the account's webhook endpoints in the API key's mode, newest first. */
    async list(params: PageParams = {}): Promise<Page<WebhookEndpoint>> {
        return this.page('/v1/webhook-endpoints', params, (endpoint) => new WebhookEndpoint(endpoint));
    }

    /** Iterate over every webhook endpoint, newest first, fetching pages as they are reached. */
    async *iterator(params: Omit<PageParams, 'page'> = {}): AsyncGenerator<WebhookEndpoint, void, undefined> {
        yield* (await this.list(params)).autoPagingIterator();
    }

    /** Retrieve one webhook endpoint. */
    async retrieve(id: string): Promise<WebhookEndpoint> {
        return new WebhookEndpoint(await this.request('GET', path('/v1/webhook-endpoints/%s', id)));
    }

    /** Add an endpoint and send it its verification challenge. The answer carries its signing secret, shown this once, and verificationError while it has not answered. */
    async create(params: WebhookEndpointCreateParams, options?: RequestOptions): Promise<WebhookEndpoint> {
        return endpoint(await this.respond('POST', '/v1/webhook-endpoints', params, options));
    }

    /** Change an endpoint's url, events, description or active, only those given. A new url is verified again. */
    async update(id: string, params: WebhookEndpointUpdateParams, options?: RequestOptions): Promise<WebhookEndpoint> {
        return endpoint(await this.respond('PATCH', path('/v1/webhook-endpoints/%s', id), params, options));
    }

    /** Delete an endpoint and its delivery history. */
    async delete(id: string, options?: RequestOptions): Promise<void> {
        await this.respond('DELETE', path('/v1/webhook-endpoints/%s', id), undefined, options);
    }

    /** Send the endpoint its verification challenge again. One that does not answer is refused with a ValidationError saying what it answered instead. */
    async verify(id: string, options?: RequestOptions): Promise<WebhookEndpoint> {
        return new WebhookEndpoint(await this.request('POST', path('/v1/webhook-endpoints/%s/verify', id), undefined, options));
    }

    /** Queue a sample charge.paid event, marked as a test, to a verified endpoint. */
    async test(id: string, options?: RequestOptions): Promise<WebhookDelivery> {
        return new WebhookDelivery(await this.request('POST', path('/v1/webhook-endpoints/%s/test', id), undefined, options));
    }

    /** Replace the endpoint's signing secret. The answer carries the new one, shown this once; the old one keeps signing for a day, until previousSecretExpiresAt. */
    async rotateSecret(id: string, options?: RequestOptions): Promise<WebhookEndpoint> {
        return endpoint(await this.respond('POST', path('/v1/webhook-endpoints/%s/secret', id), undefined, options));
    }

    /** List what the endpoint was sent, newest first, kept for 30 days. */
    async deliveries(id: string, params: WebhookDeliveryListParams = {}): Promise<Page<WebhookDelivery>> {
        return this.page(path('/v1/webhook-endpoints/%s/deliveries', id), params, (delivery) => new WebhookDelivery(delivery));
    }

    /** Retrieve one of the endpoint's deliveries with every attempt to send it, the latest first, and the JSON body it carried when the key may also read events. */
    async retrieveDelivery(id: string, deliveryId: string): Promise<WebhookDelivery> {
        return new WebhookDelivery(await this.request('GET', path('/v1/webhook-endpoints/%s/deliveries/%s', id, deliveryId)));
    }

    /** Send one of the endpoint's deliveries again, once the endpoint is verified and not paused. */
    async retryDelivery(id: string, deliveryId: string, options?: RequestOptions): Promise<WebhookDelivery> {
        return new WebhookDelivery(await this.request('POST', path('/v1/webhook-endpoints/%s/deliveries/%s/retry', id, deliveryId), undefined, options));
    }
}

/** Read the endpoint and its meta from an answer. */
function endpoint(response: ApiResponse): WebhookEndpoint {
    return new WebhookEndpoint(data(response), meta(response));
}
