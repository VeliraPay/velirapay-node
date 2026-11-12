import type { Asset, Currency, Mode, OrString } from '../enums.ts';
import { ApiResource, bool, date, int, map, nullableNumber, nullableString, number, records, string, type Attributes } from './api-resource.ts';

/** The days an overview covers: the last 30, today included. */
export interface OverviewPeriod {
    /** The first day, at midnight UTC. */
    from: Date | null;
    /** The last day, today, at midnight UTC. */
    to: Date | null;
}

/** How the period's attempts to pay ended, each in exactly one bucket; a new quote or a switch of coin carries an attempt on rather than starting another. */
export interface OverviewFunnel {
    /** How many attempts were started. */
    started: number;
    /** How many were paid. */
    paid: number;
    /** How many are still pending or underpaid. */
    waiting: number;
    /** How many expired or were canceled without a transfer. */
    abandoned: number;
    /** How many expired or were canceled after a transfer arrived. */
    incomplete: number;
    /** The attempts per coin, the most started first. */
    assets: OverviewFunnelAsset[];
}

/** How the period's attempts to pay in one coin ended. */
export interface OverviewFunnelAsset {
    asset: OrString<Asset>;
    started: number;
    paid: number;
    abandoned: number;
}

/** What needs a person now. */
export interface OverviewAttention {
    /** The latest underpaid charges that received something, at most five, to accept or chase. */
    underpaidCharges: OverviewChargeAmount[];
    /** The latest expired or canceled charges with a payment still waiting to be accepted, at most five. */
    latePayments: OverviewChargeAmount[];
    /** The payouts per coin that wait for a payout address. */
    payoutsWaitingForAddress: OverviewWaitingPayouts[];
    /** How many active webhook endpoints had a delivery fail in the last 7 days. */
    failingWebhookEndpoints: number;
}

/** A charge that needs a person, with what it asked for and what arrived. */
export interface OverviewChargeAmount {
    /** The charge's id. */
    id: string;
    asset: OrString<Asset>;
    /** What the charge asked for, in the coin. */
    amount: string;
    /** What arrived, in the coin: for a late payment, what came after the charge closed. */
    receivedAmount: string;
}

/** How many payouts in one coin wait for a payout address. */
export interface OverviewWaitingPayouts {
    asset: OrString<Asset>;
    count: number;
}

/** One coin's share of the period's paid charges. */
export interface OverviewAsset {
    asset: OrString<Asset>;
    /** How many charges in the coin were paid. */
    paidCharges: number;
    /** Their share of every paid charge, in percent. */
    sharePercent: number;
}

/** A payment link among those paid through most in the period. */
export interface OverviewPaymentLink {
    /** The link's id. */
    id: string | null;
    title: string | null;
    /** How many charges were paid through it. */
    paidCharges: number;
}

/** Which first steps the account has taken in the mode. */
export interface OverviewSetup {
    /** Whether it has a payout address. */
    payoutAddress: boolean;
    /** Whether it has a payment link. */
    paymentLink: boolean;
    /** Whether a charge has been paid. */
    paidCharge: boolean;
    /** Whether it has a webhook endpoint. */
    webhookEndpoint: boolean;
    /** Whether its public profile has a logo, a display name or a website. */
    publicProfile: boolean;
}

/** One day of the period. */
export interface OverviewDay {
    /** The day, at midnight UTC. */
    date: Date | null;
    /** What was paid that day in the overview's currency. */
    volume: string;
    /** What the payouts confirmed that day came to. */
    sentVolume: string;
    /** How many charges in the overview's currency were paid that day. */
    paidCharges: number;
}

/** The dashboard's figures for the last 30 days, and what needs attention now. */
export class Overview extends ApiResource {
    /** The days the figures cover. */
    readonly period: OverviewPeriod;

    /** The currency the amounts are in: the one most charges were paid in lately, or the account's default. */
    readonly currency: OrString<Currency>;

    /** What was paid in the period. */
    readonly volume: string;

    /** How the volume changed against the 30 days before, in percent, or null when nothing was paid then. */
    readonly volumeChangePercent: number | null;

    /** What the payouts confirmed in the period came to, at their charges' locked rates. */
    readonly sentVolume: string;

    /** How many charges were paid. */
    readonly paidCharges: number;

    /** Of the period's charges that were paid, expired or canceled, the share paid, in percent; null when there were none. */
    readonly conversionRatePercent: number | null;

