import { ChargeStatus, type Asset, type Currency, type OrString } from '../enums.ts';
import { ApiResource, bool, date, int, map, nullableString, objects, records, reference, string, type Attributes } from './api-resource.ts';

/** One entry of a charge's history. */
export interface ChargeTimelineEntry {
    event: string;
    time: Date | null;
}

/** A labelled detail of a charge: an answer to a payment link's question, or one passed when creating the charge. */
export interface CustomFieldAnswer {
    label: string;
    value: string;
}

/** A single payment in one coin, with the rate locked and a deposit address of its own. */
export class Charge extends ApiResource {
    /** The charge's public code, also the last segment of its checkout URL. */
    readonly id: string;

    /** One of the ChargeStatus values: pending, underpaid, paid, expired or canceled. */
    readonly status: OrString<ChargeStatus>;

    /** The code of the payment link the charge was made through. */
    readonly paymentLink: string | null;

    /** The title of that payment link, in webhooks alone; null in the API's answers, which only give its code. */
    readonly paymentLinkTitle: string | null;

    /** The code of the invoice the charge pays. */
    readonly invoice: string | null;

    /** The number of that invoice, such as "INV-0042", in webhooks alone; null in the API's answers, which only give its code. */
    readonly invoiceNumber: string | null;

    /** The merchant's description of the charge. */
    readonly description: string | null;

    /** What the customer owes, in fiat. */
    readonly fiatAmount: string;

    /** The fiat currency, such as "USD". */
    readonly fiatCurrency: OrString<Currency>;

    /** The coin and network paid with, such as "BTC" or "USDT". */
    readonly asset: OrString<Asset>;

    /** The exact amount of the coin to send. */
    readonly assetAmount: string;

    /** What of assetAmount the customer pays on top of the price for the network, which VeliraPay keeps; null for a coin without one. */
    readonly networkSurcharge: string | null;

    /** What has been credited so far, or null before anything arrived. */
    readonly receivedAmount: string | null;

    /** What is still missing. */
    readonly remainingAmount: string;

    /** Whether the customer sent more than the overpayment threshold allows. */
    readonly overpaid: boolean;

    /** How much has been recorded as refunded. */
    readonly refundedAmount: string;

    /** The refunds recorded against the charge; absent from webhooks. */
    readonly refunds: Refund[];

    /** Fiat per one unit of the coin, locked when the charge was created. */
    readonly exchangeRate: string;

    /** The address the customer pays into, or the payment hash of the Lightning invoice for BTC_LIGHTNING. */
    readonly depositAddress: string;

    /** The Lightning invoice (BOLT11) the customer pays, for BTC_LIGHTNING; null for every other coin. */
    readonly paymentRequest: string | null;

    /** The transfers seen into the deposit address. */
    readonly transactions: Transaction[];

    /** The charge's history, oldest first; absent from webhooks and from charges embedded in events. */
    readonly timeline: ChargeTimelineEntry[];

    /** The customer's email address. */
    readonly customerEmail: string | null;

    /** The customer's name. */
    readonly customerName: string | null;

    /** Everything known about who pays, including the IP address and browser they paid from. */
    readonly customer: Customer;

    /** Labelled details: the customer's answers to the payment link's questions, or what was passed when creating the charge. */
    readonly customFields: CustomFieldAnswer[];

    /** The merchant's own key-value data. */
    readonly metadata: Record<string, unknown>;

    /** The hosted checkout page to send the customer to; absent from webhooks. */
    readonly checkoutUrl: string | null;

    /** The customer's receipt, once the charge is paid; absent from webhooks. */
    readonly receiptUrl: string | null;

    /** When the locked rate runs out. */
    readonly expiresAt: Date | null;

    /** When the charge was paid. */
    readonly paidAt: Date | null;

    /** When the charge was created. */
    readonly createdAt: Date | null;

    /** The code of the coupon the customer used. */
    readonly coupon: string | null;

    /** What the coupon took off, in fiat; fiatAmount is already the lower price. */
    readonly discountAmount: string | null;

    /** The page the customer is offered a button back to once they have paid; absent from webhooks. */
    readonly successUrl: string | null;

    /** The page the customer can go back to from the checkout without paying; absent from webhooks. */
    readonly cancelUrl: string | null;

    /** What the customer is told once they have paid; absent from webhooks. */
    readonly successMessage: string | null;

