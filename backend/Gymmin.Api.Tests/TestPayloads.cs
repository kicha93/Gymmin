using System.Net.Http.Json;
using System.Text.Json;
using Gymmin.Api.Domain;

namespace Gymmin.Api.Tests;

public static class TestPayloads
{
    public static async Task<AuthResponse> RegisterAsync(HttpClient client, string emailPrefix = "user")
    {
        var email = $"{emailPrefix}-{Guid.NewGuid():N}@example.com";
        var response = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(email, "pass1234", "Test User"));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<AuthResponse>())!;
    }

    public static async Task<AuthResponse> LoginAsync(HttpClient client, string email, string password = "pass1234")
    {
        var response = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, password));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<AuthResponse>())!;
    }

    public static UpsertWorkoutRequest Workout(string clientWorkoutId, string name = "Push")
    {
        return new UpsertWorkoutRequest(
            clientWorkoutId,
            name,
            "Notes",
            SportType.Strength,
            [
                new UpsertWorkoutStepRequest(
                    "stage-1",
                    WorkoutStepKind.Stage,
                    "Main",
                    null,
                    null,
                    null,
                    null,
                    StageType.Exercise,
                    null,
                    null,
                    null,
                    null,
                    null)
            ],
            DateTimeOffset.UtcNow);
    }

    public static FavoriteExercise Favorite(string exerciseId, DateTimeOffset? timestamp = null, DateTimeOffset? deletedAt = null)
    {
        var now = timestamp ?? DateTimeOffset.UtcNow;
        return new FavoriteExercise(exerciseId, now, now, deletedAt);
    }

    public static UpsertWorkoutSessionRequest WorkoutSession(
        string clientSessionId,
        string status = "completed",
        string executionMode = "guided",
        DateTimeOffset? updatedAt = null,
        DateTimeOffset? deletedAt = null)
    {
        var now = updatedAt ?? DateTimeOffset.UtcNow;
        var startedAt = now.AddHours(-1);
        var session = JsonSerializer.SerializeToElement(new
        {
            id = clientSessionId,
            sourceWorkoutId = "workout-1",
            sourceWorkoutName = "Push",
            executionMode,
            status,
            startedAt,
            finishedAt = status == "completed" ? now : (DateTimeOffset?)null,
            abandonedAt = status == "abandoned" ? now : (DateTimeOffset?)null,
            updatedAt = now,
            deletedAt,
            entries = Array.Empty<object>()
        }, new JsonSerializerOptions(JsonSerializerDefaults.Web));

        return new UpsertWorkoutSessionRequest(clientSessionId, session, now, deletedAt);
    }
}
