import { PayoutStatus, type Asset, type OrString } from '../enums.ts';
import { ApiResource, date, int, nullableString, string, strings, type Attributes } from './api-resource.ts';

/** What became of one paid charge: what came in, what was kept, what was sent and the transaction that carried it. */
export class Payout extends ApiResource {
    /** The id of the charge the payout came from, which is also its own. */
    readonly id: string;

    /** The id of the charge the payout came from. */
    readonly charge: string;

    /** One of the PayoutStatus values: pending, sending, sent, failed or manual. */
    readonly status: OrString<PayoutStatus>;

    /** The coin it was paid in and goes out in. */
    readonly asset: OrString<Asset>;

    /** What the customer paid, in the coin. */
    readonly grossAmount: string;

    /** The rate of the platform's fee, in percent. */
    readonly feePercent: string;

    /** What was kept, in the coin. */
    readonly feeAmount: string;

    /** What the fee was worth in fiat, at the rate the charge was locked at. */
    readonly feeFiatAmount: string | null;

    /** The fiat currency of feeFiatAmount and exchangeRate. */
    readonly fiatCurrency: string | null;

    /** The rate the charge was locked at. */
    readonly exchangeRate: string | null;

    /** What the merchant is owed, before the chain's own fee. */
    readonly netAmount: string;

    /** What the chain charged, once it has been broadcast. */
    readonly networkFee: string | null;

    /** What reached the merchant, once it has been broadcast. */
    readonly sentAmount: string | null;

    /** Where it goes, or null while it waits for an address. */
    readonly payoutAddress: string | null;

    /** The transaction that carried it. */
    readonly payoutTxid: string | null;

    /** The transaction's page on a block explorer. */
    readonly explorerUrl: string | null;

    /** How many times forwarding has been tried. */
    readonly attempts: number;

    /** Why the last try did not work, or why it is held. */
    readonly lastError: string | null;

    /** When it may go out next. */
    readonly nextAttemptAt: Date | null;

    /** When it was broadcast. */
    readonly sentAt: Date | null;

    /** When it confirmed. */
    readonly confirmedAt: Date | null;

    /** When the books were written. */
    readonly createdAt: Date | null;

    constructor(attributes: Attributes) {
        super(attributes);

        this.id = string(attributes, 'id');
        this.charge = string(attributes, 'charge');
        this.status = string(attributes, 'status');
        this.asset = string(attributes, 'asset');
        this.grossAmount = string(attributes, 'gross_amount', '0');
        this.feePercent = string(attributes, 'fee_percent', '0');
        this.feeAmount = string(attributes, 'fee_amount', '0');
        this.feeFiatAmount = nullableString(attributes, 'fee_fiat_amount');
        this.fiatCurrency = nullableString(attributes, 'fiat_currency');
        this.exchangeRate = nullableString(attributes, 'exchange_rate');
        this.netAmount = string(attributes, 'net_amount', '0');
        this.networkFee = nullableString(attributes, 'network_fee');
        this.sentAmount = nullableString(attributes, 'sent_amount');
        this.payoutAddress = nullableString(attributes, 'payout_address');
        this.payoutTxid = nullableString(attributes, 'payout_txid');
        this.explorerUrl = nullableString(attributes, 'explorer_url');
        this.attempts = int(attributes, 'attempts');
        this.lastError = nullableString(attributes, 'last_error');
        this.nextAttemptAt = date(attributes, 'next_attempt_at');
        this.sentAt = date(attributes, 'sent_at');
        this.confirmedAt = date(attributes, 'confirmed_at');
        this.createdAt = date(attributes, 'created_at');
    }

    /** Whether the payout has confirmed, so the money is in the merchant's wallet. */
    isSent(): boolean {
        return this.status === PayoutStatus.Sent;
    }

    /** Whether the payout waits on an address or on a person. */
    isManual(): boolean {
        return this.status === PayoutStatus.Manual;
    }
}

/** What one coin adds up to across the account's payouts. */
export class PayoutSummary extends ApiResource {
    /** The coin this row adds up. */
    readonly asset: OrString<Asset>;

    /** How many paid charges it covers. */
    readonly payouts: number;

    /** What came in. */
    readonly grossAmount: string;

    /** What was kept in fees. */
    readonly feeAmount: string;

    /** What has reached the merchant. */
    readonly paidOutAmount: string;

    /** What is on its way and waiting to confirm. */
    readonly inFlightAmount: string;

    /** What is still owed and has not left yet. */
    readonly owedAmount: string;

    /** What the chains charged to forward it. */
    readonly networkFeeAmount: string;

    /** How many payouts wait for an address for this coin. */
    readonly waitingForAddress: number;

    constructor(attributes: Attributes) {
        super(attributes);

        this.asset = string(attributes, 'asset');
        this.payouts = int(attributes, 'payouts');
        this.grossAmount = string(attributes, 'gross_amount', '0');
        this.feeAmount = string(attributes, 'fee_amount', '0');
        this.paidOutAmount = string(attributes, 'paid_out_amount', '0');
        this.inFlightAmount = string(attributes, 'in_flight_amount', '0');
        this.owedAmount = string(attributes, 'owed_amount', '0');
        this.networkFeeAmount = string(attributes, 'network_fee_amount', '0');
        this.waitingForAddress = int(attributes, 'waiting_for_address');
    }
}

/** Where the account's payouts on one network go. */
export class PayoutAddress extends ApiResource {
    /** The network, such as "bitcoin" or "evm", which is also its id in the paths. */
    readonly network: string;

    /** The network's name. */
    readonly name: string;

    /** Where payouts go, null while there is no address: payouts in its coins then wait for one. */
    readonly address: string | null;

    /** The coins on offer on this network. */
    readonly assets: string[];

    /** Until when payouts to a newly saved address wait. */
    readonly payoutsHeldUntil: Date | null;

    /** When the address was last saved. */
    readonly updatedAt: Date | null;

    constructor(attributes: Attributes) {
        super(attributes);

        this.network = string(attributes, 'network');
        this.name = string(attributes, 'name');
        this.address = nullableString(attributes, 'address');
        this.assets = strings(attributes, 'assets');
        this.payoutsHeldUntil = date(attributes, 'payouts_held_until');
        this.updatedAt = date(attributes, 'updated_at');
    }
}
