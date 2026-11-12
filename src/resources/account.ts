import {
    AccountType,
    BusinessType,
    CheckoutAppearance,
    Industry,
    Mode,
    MonthlyVolume,
    PlanName,
    type Asset,
    type CheckoutLocale,
    type Currency,
    type OrString,
} from '../enums.ts';
import { ApiResource, bool, date, isRecord, map, nullableString, oneOf, string, strings, type Attributes } from './api-resource.ts';

/** How the account's checkout looks and what it falls back on. */
export interface AccountCheckout {
    /** One of the CheckoutAppearance values: auto, light or dark. */
    appearance: OrString<CheckoutAppearance>;
    /** The order coins are listed in. */
    coinOrder: OrString<Asset>[];
    /** The coin the checkout starts on, or null when the merchant has not picked one. */
    defaultCoin: OrString<Asset> | null;
    successUrl: string | null;
    cancelUrl: string | null;
    successMessage: string | null;
    hidePoweredBy: boolean;
}

/** How the account's invoices are numbered and printed. */
export interface AccountInvoices {
    numberPrefix: string | null;
    footer: string | null;
    showBusinessDetails: boolean;
}

/** The account an API key belongs to: a personal account or an organization. */
export class Account extends ApiResource {
    /** The account's slug. */
    readonly id: string;

    /** One of the AccountType values: personal or organization. */
    readonly type: OrString<AccountType>;

    /** The account's name. */
    readonly name: string;

    /** The name customers see. */
    readonly displayName: string;

    /** The logo customers see. */
    readonly logoUrl: string | null;

    /** The logo customers see on a dark background. */
    readonly logoDarkUrl: string | null;

    /** The merchant's website. */
    readonly websiteUrl: string | null;

    /** Where customers can reach the merchant. */
    readonly supportEmail: string | null;

    /** The phone number customers see next to the support email. */
    readonly supportPhone: string | null;

    /** The checkout's accent colour, as "#rrggbb". */
    readonly brandColor: string | null;

    /** The merchant's terms and conditions. */
    readonly termsUrl: string | null;

    /** The merchant's refund policy. */
    readonly refundPolicyUrl: string | null;

    /** Who runs the account and what it sells; every field is null until it is filled in, and for a key without the sensitive account:write permission. */
    readonly business: AccountBusiness;

    /** The currency new links and reports default to. */
    readonly defaultCurrency: OrString<Currency>;

    /** How far short of the amount due, in percent, still counts as paid. */
    readonly underpaymentTolerance: string;

    /** How much surplus, in percent, is ignored before a charge is flagged as overpaid. */
    readonly overpaymentThreshold: string;

    /** One of the PlanName values: free or pro. */
    readonly plan: OrString<PlanName>;

    /** The share of each payment kept as the platform's fee, in percent. */
    readonly feePercent: string;

    /** When Pro ends, or null while it renews, has no end or the account is on the free plan. */
    readonly proEndsAt: Date | null;

    /** The checkout's appearance, coin order, default coin and defaults. */
    readonly checkout: AccountCheckout | null;

    /** The invoice numbering, footer and business details settings. */
    readonly invoices: AccountInvoices | null;

    /** The checkout's fallback language, one of the CheckoutLocale values, or null for English. */
    readonly checkoutLocale: OrString<CheckoutLocale> | null;

    /** Whether automatic invoice reminders are enabled. */
    readonly invoiceReminders: boolean;

    /** Whether the owner allows API keys and AI apps to change payout addresses. */
    readonly apiPayoutAddressChanges: boolean;

    /** When the account was created. */
    readonly createdAt: Date | null;

    /** The mode of the API key that fetched the account: "live" or "test". */
    readonly mode: OrString<Mode> | null;

    /** The coins the account can be paid in right now, in that mode. */
    readonly acceptedAssets: OrString<Asset>[];

