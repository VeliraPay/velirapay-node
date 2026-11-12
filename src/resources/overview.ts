import { ApiResource, int, nullableNumber, string, type Attributes } from './api-resource.ts';

/** The dashboard's figures for the last 30 days. Everything else it carries, such as the funnel and what needs attention, is read with get(). */
export class Overview extends ApiResource {
    /** The currency the amounts are in. */
    readonly currency: string;

    /** What was paid in the period. */
    readonly volume: string;

    /** How the volume changed against the 30 days before, in percent, or null when nothing was paid then. */
    readonly volumeChangePercent: number | null;

    /** What the payouts confirmed in the period came to, at their charges' locked rates. */
    readonly sentVolume: string;

    /** How many charges were paid. */
    readonly paidCharges: number;

    /** Of the period's charges that were paid, expired or canceled, the share paid, in percent; null when there were none. */
    readonly conversionRatePercent: number | null;

    /** How many charges are waiting to be paid. */
    readonly pendingCharges: number;

    /** How many payment links take payments. */
    readonly activePaymentLinks: number;

    /** How many invoices are open. */
    readonly openInvoices: number;

    /** How many open invoices are past due. */
    readonly overdueInvoices: number;

    constructor(attributes: Attributes) {
        super(attributes);

        this.currency = string(attributes, 'currency');
        this.volume = string(attributes, 'volume', '0');
        this.volumeChangePercent = nullableNumber(attributes, 'volume_change_percent');
        this.sentVolume = string(attributes, 'sent_volume', '0');
        this.paidCharges = int(attributes, 'paid_charges');
        this.conversionRatePercent = nullableNumber(attributes, 'conversion_rate_percent');
        this.pendingCharges = int(attributes, 'pending_charges');
        this.activePaymentLinks = int(attributes, 'active_payment_links');
        this.openInvoices = int(attributes, 'open_invoices');
        this.overdueInvoices = int(attributes, 'overdue_invoices');
    }
}
