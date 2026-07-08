using Gymmin.Api.Data;
using Gymmin.Api.Domain;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Gymmin.Api.Services;

public interface IAchievementStore
{
    AchievementsResponse Get(string userId);
    AchievementsResponse Sync(string userId, SyncAchievementsRequest request);
}

public sealed class FileBackedAchievementStore : IAchievementStore, IUserScopedDataStore
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true
    };

    private readonly object _gate = new();
    private readonly string _achievementsPath;
    private readonly string _usagePath;
    private readonly ILogger<FileBackedAchievementStore> _logger;
    private Dictionary<string, List<UserAchievementDto>> _achievementsByUserId = [];
    private Dictionary<string, AppUsageStatsDto> _usageByUserId = [];

    public FileBackedAchievementStore(IWebHostEnvironment environment, ILogger<FileBackedAchievementStore> logger)
    {
        _logger = logger;
        var dataDirectory = Path.Combine(environment.ContentRootPath, "App_Data");
        Directory.CreateDirectory(dataDirectory);
        _achievementsPath = Path.Combine(dataDirectory, "user-achievements.json");
        _usagePath = Path.Combine(dataDirectory, "user-app-usage-stats.json");
        _achievementsByUserId = Load<Dictionary<string, List<UserAchievementDto>>>(_achievementsPath) ?? [];
        _usageByUserId = Load<Dictionary<string, AppUsageStatsDto>>(_usagePath) ?? [];
    }

    public AchievementsResponse Get(string userId)
    {
        lock (_gate)
        {
            return new AchievementsResponse(
                GetUserAchievements(userId),
                GetUserUsage(userId),
                DateTimeOffset.UtcNow);
        }
    }

    public AchievementsResponse Sync(string userId, SyncAchievementsRequest request)
    {
        lock (_gate)
        {
            var now = DateTimeOffset.UtcNow;
            var mergedAchievements = GetUserAchievements(userId);
            foreach (var incoming in Normalize(request.Unlocked, now))
            {
                mergedAchievements = MergeAchievement(mergedAchievements, incoming, now);
            }

            _achievementsByUserId[userId] = mergedAchievements;

            if (request.AppUsageStats is not null)
            {
                _usageByUserId[userId] = MergeUsage(GetUserUsage(userId), request.AppUsageStats, now);
            }

            Save(_achievementsPath, _achievementsByUserId);
            Save(_usagePath, _usageByUserId);

            var responseAchievements = mergedAchievements
                .Where(achievement => request.LastPulledAt is null || (achievement.UpdatedAt ?? achievement.UnlockedAt) > request.LastPulledAt)
                .OrderBy(achievement => achievement.AchievementId)
                .ToList();

            return new AchievementsResponse(responseAchievements, GetUserUsage(userId), now);
        }
    }

    public bool DeleteUserData(string userId)
    {
        lock (_gate)
        {
            var removedAchievements = _achievementsByUserId.Remove(userId);
            var removedUsage = _usageByUserId.Remove(userId);
            if (removedAchievements)
            {
                Save(_achievementsPath, _achievementsByUserId);
            }

            if (removedUsage)
            {
                Save(_usagePath, _usageByUserId);
            }

            return removedAchievements || removedUsage;
        }
    }

    private List<UserAchievementDto> GetUserAchievements(string userId)
    {
        return Normalize(_achievementsByUserId.TryGetValue(userId, out var achievements) ? achievements : [], DateTimeOffset.UtcNow)
            .OrderBy(achievement => achievement.AchievementId)
            .ToList();
    }

    private AppUsageStatsDto GetUserUsage(string userId)
    {
        return _usageByUserId.TryGetValue(userId, out var usage)
            ? usage
            : new AppUsageStatsDto(0, DateTimeOffset.UtcNow);
    }

    private T? Load<T>(string path)
    {
        if (!File.Exists(path))
        {
            return default;
        }

        try
        {
            return JsonSerializer.Deserialize<T>(File.ReadAllText(path), JsonOptions);
        }
        catch (Exception error)
        {
            _logger.LogError(error, "Failed to load achievement store from {Path}", path);
            return default;
        }
    }

    private static void Save<T>(string path, T value)
    {
        File.WriteAllText(path, JsonSerializer.Serialize(value, JsonOptions));
    }

    internal static IReadOnlyList<UserAchievementDto> Normalize(IReadOnlyList<UserAchievementDto>? achievements, DateTimeOffset now)
    {
        var byId = new Dictionary<string, UserAchievementDto>(StringComparer.OrdinalIgnoreCase);

        foreach (var achievement in achievements ?? [])
        {
            var id = NormalizeAchievementId(achievement.AchievementId);
            if (string.IsNullOrWhiteSpace(id))
            {
                continue;
            }

            var normalized = achievement with
            {
                AchievementId = id,
                UpdatedAt = achievement.UpdatedAt == default ? achievement.UnlockedAt : achievement.UpdatedAt
            };

            if (!byId.TryGetValue(id, out var existing))
            {
                byId[id] = normalized;
                continue;
            }

            byId[id] = MergeAchievement(existing, normalized, now);
        }

        return byId.Values
            .OrderBy(achievement => achievement.AchievementId)
            .ToList();
    }

    internal static UserAchievementDto MergeAchievement(UserAchievementDto existing, UserAchievementDto incoming, DateTimeOffset now)
    {
        var unlockedAt = incoming.UnlockedAt < existing.UnlockedAt ? incoming.UnlockedAt : existing.UnlockedAt;
        var progressAtUnlock = Math.Max(existing.ProgressAtUnlock ?? 0, incoming.ProgressAtUnlock ?? 0);
        var updatedAt = new[] { existing.UpdatedAt ?? existing.UnlockedAt, incoming.UpdatedAt ?? incoming.UnlockedAt, now }.Max();
        return existing with
        {
            UnlockedAt = unlockedAt,
            ProgressAtUnlock = progressAtUnlock > 0 ? progressAtUnlock : null,
            UpdatedAt = updatedAt
        };
    }

    private static List<UserAchievementDto> MergeAchievement(List<UserAchievementDto> existing, UserAchievementDto incoming, DateTimeOffset now)
    {
        var index = existing.FindIndex(achievement => achievement.AchievementId.Equals(incoming.AchievementId, StringComparison.OrdinalIgnoreCase));
        if (index < 0)
        {
            existing.Add(incoming with { UpdatedAt = incoming.UpdatedAt ?? now });
            return existing;
        }

        existing[index] = MergeAchievement(existing[index], incoming, now);
        return existing;
    }

    internal static AppUsageStatsDto MergeUsage(AppUsageStatsDto existing, AppUsageStatsDto incoming, DateTimeOffset now)
    {
        return new AppUsageStatsDto(
            Math.Max(existing.TotalForegroundSeconds, incoming.TotalForegroundSeconds),
            new[] { existing.UpdatedAt, incoming.UpdatedAt, now }.Max());
    }

    internal static string NormalizeAchievementId(string? achievementId)
    {
        return (achievementId ?? "").Trim();
    }
}

