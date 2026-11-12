import type { Page } from '../page.ts';
import type { EventListParams } from '../params.ts';
import { Event } from '../resources/event.ts';
import { path, Service } from './service.ts';

/** The /v1/events endpoints. */
export class EventService extends Service {
    /** Retrieve an event by its id. */
    async retrieve(id: string): Promise<Event> {
        return new Event(await this.request('GET', path('/v1/events/%s', id)));
    }

    /** List events, newest first. */
    async list(params: EventListParams = {}): Promise<Page<Event>> {
        return this.page('/v1/events', params, (event) => new Event(event));
    }

    /** Iterate over every event, newest first, fetching pages as they are reached. */
    async *iterator(params: Omit<EventListParams, 'page'> = {}): AsyncGenerator<Event, void, undefined> {
        yield* (await this.list(params)).autoPagingIterator();
    }
}
