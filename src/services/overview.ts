import { Overview } from '../resources/overview.ts';
import { data, meta, Service } from './service.ts';

/** The /v1/overview endpoint. Needs overview:read. */
export class OverviewService extends Service {
    /** Retrieve the dashboard's figures for the last 30 days, in the API key's mode, and what needs attention now. */
    async retrieve(): Promise<Overview> {
        const response = await this.respond('GET', '/v1/overview');

        return new Overview(data(response), meta(response));
    }
}
