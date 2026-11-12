import type { AddressNetwork, OrString } from '../enums.ts';
import type { PayoutAddressUpdateParams, RequestOptions } from '../params.ts';
import { PayoutAddress } from '../resources/payout.ts';
import { list, path, Service } from './service.ts';

/**
 * The /v1/payout-addresses endpoints, one address per network family: bitcoin, litecoin, dogecoin, bitcoincash, evm (Ethereum),
 * bsc (BNB Chain), base, arbitrum, polygon, tron, monero, solana or lightning, as the AddressNetwork values name them.
 * Reading needs payout_addresses:read; changing needs payout_addresses:write and an owner's switch under Payment settings.
 */
export class PayoutAddressService extends Service {
    /** List where payouts go in the API key's mode: one entry per network with coins on offer, its address null while there is none. */
    async list(): Promise<PayoutAddress[]> {
        return list(await this.respond('GET', '/v1/payout-addresses')).map((address) => new PayoutAddress(address));
    }

    /** Point the payouts of one network, such as AddressNetwork.Bitcoin or "evm", at an address. */
    async update(network: OrString<AddressNetwork>, params: PayoutAddressUpdateParams, options?: RequestOptions): Promise<PayoutAddress> {
        return new PayoutAddress(await this.request('PUT', path('/v1/payout-addresses/%s', network), params, options));
    }

    /** Remove the address of one network, so its payouts wait for a new one. */
    async delete(network: OrString<AddressNetwork>, options?: RequestOptions): Promise<PayoutAddress> {
        return new PayoutAddress(await this.request('DELETE', path('/v1/payout-addresses/%s', network), undefined, options));
    }
}
