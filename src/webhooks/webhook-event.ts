import { Mode, type EventType, type OrString } from '../enums.ts';
import { InvalidArgumentError } from '../errors.ts';
import { ApiResource, bool, date, isRecord, map, nullableString, object, string, type Attributes } from '../resources/api-resource.ts';
import { Charge, Transaction } from '../resources/charge.ts';
import { Invoice } from '../resources/invoice.ts';
import { Payout } from '../resources/payout.ts';

/** The event of the challenge sent to an endpoint when it is added or moved: it receives nothing else until it answers. */
export const VERIFICATION_EVENT = 'webhook.verification';

/** A webhook delivery's payload. */
export class WebhookEvent extends ApiResource {
    /** The delivery's id, also sent as the X-VeliraPay-Delivery header; retries keep it, but every endpoint's copy of an event has its own. */
    readonly id: string;

    /** The event's id in the events API, the same on every endpoint's copy, so the one to skip duplicates by; null for test deliveries. */
    readonly eventId: string | null;

    /** One of the EventType values, such as "charge.paid", or "webhook.verification". */
    readonly type: OrString<EventType | typeof VERIFICATION_EVENT>;

    /** Either "live" or "test". */
    readonly mode: OrString<Mode>;

    /** Whether this is a sample sent with the dashboard's "Send test event" button. */
    readonly test: boolean;

    /** When the delivery was created. */
    readonly createdAt: Date | null;

    /** The charge, for charge.* and payout.* events. */
    readonly charge: Charge | null;

    /** The invoice, for invoice.* events. */
    readonly invoice: Invoice | null;

    /** The transfer the event is about, for charge.payment_detected and charge.late_payment. */
    readonly transaction: Transaction | null;

    /** The payout the event is about, for payout.* events. */
    readonly payout: Payout | null;

    constructor(attributes: Attributes) {
        super(attributes);

        const objects = map(attributes, 'data');

        this.id = string(attributes, 'id');
        this.eventId = nullableString(attributes, 'event_id');
        this.type = string(attributes, 'event');
        this.mode = string(attributes, 'mode');
        this.test = bool(attributes, 'test');
        this.createdAt = date(attributes, 'created_at');
        this.charge = object(objects, 'charge', (charge) => new Charge(charge));
        this.invoice = object(objects, 'invoice', (invoice) => new Invoice(invoice));
        this.transaction = object(objects, 'transaction', (transaction) => new Transaction(transaction));
        this.payout = object(objects, 'payout', (payout) => new Payout(payout));
    }

    /** Read a delivery's raw body, without checking its signature. */
    static fromPayload(payload: string | Uint8Array): WebhookEvent {
        let decoded: unknown;

        try {
            decoded = JSON.parse(typeof payload === 'string' ? payload : new TextDecoder('utf-8', { fatal: true }).decode(payload));
        } catch (error) {
            throw new InvalidArgumentError(`The webhook payload is not valid JSON: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
        }

        if (!isRecord(decoded)) {
            throw new InvalidArgumentError('The webhook payload is not a JSON object.');
        }

        return new WebhookEvent(decoded);
    }

    /** Whether the event is of any of the given types. */
    is(...types: OrString<EventType | typeof VERIFICATION_EVENT>[]): boolean {
        return types.includes(this.type);
    }

    /** Whether the event concerns real funds. */
    isLiveMode(): boolean {
        return this.mode === Mode.Live;
    }

    /** Whether this is the challenge VeliraPay sends when an endpoint is added or moved, to be answered with challengeResponse(). */
    isVerification(): boolean {
        return this.is(VERIFICATION_EVENT);
    }

    /** The value a verification delivery must be answered with, or null for every other delivery. */
    challenge(): string | null {
        if (!this.isVerification()) {
            return null;
        }

        const challenge = map(this.toJSON(), 'data')['challenge'];

        return typeof challenge === 'string' ? challenge : null;
    }

    /** The JSON body that answers a verification delivery, or null for every other delivery. */
    challengeResponse(): string | null {
        const challenge = this.challenge();

        return challenge === null ? null : JSON.stringify({ challenge });
    }
}
