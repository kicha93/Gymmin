namespace Gymmin.Api.Domain;

public sealed record UserSettings(
    string UserId,
    string Language,
    string ThemeName,
    string DefaultSetCount,
    string DefaultWeight,
    StageType? DefaultStageType,
    string DefaultWorkoutExecutionMode,
    IReadOnlyDictionary<string, bool> CollapsedPanels,
    bool IsAuthPanelDismissed,
    WorkoutReminderSettings? WorkoutReminders,
    DateTimeOffset UpdatedAt)
{
    public static UserSettings FromRequest(string userId, UpsertUserSettingsRequest request, UserSettings? existing = null)
    {
        return new UserSettings(
            userId,
            NormalizeOption(request.Language, existing?.Language ?? "en"),
            NormalizeOption(request.ThemeName, existing?.ThemeName ?? "light"),
            request.DefaultSetCount?.Trim() ?? string.Empty,
            request.DefaultWeight?.Trim() ?? string.Empty,
            request.DefaultStageType,
            NormalizeOption(request.DefaultWorkoutExecutionMode, existing?.DefaultWorkoutExecutionMode ?? "guided"),
            request.CollapsedPanels ?? new Dictionary<string, bool>(),
            request.IsAuthPanelDismissed,
            request.WorkoutReminders ?? existing?.WorkoutReminders,
            request.UpdatedAt ?? DateTimeOffset.UtcNow);
    }

    private static string NormalizeOption(string? value, string fallback)
    {
        var normalized = value?.Trim();
        return string.IsNullOrWhiteSpace(normalized) ? fallback : normalized;
    }
}

public sealed record WorkoutReminderSettings(
    bool Enabled,
    IReadOnlyList<int> DaysOfWeek,
    string Time,
    string Message,
    string? Description,
    bool OnlyIfNoWorkoutToday,
    DateTimeOffset? UpdatedAt);

public sealed record UpsertUserSettingsRequest(
    string? Language,
    string? ThemeName,
    string? DefaultSetCount,
    string? DefaultWeight,
    StageType? DefaultStageType,
    string? DefaultWorkoutExecutionMode,
    IReadOnlyDictionary<string, bool>? CollapsedPanels,
    bool IsAuthPanelDismissed,
    WorkoutReminderSettings? WorkoutReminders,
    DateTimeOffset? UpdatedAt);
