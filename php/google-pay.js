/**
 * Google Pay Integration with GP-API
 * 
 * This module handles Google Pay initialization, configuration, and payment processing
 * using the Global Payments GP-API.
 */

/**
 * Configuration for Google Pay - will be loaded from server
 */
let config = {
    googleMerchant: '12345678901234567890',
    globalPaymentsMerchant: '',
    environment: 'TEST',
    countryCode: 'GB',
    currencyCode: 'GBP',
    amount: '10.00',
    buttonColor: 'black'
};

/**
 * Define the version of the Google Pay API referenced when creating your configuration
 */
const baseRequest = {
    apiVersion: 2,
    apiVersionMinor: 0
};

/**
 * Card networks supported by your site and your gateway
 */
const allowedCardNetworks = ["AMEX", "DISCOVER", "JCB", "MASTERCARD", "VISA"];

/**
 * Card authentication methods supported by your site and your gateway
 */
const allowedCardAuthMethods = ["PAN_ONLY", "CRYPTOGRAM_3DS"];

/**
 * Tokenization specification for Global Payments
 */
const tokenizationSpecification = {
    type: 'PAYMENT_GATEWAY',
    parameters: {
        'gateway': 'globalpayments',
        'gatewayMerchantId': ''
    }
};

/**
 * Base card payment method configuration
 */
const baseCardPaymentMethod = {
    type: 'CARD',
    parameters: {
        allowedAuthMethods: allowedCardAuthMethods,
        allowedCardNetworks: allowedCardNetworks
    }
};

/**
 * Card payment method with tokenization
 */
const cardPaymentMethod = Object.assign(
    {},
    baseCardPaymentMethod,
    {
        tokenizationSpecification: tokenizationSpecification
    }
);

/**
 * Google Pay client instance
 */
let paymentsClient = null;

/**
 * Load configuration from server
 */
async function loadConfig() {
    try {
        const response = await fetch('config.php');
        const data = await response.json();
        
        if (data.success && data.data.googlePayConfig) {
            config = { ...config, ...data.data.googlePayConfig };
            tokenizationSpecification.parameters.gatewayMerchantId = config.globalPaymentsMerchant;
        }
    } catch (error) {
        console.warn('Could not load Google Pay config from server, using defaults:', error);
    }
}

/**
 * Configure support for the Google Pay API
 */
function getGoogleIsReadyToPayRequest() {
    return Object.assign(
        {},
        baseRequest,
        {
            allowedPaymentMethods: [baseCardPaymentMethod]
        }
    );
}

/**
 * Configure Google Pay payment data request
 */
function getGooglePaymentDataRequest() {
    const paymentDataRequest = Object.assign({}, baseRequest);
    paymentDataRequest.allowedPaymentMethods = [cardPaymentMethod];
    paymentDataRequest.transactionInfo = getGoogleTransactionInfo();
    paymentDataRequest.merchantInfo = {
        merchantId: config.googleMerchant
    };
    return paymentDataRequest;
}

/**
 * Return an active PaymentsClient or initialize
 */
function getGooglePaymentsClient() {
    if (paymentsClient === null) {
        paymentsClient = new google.payments.api.PaymentsClient({
            environment: config.environment
        });
    }
    return paymentsClient;
}

/**
 * Initialize Google PaymentsClient after Google-hosted JavaScript has loaded
 */
async function onGooglePayLoaded() {
    if (!deviceSupported()) {
        showError('Google Pay requires HTTPS to function properly.');
        return false;
    }

    // Load configuration from server
    await loadConfig();

    const paymentsClient = getGooglePaymentsClient();
    try {
        const response = await paymentsClient.isReadyToPay(getGoogleIsReadyToPayRequest());
        if (response.result) {
            addGooglePayButton();
        } else {
            showError('Google Pay is not available on this device/browser.');
        }
    } catch (error) {
        console.error('Error checking Google Pay readiness:', error);
        showError('Error initializing Google Pay.');
    }
}

