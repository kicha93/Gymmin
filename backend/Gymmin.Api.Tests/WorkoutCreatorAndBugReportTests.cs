using System.Net;
using System.Net.Http.Json;
using Gymmin.Api.Domain;

namespace Gymmin.Api.Tests;

public sealed class WorkoutCreatorAndBugReportTests : IClassFixture<GymminApiFactory>
{
    private readonly GymminApiFactory _factory;

    public WorkoutCreatorAndBugReportTests(GymminApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Workout_creator_plan_and_rewrite_require_auth_and_are_owner_scoped()
    {
        using var client = _factory.CreateClient();
        var userA = await TestPayloads.RegisterAsync(client, "creator-a");
        var userB = await TestPayloads.RegisterAsync(client, "creator-b");

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/workout-creator/plan", new CreateWorkoutPlanRequest(
            [new WorkoutCreatorQuestionAnswer("Q", "A")],
            "en",
            null))).StatusCode);

        client.Authorize(userA.Token);
        var planStart = await client.PostAsJsonAsync("/api/workout-creator/plan", new CreateWorkoutPlanRequest(
            [new WorkoutCreatorQuestionAnswer("Goal", "Strength")],
            "en",
            "profile-1"));
        Assert.Equal(HttpStatusCode.Accepted, planStart.StatusCode);
        var planJob = await planStart.Content.ReadFromJsonAsync<CreateWorkoutPlanJobResponse>();
        Assert.NotNull(planJob);

        var ownerStatus = await WaitForJobAsync(client, $"/api/workout-creator/plan/{planJob!.JobId}");
        Assert.Equal(HttpStatusCode.OK, ownerStatus.StatusCode);

        client.Authorize(userB.Token);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/workout-creator/plan/{planJob.JobId}")).StatusCode);

        client.ClearAuthorization();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync($"/api/workout-creator/plan/{planJob.JobId}")).StatusCode);

        client.Authorize(userA.Token);
        var rewriteStart = await client.PostAsJsonAsync("/api/workout-creator/rewrite", new
        {
            language = "en",
            workout = new { name = "Push", steps = Array.Empty<object>() },
            instruction = "Shorten"
        });
        Assert.Equal(HttpStatusCode.Accepted, rewriteStart.StatusCode);
        var rewriteJob = await rewriteStart.Content.ReadFromJsonAsync<CreateWorkoutPlanJobResponse>();
        Assert.NotNull(rewriteJob);

        var rewriteStatus = await WaitForJobAsync(client, $"/api/workout-creator/jobs/{rewriteJob!.JobId}");
        Assert.Equal(HttpStatusCode.OK, rewriteStatus.StatusCode);
    }

    [Fact]
    public async Task Bug_report_success_path_uses_fake_sender()
    {
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/bug-reports", new CreateBugReportRequest(
            "Something broke",
            "The app showed an error",
            "Android",
            "Settings",
            "en",
            "1.0"));

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<BugReportResponse>();
        Assert.Equal("sent", body!.Status);
    }

    [Fact]
    public async Task Bug_report_validation_rejects_empty_payload()
    {
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/bug-reports", new CreateBugReportRequest("", "", null, null, null, null));
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private static async Task<HttpResponseMessage> WaitForJobAsync(HttpClient client, string path)
    {
        HttpResponseMessage? latest = null;

        for (var attempt = 0; attempt < 20; attempt++)
        {
            latest?.Dispose();
            latest = await client.GetAsync(path);
            if (latest.StatusCode != HttpStatusCode.OK)
            {
                return latest;
            }

            var body = await latest.Content.ReadFromJsonAsync<WorkoutPlanJobStatusResponse>();
            if (body?.Status is "completed" or "failed")
            {
                return latest;
            }

            await Task.Delay(50);
        }

        return latest ?? await client.GetAsync(path);
    }
}
