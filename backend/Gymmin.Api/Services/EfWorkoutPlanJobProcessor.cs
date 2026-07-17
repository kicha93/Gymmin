using System.Text.Json;
using Gymmin.Api.Data;
using Gymmin.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Gymmin.Api.Services;

public sealed record ClaimedWorkoutPlanJob(
    string Id,
    string UserId,
    string JobType,
    string RequestJson,
    string LeaseId);

public sealed class EfWorkoutPlanJobProcessor
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly IDbContextFactory<GymminDbContext> _dbFactory;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IAiCreditService _credits;
    private readonly ILogger<EfWorkoutPlanJobProcessor> _logger;

    public EfWorkoutPlanJobProcessor(
        IDbContextFactory<GymminDbContext> dbFactory,
        IServiceScopeFactory scopeFactory,
        IAiCreditService credits,
        ILogger<EfWorkoutPlanJobProcessor> logger)
    {
        _dbFactory = dbFactory;
        _scopeFactory = scopeFactory;
        _credits = credits;
        _logger = logger;
    }

    public async Task<bool> ProcessNextAsync(TimeSpan leaseDuration, CancellationToken cancellationToken)
    {
        var claimed = await TryClaimNextAsync(leaseDuration, cancellationToken);
        if (claimed is null)
        {
            return false;
        }

        using var heartbeatCancellation = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        var heartbeat = RenewLeaseUntilCancelledAsync(
            claimed.Id,
            claimed.LeaseId,
            leaseDuration,
            heartbeatCancellation.Token);

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var generator = scope.ServiceProvider.GetRequiredService<IWorkoutPlanGenerator>();
            var result = claimed.JobType == "rewrite"
                ? await generator.RewritePlanAsync(
                    JsonSerializer.Deserialize<CreateWorkoutRewriteRequest>(claimed.RequestJson, JsonOptions)
                        ?? throw new InvalidOperationException("Rewrite request is missing."),
                    cancellationToken)
                : await generator.CreatePlanAsync(
                    JsonSerializer.Deserialize<CreateWorkoutPlanRequest>(claimed.RequestJson, JsonOptions)
                        ?? throw new InvalidOperationException("Plan request is missing."),
                    cancellationToken);

            await CompleteAsync(claimed, result, cancellationToken);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            await ReleaseLeaseAsync(claimed.Id, claimed.LeaseId, CancellationToken.None);
        }
        catch (Exception error)
        {
            _logger.LogError(
                error,
                "Database workout creator job {JobId} failed. UserId={UserId} JobType={JobType}",
                claimed.Id,
                claimed.UserId,
                claimed.JobType);
            await FailAsync(claimed, error.Message, CancellationToken.None);
        }
        finally
        {
            heartbeatCancellation.Cancel();
            try
            {
                await heartbeat;
            }
            catch (OperationCanceledException)
            {
                // Expected when processing completes or the host stops.
            }
        }

        return true;
    }

    public async Task<ClaimedWorkoutPlanJob?> TryClaimNextAsync(
        TimeSpan leaseDuration,
        CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var leaseId = Guid.NewGuid().ToString("N");
        await using var db = await _dbFactory.CreateDbContextAsync(cancellationToken);
        var candidates = await db.WorkoutCreatorJobs
            .AsNoTracking()
            .Where(job =>
                job.Status == "processing" &&
                (job.LeaseExpiresAt == null || job.LeaseExpiresAt <= now))
            .OrderBy(job => job.CreatedAt)
            .Select(job => job.Id)
            .Take(10)
            .ToListAsync(cancellationToken);

        foreach (var candidateId in candidates)
        {
            var claimed = await db.WorkoutCreatorJobs
                .Where(job =>
                    job.Id == candidateId &&
                    job.Status == "processing" &&
                    (job.LeaseExpiresAt == null || job.LeaseExpiresAt <= now))
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(job => job.LeaseId, leaseId)
                    .SetProperty(job => job.LeaseExpiresAt, now.Add(leaseDuration))
                    .SetProperty(job => job.AttemptCount, job => job.AttemptCount + 1)
                    .SetProperty(job => job.UpdatedAt, now), cancellationToken);
            if (claimed != 1)
            {
                continue;
            }

            return await db.WorkoutCreatorJobs
                .AsNoTracking()
                .Where(job => job.Id == candidateId && job.LeaseId == leaseId)
                .Select(job => new ClaimedWorkoutPlanJob(
                    job.Id,
                    job.UserId,
                    job.JobType,
                    job.RequestJson,
                    leaseId))
                .SingleAsync(cancellationToken);
        }

        return null;
    }

    private async Task RenewLeaseUntilCancelledAsync(
        string jobId,
        string leaseId,
        TimeSpan leaseDuration,
        CancellationToken cancellationToken)
    {
        var heartbeatInterval = TimeSpan.FromSeconds(Math.Clamp(leaseDuration.TotalSeconds / 3, 5, 60));
        using var timer = new PeriodicTimer(heartbeatInterval);
        while (await timer.WaitForNextTickAsync(cancellationToken))
        {
            await using var db = await _dbFactory.CreateDbContextAsync(cancellationToken);
            var now = DateTimeOffset.UtcNow;
            var renewed = await db.WorkoutCreatorJobs
                .Where(job => job.Id == jobId && job.Status == "processing" && job.LeaseId == leaseId)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(job => job.LeaseExpiresAt, now.Add(leaseDuration))
                    .SetProperty(job => job.UpdatedAt, now), cancellationToken);
            if (renewed != 1)
            {
                return;
            }
        }
    }

    private async Task CompleteAsync(
        ClaimedWorkoutPlanJob claimed,
        CreateWorkoutPlanResponse result,
        CancellationToken cancellationToken)
    {
        await using var db = await _dbFactory.CreateDbContextAsync(cancellationToken);
        var now = DateTimeOffset.UtcNow;
        var updated = await db.WorkoutCreatorJobs
            .Where(job =>
                job.Id == claimed.Id &&
                job.Status == "processing" &&
                job.LeaseId == claimed.LeaseId)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(job => job.CompletedAt, now)
                .SetProperty(job => job.Error, (string?)null)
                .SetProperty(job => job.Model, result.Model)
                .SetProperty(job => job.ReasoningEffort, result.ReasoningEffort)
                .SetProperty(job => job.ResultJson, JsonSerializer.Serialize(result, JsonOptions))
                .SetProperty(job => job.Status, "completed")
                .SetProperty(job => job.UpdatedAt, now)
                .SetProperty(job => job.LeaseId, (string?)null)
                .SetProperty(job => job.LeaseExpiresAt, (DateTimeOffset?)null), cancellationToken);
        if (updated != 1)
        {
            _logger.LogWarning("Ignoring stale completion for workout creator job {JobId}.", claimed.Id);
        }
    }

    private async Task FailAsync(
        ClaimedWorkoutPlanJob claimed,
        string error,
        CancellationToken cancellationToken)
    {
        await using var db = await _dbFactory.CreateDbContextAsync(cancellationToken);
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var job = await db.WorkoutCreatorJobs.FirstOrDefaultAsync(
            item =>
                item.Id == claimed.Id &&
                item.Status == "processing" &&
                item.LeaseId == claimed.LeaseId,
            cancellationToken);
        if (job is null)
        {
            return;
        }

        var now = DateTimeOffset.UtcNow;
        job.CompletedAt = now;
        job.Error = error;
        job.Status = "failed";
        job.UpdatedAt = now;
        job.LeaseId = null;
        job.LeaseExpiresAt = null;

        var refunded = job.TokenCost > 0 &&
            (_credits is EfAiCreditService efCredits
                ? efCredits.RefundForJob(db, job.UserId, job.Id, AiCreditReasons.TechnicalFailureRefund)
                : _credits.RefundForJob(job.UserId, job.Id, AiCreditReasons.TechnicalFailureRefund));
        if (refunded)
        {
            job.TokenRefundedAt = now;
            job.TokenRefundReason = AiCreditReasons.TechnicalFailureRefund;
        }

        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
    }

    private async Task ReleaseLeaseAsync(string jobId, string leaseId, CancellationToken cancellationToken)
    {
        await using var db = await _dbFactory.CreateDbContextAsync(cancellationToken);
        await db.WorkoutCreatorJobs
            .Where(job => job.Id == jobId && job.Status == "processing" && job.LeaseId == leaseId)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(job => job.LeaseId, (string?)null)
                .SetProperty(job => job.LeaseExpiresAt, (DateTimeOffset?)null)
                .SetProperty(job => job.UpdatedAt, DateTimeOffset.UtcNow), cancellationToken);
    }
}

public sealed class WorkoutPlanJobWorker(
    EfWorkoutPlanJobProcessor processor,
    IConfiguration configuration,
    ILogger<WorkoutPlanJobWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var leaseDuration = TimeSpan.FromSeconds(Math.Clamp(
            configuration.GetValue("Gymmin:WorkoutCreator:Worker:LeaseSeconds", 300),
            30,
            900));
        var idleDelay = TimeSpan.FromMilliseconds(Math.Clamp(
            configuration.GetValue("Gymmin:WorkoutCreator:Worker:PollMilliseconds", 500),
            100,
            10_000));

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                if (!await processor.ProcessNextAsync(leaseDuration, stoppingToken))
                {
                    await Task.Delay(idleDelay, stoppingToken);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception error)
            {
                logger.LogError(error, "Workout creator worker iteration failed.");
                await Task.Delay(idleDelay, stoppingToken);
            }
        }
    }
}
