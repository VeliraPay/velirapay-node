import { PaymentLinkStatus, PricingType, type Asset, type Currency, type OrString } from '../enums.ts';
import { ApiResource, bool, date, int, nullableInt, nullableString, nullableStrings, records, string, strings, type Attributes } from './api-resource.ts';

/** A question a payment link's checkout asks. */
export interface CheckoutQuestion {
    label: string;
    required: boolean;
}

/** A shareable checkout page that creates a charge for each customer who pays through it. */
export class PaymentLink extends ApiResource {
    /** The link's public code, also the last segment of its checkout URL. */
    readonly id: string;

    /** The title shown on the checkout. */
    readonly title: string;

    /** The description shown on the checkout. */
    readonly description: string | null;

    /** One of the PricingType values: fixed or open. */
    readonly pricingType: OrString<PricingType>;

    /** The price of a fixed-price link. */
    readonly amount: string | null;

    /** Amounts offered as shortcuts on an open-price link. */
    readonly suggestedAmounts: string[];

    /** The least a customer may pay on an open-price link. */
    readonly minAmount: string | null;

    /** The most a customer may pay on an open-price link. */
    readonly maxAmount: string | null;

    /** The fiat currency the link is priced in. */
    readonly currency: OrString<Currency>;

    /** The coins the link takes, or null for every coin the account can receive. */
    readonly acceptedAssets: OrString<Asset>[] | null;

    /** One of the PaymentLinkStatus values: active or archived. */
    readonly status: OrString<PaymentLinkStatus>;

    /** Where the customer is sent after paying. */
    readonly successUrl: string | null;

    /** Where the customer is sent when they give up. */
    readonly cancelUrl: string | null;

    /** Whether the checkout asks for the customer's name. */
    readonly collectName: boolean;

    /** Whether the checkout requires the customer's email address. */
    readonly requireEmail: boolean;

    /** The questions the checkout asks. */
    readonly customFields: CheckoutQuestion[];

    /** The message shown once the payment lands. */
    readonly successMessage: string | null;

    /** When the link stops taking payments. */
    readonly expiresAt: Date | null;

    /** How many payments the link takes before it closes. */
    readonly maxPayments: number | null;

    /** Whether the link takes payments right now. */
    readonly acceptingPayments: boolean;

    /** How many times the checkout was opened. */
    readonly viewsCount: number;

    /** The checkout page to share. */
    readonly checkoutUrl: string;

    /** When the link was created. */
    readonly createdAt: Date | null;

    /** When the link was last changed. */
    readonly updatedAt: Date | null;

    constructor(attributes: Attributes) {
        super(attributes);

        this.id = string(attributes, 'id', string(attributes, 'code'));
        this.title = string(attributes, 'title');
        this.description = nullableString(attributes, 'description');
        this.pricingType = string(attributes, 'pricing_type');
        this.amount = nullableString(attributes, 'amount');
        this.suggestedAmounts = strings(attributes, 'suggested_amounts');
        this.minAmount = nullableString(attributes, 'min_amount');
        this.maxAmount = nullableString(attributes, 'max_amount');
        this.currency = string(attributes, 'currency');
        this.acceptedAssets = nullableStrings(attributes, 'accepted_assets');
        this.status = string(attributes, 'status');
        this.successUrl = nullableString(attributes, 'success_url');
        this.cancelUrl = nullableString(attributes, 'cancel_url');
        this.collectName = bool(attributes, 'collect_name');
        this.requireEmail = bool(attributes, 'require_email');
        this.customFields = records(attributes, 'custom_fields').map((field) => ({ label: string(field, 'label'), required: bool(field, 'required') }));
        this.successMessage = nullableString(attributes, 'success_message');
        this.expiresAt = date(attributes, 'expires_at');
        this.maxPayments = nullableInt(attributes, 'max_payments');
        this.acceptingPayments = bool(attributes, 'accepting_payments');
        this.viewsCount = int(attributes, 'views_count');
        this.checkoutUrl = string(attributes, 'checkout_url');
        this.createdAt = date(attributes, 'created_at');
        this.updatedAt = date(attributes, 'updated_at');
    }

    /** Whether the link is active rather than archived. */
    isActive(): boolean {
        return this.status === PaymentLinkStatus.Active;
    }

    /** Whether the link was archived. */
    isArchived(): boolean {
        return this.status === PaymentLinkStatus.Archived;
    }

    /** Whether the link has a set price rather than one the customer names. */
    hasFixedAmount(): boolean {
        return this.pricingType === PricingType.Fixed;
    }
}
