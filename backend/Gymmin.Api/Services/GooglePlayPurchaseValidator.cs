using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;
using Gymmin.Api.Domain;
using Microsoft.Extensions.Options;

namespace Gymmin.Api.Services;

public interface IGooglePlayPurchaseValidator
{
    Task<GooglePlayPurchaseValidationResult> ValidateOneTimeProductAsync(
        string productId,
        string purchaseToken,
        CancellationToken cancellationToken);

    Task<GooglePlayConsumeResult> ConsumeOneTimeProductAsync(
        string productId,
        string purchaseToken,
        CancellationToken cancellationToken);

    Task<GooglePlayVoidedPurchasesResult> ListVoidedPurchasesAsync(
        DateTimeOffset startTime,
        DateTimeOffset endTime,
        string? pageToken,
        CancellationToken cancellationToken);
}

public sealed record GooglePlayPurchaseValidationResult(
    bool IsValid,
    bool IsRetryable,
    string ProductId,
    string? OrderId,
    string PurchaseState,
    int? ConsumptionState,
    int? AcknowledgementState,
    DateTimeOffset? PurchaseTime,
    string? RegionCode,
    string? RawResponseJson,
    string? ErrorCode,
    string? ErrorMessage,
    string? ObfuscatedExternalAccountId = null);

public sealed record GooglePlayConsumeResult(
    bool Success,
    bool IsRetryable,
    string? ErrorCode,
    string? ErrorMessage);

public sealed record GooglePlayVoidedPurchase(
    string PurchaseToken,
    string? OrderId,
    DateTimeOffset? PurchaseTime,
    DateTimeOffset VoidedTime,
    int VoidedSource,
    int VoidedReason,
    int VoidedQuantity);

public sealed record GooglePlayVoidedPurchasesResult(
    bool Success,
    bool IsRetryable,
    IReadOnlyList<GooglePlayVoidedPurchase> Purchases,
    string? NextPageToken,
    string? ErrorCode,
    string? ErrorMessage);

