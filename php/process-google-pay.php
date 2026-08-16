<?php

declare(strict_types=1);

/**
 * Google Pay Payment Processing Script
 *
 * This script demonstrates Google Pay payment processing using the Global Payments GP-API.
 * It handles encrypted mobile payment tokens from Google Pay and processes them
 * securely through the GP-API.
 *
 * PHP version 7.4 or higher
 *
 * @category  Payment_Processing
 * @package   GlobalPayments_Sample
 * @author    Global Payments
 * @license   MIT License
 * @link      https://github.com/globalpayments
 */

require_once 'vendor/autoload.php';

use Dotenv\Dotenv;
use GlobalPayments\Api\Entities\Enums\EncyptedMobileType;
use GlobalPayments\Api\Entities\Enums\Environment;
use GlobalPayments\Api\Entities\Enums\Channel;
use GlobalPayments\Api\Entities\Enums\TransactionModifier;
use GlobalPayments\Api\Entities\Exceptions\ApiException;
use GlobalPayments\Api\PaymentMethods\CreditCardData;
use GlobalPayments\Api\ServiceConfigs\Gateways\PorticoConfig;
use GlobalPayments\Api\ServicesContainer;
use GlobalPayments\Api\Entities\Enums\PaymentDataSourceType;
use GlobalPayments\Api\Utils\Logging\Logger;
use GlobalPayments\Api\Utils\Logging\SampleRequestLogger;

ini_set('display_errors', '0');

/**
 * Configure the GP-API SDK
 *
 * Sets up the Global Payments GP-API SDK with necessary credentials and settings
 * loaded from environment variables.
 *
 * @return void
 */
function configureSdk(): void
{
    $dotenv = Dotenv::createImmutable(__DIR__);
    $dotenv->load();

    $config = new PorticoConfig();
    $config->secretApiKey = $_ENV['SECRET_API_KEY'];
    $config->serviceUrl = 'https://cert.api2.heartlandportico.com';
    
    // Add logging if enabled
    if (isset($_ENV['ENABLE_LOGGING']) && $_ENV['ENABLE_LOGGING'] === 'true') {
        $config->enableLogging = true;
        $config->requestLogger = new SampleRequestLogger(new Logger("logs"));
    }

    ServicesContainer::configureService($config);
}

/**
 * Sanitize and validate currency code
 *
 * @param string|null $currency The currency code to validate
 *
 * @return string Valid currency code (defaults to GBP)
 */
function sanitizeCurrency(?string $currency): string
{
    $allowedCurrencies = ['USD', 'EUR', 'GBP'];
    $currency = strtoupper($currency ?? 'GBP');
    
    return in_array($currency, $allowedCurrencies, true) ? $currency : 'GBP';
}

/**
 * Validate and sanitize amount
 *
 * @param string|float|null $amount The amount to validate
 *
 * @return string Valid amount string
 * @throws ApiException If amount is invalid
 */
function sanitizeAmount($amount): string
{
    if ($amount === null) {
        throw new ApiException('Amount is required');
    }

    $amount = floatval($amount);
    
    if ($amount <= 0) {
        throw new ApiException('Amount must be greater than 0');
    }
    
    if ($amount > 999999.99) {
        throw new ApiException('Amount exceeds maximum limit');
    }

    return number_format($amount, 2, '.', '');
}

// Set response content type
header('Content-Type: application/json');

// Initialize SDK configuration
try {
    configureSdk();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Configuration error',
        'error' => [
            'code' => 'CONFIG_ERROR',
            'details' => 'Unable to initialize payment processor'
        ]
    ]);
    exit;
}

try {
    $requestData = json_decode(file_get_contents('php://input'));

    // Validate required POST parameters
    if (!isset($requestData->token)) {
        throw new ApiException('Google Pay token is required');
    }

    if (!isset($requestData->amount)) {
        throw new ApiException('Amount is required');
    }

    // Process and validate input parameters
    $googlePayToken = $requestData->token;
    $amount = sanitizeAmount($requestData->amount);
    $currency = sanitizeCurrency($requestData->currency ?? 'GBP');

    // Validate Google Pay token format
    $tokenData = json_decode($googlePayToken, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new ApiException('Invalid Google Pay token format');
    }

    // Initialize credit card with Google Pay token
    $card = new CreditCardData();
    $card->token = $googlePayToken;
    $card->mobileType = EncyptedMobileType::GOOGLE_PAY;
    $card->paymentSource = PaymentDataSourceType::GOOGLEPAYWEB;

    // Step 1: Authorize the full amount
    $authResponse = $card->authorize($amount)
        ->withCurrency($currency)
        ->execute();

    // Verify authorization was successful
    if ($authResponse->responseCode !== '00' && $authResponse->responseCode !== 'SUCCESS') {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Authorization was declined',
            'error' => [
                'code' => 'AUTH_DECLINED',
                'details' => $authResponse->responseMessage ?? 'Authorization declined by processor'
            ]
        ]);
        exit;
    }

    // Step 2: Capture a reduced amount (simulating partial capture)
    $captureAmount = number_format(round(floatval($amount) * 0.75, 2), 2, '.', '');

    $captureResponse = $authResponse->capture($captureAmount)
        ->withCurrency($currency)
        ->execute();

    if ($captureResponse->responseCode !== '00' && $captureResponse->responseCode !== 'SUCCESS') {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Capture failed',
            'error' => [
                'code' => 'CAPTURE_FAILED',
                'details' => $captureResponse->responseMessage ?? 'Capture failed by processor'
            ]
        ]);
        exit;
    }

    // Return successful response with both transaction details
    echo json_encode([
        'success' => true,
        'message' => sprintf(
            'Payment successful! Transaction ID: %s',
            $captureResponse->transactionId
        ),
        'data' => [
            'authTransactionId' => $authResponse->transactionId,
            'captureTransactionId' => $captureResponse->transactionId,
            'authorizedAmount' => $amount,
            'capturedAmount' => $captureAmount,
            'currency' => $currency,
            'status' => $captureResponse->responseMessage ?? 'SUCCESS',
            'responseCode' => $captureResponse->responseCode,
            'authCode' => $authResponse->authorizationCode ?? null,
            'timestamp' => date('c')
        ]
    ]);

} catch (ApiException $e) {
    // Handle payment processing errors
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Payment processing failed',
        'error' => [
            'code' => 'API_ERROR',
            'details' => $e->getMessage()
        ]
    ]);
} catch (Exception $e) {
    // Handle unexpected errors
    error_log('Google Pay processing error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'An unexpected error occurred',
        'error' => [
            'code' => 'SYSTEM_ERROR',
            'details' => 'Please try again later'
        ]
    ]);
}