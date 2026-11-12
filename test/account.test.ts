import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AccountType, ActivityAction, AddressNetwork, Asset, BusinessType, CheckoutAppearance, CheckoutLocale, Currency, Industry, Mode, MonthlyVolume, PlanName } from '../src/index.ts';
import { body, client, fixture, MockFetch, pathOf, queryOf } from './support.ts';

test('the account is retrieved with the coins it accepts', async () => {
    const http = new MockFetch().json(fixture('account'));

    const account = await client(http).account.retrieve();

    assert.equal(pathOf(http.lastRequest()), '/v1/account');
    assert.equal(account.id, 'acme');
    assert.equal(account.type, AccountType.Organization);
    assert.equal(account.isOrganization(), true);
    assert.equal(account.name, 'Acme');
    assert.equal(account.displayName, 'Acme Inc.');
    assert.equal(account.logoUrl, null);
    assert.equal(account.supportEmail, 'billing@acme.example');
    assert.equal(account.supportPhone, '+442071234567');
    assert.equal(account.brandColor, '#4f46e5');
    assert.equal(account.defaultCurrency, Currency.EUR);
    assert.equal(account.underpaymentTolerance, '1');
    assert.equal(account.overpaymentThreshold, '3');
    assert.deepEqual(account.createdAt, new Date('2026-01-15T10:00:00Z'));
    assert.equal(account.mode, 'test');
    assert.equal(account.isTestMode(), true);
    assert.deepEqual(account.acceptedAssets, ['BTC', 'ETH', 'USDC']);
});

test('the business behind the account is read into typed properties', async () => {
    const http = new MockFetch().json(fixture('account'));

    const { business } = await client(http).account.retrieve();

    assert.equal(business.type, BusinessType.Company);
    assert.equal(business.legalName, 'Acme Holdings Ltd');
    assert.equal(business.registrationNumber, '12345678');
    assert.equal(business.taxId, 'GB123456789');
    assert.equal(business.address.line1, '1 Example Street');
    assert.equal(business.address.line2, null);
    assert.equal(business.address.city, 'London');
    assert.equal(business.address.postalCode, 'EC1A 1BB');
    assert.equal(business.address.state, null);
    assert.equal(business.address.country, 'GB');
    assert.equal(business.industry, Industry.Software);
    assert.equal(business.productDescription, 'Project management software, billed monthly.');
    assert.equal(business.monthlyVolume, MonthlyVolume.Under50k);
    assert.equal(business.phone, '+442071234500');
});

test("the account's checkout, invoice and payment settings are read", async () => {
    const http = new MockFetch().json({ data: {
        id: 'acme',
        logo_dark_url: 'https://acme.example/logo-dark.png',
        terms_url: 'https://acme.example/terms',
        refund_policy_url: 'https://acme.example/refunds',
        checkout: { appearance: 'dark', coin_order: ['BTC', 'ETH'], default_coin: 'LTC', success_url: null, cancel_url: null, success_message: 'Thank you', hide_powered_by: true },
        invoices: { number_prefix: 'BILL', footer: 'Thank you', show_business_details: true },
        checkout_locale: 'fr',
        invoice_reminders: true,
        api_payout_address_changes: true,
    } });

    const account = await client(http).account.retrieve();

    assert.equal(account.logoDarkUrl, 'https://acme.example/logo-dark.png');
    assert.equal(account.termsUrl, 'https://acme.example/terms');
    assert.equal(account.refundPolicyUrl, 'https://acme.example/refunds');
    assert.deepEqual(account.checkout, { appearance: 'dark', coinOrder: ['BTC', 'ETH'], defaultCoin: 'LTC', successUrl: null, cancelUrl: null, successMessage: 'Thank you', hidePoweredBy: true });
    assert.equal(account.checkout?.appearance, CheckoutAppearance.Dark);
    assert.equal(account.checkout?.defaultCoin, Asset.LTC);
    assert.deepEqual(account.invoices, { numberPrefix: 'BILL', footer: 'Thank you', showBusinessDetails: true });
    assert.equal(account.checkoutLocale, CheckoutLocale.French);
    assert.equal(account.invoiceReminders, true);
    assert.equal(account.apiPayoutAddressChanges, true);
});

