import type { Asset, Currency, OrString } from '../enums.ts';
import { ApiResource, bool, date, int, string, type Attributes } from './api-resource.ts';

/** A crypto payment for a month of Pro: where to pay it and what to send. */
export class ProPayment extends ApiResource {
    /** How many months it pays for. */
    readonly months: number;

    /** What it costs, in currency. */
    readonly price: string;

    /** The currency of the price. */
    readonly currency: OrString<Currency>;

    /** The coin it is paid in. */
    readonly asset: OrString<Asset>;

    /** What to send, in the coin. */
    readonly assetAmount: string;

    /** The page to pay it on. */
    readonly checkoutUrl: string;

    /** When its rate stops holding. */
    readonly expiresAt: Date | null;

    /** Whether this request started it, rather than answering with the one already waiting. */
    readonly started: boolean;

    constructor(attributes: Attributes, meta: Attributes = {}) {
        super(attributes);

        this.months = int(attributes, 'months', 1);
        this.price = string(attributes, 'price');
        this.currency = string(attributes, 'currency');
        this.asset = string(attributes, 'asset');
        this.assetAmount = string(attributes, 'asset_amount');
        this.checkoutUrl = string(attributes, 'checkout_url');
        this.expiresAt = date(attributes, 'expires_at');
        this.started = bool(meta, 'started');
    }
}
