import type { Page } from '../page.ts';
import type {
    ChargeCreateParams,
    ChargeListParams,
    PageParams,
    RefundAddressParams,
    RefundCompleteParams,
    RefundParams,
    RefundRequestCreateParams,
    RefundSentParams,
    RequestOptions,
    SimulateParams,
} from '../params.ts';
import type { Attributes } from '../resources/api-resource.ts';
import { Charge, type ApiCharge } from '../resources/charge.ts';
import { RefundRequest } from '../resources/refund-request.ts';
import { path, Service, withDecimalAmounts } from './service.ts';

/** The /v1/charges endpoints. */
export class ChargeService extends Service {
    /** Charge a customer: create a charge with what you already know about them, and send them to its checkoutUrl. */
    async create(params: ChargeCreateParams, options?: RequestOptions): Promise<ApiCharge> {
        return apiCharge(await this.request('POST', '/v1/charges', withDecimalAmounts(params, 'amount'), options));
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
        return apiCharge(await this.request('POST', path('/v1/charges/%s/refunds', id), withDecimalAmounts(params, 'amount'), options));
    }

    /** List a charge's refund requests, newest first. */
    async refundRequests(chargeId: string, params: PageParams = {}): Promise<Page<RefundRequest>> {
        return this.page(path('/v1/charges/%s/refund-requests', chargeId), params, (refundRequest) => new RefundRequest(refundRequest));
    }

    /** Retrieve one of a charge's refund requests. */
    async retrieveRefundRequest(chargeId: string, refundRequestId: string): Promise<RefundRequest> {
        return new RefundRequest(await this.request('GET', path('/v1/charges/%s/refund-requests/%s', chargeId, refundRequestId)));
    }

    /**
     * Start a refund, setting its amount aside at once so neither another refund request nor a recorded refund can take it twice.
     * Without an address, the customer is asked for one: the link is emailed to the charge's customer email when it has one, and is addressUrl either way.
     * VeliraPay never sends the refund: you do, from your own wallet, and VeliraPay watches the address for it.
     */
    async startRefund(chargeId: string, params: RefundRequestCreateParams, options?: RequestOptions): Promise<RefundRequest> {
        return new RefundRequest(await this.request('POST', path('/v1/charges/%s/refund-requests', chargeId), withDecimalAmounts(params, 'amount'), options));
    }

    /** Give the address the customer gave you some other way, while the refund still takes one. */
    async setRefundAddress(chargeId: string, refundRequestId: string, params: RefundAddressParams, options?: RequestOptions): Promise<RefundRequest> {
        return new RefundRequest(await this.request('POST', path('/v1/charges/%s/refund-requests/%s/address', chargeId, refundRequestId), params, options));
    }

    /** Give the hash of the transaction you sent the refund in, which the chain is then looked at for straight away. */
    async markRefundSent(chargeId: string, refundRequestId: string, params: RefundSentParams, options?: RequestOptions): Promise<RefundRequest> {
        return new RefundRequest(await this.request('POST', path('/v1/charges/%s/refund-requests/%s/sent', chargeId, refundRequestId), params, options));
    }

    /** Record the refund on your word, with the hash of its transaction when there is one, for a transfer the chain is not seen to carry. */
    async completeRefund(chargeId: string, refundRequestId: string, params: RefundCompleteParams = {}, options?: RequestOptions): Promise<RefundRequest> {
        return new RefundRequest(await this.request('POST', path('/v1/charges/%s/refund-requests/%s/complete', chargeId, refundRequestId), Object.keys(params).length === 0 ? undefined : params, options));
    }

    /** Email the customer the link to give the address again, which then works for another two weeks. */
    async resendRefundLink(chargeId: string, refundRequestId: string, options?: RequestOptions): Promise<RefundRequest> {
        return new RefundRequest(await this.request('POST', path('/v1/charges/%s/refund-requests/%s/resend', chargeId, refundRequestId), undefined, options));
    }

    /** Stop a refund that has not been recorded, which frees what it set aside. */
    async cancelRefund(chargeId: string, refundRequestId: string, options?: RequestOptions): Promise<RefundRequest> {
        return new RefundRequest(await this.request('POST', path('/v1/charges/%s/refund-requests/%s/cancel', chargeId, refundRequestId), undefined, options));
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
        return apiCharge(await this.request('POST', path('/v1/charges/%s/simulate', id), Object.keys(params).length === 0 ? undefined : withDecimalAmounts(params, 'amount'), options));
    }
}

/** Read a charge the API answered with, which always carries its checkout page. */
function apiCharge(attributes: Attributes): ApiCharge {
    return new Charge(attributes) as ApiCharge;
}
