# portico-google-pay-payments

> Process Google Pay payments through the Heartland Portico gateway using the Global Payments SDK across Node.js, PHP, and .NET.

## Critical Patterns

1. **Set both `mobileType` and `paymentSource` on the card object.** When assigning a Google Pay token to `CreditCardData`, you must also set `mobileType = GOOGLEPAY` and `paymentSource = GOOGLEPAYWEB`. Omitting either flag causes the gateway to treat the request as a standard card charge and reject the encrypted token. PHP uses the `EncyptedMobileType::GOOGLE_PAY` enum (the typo — missing 'r' — is in the SDK itself); Node.js and .NET use `MobilePaymentMethodType.GOOGLEPAY`.

2. **Pass the raw nested token string, not the full Google Pay response.** The Google Pay API returns a layered object: `paymentMethodData.tokenizationData.token` is a JSON string containing `{signature, protocolVersion, signedMessage}`. That inner string is what goes into `card.token`. Passing the outer object causes a parse or signature error at the gateway.

3. **`PorticoConfig` is the correct config class for this gateway.** The Heartland Portico gateway uses `PorticoConfig` (not `GatewayConfig` or `GpApiConfig`). The SDK will silently misconfigure if the wrong config class is used.

4. **The `serviceUrl` is hardcoded to the cert (sandbox) endpoint.** All three implementations point to `https://cert.api2.heartlandportico.com`. Switch to the production URL for live traffic — there is no automatic env-based toggle for this value; it must be changed in code or injected via an additional env var.

5. **Node.js and .NET hardcode `'USD'` for charge currency; PHP does not.** The `GOOGLE_PAY_CURRENCY_CODE` env var controls the currency displayed in the Google Pay button, but the actual `card.charge()` call in Node.js (`server.js`, lines 104/118/207/215) and .NET (`Program.cs`, lines 174/284) hardcodes `"USD"`. PHP's `sanitizeCurrency()` function passes the request's `currency` field through to the charge (defaulting to GBP). If you adapt Node.js or .NET to charge non-USD currencies, you must update those hardcoded values.

## Repository Structure

### Node.js (Express)
- [`nodejs/server.js`](nodejs/server.js) — SDK config (`PorticoConfig` setup, lines 37–44), `/process-google-pay` handler (lines 141–259), `/process-payment` handler (lines 82–135)
- [`nodejs/index.html`](nodejs/index.html) — shared frontend with Google Pay JS integration and `tokenizationSpecification` config (lines 169–175)
- [`nodejs/package.json`](nodejs/package.json) — dependencies

### PHP
- [`php/process-google-pay.php`](php/process-google-pay.php) — `configureSdk()` + Google Pay token processing via `sanitizeCurrency()`; canonical reference for PHP enum names (`EncyptedMobileType::GOOGLE_PAY`, `PaymentDataSourceType::GOOGLEPAYWEB`)
- [`php/config.php`](php/config.php) — config endpoint, serves env vars to the frontend
- [`php/process-payment.php`](php/process-payment.php) — standard tokenized card processing
- [`php/composer.json`](php/composer.json) — dependencies

### .NET (ASP.NET Core / net9.0)
- [`dotnet/Program.cs`](dotnet/Program.cs) — `ConfigureGlobalPaymentsSDK()` for SDK setup, `ConfigurePaymentEndpoint()` for `/process-payment`, `ConfigureGooglePayEndpoint()` for `/process-google-pay`
- [`dotnet/dotnet.csproj`](dotnet/dotnet.csproj) — dependencies

