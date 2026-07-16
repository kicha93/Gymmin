using System.Text.Json;
using System.Text.Json.Nodes;
using Gymmin.Api.Data;
using Gymmin.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Gymmin.Api.Services;

public interface IBugReportStore
{
    BugReportCreateResult CreateOrGet(Guid id, string? idempotencyKey, string? reporterUserId, CreateBugReportRequest request);
    StoredBugReport? Get(Guid id);
    IReadOnlyList<Guid> GetDueEmailDeliveryIds(DateTimeOffset now, int limit);
    StoredBugReport? ClaimEmailDelivery(Guid id, string leaseId, DateTimeOffset now, TimeSpan leaseDuration);
    void CompleteEmailDelivery(Guid id, string leaseId, bool sent, string? error, DateTimeOffset now);
}

public sealed class FileBackedBugReportStore : IBugReportStore, IUserScopedDataStore
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web) { WriteIndented = true };
    private readonly object _gate = new();
    private readonly string _path;
    private readonly ILogger<FileBackedBugReportStore> _logger;
    private List<StoredBugReport> _reports;

    public FileBackedBugReportStore(IWebHostEnvironment environment, ILogger<FileBackedBugReportStore> logger)
    {
        _logger = logger;
        var dataDirectory = Path.Combine(environment.ContentRootPath, "App_Data");
        Directory.CreateDirectory(dataDirectory);
        _path = Path.Combine(dataDirectory, "bug-reports.json");
        _reports = Load();
    }

    public BugReportCreateResult CreateOrGet(Guid id, string? idempotencyKey, string? reporterUserId, CreateBugReportRequest request)
    {
        lock (_gate)
        {
            var normalizedKey = BugReportStoreMapper.NormalizeIdempotencyKey(idempotencyKey);
            var existing = normalizedKey is null ? null : _reports.FirstOrDefault(report => report.IdempotencyKey == normalizedKey);
            if (existing is not null)
            {
                return new BugReportCreateResult(existing, false);
            }

            var report = BugReportStoreMapper.CreateStored(id, normalizedKey, reporterUserId, request, DateTimeOffset.UtcNow);
            _reports.Add(report);
            Save();
            return new BugReportCreateResult(report, true);
        }
    }

    public StoredBugReport? Get(Guid id)
    {
        lock (_gate) return _reports.FirstOrDefault(report => report.Id == id);
    }

    public IReadOnlyList<Guid> GetDueEmailDeliveryIds(DateTimeOffset now, int limit)
    {
        lock (_gate)
        {
            return _reports
                .Where(report => BugReportStoreMapper.IsDue(report, now))
                .OrderBy(report => report.EmailNextAttemptAt ?? report.CreatedAt)
                .Take(limit)
                .Select(report => report.Id)
                .ToList();
        }
    }

    public StoredBugReport? ClaimEmailDelivery(Guid id, string leaseId, DateTimeOffset now, TimeSpan leaseDuration)
    {
        lock (_gate)
        {
            var index = _reports.FindIndex(report => report.Id == id && BugReportStoreMapper.IsDue(report, now));
            if (index < 0) return null;
            _reports[index] = _reports[index] with
            {
                EmailDeliveryStatus = BugReportEmailDeliveryStatuses.Sending,
                EmailAttemptCount = _reports[index].EmailAttemptCount + 1,
                EmailLastAttemptAt = now,
                EmailLeaseId = leaseId,
                EmailLeaseExpiresAt = now.Add(leaseDuration),
                UpdatedAt = now
            };
            Save();
            return _reports[index];
        }
    }

    public void CompleteEmailDelivery(Guid id, string leaseId, bool sent, string? error, DateTimeOffset now)
    {
        lock (_gate)
        {
            var index = _reports.FindIndex(report => report.Id == id && report.EmailLeaseId == leaseId);
            if (index < 0) return;
            _reports[index] = BugReportStoreMapper.CompleteDelivery(_reports[index], sent, error, now);
            Save();
        }
    }

    public bool DeleteUserData(string userId)
    {
        lock (_gate)
        {
            var changed = false;
            for (var index = 0; index < _reports.Count; index++)
            {
                if (_reports[index].ReporterUserId != userId) continue;
                _reports[index] = _reports[index] with
                {
                    ReporterUserId = null,
                    DiagnosticsJson = BugReportDiagnosticsSanitizer.RemoveAccountIdentifiers(_reports[index].DiagnosticsJson, userId),
                    UpdatedAt = DateTimeOffset.UtcNow
                };
                changed = true;
            }
            if (changed) Save();
            return changed;
        }
    }

    private List<StoredBugReport> Load()
    {
        if (!File.Exists(_path)) return [];
        try { return JsonSerializer.Deserialize<List<StoredBugReport>>(File.ReadAllText(_path), JsonOptions) ?? []; }
        catch (Exception error) { _logger.LogError(error, "Failed to load bug report store from {Path}", _path); return []; }
    }

    private void Save()
    {
        var temporaryPath = $"{_path}.{Guid.NewGuid():N}.tmp";
        try
        {
            File.WriteAllText(temporaryPath, JsonSerializer.Serialize(_reports, JsonOptions));
            File.Move(temporaryPath, _path, true);
        }
        finally
        {
            if (File.Exists(temporaryPath)) File.Delete(temporaryPath);
        }
    }
}

