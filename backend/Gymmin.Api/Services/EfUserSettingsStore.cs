using System.Text.Json;
using Gymmin.Api.Data;
using Gymmin.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Gymmin.Api.Services;

public sealed class EfUserSettingsStore : IUserSettingsStore
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly IDbContextFactory<GymminDbContext> _dbFactory;

    public EfUserSettingsStore(IDbContextFactory<GymminDbContext> dbFactory)
    {
        _dbFactory = dbFactory;
    }

    public UserSettings? Get(string userId)
    {
        using var db = _dbFactory.CreateDbContext();
        var entity = db.UserSettings.AsNoTracking().FirstOrDefault(settings => settings.UserId == userId);
        return entity is null ? null : ToDomain(entity);
    }

    public UserSettings Upsert(string userId, UpsertUserSettingsRequest request)
    {
        using var db = _dbFactory.CreateDbContext();
        var entity = db.UserSettings.FirstOrDefault(settings => settings.UserId == userId);
        var existing = entity is null ? null : ToDomain(entity);
        var settings = UserSettings.FromRequest(userId, request, existing);

        if (entity is null)
        {
            entity = new UserSettingsEntity
            {
                UserId = userId
            };
            db.UserSettings.Add(entity);
        }

        Apply(entity, settings);
        db.SaveChanges();

        return settings;
    }

    private static UserSettings ToDomain(UserSettingsEntity entity)
    {
        var collapsedPanels = DeserializeCollapsedPanels(entity.CollapsedPanelsJson);
        Enum.TryParse<StageType>(entity.DefaultStageType, ignoreCase: true, out var stageType);

        return new UserSettings(
            entity.UserId,
            entity.Language,
            entity.ThemeName,
            entity.DefaultSetCount,
            entity.DefaultWeight,
            string.IsNullOrWhiteSpace(entity.DefaultStageType) ? null : stageType,
            string.IsNullOrWhiteSpace(entity.DefaultWorkoutExecutionMode) ? "guided" : entity.DefaultWorkoutExecutionMode,
            string.IsNullOrWhiteSpace(entity.DefaultWorkoutTableOrientation) ? "vertical" : entity.DefaultWorkoutTableOrientation,
            collapsedPanels,
            entity.IsAuthPanelDismissed,
            DeserializeWorkoutReminders(entity.WorkoutRemindersJson),
            entity.UpdatedAt,
            entity.ShowRestTimer);
    }

    private static void Apply(UserSettingsEntity entity, UserSettings settings)
    {
        entity.Language = settings.Language;
        entity.ThemeName = settings.ThemeName;
        entity.DefaultSetCount = settings.DefaultSetCount;
        entity.DefaultWeight = settings.DefaultWeight;
        entity.DefaultStageType = settings.DefaultStageType?.ToString();
        entity.DefaultWorkoutExecutionMode = settings.DefaultWorkoutExecutionMode;
        entity.DefaultWorkoutTableOrientation = settings.DefaultWorkoutTableOrientation;
        entity.ShowRestTimer = settings.ShowRestTimer;
        entity.CollapsedPanelsJson = JsonSerializer.Serialize(settings.CollapsedPanels, JsonOptions);
        entity.WorkoutRemindersJson = settings.WorkoutReminders is null
            ? ""
            : JsonSerializer.Serialize(settings.WorkoutReminders, JsonOptions);
        entity.IsAuthPanelDismissed = settings.IsAuthPanelDismissed;
        entity.UpdatedAt = settings.UpdatedAt;
    }

    private static IReadOnlyDictionary<string, bool> DeserializeCollapsedPanels(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return new Dictionary<string, bool>();
        }

        try
        {
            return JsonSerializer.Deserialize<Dictionary<string, bool>>(json, JsonOptions) ?? new Dictionary<string, bool>();
        }
        catch
        {
            return new Dictionary<string, bool>();
        }
    }

    private static WorkoutReminderSettings? DeserializeWorkoutReminders(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<WorkoutReminderSettings>(json, JsonOptions);
        }
        catch
        {
            return null;
        }
    }
}