### Shared
- `nodejs/index.html`, `php/index.html`, `dotnet/wwwroot/index.html` — identical Google Pay frontend across all implementations (.NET serves static files from `wwwroot/`)
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
PUBLIC_API_KEY=pkapi_...            # Exposed to frontend for hosted fields / GP config
SECRET_API_KEY=skapi_...            # Server-side only; used to authenticate SDK calls
MERCHANT_NAME="Acme Corp"           # Display name shown in Google Pay sheet
MERCHANT_ID=                        # Global Payments merchant ID (not Google's)
GOOGLE_PAY_MERCHANT_ID=             # Your Google Pay merchant ID (from Google Pay Business Console)
ENVIRONMENT=TEST                    # Set to PRODUCTION for live; controls Google Pay button mode
GOOGLE_PAY_COUNTRY_CODE=GB          # ISO 3166-1 alpha-2; defaults to GB
GOOGLE_PAY_CURRENCY_CODE=GBP        # ISO 4217; controls button display only — see Critical Pattern 5
GOOGLE_PAY_BUTTON_COLOR=black       # Google Pay button color; "black" or "white", defaults to black
PORT=8000                           # Server port; all three implementations default to 8000
ENABLE_LOGGING=true                 # Optional; writes SDK request/response to logs/
```

## Sandbox Testing

For `/process-payment` (standard card flow), use these Portico sandbox cards:

| Network | PAN | CVV |
|---------|-----|-----|
| Visa | 4012002000060016 | 123 |
| Mastercard | 5473500000000014 | 123 |

Any future expiration date is accepted.

For `/process-google-pay` (Google Pay flow), card numbers cannot be entered manually — the payment token is generated by the Google Pay sheet. To test this endpoint:
1. Set `ENVIRONMENT=TEST` — this puts the Google Pay button in test mode
2. The Portico sandbox endpoint is already hardcoded (see Critical Pattern 4 — no additional config needed)
3. Requires a real browser + a Google account with at least one card added to Google Pay
4. Cannot be tested with curl; the encrypted token is generated client-side by Google

Sandbox `SECRET_API_KEY` and `PUBLIC_API_KEY` are available from the [Heartland developer portal](https://developer.heartlandpaymentsystems.com/).

## Architecture Summary

**Config flow:** Frontend calls `GET /config` on load → receives `publicApiKey`, merchant info, and `googlePayConfig` → initializes Google Pay JS client with gateway tokenization spec (`gateway: "globalpayments"`).

**Payment flow:** User completes Google Pay sheet → Google returns encrypted token object → frontend extracts `paymentMethodData.tokenizationData.token` → POSTs JSON `{token, amount, billing_zip}` to `/process-google-pay` → backend sets `card.mobileType` + `card.paymentSource` → charges via Portico SDK → returns `transactionId`.

## Security Notes

These are demo implementations. They have no authentication on payment endpoints, no HTTPS enforcement (required by Google Pay in production), and no rate limiting. The `serviceUrl` must be updated for production. Review Google's [production checklist](https://developers.google.com/pay/api/web/guides/test-and-deploy/deploy-production-environment) before going live.

## How to Run

```bash
cd nodejs && ./run.sh   # Node.js — :8000
cd php && ./run.sh      # PHP — :8000
cd dotnet && ./run.sh   # .NET — :8000
# All at once:
docker-compose up
```

## How to Verify

```bash
# Config endpoint
curl http://localhost:8000/config
# Expected: {"success":true,"data":{"publicApiKey":"pkapi_cert_...","merchantInfo":{...},"googlePayConfig":{...}}}

# Hosted-fields card payment
curl -X POST http://localhost:8000/process-payment \
  -H "Content-Type: application/json" \
  -d '{"payment_token": "token-from-hosted-fields", "amount": 10.00}'
# Expected: {"success":true,"data":{"transactionId":"..."}}
```

POST /process-google-pay cannot be tested with curl — it requires a real browser to render the Google Pay payment sheet and a Google account to complete the flow. Use the frontend UI at `http://localhost:8000`.

## Making Changes

All language implementations expose identical behavior. A change to one must be applied to all — each language in a separate commit. Do not modify shared files (`index.html`, `docker-compose.yml`) without confirming the change applies to every implementation. Only Node.js, PHP, and .NET are implemented; Java, Python, and Go directories do not exist.

## SDK Versions

- Node.js: `globalpayments-api` v3.10.1
- PHP: `globalpayments/php-sdk` ^13.1
- .NET: `GlobalPayments.Api` v9.0.16