public sealed class EfAchievementStore : IAchievementStore
{
    private readonly IDbContextFactory<GymminDbContext> _dbFactory;

    public EfAchievementStore(IDbContextFactory<GymminDbContext> dbFactory)
    {
        _dbFactory = dbFactory;
    }

    public AchievementsResponse Get(string userId)
    {
        using var db = _dbFactory.CreateDbContext();
        return new AchievementsResponse(
            db.UserAchievements
                .AsNoTracking()
                .Where(achievement => achievement.UserId == userId)
                .OrderBy(achievement => achievement.AchievementId)
                .Select(ToDomain)
                .ToList(),
            db.UserAppUsageStats.AsNoTracking().Where(stats => stats.UserId == userId).Select(ToDomain).FirstOrDefault()
                ?? new AppUsageStatsDto(0, DateTimeOffset.UtcNow),
            DateTimeOffset.UtcNow);
    }

    public AchievementsResponse Sync(string userId, SyncAchievementsRequest request)
    {
        using var db = _dbFactory.CreateDbContext();
        var now = DateTimeOffset.UtcNow;
        var existing = db.UserAchievements
            .Where(achievement => achievement.UserId == userId)
            .ToList();

        foreach (var incoming in FileBackedAchievementStore.Normalize(request.Unlocked, now))
        {
            UpsertAchievement(db, existing, userId, incoming, now);
        }

        if (request.AppUsageStats is not null)
        {
            var usage = db.UserAppUsageStats.FirstOrDefault(stats => stats.UserId == userId);
            if (usage is null)
            {
                usage = new UserAppUsageStatsEntity
                {
                    UserId = userId,
                    TotalForegroundSeconds = Math.Max(0, request.AppUsageStats.TotalForegroundSeconds),
                    UpdatedAt = now
                };
                db.UserAppUsageStats.Add(usage);
            }
            else
            {
                var merged = FileBackedAchievementStore.MergeUsage(ToDomain(usage), request.AppUsageStats, now);
                usage.TotalForegroundSeconds = merged.TotalForegroundSeconds;
                usage.UpdatedAt = merged.UpdatedAt;
            }
        }

        db.SaveChanges();

        var changed = db.UserAchievements
            .AsNoTracking()
            .Where(achievement => achievement.UserId == userId)
            .AsEnumerable()
            .Where(achievement => request.LastPulledAt is null || achievement.UpdatedAt > request.LastPulledAt)
            .OrderBy(achievement => achievement.AchievementId)
            .Select(ToDomain)
            .ToList();

        var usageResponse = db.UserAppUsageStats.AsNoTracking().Where(stats => stats.UserId == userId).Select(ToDomain).FirstOrDefault()
            ?? new AppUsageStatsDto(0, now);

        return new AchievementsResponse(changed, usageResponse, now);
    }

    private static void UpsertAchievement(
        GymminDbContext db,
        List<UserAchievementEntity> existing,
        string userId,
        UserAchievementDto incoming,
        DateTimeOffset now)
    {
        var entity = existing.FirstOrDefault(achievement => achievement.AchievementId.Equals(incoming.AchievementId, StringComparison.OrdinalIgnoreCase));
        if (entity is null)
        {
            entity = new UserAchievementEntity
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                AchievementId = incoming.AchievementId,
                UnlockedAt = incoming.UnlockedAt,
                ProgressAtUnlock = incoming.ProgressAtUnlock,
                CreatedAt = now,
                UpdatedAt = incoming.UpdatedAt ?? now
            };
            existing.Add(entity);
            db.UserAchievements.Add(entity);
            return;
        }

        var merged = FileBackedAchievementStore.MergeAchievement(ToDomain(entity), incoming, now);
        entity.UnlockedAt = merged.UnlockedAt;
        entity.ProgressAtUnlock = merged.ProgressAtUnlock;
        entity.UpdatedAt = merged.UpdatedAt ?? now;
    }

    private static UserAchievementDto ToDomain(UserAchievementEntity entity)
    {
        return new UserAchievementDto(entity.AchievementId, entity.UnlockedAt, entity.ProgressAtUnlock, entity.UpdatedAt);
    }

    private static AppUsageStatsDto ToDomain(UserAppUsageStatsEntity entity)
    {
        return new AppUsageStatsDto(entity.TotalForegroundSeconds, entity.UpdatedAt);
    }
}
