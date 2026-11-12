import { Asset, type Currency, type OrString } from '../enums.ts';
import { ApiResource, int, nullableBool, nullableString, oneOf, string, type Attributes } from './api-resource.ts';

/** A coin that can be paid in the API key's mode, with the lowest price a charge in it can have. */
export class SupportedAsset extends ApiResource {
    /** What the API calls the coin, such as "BTC" or "USDT_BSC": pass it as asset when you create a charge. */
    readonly id: OrString<Asset>;

    /** The coin's name, such as "Tether USD". */
    readonly name: string;

    /** The coin's symbol, such as "USDT". */
    readonly ticker: string;

    /** The network the customer has to send it on. */
    readonly network: string;

    /** The token's contract on that network, or null for a network's own coin. */
    readonly contractAddress: string | null;

    /** The decimal places the coin has on its network. */
    readonly decimals: number;

    /** How many confirmations a payment needs before it counts. */
    readonly requiredConfirmations: number;

    /** About how long those confirmations take, in words. */
    readonly confirmationWait: string;

    /** Whether the account takes it right now, which needs a payout address for that network. */
    readonly accepted: boolean | null;

    /** The currency exchangeRate and minimumPrice are in. */
    readonly currency: OrString<Currency>;

    /** What one unit of the coin is worth in that currency right now, or null while no rate is available. */
    readonly exchangeRate: string | null;

    /** The least a charge in it can come to, in the coin itself, or null when it has no minimum of its own. */
    readonly minimumAmount: string | null;

    /** The lowest price a charge in it can have right now, in that currency, or null while a coin with a minimum has no rate. */
    readonly minimumPrice: string | null;

    /** What a charge in the coin asks the customer for on top of the price, in the coin, for the network; null for a coin without one. */
    readonly networkSurcharge: string | null;

    constructor(attributes: Attributes) {
        super(attributes);

        this.id = string(attributes, 'id');
        this.name = string(attributes, 'name');
        this.ticker = string(attributes, 'ticker');
        this.network = string(attributes, 'network');
        this.contractAddress = nullableString(attributes, 'contract_address');
        this.decimals = int(attributes, 'decimals');
        this.requiredConfirmations = int(attributes, 'required_confirmations');
        this.confirmationWait = string(attributes, 'confirmation_wait');
        this.accepted = nullableBool(attributes, 'accepted');
        this.currency = string(attributes, 'currency');
        this.exchangeRate = nullableString(attributes, 'exchange_rate');
        this.minimumAmount = nullableString(attributes, 'minimum_amount');
        this.minimumPrice = nullableString(attributes, 'minimum_price');
        this.networkSurcharge = nullableString(attributes, 'network_surcharge');
    }

    /** The Asset value of the coin, or null for one the API added after this version of the library. */
    asset(): Asset | null {
        return oneOf(Asset, this.id);
    }
}
