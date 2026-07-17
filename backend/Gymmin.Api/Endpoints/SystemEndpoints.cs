using Gymmin.Api.Domain;
using Gymmin.Api.Services;

namespace Gymmin.Api.Endpoints;

internal static class SystemEndpoints
{
    public static void MapSystemEndpoints(
        this WebApplication app,
        bool useDatabaseStorage,
        string storageProvider,
        string databaseProvider)
    {
        app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
        app.MapGet("/health/live", () => Results.Ok(new { status = "ok" }));
        app.MapGet("/health/ready", async (IServiceProvider services, ILogger<Program> logger) =>
        {
            var database = await GetDatabaseHealthAsync(useDatabaseStorage, services, logger);
            return !IsDatabaseReady(database)
                ? Results.Json(new { status = "not_ready" }, statusCode: StatusCodes.Status503ServiceUnavailable)
                : Results.Ok(new { status = "ready" });
        });

        app.MapGet("/api/system/status", (IConfiguration configuration) =>
        {
            var kind = SystemStatusKinds.Normalize(configuration["SystemStatus:Kind"]);
            var messagePl = configuration["SystemStatus:MessagePl"];
            var messageEn = configuration["SystemStatus:MessageEn"];
            var hasMessage = !string.IsNullOrWhiteSpace(messagePl) || !string.IsNullOrWhiteSpace(messageEn);

            return Results.Ok(new SystemStatusResponse(
                kind,
                hasMessage
                    ? new LocalizedSystemStatusMessage(
                        string.IsNullOrWhiteSpace(messagePl) ? null : messagePl,
                        string.IsNullOrWhiteSpace(messageEn) ? null : messageEn)
                    : null,
                DateTimeOffset.UtcNow));
        });

        app.MapGet("/api/health", async (IServiceProvider services, ILogger<Program> logger) =>
        {
            var database = await GetDatabaseHealthAsync(useDatabaseStorage, services, logger);
            var response = new
            {
                status = IsDatabaseReady(database) ? "ok" : "not_ready",
                storageProvider,
                databaseProvider = useDatabaseStorage ? databaseProvider : null,
                database
            };
            return !IsDatabaseReady(database)
                ? Results.Json(response, statusCode: StatusCodes.Status503ServiceUnavailable)
                : Results.Ok(response);
        });

        app.MapGet("/api/diagnostics", async (
            HttpRequest request,
            IWebHostEnvironment environment,
            IConfiguration configuration,
            IUserStore users,
            IServiceProvider services,
            ILogger<Program> logger) =>
        {
            var enabled = environment.IsDevelopment() ||
                environment.IsEnvironment("Testing") ||
                configuration.GetValue("Gymmin:Diagnostics:Enabled", false);

            if (!enabled)
            {
                return Results.NotFound();
            }

            if (!environment.IsDevelopment() &&
                !environment.IsEnvironment("Testing") &&
                EndpointAuthorization.GetBearerUserId(request, users) is null)
            {
                return Results.Unauthorized();
            }

            var openAiConfigured = !string.IsNullOrWhiteSpace(OpenAiConfiguration.GetApiKey(configuration));
            var smtpConfigured = !string.IsNullOrWhiteSpace(configuration["BugReports:Smtp:Host"]) &&
                !string.IsNullOrWhiteSpace(configuration["BugReports:Smtp:Username"]);

            return Results.Ok(new
            {
                app = "Gymmin.Api",
                environment = environment.EnvironmentName,
                storageProvider,
                databaseProvider = useDatabaseStorage ? databaseProvider : null,
                database = await GetDatabaseHealthAsync(useDatabaseStorage, services, logger),
                openAiConfigured,
                smtpConfigured,
                serverTime = DateTimeOffset.UtcNow
            });
        });

        if (app.Environment.IsEnvironment("Testing"))
        {
            app.MapGet("/api/test/throw", () =>
            {
                throw new InvalidOperationException("Synthetic test exception.");
            });
        }
    }

    private static async Task<DatabaseHealth> GetDatabaseHealthAsync(
        bool useDatabaseStorage,
        IServiceProvider services,
        ILogger logger)
    {
        if (!useDatabaseStorage)
        {
            return new DatabaseHealth(false, null, null, null);
        }

        try
        {
            return await services.GetRequiredService<DatabaseReadinessProbe>().CheckAsync();
        }
        catch (Exception error)
        {
            logger.LogWarning(error, "Database health check failed.");
            return new DatabaseHealth(true, false, false, null);
        }
    }

    private static bool IsDatabaseReady(DatabaseHealth database) =>
        !database.Configured || database is { CanConnect: true, SchemaCurrent: not false };
}
