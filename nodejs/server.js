/**
 * Global Payments SDK Template - Node.js
 * 
 * This Express application provides a starting template for Global Payments SDK integration.
 * Customize the endpoints and logic below for your specific use case.
 */

import express from 'express';
import * as dotenv from 'dotenv';
import {
    ServicesContainer,
    PaymentDataSourceType,
    MobilePaymentMethodType,
    PorticoConfig,
    Address,
    CreditCardData,
    ApiError,
    TransactionModifier
} from 'globalpayments-api';

// Load environment variables from .env file
dotenv.config();

/**
 * Initialize Express application with necessary middleware
 */
const app = express();
const port = process.env.PORT || 8000;

app.use(express.static('.')); // Serve static files
app.use(express.urlencoded({ extended: true })); // Parse form data
app.use(express.json()); // Parse JSON requests

// Configure Global Payments SDK with credentials and settings
const config = new PorticoConfig();
config.secretApiKey = process.env.SECRET_API_KEY;
config.serviceUrl = 'https://cert.api2.heartlandportico.com'; // Use production URL for live transactions
ServicesContainer.configureService(config);

/**
 * Utility function to sanitize postal code
 * Customize validation logic as needed for your use case
 */
const sanitizePostalCode = (postalCode) => {
    return postalCode.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 10);
};

/**
 * Config endpoint - provides public API key for client-side use
 * Customize response data as needed
 */
app.get('/config', (req, res) => {
    res.json({
        success: true,
        data: {
            publicApiKey: process.env.PUBLIC_API_KEY,
            merchantInfo: {
                merchantName: process.env.MERCHANT_NAME || 'Test Merchant',
                merchantId: process.env.GOOGLE_PAY_MERCHANT_ID
            }
            // Add other configuration data as needed
        }
    });
});

/**
 * Example payment processing endpoint
 * Customize this endpoint for your specific payment flow
 */
app.post('/process-payment', async (req, res) => {
    try {
        // TODO: Add your payment processing logic here
        // Example implementation for basic charge:
        
        if (!req.body.payment_token) {
            throw new Error('Payment token is required');
        }

        const card = new CreditCardData();
        card.token = req.body.payment_token;

        // Customize amount and other parameters as needed
        const amount = req.body.amount || 10.00;

        // Add billing address if needed
        if (req.body.billing_zip) {
            const address = new Address();
            address.postalCode = sanitizePostalCode(req.body.billing_zip);
            
            const response = await card.charge(amount)
                .withAllowDuplicates(true)
                .withCurrency('USD')
                .withAddress(address)
                .execute();
                
            // Handle response...
            res.json({
                success: true,
                message: 'Payment processed successfully',
                data: { transactionId: response.transactionId }
            });
        } else {
            // Process without address
            const response = await card.charge(amount)
                .withAllowDuplicates(true)
                .withCurrency('USD')
                .execute();
                
            res.json({
                success: true,
                message: 'Payment processed successfully',
                data: { transactionId: response.transactionId }
            });
        }

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Payment processing failed',
            error: error.message
        });
    }
});

/**
 * Google Pay payment processing endpoint
 * Processes payments using Google Pay payment tokens
 */
app.post('/process-google-pay', async (req, res) => {
    try {
        // Validate required fields for Google Pay
        if (!req.body.paymentToken) {
            throw new Error('Google Pay payment token is required');
        }

        // Parse Google Pay payment token
        const googlePayToken = JSON.parse(req.body.paymentToken);
        console.log('Google Pay Token:', googlePayToken);
        
        // Extract and parse the nested payment token from Google Pay response
        const tokenizationData = googlePayToken.paymentMethodData?.tokenizationData;
        
        if (!tokenizationData || !tokenizationData.token) {
            throw new Error('Invalid Google Pay token format: missing tokenization data');
        }
        
        // Parse the nested JSON token string to get the actual payment data
        let paymentToken;
        try {
            const parsedToken = JSON.parse(tokenizationData.token);
            console.log('Parsed Google Pay Token:', parsedToken);
            
            // For Heartland Portico, we need to use the entire parsed token structure
            // The gateway expects the signature, protocolVersion, and signedMessage
            paymentToken = JSON.stringify(parsedToken);
        } catch (parseError) {
            console.error('Failed to parse Google Pay token:', parseError);
            throw new Error('Invalid Google Pay token format: unable to parse token data');
        }
        
        if (!paymentToken) {
            throw new Error('Invalid Google Pay token format: empty payment token');
        }

        // Create card data using the Google Pay token for Portico WalletData
        const card = new CreditCardData();
        card.token = paymentToken;
        card.mobileType = MobilePaymentMethodType.GOOGLEPAY;
        card.paymentSource = PaymentDataSourceType.GOOGLEPAYWEB;

        // Get amount from request or use default
        const amount = parseFloat(req.body.amount) || 10.00;

        // Add billing address if provided
        let response;
        if (req.body.billing_zip) {
            const address = new Address();
            address.postalCode = sanitizePostalCode(req.body.billing_zip);
            
            response = await card.charge(amount)
                .withAllowDuplicates(true)
                .withCurrency('USD')
                .withAddress(address)
                .execute();
        } else {
            // Process without address
            response = await card.charge(amount)
                .withAllowDuplicates(true)
                .withCurrency('USD')
                .execute();
        }

        // Return success response
        res.json({
            success: true,
            message: 'Google Pay payment processed successfully',
            data: {
                transactionId: response.transactionId,
                amount: amount,
                currency: 'USD',
                paymentMethod: 'Google Pay'
            }
        });

    } catch (error) {
        console.error('Google Pay processing error:', error);
        
        // Handle different types of errors
        let errorMessage = 'Google Pay payment processing failed';
        let statusCode = 500;
        
        if (error instanceof ApiError) {
            errorMessage = `API Error: ${error.message}`;
            statusCode = 400;
        } else if (error.message.includes('token') || error.message.includes('tokenization')) {
            errorMessage = `Token Error: ${error.message}`;
            statusCode = 400;
        } else if (error.message.includes('parse') || error.message.includes('JSON')) {
            errorMessage = `Parse Error: ${error.message}`;
            statusCode = 400;
        } else if (error.message.includes('Gateway') || error.message.includes('System error')) {
            errorMessage = `Gateway Error: ${error.message}`;
            statusCode = 502;
        }

        res.status(statusCode).json({
            success: false,
            message: errorMessage,
            error: error.message
        });
    }
});

/**
 * Add your custom endpoints here
 * Examples:
 * - app.post('/authorize', ...) // Authorization only
 * - app.post('/capture', ...)   // Capture authorized payment
 * - app.post('/refund', ...)    // Process refund
 * - app.get('/transaction/:id', ...) // Get transaction details
 */

// Start the server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Customize this template for your use case!`);
});