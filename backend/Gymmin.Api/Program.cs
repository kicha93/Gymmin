using Gymmin.Api.Data;
using Gymmin.Api.Domain;
using Gymmin.Api.Endpoints;
using Gymmin.Api.Services;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.ConfigureKestrel(options => options.AddServerHeader = false);
builder.Services.AddHsts(options =>
{
    options.MaxAge = TimeSpan.FromDays(180);
});

if (builder.Environment.IsProduction() && builder.Configuration.GetValue("Gymmin:Logging:JsonConsole", true))
{
    builder.Logging.ClearProviders();
    builder.Logging.AddJsonConsole(options =>
    {
        options.IncludeScopes = true;
        options.UseUtcTimestamp = true;
        options.TimestampFormat = "O";
    });
}

var storage = GymminStorageConfigurationReader.Read(builder.Configuration);
var storageProvider = storage.StorageProvider;
var databaseProvider = storage.DatabaseProvider;
var useDatabaseStorage = storage.UsesDatabase;
var forwardedHeadersEnabled = builder.Configuration.GetValue("Gymmin:Proxy:ForwardedHeadersEnabled", false);
var allowAnyCorsOrigin = builder.Environment.IsDevelopment() || builder.Environment.IsEnvironment("Testing");
var corsAllowedOrigins = builder.Configuration.GetSection("Gymmin:Cors:AllowedOrigins").Get<string[]>()
    ?.Where(origin => Uri.TryCreate(origin, UriKind.Absolute, out var uri) && uri.Scheme is "http" or "https")
    .Select(origin => origin.TrimEnd('/'))
    .Distinct(StringComparer.OrdinalIgnoreCase)
    .ToArray() ?? [];

if (forwardedHeadersEnabled)
{
    builder.Services.Configure<ForwardedHeadersOptions>(options =>
    {
        options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
        options.ForwardLimit = Math.Clamp(builder.Configuration.GetValue("Gymmin:Proxy:ForwardLimit", 1), 1, 5);
        foreach (var configuredProxy in builder.Configuration.GetSection("Gymmin:Proxy:KnownProxies").Get<string[]>() ?? [])
        {
            if (!IPAddress.TryParse(configuredProxy, out var proxyAddress))
            {
                throw new InvalidOperationException($"Gymmin:Proxy:KnownProxies contains an invalid IP address: {configuredProxy}");
            }
            options.KnownProxies.Add(proxyAddress);
        }
    });
}

