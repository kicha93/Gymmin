using Gymmin.Api.Domain;
using Gymmin.Api.Services;

namespace Gymmin.Api.Endpoints;

internal static class WorkoutEndpoints
{
    public static void MapWorkoutEndpoints(this WebApplication app)
    {
        var workouts = app.MapGroup("/api/workouts");

        workouts.MapGet("/", (HttpRequest request, IWorkoutStore store, IUserStore users) =>
        {
            var userId = EndpointAuthorization.GetBearerUserId(request, users);
            return userId is null ? Results.Unauthorized() : Results.Ok(store.List(userId));
        });

        workouts.MapGet("/{clientWorkoutId}", (
            string clientWorkoutId,
            HttpRequest request,
            IWorkoutStore store,
            IUserStore users) =>
        {
            var userId = EndpointAuthorization.GetBearerUserId(request, users);
            if (userId is null)
            {
                return Results.Unauthorized();
            }

            var workout = store.Get(userId, clientWorkoutId);
            return workout is null ? Results.NotFound() : Results.Ok(workout);
        });

        workouts.MapPost("/", (
            UpsertWorkoutRequest body,
            HttpRequest request,
            IWorkoutStore store,
            IUserStore users) =>
        {
            var userId = EndpointAuthorization.GetBearerUserId(request, users);
            if (userId is null)
            {
                return Results.Unauthorized();
            }

            var validationError = ValidateWorkout(body);
            if (validationError is not null)
            {
                return Results.BadRequest(new { error = validationError });
            }

            var workout = store.Upsert(userId, body);
            return Results.Created($"/api/workouts/{workout.ClientWorkoutId}", workout);
        });

        workouts.MapPut("/{clientWorkoutId}", (
            string clientWorkoutId,
            UpsertWorkoutRequest body,
            HttpRequest request,
            IWorkoutStore store,
            IUserStore users) =>
        {
            var userId = EndpointAuthorization.GetBearerUserId(request, users);
            if (userId is null)
            {
                return Results.Unauthorized();
            }

            var requestBody = body with { ClientWorkoutId = clientWorkoutId };
            var validationError = ValidateWorkout(requestBody);
            return validationError is null
                ? Results.Ok(store.Upsert(userId, requestBody))
                : Results.BadRequest(new { error = validationError });
        });

        workouts.MapDelete("/{clientWorkoutId}", (
            string clientWorkoutId,
            HttpRequest request,
            IWorkoutStore store,
            IUserStore users) =>
        {
            var userId = EndpointAuthorization.GetBearerUserId(request, users);
            if (userId is null)
            {
                return Results.Unauthorized();
            }

            return store.Delete(userId, clientWorkoutId)
                ? Results.NoContent()
                : Results.NotFound();
        });

        workouts.MapPost("/{clientWorkoutId}/garmin-sync", (
            string clientWorkoutId,
            HttpRequest request,
            IWorkoutStore store,
            IUserStore users) =>
        {
            var userId = EndpointAuthorization.GetBearerUserId(request, users);
            if (userId is null)
            {
                return Results.Unauthorized();
            }

            var workout = store.Get(userId, clientWorkoutId);
            return workout is null
                ? Results.NotFound()
                : Results.Accepted($"/api/workouts/{clientWorkoutId}", new
                {
                    workoutId = workout.Id,
                    workout.ClientWorkoutId,
                    status = "queued",
                    note = "Garmin adapter will be added in a later milestone."
                });
        });

        app.MapPost("/api/sync/workouts", (
            SyncWorkoutsRequest body,
            HttpRequest request,
            IWorkoutStore store,
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

            var validationError = ValidateWorkoutSync(body);
            return validationError is null
                ? Results.Ok(store.Sync(userId, body))
                : Results.BadRequest(new { error = validationError });
        });
    }

    private static string? ValidateWorkout(UpsertWorkoutRequest request)
    {
        const int maxSteps = 500;
        if (string.IsNullOrWhiteSpace(request.ClientWorkoutId) || request.ClientWorkoutId.Length > 160)
        {
            return "ClientWorkoutId is invalid.";
        }

        if (string.IsNullOrWhiteSpace(request.Name) || request.Name.Length > 250)
        {
            return "Name is invalid.";
        }

        if ((request.Notes?.Length ?? 0) > 10_000 ||
            request.Steps is null ||
            request.Steps.Count > maxSteps)
        {
            return "Workout content is too large.";
        }

        foreach (var step in request.Steps)
        {
            if (step is null ||
                string.IsNullOrWhiteSpace(step.ClientStepId) ||
                step.ClientStepId.Length > 160 ||
                (step.Label?.Length ?? 0) > 500 ||
                (step.ExerciseName?.Length ?? 0) > 500 ||
                (step.Notes?.Length ?? 0) > 2_000 ||
                (step.TargetValue?.Length ?? 0) > 100 ||
                (step.RestSeconds?.Length ?? 0) > 10 ||
                (step.LoadKg?.Length ?? 0) > 100 ||
                (step.SetCount?.Length ?? 0) > 100 ||
                (!string.IsNullOrWhiteSpace(step.RestSeconds) &&
                 (!int.TryParse(step.RestSeconds, out var restSeconds) || restSeconds < 0 || restSeconds > 359_999)))
            {
                return "Workout step is invalid or too large.";
            }
        }

        return null;
    }

    private static string? ValidateWorkoutSync(SyncWorkoutsRequest request)
    {
        const int maxItems = 250;
        if (request.Workouts is null ||
            request.DeletedClientWorkoutIds is null ||
            request.Workouts.Count > maxItems ||
            request.DeletedClientWorkoutIds.Count > maxItems)
        {
            return "Too many workouts in one sync request.";
        }

        foreach (var workout in request.Workouts)
        {
            if (workout is null)
            {
                return "Workout is required.";
            }

            var error = ValidateWorkout(workout);
            if (error is not null)
            {
                return error;
            }
        }

        return request.DeletedClientWorkoutIds.Any(
            id => string.IsNullOrWhiteSpace(id) || id.Length > 160)
            ? "Deleted ClientWorkoutId is invalid."
            : null;
    }
}
