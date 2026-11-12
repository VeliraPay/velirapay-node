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
- `ConflictError.wasReplayed()`, true for the 409 the API gives a repeat of `apiKeys.create()`, `webhookEndpoints.create()` or `rotateSecret()` whose first answer carried the new key or secret, which it never keeps. That includes the library's own retry after an answer was lost: the write was carried out, but the key or secret cannot be shown again. The three methods' docs say how to recover, and `idempotencyKey`'s no longer promises the first answer to every repeat.
- The README covers the whole library, as the PHP library's does: the lowest prices and minimums, network surcharges, Lightning, short and late payments, payouts and payout addresses, webhook endpoints and what to do when the answer carrying a secret is lost, the account and its payment settings, the overview, the activity log, members, API keys, Pro, the constants, the `baseUrl` option, the retry of a 409 that is still being processed and `UnexpectedResponseError`. Every example type-checks under TypeScript's `strict`; the webhook example no longer reads `event.charge.id` without checking that there is a charge.
- `charge.paymentLinkTitle` and `charge.invoiceNumber`: the title of the payment link and the number of the invoice a charge in a webhook names. The API's answers only give their codes, so both are null there; `paymentLink` and `invoice` keep giving the codes everywhere.

### Fixed

- The charges events carry are typed `ApiCharge`, since the API always sends their checkout page: `event.charge?.checkoutUrl` is a `string`, where 0.1.1 said events left it out. Only charges in webhooks lack it. Nothing changes at runtime.
- A network failure from a `fetch` you pass, such as node-fetch's `FetchError` of the `system` type or an error with a code such as `ECONNRESET`, is retried with the same idempotency key and then thrown as a `ConnectionError` whose `cause` is the original, as the built-in fetch's are. Before, it escaped as it was after one attempt. An error a `fetch` throws for any other reason still passes straight through.
- Amounts given as numbers are sent as decimal strings without an exponent. The API reads a JSON number below 0.0001, such as a refund of `0.00005` BTC, in exponent notation and refused it. A number is rounded first to the 14 significant digits the API read it with, so `0.1 + 0.2` still reaches it as `0.3`, and `0.00005` now goes out as `'0.00005'`. This covers charge, refund and simulated amounts, invoice totals, quantities and unit prices, payment link prices and limits, coupon discounts and minimums, and the payment tolerances; other numbers, such as `max_redemptions` and metadata values, stay numbers. A number that is not finite, or one with a fraction and 15 or more digits before its point, both of which the API refused, is refused before anything is sent. Strings go out as given, and `velirapay.request()` sends its body as it is.
- Cloudflare's 520 to 524, its answers when it gets nothing from VeliraPay, are retried like 502, 503 and 504, reads and writes alike, since a retried write carries the same idempotency key.

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
