using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Gymmin.Api.Domain;

namespace Gymmin.Api.Tests;

public sealed class AccountDeletionApiTests : IClassFixture<GymminApiFactory>
{
    private static readonly byte[] PngBytes =
    [
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52
    ];

    private readonly GymminApiFactory _factory;

    public AccountDeletionApiTests(GymminApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Delete_account_requires_authentication()
    {
        using var client = _factory.CreateClient();

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.DeleteAsync("/api/account")).StatusCode);
    }

    [Fact]
    public async Task User_can_delete_account_and_related_data_without_affecting_other_users()
    {
        using var client = _factory.CreateClient();
        var userA = await TestPayloads.RegisterAsync(client, "delete-account-a");
        var userB = await TestPayloads.RegisterAsync(client, "delete-account-b");

        client.Authorize(userA.Token);
        await SeedUserDataAsync(client, "deleted-workout", "deleted-session", "exercise-a", "first_workout");
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsync("/api/profile/avatar", CreateAvatarContent(PngBytes, "image/png"))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/api/ai-credits/dev/grant", new DevGrantAiCreditsRequest(1, "delete smoke"))).StatusCode);

        client.Authorize(userB.Token);
        await SeedUserDataAsync(client, "kept-workout", "kept-session", "exercise-b", "five_workouts");

        client.Authorize(userA.Token);
        var delete = await DeleteAccountAsync(client, "pass1234");
        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/me")).StatusCode);
        var oldLogin = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(userA.User.Email, "pass1234"));
        Assert.Equal(HttpStatusCode.Unauthorized, oldLogin.StatusCode);

        var newRegistration = await client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(userA.User.Email, "pass1234", "Recreated User"));
        Assert.Equal(HttpStatusCode.OK, newRegistration.StatusCode);
        var recreated = (await newRegistration.Content.ReadFromJsonAsync<AuthResponse>())!;
        client.Authorize(recreated.Token);
        await AssertEmptyNewAccountDataAsync(client);

        client.Authorize(userB.Token);
        var userBWorkouts = await client.GetFromJsonAsync<JsonElement>("/api/workouts/");
        Assert.True(userBWorkouts.ValueKind == JsonValueKind.Array);
        Assert.Contains(userBWorkouts.EnumerateArray(), workout => workout.GetProperty("clientWorkoutId").GetString() == "kept-workout");
        var userBFavorites = await client.GetFromJsonAsync<FavoriteExercisesResponse>("/api/favorite-exercises");
        Assert.Contains(userBFavorites!.Favorites, favorite => favorite.ExerciseId == "exercise-b");
    }

    [Fact]
    public async Task Delete_account_works_without_optional_user_data()
    {
        using var client = _factory.CreateClient();
        var user = await TestPayloads.RegisterAsync(client, "delete-empty");
        client.Authorize(user.Token);

        Assert.Equal(HttpStatusCode.NoContent, (await DeleteAccountAsync(client, "pass1234")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/me")).StatusCode);
    }

    [Fact]
    public async Task Delete_account_requires_current_password()
    {
        using var client = _factory.CreateClient();
        var user = await TestPayloads.RegisterAsync(client, "delete-reauth");
        client.Authorize(user.Token);

        Assert.Equal(HttpStatusCode.Forbidden, (await DeleteAccountAsync(client, "wrong-password")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await DeleteAccountAsync(client, "pass1234")).StatusCode);
    }

    private static async Task SeedUserDataAsync(
        HttpClient client,
        string workoutId,
        string sessionId,
        string exerciseId,
        string achievementId)
    {
        Assert.Equal(HttpStatusCode.OK, (await client.PutAsJsonAsync("/api/settings", new UpsertUserSettingsRequest(
            "pl",
            "light",
            "3",
            "20",
            StageType.Exercise,
            "guided",
            "vertical",
            new Dictionary<string, bool>(),
            true,
            null,
            DateTimeOffset.UtcNow))).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await client.PostAsJsonAsync("/api/workouts/", TestPayloads.Workout(workoutId))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.PutAsJsonAsync("/api/favorite-exercises", new PutFavoriteExercisesRequest(
            [TestPayloads.Favorite(exerciseId)],
            DateTimeOffset.UtcNow))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.PutAsJsonAsync($"/api/workout-sessions/{sessionId}", TestPayloads.WorkoutSession(sessionId))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/api/sync/achievements", new SyncAchievementsRequest(
            [new UserAchievementDto(achievementId, DateTimeOffset.UtcNow, 1, DateTimeOffset.UtcNow)],
            new AppUsageStatsDto(120, DateTimeOffset.UtcNow),
            null))).StatusCode);
    }

    private static async Task AssertEmptyNewAccountDataAsync(HttpClient client)
    {
        var workouts = await client.GetFromJsonAsync<JsonElement>("/api/workouts/");
        Assert.True(workouts.ValueKind == JsonValueKind.Array);
        Assert.Empty(workouts.EnumerateArray());

        var favorites = await client.GetFromJsonAsync<FavoriteExercisesResponse>("/api/favorite-exercises");
        Assert.Empty(favorites!.Favorites);

        var sessions = await client.GetFromJsonAsync<WorkoutSessionsResponse>("/api/workout-sessions/");
        Assert.Empty(sessions!.Sessions);

        var achievements = await client.GetFromJsonAsync<AchievementsResponse>("/api/achievements");
        Assert.Empty(achievements!.Unlocked);

        var avatar = await client.GetAsync("/api/profile/avatar");
        Assert.Equal(HttpStatusCode.NotFound, avatar.StatusCode);

        var credits = await client.GetFromJsonAsync<AiCreditBalanceResponse>("/api/ai-credits/balance");
        Assert.NotNull(credits);
    }

    private static MultipartFormDataContent CreateAvatarContent(byte[] bytes, string contentType)
    {
        var form = new MultipartFormDataContent();
        var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        form.Add(file, "avatar", "avatar.png");
        return form;
    }

    private static Task<HttpResponseMessage> DeleteAccountAsync(HttpClient client, string password)
    {
        var request = new HttpRequestMessage(HttpMethod.Delete, "/api/account")
        {
            Content = JsonContent.Create(new DeleteAccountRequest(password))
        };
        return client.SendAsync(request);
    }
}
