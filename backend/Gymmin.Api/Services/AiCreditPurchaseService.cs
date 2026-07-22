using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Gymmin.Api.Data;
using Gymmin.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Gymmin.Api.Services;

public interface IAiCreditPurchaseService
{
    Task<VerifyGooglePlayPurchaseResult> VerifyGooglePlayPurchaseAsync(
        string userId,
        VerifyGooglePlayPurchaseRequest request,
        CancellationToken cancellationToken);

    AiCreditPurchasesResponse GetPurchases(string userId);
}

public sealed record VerifyGooglePlayPurchaseResult(
    bool Success,
    bool IsConflict,
    bool IsRetryable,
    string? ErrorCode,
    string? ErrorMessage,
    VerifyGooglePlayPurchaseResponse? Response);

public sealed class EfAiCreditPurchaseService : IAiCreditPurchaseService
{
    public const int MaxPurchaseTokenLength = 4096;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly IDbContextFactory<GymminDbContext> _dbFactory;
    private readonly IGooglePlayPurchaseValidator _validator;
    private readonly AiCreditsOptions _creditOptions;
    private readonly GooglePlayOptions _googleOptions;

    public EfAiCreditPurchaseService(
        IDbContextFactory<GymminDbContext> dbFactory,
        IGooglePlayPurchaseValidator validator,
        IOptions<AiCreditsOptions> creditOptions,
        IOptions<GooglePlayOptions> googleOptions)
    {
        _dbFactory = dbFactory;
        _validator = validator;
        _creditOptions = creditOptions.Value;
        _googleOptions = googleOptions.Value;
    }

    public AiCreditPurchasesResponse GetPurchases(string userId)
    {
        using var db = _dbFactory.CreateDbContext();
        var purchases = db.AiCreditPurchases
            .AsNoTracking()
            .Where(purchase => purchase.UserId == userId)
            .OrderByDescending(purchase => purchase.CreatedAt)
            .Take(100)
            .Select(purchase => new AiCreditPurchaseResponse(
                purchase.Id,
                purchase.Platform,
                purchase.ProductId,
                purchase.Credits,
                purchase.ProcessStatus,
                purchase.GoogleOrderId,
                purchase.CreatedAt))
            .ToList();
        return new AiCreditPurchasesResponse(purchases);
    }

