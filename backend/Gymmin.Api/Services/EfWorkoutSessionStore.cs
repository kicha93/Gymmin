using System.Text.Json;
using Gymmin.Api.Data;
using Gymmin.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Gymmin.Api.Services;

public sealed class EfWorkoutSessionStore : IWorkoutSessionStore
{
    private const int MaxSessionsPerRequest = 1_000;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly IDbContextFactory<GymminDbContext> _dbFactory;

    public EfWorkoutSessionStore(IDbContextFactory<GymminDbContext> dbFactory)
    {
        _dbFactory = dbFactory;
    }

    public WorkoutSessionsResponse List(string userId, bool includeDeleted = false, DateTimeOffset? since = null)
    {
        using var db = _dbFactory.CreateDbContext();
        var sessions = db.WorkoutSessions
            .AsNoTracking()
            .Where(session => session.UserId == userId)
            .Where(session => includeDeleted || session.DeletedAt == null)
            .AsEnumerable()
            .Where(session => since is null || session.ServerUpdatedAt > since)
            .OrderByDescending(session => session.StartedAt)
            .Select(ToEnvelope)
            .ToList();

        return new WorkoutSessionsResponse(sessions, DateTimeOffset.UtcNow);
    }

    public WorkoutSessionEnvelope? Get(string userId, string clientSessionId)
    {
        using var db = _dbFactory.CreateDbContext();
        var normalizedId = NormalizeId(clientSessionId);
        var entity = db.WorkoutSessions
            .AsNoTracking()
            .FirstOrDefault(session =>
                session.UserId == userId &&
                session.ClientSessionId == normalizedId &&
                session.DeletedAt == null);

        return entity is null ? null : ToEnvelope(entity);
    }

    public WorkoutSessionEnvelope Upsert(string userId, UpsertWorkoutSessionRequest request)
    {
        using var db = _dbFactory.CreateDbContext();
        var now = DateTimeOffset.UtcNow;
        var envelope = CreateEnvelope(request, now);
        var entity = db.WorkoutSessions.FirstOrDefault(session =>
            session.UserId == userId &&
            session.ClientSessionId == envelope.ClientSessionId);

        if (entity is null)
        {
            entity = new WorkoutSessionEntity
            {
                Id = Guid.NewGuid(),
                CreatedAt = now
            };
            Apply(entity, envelope, userId, now);
            db.WorkoutSessions.Add(entity);
        }
        else if (ShouldReplace(ToEnvelope(entity), envelope))
        {
            Apply(entity, envelope, userId, now);
        }

        db.SaveChanges();
        return ToEnvelope(entity);
    }

    public bool Delete(string userId, string clientSessionId)
    {
        using var db = _dbFactory.CreateDbContext();
        var normalizedId = NormalizeId(clientSessionId);
        var entity = db.WorkoutSessions.FirstOrDefault(session =>
            session.UserId == userId &&
            session.ClientSessionId == normalizedId);

        if (entity is null)
        {
            return false;
        }

        var now = DateTimeOffset.UtcNow;
        entity.ClientUpdatedAt = now;
        entity.DeletedAt = now;
        entity.ServerUpdatedAt = now;
        entity.UpdatedAt = now;
        db.SaveChanges();
        return true;
    }

    public WorkoutSessionsResponse Sync(string userId, SyncWorkoutSessionsRequest request)
    {
        using var db = _dbFactory.CreateDbContext();
        var now = DateTimeOffset.UtcNow;
        var existing = db.WorkoutSessions
            .Where(session => session.UserId == userId)
            .ToList();

        foreach (var incoming in request.Sessions?.Take(MaxSessionsPerRequest) ?? [])
        {
            UpsertIfNewer(db, existing, userId, CreateEnvelope(incoming, now), now);
        }

        foreach (var clientSessionId in request.DeletedClientSessionIds?.Select(NormalizeId).Where(id => id.Length > 0).Distinct().Take(MaxSessionsPerRequest) ?? [])
        {
            var entity = existing.FirstOrDefault(session => session.ClientSessionId == clientSessionId);
            if (entity is null)
            {
                continue;
            }

            var deleted = ToEnvelope(entity) with
            {
                ClientUpdatedAt = now,
                DeletedAt = now,
                ServerUpdatedAt = now
            };
            UpsertIfNewer(db, existing, userId, deleted, now);
        }

        db.SaveChanges();

        var changed = db.WorkoutSessions
            .AsNoTracking()
            .Where(session => session.UserId == userId)
            .AsEnumerable()
            .Where(session => request.LastPulledAt is null || session.ServerUpdatedAt > request.LastPulledAt)
            .OrderByDescending(session => session.StartedAt)
            .Select(ToEnvelope)
            .ToList();

        return new WorkoutSessionsResponse(changed, now);
    }

    private static void UpsertIfNewer(
        GymminDbContext db,
        List<WorkoutSessionEntity> existing,
        string userId,
        WorkoutSessionEnvelope incoming,
        DateTimeOffset now)
    {
        var entity = existing.FirstOrDefault(session => session.ClientSessionId == incoming.ClientSessionId);
        if (entity is null)
        {
            entity = new WorkoutSessionEntity
            {
                Id = Guid.NewGuid(),
                CreatedAt = now
            };
            Apply(entity, incoming, userId, now);
            existing.Add(entity);
            db.WorkoutSessions.Add(entity);
            return;
        }

        if (ShouldReplace(ToEnvelope(entity), incoming))
        {
            Apply(entity, incoming, userId, now);
        }
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

    private static WorkoutSessionEnvelope ToEnvelope(WorkoutSessionEntity entity)
    {
        return new WorkoutSessionEnvelope(
            entity.ClientSessionId,
            entity.SourceWorkoutId,
            entity.SourceWorkoutName,
            entity.ExecutionMode,
            entity.Status,
            entity.StartedAt,
            entity.FinishedAt,
            entity.AbandonedAt,
            entity.ClientUpdatedAt,
            entity.ServerUpdatedAt,
            entity.DeletedAt,
            JsonSerializer.Deserialize<JsonElement>(entity.SessionJson, JsonOptions));
    }

    private static void Apply(WorkoutSessionEntity entity, WorkoutSessionEnvelope envelope, string userId, DateTimeOffset now)
    {
        entity.UserId = userId;
        entity.ClientSessionId = envelope.ClientSessionId;
        entity.SourceWorkoutId = envelope.SourceWorkoutId;
        entity.SourceWorkoutName = envelope.SourceWorkoutName;
        entity.ExecutionMode = envelope.ExecutionMode;
        entity.Status = envelope.Status;
        entity.StartedAt = envelope.StartedAt;
        entity.FinishedAt = envelope.FinishedAt;
        entity.AbandonedAt = envelope.AbandonedAt;
        entity.ClientUpdatedAt = envelope.ClientUpdatedAt;
        entity.ServerUpdatedAt = now;
        entity.DeletedAt = envelope.DeletedAt;
        entity.UpdatedAt = now;
        entity.SessionJson = JsonSerializer.Serialize(envelope.Session, JsonOptions);
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
            property.ValueKind != JsonKindString)
        {
            return null;
        }

        return DateTimeOffset.TryParse(property.GetString(), out var value) ? value : null;
    }

    private const JsonValueKind JsonKindString = JsonValueKind.String;
}
