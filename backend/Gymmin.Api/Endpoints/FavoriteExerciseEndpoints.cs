using Gymmin.Api.Domain;
using Gymmin.Api.Services;

namespace Gymmin.Api.Endpoints;

internal static class FavoriteExerciseEndpoints
{
    public static void MapFavoriteExerciseEndpoints(this WebApplication app)
    {
        app.MapGet("/api/favorite-exercises", (
            HttpRequest request,
            IFavoriteExerciseStore store,
            IUserStore users) =>
        {
            var userId = EndpointAuthorization.GetBearerUserId(request, users);
            return userId is null ? Results.Unauthorized() : Results.Ok(store.Get(userId));
        });

        app.MapPut("/api/favorite-exercises", (
            PutFavoriteExercisesRequest body,
            HttpRequest request,
            IFavoriteExerciseStore store,
            IUserStore users) =>
        {
            var userId = EndpointAuthorization.GetBearerUserId(request, users);
            if (userId is null)
            {
                return Results.Unauthorized();
            }

            var validationError = Validate(body.Favorites);
            return validationError is null
                ? Results.Ok(store.Put(userId, body))
                : Results.BadRequest(new { error = validationError });
        });

        app.MapPost("/api/sync/favorite-exercises", (
            SyncFavoriteExercisesRequest body,
            HttpRequest request,
            IFavoriteExerciseStore store,
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

            var validationError = Validate(body.Favorites, body.DeletedExerciseIds);
            return validationError is null
                ? Results.Ok(store.Sync(userId, body))
                : Results.BadRequest(new { error = validationError });
        });
    }

    private static string? Validate(
        IReadOnlyList<FavoriteExercise>? favorites,
        IReadOnlyList<string>? deletedExerciseIds = null)
    {
        const int maxItems = 1_000;
        if ((favorites?.Count ?? 0) > maxItems || (deletedExerciseIds?.Count ?? 0) > maxItems)
        {
            return "Too many favorite exercises.";
        }

        return (favorites ?? []).Any(favorite => string.IsNullOrWhiteSpace(favorite.ExerciseId)) ||
            (deletedExerciseIds ?? []).Any(string.IsNullOrWhiteSpace)
            ? "ExerciseId is required."
            : null;
    }
}