test('missing account settings have safe defaults', async () => {
    const http = new MockFetch().json({ data: { id: 'acme' } });

    const account = await client(http).account.retrieve();

    assert.equal(account.logoDarkUrl, null);
    assert.equal(account.termsUrl, null);
    assert.equal(account.refundPolicyUrl, null);
    assert.equal(account.checkout, null);
    assert.equal(account.invoices, null);
    assert.equal(account.checkoutLocale, null);
    assert.equal(account.invoiceReminders, false);
    assert.equal(account.apiPayoutAddressChanges, false);
    assert.equal(account.plan, 'free');
    assert.equal(account.isPro(), false);
    assert.equal(account.mode, null);
    assert.deepEqual(account.acceptedAssets, []);
});

test('business details withheld from a key without account:write read as null', async () => {
    const http = new MockFetch().json({ data: { id: 'acme', display_name: 'Acme Inc.', business: null }, meta: { accepted_assets: ['BTC'], mode: 'live' } });

    const account = await client(http).account.retrieve();

    assert.equal(account.get('business'), null);
    assert.deepEqual(account.business.toJSON(), {});
    assert.equal(account.business.type, null);
    assert.equal(account.business.legalName, null);
    assert.equal(account.business.taxId, null);
    assert.equal(account.business.address.country, null);
    assert.equal(account.business.industry, null);
    assert.equal(account.business.monthlyVolume, null);
    assert.equal(account.displayName, 'Acme Inc.');
    assert.deepEqual(account.acceptedAssets, ['BTC']);
});

test('business details that are unset or unknown to this library are null', async () => {
    const http = new MockFetch().json({ data: { id: 'acme', business: { type: 'cooperative', industry: null } }, meta: {} });

    const account = await client(http).account.retrieve();

    assert.equal(account.supportPhone, null);
    assert.equal(account.business.type, null);
    assert.equal(account.business.get('type'), 'cooperative');
    assert.equal(account.business.industry, null);
    assert.equal(account.business.monthlyVolume, null);
    assert.equal(account.business.legalName, null);
    assert.equal(account.business.address.country, null);
});

test('the account and its payment settings are changed', async () => {
    const account = fixture('account')['data'] as Record<string, unknown>;
    const http = new MockFetch()
        .json({ data: { ...account, display_name: 'Acme', plan: { name: 'pro', fee_percent: '0', pro_ends_at: '2026-12-06T00:00:00.000000Z' } }, meta: { mode: 'live', accepted_assets: ['BTC'] } })
        .json({ data: account, meta: { mode: 'live', accepted_assets: [] } });
    const velirapay = client(http);

    const updated = await velirapay.account.update({ display_name: 'Acme', checkout: { appearance: 'dark' } });

    assert.equal(http.lastRequest().method, 'PATCH');
    assert.equal(pathOf(http.lastRequest()), '/v1/account');
    assert.deepEqual(await body(http.lastRequest()), { display_name: 'Acme', checkout: { appearance: 'dark' } });
    assert.equal(updated.displayName, 'Acme');
    assert.deepEqual(updated.acceptedAssets, ['BTC']);
    assert.equal(updated.plan, PlanName.Pro);
    assert.equal(updated.isPro(), true);
    assert.equal(updated.feePercent, '0');
    assert.deepEqual(updated.proEndsAt, new Date('2026-12-06T00:00:00Z'));

    const settings = await velirapay.account.updatePaymentSettings({ underpayment_tolerance: '2' });

    assert.equal(http.lastRequest().method, 'PATCH');
    assert.equal(pathOf(http.lastRequest()), '/v1/payment-settings');
    assert.deepEqual(await body(http.lastRequest()), { underpayment_tolerance: '2' });
    assert.equal(settings.mode, 'live');
});