if (useDatabaseStorage)
{
    Directory.CreateDirectory(Path.Combine(builder.Environment.ContentRootPath, "App_Data"));
    builder.Services.AddDbContextFactory<GymminDbContext>(options => GymminStorageConfigurationReader.ConfigureDbContext(options, storage));
    builder.Services.AddScoped<AppDataDatabaseImporter>();
    builder.Services.AddSingleton<IWorkoutStore, EfWorkoutStore>();
    builder.Services.AddSingleton<IUserStore, EfUserStore>();
    builder.Services.AddSingleton<IUserSettingsStore, EfUserSettingsStore>();
    builder.Services.AddSingleton<IWorkoutPlanJobStore, EfWorkoutPlanJobStore>();
    builder.Services.AddSingleton<EfWorkoutPlanJobProcessor>();
    builder.Services.AddHostedService<WorkoutPlanJobWorker>();
    builder.Services.AddSingleton<IFavoriteExerciseStore, EfFavoriteExerciseStore>();
    builder.Services.AddSingleton<IWorkoutSessionStore, EfWorkoutSessionStore>();
    builder.Services.AddSingleton<IAchievementStore, EfAchievementStore>();
    builder.Services.AddSingleton<IAiCreditService, EfAiCreditService>();
    builder.Services.AddSingleton<IAiCreditPurchaseService, EfAiCreditPurchaseService>();
    builder.Services.AddSingleton<IBugReportStore, EfBugReportStore>();
    builder.Services.AddSingleton<IAccountDeletionService, EfAccountDeletionService>();
    builder.Services.AddSingleton<IUserAvatarStorage, DatabaseUserAvatarStorage>();
    builder.Services.AddSingleton<DatabaseReadinessProbe>();
    builder.Services.AddSingleton<DataRetentionWorker>();
    builder.Services.AddHostedService(services => services.GetRequiredService<DataRetentionWorker>());
    builder.Services.AddSingleton<GooglePlayVoidedPurchasesWorker>();
    builder.Services.AddHostedService(services => services.GetRequiredService<GooglePlayVoidedPurchasesWorker>());
}
else
{
    builder.Services.AddSingleton<IWorkoutStore, FileBackedWorkoutStore>();
    builder.Services.AddSingleton<IUserStore, FileBackedUserStore>();
    builder.Services.AddSingleton<IUserSettingsStore, FileBackedUserSettingsStore>();
    builder.Services.AddSingleton<IWorkoutPlanJobStore, FileBackedWorkoutPlanJobStore>();
    builder.Services.AddSingleton<IFavoriteExerciseStore, FileBackedFavoriteExerciseStore>();
    builder.Services.AddSingleton<IWorkoutSessionStore, FileBackedWorkoutSessionStore>();
    builder.Services.AddSingleton<IAchievementStore, FileBackedAchievementStore>();
    builder.Services.AddSingleton<IAiCreditService, FileBackedAiCreditService>();
    builder.Services.AddSingleton<IAiCreditPurchaseService, FileBackedAiCreditPurchaseService>();
    builder.Services.AddSingleton<IBugReportStore, FileBackedBugReportStore>();
    builder.Services.AddSingleton<IAccountDeletionService, FileBackedAccountDeletionService>();
    builder.Services.AddSingleton<IUserAvatarStorage, FileSystemUserAvatarStorage>();
}

builder.Services.Configure<AiCreditsOptions>(builder.Configuration.GetSection("Gymmin:AiCredits"));
builder.Services.Configure<GooglePlayOptions>(builder.Configuration.GetSection("Gymmin:GooglePlay"));
var externalHttpTimeout = TimeSpan.FromSeconds(Math.Clamp(
    builder.Configuration.GetValue("Gymmin:Security:ExternalHttpTimeoutSeconds", 120), 10, 300));
builder.Services.AddHttpClient<IWorkoutPlanGenerator, OpenAiWorkoutPlanGenerator>(client => client.Timeout = externalHttpTimeout);
builder.Services.AddHttpClient<IGooglePlayPurchaseValidator, GooglePlayPurchaseValidator>(client => client.Timeout = externalHttpTimeout);
builder.Services.AddSingleton<IPubSubOidcTokenValidator, GooglePubSubOidcTokenValidator>();
builder.Services.AddSingleton<GooglePlayRtdnService>();
builder.Services.AddSingleton<IBugReportEmailSender, SmtpBugReportEmailSender>();
builder.Services.AddHostedService<BugReportEmailDeliveryWorker>();
builder.Services.AddSingleton<IPasswordResetEmailSender, SmtpPasswordResetEmailSender>();
builder.Services.AddSingleton<IEmailVerificationEmailSender, SmtpEmailVerificationEmailSender>();
builder.Services.AddSingleton<AuthRateLimiter>();
builder.Services.AddSingleton<AdminBugReportService>();
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase));
});
builder.Services.AddCors(options =>
{
    options.AddPolicy("app", policy =>
    {
        policy.AllowAnyHeader().AllowAnyMethod();
        if (allowAnyCorsOrigin) policy.AllowAnyOrigin();
        else if (corsAllowedOrigins.Length > 0) policy.WithOrigins(corsAllowedOrigins);
    });
});
builder.Services.AddEndpointsApiExplorer();

var app = builder.Build();
var startupLogger = app.Services.GetRequiredService<ILogger<Program>>();

if (forwardedHeadersEnabled)
{
    app.UseForwardedHeaders();
}

if (app.Environment.IsProduction())
{
    app.UseHsts();
    if (app.Configuration.GetValue("Gymmin:Security:HttpsRedirectionEnabled", true)) app.UseHttpsRedirection();
}

