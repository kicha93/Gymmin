using System.Text.Json;
using Gymmin.Api.Data;
using Gymmin.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Gymmin.Api.Services;

public interface IAiCreditService
{
    AiCreditBalanceResponse GetBalance(string userId);
    AiCreditTransactionsResponse GetTransactions(string userId, int limit);
    AiCreditPacksResponse GetPacks();
    AiCreditBalanceResponse GrantDev(string userId, int amount, string? reason);
    AiCreditPurchaseCreditResult CreditPurchase(string userId, int amount, string purchaseId, string tokenHash, string? metadataJson);
    AiCreditConsumeResult ConsumeForJob(string userId, string jobId, int cost, string reason, string? idempotencyKey);
    bool RefundForJob(string userId, string jobId, string reason);
}

public sealed class EfAiCreditService : IAiCreditService
{
    public const int MaxIdempotencyKeyLength = 160;
    private readonly IDbContextFactory<GymminDbContext> _dbFactory;
    private readonly AiCreditsOptions _options;

    public EfAiCreditService(IDbContextFactory<GymminDbContext> dbFactory, IOptions<AiCreditsOptions> options)
    {
        _dbFactory = dbFactory;
        _options = options.Value;
    }

    public AiCreditBalanceResponse GetBalance(string userId)
    {
        using var db = _dbFactory.CreateDbContext();
        using var transaction = db.Database.BeginTransaction();
        var account = EnsureAccount(db, userId);
        db.SaveChanges();
        transaction.Commit();
        return _options.ToBalanceResponse(account.Balance);
    }

    public AiCreditTransactionsResponse GetTransactions(string userId, int limit)
    {
        var take = Math.Clamp(limit, 1, 100);
        using var db = _dbFactory.CreateDbContext();
        EnsureAccount(db, userId);
        db.SaveChanges();

        var transactions = db.AiCreditTransactions
            .AsNoTracking()
            .Where(transaction => transaction.UserId == userId)
            .OrderByDescending(transaction => transaction.CreatedAt)
            .Take(take)
            .Select(transaction => new AiCreditTransactionResponse(
                transaction.Id,
                transaction.Amount,
                transaction.Type,
                transaction.Reason,
                transaction.RelatedJobId,
                transaction.BalanceAfter,
                transaction.CreatedAt))
            .ToList();

        return new AiCreditTransactionsResponse(transactions);
    }

    public AiCreditPacksResponse GetPacks()
    {
        var packs = _options.Packs
            .Where(pack => !string.IsNullOrWhiteSpace(pack.ProductId) && pack.Credits > 0)
            .Select(pack => new AiCreditPackResponse(pack.ProductId, pack.Credits, pack.DisplayName, pack.Active))
            .ToList();
        return new AiCreditPacksResponse(packs);
    }

    public AiCreditBalanceResponse GrantDev(string userId, int amount, string? reason)
    {
        using var db = _dbFactory.CreateDbContext();
        using var transaction = db.Database.BeginTransaction();
        var account = EnsureAccount(db, userId);
        AddTransaction(
            db,
            account,
            amount,
            AiCreditTransactionTypes.DevGrant,
            string.IsNullOrWhiteSpace(reason) ? "Manual dev top-up" : reason.Trim(),
            null,
            null,
            null,
            null);
        db.SaveChanges();
        transaction.Commit();
        return _options.ToBalanceResponse(account.Balance);
    }

    public AiCreditPurchaseCreditResult CreditPurchase(string userId, int amount, string purchaseId, string tokenHash, string? metadataJson)
    {
        using var db = _dbFactory.CreateDbContext();
        using var transaction = db.Database.BeginTransaction();
        var account = EnsureAccount(db, userId);
        var ledger = AddTransaction(
            db,
            account,
            amount,
            AiCreditTransactionTypes.Purchase,
            AiCreditReasons.GooglePlayPurchase,
            null,
            purchaseId,
            tokenHash,
            metadataJson);
        db.SaveChanges();
        transaction.Commit();
        return new AiCreditPurchaseCreditResult(account.Balance, ledger.Id);
    }