    constructor(attributes: Attributes, meta: Attributes = {}) {
        super(attributes);

        const plan = map(attributes, 'plan');
        const checkout = attributes['checkout'];
        const invoices = attributes['invoices'];

        this.id = string(attributes, 'id');
        this.type = string(attributes, 'type');
        this.name = string(attributes, 'name');
        this.displayName = string(attributes, 'display_name', this.name);
        this.logoUrl = nullableString(attributes, 'logo_url');
        this.logoDarkUrl = nullableString(attributes, 'logo_dark_url');
        this.websiteUrl = nullableString(attributes, 'website_url');
        this.supportEmail = nullableString(attributes, 'support_email');
        this.supportPhone = nullableString(attributes, 'support_phone');
        this.brandColor = nullableString(attributes, 'brand_color');
        this.termsUrl = nullableString(attributes, 'terms_url');
        this.refundPolicyUrl = nullableString(attributes, 'refund_policy_url');
        this.business = new AccountBusiness(map(attributes, 'business'));
        this.defaultCurrency = string(attributes, 'default_currency');
        this.underpaymentTolerance = string(attributes, 'underpayment_tolerance', '0');
        this.overpaymentThreshold = string(attributes, 'overpayment_threshold', '0');
        this.plan = string(plan, 'name', PlanName.Free);
        this.feePercent = string(plan, 'fee_percent', '0');
        this.proEndsAt = date(plan, 'pro_ends_at');
        this.checkout = isRecord(checkout) ? {
            appearance: string(checkout, 'appearance', CheckoutAppearance.Auto),
            coinOrder: strings(checkout, 'coin_order'),
            defaultCoin: nullableString(checkout, 'default_coin'),
            successUrl: nullableString(checkout, 'success_url'),
            cancelUrl: nullableString(checkout, 'cancel_url'),
            successMessage: nullableString(checkout, 'success_message'),
            hidePoweredBy: bool(checkout, 'hide_powered_by'),
        } : null;
        this.invoices = isRecord(invoices) ? {
            numberPrefix: nullableString(invoices, 'number_prefix'),
            footer: nullableString(invoices, 'footer'),
            showBusinessDetails: bool(invoices, 'show_business_details'),
        } : null;
        this.checkoutLocale = nullableString(attributes, 'checkout_locale');
        this.invoiceReminders = bool(attributes, 'invoice_reminders');
        this.apiPayoutAddressChanges = bool(attributes, 'api_payout_address_changes');
        this.createdAt = date(attributes, 'created_at');
        this.mode = nullableString(meta, 'mode');
        this.acceptedAssets = strings(meta, 'accepted_assets');
    }

    /** Whether the account is on Pro, which keeps no fee. */
    isPro(): boolean {
        return this.plan === PlanName.Pro;
    }

    /** Whether this is an organization rather than a personal account. */
    isOrganization(): boolean {
        return this.type === AccountType.Organization;
    }

    /** Whether the key that fetched the account works in test mode. */
    isTestMode(): boolean {
        return this.mode === Mode.Test;
    }
}

/** Who runs an account and what it sells, as entered under Business details in its settings. */
export class AccountBusiness extends ApiResource {
    /** The kind of legal entity, or null when unset or a value this library does not know yet, which get('type') still returns. */
    readonly type: BusinessType | null;

    /** The registered name of the business. */
    readonly legalName: string | null;

    /** The company registration number. */
    readonly registrationNumber: string | null;

    /** The tax or VAT number. */
    readonly taxId: string | null;

    /** The business's address. */
    readonly address: Address;

    /** What the account sells, or null when unset or a value this library does not know yet, which get('industry') still returns. */
    readonly industry: Industry | null;

    /** What the account sells, in its own words. */
    readonly productDescription: string | null;

    /** The expected monthly takings, or null when unset or a value this library does not know yet, which get('monthly_volume') still returns. */
    readonly monthlyVolume: MonthlyVolume | null;

    /** The business's phone number, in international format. */
    readonly phone: string | null;

    constructor(attributes: Attributes) {
        super(attributes);

        this.type = oneOf(BusinessType, attributes['type']);
        this.legalName = nullableString(attributes, 'legal_name');
        this.registrationNumber = nullableString(attributes, 'registration_number');
        this.taxId = nullableString(attributes, 'tax_id');
        this.address = new Address(map(attributes, 'address'));
        this.industry = oneOf(Industry, attributes['industry']);
        this.productDescription = nullableString(attributes, 'product_description');
        this.monthlyVolume = oneOf(MonthlyVolume, attributes['monthly_volume']);
        this.phone = nullableString(attributes, 'phone');
    }
}

/** A postal address. */
export class Address extends ApiResource {
    /** The street address. */
    readonly line1: string | null;

    /** The apartment, suite or building. */
    readonly line2: string | null;

    /** The city or town. */
    readonly city: string | null;

    /** The postal code. */
    readonly postalCode: string | null;

    /** The state, county or region. */
    readonly state: string | null;

    /** The country, as an ISO 3166 two-letter code. */
    readonly country: string | null;

    constructor(attributes: Attributes) {
        super(attributes);

        this.line1 = nullableString(attributes, 'line1');
        this.line2 = nullableString(attributes, 'line2');
        this.city = nullableString(attributes, 'city');
        this.postalCode = nullableString(attributes, 'postal_code');
        this.state = nullableString(attributes, 'state');
        this.country = nullableString(attributes, 'country');
    }
}