public sealed class EfBugReportStore(IDbContextFactory<GymminDbContext> dbFactory) : IBugReportStore
{
    public BugReportCreateResult CreateOrGet(Guid id, string? idempotencyKey, string? reporterUserId, CreateBugReportRequest request)
    {
        var key = BugReportStoreMapper.NormalizeIdempotencyKey(idempotencyKey);
        using var db = dbFactory.CreateDbContext();
        if (key is not null)
        {
            var existing = db.BugReports.AsNoTracking().FirstOrDefault(report => report.IdempotencyKey == key);
            if (existing is not null) return new BugReportCreateResult(BugReportStoreMapper.ToDomain(existing), false);
        }

        var stored = BugReportStoreMapper.CreateStored(id, key, reporterUserId, request, DateTimeOffset.UtcNow);
        db.BugReports.Add(BugReportStoreMapper.ToEntity(stored));
        try { db.SaveChanges(); }
        catch (DbUpdateException) when (key is not null)
        {
            db.ChangeTracker.Clear();
            var existing = db.BugReports.AsNoTracking().First(report => report.IdempotencyKey == key);
            return new BugReportCreateResult(BugReportStoreMapper.ToDomain(existing), false);
        }
        return new BugReportCreateResult(stored, true);
    }

    public StoredBugReport? Get(Guid id)
    {
        using var db = dbFactory.CreateDbContext();
        var entity = db.BugReports.AsNoTracking().FirstOrDefault(report => report.Id == id);
        return entity is null ? null : BugReportStoreMapper.ToDomain(entity);
    }

    public IReadOnlyList<Guid> GetDueEmailDeliveryIds(DateTimeOffset now, int limit)
    {
        using var db = dbFactory.CreateDbContext();
        return db.BugReports.AsNoTracking()
            .Where(report => report.EmailDeliveryStatus != BugReportEmailDeliveryStatuses.Sent &&
                report.EmailAttemptCount < BugReportStoreMapper.MaxEmailAttempts &&
                (report.EmailNextAttemptAt == null || report.EmailNextAttemptAt <= now) &&
                (report.EmailLeaseExpiresAt == null || report.EmailLeaseExpiresAt <= now))
            .OrderBy(report => report.EmailNextAttemptAt ?? report.CreatedAt)
            .Take(limit).Select(report => report.Id).ToList();
    }

    public StoredBugReport? ClaimEmailDelivery(Guid id, string leaseId, DateTimeOffset now, TimeSpan leaseDuration)
    {
        using var db = dbFactory.CreateDbContext();
        var updated = db.BugReports
            .Where(report => report.Id == id && report.EmailDeliveryStatus != BugReportEmailDeliveryStatuses.Sent &&
                report.EmailAttemptCount < BugReportStoreMapper.MaxEmailAttempts &&
                (report.EmailNextAttemptAt == null || report.EmailNextAttemptAt <= now) &&
                (report.EmailLeaseExpiresAt == null || report.EmailLeaseExpiresAt <= now))
            .ExecuteUpdate(setters => setters
                .SetProperty(report => report.EmailDeliveryStatus, BugReportEmailDeliveryStatuses.Sending)
                .SetProperty(report => report.EmailAttemptCount, report => report.EmailAttemptCount + 1)
                .SetProperty(report => report.EmailLastAttemptAt, now)
                .SetProperty(report => report.EmailLeaseId, leaseId)
                .SetProperty(report => report.EmailLeaseExpiresAt, now.Add(leaseDuration))
                .SetProperty(report => report.UpdatedAt, now));
        return updated == 0 ? null : Get(id);
    }

