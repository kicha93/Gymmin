using System.Text.Json;
using Gymmin.Api.Domain;

namespace Gymmin.Api.Services;

public sealed class FileBackedWorkoutStore : IWorkoutStore, IUserScopedDataStore
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true
    };

    private readonly object _gate = new();
    private readonly string _filePath;
    private readonly ILogger<FileBackedWorkoutStore> _logger;
    private List<Workout> _workouts = [];

    public FileBackedWorkoutStore(IWebHostEnvironment environment, ILogger<FileBackedWorkoutStore> logger)
    {
        _logger = logger;
        var dataDirectory = Path.Combine(environment.ContentRootPath, "App_Data");
        Directory.CreateDirectory(dataDirectory);
        _filePath = Path.Combine(dataDirectory, "workouts.json");
        _workouts = Load();
    }

    public IReadOnlyList<Workout> List(string userId, bool includeDeleted = false)
    {
        lock (_gate)
        {
            return _workouts
                .Where(workout => workout.UserId == userId)
                .Where(workout => includeDeleted || workout.DeletedAt is null)
                .OrderByDescending(workout => workout.UpdatedAt)
                .ToList();
        }
    }

    public IReadOnlyList<Workout> ListChangedSince(string userId, DateTimeOffset? changedSince)
    {
        lock (_gate)
        {
            return _workouts
                .Where(workout => workout.UserId == userId)
                .Where(workout => changedSince is null || workout.UpdatedAt > changedSince)
                .OrderBy(workout => workout.UpdatedAt)
                .ToList();
        }
    }

    public Workout? Get(string userId, string clientWorkoutId)
    {
        lock (_gate)
        {
            return _workouts.FirstOrDefault(workout =>
                workout.UserId == userId &&
                workout.ClientWorkoutId == clientWorkoutId &&
                workout.DeletedAt is null);
        }
    }

    public Workout Upsert(string userId, UpsertWorkoutRequest request)
    {
        lock (_gate)
        {
            var existingIndex = _workouts.FindIndex(workout =>
                workout.UserId == userId &&
                workout.ClientWorkoutId == request.ClientWorkoutId);

            var existing = existingIndex >= 0 ? _workouts[existingIndex] : null;
            var workout = Workout.FromRequest(userId, request, existing);

            if (existingIndex >= 0)
            {
                _workouts[existingIndex] = workout;
            }
            else
            {
                _workouts.Add(workout);
            }

            Save();
            return workout;
        }
    }

    public bool Delete(string userId, string clientWorkoutId)
    {
        lock (_gate)
        {
            var existingIndex = _workouts.FindIndex(workout =>
                workout.UserId == userId &&
                workout.ClientWorkoutId == clientWorkoutId);

            if (existingIndex < 0)
            {
                return false;
            }

            _workouts[existingIndex] = _workouts[existingIndex].MarkDeleted();
            Save();
            return true;
        }
    }

    public SyncWorkoutsResponse Sync(string userId, SyncWorkoutsRequest request)
    {
        lock (_gate)
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
    }

    public bool DeleteUserData(string userId)
    {
        lock (_gate)
        {
            var before = _workouts.Count;
            _workouts = _workouts.Where(workout => workout.UserId != userId).ToList();
            var removed = _workouts.Count != before;
            if (removed)
            {
                Save();
            }

            return removed;
        }
    }

    private List<Workout> Load()
    {
        if (!File.Exists(_filePath))
        {
            return [];
        }

        try
        {
            var json = File.ReadAllText(_filePath);
            return JsonSerializer.Deserialize<List<Workout>>(json, JsonOptions) ?? [];
        }
        catch (Exception error)
        {
            _logger.LogError(error, "Failed to load workout store from {FilePath}", _filePath);
            return [];
        }
    }

    private void Save()
    {
        var json = JsonSerializer.Serialize(_workouts, JsonOptions);
        File.WriteAllText(_filePath, json);
    }
}
