import { AssetPage } from '../page.ts';
import type { AssetListParams } from '../params.ts';
import { SupportedAsset } from '../resources/supported-asset.ts';
import { Service } from './service.ts';

/** The /v1/assets endpoint. */
export class AssetService extends Service {
    /** List the coins that can be paid in the API key's mode, with the lowest price each can be charged at, in one page that also gives the currencies prices can be asked in. */
    async list(params: AssetListParams = {}): Promise<AssetPage> {
        return this.page('/v1/assets', params, (asset) => new SupportedAsset(asset), AssetPage);
    }
}