    public void CompleteEmailDelivery(Guid id, string leaseId, bool sent, string? error, DateTimeOffset now)
    {
        using var db = dbFactory.CreateDbContext();
        var entity = db.BugReports.FirstOrDefault(report => report.Id == id && report.EmailLeaseId == leaseId);
        if (entity is null) return;
        BugReportStoreMapper.ApplyCompletion(entity, sent, error, now);
        db.SaveChanges();
    }
}

internal static class BugReportStoreMapper
{
    public const int MaxEmailAttempts = 5;
    public const int MaxIdempotencyKeyLength = 160;

    public static StoredBugReport CreateStored(Guid id, string? key, string? reporterUserId, CreateBugReportRequest request, DateTimeOffset now) =>
        new(id, key, string.IsNullOrWhiteSpace(reporterUserId) ? null : reporterUserId,
            (request.Title ?? "").Trim(), (request.Description ?? "").Trim(), Normalize(request.Device), Normalize(request.Screen),
            Normalize(request.Language), Normalize(request.AppVersion), BugReportDiagnosticsSanitizer.SanitizeForStorage(request.Diagnostics),
            BugReportStatuses.New, BugReportEmailDeliveryStatuses.Pending, null, 0, null, now, null, null, null,
            null, null, 0, null, now, now);

    public static StoredBugReport CompleteDelivery(StoredBugReport report, bool sent, string? error, DateTimeOffset now) => report with
    {
        EmailDeliveryStatus = sent ? BugReportEmailDeliveryStatuses.Sent : BugReportEmailDeliveryStatuses.Failed,
        EmailDeliveryError = sent ? null : TrimToLength(error, 500),
        EmailNextAttemptAt = sent || report.EmailAttemptCount >= MaxEmailAttempts ? null : now.Add(GetRetryDelay(report.EmailAttemptCount)),
        EmailSentAt = sent ? now : null,
        EmailLeaseId = null,
        EmailLeaseExpiresAt = null,
        UpdatedAt = now
    };

    public static void ApplyCompletion(BugReportEntity entity, bool sent, string? error, DateTimeOffset now)
    {
        var completed = CompleteDelivery(ToDomain(entity), sent, error, now);
        entity.EmailDeliveryStatus = completed.EmailDeliveryStatus; entity.EmailDeliveryError = completed.EmailDeliveryError;
        entity.EmailNextAttemptAt = completed.EmailNextAttemptAt; entity.EmailSentAt = completed.EmailSentAt;
        entity.EmailLeaseId = null; entity.EmailLeaseExpiresAt = null; entity.UpdatedAt = now;
    }

    public static bool IsDue(StoredBugReport report, DateTimeOffset now) => report.EmailDeliveryStatus != BugReportEmailDeliveryStatuses.Sent &&
        report.EmailAttemptCount < MaxEmailAttempts && (report.EmailNextAttemptAt is null || report.EmailNextAttemptAt <= now) &&
        (report.EmailLeaseExpiresAt is null || report.EmailLeaseExpiresAt <= now);

    public static string? NormalizeIdempotencyKey(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var key = value.Trim();
        if (key.Length > MaxIdempotencyKeyLength) throw new InvalidBugReportIdempotencyKeyException();
        return key;
    }