    /** How many charges are waiting to be paid. */
    readonly pendingCharges: number;

    /** How many payment links take payments. */
    readonly activePaymentLinks: number;

    /** How many invoices are open. */
    readonly openInvoices: number;

    /** How many open invoices are past due. */
    readonly overdueInvoices: number;

    /** How the period's attempts to pay ended, in all and per coin. */
    readonly funnel: OverviewFunnel;

    /** What needs a person now: short and late payments, payouts without an address and failing webhook endpoints. */
    readonly attention: OverviewAttention;

    /** Each coin's share of the period's paid charges, the most paid first. */
    readonly assets: OverviewAsset[];

    /** The payment links paid through most in the period. */
    readonly topPaymentLinks: OverviewPaymentLink[];

    /** Which first steps the account has taken in the mode. */
    readonly setup: OverviewSetup;

    /** Every day of the period, oldest first. */
    readonly daily: OverviewDay[];

    /** The mode of the API key that fetched the overview: "live" or "test". */
    readonly mode: OrString<Mode> | null;

    constructor(attributes: Attributes, meta: Attributes = {}) {
        super(attributes);

        const period = map(attributes, 'period');
        const funnel = map(attributes, 'funnel');
        const attention = map(attributes, 'attention');
        const setup = map(attributes, 'setup');

        this.period = { from: date(period, 'from'), to: date(period, 'to') };
        this.currency = string(attributes, 'currency');
        this.volume = string(attributes, 'volume', '0');
        this.volumeChangePercent = nullableNumber(attributes, 'volume_change_percent');
        this.sentVolume = string(attributes, 'sent_volume', '0');
        this.paidCharges = int(attributes, 'paid_charges');
        this.conversionRatePercent = nullableNumber(attributes, 'conversion_rate_percent');
        this.pendingCharges = int(attributes, 'pending_charges');
        this.activePaymentLinks = int(attributes, 'active_payment_links');
        this.openInvoices = int(attributes, 'open_invoices');
        this.overdueInvoices = int(attributes, 'overdue_invoices');
        this.funnel = {
            started: int(funnel, 'started'),
            paid: int(funnel, 'paid'),
            waiting: int(funnel, 'waiting'),
            abandoned: int(funnel, 'abandoned'),
            incomplete: int(funnel, 'incomplete'),
            assets: records(funnel, 'assets').map((row) => ({
                asset: string(row, 'asset'),
                started: int(row, 'started'),
                paid: int(row, 'paid'),
                abandoned: int(row, 'abandoned'),
            })),
        };
        this.attention = {
            underpaidCharges: records(attention, 'underpaid_charges').map(chargeAmount),
            latePayments: records(attention, 'late_payments').map(chargeAmount),
            payoutsWaitingForAddress: records(attention, 'payouts_waiting_for_address').map((row) => ({ asset: string(row, 'asset'), count: int(row, 'count') })),
            failingWebhookEndpoints: int(attention, 'failing_webhook_endpoints'),
        };
        this.assets = records(attributes, 'assets').map((row) => ({
            asset: string(row, 'asset'),
            paidCharges: int(row, 'paid_charges'),
            sharePercent: number(row, 'share_percent'),
        }));
        this.topPaymentLinks = records(attributes, 'top_payment_links').map((link) => ({
            id: nullableString(link, 'id'),
            title: nullableString(link, 'title'),
            paidCharges: int(link, 'paid_charges'),
        }));
        this.setup = {
            payoutAddress: bool(setup, 'payout_address'),
            paymentLink: bool(setup, 'payment_link'),
            paidCharge: bool(setup, 'paid_charge'),
            webhookEndpoint: bool(setup, 'webhook_endpoint'),
            publicProfile: bool(setup, 'public_profile'),
        };
        this.daily = records(attributes, 'daily').map((day) => ({
            date: date(day, 'date'),
            volume: string(day, 'volume', '0'),
            sentVolume: string(day, 'sent_volume', '0'),
            paidCharges: int(day, 'paid_charges'),
        }));
        this.mode = nullableString(meta, 'mode');
    }
}

/** Read a charge that needs a person. */
function chargeAmount(row: Attributes): OverviewChargeAmount {
    return {
        id: string(row, 'id'),
        asset: string(row, 'asset'),
        amount: string(row, 'amount', '0'),
        receivedAmount: string(row, 'received_amount', '0'),
    };
}
