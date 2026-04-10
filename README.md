# Portico Google Pay Payments — Multi-Language Examples

Complete implementation of Google Pay web payments using the Global Payments Portico gateway across 3 programming languages. Each implementation demonstrates the full Google Pay flow: loading the payment button, capturing the encrypted payment token, and processing the charge through the Portico SDK.

## Available Implementations

| Language | Framework | SDK | Port | Preview |
|----------|-----------|-----|------|---------|
| [**PHP**](./php/) | Built-in Server | globalpayments/php-sdk | 8003 | [Open in CodeSandbox](https://githubbox.com/globalpayments-samples/portico-google-pay-payments/tree/main/php) |
| [**Node.js**](./nodejs/) | Express.js | globalpayments-api | 8001 | [Open in CodeSandbox](https://githubbox.com/globalpayments-samples/portico-google-pay-payments/tree/main/nodejs) |
| [**.NET**](./dotnet/) | ASP.NET Core | GlobalPayments.Api | 8006 | [Open in CodeSandbox](https://githubbox.com/globalpayments-samples/portico-google-pay-payments/tree/main/dotnet) |

## How It Works

```
Browser                         Backend                       Portico API / Google
   │                               │                               │
   │── GET /config ───────────────>│                               │
   │<─ { publicApiKey,             │                               │
   │     merchantInfo,             │                               │
   │     googlePayConfig } ────────│                               │
   │                               │                               │
   │  [Google Pay JS API loads]    │                               │
   │  [User taps Google Pay btn]   │                               │
   │          │                    │                    Google Pay │
   │          └──────────────────────────────────────────> (device auth)
   │          │                    │                    <─ encrypted token
   │                               │                               │
   │── POST /process-google-pay ──>│                               │
   │   { token, amount, currency } │                               │
   │                               │── card.charge() ─────────────>│
   │                               │   mobileType=GOOGLE_PAY       │
   │                               │   paymentSource=GOOGLEPAYWEB  │
   │                               │<─ { transactionId, authCode } │
   │                               │                               │
   │<─ { success, transactionId } ─│                               │
```

## Google Pay Use Cases

| Scenario | Description |
|----------|-------------|
| E-commerce checkout | Replace card form with one-tap Google Pay button |
| Mobile web payments | Streamlined checkout on Android/Chrome browsers |
| Quick purchases | Faster checkout using saved payment methods |
| Subscription sign-up | Collect initial payment with Google Pay tokenization |

> **Note:** This project covers web browser integration only. Native Android app integration requires the Google Pay Android SDK and is not covered here.

## Prerequisites

- Global Payments Portico developer account with alternative payments (Google Pay) enabled
- Portico API credentials (`PUBLIC_API_KEY` and `SECRET_API_KEY`)
- Google account for testing Google Pay in TEST environment
- Supported browser: Chrome on Android or desktop (Chrome DevTools for testing)
- Docker, or runtime for your chosen language (PHP 8.0+, Node.js 18+, .NET 8+)

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/globalpayments-samples/portico-google-pay-payments.git
cd portico-google-pay-payments
```

### 2. Choose a Language and Configure Credentials

```bash
cd php   # or nodejs, dotnet
cp .env.sample .env
```

Edit `.env`:

```env
PUBLIC_API_KEY=pkapi_cert_your_key_here
SECRET_API_KEY=skapi_cert_your_key_here
MERCHANT_ID=your_merchant_id
MERCHANT_NAME="Your Business Name"
ENVIRONMENT=TEST
```

### 3. Install, Build, and Run

**PHP:**
```bash
composer install
php -S localhost:8000
# Open http://localhost:8000
```

**Node.js:**
```bash
npm install
npm start
# Open http://localhost:8000
```

**.NET:**
```bash
dotnet restore
dotnet run
# Open http://localhost:5000
```

### 4. Test Google Pay

1. Open the app in Chrome (desktop or Android)
2. Enter a payment amount
3. Click the **Google Pay** button
4. Complete payment in the Google Pay sheet using a test card
5. Verify the response includes a `transactionId`

> **Testing tip:** In `ENVIRONMENT=TEST`, Google Pay shows a simulated payment sheet. No real charges are made. Use your Google account's saved cards — they will be intercepted and tokenized as test data.

## Docker Setup

Run all language implementations simultaneously:

```bash
# Copy root .env first
cp php/.env.sample .env

docker-compose up
```

| Service | External Port | URL |
|---------|--------------|-----|
| nodejs  | 8001 | http://localhost:8001 |
| php     | 8003 | http://localhost:8003 |
| dotnet  | 8006 | http://localhost:8006 |

Run a single service:

```bash
docker-compose up php
docker-compose up nodejs
docker-compose up dotnet
```

## API Endpoints

### GET /config

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

### POST /process-google-pay

Processes a Google Pay payment token through the Portico gateway.

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
| `token` | string | ✅ | Encrypted Google Pay payment token (JSON string from Google Pay JS API) |
| `amount` | string/number | ✅ | Charge amount (e.g. `19.99`) |
| `currency` | string | ✅ | ISO 4217 currency code (`USD`, `EUR`, `GBP`) |

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

## SDK Configuration

All implementations use `PorticoConfig` with `secretApiKey`. The Google Pay token is passed as a `CreditCardData` object with `mobileType` set to `GOOGLE_PAY`:

**PHP:**
```php
$config = new PorticoConfig();
$config->secretApiKey = $_ENV['SECRET_API_KEY'];
$config->serviceUrl = 'https://cert.api2.heartlandportico.com';
ServicesContainer::configureService($config);

$card = new CreditCardData();
$card->token = $googlePayToken;
$card->mobileType = EncyptedMobileType::GOOGLE_PAY;
$card->paymentSource = PaymentDataSourceType::GOOGLEPAYWEB;

$transaction = $card->charge($amount)
    ->withCurrency($currency)
    ->execute();
```

**Node.js:**
```javascript
const config = new PorticoConfig();
config.secretApiKey = process.env.SECRET_API_KEY;
ServicesContainer.configure(config);

const card = new CreditCardData();
card.token = googlePayToken;
card.mobileType = EncryptedMobileType.GooglePay;
card.paymentSource = PaymentDataSourceType.GooglePayWeb;

const transaction = await card.charge(amount)
    .withCurrency(currency)
    .execute();
```

**.NET:**
```csharp
var config = new PorticoConfig {
    SecretApiKey = Environment.GetEnvironmentVariable("SECRET_API_KEY")
};
ServicesContainer.Configure(config);

var card = new CreditCardData {
    Token = googlePayToken,
    MobileType = EncryptedMobileType.GooglePay,
    PaymentSource = PaymentDataSourceType.GooglePayWeb
};

var transaction = await card.Charge(amount)
    .WithCurrency(currency)
    .Execute();
```

## Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `PUBLIC_API_KEY` | Public key for Heartland.js (passed to browser) | ✅ | `pkapi_cert_jKc1FtuyAydZhZfbB3` |
| `SECRET_API_KEY` | Secret key for server-side Portico API calls | ✅ | `skapi_cert_MTyMAQBiHVE...` |
| `MERCHANT_ID` | Your Portico merchant ID | ✅ | `777704033964` |
| `MERCHANT_NAME` | Your business name shown in Google Pay sheet | ✅ | `Test Merchant` |
| `ENVIRONMENT` | Gateway environment | ✅ | `TEST` or `PRODUCTION` |
| `ENABLE_LOGGING` | Enable SDK request/response logging | ❌ | `true` |
| `GOOGLE_PAY_MERCHANT_ID` | Google Pay merchant ID (production only) | ❌ | `12345678901234567890` |
| `GOOGLE_PAY_COUNTRY_CODE` | ISO 3166-1 alpha-2 country code | ❌ | `GB` (default) |
| `GOOGLE_PAY_CURRENCY_CODE` | ISO 4217 currency code | ❌ | `GBP` (default) |
| `GOOGLE_PAY_BUTTON_COLOR` | Google Pay button color | ❌ | `black` or `white` |

Obtain Portico credentials from your [Global Payments developer account](https://developer.globalpayments.com/).

## Google Pay Test Environment

Google Pay does not provide numbered test cards the way traditional card processors do. Instead:

- In `ENVIRONMENT=TEST`, Google Pay intercepts the payment sheet and returns a **simulated token** automatically — no real card charge occurs
- Any Google account with a saved payment method can be used
- The test token is processed through Portico's certification environment (`cert.api2.heartlandportico.com`)
- To test declined scenarios, use amounts that exceed test limits or temporarily use invalid credentials

### Production Setup

When moving to production:

1. Register with [Google Pay for Business](https://pay.google.com/business/console/)
2. Complete merchant verification and obtain your `GOOGLE_PAY_MERCHANT_ID`
3. Update `.env`: `ENVIRONMENT=PRODUCTION` and add `GOOGLE_PAY_MERCHANT_ID`
4. Switch Portico credentials to production keys
5. HTTPS is **required** — Google Pay will not load on plain HTTP in production

## Project Structure

```
portico-google-pay-payments/
├── docker-compose.yml        # Multi-service Docker config
├── README.md                 # This file
├── LICENSE
├── php/                      # PHP implementation (Docker: 8003)
│   ├── config.php            # GET /config endpoint
│   ├── process-google-pay.php # POST /process-google-pay endpoint
│   ├── process-payment.php   # Legacy endpoint alias
│   ├── index.html            # Google Pay frontend
│   ├── composer.json
│   ├── .env.sample
│   ├── Dockerfile
│   ├── run.sh
│   ├── .devcontainer/
│   ├── .codesandbox/
│   └── README.md
├── nodejs/                   # Node.js implementation (Docker: 8001)
│   ├── server.js             # Express server with both endpoints
│   ├── index.html            # Google Pay frontend
│   ├── package.json
│   ├── .env.sample
│   ├── Dockerfile
│   ├── run.sh
│   ├── .devcontainer/
│   ├── .codesandbox/
│   └── README.md
└── dotnet/                   # .NET implementation (Docker: 8006)
    ├── Program.cs            # ASP.NET Core minimal API
    ├── wwwroot/              # Static files (index.html)
    ├── dotnet.csproj
    ├── .env.sample
    ├── Dockerfile
    ├── run.sh
    ├── .devcontainer/
    ├── .codesandbox/
    └── README.md
```

## Troubleshooting

**Google Pay button does not appear**
Google Pay only renders in supported browsers (Chrome on Android, Chrome desktop with a Google account signed in). Safari, Firefox, and Edge do not support Google Pay. Open DevTools → Console to see the specific Google Pay JS error. Ensure `/config` returns successfully and that `googlePayConfig.environment` is `TEST`.

**"Google Pay token is required" error**
The `token` field in the POST body was empty or missing. This usually means the Google Pay JS API returned an error before the token was captured. Check the browser console for Google Pay initialization errors — often caused by a missing or incorrect `merchantId` in the config response.

**"Authentication failed" or 401 from Portico**
Your `SECRET_API_KEY` in `.env` is wrong or missing. Verify the key starts with `skapi_cert_` for the TEST environment. If you recently rotated credentials, ensure the `.env` file has been updated and the server restarted.

**Payment declined in TEST environment**
Your Portico account may not have Google Pay / alternative payments enabled. Contact Global Payments support to confirm that your certification account has `GOOGLEPAY` enabled as an accepted payment method.

**Port already in use**
Each language runs on a different Docker external port. If running locally without Docker, only one service can use port 8000 at a time. Stop competing processes with `lsof -i :8000` and kill the conflicting PID, or edit your `run.sh` to use a different port.

**`ENABLE_LOGGING=true` causing errors**
The SDK writes logs to a `logs/` directory relative to the server file. Ensure that directory exists and is writable, or set `ENABLE_LOGGING=false` to disable.

## Per-Language Documentation

Each implementation has its own detailed README:

- [PHP README](./php/README.md)
- [Node.js README](./nodejs/README.md)
- [.NET README](./dotnet/README.md)

## External Resources

- [Global Payments Developer Portal](https://developer.globalpayments.com/)
- [Google Pay Web Integration Guide](https://developers.google.com/pay/api/web/overview)
- [Google Pay Test Cards](https://developers.google.com/pay/api/web/guides/resources/test-card-suite)
- [Portico Alternative Payments Docs](https://developer.globalpayments.com/api/references-overview)

## License

[MIT](./LICENSE)
