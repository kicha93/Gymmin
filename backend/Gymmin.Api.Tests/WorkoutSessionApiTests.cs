using System.Net;
using System.Net.Http.Json;
using Gymmin.Api.Domain;

namespace Gymmin.Api.Tests;

public sealed class WorkoutSessionApiTests : IClassFixture<GymminApiFactory>
{
    private readonly GymminApiFactory _factory;

    public WorkoutSessionApiTests(GymminApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Workout_sessions_put_get_delete_tombstone_and_user_isolation_work()
    {
        using var client = _factory.CreateClient();
        var userA = await TestPayloads.RegisterAsync(client, "session-a");
        var userB = await TestPayloads.RegisterAsync(client, "session-b");

        client.Authorize(userA.Token);
        var put = await client.PutAsJsonAsync("/api/workout-sessions/session-a-1", TestPayloads.WorkoutSession("ignored"));
        Assert.Equal(HttpStatusCode.OK, put.StatusCode);

        var list = await client.GetFromJsonAsync<WorkoutSessionsResponse>("/api/workout-sessions");
        Assert.Single(list!.Sessions);
        Assert.Equal("session-a-1", list.Sessions[0].ClientSessionId);

        client.Authorize(userB.Token);
        var listB = await client.GetFromJsonAsync<WorkoutSessionsResponse>("/api/workout-sessions");
        Assert.Empty(listB!.Sessions);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/api/workout-sessions/session-a-1")).StatusCode);

        client.Authorize(userA.Token);
        var delete = await client.DeleteAsync("/api/workout-sessions/session-a-1");
        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);

        var active = await client.GetFromJsonAsync<WorkoutSessionsResponse>("/api/workout-sessions");
        Assert.Empty(active!.Sessions);

        var includeDeleted = await client.GetFromJsonAsync<WorkoutSessionsResponse>("/api/workout-sessions?includeDeleted=true");
        Assert.Single(includeDeleted!.Sessions);
        Assert.NotNull(includeDeleted.Sessions[0].DeletedAt);
    }

    [Fact]
    public async Task Workout_session_sync_handles_tombstone()
    {
        using var client = _factory.CreateClient();
        var auth = await TestPayloads.RegisterAsync(client, "session-sync");
        client.Authorize(auth.Token);

        var create = await client.PostAsJsonAsync("/api/sync/workout-sessions", new SyncWorkoutSessionsRequest(
            null,
            [TestPayloads.WorkoutSession("sync-session-1")],
            []));
        Assert.Equal(HttpStatusCode.OK, create.StatusCode);

        var delete = await client.PostAsJsonAsync("/api/sync/workout-sessions", new SyncWorkoutSessionsRequest(
            null,
            [],
            ["sync-session-1"]));
        Assert.Equal(HttpStatusCode.OK, delete.StatusCode);

        var active = await client.GetFromJsonAsync<WorkoutSessionsResponse>("/api/workout-sessions");
        Assert.Empty(active!.Sessions);
    }

    [Theory]
    [InlineData("unknown", "guided")]
    [InlineData("completed", "unknown")]
    public async Task Workout_session_validation_rejects_invalid_status_or_execution_mode(string status, string executionMode)
    {
        using var client = _factory.CreateClient();
        var auth = await TestPayloads.RegisterAsync(client, "session-validation");
        client.Authorize(auth.Token);

        var response = await client.PutAsJsonAsync("/api/workout-sessions/session-invalid", TestPayloads.WorkoutSession(
            "session-invalid",
            status,
            executionMode));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Workout_session_sync_rejects_more_than_1000_items()
    {
        using var client = _factory.CreateClient();
        var auth = await TestPayloads.RegisterAsync(client, "session-limit");
        client.Authorize(auth.Token);

        var sessions = Enumerable.Range(0, 1001)
            .Select(index => TestPayloads.WorkoutSession($"session-{index}"))
            .ToList();

        var response = await client.PostAsJsonAsync("/api/sync/workout-sessions", new SyncWorkoutSessionsRequest(null, sessions, []));
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