    public AiCreditConsumeResult ConsumeForJob(string userId, string jobId, int cost, string reason, string? idempotencyKey)
    {
        if (cost <= 0)
        {
            return new AiCreditConsumeResult(true, null, GetBalance(userId).Balance);
        }

        using var db = _dbFactory.CreateDbContext();
        using var transaction = db.Database.BeginTransaction();
        var consume = ConsumeForJob(db, userId, jobId, cost, reason, idempotencyKey);
        db.SaveChanges();
        transaction.Commit();
        return consume;
    }

    public bool RefundForJob(string userId, string jobId, string reason)
    {
        using var db = _dbFactory.CreateDbContext();
        using var transaction = db.Database.BeginTransaction();
        var refunded = RefundForJob(db, userId, jobId, reason);
        if (refunded)
        {
            db.SaveChanges();
        }
        transaction.Commit();
        return refunded;
    }

    public AiCreditConsumeResult ConsumeForJob(
        GymminDbContext db,
        string userId,
        string jobId,
        int cost,
        string reason,
        string? idempotencyKey)
    {
        if (cost <= 0)
        {
            var balance = EnsureAccount(db, userId).Balance;
            return new AiCreditConsumeResult(true, null, balance);
        }

        var normalizedIdempotencyKey = NormalizeIdempotencyKey(idempotencyKey);
        if (normalizedIdempotencyKey is not null)
        {
            var existing = db.AiCreditTransactions
                .AsNoTracking()
                .Where(transaction =>
                    transaction.UserId == userId &&
                    transaction.Type == AiCreditTransactionTypes.Consume &&
                    transaction.Reason == reason &&
                    transaction.IdempotencyKey == normalizedIdempotencyKey)
                .OrderByDescending(transaction => transaction.CreatedAt)
                .FirstOrDefault();

            if (existing?.RelatedJobId is not null)
            {
                return new AiCreditConsumeResult(true, existing.Id, existing.BalanceAfter, existing.RelatedJobId);
            }
        }

        var duplicateJob = db.AiCreditTransactions
            .AsNoTracking()
            .FirstOrDefault(transaction =>
                transaction.UserId == userId &&
                transaction.Type == AiCreditTransactionTypes.Consume &&
                transaction.RelatedJobId == jobId);
        if (duplicateJob is not null)
        {
            return new AiCreditConsumeResult(true, duplicateJob.Id, duplicateJob.BalanceAfter, jobId);
        }

        EnsureAccount(db, userId);
        db.SaveChanges();

        var now = DateTimeOffset.UtcNow;
        var updatedRows = db.Database.ExecuteSqlInterpolated($"""
            UPDATE "AiCreditAccounts"
            SET "Balance" = "Balance" - {cost}, "UpdatedAt" = {now.ToUniversalTime().ToString("O")}
            WHERE "UserId" = {userId} AND "Balance" >= {cost}
            """);

        db.ChangeTracker.Clear();

        var account = db.AiCreditAccounts.First(account => account.UserId == userId);
        if (updatedRows != 1)
        {
            return new AiCreditConsumeResult(false, null, account.Balance);
        }

        var ledger = AddLedgerTransaction(
            db,
            account.UserId,
            -cost,
            AiCreditTransactionTypes.Consume,
            reason,
            jobId,
            null,
            normalizedIdempotencyKey,
            null,
            account.Balance,
            now);
        return new AiCreditConsumeResult(true, ledger.Id, account.Balance);
    }

    public bool RefundForJob(GymminDbContext db, string userId, string jobId, string reason)
    {
        var job = db.WorkoutCreatorJobs.FirstOrDefault(item => item.UserId == userId && item.Id == jobId);
        if (job?.TokenRefundedAt is not null)
        {
            return false;
        }

        var consume = db.AiCreditTransactions
            .AsNoTracking()
            .FirstOrDefault(transaction =>
                transaction.UserId == userId &&
                transaction.Type == AiCreditTransactionTypes.Consume &&
                transaction.RelatedJobId == jobId);
        if (consume is null)
        {
            return false;
        }

        var existingRefund = db.AiCreditTransactions
            .AsNoTracking()
            .Any(transaction =>
                transaction.UserId == userId &&
                transaction.Type == AiCreditTransactionTypes.Refund &&
                transaction.RelatedJobId == jobId);
        if (existingRefund)
        {
            return false;
        }

        EnsureAccount(db, userId);
        db.SaveChanges();

        var now = DateTimeOffset.UtcNow;
        db.Database.ExecuteSqlInterpolated($"""
            UPDATE "AiCreditAccounts"
            SET "Balance" = "Balance" + {Math.Abs(consume.Amount)}, "UpdatedAt" = {now.ToUniversalTime().ToString("O")}
            WHERE "UserId" = {userId}
            """);
        db.ChangeTracker.Clear();

        var account = db.AiCreditAccounts.First(account => account.UserId == userId);
        AddLedgerTransaction(
            db,
            account.UserId,
            Math.Abs(consume.Amount),
            AiCreditTransactionTypes.Refund,
            reason,
            jobId,
            null,
            null,
            null,
            account.Balance,
            now);

        if (job is not null)
        {
            db.Attach(job);
            job.TokenRefundedAt = now;
            job.TokenRefundReason = reason;
        }

        return true;
    }