    public async Task<VerifyGooglePlayPurchaseResult> VerifyGooglePlayPurchaseAsync(
        string userId,
        VerifyGooglePlayPurchaseRequest request,
        CancellationToken cancellationToken)
    {
        var validation = ValidateRequest(request);
        if (validation is not null)
        {
            return validation;
        }

        var productId = request.ProductId!.Trim();
        var purchaseToken = request.PurchaseToken!.Trim();
        var tokenHash = HashPurchaseToken(purchaseToken);
        var tokenLastChars = purchaseToken.Length <= 6 ? purchaseToken : purchaseToken[^6..];
        var pack = GetActivePack(productId)!;

        await using var precheckDb = await _dbFactory.CreateDbContextAsync(cancellationToken);
        if (await precheckDb.GooglePlayVoidedPurchases.AsNoTracking()
            .AnyAsync(item => item.PurchaseTokenHash == tokenHash, cancellationToken))
        {
            return new VerifyGooglePlayPurchaseResult(
                false, true, false, "google_play_purchase_voided",
                "This Google Play purchase was voided and cannot grant credits.", null);
        }
        var existing = await precheckDb.AiCreditPurchases
            .AsNoTracking()
            .FirstOrDefaultAsync(purchase => purchase.PurchaseTokenHash == tokenHash, cancellationToken);
        if (existing is not null)
        {
            return await HandleExistingPurchaseAsync(userId, productId, purchaseToken, existing, cancellationToken);
        }

        var google = await _validator.ValidateOneTimeProductAsync(productId, purchaseToken, cancellationToken);
        if (!google.IsValid)
        {
            await SaveFailedPurchaseAsync(userId, productId, pack.Credits, tokenHash, tokenLastChars, request.OrderId, google, cancellationToken);
            return new VerifyGooglePlayPurchaseResult(
                false,
                false,
                google.IsRetryable,
                google.ErrorCode ?? "invalid_google_play_purchase",
                google.ErrorMessage ?? "Purchase could not be verified",
                null);
        }

        if (!string.Equals(google.ProductId, productId, StringComparison.Ordinal))
        {
            return new VerifyGooglePlayPurchaseResult(false, false, false, "google_play_product_mismatch", "Google Play product id did not match the requested pack.", null);
        }

        if (!string.IsNullOrWhiteSpace(google.ObfuscatedExternalAccountId) &&
            !string.Equals(
                google.ObfuscatedExternalAccountId,
                BuildGooglePlayObfuscatedAccountId(userId),
                StringComparison.Ordinal))
        {
            return new VerifyGooglePlayPurchaseResult(
                false,
                true,
                false,
                "google_play_account_mismatch",
                "This Google Play purchase belongs to another Gymmin account.",
                null);
        }

        (string PurchaseId, VerifyGooglePlayPurchaseResponse Response) credited;
        try
        {
            credited = await CreditPurchaseAsync(userId, productId, pack.Credits, tokenHash, tokenLastChars, request.OrderId, google, cancellationToken);
        }
        catch (DbUpdateException)
        {
            await using var db = await _dbFactory.CreateDbContextAsync(cancellationToken);
            var existingAfterConflict = await db.AiCreditPurchases
                .AsNoTracking()
                .FirstOrDefaultAsync(purchase => purchase.PurchaseTokenHash == tokenHash, cancellationToken);
            if (existingAfterConflict is null)
            {
                throw;
            }

            return await HandleExistingPurchaseAsync(userId, productId, purchaseToken, existingAfterConflict, cancellationToken);
        }
        var consume = await TryConsumeAsync(productId, purchaseToken, credited.PurchaseId, userId, cancellationToken);

        return new VerifyGooglePlayPurchaseResult(
            true,
            false,
            false,
            null,
            null,
            credited.Response with
            {
                Status = consume.Success ? "credited" : "credited_consume_pending"
            });
    }

