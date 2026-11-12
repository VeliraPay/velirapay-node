import type { Page } from '../page.ts';
import type { PayoutListParams } from '../params.ts';
import { Payout, PayoutSummary } from '../resources/payout.ts';
import { path, Service } from './service.ts';

/** The /v1/payouts endpoints. They only read: payouts go out on their own. */
export class PayoutService extends Service {
    /** Retrieve the payout of a charge, by the charge's id; 404 until the charge is paid. */
    async retrieve(charge: string): Promise<Payout> {
        return new Payout(await this.request('GET', path('/v1/payouts/%s', charge)));
    }

    /** List payouts, newest first. */
    async list(params: PayoutListParams = {}): Promise<Page<Payout>> {
        return this.page('/v1/payouts', params, (payout) => new Payout(payout));
    }

    /** Iterate over every payout, newest first, fetching pages as they are reached. */
    async *iterator(params: Omit<PayoutListParams, 'page'> = {}): AsyncGenerator<Payout, void, undefined> {
        yield* (await this.list(params)).autoPagingIterator();
    }

    /** Add up, per coin, what has been paid out, what is on its way and what is still owed. */
    async summary(): Promise<PayoutSummary[]> {
        return (await this.page('/v1/payouts/summary', {}, (row) => new PayoutSummary(row))).data;
    }
}
