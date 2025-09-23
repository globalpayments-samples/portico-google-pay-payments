using GlobalPayments.Api;
using GlobalPayments.Api.Entities;
using GlobalPayments.Api.PaymentMethods;
using GlobalPayments.Api.Entities.Enums;
using GlobalPayments.Api.Utils.Logging;
using dotenv.net;
using System.Text.Json;

namespace CardPaymentSample;

/// <summary>
/// Card Payment Processing Application
/// 
/// This application demonstrates card payment processing using the Global Payments SDK.
/// It provides endpoints for configuration and payment processing, handling tokenized
/// card data to ensure secure payment processing.
/// </summary>
public class Program
{
    public static void Main(string[] args)
    {
        // Load environment variables from .env file
        DotEnv.Load();

        var builder = WebApplication.CreateBuilder(args);
        
        var app = builder.Build();

        // Configure static file serving for the payment form
        app.UseDefaultFiles();
        app.UseStaticFiles();
        
        // Configure the SDK on startup
        ConfigureGlobalPaymentsSDK();

        ConfigureEndpoints(app);
        
        var port = System.Environment.GetEnvironmentVariable("PORT") ?? "8000";
        app.Urls.Add($"http://0.0.0.0:{port}");
        
        app.Run();
    }

    /// <summary>
    /// Configures the Global Payments SDK with necessary credentials and settings.
    /// This must be called before processing any payments.
    /// </summary>
    private static void ConfigureGlobalPaymentsSDK()
    {
        var config = new PorticoConfig
        {
            SecretApiKey = System.Environment.GetEnvironmentVariable("SECRET_API_KEY"),
            DeveloperId = "000000",
            VersionNumber = "0000",
            ServiceUrl = "https://cert.api2.heartlandportico.com"
        };

        bool.TryParse(System.Environment.GetEnvironmentVariable("ENABLE_LOGGING"), out var enableLogging);
        if (enableLogging == true)
        {
            config.EnableLogging = true;
            config.RequestLogger = new RequestFileLogger(@"log.txt");
        }

        ServicesContainer.ConfigureService(config);
    }

    /// <summary>
    /// Configures the application's HTTP endpoints for payment processing.
    /// </summary>
    /// <param name="app">The web application to configure</param>
    private static void ConfigureEndpoints(WebApplication app)
    {
        // Configure HTTP endpoints
        app.MapGet("/config", () => Results.Ok(new
        { 
            success = true,
            data = new {
                publicApiKey = System.Environment.GetEnvironmentVariable("PUBLIC_API_KEY"),
                merchantInfo = new {
                    merchantName = System.Environment.GetEnvironmentVariable("MERCHANT_NAME") ?? "Test Merchant",
                    merchantId = System.Environment.GetEnvironmentVariable("MERCHANT_ID") ?? ""
                },
                googlePayConfig = new {
                    googleMerchantId = System.Environment.GetEnvironmentVariable("GOOGLE_PAY_MERCHANT_ID") ?? "12345678901234567890",
                    environment = System.Environment.GetEnvironmentVariable("ENVIRONMENT") == "PRODUCTION" ? "PRODUCTION" : "TEST",
                    countryCode = System.Environment.GetEnvironmentVariable("GOOGLE_PAY_COUNTRY_CODE") ?? "GB",
                    currencyCode = System.Environment.GetEnvironmentVariable("GOOGLE_PAY_CURRENCY_CODE") ?? "GBP",
                    buttonColor = System.Environment.GetEnvironmentVariable("GOOGLE_PAY_BUTTON_COLOR") ?? "black"
                }
            }
        }));

        ConfigurePaymentEndpoint(app);
        ConfigureGooglePayEndpoint(app);
    }

    /// <summary>
    /// Sanitizes postal code input by removing invalid characters.
    /// </summary>
    /// <param name="postalCode">The postal code to sanitize. Can be null.</param>
    /// <returns>
    /// A sanitized postal code containing only alphanumeric characters and hyphens,
    /// limited to 10 characters. Returns empty string if input is null or empty.
    /// </returns>
    private static string SanitizePostalCode(string postalCode)
    {
        if (string.IsNullOrEmpty(postalCode)) return string.Empty;
        
        // Remove any characters that aren't alphanumeric or hyphen
        var sanitized = new string(postalCode.Where(c => char.IsLetterOrDigit(c) || c == '-').ToArray());
        
        // Limit length to 10 characters
        return sanitized.Length > 10 ? sanitized[..10] : sanitized;
    }

