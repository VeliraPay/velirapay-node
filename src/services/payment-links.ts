import type { Page } from '../page.ts';
import type { PaymentLinkCreateParams, PaymentLinkListParams, PaymentLinkUpdateParams, RequestOptions } from '../params.ts';
import { PaymentLink } from '../resources/payment-link.ts';
import { path, Service, withDecimalAmounts } from './service.ts';

/** The amounts a payment link takes, which go out as decimal strings. */
const AMOUNTS = ['amount', 'suggested_amounts', 'min_amount', 'max_amount'];

/** The /v1/payment-links endpoints. */
export class PaymentLinkService extends Service {
    /** Create a payment link: one reusable public page, never one per customer. */
    async create(params: PaymentLinkCreateParams, options?: RequestOptions): Promise<PaymentLink> {
        return new PaymentLink(await this.request('POST', '/v1/payment-links', withDecimalAmounts(params, ...AMOUNTS), options));
    }

    /** Retrieve a payment link by its id. */
    async retrieve(id: string): Promise<PaymentLink> {
        return new PaymentLink(await this.request('GET', path('/v1/payment-links/%s', id)));
    }

    /** Change any of a payment link's fields. */
    async update(id: string, params: PaymentLinkUpdateParams, options?: RequestOptions): Promise<PaymentLink> {
        return new PaymentLink(await this.request('PATCH', path('/v1/payment-links/%s', id), withDecimalAmounts(params, ...AMOUNTS), options));
    }

    /** List payment links, newest first. */
    async list(params: PaymentLinkListParams = {}): Promise<Page<PaymentLink>> {
        return this.page('/v1/payment-links', params, (link) => new PaymentLink(link));
    }

    /** Iterate over every payment link, newest first, fetching pages as they are reached. */
    async *iterator(params: Omit<PaymentLinkListParams, 'page'> = {}): AsyncGenerator<PaymentLink, void, undefined> {
        yield* (await this.list(params)).autoPagingIterator();
    }

    /** Archive a payment link so it stops taking payments. */
    async archive(id: string, options?: RequestOptions): Promise<PaymentLink> {
        return new PaymentLink(await this.request('POST', path('/v1/payment-links/%s/archive', id), undefined, options));
    }

    /** Restore an archived payment link. */
    async restore(id: string, options?: RequestOptions): Promise<PaymentLink> {
        return new PaymentLink(await this.request('DELETE', path('/v1/payment-links/%s/archive', id), undefined, options));
    }
}