    private VerifyGooglePlayPurchaseResult? ValidateRequest(VerifyGooglePlayPurchaseRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.ProductId))
        {
            return BadRequest("product_id_required", "ProductId is required.");
        }

        if (string.IsNullOrWhiteSpace(request.PurchaseToken))
        {
            return BadRequest("purchase_token_required", "Purchase token is required.");
        }

        if (request.PurchaseToken.Trim().Length > MaxPurchaseTokenLength)
        {
            return BadRequest("purchase_token_too_long", "Purchase token is too long.");
        }

        if ((request.OrderId?.Trim().Length ?? 0) > 160)
        {
            return BadRequest("order_id_too_long", "Order id is too long.");
        }

        if (GetActivePack(request.ProductId.Trim()) is null)
        {
            return BadRequest("unknown_ai_credit_pack", "AI credit pack is not active or does not exist.");
        }

        return null;
    }

    private AiCreditPackOptions? GetActivePack(string productId) =>
        _creditOptions.Packs.FirstOrDefault(pack =>
            pack.Active &&
            pack.Credits > 0 &&
            string.Equals(pack.ProductId, productId, StringComparison.Ordinal));

    private async Task<VerifyGooglePlayPurchaseResult> HandleExistingPurchaseAsync(
        string userId,
        string productId,
        string purchaseToken,
        AiCreditPurchaseEntity existing,
        CancellationToken cancellationToken)
    {
        if (!string.Equals(existing.UserId, userId, StringComparison.Ordinal))
        {
            return new VerifyGooglePlayPurchaseResult(false, true, false, "purchase_token_already_used", "Purchase token was already used by another account.", null);
        }

        if (existing.ProcessStatus is AiCreditPurchaseStatuses.Credited or AiCreditPurchaseStatuses.Consumed)
        {
            if (existing.ProcessStatus == AiCreditPurchaseStatuses.Credited)
            {
                await TryConsumeAsync(productId, purchaseToken, existing.Id, userId, cancellationToken);
            }

            await using var db = await _dbFactory.CreateDbContextAsync(cancellationToken);
            var balance = await db.AiCreditAccounts
                .AsNoTracking()
                .Where(account => account.UserId == userId)
                .Select(account => account.Balance)
                .FirstOrDefaultAsync(cancellationToken);
            return new VerifyGooglePlayPurchaseResult(
                true,
                false,
                false,
                null,
                null,
                new VerifyGooglePlayPurchaseResponse(
                    "already_processed",
                    0,
                    balance,
                    existing.RelatedTransactionId,
                    existing.Id));
        }

        if (existing.ProcessStatus == AiCreditPurchaseStatuses.Failed)
        {
            return new VerifyGooglePlayPurchaseResult(false, false, true, existing.ErrorCode ?? "purchase_retry_required", existing.ErrorMessage ?? "Purchase verification should be retried.", null);
        }

        return new VerifyGooglePlayPurchaseResult(false, false, true, "purchase_processing", "Purchase is already being processed.", null);
    }

    private async Task<(string PurchaseId, VerifyGooglePlayPurchaseResponse Response)> CreditPurchaseAsync(
        string userId,
        string productId,
        int credits,
        string tokenHash,
        string tokenLastChars,
        string? clientOrderId,
        GooglePlayPurchaseValidationResult google,
        CancellationToken cancellationToken)
    {
        await using var db = await _dbFactory.CreateDbContextAsync(cancellationToken);
        await using var tx = await db.Database.BeginTransactionAsync(cancellationToken);
        var now = DateTimeOffset.UtcNow;

        var existing = await db.AiCreditPurchases.FirstOrDefaultAsync(purchase => purchase.PurchaseTokenHash == tokenHash, cancellationToken);
        if (existing is not null)
        {
            if (existing.UserId != userId)
            {
                throw new InvalidOperationException("Purchase token belongs to another user.");
            }

            if (existing.ProcessStatus is AiCreditPurchaseStatuses.Credited or AiCreditPurchaseStatuses.Consumed)
            {
                var balance = await db.AiCreditAccounts
                    .AsNoTracking()
                    .Where(account => account.UserId == userId)
                    .Select(account => account.Balance)
                    .FirstAsync(cancellationToken);
                await tx.CommitAsync(cancellationToken);
                return (existing.Id, new VerifyGooglePlayPurchaseResponse("already_processed", 0, balance, existing.RelatedTransactionId, existing.Id));
            }
        }

        var purchase = existing ?? new AiCreditPurchaseEntity
        {
            Id = Guid.NewGuid().ToString("N"),
            UserId = userId,
            Platform = AiCreditPurchasePlatforms.AndroidGooglePlay,
            ProductId = productId,
            Credits = credits,
            PurchaseTokenHash = tokenHash,
            PurchaseTokenLastChars = tokenLastChars,
            CreatedAt = now
        };

        purchase.GoogleOrderId = google.OrderId ?? clientOrderId;
        purchase.PurchaseState = google.PurchaseState;
        purchase.ConsumptionState = google.ConsumptionState;
        purchase.AcknowledgementState = google.AcknowledgementState;
        purchase.ProcessStatus = AiCreditPurchaseStatuses.Verified;
        purchase.RawResponseJson = google.RawResponseJson;
        purchase.VerifiedAt = now;
        purchase.UpdatedAt = now;
        purchase.ErrorCode = null;
        purchase.ErrorMessage = null;
        if (existing is null)
        {
            db.AiCreditPurchases.Add(purchase);
        }

        var account = await EnsureAccountAsync(db, userId, _creditOptions.InitialGrant, cancellationToken);
        account.Balance += credits;
        account.UpdatedAt = now;
        var transactionId = Guid.NewGuid().ToString("N");
        var metadataJson = JsonSerializer.Serialize(new
        {
            productId,
            platform = AiCreditPurchasePlatforms.AndroidGooglePlay,
            orderId = purchase.GoogleOrderId,
            credits
        }, JsonOptions);
        db.Database.ExecuteSqlInterpolated($"""
            INSERT INTO "AiCreditTransactions"
                ("Id", "UserId", "Amount", "Type", "Reason", "RelatedJobId", "RelatedPurchaseId", "IdempotencyKey", "BalanceAfter", "MetadataJson", "CreatedAt")
            VALUES
                ({transactionId}, {userId}, {credits}, {AiCreditTransactionTypes.Purchase}, {AiCreditReasons.GooglePlayPurchase}, {null}, {purchase.Id}, {tokenHash}, {account.Balance}, {metadataJson}, {now.ToUniversalTime().ToString("O")})
            """);
        purchase.RelatedTransactionId = transactionId;
        purchase.ProcessStatus = AiCreditPurchaseStatuses.Credited;
        purchase.CreditedAt = now;
        purchase.UpdatedAt = now;

        await db.SaveChangesAsync(cancellationToken);
        await tx.CommitAsync(cancellationToken);
        return (purchase.Id, new VerifyGooglePlayPurchaseResponse("credited", credits, account.Balance, transactionId, purchase.Id));
    }

    private async Task<GooglePlayConsumeResult> TryConsumeAsync(
        string productId,
        string purchaseToken,
        string purchaseId,
        string userId,
        CancellationToken cancellationToken)
    {
        if (!_googleOptions.ConsumePurchases)
        {
            return new GooglePlayConsumeResult(true, false, null, null);
        }

        var consume = await _validator.ConsumeOneTimeProductAsync(productId, purchaseToken, cancellationToken);
        await using var db = await _dbFactory.CreateDbContextAsync(cancellationToken);
        var purchase = await db.AiCreditPurchases.FirstOrDefaultAsync(item => item.Id == purchaseId && item.UserId == userId, cancellationToken);
        if (purchase is null)
        {
            return consume;
        }

        purchase.ProcessStatus = consume.Success ? AiCreditPurchaseStatuses.Consumed : AiCreditPurchaseStatuses.Credited;
        purchase.ConsumedAt = consume.Success ? DateTimeOffset.UtcNow : purchase.ConsumedAt;
        purchase.ErrorCode = consume.Success ? null : consume.ErrorCode;
        purchase.ErrorMessage = consume.Success ? null : consume.ErrorMessage;
        purchase.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return consume;
    }

    private async Task SaveFailedPurchaseAsync(
        string userId,
        string productId,
        int credits,
        string tokenHash,
        string tokenLastChars,
        string? clientOrderId,
        GooglePlayPurchaseValidationResult google,
        CancellationToken cancellationToken)
    {
        await using var db = await _dbFactory.CreateDbContextAsync(cancellationToken);
        var now = DateTimeOffset.UtcNow;
        var purchase = await db.AiCreditPurchases.FirstOrDefaultAsync(item => item.PurchaseTokenHash == tokenHash, cancellationToken);
        if (purchase is null)
        {
            purchase = new AiCreditPurchaseEntity
            {
                Id = Guid.NewGuid().ToString("N"),
                UserId = userId,
                Platform = AiCreditPurchasePlatforms.AndroidGooglePlay,
                ProductId = productId,
                Credits = credits,
                PurchaseTokenHash = tokenHash,
                PurchaseTokenLastChars = tokenLastChars,
                CreatedAt = now
            };
            db.AiCreditPurchases.Add(purchase);
        }

        purchase.GoogleOrderId = google.OrderId ?? clientOrderId;
        purchase.PurchaseState = google.PurchaseState;
        purchase.ConsumptionState = google.ConsumptionState;
        purchase.AcknowledgementState = google.AcknowledgementState;
        purchase.ProcessStatus = AiCreditPurchaseStatuses.Failed;
        purchase.ErrorCode = google.ErrorCode;
        purchase.ErrorMessage = google.ErrorMessage;
        purchase.RawResponseJson = google.RawResponseJson;
        purchase.VerifiedAt = now;
        purchase.UpdatedAt = now;
        await db.SaveChangesAsync(cancellationToken);
    }

    private static async Task<AiCreditAccountEntity> EnsureAccountAsync(GymminDbContext db, string userId, int initialGrant, CancellationToken cancellationToken)
    {
        var account = await db.AiCreditAccounts.FirstOrDefaultAsync(item => item.UserId == userId, cancellationToken);
        if (account is not null)
        {
            return account;
        }

        var now = DateTimeOffset.UtcNow;
        account = new AiCreditAccountEntity
        {
            UserId = userId,
            Balance = 0,
            CreatedAt = now,
            UpdatedAt = now
        };
        db.AiCreditAccounts.Add(account);
        if (initialGrant > 0)
        {
            db.AiCreditTransactions.Add(new AiCreditTransactionEntity
            {
                Id = Guid.NewGuid().ToString("N"),
                UserId = userId,
                Amount = initialGrant,
                Type = AiCreditTransactionTypes.InitialGrant,
                Reason = "Initial AI credits grant",
                BalanceAfter = initialGrant,
                CreatedAt = now
            });
            account.Balance = initialGrant;
        }

        return account;
    }

    private static string HashPurchaseToken(string purchaseToken)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(purchaseToken));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    internal static string BuildGooglePlayObfuscatedAccountId(string userId) =>
        $"gymmin_{userId.Trim().ToLowerInvariant()}";

    private static VerifyGooglePlayPurchaseResult BadRequest(string code, string message) =>
        new(false, false, false, code, message, null);
}

