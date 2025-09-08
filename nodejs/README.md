# Node.js Google Pay Payment Example

This example demonstrates Google Pay payment processing using Express.js and the Global Payments SDK with Portico Gateway.

## Requirements

- Node.js 14.x or later
- npm (Node Package Manager)
- Global Payments account and API credentials
- Google Pay merchant account (for production)
- Test environment supports Google Pay without merchant registration

## Project Structure

- `server.js` - Main application file containing server setup and Google Pay payment processing
- `index.html` - Client-side Google Pay integration and payment interface
- `package.json` - Project dependencies and scripts
- `.env.sample` - Template for environment variables including Google Pay configuration
- `run.sh` - Convenience script to run the application

## Setup

1. Clone this repository
2. Copy `.env.sample` to `.env`
3. Update `.env` with your Global Payments and Google Pay credentials:
   ```
   PUBLIC_API_KEY=pkapi_your_public_key_here
   SECRET_API_KEY=skapi_your_secret_key_here
   MERCHANT_NAME=Your Merchant Name
   GOOGLE_PAY_MERCHANT_ID=your_google_pay_merchant_id
   PORT=8000
   ```
4. Install dependencies:
   ```bash
   npm install
   ```
5. Run the application:
   ```bash
   ./run.sh
   ```
   Or manually:
   ```bash
   npm start
   ```
6. Open your browser to `http://localhost:8000`
7. Navigate to the "Google Pay" tab to test the integration

## Implementation Details

### Server Setup
The application uses Express.js to create a web server that:
- Serves static files and the Google Pay interface
- Processes Google Pay payment tokens
- Provides configuration endpoint for client-side Google Pay setup
- Handles JSON requests for payment processing

### SDK Configuration
Global Payments SDK configuration using environment variables:
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
- Returns appropriate error messages to client

## API Endpoints

### GET /config
Returns configuration for client-side Google Pay initialization.

Response:
```json
{
    "success": true,
    "data": {
        "publicApiKey": "pkapi_your_public_key_here",
        "merchantInfo": {
            "merchantName": "Your Merchant Name",
            "merchantId": "your_google_pay_merchant_id"
        }
    }
}
```

### POST /process-google-pay
Processes a Google Pay payment using the provided payment token.

Request Parameters:
- `paymentToken` (string, required) - Google Pay payment token (JSON string)
- `amount` (number, required) - Payment amount in USD
- `billing_zip` (string, optional) - Billing postal code

Request Body Example:
```json
{
    "paymentToken": "{\"apiVersionMinor\":0,\"apiVersion\":2,\"paymentMethodData\":{\"description\":\"Visa •••• 1234\",\"tokenizationData\":{\"type\":\"PAYMENT_GATEWAY\",\"token\":\"{\\\"signature\\\":\\\"...\\\",\\\"protocolVersion\\\":\\\"ECv1\\\",\\\"signedMessage\\\":\\\"...\\\"}\"},\"type\":\"CARD\",\"info\":{\"cardNetwork\":\"VISA\",\"cardDetails\":\"1234\"}}}",
    "amount": 10.00,
    "billing_zip": "12345"
}
```

Response (Success):
```json
{
    "success": true,
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
    "success": false,
    "message": "Google Pay payment processing failed",
    "error": "Detailed error message"
}
```

### POST /process-payment (Legacy)
Original credit card processing endpoint (still available for backward compatibility).

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
- Chrome (Desktop and Mobile)
- Safari (Mobile iOS)
- Firefox (with limitations)
- Edge (with limitations)

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
3. Update environment to 'PRODUCTION'
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

Update `index.html` JavaScript:
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
- Configuring Cross-Origin Resource Sharing (CORS) appropriately
- Validating Google Pay token signatures
- Implementing proper error handling and user feedback
- Adding transaction logging and audit trails

## Troubleshooting

### Google Pay Button Not Showing
- Check browser console for errors
- Ensure you're using a supported browser (Chrome recommended)
- Verify Google Pay JavaScript API is loading correctly
- Check if `isReadyToPay()` is returning false

### "Google Pay is not available" Error
- Ensure you're logged into a Google account
- Add a payment method to Google Pay
- Try using Chrome browser
- Check if the device supports Google Pay

### Payment Processing Errors
- Verify your Portico API credentials are correct
- Check server logs for detailed error messages
- Ensure the payment token format is correct
- Verify your Portico account supports alternative payments

### Token Extraction Errors
- Check the Google Pay token structure in browser console
- Verify the tokenization specification matches your gateway
- Ensure the payment token is being passed as a JSON string

### Common Issues
1. **HTTPS Requirement**: Google Pay requires HTTPS in production
2. **Domain Verification**: Your domain must be registered with Google Pay for production
3. **API Key Mismatch**: Ensure your API keys match your Portico account
4. **Token Format**: Google Pay tokens must be properly formatted JSON

### Getting Help
- Check the browser console for JavaScript errors
- Review server logs for API errors
- Consult Global Payments documentation for Portico-specific issues
- Test with different browsers and devices
