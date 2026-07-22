using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Gymmin.Api.Domain;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Cors.Infrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Gymmin.Api.Tests;

public sealed class ProductionRequestHardeningTests : IClassFixture<GymminApiFactory>
{
    private readonly GymminApiFactory _factory;

    public ProductionRequestHardeningTests(GymminApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Oversized_bug_report_is_rejected_before_json_binding()
    {
        using var client = _factory.CreateClient();
        using var content = new ByteArrayContent(new byte[70 * 1024]);
        content.Headers.ContentType = new MediaTypeHeaderValue("application/json");

        var response = await client.PostAsync("/api/bug-reports", content);

        Assert.Equal(HttpStatusCode.RequestEntityTooLarge, response.StatusCode);
    }

    [Fact]
    public async Task Workout_sync_rejects_excessive_item_count()
    {
        using var client = _factory.CreateClient();
        var user = await TestPayloads.RegisterAsync(client, "oversized-workout-sync");
        client.Authorize(user.Token);
        var workouts = Enumerable.Range(0, 251)
            .Select(index => TestPayloads.Workout($"bulk-{index}"))
            .ToArray();

        var response = await client.PostAsJsonAsync("/api/sync/workouts", new SyncWorkoutsRequest(workouts, [], null));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Api_responses_include_security_headers_and_sensitive_responses_disable_cache()
    {
        using var client = _factory.CreateClient();
        var status = await client.GetAsync("/api/system/status");
        Assert.Equal("nosniff", status.Headers.GetValues("X-Content-Type-Options").Single());
        Assert.Equal("DENY", status.Headers.GetValues("X-Frame-Options").Single());
        Assert.Contains("default-src 'none'", status.Headers.GetValues("Content-Security-Policy").Single());
        Assert.Equal("same-site", status.Headers.GetValues("Cross-Origin-Resource-Policy").Single());
        Assert.Equal("none", status.Headers.GetValues("X-Permitted-Cross-Domain-Policies").Single());
        Assert.Equal("no-store", status.Headers.CacheControl?.ToString());
        Assert.Equal("no-cache", status.Headers.Pragma.ToString());

        var login = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest("missing@example.com", "pass1234"));
        Assert.Equal("no-store", login.Headers.CacheControl?.ToString());
    }
}

public sealed class ProductionCorsTests : IClassFixture<ProductionCorsFactory>
{
    private readonly ProductionCorsFactory _factory;

    public ProductionCorsTests(ProductionCorsFactory factory) => _factory = factory;

    [Fact]
    public async Task Production_cors_allows_configured_origin_and_rejects_unknown_origin()
    {
        using var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost")
        });
        var configuration = _factory.Services.GetRequiredService<IConfiguration>();
        Assert.Equal("https://app.gymmin.example", configuration["Gymmin:Cors:AllowedOrigins:0"]);
        var policy = await _factory.Services.GetRequiredService<ICorsPolicyProvider>()
            .GetPolicyAsync(new DefaultHttpContext(), "app");
        Assert.Contains("https://app.gymmin.example", policy!.Origins);

        using var allowedRequest = new HttpRequestMessage(HttpMethod.Get, "/api/system/status");
        allowedRequest.Headers.Add("Origin", "https://app.gymmin.example");
        var allowed = await client.SendAsync(allowedRequest);
        Assert.True(allowed.Headers.Contains("Access-Control-Allow-Origin"),
            $"Status={(int)allowed.StatusCode}; headers={string.Join("; ", allowed.Headers.Select(header => $"{header.Key}={string.Join(",", header.Value)}"))}");
        Assert.Equal("https://app.gymmin.example", allowed.Headers.GetValues("Access-Control-Allow-Origin").Single());