    private AiCreditAccountEntity EnsureAccount(GymminDbContext db, string userId)
    {
        var account = db.AiCreditAccounts.FirstOrDefault(item => item.UserId == userId);
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

        if (_options.InitialGrant > 0)
        {
            AddTransaction(
                db,
                account,
                _options.InitialGrant,
                AiCreditTransactionTypes.InitialGrant,
                "Initial AI credits grant",
                null,
                null,
                null,
                null);
        }

        return account;
    }

    private static AiCreditTransactionEntity AddTransaction(
        GymminDbContext db,
        AiCreditAccountEntity account,
        int amount,
        string type,
        string? reason,
        string? relatedJobId,
        string? relatedPurchaseId,
        string? idempotencyKey,
        string? metadataJson)
    {
        account.Balance += amount;
        if (account.Balance < 0)
        {
            throw new InvalidOperationException("AI credit balance cannot be negative.");
        }

        account.UpdatedAt = DateTimeOffset.UtcNow;
        var transaction = new AiCreditTransactionEntity
        {
            Id = Guid.NewGuid().ToString("N"),
            UserId = account.UserId,
            Amount = amount,
            Type = type,
            Reason = reason,
            RelatedJobId = relatedJobId,
            RelatedPurchaseId = relatedPurchaseId,
            IdempotencyKey = idempotencyKey,
            BalanceAfter = account.Balance,
            MetadataJson = metadataJson,
            CreatedAt = account.UpdatedAt
        };
        db.AiCreditTransactions.Add(transaction);
        return transaction;
    }

    private static AiCreditTransactionEntity AddLedgerTransaction(
        GymminDbContext db,
        string userId,
        int amount,
        string type,
        string? reason,
        string? relatedJobId,
        string? relatedPurchaseId,
        string? idempotencyKey,
        string? metadataJson,
        int balanceAfter,
        DateTimeOffset createdAt)
    {
        var transaction = new AiCreditTransactionEntity
        {
            Id = Guid.NewGuid().ToString("N"),
            UserId = userId,
            Amount = amount,
            Type = type,
            Reason = reason,
            RelatedJobId = relatedJobId,
            RelatedPurchaseId = relatedPurchaseId,
            IdempotencyKey = idempotencyKey,
            BalanceAfter = balanceAfter,
            MetadataJson = metadataJson,
            CreatedAt = createdAt
        };
        db.AiCreditTransactions.Add(transaction);
        return transaction;
    }

    private static string? NormalizeIdempotencyKey(string? idempotencyKey)
    {
        var value = idempotencyKey?.Trim();
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        if (value.Length > MaxIdempotencyKeyLength)
        {
            throw new InvalidAiCreditIdempotencyKeyException();
        }

        return value;
    }
}

