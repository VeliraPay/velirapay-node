import type { Page } from '../page.ts';
import type { ChargeCreateParams, ChargeListParams, RefundParams, RequestOptions, SimulateParams } from '../params.ts';
import type { Attributes } from '../resources/api-resource.ts';
import { Charge, type ApiCharge } from '../resources/charge.ts';
import { path, Service } from './service.ts';

/** The /v1/charges endpoints. */
export class ChargeService extends Service {
    /** Charge a customer: create a charge with what you already know about them, and send them to its checkoutUrl. */
    async create(params: ChargeCreateParams, options?: RequestOptions): Promise<ApiCharge> {
        return apiCharge(await this.request('POST', '/v1/charges', params, options));
    }

    /** Retrieve a charge by its id. */
    async retrieve(id: string): Promise<ApiCharge> {
        return apiCharge(await this.request('GET', path('/v1/charges/%s', id)));
    }

    /** List charges, newest first. */
    async list(params: ChargeListParams = {}): Promise<Page<ApiCharge>> {
        return this.page('/v1/charges', params, apiCharge);
    }

    /** Iterate over every charge, newest first, fetching pages as they are reached. */
    async *iterator(params: Omit<ChargeListParams, 'page'> = {}): AsyncGenerator<ApiCharge, void, undefined> {
        yield* (await this.list(params)).autoPagingIterator();
    }

    /** Cancel a pending charge that no transfer has been seen for, so it can no longer be paid. */
    async cancel(id: string, options?: RequestOptions): Promise<ApiCharge> {
        return apiCharge(await this.request('POST', path('/v1/charges/%s/cancel', id), undefined, options));
    }

    /** Record a refund you sent the customer from your own wallet. An underpaid charge or a late payment is accepted first, and the network surcharge is never refundable. */
    async recordRefund(id: string, params: RefundParams, options?: RequestOptions): Promise<ApiCharge> {
        return apiCharge(await this.request('POST', path('/v1/charges/%s/refunds', id), params, options));
    }

    /** Email the customer the payment page of a pending charge. */
    async send(id: string, options?: RequestOptions): Promise<ApiCharge> {
        return apiCharge(await this.request('POST', path('/v1/charges/%s/send', id), undefined, options));
    }

    /** Accept an underpaid charge, or a late payment on an expired or canceled one, as paid for what arrived and confirmed. */
    async accept(id: string, options?: RequestOptions): Promise<ApiCharge> {
        return apiCharge(await this.request('POST', path('/v1/charges/%s/accept', id), undefined, options));
    }

    /** Pay a test-mode charge without coins, in full or by a chosen amount in the charge's coin. */
    async simulate(id: string, params: SimulateParams = {}, options?: RequestOptions): Promise<ApiCharge> {
        return apiCharge(await this.request('POST', path('/v1/charges/%s/simulate', id), Object.keys(params).length === 0 ? undefined : params, options));
    }
}

/** Read a charge the API answered with, which always carries its checkout page. */
function apiCharge(attributes: Attributes): ApiCharge {
    return new Charge(attributes) as ApiCharge;
}
