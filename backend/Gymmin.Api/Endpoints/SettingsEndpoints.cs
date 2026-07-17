using Gymmin.Api.Domain;
using Gymmin.Api.Services;

namespace Gymmin.Api.Endpoints;

internal static class SettingsEndpoints
{
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

        return null;
    }
}
