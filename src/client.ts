import { Mode } from './enums.ts';
import { InvalidArgumentError } from './errors.ts';
import type { ApiResponse } from './http/api-response.ts';
import { HttpTransport, type Fetch } from './http/transport.ts';
import type { RequestOptions } from './params.ts';
import { AccountService } from './services/account.ts';
import { ActivityService } from './services/activity.ts';
import { ApiKeyService } from './services/api-keys.ts';
import { AssetService } from './services/assets.ts';
import { BillingService } from './services/billing.ts';
import { ChargeService } from './services/charges.ts';
import { CouponService } from './services/coupons.ts';
import { EventService } from './services/events.ts';
import { InvoiceService } from './services/invoices.ts';
import { InvitationService, MemberService } from './services/members.ts';
import { OverviewService } from './services/overview.ts';
import { PaymentLinkService } from './services/payment-links.ts';
import { PayoutAddressService } from './services/payout-addresses.ts';
import { PayoutService } from './services/payouts.ts';
import { WebhookEndpointService } from './services/webhook-endpoints.ts';
import { VERSION } from './version.ts';

/** How the client reaches the API. */
export interface ClientOptions {
    /** The API's address; https://api.velirapay.com unless given. */
    baseUrl?: string;
    /** How many times a request is tried again after a network error, a rate limit, an outage, or while one with the same idempotency key is still being processed; 0 turns retries off. 2 unless given. */
    maxRetries?: number;
    /** The longest Retry-After, in seconds, that is waited out before trying again; a longer one is thrown straight away. 10 unless given. */
    maxRetryAfter?: number;
    /** How many seconds an attempt may take. 30 unless given. */
    timeout?: number;
    /** Your application's name and version, added to the User-Agent. */
    appInfo?: string;
    /** The fetch implementation to send requests with; the global one unless given. */
    fetch?: Fetch;
}

/** A client for the VeliraPay API, authenticated with one API key. */
export class VeliraPayClient {
    /** The version of this library. */
    static readonly VERSION = VERSION;

    /** The address of the VeliraPay API. */
    static readonly DEFAULT_BASE_URL = 'https://api.velirapay.com';

    /** The account the API key belongs to. */
    readonly account: AccountService;

    /** Assets: the coins on offer, and the lowest price each can be charged at. */
    readonly assets: AssetService;

    /** Charges: how to ask a customer for a payment, in one coin. */
    readonly charges: ChargeService;

    /** Payment links: reusable checkout pages many customers pay through. */
    readonly paymentLinks: PaymentLinkService;

    /** Invoices: itemised bills customers pay in the coin of their choice. */
    readonly invoices: InvoiceService;

    /** Coupons: discount codes for the hosted checkout and new charges. */
    readonly coupons: CouponService;

    /** Payouts: what became of each paid charge. */
    readonly payouts: PayoutService;

    /** Events: the history of every charge and invoice. */
    readonly events: EventService;

    /** Webhook endpoints: where webhooks are delivered, and whether they can be. */
    readonly webhookEndpoints: WebhookEndpointService;

    /** The overview: the dashboard's figures for the last 30 days. */
    readonly overview: OverviewService;

    /** Payout addresses: where the account's payouts go on each network. */
    readonly payoutAddresses: PayoutAddressService;

    /** The activity log: everything done in the account, and who did it. */
    readonly activity: ActivityService;

    /** API keys: the account's keys, never reaching further than the one asking. */
    readonly apiKeys: ApiKeyService;

    /** Members: the people in the account and their roles. */
    readonly members: MemberService;

    /** Invitations: who has been asked to join and has not yet. */
    readonly invitations: InvitationService;

    /** Billing: paying for Pro in crypto. */
    readonly billing: BillingService;

    readonly #mode: Mode;
    readonly #transport: HttpTransport;

