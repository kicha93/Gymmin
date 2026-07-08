using System.Text.Json;
using Gymmin.Api.Domain;

namespace Gymmin.Api.Services;

public interface IFavoriteExerciseStore
{
    FavoriteExercisesResponse Get(string userId);
    FavoriteExercisesResponse Put(string userId, PutFavoriteExercisesRequest request);
    FavoriteExercisesResponse Sync(string userId, SyncFavoriteExercisesRequest request);
}

public sealed class FileBackedFavoriteExerciseStore : IFavoriteExerciseStore, IUserScopedDataStore
{
    private const int MaxFavorites = 1_000;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true
    };

    private readonly object _gate = new();
    private readonly string _filePath;
    private readonly ILogger<FileBackedFavoriteExerciseStore> _logger;
    private Dictionary<string, List<FavoriteExercise>> _favoritesByUserId = [];

    public FileBackedFavoriteExerciseStore(IWebHostEnvironment environment, ILogger<FileBackedFavoriteExerciseStore> logger)
    {
        _logger = logger;
        var dataDirectory = Path.Combine(environment.ContentRootPath, "App_Data");
        Directory.CreateDirectory(dataDirectory);
        _filePath = Path.Combine(dataDirectory, "favorite-exercises.json");
        _favoritesByUserId = Load();
    }

    public FavoriteExercisesResponse Get(string userId)
    {
        lock (_gate)
        {
            var favorites = GetUserFavorites(userId)
                .Where(favorite => favorite.DeletedAt is null)
                .OrderBy(favorite => favorite.ExerciseId)
                .ToList();

            return new FavoriteExercisesResponse(favorites, DateTimeOffset.UtcNow);
        }
    }

    public FavoriteExercisesResponse Put(string userId, PutFavoriteExercisesRequest request)
    {
        lock (_gate)
        {
            var now = DateTimeOffset.UtcNow;
            _favoritesByUserId[userId] = Normalize(request.Favorites, now)
                .Where(favorite => favorite.DeletedAt is null)
                .Take(MaxFavorites)
                .Select(favorite => favorite with { UpdatedAt = favorite.UpdatedAt == default ? now : favorite.UpdatedAt })
                .ToList();
            Save();
            return Get(userId);
        }
    }

    public FavoriteExercisesResponse Sync(string userId, SyncFavoriteExercisesRequest request)
    {
        lock (_gate)
        {
            var now = DateTimeOffset.UtcNow;
            var merged = GetUserFavorites(userId);

            foreach (var incoming in Normalize(request.Favorites, now))
            {
                merged = MergeOne(merged, incoming);
            }

            foreach (var exerciseId in NormalizeExerciseIds(request.DeletedExerciseIds).Take(MaxFavorites))
            {
                var existing = merged.FirstOrDefault(favorite => favorite.ExerciseId == exerciseId);
                var deleted = new FavoriteExercise(
                    exerciseId,
                    existing?.CreatedAt ?? now,
                    now,
                    now);
                merged = MergeOne(merged, deleted);
            }

            _favoritesByUserId[userId] = merged.Take(MaxFavorites).ToList();
            Save();

            var responseFavorites = merged
                .Where(favorite => request.LastPulledAt is null || favorite.UpdatedAt > request.LastPulledAt)
                .OrderBy(favorite => favorite.ExerciseId)
                .ToList();

            return new FavoriteExercisesResponse(responseFavorites, now);
        }
    }

    public bool DeleteUserData(string userId)
    {
        lock (_gate)
        {
            var removed = _favoritesByUserId.Remove(userId);
            if (removed)
            {
                Save();
            }

            return removed;
        }
    }

    private List<FavoriteExercise> GetUserFavorites(string userId)
    {
        return _favoritesByUserId.TryGetValue(userId, out var favorites)
            ? Normalize(favorites, DateTimeOffset.UtcNow).ToList()
            : [];
    }

    private static List<FavoriteExercise> MergeOne(List<FavoriteExercise> favorites, FavoriteExercise incoming)
    {
        var existingIndex = favorites.FindIndex(favorite => favorite.ExerciseId == incoming.ExerciseId);
        if (existingIndex < 0)
        {
            favorites.Add(incoming);
            return favorites;
        }

        var existing = favorites[existingIndex];
        if (ShouldReplace(existing, incoming))
        {
            favorites[existingIndex] = incoming;
        }

        return favorites;
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

            var normalized = favorite with
            {
                ExerciseId = exerciseId,
                CreatedAt = favorite.CreatedAt == default ? now : favorite.CreatedAt,
                UpdatedAt = favorite.UpdatedAt == default ? favorite.CreatedAt == default ? now : favorite.CreatedAt : favorite.UpdatedAt
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

    private Dictionary<string, List<FavoriteExercise>> Load()
    {
        if (!File.Exists(_filePath))
        {
            return [];
        }

        try
        {
            var json = File.ReadAllText(_filePath);
            return JsonSerializer.Deserialize<Dictionary<string, List<FavoriteExercise>>>(json, JsonOptions) ?? [];
        }
        catch (Exception error)
        {
            _logger.LogError(error, "Failed to load favorite exercises store from {FilePath}", _filePath);
            return [];
        }
    }

    private void Save()
    {
        var json = JsonSerializer.Serialize(_favoritesByUserId, JsonOptions);
        File.WriteAllText(_filePath, json);
    }
}
