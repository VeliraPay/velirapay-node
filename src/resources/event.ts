import type { EventType, OrString } from '../enums.ts';
import { ApiResource, date, map, object, string, type Attributes } from './api-resource.ts';
import { Charge, type ApiCharge } from './charge.ts';
import { Invoice } from './invoice.ts';

/** Something that happened to a charge or an invoice, as the events API lists it. */
export class Event extends ApiResource {
    /** The event's id, as a webhook's eventId refers to it. */
    readonly id: string;

    /** One of the EventType values, such as "charge.paid". */
    readonly type: OrString<EventType>;

    /** What the event recorded, such as the amount and transaction of a detected payment. */
    readonly details: Record<string, unknown>;

    /** When it happened. */
    readonly createdAt: Date | null;

    /** The charge the event is about, as it is now, with its checkout page but without its timeline. */
    readonly charge: ApiCharge | null;

    /** The invoice the event is about. */
    readonly invoice: Invoice | null;

    constructor(attributes: Attributes) {
        super(attributes);

        this.id = string(attributes, 'id');
        this.type = string(attributes, 'type');
        this.details = map(attributes, 'details');
        this.createdAt = date(attributes, 'created_at');
        this.charge = object(attributes, 'charge', (charge) => new Charge(charge) as ApiCharge);
        this.invoice = object(attributes, 'invoice', (invoice) => new Invoice(invoice));
    }

    /** Whether the event is of any of the given types. */
    is(...types: OrString<EventType>[]): boolean {
        return types.includes(this.type);
    }
}
