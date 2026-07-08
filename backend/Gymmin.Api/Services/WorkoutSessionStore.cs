using System.Text.Json;
using Gymmin.Api.Domain;

namespace Gymmin.Api.Services;

public interface IWorkoutSessionStore
{
    WorkoutSessionsResponse List(string userId, bool includeDeleted = false, DateTimeOffset? since = null);
    WorkoutSessionEnvelope? Get(string userId, string clientSessionId);
    WorkoutSessionEnvelope Upsert(string userId, UpsertWorkoutSessionRequest request);
    bool Delete(string userId, string clientSessionId);
    WorkoutSessionsResponse Sync(string userId, SyncWorkoutSessionsRequest request);
}

public sealed class FileBackedWorkoutSessionStore : IWorkoutSessionStore, IUserScopedDataStore
{
    private const int MaxSessionsPerRequest = 1_000;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true
    };

    private readonly object _gate = new();
    private readonly string _filePath;
    private readonly ILogger<FileBackedWorkoutSessionStore> _logger;
    private Dictionary<string, List<WorkoutSessionEnvelope>> _sessionsByUserId = [];

    public FileBackedWorkoutSessionStore(IWebHostEnvironment environment, ILogger<FileBackedWorkoutSessionStore> logger)
    {
        _logger = logger;
        var dataDirectory = Path.Combine(environment.ContentRootPath, "App_Data");
        Directory.CreateDirectory(dataDirectory);
        _filePath = Path.Combine(dataDirectory, "workout-sessions.json");
        _sessionsByUserId = Load();
    }

    public WorkoutSessionsResponse List(string userId, bool includeDeleted = false, DateTimeOffset? since = null)
    {
        lock (_gate)
        {
            var sessions = GetUserSessions(userId)
                .Where(session => includeDeleted || session.DeletedAt is null)
                .Where(session => since is null || session.ServerUpdatedAt > since)
                .OrderByDescending(session => session.StartedAt)
                .ToList();

            return new WorkoutSessionsResponse(sessions, DateTimeOffset.UtcNow);
        }
    }

    public WorkoutSessionEnvelope? Get(string userId, string clientSessionId)
    {
        lock (_gate)
        {
            return GetUserSessions(userId)
                .FirstOrDefault(session => session.ClientSessionId == NormalizeId(clientSessionId) && session.DeletedAt is null);
        }
    }

    public WorkoutSessionEnvelope Upsert(string userId, UpsertWorkoutSessionRequest request)
    {
        lock (_gate)
        {
            var now = DateTimeOffset.UtcNow;
            var envelope = CreateEnvelope(request, now);
            var sessions = MergeOne(GetUserSessions(userId), envelope);
            _sessionsByUserId[userId] = sessions;
            Save();
            return sessions.First(session => session.ClientSessionId == envelope.ClientSessionId);
        }
    }

    public bool Delete(string userId, string clientSessionId)
    {
        lock (_gate)
        {
            var sessions = GetUserSessions(userId);
            var session = sessions.FirstOrDefault(item => item.ClientSessionId == NormalizeId(clientSessionId));
            if (session is null)
            {
                return false;
            }

            var now = DateTimeOffset.UtcNow;
            _sessionsByUserId[userId] = MergeOne(sessions, session with
            {
                ClientUpdatedAt = now,
                DeletedAt = now,
                ServerUpdatedAt = now
            });
            Save();
            return true;
        }
    }

    public WorkoutSessionsResponse Sync(string userId, SyncWorkoutSessionsRequest request)
    {
        lock (_gate)
        {
            var now = DateTimeOffset.UtcNow;
            var sessions = GetUserSessions(userId);

            foreach (var incoming in request.Sessions?.Take(MaxSessionsPerRequest) ?? [])
            {
                sessions = MergeOne(sessions, CreateEnvelope(incoming, now));
            }

            foreach (var clientSessionId in request.DeletedClientSessionIds?.Select(NormalizeId).Where(id => id.Length > 0).Distinct().Take(MaxSessionsPerRequest) ?? [])
            {
                var existing = sessions.FirstOrDefault(session => session.ClientSessionId == clientSessionId);
                if (existing is null)
                {
                    continue;
                }

                sessions = MergeOne(sessions, existing with
                {
                    ClientUpdatedAt = now,
                    DeletedAt = now,
                    ServerUpdatedAt = now
                });
            }

            _sessionsByUserId[userId] = sessions;
            Save();

            var changed = sessions
                .Where(session => request.LastPulledAt is null || session.ServerUpdatedAt > request.LastPulledAt)
                .OrderByDescending(session => session.StartedAt)
                .ToList();

            return new WorkoutSessionsResponse(changed, now);
        }
    }

    public bool DeleteUserData(string userId)
    {
        lock (_gate)
        {
            var removed = _sessionsByUserId.Remove(userId);
            if (removed)
            {
                Save();
            }

            return removed;
        }
    }

    private List<WorkoutSessionEnvelope> GetUserSessions(string userId)
    {
        return _sessionsByUserId.TryGetValue(userId, out var sessions)
            ? sessions
            : [];
    }

    private static List<WorkoutSessionEnvelope> MergeOne(List<WorkoutSessionEnvelope> sessions, WorkoutSessionEnvelope incoming)
    {
        var existingIndex = sessions.FindIndex(session => session.ClientSessionId == incoming.ClientSessionId);
        if (existingIndex < 0)
        {
            return [incoming, .. sessions];
        }

        if (ShouldReplace(sessions[existingIndex], incoming))
        {
            sessions[existingIndex] = incoming;
        }

        return sessions;
    }

    private static bool ShouldReplace(WorkoutSessionEnvelope existing, WorkoutSessionEnvelope incoming)
    {
        if (incoming.ClientUpdatedAt > existing.ClientUpdatedAt)
        {
            return true;
        }

        if (incoming.ClientUpdatedAt < existing.ClientUpdatedAt)
        {
            return false;
        }

        return incoming.DeletedAt is not null && existing.DeletedAt is null;
    }

    private static WorkoutSessionEnvelope CreateEnvelope(UpsertWorkoutSessionRequest request, DateTimeOffset now)
    {
        var session = request.Session;
        var clientSessionId = NormalizeId(request.ClientSessionId);
        var clientUpdatedAt = request.ClientUpdatedAt ?? GetDate(session, "updatedAt") ?? GetDate(session, "finishedAt") ?? GetDate(session, "abandonedAt") ?? GetDate(session, "startedAt") ?? now;
        var deletedAt = request.DeletedAt ?? GetDate(session, "deletedAt");

        return new WorkoutSessionEnvelope(
            clientSessionId,
            GetString(session, "sourceWorkoutId"),
            GetString(session, "sourceWorkoutName"),
            GetString(session, "executionMode"),
            GetString(session, "status"),
            GetDate(session, "startedAt") ?? now,
            GetDate(session, "finishedAt"),
            GetDate(session, "abandonedAt"),
            clientUpdatedAt,
            now,
            deletedAt,
            session.Clone());
    }

    private static string NormalizeId(string? value) => (value ?? "").Trim();

    private static string GetString(JsonElement element, string propertyName)
    {
        return element.ValueKind == JsonValueKind.Object &&
               element.TryGetProperty(propertyName, out var property) &&
               property.ValueKind == JsonValueKind.String
            ? property.GetString() ?? ""
            : "";
    }

    private static DateTimeOffset? GetDate(JsonElement element, string propertyName)
    {
        if (element.ValueKind != JsonValueKind.Object ||
            !element.TryGetProperty(propertyName, out var property) ||
            property.ValueKind != JsonValueKind.String)
        {
            return null;
        }

        return DateTimeOffset.TryParse(property.GetString(), out var value) ? value : null;
    }

    private Dictionary<string, List<WorkoutSessionEnvelope>> Load()
    {
        if (!File.Exists(_filePath))
        {
            return [];
        }

        try
        {
            var json = File.ReadAllText(_filePath);
            return JsonSerializer.Deserialize<Dictionary<string, List<WorkoutSessionEnvelope>>>(json, JsonOptions) ?? [];
        }
        catch (Exception error)
        {
            _logger.LogError(error, "Failed to load workout sessions from {FilePath}.", _filePath);
            return [];
        }
    }

    private void Save()
    {
        var json = JsonSerializer.Serialize(_sessionsByUserId, JsonOptions);
        File.WriteAllText(_filePath, json);
    }
}
