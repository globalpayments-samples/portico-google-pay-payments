<?php

declare(strict_types=1);

/**
 * Configuration Endpoint
 *
 * This script provides configuration information for the client-side SDK,
 * including the public API key needed for tokenization.
 *
 * PHP version 7.4 or higher
 *
 * @category  Configuration
 * @package   GlobalPayments_Sample
 * @author    Global Payments
 * @license   MIT License
 * @link      https://github.com/globalpayments
 */

require_once 'vendor/autoload.php';

use Dotenv\Dotenv;

try {
    // Load environment variables from .env file
    $dotenv = Dotenv::createImmutable(__DIR__);
    $dotenv->load();

    // Set response content type to JSON
    header('Content-Type: application/json');

    // Return configuration data in JSON response
    echo json_encode([
        'success' => true,
        'data' => [
            'publicApiKey' => $_ENV['PUBLIC_API_KEY'] ?? null,
            'googlePayConfig' => [
                'googleMerchant' => $_ENV['GOOGLE_PAY_MERCHANT_ID'] ?? '12345678901234567890',
                'globalPaymentsMerchant' => $_ENV['GP_API_MERCHANT_ID'] ?? 'merchant_id',
                'environment' => $_ENV['GP_API_ENVIRONMENT'] === 'PRODUCTION' ? 'PRODUCTION' : 'TEST',
                'countryCode' => $_ENV['GOOGLE_PAY_COUNTRY_CODE'] ?? 'GB',
                'currencyCode' => $_ENV['GOOGLE_PAY_CURRENCY_CODE'] ?? 'GBP',
                'buttonColor' => $_ENV['GOOGLE_PAY_BUTTON_COLOR'] ?? 'black'
            ]
        ],
    ]);
} catch (Exception $e) {
    // Handle configuration errors
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error loading configuration: ' . $e->getMessage()
    ]);
}
