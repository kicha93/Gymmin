using System.Text.Json;
using Gymmin.Api.Data;
using Gymmin.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Gymmin.Api.Services;

public sealed class EfWorkoutPlanJobStore : IWorkoutPlanJobStore
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = false
    };

    private readonly IDbContextFactory<GymminDbContext> _dbFactory;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IAiCreditService _credits;
    private readonly ILogger<EfWorkoutPlanJobStore> _logger;

    public EfWorkoutPlanJobStore(
        IDbContextFactory<GymminDbContext> dbFactory,
        IServiceScopeFactory scopeFactory,
        IAiCreditService credits,
        ILogger<EfWorkoutPlanJobStore> logger)
    {
        _dbFactory = dbFactory;
        _scopeFactory = scopeFactory;
        _credits = credits;
        _logger = logger;
        ResumeProcessingJobs();
    }

    public CreateWorkoutPlanJobResponse Start(CreateWorkoutPlanRequest request, string userId, AiCreditJobCharge? charge = null)
    {
        return StartJob("plan", request.Language, JsonSerializer.Serialize(request, JsonOptions), userId, charge);
    }

    public CreateWorkoutPlanJobResponse StartRewrite(CreateWorkoutRewriteRequest request, string userId, AiCreditJobCharge? charge = null)
    {
        return StartJob("rewrite", request.Language, JsonSerializer.Serialize(request, JsonOptions), userId, charge);
    }

    public WorkoutPlanJobStatusResponse? Get(string jobId, string userId)
    {
        using var db = _dbFactory.CreateDbContext();
        var job = db.WorkoutCreatorJobs.AsNoTracking().FirstOrDefault(item => item.Id == jobId);

        if (job is null || job.UserId != userId)
        {
            return null;
        }

        return new WorkoutPlanJobStatusResponse(job.Status, DeserializeResult(job.ResultJson), job.Error);
    }

    private CreateWorkoutPlanJobResponse StartJob(string jobType, string? language, string requestJson, string userId, AiCreditJobCharge? charge)
    {
        var now = DateTimeOffset.UtcNow;
        var job = new WorkoutCreatorJobEntity
        {
            CreatedAt = now,
            Id = Guid.NewGuid().ToString("N"),
            JobType = jobType,
            Language = language ?? "",
            RequestJson = requestJson,
            Status = "processing",
            UpdatedAt = now,
            UserId = userId,
            IdempotencyKey = charge?.IdempotencyKey?.Trim(),
            TokenCost = charge?.Cost ?? 0
        };

        using (var db = _dbFactory.CreateDbContext())
        {
            if (!string.IsNullOrWhiteSpace(charge?.IdempotencyKey))
            {
                var existing = db.WorkoutCreatorJobs
                    .AsNoTracking()
                    .FirstOrDefault(item =>
                        item.UserId == userId &&
                        item.JobType == jobType &&
                        item.IdempotencyKey == charge.IdempotencyKey.Trim());
                if (existing is not null)
                {
                    return new CreateWorkoutPlanJobResponse(existing.Status, existing.Id);
                }
            }

            var consume = charge is null
                ? new AiCreditConsumeResult(true, null, 0)
                : _credits.ConsumeForJob(userId, job.Id, charge.Cost, charge.Reason, charge.IdempotencyKey);
            if (!consume.Success)
            {
                throw new InsufficientAiCreditsException();
            }

            if (!string.IsNullOrWhiteSpace(consume.ExistingJobId))
            {
                var existing = db.WorkoutCreatorJobs
                    .AsNoTracking()
                    .FirstOrDefault(item => item.UserId == userId && item.Id == consume.ExistingJobId);
                if (existing is not null)
                {
                    return new CreateWorkoutPlanJobResponse(existing.Status, existing.Id);
                }
            }

            job.TokenTransactionId = consume.TransactionId;
            db.WorkoutCreatorJobs.Add(job);
            try
            {
                db.SaveChanges();
            }
            catch
            {
                if (charge is not null && charge.Cost > 0)
                {
                    _credits.RefundForJob(userId, job.Id, "JobCreationFailed");
                }

                throw;
            }
        }

        StartProcessing(job.Id);
        return new CreateWorkoutPlanJobResponse("processing", job.Id);
    }

    private void ResumeProcessingJobs()
    {
        using var db = _dbFactory.CreateDbContext();
        var jobIds = db.WorkoutCreatorJobs
            .AsNoTracking()
            .Where(job => job.Status == "processing")
            .Select(job => job.Id)
            .ToList();

        foreach (var jobId in jobIds)
        {
            _logger.LogInformation("Resuming database workout creator job {JobId} after backend startup.", jobId);
            StartProcessing(jobId);
        }
    }

    private void StartProcessing(string jobId)
    {
        _ = Task.Run(async () =>
        {
            string? userId = null;
            string? jobType = null;
            try
            {
                WorkoutCreatorJobEntity? job;
                using (var db = _dbFactory.CreateDbContext())
                {
                    job = db.WorkoutCreatorJobs.AsNoTracking().FirstOrDefault(item => item.Id == jobId);
                }

                if (job is null)
                {
                    return;
                }

                userId = job.UserId;
                jobType = job.JobType;
                using var scope = _scopeFactory.CreateScope();
                var generator = scope.ServiceProvider.GetRequiredService<IWorkoutPlanGenerator>();
                var result = job.JobType == "rewrite"
                    ? await generator.RewritePlanAsync(
                        JsonSerializer.Deserialize<CreateWorkoutRewriteRequest>(job.RequestJson, JsonOptions)
                            ?? throw new InvalidOperationException("Rewrite request is missing."),
                        CancellationToken.None)
                    : await generator.CreatePlanAsync(
                        JsonSerializer.Deserialize<CreateWorkoutPlanRequest>(job.RequestJson, JsonOptions)
                            ?? throw new InvalidOperationException("Plan request is missing."),
                        CancellationToken.None);

                UpdateJob(jobId, "completed", result, null);
            }
            catch (Exception error)
            {
                _logger.LogError(error, "Database workout creator job {JobId} failed. UserId={UserId} JobType={JobType}", jobId, userId ?? "unknown", jobType ?? "unknown");
                UpdateJob(jobId, "failed", null, error.Message, refundToken: true);
            }
        });
    }

    private void UpdateJob(string jobId, string status, CreateWorkoutPlanResponse? result, string? error, bool refundToken = false)
    {
        using var db = _dbFactory.CreateDbContext();
        var job = db.WorkoutCreatorJobs.FirstOrDefault(item => item.Id == jobId);

        if (job is null)
        {
            return;
        }

        job.CompletedAt = status is "completed" or "failed" ? DateTimeOffset.UtcNow : null;
        job.Error = error;
        job.Model = result?.Model;
        job.ReasoningEffort = result?.ReasoningEffort;
        job.ResultJson = result is null ? null : JsonSerializer.Serialize(result, JsonOptions);
        job.Status = status;
        job.UpdatedAt = DateTimeOffset.UtcNow;

        if (refundToken && job.TokenCost > 0 && _credits.RefundForJob(job.UserId, jobId, AiCreditReasons.TechnicalFailureRefund))
        {
            job.TokenRefundedAt = DateTimeOffset.UtcNow;
            job.TokenRefundReason = AiCreditReasons.TechnicalFailureRefund;
        }

        db.SaveChanges();
    }

    private static CreateWorkoutPlanResponse? DeserializeResult(string? resultJson)
    {
        if (string.IsNullOrWhiteSpace(resultJson))
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<CreateWorkoutPlanResponse>(resultJson, JsonOptions);
        }
        catch
        {
            return null;
        }
    }
}
