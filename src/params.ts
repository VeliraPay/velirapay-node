import type { ApiKeyPermission, Asset, BusinessType, ChargeStatus, Currency, EventType, Industry, InvoiceStatus, MemberRole, Mode, MonthlyVolume, OrString, PaymentLinkStatus, PayoutStatus, PricingType } from './enums.ts';

/** An amount of money or of a coin. Pass a string, such as "49.90", to keep every decimal. */
export type Amount = string | number;

/** Your own key-value data: up to 20 keys of at most 40 characters, each a string of at most 500 characters, a number, a boolean or null. */
export type Metadata = Record<string, string | number | boolean | null>;

/** Options for a request that changes something. */
export interface RequestOptions {
    /** Up to 255 characters, such as an order number. For 24 hours, a repeat with the same key gets the first successful response instead of being carried out again. */
    idempotencyKey?: string;
}

/** Which page of a list to fetch. */
export interface PageParams {
    /** The page, from 1. */
    page?: number;
    /** How many objects a page holds, up to 100; 25 when left out. */
    per_page?: number;
}

/** What you know about the customer paying a charge. */
export interface CustomerParams {
    email?: string | null;
    name?: string | null;
    /** The customer's own IP address, not your server's. */
    ip_address?: string | null;
    user_agent?: string | null;
    /** Your own id for the customer. */
    reference?: string | null;
    phone?: string | null;
    /** An ISO 3166 two-letter code. */
    country?: string | null;
    metadata?: Metadata | null;
}

export interface ChargeCreateParams {
    asset: OrString<Asset>;
    /** Required unless a payment link with a fixed price is given. */
    amount?: Amount;
    /** Required unless a payment link is given. */
    currency?: OrString<Currency>;
    /** A payment link's id: the currency comes from the link, and so does the price when it is fixed. */
    payment_link?: string | null;
    customer?: CustomerParams | null;
    customer_email?: string | null;
    coupon?: string | null;
    description?: string | null;
    metadata?: Metadata | null;
    custom_fields?: { label: string; value: string }[] | null;
    success_url?: string | null;
    cancel_url?: string | null;
    success_message?: string | null;
    /** Email the customer the payment page straight away. */
    send_email?: boolean;
}

export interface ChargeListParams extends PageParams {
    status?: OrString<ChargeStatus>;
    asset?: OrString<Asset>;
    payment_link?: string;
    /** Part of a charge's code, customer email, customer name or description, or exactly its deposit address, a transaction hash, its payout hash or the customer's IP address. */
    search?: string;
    created_from?: string | Date;
    created_to?: string | Date;
}

export interface RefundParams {
    /** In the charge's coin. */
    amount: Amount;
    txid?: string | null;
    reason?: string | null;
}

export interface SimulateParams {
    /** In the charge's coin; the whole amount due when left out. */
    amount?: Amount | null;
}

export interface InvoiceItemParams {
    description: string;
    quantity: Amount;
    unit_amount: Amount;
}

export interface InvoiceCreateParams {
    customer_name: string;
    customer_email: string;
    currency: OrString<Currency>;
    /** A single total, instead of items. */
    amount?: Amount;
    items?: InvoiceItemParams[];
    memo?: string | null;
    /** The day it is due, as YYYY-MM-DD. */
    due_at?: string | null;
    send_email?: boolean;
}

export interface InvoiceListParams extends PageParams {
    status?: OrString<InvoiceStatus>;
    search?: string;
    overdue?: boolean;
}

export interface PaymentLinkCreateParams {
    title: string;
    pricing_type: OrString<PricingType>;
    currency: OrString<Currency>;
    /** The price of a fixed-price link. */
    amount?: Amount | null;
    description?: string | null;
    suggested_amounts?: Amount[] | null;
    min_amount?: Amount | null;
    max_amount?: Amount | null;
    /** Null accepts every coin the account takes. */
    accepted_assets?: OrString<Asset>[] | null;
    success_url?: string | null;
    cancel_url?: string | null;
    collect_name?: boolean;
    require_email?: boolean;
    success_message?: string | null;
    custom_fields?: { label: string; required: boolean }[];
    expires_at?: string | Date | null;
    max_payments?: number | null;
}

export type PaymentLinkUpdateParams = Partial<PaymentLinkCreateParams>;

export interface PaymentLinkListParams extends PageParams {
    status?: OrString<PaymentLinkStatus>;
    search?: string;
}

