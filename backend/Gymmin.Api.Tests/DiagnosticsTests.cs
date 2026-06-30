using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Gymmin.Api.Domain;

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
        using var client = _factory.CreateClient();

        HttpResponseMessage? latest = null;
        for (var attempt = 0; attempt < 11; attempt++)
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

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("storageProvider", json);
        Assert.Contains("databaseProvider", json);
        Assert.Contains("canConnect", json);
        Assert.DoesNotContain("ConnectionStrings", json, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("Data Source", json, StringComparison.OrdinalIgnoreCase);
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

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        Assert.NotNull(_factory.BugReportEmailSender.LastReport);
        Assert.Equal(JsonValueKind.Object, _factory.BugReportEmailSender.LastReport!.Diagnostics?.ValueKind);
    }
}