test('the overview is retrieved', async () => {
    const http = new MockFetch().json({
        data: {
            object: 'overview',
            period: { from: '2026-10-14', to: '2026-11-12' },
            currency: 'USD', volume: '1250.00', volume_change_percent: 12.5, sent_volume: '1100.00', paid_charges: 12,
            conversion_rate_percent: 60, pending_charges: 2, active_payment_links: 3, open_invoices: 1, overdue_invoices: 0,
            funnel: {
                started: 20, paid: 12, waiting: 2, abandoned: 5, incomplete: 1,
                assets: [{ asset: 'BTC', started: 14, paid: 9, abandoned: 4 }, { asset: 'USDT_TRON', started: 6, paid: 3, abandoned: 1 }],
            },
            attention: {
                underpaid_charges: [{ id: 'k3v9x2m7q8wz', asset: 'BTC', amount: '0.002500000000000000', received_amount: '0.002000000000000000' }],
                late_payments: [{ id: 'm2q7w4e9r1ty', asset: 'ETH', amount: '0.05', received_amount: '0.05' }],
                payouts_waiting_for_address: [{ asset: 'SOL', count: 2 }],
                failing_webhook_endpoints: 1,
            },
            assets: [{ asset: 'BTC', paid_charges: 9, share_percent: 75 }, { asset: 'USDT_TRON', paid_charges: 3, share_percent: 25 }],
            top_payment_links: [{ id: 'p4n8r2t6y1ua', title: 'Pro plan', paid_charges: 7 }, { id: null, title: null, paid_charges: 0 }],
            setup: { payout_address: true, payment_link: true, paid_charge: true, webhook_endpoint: false, public_profile: true },
            daily: [
                { date: '2026-11-11', volume: '0.00', sent_volume: '0.00', paid_charges: 0 },
                { date: '2026-11-12', volume: '150.00', sent_volume: '145.50', paid_charges: 1 },
            ],
        },
        meta: { mode: 'live' },
    });

    const overview = await client(http).overview.retrieve();

    assert.equal(pathOf(http.lastRequest()), '/v1/overview');
    assert.deepEqual(overview.period, { from: new Date('2026-10-14T00:00:00Z'), to: new Date('2026-11-12T00:00:00Z') });
    assert.equal(overview.currency, Currency.USD);
    assert.equal(overview.volume, '1250.00');
    assert.equal(overview.volumeChangePercent, 12.5);
    assert.equal(overview.sentVolume, '1100.00');
    assert.equal(overview.paidCharges, 12);
    assert.equal(overview.conversionRatePercent, 60);
    assert.equal(overview.pendingCharges, 2);
    assert.equal(overview.activePaymentLinks, 3);
    assert.equal(overview.openInvoices, 1);
    assert.equal(overview.overdueInvoices, 0);
    assert.deepEqual(overview.funnel, {
        started: 20, paid: 12, waiting: 2, abandoned: 5, incomplete: 1,
        assets: [{ asset: 'BTC', started: 14, paid: 9, abandoned: 4 }, { asset: 'USDT_TRON', started: 6, paid: 3, abandoned: 1 }],
    });
    assert.deepEqual(overview.attention, {
        underpaidCharges: [{ id: 'k3v9x2m7q8wz', asset: 'BTC', amount: '0.002500000000000000', receivedAmount: '0.002000000000000000' }],
        latePayments: [{ id: 'm2q7w4e9r1ty', asset: 'ETH', amount: '0.05', receivedAmount: '0.05' }],
        payoutsWaitingForAddress: [{ asset: Asset.SOL, count: 2 }],
        failingWebhookEndpoints: 1,
    });
    assert.deepEqual(overview.assets, [{ asset: 'BTC', paidCharges: 9, sharePercent: 75 }, { asset: 'USDT_TRON', paidCharges: 3, sharePercent: 25 }]);
    assert.deepEqual(overview.topPaymentLinks, [{ id: 'p4n8r2t6y1ua', title: 'Pro plan', paidCharges: 7 }, { id: null, title: null, paidCharges: 0 }]);
    assert.deepEqual(overview.setup, { payoutAddress: true, paymentLink: true, paidCharge: true, webhookEndpoint: false, publicProfile: true });
    assert.deepEqual(overview.daily, [
        { date: new Date('2026-11-11T00:00:00Z'), volume: '0.00', sentVolume: '0.00', paidCharges: 0 },
        { date: new Date('2026-11-12T00:00:00Z'), volume: '150.00', sentVolume: '145.50', paidCharges: 1 },
    ]);
    assert.equal(overview.mode, Mode.Live);
    assert.deepEqual(overview.get('setup'), { payout_address: true, payment_link: true, paid_charge: true, webhook_endpoint: false, public_profile: true });
});

