import type { ProPaymentParams, RequestOptions } from '../params.ts';
import { ProPayment } from '../resources/pro-payment.ts';
import { data, meta, Service } from './service.ts';

/** The /v1/billing endpoints. Needs billing:write and a live key. */
export class BillingService extends Service {
    /** Start paying for a month of Pro in a coin, answering with the checkout to pay it on, or with the payment already waiting in that coin. */
    async startProPayment(params: ProPaymentParams, options?: RequestOptions): Promise<ProPayment> {
        const response = await this.respond('POST', '/v1/billing/pro', params, options);

        return new ProPayment(data(response), meta(response));
    }
}
