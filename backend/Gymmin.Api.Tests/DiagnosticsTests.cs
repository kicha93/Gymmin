using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Gymmin.Api.Domain;
using Microsoft.Extensions.Configuration;

namespace Gymmin.Api.Tests;

public sealed class DiagnosticsTests : IClassFixture<GymminApiFactory>
{
    private readonly GymminApiFactory _factory;

    public DiagnosticsTests(GymminApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Every_response_contains_correlation_id()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(response.Headers.TryGetValues("X-Correlation-Id", out var values));
        Assert.False(string.IsNullOrWhiteSpace(values.Single()));
    }

    [Theory]
    [InlineData("/privacy", "Polityka prywatności Gymmin")]
    [InlineData("/privacy?lang=en", "Gymmin Privacy Policy")]
    public async Task Privacy_policy_is_public_and_localized(string path, string expectedTitle)
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync(path);
        var body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/html", response.Content.Headers.ContentType!.MediaType);
        Assert.Equal("utf-8", response.Content.Headers.ContentType.CharSet);
        Assert.Contains(expectedTitle, body);
        Assert.Contains("kontakt@gymmin.app", body);
        Assert.Contains("OpenAI", body);
        Assert.Contains("Google Play", body);
    }

    [Theory]
    [InlineData("/account-deletion", "Usuń konto i dane Gymmin", "Usuń moje konto Gymmin")]
    [InlineData("/account-deletion?lang=en", "Delete your Gymmin account and data", "Delete my Gymmin account")]
    public async Task Account_deletion_instructions_are_public_localized_and_actionable(
        string path,
        string expectedTitle,
        string expectedMailSubject)
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync(path);
        var body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/html", response.Content.Headers.ContentType!.MediaType);
        Assert.Contains(expectedTitle, body);
        Assert.Contains("kontakt@gymmin.app", body);
        Assert.Contains(Uri.EscapeDataString(expectedMailSubject), body);
        Assert.Contains("/privacy", body);
        Assert.Contains("Google Play", body);
    }

    [Fact]
    public async Task Request_correlation_id_is_echoed()
    {
        using var client = _factory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Get, "/health");
        request.Headers.Add("X-Correlation-Id", "test-correlation-id");

        var response = await client.SendAsync(request);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("test-correlation-id", response.Headers.GetValues("X-Correlation-Id").Single());
    }

    [Fact]
    public async Task Invalid_or_oversized_correlation_id_is_not_echoed_or_logged()
    {
        using var client = _factory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Get, "/health");
        var untrusted = new string('x', 200);
        request.Headers.TryAddWithoutValidation("X-Correlation-Id", untrusted);

        var response = await client.SendAsync(request);
        var returned = response.Headers.GetValues("X-Correlation-Id").Single();

        Assert.NotEqual(untrusted, returned);
        Assert.InRange(returned.Length, 1, 128);
    }

    [Fact]
    public async Task Global_exception_handler_returns_safe_error_response()
    {
        using var client = _factory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/test/throw");
        request.Headers.Add("X-Correlation-Id", "exception-correlation-id");

        var response = await client.SendAsync(request);
        var json = await response.Content.ReadAsStringAsync();
        var body = JsonSerializer.Deserialize<ApiErrorResponse>(json, TestJson.Options);

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal("exception-correlation-id", response.Headers.GetValues("X-Correlation-Id").Single());
        Assert.Equal("internal_error", body!.Error.Code);
        Assert.Equal("exception-correlation-id", body.Error.CorrelationId);
        Assert.DoesNotContain("Synthetic test exception", json);
        Assert.DoesNotContain("StackTrace", json, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Rate_limit_error_uses_consistent_error_shape()
    {
        using var rateLimitedFactory = _factory.WithWebHostBuilder(builder =>
            builder.ConfigureAppConfiguration((_, configuration) =>
                configuration.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Gymmin:Auth:RateLimits:LoginIp:Limit"] = "2",
                    ["Gymmin:Auth:RateLimits:LoginAccount:Limit"] = "2"
                })));
        using var client = rateLimitedFactory.CreateClient();

        HttpResponseMessage? latest = null;
        for (var attempt = 0; attempt < 3; attempt++)
        {
            latest?.Dispose();
            latest = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest("limited@example.com", "badpass"));
        }

        var json = await latest!.Content.ReadAsStringAsync();
        var body = JsonSerializer.Deserialize<ApiErrorResponse>(json, TestJson.Options);

        Assert.Equal((HttpStatusCode)429, latest.StatusCode);
        Assert.Equal("rate_limited", body!.Error.Code);
        Assert.False(string.IsNullOrWhiteSpace(body.Error.CorrelationId));
    }

    [Fact]
    public async Task Diagnostics_endpoint_is_available_in_testing_without_secrets()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/diagnostics");
        var json = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("storageProvider", json);
        Assert.Contains("databaseProvider", json);
        Assert.Contains("database", json);
        Assert.DoesNotContain("ConnectionStrings", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Data Source", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("ApiKey", json, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Api_health_reports_storage_without_secrets()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/health");
        var json = await response.Content.ReadAsStringAsync();

        Assert.True(response.StatusCode == HttpStatusCode.OK, $"Status={response.StatusCode}; Body={json}");
        Assert.Contains("storageProvider", json);
        Assert.Contains("databaseProvider", json);
        Assert.Contains("canConnect", json);
        Assert.Contains("schemaCurrent", json);
        Assert.Contains("pendingMigrationCount", json);
        Assert.DoesNotContain("ConnectionStrings", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Data Source", json, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Liveness_and_readiness_are_separate_and_ready_database_returns_200()
    {
        using var client = _factory.CreateClient();

        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/health/live")).StatusCode);
        var readiness = await client.GetAsync("/health/ready");
        Assert.True(readiness.StatusCode == HttpStatusCode.OK,
            $"Status={readiness.StatusCode}; Body={await readiness.Content.ReadAsStringAsync()}");
    }

    [Fact]
    public async Task Bug_report_accepts_diagnostic_context()
    {
        using var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/bug-reports", new
        {
            title = "Something broke",
            description = "The app showed an error",
            device = "Android",
            screen = "Settings",
            language = "en",
            appVersion = "1.0",
            diagnostics = new
            {
                lastCorrelationIds = new[] { "abc" },
                recentEvents = new[] { new { level = "error", area = "api", message = "failed" } }
            }
        });

        var responseJson = await response.Content.ReadAsStringAsync();
        Assert.True(
            response.StatusCode == HttpStatusCode.Accepted,
            $"Expected Accepted but received {response.StatusCode}: {responseJson}");
        var accepted = await response.Content.ReadFromJsonAsync<BugReportResponse>(TestJson.Options);
        var delivered = await WaitForBugReportEmailAsync(accepted!.Id);
        Assert.Equal(JsonValueKind.Object, delivered.Diagnostics?.ValueKind);
    }

    private async Task<CreateBugReportRequest> WaitForBugReportEmailAsync(Guid reportId)
    {
        for (var attempt = 0; attempt < 30; attempt++)
        {
            if (_factory.BugReportEmailSender.LastReportId == reportId &&
                _factory.BugReportEmailSender.LastReport is { } report)
            {
                return report;
            }

            await Task.Delay(200);
        }

        throw new TimeoutException($"Bug report {reportId} was not delivered by the background worker.");
    }
}
