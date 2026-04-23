# .NET — Portico Google Pay Payments

ASP.NET Core implementation of Google Pay web payments using the Global Payments Portico gateway. Demonstrates the complete flow from loading the Google Pay button to processing the encrypted payment token server-side.

## Requirements

- .NET 8.0+
- Global Payments Portico account with alternative payments (Google Pay) enabled
- Chrome browser for testing (desktop or Android)

---

## Project Structure

```
dotnet/
├── Program.cs          # ASP.NET Core minimal API — GET /config and POST /process-google-pay
├── wwwroot/
│   └── index.html      # Google Pay frontend (served as static file)
├── appsettings.json    # ASP.NET Core app settings
├── dotnet.csproj       # GlobalPayments.Api dependency
├── .env.sample         # Environment variable template
├── Dockerfile
├── run.sh
├── .devcontainer/
└── .codesandbox/
```

---

## Setup

**1. Restore dependencies**
```bash
dotnet restore
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
dotnet run
# Open http://localhost:5000
```

Or use the convenience script:
```bash
./run.sh
```

---

## Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `PUBLIC_API_KEY` | Public key passed to browser | ✅ | `pkapi_cert_jKc1FtuyAydZhZfbB3` |
| `SECRET_API_KEY` | Secret key for server-side Portico API calls | ✅ | `skapi_cert_MeHOBQ...` |
| `MERCHANT_ID` | Portico merchant ID | ✅ | `777704033964` |
| `MERCHANT_NAME` | Business name shown in Google Pay sheet | ✅ | `Test Merchant` |
| `ENVIRONMENT` | Gateway environment | ✅ | `TEST` or `PRODUCTION` |
| `ENABLE_LOGGING` | Writes SDK request/response to `logs/` | ❌ | `true` |
| `GOOGLE_PAY_MERCHANT_ID` | Google merchant ID (production only) | ❌ | `12345678901234567890` |
| `GOOGLE_PAY_COUNTRY_CODE` | ISO 3166-1 alpha-2 country code | ❌ | `GB` (default) |
| `GOOGLE_PAY_CURRENCY_CODE` | ISO 4217 currency code | ❌ | `GBP` (default) |
| `GOOGLE_PAY_BUTTON_COLOR` | Google Pay button color | ❌ | `black` or `white` |

---

## SDK Configuration

```csharp
using GlobalPayments.Api;
using GlobalPayments.Api.ServiceConfigs.Gateways;

var config = new PorticoConfig
{
    SecretApiKey = Environment.GetEnvironmentVariable("SECRET_API_KEY"),
    ServiceUrl = "https://cert.api2.heartlandportico.com"
};

ServicesContainer.Configure(config);
```

---

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
| `amount` | string | ✅ | Charge amount as a numeric string (e.g. `"19.99"`) |
| `billing_zip` | string | ❌ | Billing postal code for AVS |

**Response (success):**
```json
{
  "success": true,
  "message": "Google Pay payment processed successfully",
  "data": {
    "transactionId": "12345678",
    "amount": "19.99",
    "currency": "USD",
    "responseCode": "00",
    "authCode": "123456"
  }
}
```

**Response (validation error):**
```json
{
  "success": false,
  "message": "Google Pay token and amount are required",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": "Missing required fields: token, amount"
  }
}
```

**Response (API error):**
```json
{
  "success": false,
  "message": "Google Pay payment processing failed",
  "error": {
    "code": "API_ERROR",
    "details": "Detailed error from Portico"
  }
}
```

---

## Payment Processing Flow

```csharp
// 1. Read JSON body
var body = await context.Request.ReadFromJsonAsync<JsonElement>();
var googlePayToken = body.GetProperty("token").GetString();
decimal.TryParse(body.GetProperty("amount").GetString(), out var amount);

// 2. Attach token to CreditCardData with Google Pay source
var card = new CreditCardData
{
    Token = googlePayToken,
    MobileType = MobilePaymentMethodType.GOOGLEPAY,
    PaymentSource = PaymentDataSourceType.GOOGLEPAYWEB
};

// 3. Optionally include billing address for AVS
var address = new Address { PostalCode = billingZip };

// 4. Charge through Portico — SDK decrypts and processes
var response = await card.Charge(amount)
    .WithAllowDuplicates(true)
    .WithCurrency("USD")
    .WithAddress(address)
    .Execute();

// 5. Return transactionId to client
return Results.Ok(new { success = true, data = new { transactionId = response.TransactionId } });
```

---

## Google Pay Test Environment

In `ENVIRONMENT=TEST`, Google Pay intercepts the payment sheet and returns a simulated token — no actual card is charged. Any Google account with a saved payment method can be used for testing. The test token is processed through Portico's certification endpoint (`cert.api2.heartlandportico.com`).

**Supported card networks:**
Visa, Mastercard, American Express, Discover, JCB

---

## Docker

```bash
docker build -t portico-google-pay-dotnet .
docker run -p 8006:8000 \
  -e ASPNETCORE_URLS=http://+:8000 \
  -e PUBLIC_API_KEY=your_key \
  -e SECRET_API_KEY=your_key \
  -e MERCHANT_ID=your_merchant_id \
  -e MERCHANT_NAME="Test Merchant" \
  -e ENVIRONMENT=TEST \
  portico-google-pay-dotnet
# Open http://localhost:8006
```

Or via docker-compose from the project root:
```bash
docker-compose up dotnet
```

---

## Troubleshooting

**Google Pay button does not appear**
Google Pay renders only in Chrome (desktop or Android). Open browser DevTools → Console for initialization errors. Verify `GET /config` returns a valid 200 response — if the endpoint throws, the frontend cannot configure the Google Pay button.

**"Google Pay token and amount are required" (400)**
The `token` or `amount` JSON field was missing. Confirm the browser is sending `Content-Type: application/json` in the POST request and that both fields are present in the body. Amount must be a numeric string (e.g. `"19.99"`, not `19.99`).

**"Authentication failed" or Portico 401**
Your `SECRET_API_KEY` environment variable is wrong or not set. For Docker, confirm the `-e SECRET_API_KEY=...` flag is correct. For local development, verify `.env` has the correct `skapi_cert_` prefixed key and restart `dotnet run`.

**"Alternative payments not enabled" or Portico feature error**
Google Pay must be explicitly enabled on your Portico certification account. Contact Global Payments support to activate `GOOGLEPAY` on your account.

**`dotnet run` fails with SDK version error**
Verify the `GlobalPayments.Api` package version in `dotnet.csproj` (target: `9.0.16`). Run `dotnet restore` to pull the correct version. If the build still fails, clear the NuGet cache: `dotnet nuget locals all --clear`.

**Static files not served (index.html 404)**
The frontend is served from `wwwroot/`. Ensure `app.UseStaticFiles()` is in `Program.cs` and the `wwwroot/` directory contains `index.html`. When running via Docker, verify the `COPY` step in the Dockerfile includes the `wwwroot/` directory.
