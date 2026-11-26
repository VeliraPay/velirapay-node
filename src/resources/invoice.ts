import { InvoiceStatus, type Asset, type ChargeStatus, type Currency, type OrString } from '../enums.ts';
import { ApiResource, date, nullableBool, nullableString, objects, records, string, type Attributes } from './api-resource.ts';

/** A charge made to pay an invoice, one per coin the customer tried. */
export interface InvoiceCharge {
    id: string;
    status: OrString<ChargeStatus>;
    asset: OrString<Asset>;
    /** When the charge was paid. */
    paidAt: Date | null;
    /** When you accepted a short or late payment as paid, which is how the charge became paid; null for a charge the payment itself covered. */
    acceptedAt: Date | null;
}

/** A bill, paid through a hosted page in the coin the customer chooses. */
export class Invoice extends ApiResource {
    /** The invoice's public code, also the last segment of its hosted URL. */
    readonly id: string;

    /** The invoice number shown to the customer. */
    readonly number: string;

    /** One of the InvoiceStatus values: open, paid or void. */
    readonly status: OrString<InvoiceStatus>;

    /** Whether the invoice is open past its due date; null in a payload that leaves it out. */
    readonly overdue: boolean | null;

    /** The customer's name, or null when the invoice was given only their email. */
    readonly customerName: string | null;

    /** The customer's email address, or null when the invoice was given only their name: it can then not be sent or reminded. */
    readonly customerEmail: string | null;

    /** A note shown on the invoice. */
    readonly memo: string | null;

    /** The total due. */
    readonly amount: string;

    /** The fiat currency, such as "USD". */
    readonly currency: OrString<Currency>;

    /** What the items came to before the discount and tax, or null for an invoice whose items carry neither, whose amount is then their sum. */
    readonly subtotal: string | null;

    /** What the discount took off the items before tax, or null when there is none. */
    readonly discount: string | null;

    /** The percentage the discount took off, or null for a fixed discount or none. */
    readonly discountPercent: string | null;

    /** The tax added on top of the items at their tax rates, after the discount, or null for an invoice without a breakdown. */
    readonly tax: string | null;

    /** The lines of an itemised invoice. */
    readonly items: InvoiceItem[];

    /** The day the invoice is due, at midnight UTC. */
    readonly dueAt: Date | null;

    /** When the invoice stops taking new payments, or null when it stays open until paid or voided. */
    readonly expiresAt: Date | null;

    /** The page where the customer pays. */
    readonly hostedUrl: string;

    /** The printable invoice; null in a payload that leaves it out. */
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

    /** The page the customer is offered a button back to once they have paid. */
    readonly successUrl: string | null;

    /** The page the customer can go back to from the invoice without paying. */
    readonly cancelUrl: string | null;

    /** What the customer is told once they have paid, or null when the account's own message applies. */
    readonly successMessage: string | null;

    constructor(attributes: Attributes) {
        super(attributes);

        this.id = string(attributes, 'id', string(attributes, 'code'));
        this.number = string(attributes, 'number');
        this.status = string(attributes, 'status');
        this.overdue = nullableBool(attributes, 'overdue');
        this.customerName = nullableString(attributes, 'customer_name');
        this.customerEmail = nullableString(attributes, 'customer_email');
        this.memo = nullableString(attributes, 'memo');
        this.amount = string(attributes, 'amount', '0');
        this.currency = string(attributes, 'currency');
        this.subtotal = nullableString(attributes, 'subtotal');
        this.discount = nullableString(attributes, 'discount');
        this.discountPercent = nullableString(attributes, 'discount_percent');
        this.tax = nullableString(attributes, 'tax');
        this.items = objects(attributes, 'items', (item) => new InvoiceItem(item));
        this.dueAt = date(attributes, 'due_at');
        this.expiresAt = date(attributes, 'expires_at');
        this.hostedUrl = string(attributes, 'hosted_url');
        this.documentUrl = nullableString(attributes, 'document_url');
        this.charges = records(attributes, 'charges').map((charge) => ({
            id: string(charge, 'id', string(charge, 'code')),
            status: string(charge, 'status'),
            asset: string(charge, 'asset'),
            paidAt: date(charge, 'paid_at'),
            acceptedAt: date(charge, 'accepted_at'),
        }));
        this.sentAt = date(attributes, 'sent_at');
        this.viewedAt = date(attributes, 'viewed_at');
        this.paidAt = date(attributes, 'paid_at');
        this.voidedAt = date(attributes, 'voided_at');
        this.createdAt = date(attributes, 'created_at');
        this.successUrl = nullableString(attributes, 'success_url');
        this.cancelUrl = nullableString(attributes, 'cancel_url');
        this.successMessage = nullableString(attributes, 'success_message');
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

    /** The tax rate on the line, in percent, such as "20.00", or null when it carries none. */
    readonly taxRate: string | null;

    /** The quantity times the unit amount. */
    readonly total: string;

    constructor(attributes: Attributes) {
        super(attributes);

        this.description = string(attributes, 'description');
        this.quantity = string(attributes, 'quantity', '1');
        this.unitAmount = string(attributes, 'unit_amount', '0');
        this.taxRate = nullableString(attributes, 'tax_rate');
        this.total = string(attributes, 'total', '0');
    }
}
