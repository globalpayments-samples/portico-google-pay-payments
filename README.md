# Google Pay Payment Examples

This repository demonstrates Google Pay payment processing using the Global Payments SDK across multiple programming languages. Each implementation provides a complete Google Pay integration with the Portico Gateway, including token processing and payment handling.

## Available Implementations

- [Node.js](./nodejs/) - Express.js web application with Google Pay integration
- [PHP](./php/) - PHP web application with Google Pay support
- [.NET Core](./dotnet/) - ASP.NET Core web application with Google Pay processing

## Features

- **Google Pay Integration** - Complete Google Pay button and payment flow
- **SDK Configuration** - Environment variable-based setup with Portico Gateway
- **Token Processing** - Google Pay token extraction and payment processing
- **Error Handling** - Comprehensive error handling for payment scenarios
- **Client Integration** - HTML interface with Google Pay JavaScript API
- **Multiple Languages** - Consistent Google Pay implementation patterns

## Implementation Details

Each implementation includes:

1. **Google Pay Configuration**
   - Environment variable-based setup
   - Merchant information configuration
   - Test and production environment support

2. **Core Endpoints**
   - GET `/config` - Configuration for Google Pay initialization
   - POST `/process-google-pay` - Google Pay token processing
   - Static file serving for the Google Pay interface

3. **Google Pay Flow**
   - Google Pay button integration
   - Payment token generation and validation
   - Portico Gateway payment processing
   - Transaction result handling

## Quick Start

1. **Choose your language** - Navigate to any implementation directory (nodejs, php, dotnet)
2. **Set up credentials** - Copy `.env.sample` to `.env` and add your Global Payments API keys
3. **Configure Google Pay** - Add your merchant information to the `.env` file
4. **Run the server** - Execute `./run.sh` to install dependencies and start the server
5. **Test Google Pay** - Open your browser to `http://localhost:8000` and use the Google Pay button

## Google Pay Use Cases

These examples demonstrate Google Pay integration for:

- **One-time Payments** - Process immediate Google Pay charges
- **E-commerce Checkout** - Integrate Google Pay into shopping carts
- **Mobile Web Payments** - Streamlined mobile browser payment experience
- **Quick Payments** - Fast checkout with saved payment methods
- **Web Integration** - Google Pay integration for web browsers

*Note: This project covers web browser integration only. Native mobile app integration is not covered in these examples.*

## Prerequisites

- Global Payments account with API credentials
- Google account for testing Google Pay
- Development environment for your chosen language
- Package manager (npm for Node.js, composer for PHP, dotnet CLI for .NET)
- Supported browser (Chrome recommended for testing)

## Configuration

### Environment Variables

Each implementation requires these environment variables in `.env`:

```bash
# Global Payments API Keys
PUBLIC_API_KEY=pkapi_your_public_key_here
SECRET_API_KEY=skapi_your_secret_key_here

# Google Pay Configuration
MERCHANT_NAME="Your Merchant Name"
MERCHANT_ID=your_global_payments_merchant_id
GOOGLE_PAY_MERCHANT_ID=your_google_pay_merchant_id

# Server Configuration
PORT=8000
```

### Google Pay Setup

1. **Test Environment**: No registration required - Google Pay works in test mode
2. **Production Environment**:
   - Register with Google Pay for Business
   - Complete merchant verification
   - Update environment to 'PRODUCTION' in client code
   - Configure your domain with Google Pay

### Production Considerations

For production deployment:
- Implement input validation and sanitization
- Add comprehensive error handling and logging
- Include security headers and rate limiting
- Ensure HTTPS (required for Google Pay)
- Implement proper CORS configuration
- Add payment fraud prevention measures
- Configure domain verification with Google Pay