public sealed class FileBackedAiCreditService : IAiCreditService, IUserScopedDataStore
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true
    };

    private readonly object _gate = new();
    private readonly string _storagePath;
    private readonly AiCreditsOptions _options;
    private readonly ILogger<FileBackedAiCreditService> _logger;
    private PersistedAiCredits _state;

    public FileBackedAiCreditService(
        IWebHostEnvironment environment,
        IOptions<AiCreditsOptions> options,
        ILogger<FileBackedAiCreditService> logger)
    {
        _options = options.Value;
        _logger = logger;
        var dataDirectory = Path.Combine(environment.ContentRootPath, "App_Data");
        Directory.CreateDirectory(dataDirectory);
        _storagePath = Path.Combine(dataDirectory, "ai-credits.json");
        _state = Load();
    }

    public AiCreditBalanceResponse GetBalance(string userId)
    {
        lock (_gate)
        {
            var account = EnsureAccount(userId);
            Save();
            return _options.ToBalanceResponse(account.Balance);
        }
    }

    public AiCreditTransactionsResponse GetTransactions(string userId, int limit)
    {
        lock (_gate)
        {
            EnsureAccount(userId);
            Save();
            var transactions = _state.Transactions
                .Where(transaction => transaction.UserId == userId)
                .OrderByDescending(transaction => transaction.CreatedAt)
                .Take(Math.Clamp(limit, 1, 100))
                .Select(transaction => new AiCreditTransactionResponse(
                    transaction.Id,
                    transaction.Amount,
                    transaction.Type,
                    transaction.Reason,
                    transaction.RelatedJobId,
                    transaction.BalanceAfter,
                    transaction.CreatedAt))
                .ToList();
            return new AiCreditTransactionsResponse(transactions);
        }
    }

    public AiCreditPacksResponse GetPacks()
    {
        var packs = _options.Packs
            .Where(pack => !string.IsNullOrWhiteSpace(pack.ProductId) && pack.Credits > 0)
            .Select(pack => new AiCreditPackResponse(pack.ProductId, pack.Credits, pack.DisplayName, pack.Active))
            .ToList();
        return new AiCreditPacksResponse(packs);
    }

    public AiCreditBalanceResponse GrantDev(string userId, int amount, string? reason)
    {
        lock (_gate)
        {
            var account = EnsureAccount(userId);
            AddTransaction(account, amount, AiCreditTransactionTypes.DevGrant, string.IsNullOrWhiteSpace(reason) ? "Manual dev top-up" : reason.Trim(), null, null, null, null);
            Save();
            return _options.ToBalanceResponse(account.Balance);
        }
    }

    public AiCreditPurchaseCreditResult CreditPurchase(string userId, int amount, string purchaseId, string tokenHash, string? metadataJson)
    {
        lock (_gate)
        {
            var account = EnsureAccount(userId);
            var transaction = AddTransaction(account, amount, AiCreditTransactionTypes.Purchase, AiCreditReasons.GooglePlayPurchase, null, purchaseId, tokenHash, metadataJson);
            Save();
            return new AiCreditPurchaseCreditResult(account.Balance, transaction.Id);
        }
    }

    public AiCreditConsumeResult ConsumeForJob(string userId, string jobId, int cost, string reason, string? idempotencyKey)
    {
        if (cost <= 0)
        {
            return new AiCreditConsumeResult(true, null, GetBalance(userId).Balance);
        }

        lock (_gate)
        {
            var normalizedIdempotencyKey = NormalizeIdempotencyKey(idempotencyKey);
            if (normalizedIdempotencyKey is not null)
            {
                var existing = _state.Transactions
                    .Where(transaction =>
                        transaction.UserId == userId &&
                        transaction.Type == AiCreditTransactionTypes.Consume &&
                        transaction.Reason == reason &&
                        transaction.IdempotencyKey == normalizedIdempotencyKey)
                    .OrderByDescending(transaction => transaction.CreatedAt)
                    .FirstOrDefault();
                if (existing?.RelatedJobId is not null)
                {
                    return new AiCreditConsumeResult(true, existing.Id, existing.BalanceAfter, existing.RelatedJobId);
                }
            }

            var duplicateJob = _state.Transactions.FirstOrDefault(transaction =>
                transaction.UserId == userId &&
                transaction.Type == AiCreditTransactionTypes.Consume &&
                transaction.RelatedJobId == jobId);
            if (duplicateJob is not null)
            {
                return new AiCreditConsumeResult(true, duplicateJob.Id, duplicateJob.BalanceAfter, jobId);
            }

            var account = EnsureAccount(userId);
            if (account.Balance < cost)
            {
                Save();
                return new AiCreditConsumeResult(false, null, account.Balance);
            }

            var transaction = AddTransaction(account, -cost, AiCreditTransactionTypes.Consume, reason, jobId, null, normalizedIdempotencyKey, null);
            Save();
            return new AiCreditConsumeResult(true, transaction.Id, account.Balance);
        }
    }

    public bool RefundForJob(string userId, string jobId, string reason)
    {
        lock (_gate)
        {
            var consume = _state.Transactions.FirstOrDefault(transaction =>
                transaction.UserId == userId &&
                transaction.Type == AiCreditTransactionTypes.Consume &&
                transaction.RelatedJobId == jobId);
            if (consume is null)
            {
                return false;
            }

            var existingRefund = _state.Transactions.Any(transaction =>
                transaction.UserId == userId &&
                transaction.Type == AiCreditTransactionTypes.Refund &&
                transaction.RelatedJobId == jobId);
            if (existingRefund)
            {
                return false;
            }

            var account = EnsureAccount(userId);
            AddTransaction(account, Math.Abs(consume.Amount), AiCreditTransactionTypes.Refund, reason, jobId, null, null, null);
            Save();
            return true;
        }
    }

    public bool DeleteUserData(string userId)
    {
        lock (_gate)
        {
            var removedAccount = _state.Accounts.Remove(userId);
            var before = _state.Transactions.Count;
            _state = _state with
            {
                Transactions = _state.Transactions.Where(transaction => transaction.UserId != userId).ToList()
            };
            var removedTransactions = before != _state.Transactions.Count;
            if (removedAccount || removedTransactions)
            {
                Save();
            }

            return removedAccount || removedTransactions;
        }
    }

    private PersistedAiCreditAccount EnsureAccount(string userId)
    {
        if (_state.Accounts.TryGetValue(userId, out var account))
        {
            return account;
        }

        var now = DateTimeOffset.UtcNow;
        account = new PersistedAiCreditAccount(userId, 0, now, now);
        _state.Accounts[userId] = account;

        if (_options.InitialGrant > 0)
        {
            AddTransaction(account, _options.InitialGrant, AiCreditTransactionTypes.InitialGrant, "Initial AI credits grant", null, null, null, null);
        }

        return account;
    }

    private PersistedAiCreditTransaction AddTransaction(
        PersistedAiCreditAccount account,
        int amount,
        string type,
        string? reason,
        string? relatedJobId,
        string? relatedPurchaseId,
        string? idempotencyKey,
        string? metadataJson)
    {
        account.Balance += amount;
        if (account.Balance < 0)
        {
            throw new InvalidOperationException("AI credit balance cannot be negative.");
        }

        account.UpdatedAt = DateTimeOffset.UtcNow;
        var transaction = new PersistedAiCreditTransaction(
            Guid.NewGuid().ToString("N"),
            account.UserId,
            amount,
            type,
            reason,
            relatedJobId,
            relatedPurchaseId,
            idempotencyKey,
            account.Balance,
            metadataJson,
            account.UpdatedAt);
        _state.Transactions.Add(transaction);
        return transaction;
    }

    private PersistedAiCredits Load()
    {
        if (!File.Exists(_storagePath))
        {
            return new PersistedAiCredits([], []);
        }

        try
        {
            var json = File.ReadAllText(_storagePath);
            return JsonSerializer.Deserialize<PersistedAiCredits>(json, JsonOptions) ?? new PersistedAiCredits([], []);
        }
        catch (Exception error)
        {
            _logger.LogError(error, "Failed to load AI credits store from {StoragePath}", _storagePath);
            return new PersistedAiCredits([], []);
        }
    }

    private void Save()
    {
        var json = JsonSerializer.Serialize(_state, JsonOptions);
        File.WriteAllText(_storagePath, json);
    }

    private static string? NormalizeIdempotencyKey(string? idempotencyKey)
    {
        var value = idempotencyKey?.Trim();
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        if (value.Length > EfAiCreditService.MaxIdempotencyKeyLength)
        {
            throw new InvalidAiCreditIdempotencyKeyException();
        }

        return value;
    }

    private sealed record PersistedAiCredits(
        Dictionary<string, PersistedAiCreditAccount> Accounts,
        List<PersistedAiCreditTransaction> Transactions);

    private sealed record PersistedAiCreditAccount(
        string UserId,
        int Balance,
        DateTimeOffset CreatedAt,
        DateTimeOffset UpdatedAt)
    {
        public int Balance { get; set; } = Balance;
        public DateTimeOffset UpdatedAt { get; set; } = UpdatedAt;
    }

    private sealed record PersistedAiCreditTransaction(
        string Id,
        string UserId,
        int Amount,
        string Type,
        string? Reason,
        string? RelatedJobId,
        string? RelatedPurchaseId,
        string? IdempotencyKey,
        int BalanceAfter,
        string? MetadataJson,
        DateTimeOffset CreatedAt);
}
