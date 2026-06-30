using System.Net;
using System.Net.Http.Json;
using Gymmin.Api.Domain;

namespace Gymmin.Api.Tests;

public sealed class FavoriteExerciseApiTests : IClassFixture<GymminApiFactory>
{
    private readonly GymminApiFactory _factory;

    public FavoriteExerciseApiTests(GymminApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Favorites_put_get_tombstone_and_user_isolation_work()
    {
        using var client = _factory.CreateClient();
        var userA = await TestPayloads.RegisterAsync(client, "fav-a");
        var userB = await TestPayloads.RegisterAsync(client, "fav-b");

        client.Authorize(userA.Token);
        var put = await client.PutAsJsonAsync("/api/favorite-exercises", new PutFavoriteExercisesRequest(
            [TestPayloads.Favorite("bench-press")],
            DateTimeOffset.UtcNow));
        Assert.Equal(HttpStatusCode.OK, put.StatusCode);

        var get = await client.GetFromJsonAsync<FavoriteExercisesResponse>("/api/favorite-exercises");
        Assert.Single(get!.Favorites);
        Assert.Equal("bench-press", get.Favorites[0].ExerciseId);

        var syncDelete = await client.PostAsJsonAsync("/api/sync/favorite-exercises", new SyncFavoriteExercisesRequest(
            null,
            [],
            ["bench-press"]));
        Assert.Equal(HttpStatusCode.OK, syncDelete.StatusCode);

        var activeAfterDelete = await client.GetFromJsonAsync<FavoriteExercisesResponse>("/api/favorite-exercises");
        Assert.Empty(activeAfterDelete!.Favorites);

        client.Authorize(userB.Token);
        var getB = await client.GetFromJsonAsync<FavoriteExercisesResponse>("/api/favorite-exercises");
        Assert.Empty(getB!.Favorites);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Favorite_validation_rejects_empty_exercise_id(string exerciseId)
    {
        using var client = _factory.CreateClient();
        var auth = await TestPayloads.RegisterAsync(client, "fav-validation");
        client.Authorize(auth.Token);

        var response = await client.PutAsJsonAsync("/api/favorite-exercises", new PutFavoriteExercisesRequest(
            [TestPayloads.Favorite(exerciseId)],
            DateTimeOffset.UtcNow));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Favorite_sync_rejects_more_than_1000_items()
    {
        using var client = _factory.CreateClient();
        var auth = await TestPayloads.RegisterAsync(client, "fav-limit");
        client.Authorize(auth.Token);

        var favorites = Enumerable.Range(0, 1001)
            .Select(index => TestPayloads.Favorite($"exercise-{index}"))
            .ToList();

        var response = await client.PostAsJsonAsync("/api/sync/favorite-exercises", new SyncFavoriteExercisesRequest(null, favorites, []));
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
