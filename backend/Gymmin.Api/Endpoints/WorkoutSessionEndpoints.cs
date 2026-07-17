using System.Text.Json;
using Gymmin.Api.Domain;
using Gymmin.Api.Services;

namespace Gymmin.Api.Endpoints;

internal static class WorkoutSessionEndpoints
{
    public static void MapWorkoutSessionEndpoints(this WebApplication app)
    {
        var workoutSessions = app.MapGroup("/api/workout-sessions");

        workoutSessions.MapGet("/", (
            bool? includeDeleted,
            DateTimeOffset? since,
            HttpRequest request,
            IWorkoutSessionStore store,
            IUserStore users) =>
        {
            var userId = EndpointAuthorization.GetBearerUserId(request, users);
            return userId is null
                ? Results.Unauthorized()
                : Results.Ok(store.List(userId, includeDeleted == true, since));
        });

        workoutSessions.MapGet("/{clientSessionId}", (
            string clientSessionId,
            HttpRequest request,
            IWorkoutSessionStore store,
            IUserStore users) =>
        {
            var userId = EndpointAuthorization.GetBearerUserId(request, users);
            if (userId is null)
            {
                return Results.Unauthorized();
            }

            var session = store.Get(userId, clientSessionId);
            return session is null ? Results.NotFound() : Results.Ok(session);
        });

        workoutSessions.MapPut("/{clientSessionId}", (
            string clientSessionId,
            UpsertWorkoutSessionRequest body,
            HttpRequest request,
            IWorkoutSessionStore store,
            IUserStore users) =>
        {
            var userId = EndpointAuthorization.GetBearerUserId(request, users);
            if (userId is null)
            {
                return Results.Unauthorized();
            }

            var requestBody = body with { ClientSessionId = clientSessionId };
            var validationError = Validate(requestBody);
            return validationError is null
                ? Results.Ok(store.Upsert(userId, requestBody))
                : Results.BadRequest(new { error = validationError });
        });

        workoutSessions.MapDelete("/{clientSessionId}", (
            string clientSessionId,
            HttpRequest request,
            IWorkoutSessionStore store,
            IUserStore users) =>
        {
            var userId = EndpointAuthorization.GetBearerUserId(request, users);
            if (userId is null)
            {
                return Results.Unauthorized();
            }

            return store.Delete(userId, clientSessionId)
                ? Results.NoContent()
                : Results.NotFound();
        });

        app.MapPost("/api/sync/workout-sessions", (
            SyncWorkoutSessionsRequest body,
            HttpRequest request,
            IWorkoutSessionStore store,
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

            var validationError = ValidateSync(body);
            return validationError is null
                ? Results.Ok(store.Sync(userId, body))
                : Results.BadRequest(new { error = validationError });
        });
    }

    private static string? ValidateSync(SyncWorkoutSessionsRequest request)
    {
        const int maxItems = 1_000;
        if ((request.Sessions?.Count ?? 0) > maxItems ||
            (request.DeletedClientSessionIds?.Count ?? 0) > maxItems)
        {
            return "Too many workout sessions.";
        }

        foreach (var session in request.Sessions ?? [])
        {
            var validationError = Validate(session);
            if (validationError is not null)
            {
                return validationError;
            }
        }

        return (request.DeletedClientSessionIds ?? []).Any(string.IsNullOrWhiteSpace)
            ? "ClientSessionId is required."
            : null;
    }

    private static string? Validate(UpsertWorkoutSessionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.ClientSessionId) ||
            request.ClientSessionId.Length > 160)
        {
            return "ClientSessionId is required.";
        }

        if (request.Session.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null)
        {
            return "Session is required.";
        }

        if (request.Session.GetRawText().Length > 512_000)
        {
            return "Workout session is too large.";
        }

        if (!TryGetJsonString(request.Session, "status", out var status) ||
            status is not ("active" or "completed" or "abandoned"))
        {
            return "Invalid workout session status.";
        }

        return !TryGetJsonString(request.Session, "executionMode", out var executionMode) ||
            executionMode is not ("guided" or "readonly-post-workout" or "inline-table")
            ? "Invalid workout execution mode."
            : null;
    }

    private static bool TryGetJsonString(JsonElement element, string propertyName, out string value)
    {
        value = "";
        if (element.ValueKind != JsonValueKind.Object ||
            !element.TryGetProperty(propertyName, out var property) ||
            property.ValueKind != JsonValueKind.String)
        {
            return false;
        }

        value = property.GetString() ?? "";
        return !string.IsNullOrWhiteSpace(value);
    }
}
