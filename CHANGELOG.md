# Changelog

All notable changes to this library are documented here. It follows [Semantic Versioning](https://semver.org).

## Unreleased

### Breaking

- `MemberRole` now has `owner` too, which members can be: a `switch` over it that covers every role needs a case for it. Invitations and role changes take the new `AssignableMemberRole`, which leaves owner out. Nothing changes at runtime.

### Added

- Constants for the API's other value sets, each an object with a type of the same name: `Currency`, `MemberRole`, `AddressNetwork` (the networks payout addresses are for), `CheckoutAppearance`, `WebhookDeliveryStatus`, `PlanName`, `AccountType`, `CheckoutLocale` and `ActivityAction`, every action the activity log records. Methods take them or plain strings.
- Fields that hold one of these, a coin, a currency, a mode, a permission or an event type are typed with it, such as `payoutAddress.network`, `account.plan`, `member.role`, `activity.action`, `apiKey.permissions`, `invoice.charges[].status` and `webhookEndpoint.events`. They stay strings, so a value the API adds later still reads, and nothing breaks.
- Every constant, the existing ones too, is frozen, so no code can change one by mistake.
- The overview's other figures, which only `get()` could read before: `overview.period`, `funnel`, `attention`, `assets`, `topPaymentLinks`, `setup` and `daily`, typed `OverviewPeriod`, `OverviewFunnel` (with `OverviewFunnelAsset`), `OverviewAttention` (with `OverviewChargeAmount` and `OverviewWaitingPayouts`), `OverviewAsset`, `OverviewPaymentLink`, `OverviewSetup` and `OverviewDay`. Amounts stay strings, and days are `Date`s at midnight UTC.
- What answers carry besides their objects: every `Page` has the `meta` the API sent and the `mode` of the lists that say it, the coins on offer and the activity log; `assets.list()` answers with an `AssetPage`, whose `currencies` are those prices can be asked in; and the overview has its `mode`. `payoutAddresses.list()` and `payouts.summary()` stay plain arrays: their mode is `velirapay.mode()`, and whether an owner lets API keys change payout addresses is `account.apiPayoutAddressChanges`.

## 0.1.1 - 2026-11-12

- The charges that `charges.create()`, `retrieve()`, `list()`, `iterator()`, `cancel()`, `recordRefund()`, `send()`, `accept()` and `simulate()` answer with are typed `ApiCharge`, whose `checkoutUrl` is a `string`, so `res.redirect(303, charge.checkoutUrl)` compiles under TypeScript's `strict`. Charges in webhooks and events keep `checkoutUrl: string | null`, since webhooks leave it out. Nothing changes at runtime.

## 0.1.0 - 2026-11-12

The first version, covering what the PHP library covers as of its 0.6.5:

- `VeliraPayClient` with `account`, `assets`, `charges`, `paymentLinks`, `invoices`, `coupons`, `payouts`, `payoutAddresses`, `events`, `webhookEndpoints`, `overview`, `activity`, `apiKeys`, `members`, `invitations` and `billing`, each answering with typed objects that keep every attribute the API sent (`get()`, `toJSON()`).
- `Page` for lists, with `nextPage()` and `autoPagingIterator()`, and `iterator()` on every paged list for `for await`.
- An error class per kind of failure, all extending `VeliraPayError`: `AuthenticationError`, `PermissionError`, `NotFoundError`, `ConflictError`, `ValidationError`, `RateLimitError`, `ServerError`, `InvalidRequestError`, `UnexpectedResponseError`, `ConnectionError`, `SignatureVerificationError` and `InvalidArgumentError`.
- Retries of network errors, rate limits and outages, with an `Idempotency-Key` on every write so a retried one is carried out once.
- `Webhook.constructEvent()` and `constructEventFromRequest()`, which check the signature, the second one sent for a day after a secret is rotated, and its age.
- `Asset` also has `BTC_LIGHTNING`, `ETH_BASE`, `ETH_ARBITRUM` and `POL`, which the API's contract defines, and charges and coins read the `network_surcharge` the API sends, and charges its `payment_request`.
- ES module and CommonJS builds with their type definitions, for Node.js 22 or later, without dependencies.
