# Changelog

All notable changes to this library are documented here. It follows [Semantic Versioning](https://semver.org).

## 0.1.0 - Unreleased

The first version, covering what the PHP library covers as of its 0.6.5:

- `VeliraPayClient` with `account`, `assets`, `charges`, `paymentLinks`, `invoices`, `coupons`, `payouts`, `payoutAddresses`, `events`, `webhookEndpoints`, `overview`, `activity`, `apiKeys`, `members`, `invitations` and `billing`, each answering with typed objects that keep every attribute the API sent (`get()`, `toJSON()`).
- `Page` for lists, with `nextPage()` and `autoPagingIterator()`, and `iterator()` on every paged list for `for await`.
- An error class per kind of failure, all extending `VeliraPayError`: `AuthenticationError`, `PermissionError`, `NotFoundError`, `ConflictError`, `ValidationError`, `RateLimitError`, `ServerError`, `InvalidRequestError`, `UnexpectedResponseError`, `ConnectionError`, `SignatureVerificationError` and `InvalidArgumentError`.
- Retries of network errors, rate limits and outages, with an `Idempotency-Key` on every write so a retried one is carried out once.
- `Webhook.constructEvent()` and `constructEventFromRequest()`, which check the signature, the second one sent for a day after a secret is rotated, and its age.
- `Asset` also has `BTC_LIGHTNING`, `ETH_BASE`, `ETH_ARBITRUM` and `POL`, which the API's contract defines, and charges and coins read the `network_surcharge` the API sends, and charges its `payment_request`.
- ES module and CommonJS builds with their type definitions, for Node.js 22 or later, without dependencies.