public sealed class GooglePlayPurchaseValidator : IGooglePlayPurchaseValidator
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
    };

    private readonly HttpClient _httpClient;
    private readonly GooglePlayOptions _options;
    private readonly ILogger<GooglePlayPurchaseValidator> _logger;
    private string? _cachedAccessToken;
    private DateTimeOffset _cachedAccessTokenExpiresAt;

    public GooglePlayPurchaseValidator(
        HttpClient httpClient,
        IOptions<GooglePlayOptions> options,
        ILogger<GooglePlayPurchaseValidator> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<GooglePlayPurchaseValidationResult> ValidateOneTimeProductAsync(
        string productId,
        string purchaseToken,
        CancellationToken cancellationToken)
    {
        if (!_options.Enabled || !_options.ValidatePurchases)
        {
            return Invalid(productId, "google_play_disabled", "Google Play purchase validation is not configured.");
        }

        if (string.IsNullOrWhiteSpace(_options.PackageName))
        {
            return Invalid(productId, "google_play_package_missing", "Google Play package name is not configured.");
        }

        try
        {
            var accessToken = await GetAccessTokenAsync(cancellationToken);
            using var request = new HttpRequestMessage(
                HttpMethod.Get,
                $"https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{Uri.EscapeDataString(_options.PackageName)}/purchases/products/{Uri.EscapeDataString(productId)}/tokens/{Uri.EscapeDataString(purchaseToken)}");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            using var response = await _httpClient.SendAsync(request, cancellationToken);
            var responseText = await response.Content.ReadAsStringAsync(cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var retryable = (int)response.StatusCode is >= 500 or 408 or 429;
                return new GooglePlayPurchaseValidationResult(
                    false,
                    retryable,
                    productId,
                    null,
                    GooglePlayPurchaseStates.Unknown,
                    null,
                    null,
                    null,
                    null,
                    SanitizeRawResponse(responseText),
                    $"google_play_{(int)response.StatusCode}",
                    "Google Play purchase validation failed.");
            }

            using var document = JsonDocument.Parse(responseText);
            var root = document.RootElement;
            var state = root.TryGetProperty("purchaseState", out var purchaseStateElement)
                ? purchaseStateElement.GetInt32()
                : -1;
            var purchaseState = state switch
            {
                0 => GooglePlayPurchaseStates.Purchased,
                1 => GooglePlayPurchaseStates.Canceled,
                2 => GooglePlayPurchaseStates.Pending,
                _ => GooglePlayPurchaseStates.Unknown
            };
            var orderId = root.TryGetProperty("orderId", out var orderIdElement) ? orderIdElement.GetString() : null;
            var regionCode = root.TryGetProperty("regionCode", out var regionElement) ? regionElement.GetString() : null;
            var obfuscatedExternalAccountId = root.TryGetProperty("obfuscatedExternalAccountId", out var accountElement)
                ? accountElement.GetString()
                : null;
            var consumptionState = root.TryGetProperty("consumptionState", out var consumptionElement) ? consumptionElement.GetInt32() : null as int?;
            var acknowledgementState = root.TryGetProperty("acknowledgementState", out var ackElement) ? ackElement.GetInt32() : null as int?;
            DateTimeOffset? purchaseTime = null;
            if (root.TryGetProperty("purchaseTimeMillis", out var purchaseTimeElement) &&
                long.TryParse(purchaseTimeElement.GetString(), out var millis))
            {
                purchaseTime = DateTimeOffset.FromUnixTimeMilliseconds(millis);
            }

            return new GooglePlayPurchaseValidationResult(
                purchaseState == GooglePlayPurchaseStates.Purchased,
                false,
                productId,
                orderId,
                purchaseState,
                consumptionState,
                acknowledgementState,
                purchaseTime,
                regionCode,
                SanitizeRawResponse(responseText),
                purchaseState == GooglePlayPurchaseStates.Purchased ? null : "google_play_purchase_not_purchased",
                purchaseState == GooglePlayPurchaseStates.Purchased ? null : $"Google Play purchase state is {purchaseState}.",
                obfuscatedExternalAccountId);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception error)
        {
            _logger.LogWarning(error, "Google Play purchase validation failed for product {ProductId}.", productId);
            return new GooglePlayPurchaseValidationResult(
                false,
                true,
                productId,
                null,
                GooglePlayPurchaseStates.Unknown,
                null,
                null,
                null,
                null,
                null,
                "google_play_validation_unavailable",
                "Google Play purchase validation is temporarily unavailable.");
        }
    }

    public async Task<GooglePlayConsumeResult> ConsumeOneTimeProductAsync(
        string productId,
        string purchaseToken,
        CancellationToken cancellationToken)
    {
        if (!_options.Enabled || !_options.ConsumePurchases)
        {
            return new GooglePlayConsumeResult(true, false, null, null);
        }

        try
        {
            var accessToken = await GetAccessTokenAsync(cancellationToken);
            using var request = new HttpRequestMessage(
                HttpMethod.Post,
                $"https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{Uri.EscapeDataString(_options.PackageName)}/purchases/products/{Uri.EscapeDataString(productId)}/tokens/{Uri.EscapeDataString(purchaseToken)}:consume");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

            using var response = await _httpClient.SendAsync(request, cancellationToken);
            if (response.IsSuccessStatusCode)
            {
                return new GooglePlayConsumeResult(true, false, null, null);
            }

            var retryable = (int)response.StatusCode is >= 500 or 408 or 429;
            return new GooglePlayConsumeResult(false, retryable, $"google_play_consume_{(int)response.StatusCode}", "Google Play purchase consume failed.");
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception error)
        {
            _logger.LogWarning(error, "Google Play purchase consume failed for product {ProductId}.", productId);
            return new GooglePlayConsumeResult(false, true, "google_play_consume_unavailable", "Google Play purchase consume is temporarily unavailable.");
        }
    }

    public async Task<GooglePlayVoidedPurchasesResult> ListVoidedPurchasesAsync(
        DateTimeOffset startTime,
        DateTimeOffset endTime,
        string? pageToken,
        CancellationToken cancellationToken)
    {
        if (!_options.Enabled || !_options.VoidedPurchasesEnabled)
        {
            return new(false, false, [], null, "voided_purchases_disabled", "Google Play voided purchases are not enabled.");
        }

        try
        {
            var accessToken = await GetAccessTokenAsync(cancellationToken);
            var query = string.IsNullOrWhiteSpace(pageToken)
                ? $"startTime={startTime.ToUnixTimeMilliseconds()}&endTime={endTime.ToUnixTimeMilliseconds()}&pageSelection.maxResults=1000&type=0&includeQuantityBasedPartialRefund=true"
                : $"pageSelection.token={Uri.EscapeDataString(pageToken)}&pageSelection.maxResults=1000&type=0&includeQuantityBasedPartialRefund=true";
            using var request = new HttpRequestMessage(
                HttpMethod.Get,
                $"https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{Uri.EscapeDataString(_options.PackageName)}/purchases/voidedpurchases?{query}");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
            using var response = await _httpClient.SendAsync(request, cancellationToken);
            var responseText = await response.Content.ReadAsStringAsync(cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var retryable = (int)response.StatusCode is >= 500 or 408 or 409 or 429;
                return new(false, retryable, [], null, $"google_play_voided_{(int)response.StatusCode}", "Google Play voided purchases request failed.");
            }

            using var document = JsonDocument.Parse(responseText);
            var root = document.RootElement;
            var purchases = new List<GooglePlayVoidedPurchase>();
            if (root.TryGetProperty("voidedPurchases", out var items) && items.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in items.EnumerateArray())
                {
                    var purchaseToken = item.TryGetProperty("purchaseToken", out var tokenElement) ? tokenElement.GetString() : null;
                    if (string.IsNullOrWhiteSpace(purchaseToken) || purchaseToken.Length > EfAiCreditPurchaseService.MaxPurchaseTokenLength) continue;
                    var voidedTime = ParseUnixMilliseconds(item, "voidedTimeMillis");
                    if (voidedTime is null) continue;
                    purchases.Add(new GooglePlayVoidedPurchase(
                        purchaseToken,
                        item.TryGetProperty("orderId", out var orderElement) ? orderElement.GetString() : null,
                        ParseUnixMilliseconds(item, "purchaseTimeMillis"),
                        voidedTime.Value,
                        item.TryGetProperty("voidedSource", out var sourceElement) ? sourceElement.GetInt32() : 0,
                        item.TryGetProperty("voidedReason", out var reasonElement) ? reasonElement.GetInt32() : 0,
                        item.TryGetProperty("voidedQuantity", out var quantityElement) ? Math.Max(1, quantityElement.GetInt32()) : 1));
                }
            }

            var nextPageToken = root.TryGetProperty("tokenPagination", out var pagination) &&
                pagination.TryGetProperty("nextPageToken", out var nextElement)
                ? nextElement.GetString()
                : null;
            return new(true, false, purchases, nextPageToken, null, null);
        }
        catch (OperationCanceledException) { throw; }
        catch (Exception error)
        {
            _logger.LogWarning(error, "Google Play voided purchases request failed.");
            return new(false, true, [], null, "google_play_voided_unavailable", "Google Play voided purchases are temporarily unavailable.");
        }
    }

    private async Task<string> GetAccessTokenAsync(CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(_cachedAccessToken) &&
            _cachedAccessTokenExpiresAt > DateTimeOffset.UtcNow.AddMinutes(2))
        {
            return _cachedAccessToken;
        }

        var credentials = LoadServiceAccountCredentials();
        var now = DateTimeOffset.UtcNow;
        var assertion = CreateJwtAssertion(credentials, now);

        using var response = await _httpClient.PostAsync(
            credentials.TokenUri,
            new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["grant_type"] = "urn:ietf:params:oauth:grant-type:jwt-bearer",
                ["assertion"] = assertion
            }),
            cancellationToken);
        var responseText = await response.Content.ReadAsStringAsync(cancellationToken);
        response.EnsureSuccessStatusCode();

        using var document = JsonDocument.Parse(responseText);
        _cachedAccessToken = document.RootElement.GetProperty("access_token").GetString();
        var expiresIn = document.RootElement.TryGetProperty("expires_in", out var expiresElement)
            ? expiresElement.GetInt32()
            : 3600;
        _cachedAccessTokenExpiresAt = now.AddSeconds(expiresIn);
        return _cachedAccessToken ?? throw new InvalidOperationException("Google OAuth token response did not include access_token.");
    }

    private GoogleServiceAccountCredentials LoadServiceAccountCredentials()
    {
        var json = "";
        if (!string.IsNullOrWhiteSpace(_options.ServiceAccountJsonBase64))
        {
            json = Encoding.UTF8.GetString(Convert.FromBase64String(_options.ServiceAccountJsonBase64));
        }
        else if (!string.IsNullOrWhiteSpace(_options.ServiceAccountJsonPath) && File.Exists(_options.ServiceAccountJsonPath))
        {
            json = File.ReadAllText(_options.ServiceAccountJsonPath);
        }

        if (string.IsNullOrWhiteSpace(json))
        {
            throw new InvalidOperationException("Google Play service account credentials are not configured.");
        }

        using var document = JsonDocument.Parse(json);
        var root = document.RootElement;
        return new GoogleServiceAccountCredentials(
            root.GetProperty("client_email").GetString() ?? throw new InvalidOperationException("Google service account client_email is missing."),
            root.GetProperty("private_key").GetString() ?? throw new InvalidOperationException("Google service account private_key is missing."),
            root.TryGetProperty("token_uri", out var tokenUri) ? tokenUri.GetString() ?? "https://oauth2.googleapis.com/token" : "https://oauth2.googleapis.com/token");
    }

    private static string CreateJwtAssertion(GoogleServiceAccountCredentials credentials, DateTimeOffset now)
    {
        var header = Base64Url(JsonSerializer.SerializeToUtf8Bytes(new { alg = "RS256", typ = "JWT" }));
        var payload = Base64Url(JsonSerializer.SerializeToUtf8Bytes(new
        {
            iss = credentials.ClientEmail,
            scope = "https://www.googleapis.com/auth/androidpublisher",
            aud = credentials.TokenUri,
            iat = now.ToUnixTimeSeconds(),
            exp = now.AddMinutes(55).ToUnixTimeSeconds()
        }, JsonOptions));
        var signingInput = $"{header}.{payload}";
        using var rsa = RSA.Create();
        rsa.ImportFromPem(credentials.PrivateKey);
        var signature = rsa.SignData(Encoding.ASCII.GetBytes(signingInput), HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
        return $"{signingInput}.{Base64Url(signature)}";
    }

    private static string Base64Url(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static GooglePlayPurchaseValidationResult Invalid(string productId, string code, string message) =>
        new(false, false, productId, null, GooglePlayPurchaseStates.Unknown, null, null, null, null, null, code, message);

    private static string? SanitizeRawResponse(string? responseText)
    {
        if (string.IsNullOrWhiteSpace(responseText))
        {
            return null;
        }

        try
        {
            var root = JsonNode.Parse(responseText);
            if (root is not null)
            {
                RedactSensitiveFields(root);
                var sanitized = root.ToJsonString(JsonOptions);
                return sanitized.Length > 4000 ? sanitized[..4000] : sanitized;
            }
        }
        catch (JsonException)
        {
            // Non-JSON Google errors are retained only as a bounded diagnostic message.
        }

        return responseText.Length > 4000 ? responseText[..4000] : responseText;
    }

    private static void RedactSensitiveFields(JsonNode node)
    {
        if (node is JsonObject jsonObject)
        {
            foreach (var property in jsonObject.ToList())
            {
                if (property.Key.Equals("purchaseToken", StringComparison.OrdinalIgnoreCase) ||
                    property.Key.Equals("developerPayload", StringComparison.OrdinalIgnoreCase))
                {
                    jsonObject[property.Key] = "[redacted]";
                }
                else if (property.Value is not null)
                {
                    RedactSensitiveFields(property.Value);
                }
            }
        }
        else if (node is JsonArray jsonArray)
        {
            foreach (var item in jsonArray)
            {
                if (item is not null) RedactSensitiveFields(item);
            }
        }
    }

    private static DateTimeOffset? ParseUnixMilliseconds(JsonElement item, string propertyName) =>
        item.TryGetProperty(propertyName, out var element) &&
        long.TryParse(element.GetString(), out var value) &&
        value >= 0
            ? DateTimeOffset.FromUnixTimeMilliseconds(value)
            : null;

    private sealed record GoogleServiceAccountCredentials(
        string ClientEmail,
        string PrivateKey,
        string TokenUri);
}
