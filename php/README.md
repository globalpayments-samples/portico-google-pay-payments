# PHP — Portico Google Pay Payments

PHP implementation of Google Pay web payments using the Global Payments Portico gateway. Demonstrates the complete flow from loading the Google Pay button to processing the encrypted payment token server-side.

## Requirements

- PHP 8.0+
- Composer
- Global Payments Portico account with alternative payments (Google Pay) enabled
- Chrome browser for testing (desktop or Android)

## Project Structure

```
php/
├── config.php              # GET /config — returns publicApiKey + Google Pay config
├── process-google-pay.php  # POST /process-google-pay — processes Google Pay token
├── process-payment.php     # POST /process-payment — standard hosted fields charge
├── index.html              # Google Pay frontend (served statically)
├── composer.json           # globalpayments/php-sdk dependency
├── .env.sample             # Environment variable template
├── Dockerfile
├── run.sh
├── .devcontainer/
└── .codesandbox/
```

## Setup

**1. Install dependencies**
```bash
composer install
```

**2. Configure credentials**
```bash
cp .env.sample .env
```

Edit `.env`:

```env
PUBLIC_API_KEY=pkapi_cert_jKc1FtuyAydZhZfbB3
SECRET_API_KEY=skapi_cert_MeHOBQDccnIA8S6ECUes8HNT8v9cuUvQIsJdKZ8pwA
MERCHANT_ID=777704033964
MERCHANT_NAME="Test Merchant"
ENVIRONMENT=TEST
ENABLE_LOGGING=true
```

**3. Start the server**
```bash
php -S localhost:8000
# Open http://localhost:8000
```

Or use the convenience script:
```bash
./run.sh
```

## Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `PUBLIC_API_KEY` | Public key passed to browser for globalpayments.js | ✅ | `pkapi_cert_jKc1FtuyAydZhZfbB3` |
| `SECRET_API_KEY` | Secret key for server-side Portico API calls | ✅ | `skapi_cert_MeHOBQ...` |
| `MERCHANT_ID` | Portico merchant ID shown in Google Pay sheet | ✅ | `777704033964` |
| `MERCHANT_NAME` | Business name shown in Google Pay sheet | ✅ | `Test Merchant` |
| `ENVIRONMENT` | Gateway environment | ✅ | `TEST` or `PRODUCTION` |
| `ENABLE_LOGGING` | Writes SDK request/response to `logs/` | ❌ | `true` |
| `GOOGLE_PAY_MERCHANT_ID` | Google merchant ID (production only) | ❌ | `12345678901234567890` |
| `GOOGLE_PAY_COUNTRY_CODE` | ISO 3166-1 alpha-2 country code | ❌ | `GB` (default) |
| `GOOGLE_PAY_CURRENCY_CODE` | ISO 4217 currency code | ❌ | `GBP` (default) |
| `GOOGLE_PAY_BUTTON_COLOR` | Google Pay button color | ❌ | `black` or `white` |

## SDK Configuration

```php
use GlobalPayments\Api\ServiceConfigs\Gateways\PorticoConfig;
use GlobalPayments\Api\ServicesContainer;

$config = new PorticoConfig();
$config->secretApiKey = $_ENV['SECRET_API_KEY'];
$config->serviceUrl = 'https://cert.api2.heartlandportico.com';

if ($_ENV['ENABLE_LOGGING'] === 'true') {
    $config->enableLogging = true;
    $config->requestLogger = new SampleRequestLogger(new Logger("logs"));
}

ServicesContainer::configureService($config);
```

## API Endpoints

### GET /config.php

Returns public credentials and Google Pay configuration for the browser.

**Response:**
```json
{
  "success": true,
  "data": {
    "publicApiKey": "pkapi_cert_jKc1FtuyAydZhZfbB3",
    "merchantInfo": {
      "merchantName": "Test Merchant",
      "merchantId": "777704033964"
    },
    "googlePayConfig": {
      "googleMerchantId": "12345678901234567890",
      "environment": "TEST",
      "countryCode": "GB",
      "currencyCode": "GBP",
      "buttonColor": "black"
    }
  }
}
```

---

### POST /process-google-pay.php

Processes a Google Pay payment token through Portico.