app.Use(async (context, next) =>
{
    context.Response.OnStarting(() =>
    {
        context.Response.Headers.TryAdd("X-Content-Type-Options", "nosniff");
        context.Response.Headers.TryAdd("X-Frame-Options", "DENY");
        context.Response.Headers.TryAdd("Referrer-Policy", "no-referrer");
        context.Response.Headers.TryAdd("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
        context.Response.Headers.TryAdd("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
        context.Response.Headers.TryAdd("Cross-Origin-Resource-Policy", "same-site");
        context.Response.Headers.TryAdd("X-Permitted-Cross-Domain-Policies", "none");
        if (context.Request.Path.StartsWithSegments("/api") &&
            string.IsNullOrWhiteSpace(context.Response.Headers.CacheControl))
        {
            context.Response.Headers.CacheControl = "no-store";
            context.Response.Headers.Pragma = "no-cache";
        }
        return Task.CompletedTask;
    });
    try
    {
        await next();
    }
    catch (BadHttpRequestException error) when (error.StatusCode == StatusCodes.Status413PayloadTooLarge && !context.Response.HasStarted)
    {
        context.Response.StatusCode = StatusCodes.Status413PayloadTooLarge;
        await context.Response.WriteAsJsonAsync(new { error = "Request payload is too large." });
    }
});

if (app.Environment.IsProduction() && app.Configuration.GetValue("Gymmin:Storage:ApplyMigrationsOnStartup", false))
{
    throw new InvalidOperationException("ApplyMigrationsOnStartup must be false in Production. Run migrations as an explicit deployment step.");
}

if (app.Environment.IsProduction() && app.Configuration.GetValue("Gymmin:Diagnostics:Enabled", false))
{
    throw new InvalidOperationException("Gymmin:Diagnostics:Enabled must be false in Production.");
}

if (app.Environment.IsProduction() && app.Configuration.GetValue("Gymmin:Security:EnforcePostgreSqlProduction", true) &&
    (!useDatabaseStorage || !string.Equals(databaseProvider, "PostgreSQL", StringComparison.OrdinalIgnoreCase)))
{
    throw new InvalidOperationException("Production requires Gymmin Storage Provider=Database and DatabaseProvider=PostgreSQL.");
}

if (string.IsNullOrWhiteSpace(app.Configuration["BugReports:Smtp:Host"]) ||
    string.IsNullOrWhiteSpace(app.Configuration["BugReports:Smtp:Username"]))
{
    startupLogger.LogWarning("Bug report SMTP configuration is incomplete. Bug report email delivery may fail.");
}

var authSmtpConfigured = HasSmtpCredentials(app.Configuration, "Auth:Smtp") ||
    HasSmtpCredentials(app.Configuration, "BugReports:Smtp");
if (app.Environment.IsProduction() && !authSmtpConfigured)
{
    throw new InvalidOperationException("Email verification is required in Production, but Auth:Smtp (or the BugReports:Smtp fallback) is not fully configured.");
}
if (!authSmtpConfigured)
{
    startupLogger.LogWarning("Authentication SMTP configuration is incomplete. Verification and password-reset emails cannot be delivered.");
}

var openAiConfiguredAtStartup = !string.IsNullOrWhiteSpace(OpenAiConfiguration.GetApiKey(app.Configuration));
var aiEnabled = app.Configuration.GetValue("Gymmin:Features:AiEnabled", true);
if (app.Environment.IsProduction() && aiEnabled && !openAiConfiguredAtStartup)
{
    throw new InvalidOperationException("AI is enabled in Production, but the OpenAI API key is missing.");
}
if (app.Environment.IsProduction() && app.Configuration.GetValue("Gymmin:AiCredits:DevGrantEnabled", true))
{
    throw new InvalidOperationException("Gymmin:AiCredits:DevGrantEnabled must be false in Production.");
}
ValidateGooglePlayProductionConfiguration(app.Environment, app.Configuration);
ValidateAdminProductionConfiguration(app.Environment, app.Configuration);
if (aiEnabled && !openAiConfiguredAtStartup)
{
    startupLogger.LogWarning("OpenAI API key is not configured. Workout creator jobs will fail until configured.");
}

if (useDatabaseStorage)
{
    await using var scope = app.Services.CreateAsyncScope();
    var db = scope.ServiceProvider.GetRequiredService<GymminDbContext>();

    if (app.Configuration.GetValue("Gymmin:Storage:ApplyMigrationsOnStartup", false))
    {
        await db.Database.MigrateAsync();
    }

    if (app.Configuration.GetValue("Gymmin:Storage:ImportAppDataOnStartup", false))
    {
        await scope.ServiceProvider.GetRequiredService<AppDataDatabaseImporter>().ImportAsync();
    }

    if (app.Environment.IsProduction() &&
        app.Configuration.GetValue("Gymmin:Storage:RequireCurrentSchema", true))
    {
        var database = await app.Services.GetRequiredService<DatabaseReadinessProbe>().CheckAsync(forceRefresh: true);
        if (database.CanConnect != true)
            throw new InvalidOperationException("Production database is unavailable during startup readiness validation.");
        if (database.SchemaCurrent != true)
            throw new InvalidOperationException($"Production database has {database.PendingMigrationCount ?? 0} pending EF migration(s). Apply migrations before starting the API.");
    }
}

app.UseCors("app");
app.UseMiddleware<CorrelationIdMiddleware>();
app.UseMiddleware<ApiExceptionHandlingMiddleware>();
app.UseMiddleware<RequestDiagnosticsLoggingMiddleware>();
app.Use(async (context, next) =>
{
    var maxRequestBytes = GetMaxRequestBodyBytes(context.Request.Path, app.Configuration);
    var sizeFeature = context.Features.Get<Microsoft.AspNetCore.Http.Features.IHttpMaxRequestBodySizeFeature>();
    if (sizeFeature is { IsReadOnly: false }) sizeFeature.MaxRequestBodySize = maxRequestBytes;
    if (context.Request.ContentLength > maxRequestBytes)
    {
        context.Response.StatusCode = StatusCodes.Status413PayloadTooLarge;
        await context.Response.WriteAsJsonAsync(new { error = "Request payload is too large." });
        return;
    }
    await next();
});

app.MapSystemEndpoints(useDatabaseStorage, storageProvider, databaseProvider);
app.MapAuthEndpoints();
app.MapSettingsEndpoints();
app.MapWorkoutEndpoints();
app.MapFavoriteExerciseEndpoints();
app.MapWorkoutSessionEndpoints();
app.MapAchievementEndpoints();
app.MapBugReportEndpoints();
app.MapAiCreditEndpoints();
app.MapGooglePlayIntegrationEndpoints();
app.MapWorkoutCreatorEndpoints();
app.MapProfileEndpoints();

app.Run();

static bool HasSmtpCredentials(IConfiguration configuration, string section) =>
    !string.IsNullOrWhiteSpace(configuration[$"{section}:Host"]) &&
    !string.IsNullOrWhiteSpace(configuration[$"{section}:Username"]) &&
    !string.IsNullOrWhiteSpace(configuration[$"{section}:Password"]);

static void ValidateGooglePlayProductionConfiguration(IWebHostEnvironment environment, IConfiguration configuration)
{
    if (!environment.IsProduction() || !configuration.GetValue("Gymmin:GooglePlay:Enabled", false)) return;
    if (!configuration.GetValue("Gymmin:GooglePlay:ValidatePurchases", true) ||
        !configuration.GetValue("Gymmin:GooglePlay:ConsumePurchases", true))
        throw new InvalidOperationException("Production Google Play must validate and consume purchases on the backend.");
    if (string.IsNullOrWhiteSpace(configuration["Gymmin:GooglePlay:PackageName"]))
        throw new InvalidOperationException("Production Google Play PackageName is missing.");

    var base64 = configuration["Gymmin:GooglePlay:ServiceAccountJsonBase64"];
    var path = configuration["Gymmin:GooglePlay:ServiceAccountJsonPath"];
    if (string.IsNullOrWhiteSpace(base64) && (string.IsNullOrWhiteSpace(path) || !File.Exists(path)))
        throw new InvalidOperationException("Production Google Play service-account credentials are missing.");
    try
    {
        var credentialsJson = !string.IsNullOrWhiteSpace(base64)
            ? Encoding.UTF8.GetString(Convert.FromBase64String(base64))
            : File.ReadAllText(path!);
        using var credentials = JsonDocument.Parse(credentialsJson);
        var root = credentials.RootElement;
        if (!root.TryGetProperty("client_email", out var email) || string.IsNullOrWhiteSpace(email.GetString()) ||
            !root.TryGetProperty("private_key", out var privateKey) || string.IsNullOrWhiteSpace(privateKey.GetString()))
            throw new InvalidOperationException("Google Play service-account credentials are missing required fields.");
    }
    catch (Exception error) when (error is FormatException or JsonException)
    {
        throw new InvalidOperationException("Google Play service-account credentials are invalid.", error);
    }
    if (!configuration.GetValue("Gymmin:GooglePlay:RtdnEnabled", false))
        throw new InvalidOperationException("Google Play RTDN must be enabled for Production purchases.");
    if (string.IsNullOrWhiteSpace(configuration["Gymmin:GooglePlay:RtdnAudience"]) ||
        string.IsNullOrWhiteSpace(configuration["Gymmin:GooglePlay:RtdnServiceAccountEmail"]))
        throw new InvalidOperationException("Google Play RTDN requires its exact OIDC audience and Pub/Sub service-account email.");
    if (!configuration.GetValue("Gymmin:GooglePlay:VoidedPurchasesEnabled", false))
        throw new InvalidOperationException("Google Play Voided Purchases reconciliation must be enabled for Production purchases.");
    if (!configuration.GetValue("Gymmin:GooglePlay:AutoClawbackUnusedCredits", true))
        throw new InvalidOperationException("Production Google Play must automatically claw back unused credits from voided purchases.");
}

static void ValidateAdminProductionConfiguration(IWebHostEnvironment environment, IConfiguration configuration)
{
    if (!environment.IsProduction() || !configuration.GetValue("Gymmin:Admin:Enabled", false)) return;
    var hash = configuration["Gymmin:Admin:ApiKeySha256"]?.Trim() ?? "";
    var keyId = configuration["Gymmin:Admin:KeyId"]?.Trim() ?? "";
    if (hash.Length != 64 || !hash.All(Uri.IsHexDigit) || keyId.Length is 0 or > 100)
        throw new InvalidOperationException("Enabled Production admin API requires a SHA256 API-key hash and a bounded KeyId.");
}

static long GetMaxRequestBodyBytes(PathString path, IConfiguration configuration)
{
    var key = path.StartsWithSegments("/api/profile/avatar")
        ? "AvatarBytes"
        : path.StartsWithSegments("/api/bug-reports")
            ? "BugReportBytes"
            : path.StartsWithSegments("/api/integrations/google-play/rtdn")
                ? "IntegrationBytes"
            : path.StartsWithSegments("/api/workout-creator")
                ? "AiBytes"
                : "DefaultBytes";
    var fallback = key switch
    {
        "AvatarBytes" => 2 * 1024 * 1024 + 64 * 1024,
        "BugReportBytes" => 64 * 1024,
        "IntegrationBytes" => 64 * 1024,
        "AiBytes" => 512 * 1024,
        _ => 4 * 1024 * 1024
    };
    return Math.Clamp(
        configuration.GetValue($"Gymmin:Security:RequestLimits:{key}", fallback),
        16 * 1024,
        16 * 1024 * 1024);
}

public partial class Program;

public sealed record DatabaseHealth(
    bool Configured,
    bool? CanConnect,
    bool? SchemaCurrent,
    int? PendingMigrationCount);
