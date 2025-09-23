# .NET Google Pay Payment Example

This example demonstrates Google Pay payment processing using ASP.NET Core and the Global Payments SDK with Portico Gateway.

## Requirements

- .NET 6.0 or later
- Global Payments account and API credentials
- Google account for testing Google Pay
- Supported browser (Chrome recommended for testing)

## Project Structure

- `Program.cs` - Main application file containing server setup and Google Pay payment processing
- `wwwroot/index.html` - Client-side Google Pay integration and payment interface
- `.env.sample` - Template for environment variables including Google Pay configuration
- `run.sh` - Convenience script to run the application
- `appsettings.json` - Application configuration file

## Setup

1. Clone this repository
2. Copy `.env.sample` to `.env`
3. Update `.env` with your Global Payments and Google Pay credentials:
   ```
   PUBLIC_API_KEY=pkapi_your_public_key_here
   SECRET_API_KEY=skapi_your_secret_key_here
   MERCHANT_NAME="Your Merchant Name"
   MERCHANT_ID=your_global_payments_merchant_id
   GOOGLE_PAY_MERCHANT_ID=your_google_pay_merchant_id
   PORT=8000
   ```
4. Install dependencies:
   ```bash
   dotnet restore
   ```
5. Run the application:
   ```bash
   ./run.sh
   ```
   Or manually:
   ```bash
   dotnet run
   ```
6. Open your browser to `http://localhost:8000`
7. Navigate to the "Google Pay" tab to test the integration

## Implementation Details

### Server Setup
The application uses ASP.NET Core's minimal API approach to create a lightweight web server that:
- Serves static files from wwwroot directory
- Processes Google Pay payment tokens
- Provides configuration endpoint for client-side Google Pay setup
- Handles JSON requests for payment processing

### SDK Configuration
The Global Payments SDK is configured using environment variables and the PorticoConfig class:
- Loads Portico credentials from .env file
- Sets up service URL for Portico API communication
- Configures merchant information for Google Pay

### Google Pay Integration
Google Pay integration flow:
1. Client loads Google Pay JavaScript API
2. Initializes Google Pay button with merchant configuration
3. User selects payment method through Google Pay interface
4. Google Pay generates encrypted payment token
5. Token is sent to server for processing via Portico Gateway
6. Server processes payment and returns result

### Payment Processing
Payment processing flow:
1. Client submits Google Pay payment token, amount, and optional billing zip
2. Server extracts and validates the payment token
3. Server creates CreditCardData with the Google Pay token
4. Creates Address with postal code if provided
5. Processes payment charge through Portico Gateway
6. Returns success/error response with transaction details

### Error Handling
Implements comprehensive error handling:
- Validates Google Pay token format and structure
- Catches and processes API exceptions from Portico
- Differentiates between API, token, and general errors
- Returns appropriate HTTP status codes and error messages

## API Endpoints

### GET /config
Returns configuration for client-side Google Pay initialization.

Response:
```json
{
    "publicApiKey": "pkapi_your_public_key_here",
    "merchantInfo": {
        "merchantName": "Your Merchant Name",
        "merchantId": "your_global_payments_merchant_id"
    }
}
```

### POST /process-google-pay
Processes a Google Pay payment using the provided payment token.

Request Parameters:
- `payment_token` (string, required) - Google Pay payment token (JSON string)
- `amount` (number, required) - Payment amount in USD
- `billing_zip` (string, optional) - Billing postal code

Response (Success):
```json
{
    "message": "Google Pay payment processed successfully",
    "data": {
        "transactionId": "123456789",
        "amount": 10.00,
        "currency": "USD",
        "paymentMethod": "Google Pay"
    }
}
```

Response (Error):
```json
{
    "detail": "Detailed error message"
}
```

## Google Pay Testing

### Test Environment
- The application is configured for Google Pay TEST environment
- No real payment methods are charged in test mode
- Google Pay will show test payment methods in supported browsers/devices

### Testing Google Pay
1. Use Chrome browser (recommended for testing)
2. Ensure you're logged into a Google account
3. Add test payment methods to Google Pay (if needed)
4. Click the Google Pay button to initiate payment flow
5. Select payment method and complete the flow
6. Check console logs for detailed debugging information

### Supported Browsers
- Chrome (Desktop and Mobile Web)
- Safari (Mobile iOS Web)
- Firefox (with limitations)
- Edge (with limitations)

*Note: This example covers web browser integration only. Native mobile app integration requires additional implementation.*

### Supported Card Networks
- Visa
- Mastercard
- American Express
- Discover
- JCB

## Production Setup

### Google Pay Merchant Registration
For production deployment, you'll need to:
1. Register with Google Pay for Business
2. Complete merchant verification process
3. Update environment to 'PRODUCTION' in client code
4. Configure your domain with Google Pay
5. Update gateway merchant ID with your actual ID

### Environment Configuration
Update the following in your `.env` file for production:
```
# Production values
GOOGLE_PAY_MERCHANT_ID=your_actual_merchant_id
MERCHANT_NAME=Your Actual Business Name
PUBLIC_API_KEY=pkapi_your_production_key
SECRET_API_KEY=skapi_your_production_key
```

Update client-side JavaScript:
```javascript
environment: 'PRODUCTION' // Change from 'TEST'
```

## Security Considerations

This example demonstrates basic implementation. For production use, consider:
- Implementing additional input validation
- Adding request rate limiting
- Including security headers
- Implementing proper logging and monitoring
- Adding payment fraud prevention measures
- Using HTTPS in production (required for Google Pay)
- Implementing proper CORS configuration
- Validating Google Pay token signatures
- Adding transaction logging and audit trails

## Troubleshooting

### Google Pay Button Not Showing
- Check browser console for errors
- Ensure you're using a supported browser (Chrome recommended)
- Verify Google Pay JavaScript API is loading correctly
- Check if `isReadyToPay()` is returning false

### Payment Processing Errors
- Verify your Portico API credentials are correct
- Check server logs for detailed error messages
- Ensure the payment token format is correct
- Verify your Portico account supports alternative payments

### Common Issues
1. **HTTPS Requirement**: Google Pay requires HTTPS in production
2. **Domain Verification**: Your domain must be registered with Google Pay for production
3. **API Key Mismatch**: Ensure your API keys match your Portico account
4. **Token Format**: Google Pay tokens must be properly formatted JSON
