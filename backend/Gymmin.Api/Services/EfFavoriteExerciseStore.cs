using Gymmin.Api.Data;
using Gymmin.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Gymmin.Api.Services;

public sealed class EfFavoriteExerciseStore : IFavoriteExerciseStore
{
    private const int MaxFavorites = 1_000;
    private readonly IDbContextFactory<GymminDbContext> _dbFactory;

    public EfFavoriteExerciseStore(IDbContextFactory<GymminDbContext> dbFactory)
    {
        _dbFactory = dbFactory;
    }

    public FavoriteExercisesResponse Get(string userId)
    {
        using var db = _dbFactory.CreateDbContext();
        var favorites = db.UserFavoriteExercises
            .AsNoTracking()
            .Where(favorite => favorite.UserId == userId && favorite.DeletedAt == null)
            .AsEnumerable()
            .OrderBy(favorite => favorite.ExerciseId)
            .Select(ToDomain)
            .ToList();

        return new FavoriteExercisesResponse(favorites, DateTimeOffset.UtcNow);
    }

    public FavoriteExercisesResponse Put(string userId, PutFavoriteExercisesRequest request)
    {
        using var db = _dbFactory.CreateDbContext();
        var now = DateTimeOffset.UtcNow;
        var incomingById = Normalize(request.Favorites, now)
            .Where(favorite => favorite.DeletedAt is null)
            .Take(MaxFavorites)
            .ToDictionary(favorite => favorite.ExerciseId, StringComparer.OrdinalIgnoreCase);
        var existing = db.UserFavoriteExercises
            .Where(favorite => favorite.UserId == userId)
            .ToList();

        foreach (var entity in existing)
        {
            if (incomingById.TryGetValue(entity.ExerciseId, out var favorite))
            {
                Apply(entity, favorite, userId);
            }
            else if (entity.DeletedAt is null)
            {
                entity.DeletedAt = now;
                entity.UpdatedAt = now;
            }
        }

        var existingIds = existing.Select(favorite => favorite.ExerciseId).ToHashSet(StringComparer.OrdinalIgnoreCase);
        foreach (var favorite in incomingById.Values.Where(favorite => !existingIds.Contains(favorite.ExerciseId)))
        {
            var entity = new UserFavoriteExerciseEntity
            {
                Id = Guid.NewGuid()
            };
            Apply(entity, favorite, userId);
            db.UserFavoriteExercises.Add(entity);
        }

        db.SaveChanges();
        return Get(userId);
    }

    public FavoriteExercisesResponse Sync(string userId, SyncFavoriteExercisesRequest request)
    {
        using var db = _dbFactory.CreateDbContext();
        var now = DateTimeOffset.UtcNow;
        var existing = db.UserFavoriteExercises
            .Where(favorite => favorite.UserId == userId)
            .ToList();

        foreach (var incoming in Normalize(request.Favorites, now))
        {
            UpsertIfNewer(db, existing, userId, incoming);
        }

        foreach (var exerciseId in NormalizeExerciseIds(request.DeletedExerciseIds).Take(MaxFavorites))
        {
            var entity = existing.FirstOrDefault(favorite => favorite.ExerciseId.Equals(exerciseId, StringComparison.OrdinalIgnoreCase));
            var deleted = new FavoriteExercise(
                exerciseId,
                entity?.CreatedAt ?? now,
                now,
                now);
            UpsertIfNewer(db, existing, userId, deleted);
        }

        db.SaveChanges();

        var changed = db.UserFavoriteExercises
            .AsNoTracking()
            .Where(favorite => favorite.UserId == userId)
            .AsEnumerable()
            .Where(favorite => request.LastPulledAt is null || favorite.UpdatedAt > request.LastPulledAt)
            .OrderBy(favorite => favorite.ExerciseId)
            .Select(ToDomain)
            .ToList();

        return new FavoriteExercisesResponse(changed, now);
    }

    private static void UpsertIfNewer(
        GymminDbContext db,
        List<UserFavoriteExerciseEntity> existing,
        string userId,
        FavoriteExercise incoming)
    {
        var entity = existing.FirstOrDefault(favorite => favorite.ExerciseId.Equals(incoming.ExerciseId, StringComparison.OrdinalIgnoreCase));
        if (entity is null)
        {
            entity = new UserFavoriteExerciseEntity
            {
                Id = Guid.NewGuid()
            };
            Apply(entity, incoming, userId);
            existing.Add(entity);
            db.UserFavoriteExercises.Add(entity);
            return;
        }

        if (ShouldReplace(ToDomain(entity), incoming))
        {
            Apply(entity, incoming, userId);
        }
    }

    private static bool ShouldReplace(FavoriteExercise existing, FavoriteExercise incoming)
    {
        if (incoming.UpdatedAt > existing.UpdatedAt)
        {
            return true;
        }

        if (incoming.UpdatedAt < existing.UpdatedAt)
        {
            return false;
        }

        return incoming.DeletedAt is not null && existing.DeletedAt is null;
    }

    private static FavoriteExercise ToDomain(UserFavoriteExerciseEntity entity)
    {
        return new FavoriteExercise(entity.ExerciseId, entity.CreatedAt, entity.UpdatedAt, entity.DeletedAt);
    }

    private static void Apply(UserFavoriteExerciseEntity entity, FavoriteExercise favorite, string userId)
    {
        entity.UserId = userId;
        entity.ExerciseId = favorite.ExerciseId;
        entity.CreatedAt = favorite.CreatedAt;
        entity.UpdatedAt = favorite.UpdatedAt;
        entity.DeletedAt = favorite.DeletedAt;
    }

    private static IReadOnlyList<FavoriteExercise> Normalize(IReadOnlyList<FavoriteExercise>? favorites, DateTimeOffset now)
    {
        var byExerciseId = new Dictionary<string, FavoriteExercise>(StringComparer.OrdinalIgnoreCase);

        foreach (var favorite in favorites ?? [])
        {
            var exerciseId = NormalizeExerciseId(favorite.ExerciseId);
            if (string.IsNullOrWhiteSpace(exerciseId))
            {
                continue;
            }

            var createdAt = favorite.CreatedAt == default ? now : favorite.CreatedAt;
            var updatedAt = favorite.UpdatedAt == default ? createdAt : favorite.UpdatedAt;
            var normalized = favorite with
            {
                ExerciseId = exerciseId,
                CreatedAt = createdAt,
                UpdatedAt = updatedAt
            };

            if (!byExerciseId.TryGetValue(exerciseId, out var existing) || ShouldReplace(existing, normalized))
            {
                byExerciseId[exerciseId] = normalized;
            }
        }

        return byExerciseId.Values
            .OrderBy(favorite => favorite.ExerciseId)
            .Take(MaxFavorites)
            .ToList();
    }

    private static IReadOnlyList<string> NormalizeExerciseIds(IReadOnlyList<string>? exerciseIds)
    {
        return (exerciseIds ?? [])
            .Select(NormalizeExerciseId)
            .Where(exerciseId => !string.IsNullOrWhiteSpace(exerciseId))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static string NormalizeExerciseId(string? exerciseId)
    {
        return (exerciseId ?? "").Trim();
    }
}
