/** A value the API defines, or one it adds after this version of the library. */
export type OrString<T extends string> = T | (string & {});

/** A coin on one particular network, such as USDT on Ethereum or USDT_TRON on Tron. The account lists the ones it accepts right now. */
export const Asset = Object.freeze({
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
} as const);

export type Asset = (typeof Asset)[keyof typeof Asset];

/** The states a charge moves through. */
export const ChargeStatus = Object.freeze({
    Pending: 'pending',
    Underpaid: 'underpaid',
    Paid: 'paid',
    Expired: 'expired',
    Canceled: 'canceled',
} as const);

export type ChargeStatus = (typeof ChargeStatus)[keyof typeof ChargeStatus];

/** The states an invoice moves through. */
export const InvoiceStatus = Object.freeze({
    Open: 'open',
    Paid: 'paid',
    Void: 'void',
} as const);

export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

/** Where a payout has got to. */
export const PayoutStatus = Object.freeze({
    Pending: 'pending',
    Sending: 'sending',
    Sent: 'sent',
    Failed: 'failed',
    Manual: 'manual',
} as const);

export type PayoutStatus = (typeof PayoutStatus)[keyof typeof PayoutStatus];

/** Whether a payment link takes payments. */
export const PaymentLinkStatus = Object.freeze({
    Active: 'active',
    Archived: 'archived',
} as const);

export type PaymentLinkStatus = (typeof PaymentLinkStatus)[keyof typeof PaymentLinkStatus];

/** How a payment link is priced: at a set amount, or at one the customer names. */
export const PricingType = Object.freeze({
    Fixed: 'fixed',
    Open: 'open',
} as const);

export type PricingType = (typeof PricingType)[keyof typeof PricingType];

/** The events a charge, an invoice or a payout reports, through webhooks and the events API. */
export const EventType = Object.freeze({
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
} as const);

export type EventType = (typeof EventType)[keyof typeof EventType];

/** The mode an API key, object or webhook belongs to. */
export const Mode = Object.freeze({
    Live: 'live',
    Test: 'test',
} as const);

export type Mode = (typeof Mode)[keyof typeof Mode];

/** What kind of legal entity runs an account. */
export const BusinessType = Object.freeze({
    Individual: 'individual',
    Company: 'company',
    NonProfit: 'non_profit',
} as const);

export type BusinessType = (typeof BusinessType)[keyof typeof BusinessType];

/** What an account sells, broadly. */
export const Industry = Object.freeze({
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
} as const);

export type Industry = (typeof Industry)[keyof typeof Industry];

/** How much an account expects to take in a month, in US dollars. */
export const MonthlyVolume = Object.freeze({
    Under1k: 'under_1k',
    Under10k: '1k_10k',
    Under50k: '10k_50k',
    Under250k: '50k_250k',
    Over250k: 'over_250k',
} as const);

export type MonthlyVolume = (typeof MonthlyVolume)[keyof typeof MonthlyVolume];

/** What a restricted API key may do. Full access gives every permission but the sensitive ones, which have to be ticked. */
export const ApiKeyPermission = Object.freeze({
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
} as const);

export type ApiKeyPermission = (typeof ApiKeyPermission)[keyof typeof ApiKeyPermission];

/** The fiat currencies prices can be set in. */
export const Currency = Object.freeze({
    USD: 'USD',
    EUR: 'EUR',
    GBP: 'GBP',
    CAD: 'CAD',
    AUD: 'AUD',
    CHF: 'CHF',
    TRY: 'TRY',
} as const);

export type Currency = (typeof Currency)[keyof typeof Currency];

/** The roles people have in an account. Owner only appears in answers: invitations and role changes take the others. */
export const MemberRole = Object.freeze({
    Owner: 'owner',
    Admin: 'admin',
    Finance: 'finance',
    Support: 'support',
    Viewer: 'viewer',
} as const);

export type MemberRole = (typeof MemberRole)[keyof typeof MemberRole];

/** The roles an invitation or a role change can give: every one but owner, which is never given through the API. */
export type AssignableMemberRole = Exclude<MemberRole, typeof MemberRole.Owner>;

/** The network families that each have one payout address, as payoutAddresses.update() and delete() name them. */
export const AddressNetwork = Object.freeze({
    Bitcoin: 'bitcoin',
    Litecoin: 'litecoin',
    Dogecoin: 'dogecoin',
    BitcoinCash: 'bitcoincash',
    Evm: 'evm',
    Bsc: 'bsc',
    Base: 'base',
    Arbitrum: 'arbitrum',
    Polygon: 'polygon',
    Tron: 'tron',
    Monero: 'monero',
    Solana: 'solana',
    Lightning: 'lightning',
} as const);

export type AddressNetwork = (typeof AddressNetwork)[keyof typeof AddressNetwork];