public sealed class FileBackedAiCreditPurchaseService : IAiCreditPurchaseService, IUserScopedDataStore
{
    private readonly IAiCreditService _credits;
    private readonly IGooglePlayPurchaseValidator _validator;
    private readonly IOptions<AiCreditsOptions> _options;
    private readonly ILogger<FileBackedAiCreditPurchaseService> _logger;
    private readonly object _gate = new();
    private readonly string _storagePath;
    private readonly JsonSerializerOptions _jsonOptions = new(JsonSerializerDefaults.Web) { WriteIndented = true };
    private List<PersistedAiCreditPurchase> _purchases;

    public FileBackedAiCreditPurchaseService(
        IWebHostEnvironment environment,
        IAiCreditService credits,
        IGooglePlayPurchaseValidator validator,
        IOptions<AiCreditsOptions> options,
        ILogger<FileBackedAiCreditPurchaseService> logger)
    {
        _credits = credits;
        _validator = validator;
        _options = options;
        _logger = logger;
        var dataDirectory = Path.Combine(environment.ContentRootPath, "App_Data");
        Directory.CreateDirectory(dataDirectory);
        _storagePath = Path.Combine(dataDirectory, "ai-credit-purchases.json");
        _purchases = Load();
    }

    public AiCreditPurchasesResponse GetPurchases(string userId)
    {
        lock (_gate)
        {
            return new AiCreditPurchasesResponse(_purchases
                .Where(purchase => purchase.UserId == userId)
                .OrderByDescending(purchase => purchase.CreatedAt)
                .Take(100)
                .Select(purchase => new AiCreditPurchaseResponse(purchase.Id, purchase.Platform, purchase.ProductId, purchase.Credits, purchase.ProcessStatus, purchase.GoogleOrderId, purchase.CreatedAt))
                .ToList());
        }
    }

