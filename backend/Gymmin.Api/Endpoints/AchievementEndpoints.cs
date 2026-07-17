using Gymmin.Api.Domain;
using Gymmin.Api.Services;

namespace Gymmin.Api.Endpoints;

internal static class AchievementEndpoints
{
    public static void MapAchievementEndpoints(this WebApplication app)
    {
        app.MapGet("/api/achievements", (
            HttpRequest request,
            IAchievementStore store,
            IUserStore users) =>
        {
            var userId = EndpointAuthorization.GetBearerUserId(request, users);
            return userId is null ? Results.Unauthorized() : Results.Ok(store.Get(userId));
        });

        app.MapPost("/api/sync/achievements", (
            SyncAchievementsRequest body,
            HttpRequest request,
            IAchievementStore store,
            IUserStore users,
            AuthRateLimiter rateLimiter) =>
        {
            var userId = EndpointAuthorization.GetBearerUserId(request, users);
            if (userId is null)
            {
                return Results.Unauthorized();
            }

            if (!rateLimiter.TryConsume("DataSyncUser", AuthRateLimiter.BuildKey(userId)))
            {
                return EndpointResults.RateLimited(request);
            }

            var validationError = Validate(body);
            return validationError is null
                ? Results.Ok(store.Sync(userId, body))
                : Results.BadRequest(new { error = validationError });
        });
    }

    private static string? Validate(SyncAchievementsRequest request)
    {
        const int maxAchievements = 500;
        const int maxAchievementIdLength = 100;
        const long maxForegroundSeconds = 10_000_000_000;

        if ((request.Unlocked?.Count ?? 0) > maxAchievements)
        {
            return "Too many achievements.";
        }

        foreach (var achievement in request.Unlocked ?? [])
        {
            if (string.IsNullOrWhiteSpace(achievement.AchievementId))
            {
                return "AchievementId is required.";
            }

            if (achievement.AchievementId.Trim().Length > maxAchievementIdLength)
            {
                return "AchievementId is too long.";
            }

            if (achievement.UnlockedAt == default)
            {
                return "UnlockedAt is required.";
            }

            if (achievement.ProgressAtUnlock is < 0)
            {
                return "ProgressAtUnlock cannot be negative.";
            }
        }

        if (request.AppUsageStats is not { } usage)
        {
            return null;
        }

        if (usage.TotalForegroundSeconds < 0)
        {
            return "TotalForegroundSeconds cannot be negative.";
        }

        if (usage.TotalForegroundSeconds > maxForegroundSeconds)
        {
            return "TotalForegroundSeconds is too large.";
        }

        return usage.UpdatedAt == default ? "App usage UpdatedAt is required." : null;
    }
}
