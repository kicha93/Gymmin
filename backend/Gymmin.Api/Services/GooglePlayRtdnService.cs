using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Google.Apis.Auth;
using Gymmin.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Gymmin.Api.Services;

public interface IPubSubOidcTokenValidator
{
    Task<bool> ValidateAsync(string token, string audience, string expectedEmail, CancellationToken cancellationToken);
}

public sealed class GooglePubSubOidcTokenValidator : IPubSubOidcTokenValidator
{
    public async Task<bool> ValidateAsync(string token, string audience, string expectedEmail, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        try
        {
            var payload = await GoogleJsonWebSignature.ValidateAsync(token, new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = [audience]
            });
            return payload.EmailVerified && string.Equals(payload.Email, expectedEmail, StringComparison.OrdinalIgnoreCase);
        }
        catch (InvalidJwtException)
        {
            return false;
        }
    }
}

public sealed record PubSubPushEnvelope(
    [property: JsonPropertyName("message")] PubSubPushMessage? Message,
    [property: JsonPropertyName("subscription")] string? Subscription);

public sealed record PubSubPushMessage(
    [property: JsonPropertyName("data")] string? Data,
    [property: JsonPropertyName("messageId")] string? MessageId,
    [property: JsonPropertyName("publishTime")] DateTimeOffset? PublishTime);

public sealed class GooglePlayRtdnService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IPubSubOidcTokenValidator _oidc;
    private readonly IGooglePlayPurchaseValidator _purchaseValidator;
    private readonly GooglePlayOptions _options;

    public GooglePlayRtdnService(
        IServiceScopeFactory scopeFactory,
        IPubSubOidcTokenValidator oidc,
        IGooglePlayPurchaseValidator purchaseValidator,
        IOptions<GooglePlayOptions> options)
    {
        _scopeFactory = scopeFactory;
        _oidc = oidc;
        _purchaseValidator = purchaseValidator;
        _options = options.Value;
    }

    public async Task<GooglePlayRtdnResult> ReceiveAsync(string? authorization, PubSubPushEnvelope? envelope, CancellationToken cancellationToken)
    {
        if (!_options.Enabled || !_options.RtdnEnabled) return new(404, "rtdn_disabled");
        if (!TryReadBearer(authorization, out var token) ||
            !await _oidc.ValidateAsync(token, _options.RtdnAudience, _options.RtdnServiceAccountEmail, cancellationToken))
            return new(401, "invalid_pubsub_identity");

        var message = envelope?.Message;
        if (message is null || string.IsNullOrWhiteSpace(message.MessageId) || message.MessageId.Length > 200 || string.IsNullOrWhiteSpace(message.Data))
            return new(400, "invalid_pubsub_envelope");

        byte[] decoded;
        try { decoded = Convert.FromBase64String(message.Data); }
        catch (FormatException) { return new(400, "invalid_pubsub_data"); }
        if (decoded.Length is 0 or > 32_768) return new(400, "invalid_pubsub_data");

        GooglePlayDeveloperNotification? notification;
        try { notification = JsonSerializer.Deserialize<GooglePlayDeveloperNotification>(decoded, JsonOptions); }
        catch (JsonException) { return new(400, "invalid_rtdn_payload"); }
        if (notification is null || !string.Equals(notification.PackageName, _options.PackageName, StringComparison.Ordinal))
            return new(400, "unexpected_package");

        await using var scope = _scopeFactory.CreateAsyncScope();
        var dbFactory = scope.ServiceProvider.GetRequiredService<IDbContextFactory<GymminDbContext>>();
        await using var db = await dbFactory.CreateDbContextAsync(cancellationToken);
        if (await db.GooglePlayRtdnEvents.AnyAsync(item => item.MessageId == message.MessageId, cancellationToken))
            return new(204, null);

        var oneTime = notification.OneTimeProductNotification;
        var tokenHash = string.IsNullOrWhiteSpace(oneTime?.PurchaseToken) ? null : Hash(oneTime.PurchaseToken);
        var status = notification.TestNotification is not null ? "test" : oneTime is null ? "ignored" : "unmatched";
        string? errorCode = null;

        if (oneTime is not null && !string.IsNullOrWhiteSpace(oneTime.PurchaseToken) && !string.IsNullOrWhiteSpace(oneTime.Sku))
        {
            var purchase = await db.AiCreditPurchases.SingleOrDefaultAsync(item => item.PurchaseTokenHash == tokenHash, cancellationToken);
            if (purchase is not null)
            {
                var validation = await _purchaseValidator.ValidateOneTimeProductAsync(oneTime.Sku, oneTime.PurchaseToken, cancellationToken);
                purchase.PurchaseState = validation.PurchaseState;
                purchase.UpdatedAt = DateTimeOffset.UtcNow;
                purchase.VerifiedAt = DateTimeOffset.UtcNow;
                status = "reconciled";
                errorCode = validation.ErrorCode;
            }
        }

        var now = DateTimeOffset.UtcNow;
        db.GooglePlayRtdnEvents.Add(new GooglePlayRtdnEventEntity
        {
            MessageId = message.MessageId,
            PackageName = notification.PackageName,
            NotificationKind = notification.TestNotification is not null ? "test" : oneTime is not null ? "one_time_product" : "unsupported",
            NotificationType = oneTime?.NotificationType,
            ProductId = oneTime?.Sku,
            PurchaseTokenHash = tokenHash,
            ProcessingStatus = status,
            ErrorCode = errorCode,
            EventTime = ParseUnixMilliseconds(notification.EventTimeMillis),
            PublishedAt = message.PublishTime,
            ReceivedAt = now,
            ProcessedAt = now
        });
        try { await db.SaveChangesAsync(cancellationToken); }
        catch (DbUpdateException)
        {
            await using var verificationDb = await dbFactory.CreateDbContextAsync(cancellationToken);
            if (!await verificationDb.GooglePlayRtdnEvents.AnyAsync(item => item.MessageId == message.MessageId, cancellationToken)) throw;
        }
        return new(204, null);
    }

    private static bool TryReadBearer(string? authorization, out string token)
    {
        token = "";
        if (authorization is null || !authorization.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)) return false;
        token = authorization[7..].Trim();
        return token.Length is > 0 and <= 8_192;
    }

    private static string Hash(string value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value))).ToLowerInvariant();

    private static DateTimeOffset? ParseUnixMilliseconds(string? value) =>
        long.TryParse(value, out var milliseconds) && milliseconds >= 0
            ? DateTimeOffset.FromUnixTimeMilliseconds(milliseconds)
            : null;
}

public sealed record GooglePlayRtdnResult(int StatusCode, string? ErrorCode);

public sealed record GooglePlayDeveloperNotification(
    [property: JsonPropertyName("packageName")] string PackageName,
    [property: JsonPropertyName("eventTimeMillis")] string? EventTimeMillis,
    [property: JsonPropertyName("oneTimeProductNotification")] GooglePlayOneTimeProductNotification? OneTimeProductNotification,
    [property: JsonPropertyName("testNotification")] JsonElement? TestNotification);

public sealed record GooglePlayOneTimeProductNotification(
    [property: JsonPropertyName("notificationType")] int NotificationType,
    [property: JsonPropertyName("purchaseToken")] string PurchaseToken,
    [property: JsonPropertyName("sku")] string Sku);
