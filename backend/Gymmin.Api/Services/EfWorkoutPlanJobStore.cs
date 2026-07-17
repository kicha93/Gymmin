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
    private readonly IAiCreditService _credits;

    public EfWorkoutPlanJobStore(
        IDbContextFactory<GymminDbContext> dbFactory,
        IAiCreditService credits)
    {
        _dbFactory = dbFactory;
        _credits = credits;
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
        var idempotencyKey = charge?.IdempotencyKey?.Trim();
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
            IdempotencyKey = idempotencyKey,
            TokenCost = charge?.Cost ?? 0
        };

        using (var db = _dbFactory.CreateDbContext())
        {
            using var transaction = db.Database.BeginTransaction();
            if (!string.IsNullOrWhiteSpace(idempotencyKey))
            {
                var existing = db.WorkoutCreatorJobs
                    .AsNoTracking()
                    .FirstOrDefault(item =>
                        item.UserId == userId &&
                        item.JobType == jobType &&
                        item.IdempotencyKey == idempotencyKey);
                if (existing is not null)
                {
                    transaction.Commit();
                    return new CreateWorkoutPlanJobResponse(existing.Status, existing.Id);
                }
            }

            var consume = charge is null
                ? new AiCreditConsumeResult(true, null, 0)
                : _credits is EfAiCreditService efCredits
                    ? efCredits.ConsumeForJob(db, userId, job.Id, charge.Cost, charge.Reason, charge.IdempotencyKey)
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
                    transaction.Commit();
                    return new CreateWorkoutPlanJobResponse(existing.Status, existing.Id);
                }
            }

            job.TokenTransactionId = consume.TransactionId;
            db.WorkoutCreatorJobs.Add(job);
            try
            {
                db.SaveChanges();
                transaction.Commit();
            }
            catch (DbUpdateException)
            {
                transaction.Rollback();

                if (!string.IsNullOrWhiteSpace(idempotencyKey))
                {
                    var existing = db.WorkoutCreatorJobs
                        .AsNoTracking()
                        .FirstOrDefault(item =>
                            item.UserId == userId &&
                            item.JobType == jobType &&
                            item.IdempotencyKey == idempotencyKey);
                    if (existing is not null)
                    {
                        return new CreateWorkoutPlanJobResponse(existing.Status, existing.Id);
                    }
                }

                throw;
            }
        }

        return new CreateWorkoutPlanJobResponse("processing", job.Id);
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
