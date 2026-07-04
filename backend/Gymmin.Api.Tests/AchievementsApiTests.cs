using System.Net;
using System.Net.Http.Json;
using Gymmin.Api.Domain;

namespace Gymmin.Api.Tests;

public sealed class AchievementsApiTests : IClassFixture<GymminApiFactory>
{
    private readonly GymminApiFactory _factory;

    public AchievementsApiTests(GymminApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Achievements_require_auth()
    {
        using var client = _factory.CreateClient();

        var getResponse = await client.GetAsync("/api/achievements");
        var syncResponse = await client.PostAsJsonAsync("/api/sync/achievements", new
        {
            unlocked = Array.Empty<object>(),
            appUsageStats = new { totalForegroundSeconds = 0, updatedAt = DateTimeOffset.UtcNow }
        });

        Assert.Equal(HttpStatusCode.Unauthorized, getResponse.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, syncResponse.StatusCode);
    }

    [Fact]
    public async Task New_user_gets_empty_achievement_state()
    {
        using var client = _factory.CreateClient();
        var auth = await TestPayloads.RegisterAsync(client, "ach-empty");
        client.Authorize(auth.Token);

        var state = await client.GetFromJsonAsync<AchievementsResponse>("/api/achievements");

        Assert.NotNull(state);
        Assert.Empty(state!.Unlocked);
        Assert.Equal(0, state.AppUsageStats.TotalForegroundSeconds);
    }

    [Fact]
    public async Task Sync_merges_unlocked_achievements_without_duplicates()
    {
        using var client = _factory.CreateClient();
        var auth = await TestPayloads.RegisterAsync(client, "ach-sync");
        client.Authorize(auth.Token);

        var later = DateTimeOffset.Parse("2026-07-02T10:00:00Z");
        var earlier = DateTimeOffset.Parse("2026-07-01T10:00:00Z");

        var first = await Sync(client, [
            new UserAchievementDto("first_workout", later, 1, later)
        ], 3600);
        var second = await Sync(client, [
            new UserAchievementDto("first_workout", earlier, 2, earlier),
            new UserAchievementDto("five_workouts", later, 5, later)
        ], 1800);

        Assert.Single(first.Unlocked);
        Assert.Equal(2, second.Unlocked.Count);

        var persisted = await client.GetFromJsonAsync<AchievementsResponse>("/api/achievements");
        var firstWorkout = Assert.Single(persisted!.Unlocked, item => item.AchievementId == "first_workout");
        Assert.Equal(earlier, firstWorkout.UnlockedAt);
        Assert.Equal(2, firstWorkout.ProgressAtUnlock);
        Assert.Equal(3600, persisted.AppUsageStats.TotalForegroundSeconds);
    }

    [Fact]
    public async Task Users_only_see_their_own_achievements()
    {
        using var clientA = _factory.CreateClient();
        using var clientB = _factory.CreateClient();
        var authA = await TestPayloads.RegisterAsync(clientA, "ach-user-a");
        var authB = await TestPayloads.RegisterAsync(clientB, "ach-user-b");
        clientA.Authorize(authA.Token);
        clientB.Authorize(authB.Token);

        await Sync(clientA, [new UserAchievementDto("first_workout", DateTimeOffset.UtcNow, 1, DateTimeOffset.UtcNow)], 120);
        await Sync(clientB, [new UserAchievementDto("five_workouts", DateTimeOffset.UtcNow, 5, DateTimeOffset.UtcNow)], 240);

        var stateA = await clientA.GetFromJsonAsync<AchievementsResponse>("/api/achievements");
        var stateB = await clientB.GetFromJsonAsync<AchievementsResponse>("/api/achievements");

        Assert.Contains(stateA!.Unlocked, item => item.AchievementId == "first_workout");
        Assert.DoesNotContain(stateA.Unlocked, item => item.AchievementId == "five_workouts");
        Assert.Contains(stateB!.Unlocked, item => item.AchievementId == "five_workouts");
        Assert.DoesNotContain(stateB.Unlocked, item => item.AchievementId == "first_workout");
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Sync_rejects_empty_achievement_id(string achievementId)
    {
        using var client = _factory.CreateClient();
        var auth = await TestPayloads.RegisterAsync(client, "ach-invalid-id");
        client.Authorize(auth.Token);

        var response = await client.PostAsJsonAsync("/api/sync/achievements", new
        {
            unlocked = new[] { new { achievementId, unlockedAt = DateTimeOffset.UtcNow, progressAtUnlock = 1 } },
            appUsageStats = new { totalForegroundSeconds = 0, updatedAt = DateTimeOffset.UtcNow }
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Sync_rejects_invalid_payload_limits()
    {
        using var client = _factory.CreateClient();
        var auth = await TestPayloads.RegisterAsync(client, "ach-invalid-payload");
        client.Authorize(auth.Token);

        var tooMany = Enumerable.Range(0, 501)
            .Select(index => new { achievementId = $"achievement-{index}", unlockedAt = DateTimeOffset.UtcNow, progressAtUnlock = 1 })
            .ToArray();
        var tooManyResponse = await client.PostAsJsonAsync("/api/sync/achievements", new
        {
            unlocked = tooMany,
            appUsageStats = new { totalForegroundSeconds = 0, updatedAt = DateTimeOffset.UtcNow }
        });

        var negativeProgressResponse = await client.PostAsJsonAsync("/api/sync/achievements", new
        {
            unlocked = new[] { new { achievementId = "first_workout", unlockedAt = DateTimeOffset.UtcNow, progressAtUnlock = -1 } },
            appUsageStats = new { totalForegroundSeconds = 0, updatedAt = DateTimeOffset.UtcNow }
        });

        var negativeUsageResponse = await client.PostAsJsonAsync("/api/sync/achievements", new
        {
            unlocked = Array.Empty<object>(),
            appUsageStats = new { totalForegroundSeconds = -1, updatedAt = DateTimeOffset.UtcNow }
        });

        Assert.Equal(HttpStatusCode.BadRequest, tooManyResponse.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, negativeProgressResponse.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, negativeUsageResponse.StatusCode);
    }

    [Fact]
    public async Task App_usage_stats_only_increase()
    {
        using var client = _factory.CreateClient();
        var auth = await TestPayloads.RegisterAsync(client, "ach-usage");
        client.Authorize(auth.Token);

        await Sync(client, [], 7200);
        await Sync(client, [], 3600);

        var state = await client.GetFromJsonAsync<AchievementsResponse>("/api/achievements");

        Assert.Equal(7200, state!.AppUsageStats.TotalForegroundSeconds);
    }

    private static async Task<AchievementsResponse> Sync(
        HttpClient client,
        IReadOnlyList<UserAchievementDto> unlocked,
        long totalForegroundSeconds)
    {
        var response = await client.PostAsJsonAsync("/api/sync/achievements", new SyncAchievementsRequest(
            unlocked,
            new AppUsageStatsDto(totalForegroundSeconds, DateTimeOffset.UtcNow),
            null));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<AchievementsResponse>())!;
    }
}