/** How the checkout looks: following the customer's device, or always light or dark. */
export const CheckoutAppearance = Object.freeze({
    Auto: 'auto',
    Light: 'light',
    Dark: 'dark',
} as const);

export type CheckoutAppearance = (typeof CheckoutAppearance)[keyof typeof CheckoutAppearance];

/** Where a webhook delivery has got to. */
export const WebhookDeliveryStatus = Object.freeze({
    Pending: 'pending',
    Succeeded: 'succeeded',
    Failed: 'failed',
} as const);

export type WebhookDeliveryStatus = (typeof WebhookDeliveryStatus)[keyof typeof WebhookDeliveryStatus];

/** The plans an account can be on: Free keeps a fee of every payment, Pro keeps none. */
export const PlanName = Object.freeze({
    Free: 'free',
    Pro: 'pro',
} as const);

export type PlanName = (typeof PlanName)[keyof typeof PlanName];

/** Whether an account is one person's or an organization's. */
export const AccountType = Object.freeze({
    Personal: 'personal',
    Organization: 'organization',
} as const);

export type AccountType = (typeof AccountType)[keyof typeof AccountType];

/** The languages the checkout can fall back on when the customer's browser asks for none of them. */
export const CheckoutLocale = Object.freeze({
    English: 'en',
    French: 'fr',
    German: 'de',
    Spanish: 'es',
    Turkish: 'tr',
    Portuguese: 'pt',
    Russian: 'ru',
    Arabic: 'ar',
} as const);

export type CheckoutLocale = (typeof CheckoutLocale)[keyof typeof CheckoutLocale];

/** What the activity log records. The API adds actions from time to time, so expect others too. */
export const ActivityAction = Object.freeze({
    WalletsChanged: 'wallets.changed',
    PayoutAddressAccessChanged: 'wallets.api_access_changed',
    SecondFactorRequirementChanged: 'team.second_factor_requirement_changed',
    PaymentSettingsUpdated: 'payment_settings.updated',
    ProfileUpdated: 'profile.updated',
    BusinessDetailsUpdated: 'business_details.updated',
    ApiKeyCreated: 'api_key.created',
    ApiKeyUpdated: 'api_key.updated',
    ApiKeyRevoked: 'api_key.revoked',
    WebhookCreated: 'webhook.created',
    WebhookUpdated: 'webhook.updated',
    WebhookDeleted: 'webhook.deleted',
    WebhookSecretRotated: 'webhook.secret_rotated',
    MemberInvited: 'member.invited',
    MemberJoined: 'member.joined',
    MemberRoleChanged: 'member.role_changed',
    MemberRemoved: 'member.removed',
    PaymentLinkCreated: 'payment_link.created',
    PaymentLinkUpdated: 'payment_link.updated',
    PaymentLinkArchived: 'payment_link.archived',
    PaymentLinkRestored: 'payment_link.restored',
    InvitationCanceled: 'member.invitation_canceled',
    ChargePaymentRequested: 'charge.payment_requested',
    WebhookDisabled: 'webhook.disabled',
    ChargeCanceled: 'charge.canceled',
    ChargeAccepted: 'charge.accepted',
    RefundRecorded: 'refund.recorded',
    InvoiceVoided: 'invoice.voided',
    PlanPaymentStarted: 'plan.payment_started',
    SubscriptionCanceled: 'plan.subscription_canceled',
    SubscriptionResumed: 'plan.subscription_resumed',
    SignedIn: 'auth.signed_in',
    SignInFailed: 'auth.sign_in_failed',
    PasswordChanged: 'auth.password_changed',
    TwoFactorEnabled: 'auth.two_factor_enabled',
    TwoFactorDisabled: 'auth.two_factor_disabled',
    SignedOutElsewhere: 'auth.signed_out_elsewhere',
    TwoFactorFailed: 'auth.two_factor_failed',
    EmailChanged: 'auth.email_changed',
    PasskeyAdded: 'auth.passkey_added',
    PasskeyRemoved: 'auth.passkey_removed',
    CouponCreated: 'coupon.created',
    CouponUpdated: 'coupon.updated',
    CouponDeleted: 'coupon.deleted',
    AppConnected: 'auth.app_connected',
    AppDisconnected: 'auth.app_disconnected',
    ChatConnected: 'chat.connected',
    ChatUpdated: 'chat.updated',
    ChatRemoved: 'chat.removed',
    ChatDisabled: 'chat.disabled',
    SanctionsMatched: 'sanctions.matched',
    SanctionsAccepted: 'sanctions.accepted',
    SanctionsReturnRequested: 'sanctions.return_requested',
    SocialAccountConnected: 'auth.social_connected',
    SocialAccountDisconnected: 'auth.social_disconnected',
} as const);

export type ActivityAction = (typeof ActivityAction)[keyof typeof ActivityAction];
