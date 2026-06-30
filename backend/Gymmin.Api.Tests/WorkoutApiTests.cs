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
}
