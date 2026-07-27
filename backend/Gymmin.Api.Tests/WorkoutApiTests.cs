using System.Net;
using System.Net.Http.Json;
using Gymmin.Api.Domain;

namespace Gymmin.Api.Tests;

public sealed class WorkoutApiTests : IClassFixture<GymminApiFactory>
{
    private readonly GymminApiFactory _factory;

    public WorkoutApiTests(GymminApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Workout_crud_soft_delete_and_user_isolation_work()
    {
        using var client = _factory.CreateClient();
        var userA = await TestPayloads.RegisterAsync(client, "workout-a");
        var userB = await TestPayloads.RegisterAsync(client, "workout-b");

        client.Authorize(userA.Token);
        var create = await client.PostAsJsonAsync("/api/workouts", TestPayloads.Workout("workout-a-1", "Push"));
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);

        var listA = await client.GetFromJsonAsync<IReadOnlyList<Workout>>("/api/workouts", TestJson.Options);
        Assert.Single(listA!);
        Assert.Equal("Push", listA![0].Name);

        var detail = await client.GetAsync("/api/workouts/workout-a-1");
        Assert.Equal(HttpStatusCode.OK, detail.StatusCode);

        var update = await client.PutAsJsonAsync("/api/workouts/workout-a-1", TestPayloads.Workout("ignored", "Push updated"));
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);
        var updated = await update.Content.ReadFromJsonAsync<Workout>(TestJson.Options);
        Assert.Equal("workout-a-1", updated!.ClientWorkoutId);
        Assert.Equal("Push updated", updated.Name);

        client.Authorize(userB.Token);
        var listB = await client.GetFromJsonAsync<IReadOnlyList<Workout>>("/api/workouts", TestJson.Options);
        Assert.Empty(listB!);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/api/workouts/workout-a-1")).StatusCode);

        client.Authorize(userA.Token);
        var delete = await client.DeleteAsync("/api/workouts/workout-a-1");
        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);

        var afterDelete = await client.GetFromJsonAsync<IReadOnlyList<Workout>>("/api/workouts", TestJson.Options);
        Assert.Empty(afterDelete!);
    }

    [Fact]
    public async Task Workout_sync_keeps_scope_per_user()
    {
        using var client = _factory.CreateClient();
        var userA = await TestPayloads.RegisterAsync(client, "sync-a");
        var userB = await TestPayloads.RegisterAsync(client, "sync-b");

        client.Authorize(userA.Token);
        var sync = await client.PostAsJsonAsync("/api/sync/workouts", new SyncWorkoutsRequest(
            [TestPayloads.Workout("sync-workout-a", "Synced")],
            [],
            null));
        Assert.Equal(HttpStatusCode.OK, sync.StatusCode);

        client.Authorize(userB.Token);
        var listB = await client.GetFromJsonAsync<IReadOnlyList<Workout>>("/api/workouts", TestJson.Options);
        Assert.Empty(listB!);
    }

    [Fact]
    public async Task Workout_roundtrip_preserves_rest_between_sets()
    {
        using var client = _factory.CreateClient();
        var user = await TestPayloads.RegisterAsync(client, "workout-rest");
        client.Authorize(user.Token);

        var request = TestPayloads.Workout("workout-with-rest") with
        {
            Steps =
            [
                TestPayloads.Workout("template").Steps[0] with
                {
                    ClientStepId = "exercise-1",
                    Kind = WorkoutStepKind.Exercise,
                    ParentSetClientId = "set-1",
                    RestSeconds = "120"
                },
                TestPayloads.Workout("template").Steps[0] with
                {
                    ClientStepId = "exercise-1-rest-compat",
                    Kind = WorkoutStepKind.Exercise,
                    ParentSetClientId = "set-1",
                    StageType = StageType.Rest,
                    GoalType = GoalType.Time,
                    TargetValue = "00:02:00"
                }
            ]
        };

        var create = await client.PostAsJsonAsync("/api/workouts", request);
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);

        var stored = await client.GetFromJsonAsync<Workout>("/api/workouts/workout-with-rest", TestJson.Options);
        Assert.Equal("120", Assert.Single(stored!.Steps).RestSeconds);
    }

    [Fact]
    public async Task Stale_workout_sync_does_not_erase_newer_server_rest_values()
    {
        using var client = _factory.CreateClient();
        var user = await TestPayloads.RegisterAsync(client, "workout-rest-stale");
        client.Authorize(user.Token);
        var clientUpdatedAt = DateTimeOffset.UtcNow.AddMinutes(-5);
        var exercise = TestPayloads.Workout("template").Steps[0] with
        {
            ClientStepId = "exercise-1",
            Kind = WorkoutStepKind.Exercise,
            ExerciseName = "Barbell Deadlift",
            ParentSetClientId = "set-1",
            RestSeconds = "180"
        };
        var request = TestPayloads.Workout("workout-rest-stale") with
        {
            ClientUpdatedAt = clientUpdatedAt,
            Steps = [exercise]
        };

        var create = await client.PostAsJsonAsync("/api/workouts", request);
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);

        var staleRequest = request with
        {
            Steps = [exercise with { RestSeconds = "" }]
        };
        var sync = await client.PostAsJsonAsync("/api/sync/workouts", new SyncWorkoutsRequest(
            [staleRequest],
            [],
            null));
        Assert.Equal(HttpStatusCode.OK, sync.StatusCode);

        var stored = await client.GetFromJsonAsync<Workout>("/api/workouts/workout-rest-stale", TestJson.Options);
        Assert.Equal("180", Assert.Single(stored!.Steps).RestSeconds);

        var explicitClear = request with
        {
            ClientUpdatedAt = DateTimeOffset.UtcNow,
            Steps = [exercise with { RestSeconds = "0" }]
        };
        var clear = await client.PutAsJsonAsync("/api/workouts/workout-rest-stale", explicitClear);
        Assert.Equal(HttpStatusCode.OK, clear.StatusCode);

        stored = await client.GetFromJsonAsync<Workout>("/api/workouts/workout-rest-stale", TestJson.Options);
        Assert.Equal("0", Assert.Single(stored!.Steps).RestSeconds);
    }
}
