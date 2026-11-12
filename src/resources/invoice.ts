import { InvoiceStatus, type Asset, type ChargeStatus, type Currency, type OrString } from '../enums.ts';
import { ApiResource, date, nullableBool, nullableString, objects, records, string, type Attributes } from './api-resource.ts';

/** A charge made to pay an invoice, one per coin the customer tried. */
export interface InvoiceCharge {
    id: string;
    status: OrString<ChargeStatus>;
    asset: OrString<Asset>;
}

/** A bill sent to one customer, paid through a hosted page in the coin they choose. */
export class Invoice extends ApiResource {
    /** The invoice's public code, also the last segment of its hosted URL. */
    readonly id: string;

    /** The invoice number shown to the customer. */
    readonly number: string;

    /** One of the InvoiceStatus values: open, paid or void. */
    readonly status: OrString<InvoiceStatus>;

    /** Whether the invoice is open past its due date; absent from webhooks. */
    readonly overdue: boolean | null;

    /** The customer's name. */
    readonly customerName: string;

    /** The customer's email address. */
    readonly customerEmail: string;

    /** A note shown on the invoice. */
    readonly memo: string | null;

    /** The total due. */
    readonly amount: string;

    /** The fiat currency, such as "USD". */
    readonly currency: OrString<Currency>;

    /** The lines of an itemised invoice. */
    readonly items: InvoiceItem[];

    /** The day the invoice is due, at midnight UTC. */
    readonly dueAt: Date | null;

    /** The page where the customer pays. */
    readonly hostedUrl: string;

    /** The printable invoice; absent from webhooks. */
    readonly documentUrl: string | null;

    /** The charges made to pay the invoice, one per coin the customer tried. */
    readonly charges: InvoiceCharge[];

    /** When the invoice was emailed. */
    readonly sentAt: Date | null;

    /** When the customer first opened it. */
    readonly viewedAt: Date | null;

    /** When it was paid. */
    readonly paidAt: Date | null;

    /** When it was voided. */
    readonly voidedAt: Date | null;

    /** When it was created. */
    readonly createdAt: Date | null;

    constructor(attributes: Attributes) {
        super(attributes);

        this.id = string(attributes, 'id', string(attributes, 'code'));
        this.number = string(attributes, 'number');
        this.status = string(attributes, 'status');
        this.overdue = nullableBool(attributes, 'overdue');
        this.customerName = string(attributes, 'customer_name');
        this.customerEmail = string(attributes, 'customer_email');
        this.memo = nullableString(attributes, 'memo');
        this.amount = string(attributes, 'amount', '0');
        this.currency = string(attributes, 'currency');
        this.items = objects(attributes, 'items', (item) => new InvoiceItem(item));
        this.dueAt = date(attributes, 'due_at');
        this.hostedUrl = string(attributes, 'hosted_url');
        this.documentUrl = nullableString(attributes, 'document_url');
        this.charges = records(attributes, 'charges').map((charge) => ({
            id: string(charge, 'id', string(charge, 'code')),
            status: string(charge, 'status'),
            asset: string(charge, 'asset'),
        }));
        this.sentAt = date(attributes, 'sent_at');
        this.viewedAt = date(attributes, 'viewed_at');
        this.paidAt = date(attributes, 'paid_at');
        this.voidedAt = date(attributes, 'voided_at');
        this.createdAt = date(attributes, 'created_at');
    }

    /** Whether the invoice can still be paid. */
    isOpen(): boolean {
        return this.status === InvoiceStatus.Open;
    }

    /** Whether the invoice was paid. */
    isPaid(): boolean {
        return this.status === InvoiceStatus.Paid;
    }

    /** Whether the invoice was voided. */
    isVoid(): boolean {
        return this.status === InvoiceStatus.Void;
    }
}

/** A line on an itemised invoice. */
export class InvoiceItem extends ApiResource {
    /** What the line is for. */
    readonly description: string;

    /** How many units the line bills. */
    readonly quantity: string;

    /** The price of one unit, in the invoice's currency. */
    readonly unitAmount: string;

    /** The quantity times the unit amount. */
    readonly total: string;

    constructor(attributes: Attributes) {
        super(attributes);

        this.description = string(attributes, 'description');
        this.quantity = string(attributes, 'quantity', '1');
        this.unitAmount = string(attributes, 'unit_amount', '0');
        this.total = string(attributes, 'total', '0');
    }
}
