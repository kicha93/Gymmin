using System.Net;
using System.Net.Http.Json;
using Gymmin.Api.Domain;

namespace Gymmin.Api.Tests;

public sealed class AuthAndSettingsTests : IClassFixture<GymminApiFactory>
{
    private readonly GymminApiFactory _factory;

    public AuthAndSettingsTests(GymminApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Register_login_me_and_logout_flow_works()
    {
        using var client = _factory.CreateClient();
        var registered = await TestPayloads.RegisterAsync(client, "auth");

        Assert.False(string.IsNullOrWhiteSpace(registered.Token));
        Assert.Contains("@example.com", registered.User.Email);

        var login = await TestPayloads.LoginAsync(client, registered.User.Email);
        client.Authorize(login.Token);

        var me = await client.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.OK, me.StatusCode);

        var user = await me.Content.ReadFromJsonAsync<AuthUserResponse>();
        Assert.Equal(registered.User.Email, user!.Email);

        var logout = await client.PostAsync("/api/auth/logout", null);
        Assert.Equal(HttpStatusCode.NoContent, logout.StatusCode);

        var afterLogout = await client.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.Unauthorized, afterLogout.StatusCode);
    }

    [Fact]
    public async Task Account_endpoints_require_bearer_token()
    {
        using var client = _factory.CreateClient();

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/me")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/settings")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/workouts")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/favorite-exercises")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/workout-sessions")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/workout-creator/plan", new
        {
            questionsAndAnswers = new[] { new { question = "Q", answer = "A" } },
            language = "pl"
        })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/workout-creator/rewrite", new
        {
            language = "pl",
            workout = new { name = "Push" },
            instruction = "Shorten"
        })).StatusCode);
    }

    [Fact]
    public async Task Settings_roundtrip_persists_workout_reminders()
    {
        using var client = _factory.CreateClient();
        var auth = await TestPayloads.RegisterAsync(client, "settings");
        client.Authorize(auth.Token);

        var empty = await client.GetAsync("/api/settings");
        Assert.Equal(HttpStatusCode.NoContent, empty.StatusCode);

        var reminder = new WorkoutReminderSettings(
            true,
            [1, 3, 5],
            "18:00",
            "Time to train",
            true,
            DateTimeOffset.UtcNow);
        var request = new UpsertUserSettingsRequest(
            "en",
            "dark",
            "4",
            "80",
            StageType.Exercise,
            "guided",
            new Dictionary<string, bool> { ["settings"] = true },
            true,
            reminder,
            DateTimeOffset.UtcNow);

        var put = await client.PutAsJsonAsync("/api/settings", request);
        Assert.Equal(HttpStatusCode.OK, put.StatusCode);

        var get = await client.GetAsync("/api/settings");
        Assert.Equal(HttpStatusCode.OK, get.StatusCode);

        var settings = await get.Content.ReadFromJsonAsync<UserSettings>(TestJson.Options);
        Assert.NotNull(settings);
        Assert.Equal("dark", settings!.ThemeName);
        Assert.Equal("guided", settings.DefaultWorkoutExecutionMode);
        Assert.NotNull(settings.WorkoutReminders);
        Assert.True(settings.WorkoutReminders!.Enabled);
        Assert.Equal("18:00", settings.WorkoutReminders.Time);
        Assert.Equal([1, 3, 5], settings.WorkoutReminders.DaysOfWeek);
    }
}
