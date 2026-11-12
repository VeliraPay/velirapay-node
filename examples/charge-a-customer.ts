// Creates a test-mode charge: VELIRAPAY_API_KEY=vp_test_… node examples/charge-a-customer.ts
import { VeliraPayClient } from '../src/index.ts';

const velirapay = new VeliraPayClient(process.env.VELIRAPAY_API_KEY);

if (!velirapay.isTestMode()) {
    throw new Error('This example only runs with a test-mode key, starting with vp_test_.');
}

const charge = await velirapay.charges.create({
    amount: '49.90',
    currency: 'EUR',
    asset: 'BTC',
    customer: { email: 'ada@example.com', name: 'Ada Lovelace' },
    description: 'Example charge from velirapay-node',
    metadata: { order_id: 'example-1' },
});

const retrieved = await velirapay.charges.retrieve(charge.id);

console.log({
    id: retrieved.id,
    status: retrieved.status,
    assetAmount: `${retrieved.assetAmount} ${retrieved.asset}`,
    depositAddress: retrieved.depositAddress,
    checkoutUrl: retrieved.checkoutUrl,
    expiresAt: retrieved.expiresAt,
});
