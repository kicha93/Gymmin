using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Gymmin.Api.Domain;
using Gymmin.Api.Services;
using Microsoft.Extensions.DependencyInjection;

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
            null,
            true))).StatusCode);

        client.Authorize(userA.Token);
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/api/ai-credits/dev/grant", new DevGrantAiCreditsRequest(1, "test top-up"))).StatusCode);

        var planStart = await client.PostAsJsonAsync("/api/workout-creator/plan", new CreateWorkoutPlanRequest(
            [new WorkoutCreatorQuestionAnswer("Goal", "Strength")],
            "en",
            "profile-1",
            true));
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
    public async Task Workout_creator_rejects_health_data_without_explicit_consent()
    {
        using var client = _factory.CreateClient();
        var auth = await TestPayloads.RegisterAsync(client, "creator-consent");
        client.Authorize(auth.Token);

        var response = await client.PostAsJsonAsync("/api/workout-creator/plan", new CreateWorkoutPlanRequest(
            [new WorkoutCreatorQuestionAnswer("Injuries", "Knee pain")],
            "en",
            null,
            false));
        var body = await response.Content.ReadFromJsonAsync<ApiErrorResponse>();

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("sensitive_data_consent_required", body!.Error.Code);

        var balance = await client.GetFromJsonAsync<AiCreditBalanceResponse>("/api/ai-credits/balance");
        Assert.Equal(1, balance!.Balance);
    }

    [Fact]
    public async Task Bug_report_success_path_persists_report_and_uses_fake_sender()
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
        Assert.Equal("received", body!.Status);
        Assert.Equal(BugReportEmailDeliveryStatuses.Pending, body.EmailDeliveryStatus);

        var store = _factory.Services.GetRequiredService<IBugReportStore>();
        var stored = await WaitForEmailStatusAsync(store, body.Id, BugReportEmailDeliveryStatuses.Sent);
        Assert.NotNull(stored);
        Assert.Null(stored!.ReporterUserId);
        Assert.Equal("Something broke", stored.Title);
        Assert.Equal(BugReportStatuses.New, stored.Status);
        Assert.Equal(BugReportEmailDeliveryStatuses.Sent, stored.EmailDeliveryStatus);
        Assert.Equal(0, stored.RewardPoints);
        Assert.Null(stored.AdminResponse);
    }

    [Fact]
    public async Task Bug_report_links_authenticated_user_from_bearer_token()
    {
        using var client = _factory.CreateClient();
        var user = await TestPayloads.RegisterAsync(client, "bug-reporter");
        client.Authorize(user.Token);

        var response = await client.PostAsJsonAsync("/api/bug-reports", new CreateBugReportRequest(
            "Profile issue",
            "The profile screen is clipped",
            "Android",
            "Profile",
            "en",
            "1.0"));

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        var body = (await response.Content.ReadFromJsonAsync<BugReportResponse>())!;
        var stored = _factory.Services.GetRequiredService<IBugReportStore>().Get(body.Id);

        Assert.NotNull(stored);
        Assert.Equal(user.User.Id, stored!.ReporterUserId);

        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync($"/api/bug-reports/{body.Id}")).StatusCode);
        var otherUser = await TestPayloads.RegisterAsync(client, "other-bug-reporter");
        client.Authorize(otherUser.Token);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/bug-reports/{body.Id}")).StatusCode);
    }

    [Fact]
    public async Task Bug_report_is_retained_when_email_delivery_fails()
    {
        using var factory = new GymminApiFactory();
        using var client = factory.CreateClient();
        factory.BugReportEmailSender.FailNextSend = true;

        var response = await client.PostAsJsonAsync("/api/bug-reports", new CreateBugReportRequest(
            "Mail unavailable",
            "The report must still be stored",
            "Android",
            "Settings",
            "en",
            "1.0"));

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        var body = (await response.Content.ReadFromJsonAsync<BugReportResponse>())!;
        var stored = await WaitForEmailStatusAsync(
            factory.Services.GetRequiredService<IBugReportStore>(),
            body.Id,
            BugReportEmailDeliveryStatuses.Failed);

        Assert.Equal(BugReportEmailDeliveryStatuses.Pending, body.EmailDeliveryStatus);
        Assert.NotNull(stored);
        Assert.Equal(BugReportEmailDeliveryStatuses.Failed, stored!.EmailDeliveryStatus);
        Assert.Contains("Synthetic SMTP failure", stored.EmailDeliveryError);
    }

    [Fact]
    public async Task Bug_report_submission_is_idempotent()
    {
        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-Idempotency-Key", $"bug-test-{Guid.NewGuid():N}");
        var payload = new CreateBugReportRequest("Same report", "Retry-safe description", "Android", "Home", "en", "1.0");

        var first = await client.PostAsJsonAsync("/api/bug-reports", payload);
        var second = await client.PostAsJsonAsync("/api/bug-reports", payload);
        var firstBody = (await first.Content.ReadFromJsonAsync<BugReportResponse>())!;
        var secondBody = (await second.Content.ReadFromJsonAsync<BugReportResponse>())!;

        Assert.Equal(firstBody.Id, secondBody.Id);
    }

    [Fact]
    public async Task Deleting_account_anonymizes_reporter_without_deleting_bug_report()
    {
        using var client = _factory.CreateClient();
        var user = await TestPayloads.RegisterAsync(client, "bug-reporter-delete");
        client.Authorize(user.Token);

        var response = await client.PostAsJsonAsync("/api/bug-reports", new CreateBugReportRequest(
            "Account-linked report",
            "Keep this report after account deletion",
            "Android",
            "Profile",
            "en",
            "1.0",
            JsonSerializer.SerializeToElement(new
            {
                userId = user.User.Id,
                nested = new { storageOwner = user.User.Id, safe = "keep" },
                values = new[] { user.User.Id, "keep-me" }
            })));
        var body = (await response.Content.ReadFromJsonAsync<BugReportResponse>())!;

        using var deleteRequest = new HttpRequestMessage(HttpMethod.Delete, "/api/account")
        {
            Content = JsonContent.Create(new DeleteAccountRequest("pass1234"))
        };
        Assert.Equal(HttpStatusCode.NoContent, (await client.SendAsync(deleteRequest)).StatusCode);
        var stored = _factory.Services.GetRequiredService<IBugReportStore>().Get(body.Id);

        Assert.NotNull(stored);
        Assert.Null(stored!.ReporterUserId);
        Assert.DoesNotContain(user.User.Id, stored.DiagnosticsJson ?? "");
        Assert.DoesNotContain("storageOwner", stored.DiagnosticsJson ?? "");
        Assert.Contains("keep-me", stored.DiagnosticsJson ?? "");
    }

    [Fact]
    public void Bug_report_subject_uses_app_prefix_and_fallback_title()
    {
        Assert.Equal(
            "[Gymmin][Błąd] Nie mogę zapisać treningu",
            SmtpBugReportEmailSender.BuildSubject(new CreateBugReportRequest(
                " Nie mogę zapisać treningu ",
                "Opis",
                "Android",
                "Settings",
                "pl",
                "1.0")));

        Assert.Equal(
            "[Gymmin][Bug] Bug report",
            SmtpBugReportEmailSender.BuildSubject(new CreateBugReportRequest(
                "",
                "Description",
                "Android",
                "Settings",
                "en",
                "1.0")));
    }

    [Fact]
    public async Task Bug_report_validation_rejects_empty_payload()
    {
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/bug-reports", new CreateBugReportRequest("", "", null, null, null, null));
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Bug_report_rejects_payload_larger_than_64_kib()
    {
        using var client = _factory.CreateClient();
        using var content = new StringContent(
            JsonSerializer.Serialize(new { title = "Large", description = new string('x', 70_000) }),
            Encoding.UTF8,
            "application/json");

        var response = await client.PostAsync("/api/bug-reports", content);

        Assert.Equal(HttpStatusCode.RequestEntityTooLarge, response.StatusCode);
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

    private static async Task<StoredBugReport> WaitForEmailStatusAsync(IBugReportStore store, Guid id, string status)
    {
        for (var attempt = 0; attempt < 30; attempt++)
        {
            var report = store.Get(id);
            if (report?.EmailDeliveryStatus == status) return report;
            await Task.Delay(200);
        }
        throw new TimeoutException($"Bug report {id} did not reach email status {status}.");
    }
}