        using var rejectedRequest = new HttpRequestMessage(HttpMethod.Get, "/api/system/status");
        rejectedRequest.Headers.Add("Origin", "https://attacker.example");
        var rejected = await client.SendAsync(rejectedRequest);
        Assert.False(rejected.Headers.Contains("Access-Control-Allow-Origin"));
    }

    [Fact]
    public async Task Production_api_health_does_not_disclose_infrastructure_details()
    {
        using var client = _factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost")
        });

        var response = await client.GetAsync("/api/health");
        var json = await response.Content.ReadAsStringAsync();
        using var body = JsonDocument.Parse(json);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("ok", body.RootElement.GetProperty("status").GetString());
        Assert.False(body.RootElement.TryGetProperty("storageProvider", out _));
        Assert.False(body.RootElement.TryGetProperty("databaseProvider", out _));
        Assert.False(body.RootElement.TryGetProperty("database", out _));
    }
}

public sealed class ProductionCorsFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Production");
        builder.UseSetting("Gymmin:Storage:Provider", "File");
        builder.UseSetting("Gymmin:Storage:RequireCurrentSchema", "false");
        builder.UseSetting("Gymmin:Cors:AllowedOrigins:0", "https://app.gymmin.example");
        builder.ConfigureLogging(logging => logging.ClearProviders());
        builder.ConfigureAppConfiguration((_, configuration) => configuration.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Gymmin:Storage:Provider"] = "File",
            ["Gymmin:Security:HttpsRedirectionEnabled"] = "false",
            ["Gymmin:Security:EnforcePostgreSqlProduction"] = "false",
            ["Gymmin:Features:AiEnabled"] = "false",
            ["Gymmin:AiCredits:DevGrantEnabled"] = "false",
            ["Gymmin:Cors:AllowedOrigins:0"] = "https://app.gymmin.example",
            ["Auth:Smtp:Host"] = "smtp.invalid",
            ["Auth:Smtp:Username"] = "test",
            ["Auth:Smtp:Password"] = "test"
        }));
    }
}

public sealed class ProductionSchemaGuardTests
{
    [Fact]
    public void Production_refuses_to_start_with_pending_migrations()
    {
        using var factory = new ProductionPendingSchemaFactory();

        var error = Assert.ThrowsAny<Exception>(() => factory.CreateClient());

        Assert.Contains("pending EF migration", error.ToString(), StringComparison.OrdinalIgnoreCase);
    }
}

public sealed class ProductionPendingSchemaFactory : WebApplicationFactory<Program>
{
    private readonly string _databasePath = Path.Combine(Path.GetTempPath(), "gymmin-tests", $"{Guid.NewGuid():N}.db");

    public ProductionPendingSchemaFactory()
    {
        Directory.CreateDirectory(Path.GetDirectoryName(_databasePath)!);
        using var connection = new SqliteConnection($"Data Source={_databasePath}");
        connection.Open();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Production");
        builder.UseSetting("Gymmin:Storage:Provider", "Database");
        builder.UseSetting("Gymmin:Storage:DatabaseProvider", "SQLite");
        builder.UseSetting("Gymmin:Storage:RequireCurrentSchema", "true");
        builder.UseSetting("Gymmin:Storage:ApplyMigrationsOnStartup", "false");
        builder.UseSetting("Gymmin:Security:EnforcePostgreSqlProduction", "false");
        builder.UseSetting("Gymmin:Security:HttpsRedirectionEnabled", "false");
        builder.UseSetting("Gymmin:Features:AiEnabled", "false");
        builder.UseSetting("Gymmin:AiCredits:DevGrantEnabled", "false");
        builder.UseSetting("ConnectionStrings:DefaultConnection", $"Data Source={_databasePath}");
        builder.UseSetting("Auth:Smtp:Host", "smtp.invalid");
        builder.UseSetting("Auth:Smtp:Username", "test");
        builder.UseSetting("Auth:Smtp:Password", "test");
        builder.ConfigureLogging(logging => logging.ClearProviders());
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        SqliteConnection.ClearAllPools();
        try
        {
            if (File.Exists(_databasePath)) File.Delete(_databasePath);
        }
        catch (IOException)
        {
            // Best-effort test cleanup.
        }
    }
}
