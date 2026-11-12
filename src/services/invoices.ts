import type { Page } from '../page.ts';
import type { InvoiceCreateParams, InvoiceListParams, RequestOptions } from '../params.ts';
import { Invoice } from '../resources/invoice.ts';
import { path, Service, withDecimalAmounts } from './service.ts';

/** The /v1/invoices endpoints. */
export class InvoiceService extends Service {
    /** Create an invoice, for a total or a list of items, and optionally email it to the customer. */
    async create(params: InvoiceCreateParams, options?: RequestOptions): Promise<Invoice> {
        const body = withDecimalAmounts(params, 'amount');

        if (Array.isArray(params.items)) {
            body.items = params.items.map((item) => withDecimalAmounts(item, 'quantity', 'unit_amount'));
        }

        return new Invoice(await this.request('POST', '/v1/invoices', body, options));
    }

    /** Retrieve an invoice by its id. */
    async retrieve(id: string): Promise<Invoice> {
        return new Invoice(await this.request('GET', path('/v1/invoices/%s', id)));
    }

    /** List invoices, newest first. */
    async list(params: InvoiceListParams = {}): Promise<Page<Invoice>> {
        return this.page('/v1/invoices', params, (invoice) => new Invoice(invoice));
    }

    /** Iterate over every invoice, newest first, fetching pages as they are reached. */
    async *iterator(params: Omit<InvoiceListParams, 'page'> = {}): AsyncGenerator<Invoice, void, undefined> {
        yield* (await this.list(params)).autoPagingIterator();
    }

    /** Email an open invoice to its customer, as a reminder when it was sent before. */
    async send(id: string, options?: RequestOptions): Promise<Invoice> {
        return new Invoice(await this.request('POST', path('/v1/invoices/%s/send', id), undefined, options));
    }

    /** Void an open invoice so it can no longer be paid. */
    async void(id: string, options?: RequestOptions): Promise<Invoice> {
        return new Invoice(await this.request('POST', path('/v1/invoices/%s/void', id), undefined, options));
    }
}
