import { Overview } from '../resources/overview.ts';
import { Service } from './service.ts';

/** The /v1/overview endpoint. Needs overview:read. */
export class OverviewService extends Service {
    /** Retrieve the dashboard's figures for the last 30 days, in the API key's mode. */
    async retrieve(): Promise<Overview> {
        return new Overview(await this.request('GET', '/v1/overview'));
    }
}
