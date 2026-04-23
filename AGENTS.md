# portico-google-pay-payments

> Process Google Pay payments through the Heartland Portico gateway using the Global Payments SDK across Node.js, PHP, and .NET.

## Critical Patterns

1. **Set both `mobileType` and `paymentSource` on the card object.** When assigning a Google Pay token to `CreditCardData`, you must also set `mobileType = GOOGLEPAY` and `paymentSource = GOOGLEPAYWEB`. Omitting either flag causes the gateway to treat the request as a standard card charge and reject the encrypted token. PHP uses the `EncyptedMobileType::GOOGLE_PAY` enum (the typo — missing 'r' — is in the SDK itself); Node.js and .NET use `MobilePaymentMethodType.GOOGLEPAY`.

2. **Pass the raw nested token string, not the full Google Pay response.** The Google Pay API returns a layered object: `paymentMethodData.tokenizationData.token` is a JSON string containing `{signature, protocolVersion, signedMessage}`. That inner string is what goes into `card.token`. Passing the outer object causes a parse or signature error at the gateway.

3. **`PorticoConfig` is the correct config class for this gateway.** The Heartland Portico gateway uses `PorticoConfig` (not `GatewayConfig` or `GpApiConfig`). The SDK will silently misconfigure if the wrong config class is used.

4. **The `serviceUrl` is hardcoded to the cert (sandbox) endpoint.** All three implementations point to `https://cert.api2.heartlandportico.com`. Switch to the production URL for live traffic — there is no automatic env-based toggle for this value; it must be changed in code or injected via an additional env var.

## Repository Structure

### Node.js (Express)
- [`nodejs/server.js`](nodejs/server.js) — SDK config (lines 37–44), `/process-google-pay` endpoint (lines 141–259), `/process-payment` for standard tokens (lines 82–135)
- [`nodejs/index.html`](nodejs/index.html) — shared frontend with Google Pay JS integration and `tokenizationSpecification` config (lines 169–175)
- [`nodejs/package.json`](nodejs/package.json) — dependencies

### PHP
- [`php/process-google-pay.php`](php/process-google-pay.php) — SDK config + Google Pay token processing; canonical reference for PHP enum names (`EncyptedMobileType::GOOGLE_PAY`, `PaymentDataSourceType::GOOGLEPAYWEB`)
- [`php/config.php`](php/config.php) — config endpoint, serves env vars to the frontend
- [`php/process-payment.php`](php/process-payment.php) — standard tokenized card processing
- [`php/composer.json`](php/composer.json) — dependencies

### .NET (ASP.NET Core / net9.0)
- [`dotnet/Program.cs`](dotnet/Program.cs) — SDK config (lines 48–66), `/process-google-pay` endpoint (lines 220–343), `/process-payment` endpoint (lines 122–213)
- [`dotnet/dotnet.csproj`](dotnet/dotnet.csproj) — dependencies

### Shared
- `{lang}/index.html` — identical Google Pay frontend across all implementations
- `{lang}/.env.sample` → copy to `.env` before running
- `{lang}/run.sh` — installs dependencies and starts server on port 8000
- `docker-compose.yml` / `Dockerfile.tests` — multi-implementation test runner

## API Surface

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/config` | Returns public API key, merchant info, and Google Pay button config |
| POST | `/process-payment` | Processes a standard tokenized card charge |
| POST | `/process-google-pay` | Processes a Google Pay encrypted token charge |

All three implementations expose identical endpoints. `/process-google-pay` accepts a JSON body; `/process-payment` accepts form data.

## Environment Variables

```bash
PUBLIC_API_KEY=pkapi_...       # Exposed to frontend for hosted fields / GP config
SECRET_API_KEY=skapi_...       # Server-side only; used to authenticate SDK calls
MERCHANT_NAME="Acme Corp"      # Display name shown in Google Pay sheet
MERCHANT_ID=                   # Global Payments merchant ID (not Google's)
GOOGLE_PAY_MERCHANT_ID=        # Your Google Pay merchant ID (from Google Pay Business Console)
ENVIRONMENT=TEST               # Set to PRODUCTION for live; controls Google Pay button mode
GOOGLE_PAY_COUNTRY_CODE=GB     # ISO 3166-1 alpha-2; defaults to GB
GOOGLE_PAY_CURRENCY_CODE=GBP   # ISO 4217; defaults to GBP
PORT=8000                      # Server port
ENABLE_LOGGING=true            # Optional; writes SDK request/response to logs/
```

## Architecture Summary

**Config flow:** Frontend calls `GET /config` on load → receives `publicApiKey`, merchant info, and `googlePayConfig` → initializes Google Pay JS client with gateway tokenization spec (`gateway: "globalpayments"`).

**Payment flow:** User completes Google Pay sheet → Google returns encrypted token object → frontend extracts `paymentMethodData.tokenizationData.token` → POSTs JSON `{token, amount, billing_zip}` to `/process-google-pay` → backend sets `card.mobileType` + `card.paymentSource` → charges via Portico SDK → returns `transactionId`.

## Security Notes

These are demo implementations. They have no authentication on payment endpoints, no HTTPS enforcement (required by Google Pay in production), and no rate limiting. The `serviceUrl` must be updated for production. Review Google's [production checklist](https://developers.google.com/pay/api/web/guides/test-and-deploy/deploy-production-environment) before going live.

## SDK Versions

- Node.js: `globalpayments-api` v3.10.1
- PHP: `globalpayments/php-sdk` ^13.1
- .NET: `GlobalPayments.Api` v9.0.16