/**
 * Add a Google Pay purchase button
 */
function addGooglePayButton() {
    const container = document.querySelector('#google-pay-button');
    if (!container) return;

    const paymentsClient = getGooglePaymentsClient();
    const button = paymentsClient.createButton({
        buttonColor: config.buttonColor,
        onClick: onGooglePaymentButtonClicked
    });
    
    container.appendChild(button);
    updateStatus('Google Pay is ready. Click the button above to pay.');
}

/**
 * Provide Google Pay API with transaction information
 */
function getGoogleTransactionInfo() {
    // Get amount from form if available
    const amountInput = document.querySelector('#google-pay-amount');
    const amount = amountInput ? amountInput.value : config.amount;

    return {
        countryCode: config.countryCode,
        currencyCode: config.currencyCode,
        totalPriceStatus: 'FINAL',
        totalPrice: amount
    };
}

/**
 * Show Google Pay payment sheet when button is clicked
 */
async function onGooglePaymentButtonClicked() {
    const paymentDataRequest = getGooglePaymentDataRequest();
    paymentDataRequest.transactionInfo = getGoogleTransactionInfo();

    const paymentsClient = getGooglePaymentsClient();
    
    try {
        updateStatus('Processing payment...');
        const paymentData = await paymentsClient.loadPaymentData(paymentDataRequest);
        await processPayment(paymentData);
    } catch (error) {
        console.error('Payment failed:', error);
        showError('Payment was cancelled or failed.');
    }
}

/**
 * Process payment data returned by the Google Pay API
 */
async function processPayment(paymentData) {
    try {
        // Fix JSON encoding issues from Google Pay
        const paymentToken = JSON.stringify(
            JSON.parse(paymentData.paymentMethodData.tokenizationData.token)
        );

        const amountInput = document.querySelector('#google-pay-amount');
        const amount = amountInput ? amountInput.value : config.amount;

        const response = await fetch('process-google-pay.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                googlePayToken: paymentToken,
                amount: amount,
                currency: config.currencyCode
            })
        });

        const result = await response.json();
        
        if (result.success) {
            showSuccess(result.message);
            displayResult(result);
        } else {
            showError(result.message || 'Payment processing failed');
        }
    } catch (error) {
        console.error('Error processing payment:', error);
        showError('Error processing payment. Please try again.');
    }
}

/**
 * Update status message
 */
function updateStatus(message) {
    const statusElement = document.querySelector('#google-pay-status');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = 'gp-payment-status';
    }
}

/**
 * Show error message
 */
function showError(message) {
    const statusElement = document.querySelector('#google-pay-status');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = 'gp-payment-status gp-error';
    }
}

/**
 * Show success message
 */
function showSuccess(message) {
    const statusElement = document.querySelector('#google-pay-status');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = 'gp-payment-status gp-success';
    }
}

/**
 * Display payment result
 */
function displayResult(result) {
    const resultContainer = document.querySelector('#google-pay-result');
    const resultDisplay = document.querySelector('#google-pay-result-display');
    
    if (resultContainer && resultDisplay) {
        resultDisplay.textContent = JSON.stringify(result, null, 2);
        resultContainer.classList.remove('gp-hidden');
    }
}

/**
 * Check if device supports Google Pay (requires HTTPS)
 */
function deviceSupported() {
    return location.protocol === 'https:' || location.hostname === 'localhost';
}

// Initialize when tab becomes active
document.addEventListener('DOMContentLoaded', function() {
    // Listen for tab changes
    document.addEventListener('click', function(e) {
        if (e.target.matches('[data-tab="google-pay"]')) {
            // Small delay to ensure tab content is visible
            setTimeout(() => {
                if (typeof google !== 'undefined' && google.payments) {
                    onGooglePayLoaded();
                }
            }, 100);
        }
    });
});