**Request body** (`application/json`):
```json
{
  "token": "{\"signature\":\"...\",\"protocolVersion\":\"ECv1\",\"signedMessage\":\"...\"}",
  "amount": "19.99",
  "currency": "GBP"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | string | ✅ | Encrypted Google Pay payment token (JSON string) |
| `amount` | string/number | ✅ | Charge amount |
| `currency` | string | ❌ | `USD`, `EUR`, or `GBP` (default: `GBP`) |

**Response (success):**
```json
{
  "success": true,
  "message": "Payment successful! Transaction ID: 12345678",
  "data": {
    "transactionId": "12345678",
    "amount": "19.99",
    "currency": "GBP",
    "status": "SUCCESS",
    "responseCode": "00",
    "authCode": "123456",
    "timestamp": "2026-04-09T12:00:00+00:00"
  }
}
```

**Response (declined):**
```json
{
  "success": false,
  "message": "Payment was declined",
  "error": {
    "code": "PAYMENT_DECLINED",
    "details": "Payment declined by processor"
  }
}
```

**Response (error):**
```json
{
  "success": false,
  "message": "Payment processing failed",
  "error": {
    "code": "API_ERROR",
    "details": "Google Pay token is required"
  }
}
```

## Payment Processing Flow

```php
// 1. Receive encrypted Google Pay token from browser
$googlePayToken = $requestData->token;

// 2. Attach token to CreditCardData with Google Pay source
$card = new CreditCardData();
$card->token = $googlePayToken;
$card->mobileType = EncyptedMobileType::GOOGLE_PAY;
$card->paymentSource = PaymentDataSourceType::GOOGLEPAYWEB;

// 3. Charge through Portico — SDK decrypts and processes
$transaction = $card->charge($amount)
    ->withCurrency($currency)
    ->execute();

// 4. Verify success code
if ($transaction->responseCode === '00') {
    // Return transactionId to client
}
```

## Google Pay Test Environment

In `ENVIRONMENT=TEST`, Google Pay intercepts the payment sheet and returns a simulated token — no actual card is charged. Any Google account with a saved payment method can be used for testing. The test token is processed through Portico's certification endpoint (`cert.api2.heartlandportico.com`).

**Supported card networks:**
Visa, Mastercard, American Express, Discover, JCB

## Docker

```bash
docker build -t portico-google-pay-php .
docker run -p 8003:8000 \
  -e PUBLIC_API_KEY=your_key \
  -e SECRET_API_KEY=your_key \
  -e MERCHANT_ID=your_merchant_id \
  -e MERCHANT_NAME="Test Merchant" \
  -e ENVIRONMENT=TEST \
  portico-google-pay-php
# Open http://localhost:8003
```

Or via docker-compose from the project root:
```bash
docker-compose up php
```

## Troubleshooting

**Google Pay button does not appear**
Google Pay renders only in Chrome (desktop or Android). Open browser DevTools → Console to see any Google Pay JS initialization errors. Verify `/config.php` returns a valid response with `googlePayConfig.environment = TEST`.

**"Google Pay token is required" (400 error)**
The `token` field was empty or missing in the POST body. This usually means the Google Pay JS sheet returned an error before a token was generated — check the browser console for Google Pay JS errors before the form submission.

**"Authentication failed" or Portico 401**
Your `SECRET_API_KEY` is wrong or missing. Verify the key starts with `skapi_cert_` for the TEST environment. Check for trailing spaces or newlines in `.env`. Restart the server after editing `.env`.

**"Alternative payments not enabled" or similar Portico error**
Google Pay must be explicitly enabled on your Portico certification account. Contact Global Payments support and request that `GOOGLEPAY` be activated as an accepted payment method on your account.

**Logs directory permission error**
When `ENABLE_LOGGING=true`, the SDK writes to a `logs/` directory relative to `process-google-pay.php`. Create the directory manually if it does not exist:
```bash
mkdir -p php/logs && chmod 755 php/logs
```
Or set `ENABLE_LOGGING=false` to disable logging entirely.

**`json_decode` returns null for token**
The Google Pay token must be a valid JSON string. If the front-end is double-encoding it or passing a non-string value, the server will throw "Invalid Google Pay token format". Log `$requestData->token` to inspect the raw value received.