    /// <summary>
    /// Configures the payment processing endpoint that handles card transactions.
    /// </summary>
    /// <param name="app">The web application to configure</param>
    private static void ConfigurePaymentEndpoint(WebApplication app)
    {
        app.MapPost("/process-payment", async (HttpContext context) =>
        {
            // Parse form data from the request
            var form = await context.Request.ReadFormAsync();
            var billingZip = form["billing_zip"].ToString();
            var token = form["payment_token"].ToString();
            var amountStr = form["amount"].ToString();

            // Validate required fields are present
            if (string.IsNullOrEmpty(token) || string.IsNullOrEmpty(billingZip) || string.IsNullOrEmpty(amountStr))
            {
                return Results.BadRequest(new {
                    success = false,
                    message = "Payment processing failed",
                    error = new {
                        code = "VALIDATION_ERROR",
                        details = "Missing required fields"
                    }
                });
            }

            // Validate and parse amount
            if (!decimal.TryParse(amountStr, out var amount) || amount <= 0)
            {
                return Results.BadRequest(new {
                    success = false,
                    message = "Payment processing failed",
                    error = new {
                        code = "VALIDATION_ERROR",
                        details = "Amount must be a positive number"
                    }
                });
            }

            // Initialize payment data using tokenized card information
            var card = new CreditCardData
            {
                Token = token
            };

            // Create billing address for AVS verification
            var address = new Address
            {
                PostalCode = SanitizePostalCode(billingZip)
            };

            try
            {
                // Process the payment transaction using the provided amount
                var response = card.Charge(amount)
                    .WithAllowDuplicates(true)
                    .WithCurrency("USD")
                    .WithAddress(address)
                    .Execute();

                // Verify transaction was successful
                if (response.ResponseCode != "00")
                {
                    return Results.BadRequest(new {
                        success = false,
                        message = "Payment processing failed",
                        error = new {
                            code = "PAYMENT_DECLINED",
                            details = response.ResponseMessage
                        }
                    });
                }

                // Return success response with transaction ID
                return Results.Ok(new
                {
                    success = true,
                    message = $"Payment successful! Transaction ID: {response.TransactionId}",
                    data = new {
                        transactionId = response.TransactionId
                    }
                });
            } 
            catch (ApiException ex)
            {
                // Handle payment processing errors
                return Results.BadRequest(new {
                    success = false,
                    message = "Payment processing failed",
                    error = new {
                        code = "API_ERROR",
                        details = ex.Message
                    }
                });
            }
        });
    }

    /// <summary>
    /// Configures the Google Pay payment processing endpoint that handles Google Pay tokens.
    /// </summary>
    /// <param name="app">The web application to configure</param>
    private static void ConfigureGooglePayEndpoint(WebApplication app)
    {
        app.MapPost("/process-google-pay", async (HttpContext context) =>
        {
            try
            {
                // Read JSON payload from request body
                var body = await context.Request.ReadFromJsonAsync<JsonElement>();
                
                // Extract required fields from JSON payload
                if (!body.TryGetProperty("token", out var tokenElement) || 
                    !body.TryGetProperty("amount", out var amountElement))
                {
                    return Results.BadRequest(new {
                        success = false,
                        message = "Google Pay token and amount are required",
                        error = new {
                            code = "VALIDATION_ERROR",
                            details = "Missing required fields: token, amount"
                        }
                    });
                }

                var googlePayToken = tokenElement.GetString();
                var amountStr = amountElement.GetString();

                // Validate and parse amount
                if (!decimal.TryParse(amountStr, out var amount) || amount <= 0)
                {
                    return Results.BadRequest(new {
                        success = false,
                        message = "Google Pay payment processing failed",
                        error = new {
                            code = "VALIDATION_ERROR",
                            details = "Amount must be a positive number"
                        }
                    });
                }

                // Initialize credit card with Google Pay token
                var card = new CreditCardData
                {
                    Token = googlePayToken,
                    MobileType = MobilePaymentMethodType.GOOGLEPAY,
                    PaymentSource = PaymentDataSourceType.GOOGLEPAYWEB
                };

                // Add billing address if provided
                Address address = null;
                if (body.TryGetProperty("billing_zip", out var billingZipElement))
                {
                    var billingZip = billingZipElement.GetString();
                    if (!string.IsNullOrEmpty(billingZip))
                    {
                        address = new Address
                        {
                            PostalCode = SanitizePostalCode(billingZip)
                        };
                    }
                }

                // Process the Google Pay payment transaction
                var chargeBuilder = card.Charge(amount)
                    .WithAllowDuplicates(true)
                    .WithCurrency("USD");

                if (address != null)
                {
                    chargeBuilder = chargeBuilder.WithAddress(address);
                }

                var response = chargeBuilder.Execute();

                // Verify transaction was successful
                if (response.ResponseCode != "00")
                {
                    return Results.BadRequest(new {
                        success = false,
                        message = "Google Pay payment was declined",
                        error = new {
                            code = "PAYMENT_DECLINED",
                            details = response.ResponseMessage
                        }
                    });
                }

                // Return success response with transaction details
                return Results.Ok(new
                {
                    success = true,
                    message = "Google Pay payment processed successfully",
                    data = new {
                        transactionId = response.TransactionId,
                        amount = amount,
                        currency = "USD",
                        paymentMethod = "Google Pay"
                    }
                });
            }
            catch (ApiException ex)
            {
                // Handle payment processing errors
                var errorMessage = $"API Error: {ex.Message}";
                var statusCode = 400;

                return Results.Json(new {
                    success = false,
                    message = errorMessage,
                    error = ex.Message
                }, statusCode: statusCode);
            }
            catch (Exception ex)
            {
                // Handle unexpected errors
                Console.WriteLine($"Google Pay processing error: {ex.Message}");
                
                return Results.Json(new {
                    success = false,
                    message = "Google Pay payment processing failed",
                    error = ex.Message
                }, statusCode: 500);
            }
        });
    }
}
