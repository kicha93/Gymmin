using System.Text.Json;
using Gymmin.Api.Domain;
using Gymmin.Api.Services;

namespace Gymmin.Api.Endpoints;

internal static class SettingsEndpoints
{
    private static readonly HashSet<string> WeeklyPlanDays = new(StringComparer.Ordinal)
    {
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday"
    };

    public static void MapSettingsEndpoints(this WebApplication app)
    {
        app.MapGet("/api/settings", (
            HttpRequest request,
            IUserStore users,
            IUserSettingsStore settingsStore) =>
        {
            var userId = EndpointAuthorization.GetBearerUserId(request, users);
            if (userId is null)
            {
                return Results.Unauthorized();
            }

            var settings = settingsStore.Get(userId);
            return settings is null ? Results.NoContent() : Results.Ok(settings);
        });

        app.MapPut("/api/settings", (
            UpsertUserSettingsRequest body,
            HttpRequest request,
            IUserStore users,
            IUserSettingsStore settingsStore) =>
        {
            var userId = EndpointAuthorization.GetBearerUserId(request, users);
            if (userId is null)
            {
                return Results.Unauthorized();
            }

            var validationError = Validate(body);
            if (validationError is not null)
            {
                return Results.BadRequest(new { error = validationError });
            }

            return Results.Ok(settingsStore.Upsert(userId, body));
        });
    }

    private static string? Validate(UpsertUserSettingsRequest request)
    {
        if ((request.Language?.Length ?? 0) > 16 ||
            (request.ThemeName?.Length ?? 0) > 32 ||
            (request.DefaultSetCount?.Length ?? 0) > 32 ||
            (request.DefaultWeight?.Length ?? 0) > 32 ||
            (request.DefaultWorkoutExecutionMode?.Length ?? 0) > 64 ||
            (request.DefaultWorkoutTableOrientation?.Length ?? 0) > 20 ||
            (request.CollapsedPanels?.Count ?? 0) > 250)
        {
            return "Settings are too large.";
        }

        if ((request.CollapsedPanels ?? new Dictionary<string, bool>())
            .Keys.Any(key => string.IsNullOrWhiteSpace(key) || key.Length > 160))
        {
            return "Collapsed panel key is invalid.";
        }

        if (request.WorkoutReminders is { } reminders &&
            ((reminders.Message?.Length ?? 0) > 500 ||
             (reminders.Description?.Length ?? 0) > 1_000 ||
             (reminders.DaysOfWeek?.Count ?? 0) > 7 ||
             (reminders.WeeklySchedule?.Count ?? 0) > 7))
        {
            return "Workout reminder settings are too large.";
        }

        if (request.CreatorProfiles is { } profiles)
        {
            if (profiles.Count > 25 ||
                JsonSerializer.SerializeToUtf8Bytes(profiles).Length > 128 * 1024 ||
                profiles.Any(profile => !IsValidCreatorProfile(profile)) ||
                profiles.Select(profile => profile.Id).Distinct(StringComparer.Ordinal).Count() != profiles.Count)
            {
                return "Creator profiles are invalid or too large.";
            }

            if (request.SelectedCreatorProfileId is { } selectedId &&
                (selectedId.Length > 128 || !profiles.Any(profile => profile is not null && profile.Id == selectedId)))
            {
                return "Selected creator profile is invalid.";
            }
        }

        if (request.WeeklyPlan is { } weeklyPlan &&
            (weeklyPlan.Items is null ||
             weeklyPlan.Items.Count > 100 ||
             JsonSerializer.SerializeToUtf8Bytes(weeklyPlan).Length > 64 * 1024 ||
             weeklyPlan.Items.Any(item => !IsValidWeeklyPlanItem(item)) ||
             weeklyPlan.Items
                 .Select(item => $"{item.WorkoutId}:{item.Day}")
                 .Distinct(StringComparer.Ordinal)
                 .Count() != weeklyPlan.Items.Count))
        {
            return "Weekly plan is invalid or too large.";
        }

        return null;
    }

    private static bool IsValidCreatorProfile(WorkoutCreatorProfile? profile)
    {
        if (profile is null || profile.Draft is null ||
            string.IsNullOrWhiteSpace(profile.Id) || profile.Id.Length > 128 ||
            string.IsNullOrWhiteSpace(profile.Name) || profile.Name.Length > 120 ||
            profile.Draft.Count > 100 ||
            profile.Draft.Keys.Any(key => string.IsNullOrWhiteSpace(key) || key.Length > 120))
        {
            return false;
        }

        return profile.Draft.Values.All(value => value.ValueKind switch
        {
            JsonValueKind.String => (value.GetString()?.Length ?? 0) <= 4_000,
            JsonValueKind.Array => value.GetArrayLength() <= 50 && value.EnumerateArray().All(
                item => item.ValueKind == JsonValueKind.String && (item.GetString()?.Length ?? 0) <= 500),
            _ => false
        });
    }

    private static bool IsValidWeeklyPlanItem(WeeklyPlanItem? item)
    {
        return item is not null &&
            !string.IsNullOrWhiteSpace(item.WorkoutId) &&
            item.WorkoutId.Length <= 128 &&
            WeeklyPlanDays.Contains(item.Day) &&
            item.Order is >= 0 and <= 10_000;
    }
}
