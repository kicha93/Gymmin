using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Gymmin.Api.Data;
using Gymmin.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Gymmin.Api.Services;

public sealed class GooglePlayVoidedPurchasesWorker(
    IDbContextFactory<GymminDbContext> dbFactory,
    IGooglePlayPurchaseValidator googlePlay,
    IOptions<GooglePlayOptions> options,
    ILogger<GooglePlayVoidedPurchasesWorker> logger) : BackgroundService
{
    private const string CheckpointId = "google-play-voided-purchases";
    private readonly GooglePlayOptions _options = options.Value;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_options.Enabled || !_options.VoidedPurchasesEnabled) return;
        var interval = TimeSpan.FromMinutes(Math.Clamp(_options.VoidedPurchasesPollMinutes, 15, 24 * 60));
        while (!stoppingToken.IsCancellationRequested)
        {
            try { await RunOnceAsync(stoppingToken); }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception error) { logger.LogError(error, "Google Play voided purchases reconciliation failed."); }
            await Task.Delay(interval, stoppingToken);
        }
    }

    public async Task RunOnceAsync(CancellationToken cancellationToken = default)
    {
        var endTime = DateTimeOffset.UtcNow;
        await using var checkpointDb = await dbFactory.CreateDbContextAsync(cancellationToken);
        var checkpoint = await checkpointDb.IntegrationCheckpoints.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == CheckpointId, cancellationToken);
        var lookbackDays = Math.Clamp(_options.VoidedPurchasesInitialLookbackDays, 1, 30);
        var overlap = TimeSpan.FromMinutes(Math.Clamp(_options.VoidedPurchasesOverlapMinutes, 15, 24 * 60));
        var startTime = checkpoint is null ? endTime.AddDays(-lookbackDays) : checkpoint.LastSuccessfulAt.Subtract(overlap);
        if (startTime < endTime.AddDays(-30)) startTime = endTime.AddDays(-30);

        string? pageToken = null;
        var pageCount = 0;
        var processed = 0;
        do
        {
            if (++pageCount > 100) throw new InvalidOperationException("Google Play voided purchases pagination exceeded 100 pages.");
            var page = await googlePlay.ListVoidedPurchasesAsync(startTime, endTime, pageToken, cancellationToken);
            if (!page.Success)
            {
                throw new InvalidOperationException($"{page.ErrorCode}: {page.ErrorMessage}");
            }

            foreach (var item in page.Purchases)
            {
                if (await ProcessAsync(item, cancellationToken)) processed++;
            }
            pageToken = page.NextPageToken;
        } while (!string.IsNullOrWhiteSpace(pageToken));

        await using var saveDb = await dbFactory.CreateDbContextAsync(cancellationToken);
        var storedCheckpoint = await saveDb.IntegrationCheckpoints.SingleOrDefaultAsync(item => item.Id == CheckpointId, cancellationToken);
        if (storedCheckpoint is null)
        {
            storedCheckpoint = new IntegrationCheckpointEntity { Id = CheckpointId };
            saveDb.IntegrationCheckpoints.Add(storedCheckpoint);
        }
        storedCheckpoint.LastSuccessfulAt = endTime;
        storedCheckpoint.UpdatedAt = DateTimeOffset.UtcNow;
        await saveDb.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Google Play voided purchases reconciliation completed. Pages={Pages} NewEvents={NewEvents}.", pageCount, processed);
    }

    private async Task<bool> ProcessAsync(GooglePlayVoidedPurchase item, CancellationToken cancellationToken)
    {
        var tokenHash = Hash(item.PurchaseToken);
        var eventId = Hash($"{tokenHash}|{item.OrderId}|{item.VoidedTime:O}|{item.VoidedReason}|{item.VoidedQuantity}");
        await using var db = await dbFactory.CreateDbContextAsync(cancellationToken);
        if (await db.GooglePlayVoidedPurchases.AnyAsync(existing => existing.Id == eventId, cancellationToken)) return false;
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var now = DateTimeOffset.UtcNow;
        var purchase = await db.AiCreditPurchases
            .SingleOrDefaultAsync(existing => existing.PurchaseTokenHash == tokenHash, cancellationToken);

        var stored = new GooglePlayVoidedPurchaseEntity
        {
            Id = eventId,
            PurchaseTokenHash = tokenHash,
            GoogleOrderId = Trim(item.OrderId, 160),
            VoidedReason = item.VoidedReason,
            VoidedSource = item.VoidedSource,
            VoidedQuantity = item.VoidedQuantity,
            PurchaseTime = item.PurchaseTime,
            VoidedTime = item.VoidedTime,
            ReceivedAt = now,
            ProcessedAt = now
        };
        db.GooglePlayVoidedPurchases.Add(stored);

        if (purchase is null)
        {
            stored.ProcessingStatus = "unmatched";
        }
        else
        {
            stored.PurchaseId = purchase.Id;
            stored.UserId = purchase.UserId;
            var existingClawback = await db.AiCreditTransactions.AsNoTracking()
                .SingleOrDefaultAsync(entry =>
                    entry.UserId == purchase.UserId &&
                    entry.RelatedPurchaseId == purchase.Id &&
                    entry.Type == AiCreditTransactionTypes.PurchaseClawback,
                    cancellationToken);
            var account = await db.AiCreditAccounts.SingleOrDefaultAsync(item => item.UserId == purchase.UserId, cancellationToken);
            var clawback = existingClawback is not null || !_options.AutoClawbackUnusedCredits || account is null
                ? 0
                : Math.Min(Math.Max(account.Balance, 0), Math.Max(purchase.Credits, 0));
            string? transactionId = existingClawback?.Id;
            if (clawback > 0 && account is not null)
            {
                account.Balance -= clawback;
                account.UpdatedAt = now;
                transactionId = Guid.NewGuid().ToString("N");
                db.AiCreditTransactions.Add(new AiCreditTransactionEntity
                {
                    Id = transactionId,
                    UserId = purchase.UserId,
                    Amount = -clawback,
                    Type = AiCreditTransactionTypes.PurchaseClawback,
                    Reason = AiCreditReasons.GooglePlayVoidedPurchase,
                    RelatedPurchaseId = purchase.Id,
                    IdempotencyKey = eventId,
                    BalanceAfter = account.Balance,
                    MetadataJson = JsonSerializer.Serialize(new
                    {
                        purchase.ProductId,
                        purchase.GoogleOrderId,
                        item.VoidedReason,
                        item.VoidedSource,
                        item.VoidedQuantity
                    }),
                    CreatedAt = now
                });
            }

            var totalClawback = existingClawback is null ? clawback : Math.Abs(existingClawback.Amount);
            var unrecovered = Math.Max(0, purchase.Credits - totalClawback);
            purchase.ProcessStatus = AiCreditPurchaseStatuses.Voided;
            purchase.PurchaseState = GooglePlayPurchaseStates.Canceled;
            purchase.VoidedAt = item.VoidedTime;
            purchase.VoidedReason = item.VoidedReason;
            purchase.VoidedSource = item.VoidedSource;
            purchase.ClawbackCredits = totalClawback;
            purchase.UnrecoveredCredits = unrecovered;
            purchase.ClawbackTransactionId = transactionId;
            purchase.UpdatedAt = now;
            stored.ClawbackCredits = totalClawback;
            stored.UnrecoveredCredits = unrecovered;
            stored.ClawbackTransactionId = transactionId;
            stored.ProcessingStatus = unrecovered == 0
                ? "clawed_back"
                : totalClawback > 0 ? "partial_clawback" : "manual_review";
        }

        try
        {
            await db.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return true;
        }
        catch (DbUpdateException)
        {
            await transaction.RollbackAsync(cancellationToken);
            await using var verificationDb = await dbFactory.CreateDbContextAsync(cancellationToken);
            if (await verificationDb.GooglePlayVoidedPurchases.AnyAsync(existing => existing.Id == eventId, cancellationToken)) return false;
            throw;
        }
    }

    private static string Hash(string value) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value))).ToLowerInvariant();

    private static string? Trim(string? value, int maxLength) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim()[..Math.Min(value.Trim().Length, maxLength)];
}
