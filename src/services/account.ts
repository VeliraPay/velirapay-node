import type { ApiResponse } from '../http/api-response.ts';
import type { AccountUpdateParams, PaymentSettingsUpdateParams, RequestOptions } from '../params.ts';
import { Account } from '../resources/account.ts';
import { data, meta, Service, withDecimalAmounts } from './service.ts';

/** The /v1/account and /v1/payment-settings endpoints. */
export class AccountService extends Service {
    /** Retrieve the account the API key belongs to, with the coins it accepts in the key's mode. */
    async retrieve(): Promise<Account> {
        return account(await this.respond('GET', '/v1/account'));
    }

    /** Change the account's name, public profile, checkout and invoice settings or business details, in the shape retrieve() reads; null clears a field. Needs account:write. */
    async update(params: AccountUpdateParams, options?: RequestOptions): Promise<Account> {
        return account(await this.respond('PATCH', '/v1/account', params, options));
    }

    /** Change the default currency, the payment tolerances, the checkout language or invoice reminders. Needs payment_settings:write. */
    async updatePaymentSettings(params: PaymentSettingsUpdateParams, options?: RequestOptions): Promise<Account> {
        return account(await this.respond('PATCH', '/v1/payment-settings', withDecimalAmounts(params, 'underpayment_tolerance', 'overpayment_threshold'), options));
    }
}

/** Read the account and its meta from an answer. */
function account(response: ApiResponse): Account {
    return new Account(data(response), meta(response));
}
