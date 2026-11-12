import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as velirapay from '../src/index.ts';
import { AccountType, ActivityAction, AddressNetwork, CheckoutAppearance, CheckoutLocale, Currency, MemberRole, PlanName, WebhookDeliveryStatus } from '../src/index.ts';

test('the value sets the API uses have constants, in its order', () => {
    assert.deepEqual(Object.values(Currency), ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'CHF', 'TRY']);
    assert.deepEqual(Object.values(MemberRole), ['owner', 'admin', 'finance', 'support', 'viewer']);
    assert.deepEqual(Object.values(AddressNetwork), ['bitcoin', 'litecoin', 'dogecoin', 'bitcoincash', 'evm', 'bsc', 'base', 'arbitrum', 'polygon', 'tron', 'monero', 'solana', 'lightning']);
    assert.deepEqual(Object.values(CheckoutAppearance), ['auto', 'light', 'dark']);
    assert.deepEqual(Object.values(WebhookDeliveryStatus), ['pending', 'succeeded', 'failed']);
    assert.deepEqual(Object.values(PlanName), ['free', 'pro']);
    assert.deepEqual(Object.values(AccountType), ['personal', 'organization']);
    assert.deepEqual(Object.values(CheckoutLocale), ['en', 'fr', 'de', 'es', 'tr', 'pt', 'ru', 'ar']);
    assert.equal(Object.values(ActivityAction).length, 55);
    assert.equal(ActivityAction.SecondFactorRequirementChanged, 'team.second_factor_requirement_changed');
    assert.equal(ActivityAction.SocialAccountDisconnected, 'auth.social_disconnected');
});

test('every constant is frozen', () => {
    const constants = Object.entries(velirapay).filter(([name, value]) => typeof value === 'object' && value !== null && /^[A-Z]/.test(name));

    assert.ok(constants.length >= 21);

    for (const [name, value] of constants) {
        assert.ok(Object.isFrozen(value), `${name} is frozen`);
    }

    assert.throws(() => {
        (Currency as Record<string, string>)['USD'] = 'EUR';
    }, TypeError);
});
