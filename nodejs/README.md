# Node.js — Portico Google Pay Payments

Node.js/Express implementation of Google Pay web payments using the Global Payments Portico gateway. Demonstrates the complete flow from loading the Google Pay button to processing the encrypted payment token server-side.

## Requirements

- Node.js 18+
- npm
- Global Payments Portico account with alternative payments (Google Pay) enabled
- Chrome browser for testing (desktop or Android)

## Project Structure

```
nodejs/
├── server.js       # Express server — GET /config and POST /process-google-pay
├── index.html      # Google Pay frontend (served statically)
├── package.json    # globalpayments-api dependency
├── .env.sample     # Environment variable template
├── Dockerfile
├── run.sh
├── .devcontainer/
└── .codesandbox/
```

## Setup

**1. Install dependencies**
```bash
npm install
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
PORT=8000
```

**3. Start the server**
```bash
npm start
# Open http://localhost:8000
```

Or use the convenience script:
```bash
./run.sh
```

## Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `PUBLIC_API_KEY` | Public key passed to browser | ✅ | `pkapi_cert_jKc1FtuyAydZhZfbB3` |
| `SECRET_API_KEY` | Secret key for server-side Portico API calls | ✅ | `skapi_cert_MeHOBQ...` |
| `MERCHANT_ID` | Portico merchant ID | ✅ | `777704033964` |
| `MERCHANT_NAME` | Business name shown in Google Pay sheet | ✅ | `Test Merchant` |
| `ENVIRONMENT` | Gateway environment | ✅ | `TEST` or `PRODUCTION` |
| `PORT` | Server port | ❌ | `8000` (default) |
| `ENABLE_LOGGING` | Writes SDK request/response to `logs/` | ❌ | `true` |
| `GOOGLE_PAY_MERCHANT_ID` | Google merchant ID (production only) | ❌ | `12345678901234567890` |
| `GOOGLE_PAY_COUNTRY_CODE` | ISO 3166-1 alpha-2 country code | ❌ | `GB` (default) |
| `GOOGLE_PAY_CURRENCY_CODE` | ISO 4217 currency code | ❌ | `GBP` (default) |
| `GOOGLE_PAY_BUTTON_COLOR` | Google Pay button color | ❌ | `black` or `white` |

## SDK Configuration

```javascript
import {
    ServicesContainer,
    PorticoConfig,
    CreditCardData,
    MobilePaymentMethodType,
    PaymentDataSourceType,
} from 'globalpayments-api';

const config = new PorticoConfig();
config.secretApiKey = process.env.SECRET_API_KEY;
config.serviceUrl = 'https://cert.api2.heartlandportico.com';

ServicesContainer.configureService(config);
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

Processes a Google Pay payment token through Portico.

**Request body** (`application/json`):
```json
{
  "token": "{\"signature\":\"...\",\"protocolVersion\":\"ECv1\",\"signedMessage\":\"...\"}",
  "amount": "19.99",
  "billing_zip": "30301"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `token` | string | ✅ | Encrypted Google Pay payment token (JSON string) |
| `amount` | string/number | ✅ | Charge amount (e.g. `19.99`) |
| `billing_zip` | string | ❌ | Billing postal code for AVS |

**Response (success):**
```json
{
  "success": true,
  "message": "Google Pay payment processed successfully",
  "data": {
    "transactionId": "12345678",
    "amount": 19.99,
    "currency": "USD",
    "paymentMethod": "Google Pay"
  }
}
```

**Response (error):**
```json
{
  "success": false,
  "message": "API Error: ...",
  "error": "Detailed error message"
}
```

## Payment Processing Flow

```javascript
// 1. Receive encrypted Google Pay token from browser
const { token, amount, billing_zip } = req.body;

// 2. Attach token to CreditCardData with Google Pay source
const card = new CreditCardData();
card.token = token;
card.mobileType = MobilePaymentMethodType.GOOGLEPAY;
card.paymentSource = PaymentDataSourceType.GOOGLEPAYWEB;

// 3. Optionally include billing address for AVS
const address = new Address();
address.postalCode = sanitizePostalCode(billing_zip);

// 4. Charge through Portico — SDK decrypts and processes
const response = await card.charge(amount)
    .withAllowDuplicates(true)
    .withCurrency('USD')
    .withAddress(address)
    .execute();

// 5. Return transactionId to client
res.json({ success: true, data: { transactionId: response.transactionId } });
```

## Google Pay Test Environment

In `ENVIRONMENT=TEST`, Google Pay intercepts the payment sheet and returns a simulated token — no actual card is charged. Any Google account with a saved payment method can be used for testing. The test token is processed through Portico's certification endpoint (`cert.api2.heartlandportico.com`).

**Supported card networks:**
Visa, Mastercard, American Express, Discover, JCB

## Docker

```bash
docker build -t portico-google-pay-nodejs .
docker run -p 8001:8000 \
  -e PUBLIC_API_KEY=your_key \
  -e SECRET_API_KEY=your_key \
  -e MERCHANT_ID=your_merchant_id \
  -e MERCHANT_NAME="Test Merchant" \
  -e ENVIRONMENT=TEST \
  portico-google-pay-nodejs
# Open http://localhost:8001
```

Or via docker-compose from the project root:
```bash
docker-compose up nodejs
```

## Troubleshooting

**Google Pay button does not appear**
Google Pay renders only in Chrome (desktop or Android). Open browser DevTools → Console to see any Google Pay JS initialization errors. Verify `GET /config` returns a valid response — if it throws, the button will not load.

**"Payment token is required" error**
The `token` field was missing or empty in the POST body. Check the browser console to see if the Google Pay JS sheet returned an error before producing a token. Common cause: `isReadyToPay()` returning false silently.

**"Authentication failed" or Portico 401**
Your `SECRET_API_KEY` in `.env` is wrong or missing. Confirm it starts with `skapi_cert_` for the TEST environment. Restart (`npm start`) after editing `.env` — the SDK reads credentials at startup.

**"Alternative payments not enabled" or similar Portico error**
Google Pay must be explicitly enabled on your Portico certification account. Contact Global Payments support to have `GOOGLEPAY` activated as an accepted payment method.

**Server won't start — `import` syntax error**
The project uses ES module syntax (`import`). Ensure `"type": "module"` is present in `package.json` and you're running Node.js 18+. Check with `node --version`.

**`logs/` directory missing when `ENABLE_LOGGING=true`**
Create the directory before starting the server:
```bash
mkdir -p nodejs/logs
```
Or set `ENABLE_LOGGING=` (empty) in `.env` to disable logging.