    public static BugReportEntity ToEntity(StoredBugReport r) => new()
    {
        Id=r.Id, IdempotencyKey=r.IdempotencyKey, ReporterUserId=r.ReporterUserId, Title=r.Title, Description=r.Description,
        Device=r.Device, Screen=r.Screen, Language=r.Language, AppVersion=r.AppVersion, DiagnosticsJson=r.DiagnosticsJson,
        Status=r.Status, EmailDeliveryStatus=r.EmailDeliveryStatus, EmailDeliveryError=r.EmailDeliveryError,
        EmailAttemptCount=r.EmailAttemptCount, EmailLastAttemptAt=r.EmailLastAttemptAt, EmailNextAttemptAt=r.EmailNextAttemptAt,
        EmailSentAt=r.EmailSentAt, EmailLeaseId=r.EmailLeaseId, EmailLeaseExpiresAt=r.EmailLeaseExpiresAt,
        AdminResponse=r.AdminResponse, AdminRespondedAt=r.AdminRespondedAt, RewardPoints=r.RewardPoints, RewardedAt=r.RewardedAt,
        CreatedAt=r.CreatedAt, UpdatedAt=r.UpdatedAt
    };

    public static StoredBugReport ToDomain(BugReportEntity r) => new(r.Id,r.IdempotencyKey,r.ReporterUserId,r.Title,r.Description,r.Device,r.Screen,
        r.Language,r.AppVersion,r.DiagnosticsJson,r.Status,r.EmailDeliveryStatus,r.EmailDeliveryError,r.EmailAttemptCount,r.EmailLastAttemptAt,
        r.EmailNextAttemptAt,r.EmailSentAt,r.EmailLeaseId,r.EmailLeaseExpiresAt,r.AdminResponse,r.AdminRespondedAt,r.RewardPoints,r.RewardedAt,
        r.CreatedAt,r.UpdatedAt);

    public static CreateBugReportRequest ToRequest(StoredBugReport r) => new(r.Title, r.Description, r.Device, r.Screen, r.Language, r.AppVersion,
        string.IsNullOrWhiteSpace(r.DiagnosticsJson) ? null : JsonDocument.Parse(r.DiagnosticsJson).RootElement.Clone());
    public static string? TrimToLength(string? v,int max) { if(string.IsNullOrWhiteSpace(v)) return null; var t=v.Trim(); return t.Length<=max?t:t[..max]; }
    private static string? Normalize(string? v) => string.IsNullOrWhiteSpace(v)?null:v.Trim();
    private static TimeSpan GetRetryDelay(int attempt) => attempt switch { 1=>TimeSpan.FromMinutes(1),2=>TimeSpan.FromMinutes(5),3=>TimeSpan.FromMinutes(30),4=>TimeSpan.FromHours(2),_=>TimeSpan.FromHours(12) };
}

public sealed class InvalidBugReportIdempotencyKeyException : Exception;

public static class BugReportDiagnosticsSanitizer
{
    private static readonly HashSet<string> IdentityKeys = new(StringComparer.OrdinalIgnoreCase) { "userId", "storageOwner", "ownerId" };

    public static string? SanitizeForStorage(JsonElement? diagnostics)
    {
        if (diagnostics is not { ValueKind: not JsonValueKind.Null and not JsonValueKind.Undefined } value) return null;
        return SanitizeNode(JsonNode.Parse(value.GetRawText()), null)?.ToJsonString();
    }

    public static string? RemoveAccountIdentifiers(string? json, string userId)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try { return SanitizeNode(JsonNode.Parse(json), userId)?.ToJsonString(); }
        catch (JsonException) { return null; }
    }

    private static JsonNode? SanitizeNode(JsonNode? node, string? userId)
    {
        if (node is JsonObject obj)
        {
            foreach (var key in obj.Select(pair => pair.Key).ToList())
            {
                if (IdentityKeys.Contains(key)) { obj.Remove(key); continue; }
                var child = obj[key];
                var sanitized = SanitizeNode(child, userId);
                if (!ReferenceEquals(child, sanitized)) obj[key] = sanitized;
            }
        }
        else if (node is JsonArray array)
        {
            for (var index=0; index<array.Count; index++)
            {
                var child = array[index];
                var sanitized = SanitizeNode(child, userId);
                if (!ReferenceEquals(child, sanitized)) array[index] = sanitized;
            }
        }
        else if (userId is not null && node is JsonValue value && value.TryGetValue<string>(out var text) && text == userId) return null;
        return node;
    }
}
