/** A value the API defines, or one it adds after this version of the library. */
export type OrString<T extends string> = T | (string & {});

/** A coin on one particular network, such as USDT on Ethereum or USDT_TRON on Tron. The account lists the ones it accepts right now. */
export const Asset = {
    BTC: 'BTC',
    BTC_LIGHTNING: 'BTC_LIGHTNING',
    LTC: 'LTC',
    DOGE: 'DOGE',
    BCH: 'BCH',
    ETH: 'ETH',
    XMR: 'XMR',
    SOL: 'SOL',
    BNB: 'BNB',
    TRX: 'TRX',
    USDT: 'USDT',
    USDC: 'USDC',
    USDT_TRON: 'USDT_TRON',
    USDC_BASE: 'USDC_BASE',
    USDC_POLYGON: 'USDC_POLYGON',
    USDT_BSC: 'USDT_BSC',
    USDC_BSC: 'USDC_BSC',
    USDT_POLYGON: 'USDT_POLYGON',
    USDT_ARBITRUM: 'USDT_ARBITRUM',
    USDC_ARBITRUM: 'USDC_ARBITRUM',
    ETH_BASE: 'ETH_BASE',
    ETH_ARBITRUM: 'ETH_ARBITRUM',
    POL: 'POL',
} as const;

export type Asset = (typeof Asset)[keyof typeof Asset];

/** The states a charge moves through. */
export const ChargeStatus = {
    Pending: 'pending',
    Underpaid: 'underpaid',
    Paid: 'paid',
    Expired: 'expired',
    Canceled: 'canceled',
} as const;

export type ChargeStatus = (typeof ChargeStatus)[keyof typeof ChargeStatus];

/** The states an invoice moves through. */
export const InvoiceStatus = {
    Open: 'open',
    Paid: 'paid',
    Void: 'void',
} as const;

export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

/** Where a payout has got to. */
export const PayoutStatus = {
    Pending: 'pending',
    Sending: 'sending',
    Sent: 'sent',
    Failed: 'failed',
    Manual: 'manual',
} as const;

export type PayoutStatus = (typeof PayoutStatus)[keyof typeof PayoutStatus];

/** Whether a payment link takes payments. */
export const PaymentLinkStatus = {
    Active: 'active',
    Archived: 'archived',
} as const;

export type PaymentLinkStatus = (typeof PaymentLinkStatus)[keyof typeof PaymentLinkStatus];

/** How a payment link is priced: at a set amount, or at one the customer names. */
export const PricingType = {
    Fixed: 'fixed',
    Open: 'open',
} as const;

export type PricingType = (typeof PricingType)[keyof typeof PricingType];

/** The events a charge, an invoice or a payout reports, through webhooks and the events API. */
export const EventType = {
    ChargeCreated: 'charge.created',
    ChargePaymentDetected: 'charge.payment_detected',
    ChargePaid: 'charge.paid',
    ChargeUnderpaid: 'charge.underpaid',
    ChargeLatePayment: 'charge.late_payment',
    ChargeRefunded: 'charge.refunded',
    ChargeExpired: 'charge.expired',
    ChargeCanceled: 'charge.canceled',
    InvoiceCreated: 'invoice.created',
    InvoiceSent: 'invoice.sent',
    InvoiceViewed: 'invoice.viewed',
    InvoicePaid: 'invoice.paid',
    InvoiceVoided: 'invoice.voided',
    PayoutSent: 'payout.sent',
    PayoutConfirmed: 'payout.confirmed',
} as const;

export type EventType = (typeof EventType)[keyof typeof EventType];

/** The mode an API key, object or webhook belongs to. */
export const Mode = {
    Live: 'live',
    Test: 'test',
} as const;

export type Mode = (typeof Mode)[keyof typeof Mode];

/** What kind of legal entity runs an account. */
export const BusinessType = {
    Individual: 'individual',
    Company: 'company',
    NonProfit: 'non_profit',
} as const;

export type BusinessType = (typeof BusinessType)[keyof typeof BusinessType];

/** What an account sells, broadly. */
export const Industry = {
    DigitalProducts: 'digital_products',
    Software: 'software',
    Hosting: 'hosting',
    Gaming: 'gaming',
    Retail: 'retail',
    ProfessionalServices: 'professional_services',
    Education: 'education',
    Media: 'media',
    Marketplace: 'marketplace',
    Travel: 'travel',
    Donations: 'donations',
    Other: 'other',
} as const;

export type Industry = (typeof Industry)[keyof typeof Industry];

/** How much an account expects to take in a month, in US dollars. */
export const MonthlyVolume = {
    Under1k: 'under_1k',
    Under10k: '1k_10k',
    Under50k: '10k_50k',
    Under250k: '50k_250k',
    Over250k: 'over_250k',
} as const;

export type MonthlyVolume = (typeof MonthlyVolume)[keyof typeof MonthlyVolume];

/** What a restricted API key may do. Full access gives every permission but the sensitive ones, which have to be ticked. */
export const ApiKeyPermission = {
    ChargesRead: 'charges:read',
    ChargesWrite: 'charges:write',
    ChargesAccept: 'charges:accept',
    ChargesRefund: 'charges:refund',
    InvoicesRead: 'invoices:read',
    InvoicesWrite: 'invoices:write',
    PaymentLinksRead: 'payment_links:read',
    PaymentLinksWrite: 'payment_links:write',
    CouponsRead: 'coupons:read',
    CouponsWrite: 'coupons:write',
    PayoutsRead: 'payouts:read',
    EventsRead: 'events:read',
    WebhookEndpointsRead: 'webhook_endpoints:read',
    OverviewRead: 'overview:read',
    PayoutAddressesRead: 'payout_addresses:read',
    ActivityRead: 'activity:read',
    AccountWrite: 'account:write',
    PaymentSettingsWrite: 'payment_settings:write',
    PayoutAddressesWrite: 'payout_addresses:write',
    WebhookEndpointsWrite: 'webhook_endpoints:write',
    ApiKeysRead: 'api_keys:read',
    ApiKeysWrite: 'api_keys:write',
    MembersRead: 'members:read',
    MembersWrite: 'members:write',
    BillingWrite: 'billing:write',
} as const;

export type ApiKeyPermission = (typeof ApiKeyPermission)[keyof typeof ApiKeyPermission];

/** The fiat currencies prices can be set in. */
export type Currency = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'CHF' | 'TRY';

/** The roles a member can be given; an owner is never made through the API. */
export type MemberRole = 'admin' | 'finance' | 'support' | 'viewer';
