import type { Page } from '../page.ts';
import type { ActivityListParams } from '../params.ts';
import { Activity } from '../resources/activity.ts';
import { Service } from './service.ts';

/** The /v1/activity endpoint. Needs activity:read. */
export class ActivityService extends Service {
    /** List the account's activity log, newest first: the API key's mode, and what belongs to none, such as sign-ins. */
    async list(params: ActivityListParams = {}): Promise<Page<Activity>> {
        return this.page('/v1/activity', params, (entry) => new Activity(entry));
    }

    /** Iterate over the whole activity log, newest first, fetching pages as they are reached. */
    async *iterator(params: Omit<ActivityListParams, 'page'> = {}): AsyncGenerator<Activity, void, undefined> {
        yield* (await this.list(params)).autoPagingIterator();
    }
}