export interface CouponCreateParams {
    /** 3 to 32 letters, digits, dashes or underscores, stored in capitals. */
    code: string;
    percent_off?: Amount | null;
    /** Needs a currency. */
    amount_off?: Amount | null;
    currency?: OrString<Currency> | null;
    /** Needs a currency. */
    min_amount?: Amount | null;
    max_redemptions?: number | null;
    once_per_customer?: boolean;
    /** Payment link ids; empty for every link, and charges made without one. */
    payment_links?: string[] | null;
    active?: boolean;
    /** A bare date ends at 23:59:59 UTC. */
    expires_at?: string | Date | null;
}

export interface CouponUpdateParams {
    max_redemptions?: number | null;
    once_per_customer?: boolean;
    /** Replaces the whole list. */
    payment_links?: string[] | null;
    active?: boolean;
    expires_at?: string | Date | null;
}

export interface CouponListParams extends PageParams {
    search?: string;
}

export interface PayoutListParams extends PageParams {
    status?: OrString<PayoutStatus>;
    asset?: OrString<Asset>;
    /** A charge id or a transaction hash. */
    search?: string;
}

export interface EventListParams extends PageParams {
    type?: OrString<EventType>;
    /** A charge's id. */
    charge?: string;
    /** An invoice's id. */
    invoice?: string;
}

export interface WebhookEndpointCreateParams {
    /** A public https:// URL. */
    url: string;
    events: OrString<EventType>[];
    description?: string | null;
    active?: boolean;
}

export type WebhookEndpointUpdateParams = Partial<WebhookEndpointCreateParams>;

export interface WebhookDeliveryListParams extends PageParams {
    status?: OrString<'pending' | 'succeeded' | 'failed'>;
    event?: OrString<EventType>;
}

export interface ApiKeyCreateParams {
    name: string;
    /** Leave out, or null, for full access. */
    permissions?: OrString<ApiKeyPermission>[] | null;
    /** IPv4 or IPv6 addresses or ranges; leave out, or null, for anywhere. */
    allowed_ips?: string[] | null;
}

export type ApiKeyUpdateParams = Partial<ApiKeyCreateParams>;

export interface MemberUpdateParams {
    role: OrString<MemberRole>;
}

export interface InvitationCreateParams {
    email: string;
    role: OrString<MemberRole>;
}

export interface ActivityListParams extends PageParams {
    /** An action, or "sensitive". */
    action?: string;
    person?: string;
    /** A subject or the start of an IP address. */
    q?: string;
    /** YYYY-MM-DD. */
    from?: string;
    /** YYYY-MM-DD. */
    to?: string;
    /** The key's own mode, to leave out what belongs to none. */
    network?: OrString<Mode>;
}

export interface AssetListParams {
    /** The currency of the prices; the account's default when left out. */
    currency?: OrString<Currency>;
}

export interface PayoutAddressUpdateParams {
    address: string;
}

export interface ProPaymentParams {
    asset: OrString<Asset>;
}

export interface AccountUpdateParams {
    name?: string;
    display_name?: string | null;
    website_url?: string | null;
    support_email?: string | null;
    support_phone?: string | null;
    terms_url?: string | null;
    refund_policy_url?: string | null;
    brand_color?: string | null;
    checkout?: {
        appearance?: OrString<'auto' | 'light' | 'dark'>;
        coin_order?: OrString<Asset>[];
        default_coin?: OrString<Asset> | null;
        success_url?: string | null;
        cancel_url?: string | null;
        success_message?: string | null;
        hide_powered_by?: boolean;
    };
    invoices?: {
        number_prefix?: string | null;
        footer?: string | null;
        show_business_details?: boolean;
    };
    business?: {
        type?: OrString<BusinessType> | null;
        legal_name?: string | null;
        registration_number?: string | null;
        tax_id?: string | null;
        address?: {
            line1?: string | null;
            line2?: string | null;
            city?: string | null;
            postal_code?: string | null;
            state?: string | null;
            country?: string | null;
        };
        industry?: OrString<Industry> | null;
        product_description?: string | null;
        monthly_volume?: OrString<MonthlyVolume> | null;
        phone?: string | null;
    };
}

export interface PaymentSettingsUpdateParams {
    default_currency?: OrString<Currency>;
    underpayment_tolerance?: Amount;
    overpayment_threshold?: Amount;
    checkout_locale?: OrString<'en' | 'fr' | 'de' | 'es' | 'tr' | 'pt' | 'ru' | 'ar'> | null;
    invoice_reminders?: boolean;
}