    public async Task<VerifyGooglePlayPurchaseResult> VerifyGooglePlayPurchaseAsync(string userId, VerifyGooglePlayPurchaseRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.ProductId) || string.IsNullOrWhiteSpace(request.PurchaseToken))
        {
            return new VerifyGooglePlayPurchaseResult(false, false, false, "invalid_purchase_request", "ProductId and purchaseToken are required.", null);
        }

        if (request.PurchaseToken.Trim().Length > EfAiCreditPurchaseService.MaxPurchaseTokenLength ||
            (request.OrderId?.Trim().Length ?? 0) > 160)
        {
            return new VerifyGooglePlayPurchaseResult(false, false, false, "invalid_purchase_request", "Purchase request is too large.", null);
        }

        var pack = _options.Value.Packs.FirstOrDefault(item => item.Active && item.ProductId == request.ProductId);
        if (pack is null)
        {
            return new VerifyGooglePlayPurchaseResult(false, false, false, "unknown_ai_credit_pack", "AI credit pack is not active or does not exist.", null);
        }

        var tokenHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(request.PurchaseToken.Trim()))).ToLowerInvariant();
        lock (_gate)
        {
            var existing = _purchases.FirstOrDefault(item => item.PurchaseTokenHash == tokenHash);
            if (existing is not null)
            {
                if (existing.UserId != userId)
                {
                    return new VerifyGooglePlayPurchaseResult(false, true, false, "purchase_token_already_used", "Purchase token was already used by another account.", null);
                }

                return new VerifyGooglePlayPurchaseResult(true, false, false, null, null, new VerifyGooglePlayPurchaseResponse("already_processed", 0, _credits.GetBalance(userId).Balance, existing.RelatedTransactionId, existing.Id));
            }
        }

        var google = await _validator.ValidateOneTimeProductAsync(request.ProductId.Trim(), request.PurchaseToken.Trim(), cancellationToken);
        if (!google.IsValid)
        {
            return new VerifyGooglePlayPurchaseResult(false, false, google.IsRetryable, google.ErrorCode ?? "invalid_google_play_purchase", google.ErrorMessage ?? "Purchase could not be verified", null);
        }

        var purchaseId = Guid.NewGuid().ToString("N");
        var metadataJson = JsonSerializer.Serialize(new
        {
            productId = pack.ProductId,
            platform = AiCreditPurchasePlatforms.AndroidGooglePlay,
            orderId = google.OrderId ?? request.OrderId,
            credits = pack.Credits
        }, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        var credit = _credits.CreditPurchase(userId, pack.Credits, purchaseId, tokenHash, metadataJson);
        lock (_gate)
        {
            _purchases.Add(new PersistedAiCreditPurchase(purchaseId, userId, AiCreditPurchasePlatforms.AndroidGooglePlay, pack.ProductId, pack.Credits, tokenHash, google.OrderId ?? request.OrderId, AiCreditPurchaseStatuses.Credited, credit.TransactionId, DateTimeOffset.UtcNow));
            Save();
        }
        await _validator.ConsumeOneTimeProductAsync(request.ProductId.Trim(), request.PurchaseToken.Trim(), cancellationToken);
        return new VerifyGooglePlayPurchaseResult(true, false, false, null, null, new VerifyGooglePlayPurchaseResponse("credited", pack.Credits, credit.Balance, credit.TransactionId, purchaseId));
    }

    public bool DeleteUserData(string userId)
    {
        lock (_gate)
        {
            var before = _purchases.Count;
            _purchases = _purchases.Where(purchase => purchase.UserId != userId).ToList();
            var removed = before != _purchases.Count;
            if (removed)
            {
                Save();
            }

            return removed;
        }
    }

    private List<PersistedAiCreditPurchase> Load()
    {
        try
        {
            return File.Exists(_storagePath)
                ? JsonSerializer.Deserialize<List<PersistedAiCreditPurchase>>(File.ReadAllText(_storagePath), _jsonOptions) ?? []
                : [];
        }
        catch (Exception error)
        {
            _logger.LogError(error, "Failed to load AI credit purchase file store.");
            return [];
        }
    }

    private void Save() => File.WriteAllText(_storagePath, JsonSerializer.Serialize(_purchases, _jsonOptions));
}

public sealed record PersistedAiCreditPurchase(
    string Id,
    string UserId,
    string Platform,
    string ProductId,
    int Credits,
    string PurchaseTokenHash,
    string? GoogleOrderId,
    string ProcessStatus,
    string? RelatedTransactionId,
    DateTimeOffset CreatedAt);
