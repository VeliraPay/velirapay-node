import { RefundRequestStatus, type OrString } from '../enums.ts';
import { ApiResource, date, nullableInt, nullableString, object, string, type Attributes } from './api-resource.ts';
import { Refund } from './charge.ts';

/**
 * A refund started for a charge: what it sets aside, where it goes and how far it has got. VeliraPay never sends it:
 * you do, from your own wallet, to the address the customer or you gave.
 */
export class RefundRequest extends ApiResource {
    /** The refund request's id. */
    readonly id: string;

    /** The id of the charge being refunded. */
    readonly charge: string;

    /** One of the RefundRequestStatus values: awaiting_address, awaiting_transfer, confirming, refunded, canceled or expired. */
    readonly status: OrString<RefundRequestStatus>;

    /** What the refund sets aside, in the charge's coin. */
    readonly amount: string;

    /** Why the refund is made. */
    readonly reason: string | null;

    /** Where the refund goes, once the customer or you gave it. */
    readonly address: string | null;

    /** Who gave the address: "customer" or "merchant", or null before anyone did. */
    readonly addressGivenBy: OrString<'customer' | 'merchant'> | null;

    /** The signed page the customer gives the address on, while the refund still takes one; null once it is given or the link lapsed. */
    readonly addressUrl: string | null;

    /** When addressUrl stops working. */
    readonly linkExpiresAt: Date | null;

    /** When the link was last emailed to the customer, or null when it never was. */
    readonly emailedAt: Date | null;

    /** The transaction you said carried the refund, or the one the chain showed. */
    readonly txid: string | null;

    /** What the chain shows arriving at the address for the refund, in the charge's coin. */
    readonly detectedAmount: string | null;

    /** How many confirmations that transfer has, or null before one is seen. */
    readonly confirmations: number | null;

    /** The refund it was recorded as, once it was. */
    readonly refund: Refund | null;

    /** When the refund request was started. */
    readonly createdAt: Date | null;

    /** When it was recorded as a refund. */
    readonly completedAt: Date | null;

    /** When it was canceled. */
    readonly canceledAt: Date | null;

    constructor(attributes: Attributes) {
        super(attributes);

        this.id = string(attributes, 'id');
        this.charge = string(attributes, 'charge');
        this.status = string(attributes, 'status');
        this.amount = string(attributes, 'amount', '0');
        this.reason = nullableString(attributes, 'reason');
        this.address = nullableString(attributes, 'address');
        this.addressGivenBy = nullableString(attributes, 'address_given_by');
        this.addressUrl = nullableString(attributes, 'address_url');
        this.linkExpiresAt = date(attributes, 'link_expires_at');
        this.emailedAt = date(attributes, 'emailed_at');
        this.txid = nullableString(attributes, 'txid');
        this.detectedAmount = nullableString(attributes, 'detected_amount');
        this.confirmations = nullableInt(attributes, 'confirmations');
        this.refund = object(attributes, 'refund', (refund) => new Refund(refund));
        this.createdAt = date(attributes, 'created_at');
        this.completedAt = date(attributes, 'completed_at');
        this.canceledAt = date(attributes, 'canceled_at');
    }

    /** Whether the refund is waiting for the customer to give the address. */
    isAwaitingAddress(): boolean {
        return this.status === RefundRequestStatus.AwaitingAddress;
    }

    /** Whether the refund is waiting for you to send it from your own wallet. */
    isAwaitingTransfer(): boolean {
        return this.status === RefundRequestStatus.AwaitingTransfer;
    }

    /** Whether the chain shows the transfer and it is waiting for its confirmations. */
    isConfirming(): boolean {
        return this.status === RefundRequestStatus.Confirming;
    }

    /** Whether it was recorded as a refund. */
    isRefunded(): boolean {
        return this.status === RefundRequestStatus.Refunded;
    }

    /** Whether it was canceled. */
    isCanceled(): boolean {
        return this.status === RefundRequestStatus.Canceled;
    }

    /** Whether the customer never gave the address before the link lapsed. */
    isExpired(): boolean {
        return this.status === RefundRequestStatus.Expired;
    }

    /** Whether the refund is still under way, and so still sets its amount aside on the charge. */
    isOpen(): boolean {
        return this.isAwaitingAddress() || this.isAwaitingTransfer() || this.isConfirming();
    }
}
