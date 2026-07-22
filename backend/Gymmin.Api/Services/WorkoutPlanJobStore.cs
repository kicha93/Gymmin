using System.Collections.Concurrent;
using System.Text.Json;
using Gymmin.Api.Domain;

namespace Gymmin.Api.Services;

public interface IWorkoutPlanJobStore
{
    CreateWorkoutPlanJobResponse Start(CreateWorkoutPlanRequest request, string userId, AiCreditJobCharge? charge = null);
    CreateWorkoutPlanJobResponse StartRewrite(CreateWorkoutRewriteRequest request, string userId, AiCreditJobCharge? charge = null);
    WorkoutPlanJobStatusResponse? Get(string jobId, string userId);
}

public sealed class FileBackedWorkoutPlanJobStore : IWorkoutPlanJobStore, IUserScopedDataStore
{
    private const string PublicFailureMessage = "Workout generation failed. Try again.";
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true
    };

    private readonly ConcurrentDictionary<string, PersistedWorkoutPlanJob> _jobs = new();
    private readonly object _fileLock = new();
    private readonly string _storagePath;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IAiCreditService _credits;
    private readonly ILogger<FileBackedWorkoutPlanJobStore> _logger;

    public FileBackedWorkoutPlanJobStore(
        IServiceScopeFactory scopeFactory,
        IWebHostEnvironment environment,
        IAiCreditService credits,
        ILogger<FileBackedWorkoutPlanJobStore> logger)
    {
        _scopeFactory = scopeFactory;
        _credits = credits;
        _logger = logger;
        _storagePath = Path.Combine(environment.ContentRootPath, "App_Data", "workout-creator-jobs.json");

        LoadJobs();
        ResumeProcessingJobs();
    }

    public CreateWorkoutPlanJobResponse Start(CreateWorkoutPlanRequest request, string userId, AiCreditJobCharge? charge = null)
    {
        return StartJob("plan", request, null, userId, charge);
    }

    public CreateWorkoutPlanJobResponse StartRewrite(CreateWorkoutRewriteRequest request, string userId, AiCreditJobCharge? charge = null)
    {
        return StartJob("rewrite", null, request, userId, charge);
    }

    private CreateWorkoutPlanJobResponse StartJob(
        string jobType,
        CreateWorkoutPlanRequest? request,
        CreateWorkoutRewriteRequest? rewriteRequest,
        string userId,
        AiCreditJobCharge? charge)
    {
        if (!string.IsNullOrWhiteSpace(charge?.IdempotencyKey))
        {
            var existing = _jobs.Values.FirstOrDefault(job =>
                job.UserId == userId &&
                job.JobType == jobType &&
                job.IdempotencyKey == charge.IdempotencyKey);
            if (existing is not null)
            {
                return new CreateWorkoutPlanJobResponse(existing.Status, existing.JobId);
            }
        }

        var jobId = Guid.NewGuid().ToString("N");
        var now = DateTimeOffset.UtcNow;
        var consume = charge is null
            ? new AiCreditConsumeResult(true, null, 0)
            : _credits.ConsumeForJob(userId, jobId, charge.Cost, charge.Reason, charge.IdempotencyKey);
        if (!consume.Success)
        {
            throw new InsufficientAiCreditsException();
        }

        if (!string.IsNullOrWhiteSpace(consume.ExistingJobId) &&
            _jobs.TryGetValue(consume.ExistingJobId, out var consumedJob))
        {
            return new CreateWorkoutPlanJobResponse(consumedJob.Status, consumedJob.JobId);
        }

        _jobs[jobId] = new PersistedWorkoutPlanJob(
            jobId,
            request,
            "processing",
            null,
            null,
            now,
            now,
            jobType,
            rewriteRequest,
            userId,
            charge?.Cost ?? 0,
            consume.TransactionId,
            null,
            null,
            charge?.IdempotencyKey);

        SaveJobs();
        StartProcessing(jobId);

        return new CreateWorkoutPlanJobResponse("processing", jobId);
    }

    public WorkoutPlanJobStatusResponse? Get(string jobId, string userId)
    {
        if (!_jobs.TryGetValue(jobId, out var job))
        {
            return null;
        }

        // Legacy jobs created before auth ownership was stored do not have UserId.
        if (!string.IsNullOrWhiteSpace(job.UserId) && job.UserId != userId)
        {
            return null;
        }

        return new WorkoutPlanJobStatusResponse(job.Status, job.Result, job.Error);
    }

    public bool DeleteUserData(string userId)
    {
        var removed = false;
        foreach (var job in _jobs.Values.Where(job => job.UserId == userId).ToList())
        {
            removed = _jobs.TryRemove(job.JobId, out _) || removed;
        }

        if (removed)
        {
            SaveJobs();
        }

        return removed;
    }

    private void ResumeProcessingJobs()
    {
        foreach (var job in _jobs.Values.Where(job => job.Status == "processing"))
        {
            _logger.LogInformation("Resuming workout creator job {JobId} after backend startup.", job.JobId);
            StartProcessing(job.JobId);
        }
    }

    private void StartProcessing(string jobId)
    {
        _ = Task.Run(async () =>
        {
            if (!_jobs.TryGetValue(jobId, out var job))
            {
                return;
            }

            try
            {
                using var scope = _scopeFactory.CreateScope();
                var generator = scope.ServiceProvider.GetRequiredService<IWorkoutPlanGenerator>();
                var result = job.JobType == "rewrite"
                    ? await generator.RewritePlanAsync(
                        job.RewriteRequest ?? throw new InvalidOperationException("Rewrite request is missing."),
                        CancellationToken.None)
                    : await generator.CreatePlanAsync(
                        job.Request ?? throw new InvalidOperationException("Plan request is missing."),
                        CancellationToken.None);
                UpdateJob(jobId, "completed", result, null);
            }
            catch (Exception error)
            {
                _logger.LogError(error, "Workout creator job {JobId} failed. UserId={UserId} JobType={JobType}", jobId, job.UserId, job.JobType);
                UpdateJob(jobId, "failed", null, PublicFailureMessage, refundToken: true);
            }
        });
    }

    private void UpdateJob(string jobId, string status, CreateWorkoutPlanResponse? result, string? error, bool refundToken = false)
    {
        if (!_jobs.TryGetValue(jobId, out var current))
        {
            return;
        }

        var tokenRefundedAt = current.TokenRefundedAt;
        var tokenRefundReason = current.TokenRefundReason;
        if (refundToken &&
            current.TokenCost > 0 &&
            !string.IsNullOrWhiteSpace(current.UserId) &&
            _credits.RefundForJob(current.UserId, jobId, AiCreditReasons.TechnicalFailureRefund))
        {
            tokenRefundedAt = DateTimeOffset.UtcNow;
            tokenRefundReason = AiCreditReasons.TechnicalFailureRefund;
        }

        _jobs[jobId] = current with
        {
            Error = error,
            Result = result,
            Status = status,
            UpdatedAt = DateTimeOffset.UtcNow,
            TokenRefundedAt = tokenRefundedAt,
            TokenRefundReason = tokenRefundReason
        };

        SaveJobs();
    }

    private void LoadJobs()
    {
        try
        {
            if (!File.Exists(_storagePath))
            {
                return;
            }

            var json = File.ReadAllText(_storagePath);
            var storedJobs = JsonSerializer.Deserialize<List<PersistedWorkoutPlanJob>>(json, JsonOptions);

            if (storedJobs is null)
            {
                return;
            }

            foreach (var job in storedJobs.Where(job => !string.IsNullOrWhiteSpace(job.JobId)))
            {
                _jobs[job.JobId] = job;
            }
        }
        catch (Exception error)
        {
            _logger.LogError(error, "Failed to load workout creator jobs from {StoragePath}.", _storagePath);
        }
    }

    private void SaveJobs()
    {
        lock (_fileLock)
        {
            Directory.CreateDirectory(Path.GetDirectoryName(_storagePath)!);

            var jobs = _jobs.Values
                .OrderByDescending(job => job.UpdatedAt)
                .ToList();
            var json = JsonSerializer.Serialize(jobs, JsonOptions);
            var tempPath = $"{_storagePath}.tmp";

            File.WriteAllText(tempPath, json);

            if (File.Exists(_storagePath))
            {
                File.Delete(_storagePath);
            }

            File.Move(tempPath, _storagePath);
        }
    }

    private sealed record PersistedWorkoutPlanJob(
        string JobId,
        CreateWorkoutPlanRequest? Request,
        string Status,
        CreateWorkoutPlanResponse? Result,
        string? Error,
        DateTimeOffset CreatedAt,
        DateTimeOffset UpdatedAt,
        string JobType = "plan",
        CreateWorkoutRewriteRequest? RewriteRequest = null,
        string? UserId = null,
        int TokenCost = 0,
        string? TokenTransactionId = null,
        DateTimeOffset? TokenRefundedAt = null,
        string? TokenRefundReason = null,
        string? IdempotencyKey = null);
}
