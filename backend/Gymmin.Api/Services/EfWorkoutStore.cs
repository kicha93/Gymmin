using System.Text.Json;
using Gymmin.Api.Data;
using Gymmin.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Gymmin.Api.Services;

public sealed class EfWorkoutStore : IWorkoutStore
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = false
    };

    private readonly IDbContextFactory<GymminDbContext> _dbFactory;
    private readonly ILogger<EfWorkoutStore> _logger;

    public EfWorkoutStore(IDbContextFactory<GymminDbContext> dbFactory, ILogger<EfWorkoutStore> logger)
    {
        _dbFactory = dbFactory;
        _logger = logger;
    }

    public IReadOnlyList<Workout> List(string userId, bool includeDeleted = false)
    {
        using var db = _dbFactory.CreateDbContext();
        return db.Workouts
            .AsNoTracking()
            .Where(workout => workout.UserId == userId)
            .Where(workout => includeDeleted || workout.DeletedAt == null)
            .AsEnumerable()
            .OrderByDescending(workout => workout.ServerUpdatedAt)
            .Select(ToDomain)
            .Where(workout => workout is not null)
            .Cast<Workout>()
            .ToList();
    }

    public IReadOnlyList<Workout> ListChangedSince(string userId, DateTimeOffset? changedSince)
    {
        using var db = _dbFactory.CreateDbContext();
        return db.Workouts
            .AsNoTracking()
            .Where(workout => workout.UserId == userId)
            .AsEnumerable()
            .Where(workout => changedSince == null || workout.ServerUpdatedAt > changedSince)
            .OrderBy(workout => workout.ServerUpdatedAt)
            .Select(ToDomain)
            .Where(workout => workout is not null)
            .Cast<Workout>()
            .ToList();
    }

    public Workout? Get(string userId, string clientWorkoutId)
    {
        using var db = _dbFactory.CreateDbContext();
        var entity = db.Workouts
            .AsNoTracking()
            .FirstOrDefault(workout =>
                workout.UserId == userId &&
                workout.ClientWorkoutId == clientWorkoutId &&
                workout.DeletedAt == null);

        return entity is null ? null : ToDomain(entity);
    }

    public Workout Upsert(string userId, UpsertWorkoutRequest request)
    {
        using var db = _dbFactory.CreateDbContext();
        var entity = db.Workouts.FirstOrDefault(workout =>
            workout.UserId == userId &&
            workout.ClientWorkoutId == request.ClientWorkoutId);
        var existing = entity is null ? null : ToDomain(entity);
        var workout = Workout.FromRequest(userId, request, existing);

        if (entity is null)
        {
            entity = new WorkoutEntity
            {
                Id = workout.Id,
                UserId = userId,
                ClientWorkoutId = workout.ClientWorkoutId
            };
            db.Workouts.Add(entity);
        }

        Apply(entity, workout, request.ClientUpdatedAt);
        db.SaveChanges();

        return workout;
    }

    public bool Delete(string userId, string clientWorkoutId)
    {
        using var db = _dbFactory.CreateDbContext();
        var entity = db.Workouts.FirstOrDefault(workout =>
            workout.UserId == userId &&
            workout.ClientWorkoutId == clientWorkoutId);

        if (entity is null)
        {
            return false;
        }

        var existing = ToDomain(entity);
        var deleted = existing?.MarkDeleted();

        if (deleted is null)
        {
            entity.DeletedAt = DateTimeOffset.UtcNow;
            entity.ServerUpdatedAt = DateTimeOffset.UtcNow;
        }
        else
        {
            Apply(entity, deleted, entity.ClientUpdatedAt);
        }

        db.SaveChanges();
        return true;
    }

    public SyncWorkoutsResponse Sync(string userId, SyncWorkoutsRequest request)
    {
        foreach (var workout in request.Workouts ?? [])
        {
            Upsert(userId, workout);
        }

        foreach (var clientWorkoutId in request.DeletedClientWorkoutIds ?? [])
        {
            Delete(userId, clientWorkoutId);
        }

        return new SyncWorkoutsResponse(
            ListChangedSince(userId, request.LastPulledAt),
            DateTimeOffset.UtcNow);
    }

    private Workout? ToDomain(WorkoutEntity entity)
    {
        try
        {
            return JsonSerializer.Deserialize<Workout>(entity.WorkoutJson, JsonOptions);
        }
        catch (Exception error)
        {
            _logger.LogError(error, "Failed to deserialize workout {WorkoutId}.", entity.Id);
            return null;
        }
    }

    private static void Apply(WorkoutEntity entity, Workout workout, DateTimeOffset? clientUpdatedAt)
    {
        entity.Id = workout.Id;
        entity.UserId = workout.UserId;
        entity.ClientWorkoutId = workout.ClientWorkoutId;
        entity.Name = workout.Name;
        entity.Notes = workout.Notes;
        entity.Sport = workout.Sport.ToString();
        entity.ClientUpdatedAt = clientUpdatedAt;
        entity.ServerUpdatedAt = workout.UpdatedAt;
        entity.DeletedAt = workout.DeletedAt;
        entity.WorkoutJson = JsonSerializer.Serialize(workout, JsonOptions);
    }
}
