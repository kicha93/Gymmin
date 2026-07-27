using System.Text.Json;

namespace Gymmin.Api.Domain;

public sealed record UserSettings(
    string UserId,
    string Language,
    string ThemeName,
    string DefaultSetCount,
    string DefaultWeight,
    StageType? DefaultStageType,
    string DefaultWorkoutExecutionMode,
    string DefaultWorkoutTableOrientation,
    IReadOnlyDictionary<string, bool> CollapsedPanels,
    bool IsAuthPanelDismissed,
    WorkoutReminderSettings? WorkoutReminders,
    DateTimeOffset UpdatedAt,
    bool ShowRestTimer = true,
    IReadOnlyList<WorkoutCreatorProfile>? CreatorProfiles = null,
    string? SelectedCreatorProfileId = null,
    WeeklyPlanSettings? WeeklyPlan = null)
{
    public static UserSettings FromRequest(string userId, UpsertUserSettingsRequest request, UserSettings? existing = null)
    {
        var creatorProfiles = request.CreatorProfiles ?? existing?.CreatorProfiles;
        var selectedCreatorProfileId = request.CreatorProfiles is null
            ? existing?.SelectedCreatorProfileId
            : creatorProfiles?.Any(profile => profile.Id == request.SelectedCreatorProfileId) == true
                ? request.SelectedCreatorProfileId
                : null;

        return new UserSettings(
            userId,
            NormalizeOption(request.Language, existing?.Language ?? "en"),
            NormalizeOption(request.ThemeName, existing?.ThemeName ?? "light"),
            request.DefaultSetCount?.Trim() ?? string.Empty,
            request.DefaultWeight?.Trim() ?? string.Empty,
            request.DefaultStageType,
            NormalizeOption(request.DefaultWorkoutExecutionMode, existing?.DefaultWorkoutExecutionMode ?? "guided"),
            NormalizeWorkoutTableOrientation(request.DefaultWorkoutTableOrientation, existing?.DefaultWorkoutTableOrientation ?? "vertical"),
            request.CollapsedPanels ?? new Dictionary<string, bool>(),
            request.IsAuthPanelDismissed,
            request.WorkoutReminders ?? existing?.WorkoutReminders,
            request.UpdatedAt ?? DateTimeOffset.UtcNow,
            request.ShowRestTimer ?? existing?.ShowRestTimer ?? true,
            creatorProfiles,
            selectedCreatorProfileId,
            request.WeeklyPlan ?? existing?.WeeklyPlan);
    }

    private static string NormalizeOption(string? value, string fallback)
    {
        var normalized = value?.Trim();
        return string.IsNullOrWhiteSpace(normalized) ? fallback : normalized;
    }

    private static string NormalizeWorkoutTableOrientation(string? value, string fallback)
    {
        var normalized = value?.Trim();
        return normalized is "vertical" or "horizontal" ? normalized : fallback;
    }
}

public sealed record WorkoutReminderSettings(
    bool Enabled,
    IReadOnlyList<int>? DaysOfWeek,
    string? Time,
    IReadOnlyList<ReminderDaySchedule>? WeeklySchedule,
    string Message,
    string? Description,
    bool OnlyIfNoWorkoutToday,
    DateTimeOffset? UpdatedAt);

public sealed record ReminderDaySchedule(
    string Day,
    bool Enabled,
    string Time);

public sealed record WorkoutCreatorProfile(
    string Id,
    string Name,
    IReadOnlyDictionary<string, JsonElement> Draft);

public sealed record WeeklyPlanSettings(
    bool Enabled,
    IReadOnlyList<WeeklyPlanItem> Items,
    DateTimeOffset UpdatedAt);

public sealed record WeeklyPlanItem(
    string WorkoutId,
    string Day,
    int Order);

public sealed record UpsertUserSettingsRequest(
    string? Language,
    string? ThemeName,
    string? DefaultSetCount,
    string? DefaultWeight,
    StageType? DefaultStageType,
    string? DefaultWorkoutExecutionMode,
    string? DefaultWorkoutTableOrientation,
    IReadOnlyDictionary<string, bool>? CollapsedPanels,
    bool IsAuthPanelDismissed,
    WorkoutReminderSettings? WorkoutReminders,
    DateTimeOffset? UpdatedAt,
    bool? ShowRestTimer = null,
    IReadOnlyList<WorkoutCreatorProfile>? CreatorProfiles = null,
    string? SelectedCreatorProfileId = null,
    WeeklyPlanSettings? WeeklyPlan = null);