    /**
     * Create a new client.
     *
     * @param apiKey A secret key from the dashboard, starting with "vp_live_" or "vp_test_". Keep it on your server.
     */
    constructor(apiKey: string | undefined, options: ClientOptions = {}) {
        if (typeof apiKey !== 'string' || apiKey.trim() === '') {
            throw new InvalidArgumentError('A VeliraPay API key is required. Create one in the dashboard under Developers > API keys.');
        }

        const mode = Object.values(Mode).find((candidate) => apiKey.startsWith(`vp_${candidate}_`));

        if (mode === undefined) {
            throw new InvalidArgumentError('A VeliraPay API key starts with "vp_live_" or "vp_test_". Copy yours from the dashboard under Developers > API keys.');
        }

        if (!/^[\x21-\x7e]+$/.test(apiKey)) {
            throw new InvalidArgumentError('The API key holds a character no key has, such as a space or a line break. Check how it is loaded.');
        }

        const { baseUrl = VeliraPayClient.DEFAULT_BASE_URL, maxRetries = 2, maxRetryAfter = 10, timeout = 30, appInfo } = options;
        const fetch = options.fetch ?? globalThis.fetch;

        if (!Number.isInteger(maxRetries) || maxRetries < 0) {
            throw new InvalidArgumentError('The number of retries must be a whole number, 0 or more.');
        }

        if (!(maxRetryAfter >= 0)) {
            throw new InvalidArgumentError('The longest Retry-After to wait out cannot be negative.');
        }

        if (!(timeout > 0) || !Number.isFinite(timeout)) {
            throw new InvalidArgumentError('The timeout must be a number of seconds above 0.');
        }

        if (!/^https?:\/\/[^\s/]+/i.test(baseUrl) || !URL.canParse(baseUrl)) {
            throw new InvalidArgumentError('The base URL must be an http or https address.');
        }

        if (typeof fetch !== 'function') {
            throw new InvalidArgumentError('No fetch implementation was found. Use Node.js 22 or later, or pass one as the fetch option.');
        }

        let userAgent = `VeliraPay-Node/${VERSION} Node/${globalThis.process?.versions?.node ?? 'unknown'}`;

        if (appInfo !== undefined && appInfo.trim() !== '') {
            if (!/^[\x20-\x7e]+$/.test(appInfo)) {
                throw new InvalidArgumentError('The app info can only hold printable ASCII characters, as it is sent in the User-Agent header.');
            }

            userAgent += ` ${appInfo.trim()}`;
        }

        this.#mode = mode;
        this.#transport = new HttpTransport({ apiKey, fetch, baseUrl, maxRetries, maxRetryAfter, timeout, userAgent });

        this.account = new AccountService(this.#transport);
        this.assets = new AssetService(this.#transport);
        this.charges = new ChargeService(this.#transport);
        this.paymentLinks = new PaymentLinkService(this.#transport);
        this.invoices = new InvoiceService(this.#transport);
        this.coupons = new CouponService(this.#transport);
        this.payouts = new PayoutService(this.#transport);
        this.events = new EventService(this.#transport);
        this.webhookEndpoints = new WebhookEndpointService(this.#transport);
        this.overview = new OverviewService(this.#transport);
        this.payoutAddresses = new PayoutAddressService(this.#transport);
        this.activity = new ActivityService(this.#transport);
        this.apiKeys = new ApiKeyService(this.#transport);
        this.members = new MemberService(this.#transport);
        this.invitations = new InvitationService(this.#transport);
        this.billing = new BillingService(this.#transport);
    }

    /** The mode the API key works in, read from its prefix. */
    mode(): Mode {
        return this.#mode;
    }

    /** Whether the API key moves real funds. */
    isLiveMode(): boolean {
        return this.#mode === Mode.Live;
    }

    /** Whether the API key works on test networks. */
    isTestMode(): boolean {
        return this.#mode === Mode.Test;
    }

    /** The response to the most recent request this client made, such as to read its headers; with requests running side by side, whichever finished last. */
    lastResponse(): ApiResponse | null {
        return this.#transport.lastResponse();
    }

    /**
     * Send a request to an endpoint this library has no method for yet.
     *
     * @param params The query string for GET requests, the JSON body otherwise.
     */
    request(method: string, path: string, params: object = {}, options: RequestOptions = {}): Promise<ApiResponse> {
        if (method.toUpperCase() === 'GET') {
            return this.#transport.request('GET', path, params);
        }

        return this.#transport.request(method, path, {}, Object.keys(params).length === 0 ? undefined : params, options.idempotencyKey);
    }
}