    constructor(attributes: Attributes) {
        super(attributes);

        this.id = string(attributes, 'id', string(attributes, 'code'));
        this.status = string(attributes, 'status');
        this.paymentLink = reference(attributes, 'payment_link');
        this.paymentLinkTitle = nullableString(map(attributes, 'payment_link'), 'title');
        this.invoice = reference(attributes, 'invoice');
        this.invoiceNumber = nullableString(map(attributes, 'invoice'), 'number');
        this.description = nullableString(attributes, 'description');
        this.fiatAmount = string(attributes, 'fiat_amount', '0');
        this.fiatCurrency = string(attributes, 'fiat_currency');
        this.asset = string(attributes, 'asset');
        this.assetAmount = string(attributes, 'asset_amount', '0');
        this.networkSurcharge = nullableString(attributes, 'network_surcharge');
        this.receivedAmount = nullableString(attributes, 'received_amount');
        this.remainingAmount = string(attributes, 'remaining_amount', '0');
        this.overpaid = bool(attributes, 'overpaid');
        this.refundedAmount = string(attributes, 'refunded_amount', '0');
        this.refunds = objects(attributes, 'refunds', (refund) => new Refund(refund));
        this.exchangeRate = string(attributes, 'exchange_rate', '0');
        this.depositAddress = string(attributes, 'deposit_address');
        this.paymentRequest = nullableString(attributes, 'payment_request');
        this.transactions = objects(attributes, 'transactions', (transaction) => new Transaction(transaction));
        this.timeline = records(attributes, 'timeline').map((entry) => ({ event: string(entry, 'event'), time: date(entry, 'time') }));
        this.customerEmail = nullableString(attributes, 'customer_email');
        this.customerName = nullableString(attributes, 'customer_name');
        this.customer = new Customer({ email: this.customerEmail, name: this.customerName, ...map(attributes, 'customer') });
        this.customFields = records(attributes, 'custom_fields').map((field) => ({ label: string(field, 'label'), value: string(field, 'value') }));
        this.metadata = map(attributes, 'metadata');
        this.checkoutUrl = nullableString(attributes, 'checkout_url');
        this.receiptUrl = nullableString(attributes, 'receipt_url');
        this.expiresAt = date(attributes, 'expires_at');
        this.paidAt = date(attributes, 'paid_at');
        this.createdAt = date(attributes, 'created_at');
        this.coupon = nullableString(attributes, 'coupon');
        this.discountAmount = nullableString(attributes, 'discount_amount');
        this.successUrl = nullableString(attributes, 'success_url');
        this.cancelUrl = nullableString(attributes, 'cancel_url');
        this.successMessage = nullableString(attributes, 'success_message');
    }

    /** Whether the charge is waiting for its payment. */
    isPending(): boolean {
        return this.status === ChargeStatus.Pending;
    }

    /** Whether less than the amount due has arrived. */
    isUnderpaid(): boolean {
        return this.status === ChargeStatus.Underpaid;
    }

    /** Whether the charge is paid in full and confirmed. */
    isPaid(): boolean {
        return this.status === ChargeStatus.Paid;
    }

    /** Whether the locked rate ran out before the charge was paid. */
    isExpired(): boolean {
        return this.status === ChargeStatus.Expired;
    }

    /** Whether the charge was canceled. */
    isCanceled(): boolean {
        return this.status === ChargeStatus.Canceled;
    }

    /** Whether the charge can still be paid. */
    isOpen(): boolean {
        return this.isPending() || this.isUnderpaid();
    }
}

/** A charge as the API answers with it, the charges events carry included, which always has its checkout page. Charges in webhooks stay plain charges, without one. */
export type ApiCharge = Charge & { readonly checkoutUrl: string };

/** What is known about the customer paying a charge, including the signals that help spot fraud. */
export class Customer extends ApiResource {
    /** The customer's email address. */
    readonly email: string | null;

    /** The customer's name. */
    readonly name: string | null;

    /** The IP address the customer paid from, recorded by the checkout or passed when the charge was created. */
    readonly ipAddress: string | null;

    /** The user agent of the browser the customer paid from. */
    readonly userAgent: string | null;

    /** Your own id for the customer. */
    readonly reference: string | null;

    /** The customer's phone number. */
    readonly phone: string | null;

    /** The customer's country, as an ISO 3166 two-letter code. */
    readonly country: string | null;

    /** Anything else you passed about the customer. */
    readonly metadata: Record<string, unknown>;

    constructor(attributes: Attributes) {
        super(attributes);

        this.email = nullableString(attributes, 'email');
        this.name = nullableString(attributes, 'name');
        this.ipAddress = nullableString(attributes, 'ip_address');
        this.userAgent = nullableString(attributes, 'user_agent');
        this.reference = nullableString(attributes, 'reference');
        this.phone = nullableString(attributes, 'phone');
        this.country = nullableString(attributes, 'country');
        this.metadata = map(attributes, 'metadata');
    }
}

/** A blockchain transfer into a charge's deposit address. */
export class Transaction extends ApiResource {
    /** The transaction id on its chain. */
    readonly txid: string;

    /** The amount received, in the charge's coin. */
    readonly amount: string;

    /** How many confirmations the transaction has. */
    readonly confirmations: number;

    /** How many confirmations the coin needs before the transfer counts. */
    readonly requiredConfirmations: number;

    /** Whether the transfer has been counted towards the charge. */
    readonly credited: boolean;

    /** A link to the transaction on a block explorer. */
    readonly explorerUrl: string | null;

    /** When the transfer was first seen. */
    readonly seenAt: Date | null;

    constructor(attributes: Attributes) {
        super(attributes);

        this.txid = string(attributes, 'txid');
        this.amount = string(attributes, 'amount', '0');
        this.confirmations = int(attributes, 'confirmations');
        this.requiredConfirmations = int(attributes, 'required_confirmations');
        this.credited = bool(attributes, 'credited');
        this.explorerUrl = nullableString(attributes, 'explorer_url');
        this.seenAt = date(attributes, 'seen_at');
    }
}

/** A refund recorded against a charge. The transfer itself is sent by the merchant. */
export class Refund extends ApiResource {
    /** The amount sent back, in the charge's coin. */
    readonly amount: string;

    /** The transaction that carried the refund, when it was recorded. */
    readonly txid: string | null;

    /** Why the refund was made. */
    readonly reason: string | null;

    /** A link to the refund transaction on a block explorer. */
    readonly explorerUrl: string | null;

    /** When the refund was recorded. */
    readonly createdAt: Date | null;

    constructor(attributes: Attributes) {
        super(attributes);

        this.amount = string(attributes, 'amount', '0');
        this.txid = nullableString(attributes, 'txid');
        this.reason = nullableString(attributes, 'reason');
        this.explorerUrl = nullableString(attributes, 'explorer_url');
        this.createdAt = date(attributes, 'created_at');
    }
}
