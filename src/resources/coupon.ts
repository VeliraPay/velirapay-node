import type { Currency, OrString } from '../enums.ts';
import { ApiResource, bool, date, int, nullableInt, nullableString, string, strings, type Attributes } from './api-resource.ts';

/** A discount code customers enter at checkout, or that is applied for them through a payment link's URL or the API. */
export class Coupon extends ApiResource {
    /** The coupon's id, which is its code. */
    readonly id: string;

    /** The code customers type, in capitals; it is matched in any case. */
    readonly code: string;

    /** The share taken off, such as "10.00", or null for an amount off. */
    readonly percentOff: string | null;

    /** The amount taken off, or null for a percentage. */
    readonly amountOff: string | null;

    /** The only fiat currency the coupon works in, or null for a percentage that works in every one. */
    readonly currency: OrString<Currency> | null;

    /** The least the price before the discount must be. */
    readonly minAmount: string | null;

    /** How many payments may use the coupon, or null for no limit. */
    readonly maxRedemptions: number | null;

    /** How many paid charges used the coupon. */
    readonly timesRedeemed: number;

    /** Whether each customer email can use the coupon only once. */
    readonly oncePerCustomer: boolean;

    /** The codes of the payment links the coupon is limited to; empty for every link, and charges without one. */
    readonly paymentLinks: string[];

    /** Whether customers can use the coupon, rather than it being paused. */
    readonly active: boolean;

    /** When the coupon stops working. */
    readonly expiresAt: Date | null;

    /** When the coupon was created. */
    readonly createdAt: Date | null;

    /** When the coupon was last changed. */
    readonly updatedAt: Date | null;

    constructor(attributes: Attributes) {
        super(attributes);

        this.code = string(attributes, 'code', string(attributes, 'id'));
        this.id = string(attributes, 'id', this.code);
        this.percentOff = nullableString(attributes, 'percent_off');
        this.amountOff = nullableString(attributes, 'amount_off');
        this.currency = nullableString(attributes, 'currency');
        this.minAmount = nullableString(attributes, 'min_amount');
        this.maxRedemptions = nullableInt(attributes, 'max_redemptions');
        this.timesRedeemed = int(attributes, 'times_redeemed');
        this.oncePerCustomer = bool(attributes, 'once_per_customer');
        this.paymentLinks = strings(attributes, 'payment_links');
        this.active = bool(attributes, 'active');
        this.expiresAt = date(attributes, 'expires_at');
        this.createdAt = date(attributes, 'created_at');
        this.updatedAt = date(attributes, 'updated_at');
    }

    /** Whether the coupon takes a percentage off rather than a fixed amount. */
    isPercentage(): boolean {
        return this.percentOff !== null;
    }
}