test('an overview without figures reads as empty rather than failing', async () => {
    const http = new MockFetch().json({ data: { object: 'overview', currency: 'EUR', period: { from: null, to: null }, funnel: { started: 20 } } });

    const overview = await client(http).overview.retrieve();

    assert.deepEqual(overview.period, { from: null, to: null });
    assert.deepEqual(overview.funnel, { started: 20, paid: 0, waiting: 0, abandoned: 0, incomplete: 0, assets: [] });
    assert.deepEqual(overview.attention, { underpaidCharges: [], latePayments: [], payoutsWaitingForAddress: [], failingWebhookEndpoints: 0 });
    assert.deepEqual(overview.assets, []);
    assert.deepEqual(overview.topPaymentLinks, []);
    assert.deepEqual(overview.setup, { payoutAddress: false, paymentLink: false, paidCharge: false, webhookEndpoint: false, publicProfile: false });
    assert.deepEqual(overview.daily, []);
    assert.equal(overview.volume, '0');
    assert.equal(overview.volumeChangePercent, null);
    assert.equal(overview.mode, null);
});

test('payout addresses are listed, set and removed', async () => {
    const bitcoin = { object: 'payout_address', network: 'bitcoin', name: 'Bitcoin', address: 'bc1qexample', assets: ['BTC'], payouts_held_until: null, updated_at: '2026-10-02T08:14:51.000000Z' };
    const http = new MockFetch()
        .json({ data: [bitcoin, { ...bitcoin, network: 'evm', name: 'Ethereum', address: null, assets: ['ETH', 'USDT'] }], meta: { mode: 'live' } })
        .json({ data: { ...bitcoin, payouts_held_until: '2026-11-08T08:00:00.000000Z' } })
        .json({ data: { ...bitcoin, address: null } });
    const velirapay = client(http);

    const [set, missing] = await velirapay.payoutAddresses.list();

    assert.equal(set?.network, AddressNetwork.Bitcoin);
    assert.equal(set?.address, 'bc1qexample');
    assert.equal(missing?.network, AddressNetwork.Evm);
    assert.equal(missing?.address, null);
    assert.deepEqual(missing?.assets, [Asset.ETH, Asset.USDT]);

    const updated = await velirapay.payoutAddresses.update(AddressNetwork.Bitcoin, { address: 'bc1qexample' });

    assert.equal(http.lastRequest().method, 'PUT');
    assert.equal(pathOf(http.lastRequest()), '/v1/payout-addresses/bitcoin');
    assert.deepEqual(await body(http.lastRequest()), { address: 'bc1qexample' });
    assert.deepEqual(updated.payoutsHeldUntil, new Date('2026-11-08T08:00:00Z'));

    assert.equal((await velirapay.payoutAddresses.delete('bitcoin')).address, null);
    assert.equal(http.lastRequest().method, 'DELETE');
});

test('the activity log is listed with its filters', async () => {
    const http = new MockFetch().json({
        data: [{ id: '5', object: 'activity', action: 'api_key.created', description: 'Created an API key', actor: 'API key "Bot"', subject: 'Shop', properties: { prefix: 'vp_live_aaaa' }, ip_address: '203.0.113.7', mode: 'live', created_at: '2026-11-06T09:00:00.000000Z' }],
        meta: { current_page: 1, last_page: 1, per_page: 25, total: 1, mode: 'live' },
    });

    const page = await client(http).activity.list({ action: 'sensitive' });
    const entry = page.data[0];

    assert.equal(page.mode, Mode.Live);
    assert.equal(page.meta['total'], 1);
    assert.equal(pathOf(http.lastRequest()), '/v1/activity');
    assert.deepEqual(queryOf(http.lastRequest()), { action: 'sensitive' });
    assert.equal(entry?.action, ActivityAction.ApiKeyCreated);
    assert.equal(entry?.mode, Mode.Live);
    assert.equal(entry?.actor, 'API key "Bot"');
    assert.equal(entry?.ipAddress, '203.0.113.7');
    assert.deepEqual(entry?.properties, { prefix: 'vp_live_aaaa' });
});

test('a Pro payment is started', async () => {
    const http = new MockFetch().json({ data: { object: 'pro_payment', months: 1, price: '9.99', currency: 'USD', asset: 'BTC', asset_amount: '0.0001', checkout_url: 'https://velirapay.com/c/abc', expires_at: '2026-11-06T10:00:00.000000Z' }, meta: { started: true } }, 201);

    const payment = await client(http, 'vp_live_secret').billing.startProPayment({ asset: 'BTC' });

    assert.equal(http.lastRequest().method, 'POST');
    assert.equal(pathOf(http.lastRequest()), '/v1/billing/pro');
    assert.deepEqual(await body(http.lastRequest()), { asset: 'BTC' });
    assert.equal(payment.checkoutUrl, 'https://velirapay.com/c/abc');
    assert.equal(payment.price, '9.99');
    assert.equal(payment.started, true);
});
