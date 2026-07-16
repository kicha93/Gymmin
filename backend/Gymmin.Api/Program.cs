using Gymmin.Api.Data;
using Gymmin.Api.Domain;
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
    builder.Services.AddSingleton<IFavoriteExerciseStore, EfFavoriteExerciseStore>();
    builder.Services.AddSingleton<IWorkoutSessionStore, EfWorkoutSessionStore>();
    builder.Services.AddSingleton<IAchievementStore, EfAchievementStore>();
    builder.Services.AddSingleton<IAiCreditService, EfAiCreditService>();
    builder.Services.AddSingleton<IAiCreditPurchaseService, EfAiCreditPurchaseService>();
    builder.Services.AddSingleton<IBugReportStore, EfBugReportStore>();
    builder.Services.AddSingleton<IAccountDeletionService, EfAccountDeletionService>();
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
builder.Services.AddSingleton<IUserAvatarStorage, FileSystemUserAvatarStorage>();
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
        hasMessage ? new LocalizedSystemStatusMessage(
            string.IsNullOrWhiteSpace(messagePl) ? null : messagePl,
            string.IsNullOrWhiteSpace(messageEn) ? null : messageEn) : null,
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
app.MapGet("/api/diagnostics", async (HttpRequest request, IWebHostEnvironment environment, IConfiguration configuration, IUserStore users, IServiceProvider services, ILogger<Program> logger) =>
{
    var enabled = environment.IsDevelopment() ||
        environment.IsEnvironment("Testing") ||
        configuration.GetValue("Gymmin:Diagnostics:Enabled", false);

    if (!enabled)
    {
        return Results.NotFound();
    }

    if (!environment.IsDevelopment() && !environment.IsEnvironment("Testing") && GetBearerUserId(request, users) is null)
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

app.MapPost("/api/auth/register", async (RegisterRequest body, HttpRequest request, IUserStore users, IEmailVerificationEmailSender emailSender, AuthRateLimiter rateLimiter, IWebHostEnvironment environment, ILogger<Program> logger, CancellationToken cancellationToken) =>
{
    if (!rateLimiter.TryConsume("RegisterIp", AuthRateLimiter.BuildKey(GetClientIpAddress(request))) ||
        !rateLimiter.TryConsume("RegisterEmail", AuthRateLimiter.BuildKey(body.Email))) return RateLimited(request);
    var result = users.Register(body, GetAuthMetadata(request));
    if (result.Success && result.Response is { } response)
    {
        var verification = users.CreateEmailVerificationCode(response.User.Id);
        if (verification is not null)
        {
            if (environment.IsEnvironment("Testing"))
            {
                var verifiedUser = users.ConfirmEmailVerification(response.User.Id, verification.Code);
                if (verifiedUser is not null) result = result with { Response = new AuthResponse(response.Token, verifiedUser) };
            }
            else
            {
                try { await emailSender.SendAsync(verification.Email, verification.Code, verification.ExpiresAt, cancellationToken); }
                catch (Exception error) { logger.LogWarning(error, "Registration verification email could not be sent."); }
            }
        }
    }
    return result.Success
        ? Results.Ok(result.Response)
        : Results.Json(new { error = result.Error }, statusCode: result.StatusCode);
});

app.MapPost("/api/auth/login", (LoginRequest body, HttpRequest request, IUserStore users, AuthRateLimiter rateLimiter) =>
{
    if (!rateLimiter.TryConsume("Login", AuthRateLimiter.BuildKey(GetClientIpAddress(request), body.Email)))
    {
        return RateLimited(request);
    }

    var result = users.Login(body, GetAuthMetadata(request));
    return result.Success
        ? Results.Ok(result.Response)
        : Results.Json(new { error = result.Error }, statusCode: result.StatusCode);
});

app.MapGet("/api/auth/me", (HttpRequest request, IUserStore users) =>
{
    var token = GetBearerToken(request);
    var user = token is null ? null : users.GetUserByToken(token);
    return user is null ? Results.Unauthorized() : Results.Ok(user);
});

app.MapGet("/api/profile/avatar", (HttpRequest request, IUserStore users, IUserAvatarStorage avatars) =>
{
    var context = GetBearerSession(request, users);
    if (context is null)
    {
        return Results.Unauthorized();
    }
    var avatar = users.GetAvatarMetadata(context.User.Id);
    if (avatar is null)
    {
        return Results.NotFound();
    }

    var path = avatars.GetPath(context.User.Id, avatar.FileName);
    if (path is null)
    {
        return Results.NotFound();
    }

    request.HttpContext.Response.Headers.CacheControl = "private, no-cache, max-age=0";
    return Results.File(path, avatar.ContentType, enableRangeProcessing: false);
});

app.MapPost("/api/profile/avatar", async (
    HttpRequest request,
    IUserStore users,
    IUserAvatarStorage avatars,
    AuthRateLimiter rateLimiter,
    CancellationToken cancellationToken) =>
{
    var context = GetBearerSession(request, users);
    if (context is null)
    {
        return Results.Unauthorized();
    }
    if (!rateLimiter.TryConsume("AvatarUploadUser", AuthRateLimiter.BuildKey(context.User.Id))) return RateLimited(request);

    if (!request.HasFormContentType)
    {
        return Results.BadRequest(new { error = "Avatar upload must use multipart/form-data." });
    }

    var form = await request.ReadFormAsync(cancellationToken);
    var file = form.Files.GetFile("avatar");
    var validation = avatars.Validate(file);
    if (!validation.IsValid)
    {
        return Results.Json(new { error = validation.Error }, statusCode: validation.StatusCode);
    }

    var stored = await avatars.SaveAsync(context.User.Id, file!, cancellationToken);
    users.UpdateAvatar(context.User.Id, stored.FileName, stored.ContentType, stored.UpdatedAt);

    return Results.Ok(new
    {
        avatarUrl = FileSystemUserAvatarStorage.BuildAvatarUrl(new UserAvatarMetadata(stored.FileName, stored.ContentType, stored.UpdatedAt)),
        avatarUpdatedAt = stored.UpdatedAt
    });
});

app.MapDelete("/api/profile/avatar", (HttpRequest request, IUserStore users, IUserAvatarStorage avatars) =>
{
    var context = GetBearerSession(request, users);
    if (context is null)
    {
        return Results.Unauthorized();
    }

    avatars.Delete(context.User.Id);
    users.ClearAvatar(context.User.Id);
    return Results.Ok(new { avatarUrl = (string?)null, avatarUpdatedAt = (DateTimeOffset?)null });
});

app.MapDelete("/api/account", ([FromBody] DeleteAccountRequest? body, HttpRequest request, IUserStore users, IAccountDeletionService accountDeletion, AuthRateLimiter rateLimiter) =>
{
    var context = GetBearerSession(request, users);
    if (context is null)
    {
        return Results.Unauthorized();
    }

    if (!rateLimiter.TryConsume("AccountDeletionUser", AuthRateLimiter.BuildKey(context.User.Id)) ||
        !rateLimiter.TryConsume("AccountDeletionIp", AuthRateLimiter.BuildKey(GetClientIpAddress(request)))) return RateLimited(request);
    if (!users.VerifyPassword(context.User.Id, body?.Password ?? ""))
    {
        return Results.Json(new { error = new { code = "invalid_credentials", message = "Current password is invalid." } }, statusCode: StatusCodes.Status403Forbidden);
    }

    return accountDeletion.DeleteAccount(context.User.Id)
        ? Results.NoContent()
        : Results.NotFound();
});

app.MapPost("/api/auth/logout", (HttpRequest request, IUserStore users) =>
{
    var token = GetBearerToken(request);

    if (token is not null)
    {
        users.RevokeSession(token);
    }

    return Results.NoContent();
});

app.MapGet("/api/auth/sessions", (HttpRequest request, IUserStore users) =>
{
    var context = GetBearerSession(request, users);
    if (context is null)
    {
        return Results.Unauthorized();
    }

    users.UpdateSessionMetadata(context.User.Id, context.SessionId, GetAuthMetadata(request));
    return Results.Ok(new AuthSessionsResponse(users.ListSessions(context.User.Id, context.SessionId)));
});

app.MapDelete("/api/auth/sessions/{sessionId}", (string sessionId, HttpRequest request, IUserStore users) =>
{
    var context = GetBearerSession(request, users);
    if (context is null)
    {
        return Results.Unauthorized();
    }

    return users.RevokeSession(context.User.Id, sessionId, "session-revoke")
        ? Results.NoContent()
        : Results.NotFound();
});

app.MapPost("/api/auth/logout-all", (LogoutAllRequest? body, HttpRequest request, IUserStore users) =>
{
    var context = GetBearerSession(request, users);
    if (context is null)
    {
        return Results.Unauthorized();
    }

    users.RevokeAllSessions(
        context.User.Id,
        "logout-all",
        body?.ExceptCurrent == true ? context.SessionId : null);
    return Results.NoContent();
});

app.MapPost("/api/auth/change-password", (ChangePasswordRequest body, HttpRequest request, IUserStore users) =>
{
    var context = GetBearerSession(request, users);
    if (context is null)
    {
        return Results.Unauthorized();
    }

    var result = users.ChangePassword(context.User.Id, body.CurrentPassword, body.NewPassword, context.SessionId);
    return result.Success
        ? Results.NoContent()
        : Results.Json(new { error = result.Error }, statusCode: result.StatusCode);
});

app.MapPost("/api/auth/password-reset/request", async (
    PasswordResetRequest body,
    HttpRequest request,
    IUserStore users,
    IPasswordResetEmailSender emailSender,
    AuthRateLimiter rateLimiter,
    ILogger<Program> logger,
    CancellationToken cancellationToken) =>
{
    if (!rateLimiter.TryConsume("PasswordResetRequest", AuthRateLimiter.BuildKey(GetClientIpAddress(request), body.Email)))
    {
        return RateLimited(request);
    }

    var reset = users.CreatePasswordResetToken(body.Email, GetAuthMetadata(request));
    if (reset is not null)
    {
        try
        {
            await emailSender.SendAsync(reset.Email, reset.Token, reset.ExpiresAt, cancellationToken);
        }
        catch (Exception error)
        {
            logger.LogWarning(error, "Password reset email could not be sent.");
        }
    }

    return Results.NoContent();
});

app.MapPost("/api/auth/password-reset/confirm", (PasswordResetConfirmRequest body, HttpRequest request, IUserStore users, AuthRateLimiter rateLimiter) =>
{
    if (!rateLimiter.TryConsume("PasswordResetConfirm", AuthRateLimiter.BuildKey(GetClientIpAddress(request), AuthSecurity.HashToken(body.Token))))
    {
        return RateLimited(request);
    }

    var result = users.ConfirmPasswordReset(body.Token, body.NewPassword);
    return result.Success
        ? Results.NoContent()
        : Results.Json(new { error = result.Error }, statusCode: result.StatusCode);
});

app.MapPost("/api/auth/email-verification/request", async (HttpRequest request, IUserStore users, IEmailVerificationEmailSender emailSender, AuthRateLimiter rateLimiter, ILogger<Program> logger, CancellationToken cancellationToken) =>
{
    var context = GetBearerSession(request, users);
    if (context is null) return Results.Unauthorized();
    if (context.User.EmailVerified) return Results.NoContent();
    if (!rateLimiter.TryConsume("EmailVerificationRequestUser", AuthRateLimiter.BuildKey(context.User.Id)) ||
        !rateLimiter.TryConsume("EmailVerificationRequestIp", AuthRateLimiter.BuildKey(GetClientIpAddress(request)))) return RateLimited(request);
    var verification = users.CreateEmailVerificationCode(context.User.Id);
    if (verification is not null)
    {
        try { await emailSender.SendAsync(verification.Email, verification.Code, verification.ExpiresAt, cancellationToken); }
        catch (Exception error) { logger.LogWarning(error, "Verification email could not be sent."); }
    }
    return Results.NoContent();
});

app.MapPost("/api/auth/email-verification/confirm", (EmailVerificationConfirmRequest body, HttpRequest request, IUserStore users, AuthRateLimiter rateLimiter) =>
{
    var context = GetBearerSession(request, users);
    if (context is null) return Results.Unauthorized();
    if (!rateLimiter.TryConsume("EmailVerificationConfirmUser", AuthRateLimiter.BuildKey(context.User.Id)) ||
        !rateLimiter.TryConsume("EmailVerificationConfirmIp", AuthRateLimiter.BuildKey(GetClientIpAddress(request)))) return RateLimited(request);
    if (string.IsNullOrWhiteSpace(body.Code) || body.Code.Trim().Length != 6) return Results.BadRequest(new { error = "Invalid verification code." });
    var user = users.ConfirmEmailVerification(context.User.Id, body.Code.Trim());
    return user is null ? Results.BadRequest(new { error = "Invalid or expired verification code." }) : Results.Ok(user);
});

app.MapGet("/api/settings", (HttpRequest request, IUserStore users, IUserSettingsStore settingsStore) =>
{
    var userId = GetUserId(request, users);
    if (userId is null)
    {
        return Results.Unauthorized();
    }

    var settings = settingsStore.Get(userId);
    return settings is null ? Results.NoContent() : Results.Ok(settings);
});

app.MapPut("/api/settings", (
    UpsertUserSettingsRequest body,
    HttpRequest request,
    IUserStore users,
    IUserSettingsStore settingsStore) =>
{
    var userId = GetUserId(request, users);
    if (userId is null)
    {
        return Results.Unauthorized();
    }

    var validationError = ValidateUserSettings(body);
    if (validationError is not null) return Results.BadRequest(new { error = validationError });

    return Results.Ok(settingsStore.Upsert(userId, body));
});

var workouts = app.MapGroup("/api/workouts");

workouts.MapGet("/", (HttpRequest request, IWorkoutStore store, IUserStore users) =>
{
    var userId = GetUserId(request, users);
    if (userId is null)
    {
        return Results.Unauthorized();
    }

    return Results.Ok(store.List(userId));
});

workouts.MapGet("/{clientWorkoutId}", (string clientWorkoutId, HttpRequest request, IWorkoutStore store, IUserStore users) =>
{
    var userId = GetUserId(request, users);
    if (userId is null)
    {
        return Results.Unauthorized();
    }

    var workout = store.Get(userId, clientWorkoutId);
    return workout is null ? Results.NotFound() : Results.Ok(workout);
});

workouts.MapPost("/", (UpsertWorkoutRequest body, HttpRequest request, IWorkoutStore store, IUserStore users) =>
{
    var userId = GetUserId(request, users);
    if (userId is null)
    {
        return Results.Unauthorized();
    }

    var validationError = ValidateWorkout(body);
    if (validationError is not null)
    {
        return Results.BadRequest(new { error = validationError });
    }

    var workout = store.Upsert(userId, body);
    return Results.Created($"/api/workouts/{workout.ClientWorkoutId}", workout);
});

workouts.MapPut("/{clientWorkoutId}", (string clientWorkoutId, UpsertWorkoutRequest body, HttpRequest request, IWorkoutStore store, IUserStore users) =>
{
    var userId = GetUserId(request, users);
    if (userId is null)
    {
        return Results.Unauthorized();
    }

    var requestBody = body with { ClientWorkoutId = clientWorkoutId };
    var validationError = ValidateWorkout(requestBody);
    if (validationError is not null)
    {
        return Results.BadRequest(new { error = validationError });
    }

    return Results.Ok(store.Upsert(userId, requestBody));
});

workouts.MapDelete("/{clientWorkoutId}", (string clientWorkoutId, HttpRequest request, IWorkoutStore store, IUserStore users) =>
{
    var userId = GetUserId(request, users);
    if (userId is null)
    {
        return Results.Unauthorized();
    }

    return store.Delete(userId, clientWorkoutId) ? Results.NoContent() : Results.NotFound();
});

workouts.MapPost("/{clientWorkoutId}/garmin-sync", (string clientWorkoutId, HttpRequest request, IWorkoutStore store, IUserStore users) =>
{
    var userId = GetUserId(request, users);
    if (userId is null)
    {
        return Results.Unauthorized();
    }

    var workout = store.Get(userId, clientWorkoutId);
    if (workout is null)
    {
        return Results.NotFound();
    }

    return Results.Accepted($"/api/workouts/{clientWorkoutId}", new
    {
        workoutId = workout.Id,
        workout.ClientWorkoutId,
        status = "queued",
        note = "Garmin adapter will be added in a later milestone."
    });
});

app.MapPost("/api/sync/workouts", (SyncWorkoutsRequest body, HttpRequest request, IWorkoutStore store, IUserStore users, AuthRateLimiter rateLimiter) =>
{
    var userId = GetUserId(request, users);
    if (userId is null)
    {
        return Results.Unauthorized();
    }

    if (!rateLimiter.TryConsume("DataSyncUser", AuthRateLimiter.BuildKey(userId))) return RateLimited(request);
    var validationError = ValidateWorkoutSync(body);
    if (validationError is not null) return Results.BadRequest(new { error = validationError });

    return Results.Ok(store.Sync(userId, body));
});

app.MapGet("/api/favorite-exercises", (HttpRequest request, IFavoriteExerciseStore store, IUserStore users) =>
{
    var userId = GetBearerUserId(request, users);
    if (userId is null)
    {
        return Results.Unauthorized();
    }

    return Results.Ok(store.Get(userId));
});

app.MapPut("/api/favorite-exercises", (
    PutFavoriteExercisesRequest body,
    HttpRequest request,
    IFavoriteExerciseStore store,
    IUserStore users) =>
{
    var userId = GetBearerUserId(request, users);
    if (userId is null)
    {
        return Results.Unauthorized();
    }

    var validationError = ValidateFavoriteExercises(body.Favorites);
    if (validationError is not null)
    {
        return Results.BadRequest(new { error = validationError });
    }

    return Results.Ok(store.Put(userId, body));
});

app.MapPost("/api/sync/favorite-exercises", (
    SyncFavoriteExercisesRequest body,
    HttpRequest request,
    IFavoriteExerciseStore store,
    IUserStore users,
    AuthRateLimiter rateLimiter) =>
{
    var userId = GetBearerUserId(request, users);
    if (userId is null)
    {
        return Results.Unauthorized();
    }

    if (!rateLimiter.TryConsume("DataSyncUser", AuthRateLimiter.BuildKey(userId))) return RateLimited(request);

    var validationError = ValidateFavoriteExercises(body.Favorites, body.DeletedExerciseIds);
    if (validationError is not null)
    {
        return Results.BadRequest(new { error = validationError });
    }

    return Results.Ok(store.Sync(userId, body));
});

var workoutSessions = app.MapGroup("/api/workout-sessions");

workoutSessions.MapGet("/", (
    bool? includeDeleted,
    DateTimeOffset? since,
    HttpRequest request,
    IWorkoutSessionStore store,
    IUserStore users) =>
{
    var userId = GetBearerUserId(request, users);
    if (userId is null)
    {
        return Results.Unauthorized();
    }

    return Results.Ok(store.List(userId, includeDeleted == true, since));
});

workoutSessions.MapGet("/{clientSessionId}", (
    string clientSessionId,
    HttpRequest request,
    IWorkoutSessionStore store,
    IUserStore users) =>
{
    var userId = GetBearerUserId(request, users);
    if (userId is null)
    {
        return Results.Unauthorized();
    }

    var session = store.Get(userId, clientSessionId);
    return session is null ? Results.NotFound() : Results.Ok(session);
});

workoutSessions.MapPut("/{clientSessionId}", (
    string clientSessionId,
    UpsertWorkoutSessionRequest body,
    HttpRequest request,
    IWorkoutSessionStore store,
    IUserStore users) =>
{
    var userId = GetBearerUserId(request, users);
    if (userId is null)
    {
        return Results.Unauthorized();
    }

    var requestBody = body with { ClientSessionId = clientSessionId };
    var validationError = ValidateWorkoutSession(requestBody);
    if (validationError is not null)
    {
        return Results.BadRequest(new { error = validationError });
    }

    return Results.Ok(store.Upsert(userId, requestBody));
});

workoutSessions.MapDelete("/{clientSessionId}", (
    string clientSessionId,
    HttpRequest request,
    IWorkoutSessionStore store,
    IUserStore users) =>
{
    var userId = GetBearerUserId(request, users);
    if (userId is null)
    {
        return Results.Unauthorized();
    }

    return store.Delete(userId, clientSessionId) ? Results.NoContent() : Results.NotFound();
});

app.MapPost("/api/sync/workout-sessions", (
    SyncWorkoutSessionsRequest body,
    HttpRequest request,
    IWorkoutSessionStore store,
    IUserStore users,
    AuthRateLimiter rateLimiter) =>
{
    var userId = GetBearerUserId(request, users);
    if (userId is null)
    {
        return Results.Unauthorized();
    }

    if (!rateLimiter.TryConsume("DataSyncUser", AuthRateLimiter.BuildKey(userId))) return RateLimited(request);

    var validationError = ValidateWorkoutSessionSync(body);
    if (validationError is not null)
    {
        return Results.BadRequest(new { error = validationError });
    }

    return Results.Ok(store.Sync(userId, body));
});

app.MapGet("/api/achievements", (HttpRequest request, IAchievementStore store, IUserStore users) =>
{
    var userId = GetBearerUserId(request, users);
    if (userId is null)
    {
        return Results.Unauthorized();
    }

    return Results.Ok(store.Get(userId));
});

app.MapPost("/api/sync/achievements", (
    SyncAchievementsRequest body,
    HttpRequest request,
    IAchievementStore store,
    IUserStore users,
    AuthRateLimiter rateLimiter) =>
{
    var userId = GetBearerUserId(request, users);
    if (userId is null)
    {
        return Results.Unauthorized();
    }

    if (!rateLimiter.TryConsume("DataSyncUser", AuthRateLimiter.BuildKey(userId))) return RateLimited(request);

    var validationError = ValidateAchievementsSync(body);
    if (validationError is not null)
    {
        return Results.BadRequest(new { error = validationError });
    }

    return Results.Ok(store.Sync(userId, body));
});

var aiCredits = app.MapGroup("/api/ai-credits");

aiCredits.MapGet("/balance", (HttpRequest request, IUserStore users, IAiCreditService credits) =>
{
    var userId = GetBearerUserId(request, users);
    if (userId is null)
    {
        return Results.Unauthorized();
    }

    return Results.Ok(credits.GetBalance(userId));
});

aiCredits.MapGet("/transactions", (int? limit, HttpRequest request, IUserStore users, IAiCreditService credits) =>
{
    var userId = GetBearerUserId(request, users);
    if (userId is null)
    {
        return Results.Unauthorized();
    }

    return Results.Ok(credits.GetTransactions(userId, limit ?? 50));
});

aiCredits.MapGet("/packs", (HttpRequest request, IUserStore users, IAiCreditService credits) =>
{
    var userId = GetBearerUserId(request, users);
    if (userId is null)
    {
        return Results.Unauthorized();
    }

    return Results.Ok(credits.GetPacks());
});

aiCredits.MapPost("/dev/grant", (
    DevGrantAiCreditsRequest body,
    HttpRequest request,
    IWebHostEnvironment environment,
    IConfiguration configuration,
    IUserStore users,
    IAiCreditService credits) =>
{
    var userId = GetBearerUserId(request, users);
    if (userId is null)
    {
        return Results.Unauthorized();
    }

    var enabled = configuration.GetValue("Gymmin:AiCredits:DevGrantEnabled", true);
    if (environment.IsProduction() || !enabled)
    {
        return Results.NotFound();
    }

    if (body.Amount <= 0 || body.Amount > 100)
    {
        return Results.BadRequest(new { error = "Amount must be between 1 and 100." });
    }

    return Results.Ok(credits.GrantDev(userId, body.Amount, body.Reason));
});

aiCredits.MapGet("/purchases", (HttpRequest request, IUserStore users, IAiCreditPurchaseService purchases) =>
{
    var userId = GetBearerUserId(request, users);
    if (userId is null)
    {
        return Results.Unauthorized();
    }

    return Results.Ok(purchases.GetPurchases(userId));
});

aiCredits.MapPost("/purchases/google-play/verify", async (
    VerifyGooglePlayPurchaseRequest body,
    HttpRequest request,
    IUserStore users,
    IAiCreditPurchaseService purchases,
    CancellationToken cancellationToken) =>
{
    var userId = GetBearerUserId(request, users);
    if (userId is null)
    {
        return Results.Unauthorized();
    }

    var result = await purchases.VerifyGooglePlayPurchaseAsync(userId, body, cancellationToken);
    if (result.Success)
    {
        return Results.Ok(result.Response);
    }

    var error = new ApiErrorResponse(new ApiError(
        result.ErrorCode ?? "invalid_google_play_purchase",
        result.ErrorMessage ?? "Purchase could not be verified",
        DiagnosticsContext.GetCorrelationId(request.HttpContext)));

    if (result.IsConflict)
    {
        return Results.Json(error, statusCode: StatusCodes.Status409Conflict);
    }

    if (result.IsRetryable)
    {
        return Results.Json(error, statusCode: StatusCodes.Status503ServiceUnavailable);
    }

    return Results.BadRequest(error);
});

app.MapPost("/api/integrations/google-play/rtdn", async (
    PubSubPushEnvelope? body,
    HttpRequest request,
    GooglePlayRtdnService service,
    CancellationToken cancellationToken) =>
{
    var result = await service.ReceiveAsync(request.Headers.Authorization.ToString(), body, cancellationToken);
    return result.StatusCode == StatusCodes.Status204NoContent
        ? Results.NoContent()
        : Results.Json(new { error = result.ErrorCode }, statusCode: result.StatusCode);
});

app.MapPost("/api/workout-creator/plan", (
    CreateWorkoutPlanRequest body,
    HttpRequest request,
    IUserStore users,
    IWorkoutPlanJobStore jobs,
    IConfiguration configuration,
    AuthRateLimiter rateLimiter,
    ILogger<Program> logger) =>
{
    var context = GetBearerSession(request, users);
    if (context is null)
    {
        return Results.Unauthorized();
    }
    var userId = context.User.Id;
    if (!context.User.EmailVerified) return EmailVerificationRequired(request);
    if (!rateLimiter.TryConsume("WorkoutCreatorUser", AuthRateLimiter.BuildKey(userId)) ||
        !rateLimiter.TryConsume("WorkoutCreatorIp", AuthRateLimiter.BuildKey(GetClientIpAddress(request)))) return RateLimited(request);

    if (body.QuestionsAndAnswers is null || body.QuestionsAndAnswers.Count is 0 or > 30 ||
        body.QuestionsAndAnswers.Any(item => item is null ||
            string.IsNullOrWhiteSpace(item.Question) ||
            item.Question.Length > 1_000 ||
            (item.Answer?.Length ?? 0) > 2_000))
    {
        return Results.BadRequest(new { error = "QuestionsAndAnswers is invalid or too large." });
    }

    var cost = Math.Max(0, configuration.GetValue("Gymmin:AiCredits:PlanCost", 1));
    var idempotencyKey = GetIdempotencyKey(request);
    CreateWorkoutPlanJobResponse job;
    try
    {
        job = jobs.Start(
            body,
            userId,
            new AiCreditJobCharge(cost, AiCreditReasons.WorkoutCreatorPlan, idempotencyKey));
    }
    catch (InsufficientAiCreditsException)
    {
        return InsufficientAiCredits(request);
    }
    catch (InvalidAiCreditIdempotencyKeyException)
    {
        return Results.BadRequest(new ApiErrorResponse(new ApiError(
            "invalid_idempotency_key",
            $"X-Idempotency-Key must be {EfAiCreditService.MaxIdempotencyKeyLength} characters or fewer.",
            DiagnosticsContext.GetCorrelationId(request.HttpContext))));
    }

    logger.LogInformation("Started workout creator job {JobId} for user {UserId}. JobType={JobType}", job.JobId, userId, "plan");
    return Results.Accepted($"/api/workout-creator/plan/{job.JobId}", job);
});

app.MapPost("/api/workout-creator/rewrite", (
    CreateWorkoutRewriteRequest body,
    HttpRequest request,
    IUserStore users,
    IWorkoutPlanJobStore jobs,
    IConfiguration configuration,
    AuthRateLimiter rateLimiter,
    ILogger<Program> logger) =>
{
    var context = GetBearerSession(request, users);
    if (context is null)
    {
        return Results.Unauthorized();
    }
    var userId = context.User.Id;
    if (!context.User.EmailVerified) return EmailVerificationRequired(request);
    if (!rateLimiter.TryConsume("WorkoutCreatorUser", AuthRateLimiter.BuildKey(userId)) ||
        !rateLimiter.TryConsume("WorkoutCreatorIp", AuthRateLimiter.BuildKey(GetClientIpAddress(request)))) return RateLimited(request);

    if (string.IsNullOrWhiteSpace(body.Instruction) || body.Instruction.Length > 2_000)
    {
        return Results.BadRequest(new { error = "Instruction is required." });
    }

    if (body.Workout.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null)
    {
        return Results.BadRequest(new { error = "Workout is required." });
    }
    if (body.Workout.GetRawText().Length > 100_000) return Results.BadRequest(new { error = "Workout is too large." });

    var cost = Math.Max(0, configuration.GetValue("Gymmin:AiCredits:RewriteCost", 1));
    var idempotencyKey = GetIdempotencyKey(request);
    CreateWorkoutPlanJobResponse job;
    try
    {
        job = jobs.StartRewrite(
            body with
            {
                Preferences = body.Preferences ?? new WorkoutRewritePreferences(true)
            },
            userId,
            new AiCreditJobCharge(cost, AiCreditReasons.WorkoutCreatorRewrite, idempotencyKey));
    }
    catch (InsufficientAiCreditsException)
    {
        return InsufficientAiCredits(request);
    }
    catch (InvalidAiCreditIdempotencyKeyException)
    {
        return Results.BadRequest(new ApiErrorResponse(new ApiError(
            "invalid_idempotency_key",
            $"X-Idempotency-Key must be {EfAiCreditService.MaxIdempotencyKeyLength} characters or fewer.",
            DiagnosticsContext.GetCorrelationId(request.HttpContext))));
    }

    logger.LogInformation("Started workout creator job {JobId} for user {UserId}. JobType={JobType}", job.JobId, userId, "rewrite");
    return Results.Accepted($"/api/workout-creator/plan/{job.JobId}", job);
});

app.MapGet("/api/workout-creator/plan/{jobId}", (
    string jobId,
    HttpRequest request,
    IUserStore users,
    IWorkoutPlanJobStore jobs) =>
{
    var userId = GetBearerUserId(request, users);
    if (userId is null)
    {
        return Results.Unauthorized();
    }

    var job = jobs.Get(jobId, userId);
    return job is null ? Results.NotFound(new { error = "Workout creator job not found." }) : Results.Ok(job);
});

app.MapGet("/api/workout-creator/jobs/{jobId}", (
    string jobId,
    HttpRequest request,
    IUserStore users,
    IWorkoutPlanJobStore jobs) =>
{
    var userId = GetBearerUserId(request, users);
    if (userId is null)
    {
        return Results.Unauthorized();
    }

    var job = jobs.Get(jobId, userId);
    return job is null ? Results.NotFound(new { error = "Workout creator job not found." }) : Results.Ok(job);
});

app.MapPost("/api/bug-reports", (
    CreateBugReportRequest body,
    HttpRequest request,
    IUserStore users,
    IBugReportStore reports,
    AuthRateLimiter rateLimiter,
    ILogger<Program> logger) =>
{
    var reporterUserId = GetBearerUserId(request, users);
    if (!rateLimiter.TryConsume("BugReport", AuthRateLimiter.BuildKey(reporterUserId ?? GetClientIpAddress(request))))
    {
        return RateLimited(request);
    }

    var validationError = ValidateBugReport(body);
    if (validationError is not null)
    {
        return Results.BadRequest(new { error = validationError });
    }

    BugReportCreateResult created;
    try
    {
        created = reports.CreateOrGet(Guid.NewGuid(), GetIdempotencyKey(request), reporterUserId, body);
    }
    catch (InvalidBugReportIdempotencyKeyException)
    {
        return Results.BadRequest(new ApiErrorResponse(new ApiError(
            "invalid_idempotency_key",
            $"X-Idempotency-Key must be {BugReportStoreMapper.MaxIdempotencyKeyLength} characters or fewer.",
            DiagnosticsContext.GetCorrelationId(request.HttpContext))));
    }

    logger.LogInformation("Bug report {ReportId} {Action}. Screen={Screen} Language={Language}", created.Report.Id, created.Created ? "stored" : "deduplicated", body.Screen, body.Language);
    return Results.Accepted($"/api/bug-reports/{created.Report.Id}", new BugReportResponse(
        created.Report.Id, "received", created.Report.EmailDeliveryStatus));
});

app.MapGet("/api/bug-reports/{reportId:guid}", (Guid reportId, HttpRequest request, IUserStore users, IBugReportStore reports) =>
{
    var report = reports.Get(reportId);
    if (report is null) return Results.NotFound();
    var userId = GetBearerUserId(request, users);
    if (report.ReporterUserId is not null && report.ReporterUserId != userId) return Results.NotFound();
    return Results.Ok(new BugReportStatusResponse(report.Id, report.Status, report.EmailDeliveryStatus,
        report.ReporterUserId is null ? null : report.AdminResponse,
        report.ReporterUserId is null ? null : report.AdminRespondedAt,
        report.RewardPoints, report.RewardedAt, report.CreatedAt, report.UpdatedAt));
});

app.MapGet("/api/admin/bug-reports", async (int? skip, int? take, HttpRequest request, AdminBugReportService admin,
    AuthRateLimiter rateLimiter, CancellationToken cancellationToken) =>
{
    if (!rateLimiter.TryConsume("AdminAuthIp", AuthRateLimiter.BuildKey(GetClientIpAddress(request)))) return RateLimited(request);
    if (!admin.TryAuthenticate(request.Headers["X-Gymmin-Admin-Key"].ToString(), out _)) return Results.NotFound();
    return Results.Ok(await admin.ListAsync(skip ?? 0, take ?? 50, cancellationToken));
});

app.MapPut("/api/admin/bug-reports/{reportId:guid}", async (Guid reportId, AdminBugReportUpdateRequest body,
    HttpRequest request, AdminBugReportService admin, AuthRateLimiter rateLimiter, CancellationToken cancellationToken) =>
{
    if (!rateLimiter.TryConsume("AdminAuthIp", AuthRateLimiter.BuildKey(GetClientIpAddress(request)))) return RateLimited(request);
    if (!admin.TryAuthenticate(request.Headers["X-Gymmin-Admin-Key"].ToString(), out var actorKeyId)) return Results.NotFound();
    var result = await admin.UpdateAsync(reportId, body, actorKeyId, DiagnosticsContext.GetCorrelationId(request.HttpContext), cancellationToken);
    return result.StatusCode == StatusCodes.Status200OK
        ? Results.Ok(result.Report)
        : Results.Json(new { error = result.ErrorCode }, statusCode: result.StatusCode);
});

app.Run();

static string? GetUserId(HttpRequest request, IUserStore users)
{
    var token = GetBearerToken(request);
    var user = token is null ? null : users.GetUserByToken(token);

    if (user is not null)
    {
        request.HttpContext.Items[DiagnosticsContext.UserIdItem] = user.Id;
        return user.Id;
    }

    if (!request.Headers.TryGetValue("X-Gymmin-User-Id", out var value))
    {
        return null;
    }

    var userId = value.ToString().Trim();
    return string.IsNullOrWhiteSpace(userId) ? null : userId;
}

static string? GetBearerUserId(HttpRequest request, IUserStore users)
{
    var token = GetBearerToken(request);
    var userId = token is null ? null : users.GetUserByToken(token)?.Id;
    if (userId is not null)
    {
        request.HttpContext.Items[DiagnosticsContext.UserIdItem] = userId;
    }

    return userId;
}

static AuthSessionContext? GetBearerSession(HttpRequest request, IUserStore users)
{
    var token = GetBearerToken(request);
    var session = token is null ? null : users.GetSessionByToken(token);
    if (session is not null)
    {
        request.HttpContext.Items[DiagnosticsContext.UserIdItem] = session.User.Id;
    }

    return session;
}

static string? GetBearerToken(HttpRequest request)
{
    if (!request.Headers.TryGetValue("Authorization", out var value))
    {
        return null;
    }

    var authorization = value.ToString().Trim();
    const string prefix = "Bearer ";

    return authorization.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)
        ? authorization[prefix.Length..].Trim()
        : null;
}

static AuthRequestMetadata GetAuthMetadata(HttpRequest request)
{
    var userAgent = request.Headers.UserAgent.ToString();
    var deviceName = request.Headers.TryGetValue("X-Gymmin-Device-Name", out var deviceValue)
        ? deviceValue.ToString()
        : null;
    var ipAddress = GetClientIpAddress(request);
    return new AuthRequestMetadata(userAgent, deviceName, ipAddress);
}

static string? GetClientIpAddress(HttpRequest request) =>
    request.HttpContext.Connection.RemoteIpAddress?.ToString();

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

static async Task<DatabaseHealth> GetDatabaseHealthAsync(bool useDatabaseStorage, IServiceProvider services, ILogger logger)
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

static bool IsDatabaseReady(DatabaseHealth database) =>
    !database.Configured || database is { CanConnect: true, SchemaCurrent: not false };

static IResult RateLimited(HttpRequest request) =>
    Results.Json(
        new ApiErrorResponse(new ApiError(
            "rate_limited",
            "Too many requests.",
            DiagnosticsContext.GetCorrelationId(request.HttpContext))),
        statusCode: StatusCodes.Status429TooManyRequests);

static IResult InsufficientAiCredits(HttpRequest request) =>
    Results.Json(
        new ApiErrorResponse(new ApiError(
            "insufficient_ai_credits",
            "Not enough AI credits",
            DiagnosticsContext.GetCorrelationId(request.HttpContext))),
        statusCode: StatusCodes.Status402PaymentRequired);

static IResult EmailVerificationRequired(HttpRequest request) =>
    Results.Json(new ApiErrorResponse(new ApiError("email_not_verified", "Verify your email before using AI features.", DiagnosticsContext.GetCorrelationId(request.HttpContext))), statusCode: StatusCodes.Status403Forbidden);

static string? GetIdempotencyKey(HttpRequest request)
{
    var key = request.Headers.TryGetValue("X-Idempotency-Key", out var value)
        ? value.ToString().Trim()
        : "";
    return string.IsNullOrWhiteSpace(key) ? null : key;
}

static string? ValidateWorkout(UpsertWorkoutRequest request)
{
    const int maxSteps = 500;
    if (string.IsNullOrWhiteSpace(request.ClientWorkoutId) || request.ClientWorkoutId.Length > 160)
    {
        return "ClientWorkoutId is invalid.";
    }

    if (string.IsNullOrWhiteSpace(request.Name) || request.Name.Length > 250)
    {
        return "Name is invalid.";
    }

    if ((request.Notes?.Length ?? 0) > 10_000 || request.Steps is null || request.Steps.Count > maxSteps)
        return "Workout content is too large.";

    foreach (var step in request.Steps)
    {
        if (step is null || string.IsNullOrWhiteSpace(step.ClientStepId) || step.ClientStepId.Length > 160 ||
            (step.Label?.Length ?? 0) > 500 || (step.ExerciseName?.Length ?? 0) > 500 ||
            (step.Notes?.Length ?? 0) > 2_000 || (step.TargetValue?.Length ?? 0) > 100 ||
            (step.LoadKg?.Length ?? 0) > 100 || (step.SetCount?.Length ?? 0) > 100)
            return "Workout step is invalid or too large.";
    }

    return null;
}

static string? ValidateWorkoutSync(SyncWorkoutsRequest request)
{
    const int maxItems = 250;
    if (request.Workouts is null || request.DeletedClientWorkoutIds is null ||
        request.Workouts.Count > maxItems || request.DeletedClientWorkoutIds.Count > maxItems)
        return "Too many workouts in one sync request.";
    foreach (var workout in request.Workouts)
    {
        if (workout is null) return "Workout is required.";
        var error = ValidateWorkout(workout);
        if (error is not null) return error;
    }
    if (request.DeletedClientWorkoutIds.Any(id => string.IsNullOrWhiteSpace(id) || id.Length > 160))
        return "Deleted ClientWorkoutId is invalid.";
    return null;
}

static string? ValidateUserSettings(UpsertUserSettingsRequest request)
{
    if ((request.Language?.Length ?? 0) > 16 || (request.ThemeName?.Length ?? 0) > 32 ||
        (request.DefaultSetCount?.Length ?? 0) > 32 || (request.DefaultWeight?.Length ?? 0) > 32 ||
        (request.DefaultWorkoutExecutionMode?.Length ?? 0) > 64 ||
        (request.DefaultWorkoutTableOrientation?.Length ?? 0) > 20 ||
        (request.CollapsedPanels?.Count ?? 0) > 250)
        return "Settings are too large.";
    if ((request.CollapsedPanels ?? new Dictionary<string, bool>()).Keys.Any(key => string.IsNullOrWhiteSpace(key) || key.Length > 160))
        return "Collapsed panel key is invalid.";
    if (request.WorkoutReminders is { } reminders &&
        ((reminders.Message?.Length ?? 0) > 500 || (reminders.Description?.Length ?? 0) > 1_000 ||
         (reminders.DaysOfWeek?.Count ?? 0) > 7 || (reminders.WeeklySchedule?.Count ?? 0) > 7))
        return "Workout reminder settings are too large.";
    return null;
}

static string? ValidateBugReport(CreateBugReportRequest request)
{
    if (string.IsNullOrWhiteSpace(request.Description))
    {
        return "Description is required.";
    }

    if ((request.Title?.Length ?? 0) > 250 || request.Description.Length > 10_000)
    {
        return "Bug report content is too long.";
    }

    if ((request.Device?.Length ?? 0) > 1_000 ||
        (request.Screen?.Length ?? 0) > 200 ||
        (request.Language?.Length ?? 0) > 16 ||
        (request.AppVersion?.Length ?? 0) > 50)
    {
        return "Bug report metadata is too long.";
    }

    if (request.Diagnostics is { ValueKind: not JsonValueKind.Null and not JsonValueKind.Undefined } diagnostics &&
        diagnostics.GetRawText().Length > 50_000)
    {
        return "Bug report diagnostics are too long.";
    }

    return null;
}

static string? ValidateFavoriteExercises(IReadOnlyList<FavoriteExercise>? favorites, IReadOnlyList<string>? deletedExerciseIds = null)
{
    const int maxItems = 1_000;

    if ((favorites?.Count ?? 0) > maxItems || (deletedExerciseIds?.Count ?? 0) > maxItems)
    {
        return "Too many favorite exercises.";
    }

    if ((favorites ?? []).Any(favorite => string.IsNullOrWhiteSpace(favorite.ExerciseId)) ||
        (deletedExerciseIds ?? []).Any(string.IsNullOrWhiteSpace))
    {
        return "ExerciseId is required.";
    }

    return null;
}

static string? ValidateWorkoutSessionSync(SyncWorkoutSessionsRequest request)
{
    const int maxItems = 1_000;

    if ((request.Sessions?.Count ?? 0) > maxItems || (request.DeletedClientSessionIds?.Count ?? 0) > maxItems)
    {
        return "Too many workout sessions.";
    }

    foreach (var session in request.Sessions ?? [])
    {
        var validationError = ValidateWorkoutSession(session);
        if (validationError is not null)
        {
            return validationError;
        }
    }

    if ((request.DeletedClientSessionIds ?? []).Any(string.IsNullOrWhiteSpace))
    {
        return "ClientSessionId is required.";
    }

    return null;
}

static string? ValidateWorkoutSession(UpsertWorkoutSessionRequest request)
{
    if (string.IsNullOrWhiteSpace(request.ClientSessionId) || request.ClientSessionId.Length > 160)
    {
        return "ClientSessionId is required.";
    }

    if (request.Session.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null)
    {
        return "Session is required.";
    }

    if (request.Session.GetRawText().Length > 512_000)
    {
        return "Workout session is too large.";
    }

    if (!TryGetJsonString(request.Session, "status", out var status) ||
        status is not ("active" or "completed" or "abandoned"))
    {
        return "Invalid workout session status.";
    }

    if (!TryGetJsonString(request.Session, "executionMode", out var executionMode) ||
        executionMode is not ("guided" or "readonly-post-workout" or "inline-table"))
    {
        return "Invalid workout execution mode.";
    }

    return null;
}

static string? ValidateAchievementsSync(SyncAchievementsRequest request)
{
    const int maxAchievements = 500;
    const int maxAchievementIdLength = 100;
    const long maxForegroundSeconds = 10_000_000_000;

    if ((request.Unlocked?.Count ?? 0) > maxAchievements)
    {
        return "Too many achievements.";
    }

    foreach (var achievement in request.Unlocked ?? [])
    {
        if (string.IsNullOrWhiteSpace(achievement.AchievementId))
        {
            return "AchievementId is required.";
        }

        if (achievement.AchievementId.Trim().Length > maxAchievementIdLength)
        {
            return "AchievementId is too long.";
        }

        if (achievement.UnlockedAt == default)
        {
            return "UnlockedAt is required.";
        }

        if (achievement.ProgressAtUnlock is < 0)
        {
            return "ProgressAtUnlock cannot be negative.";
        }
    }

    if (request.AppUsageStats is { } usage)
    {
        if (usage.TotalForegroundSeconds < 0)
        {
            return "TotalForegroundSeconds cannot be negative.";
        }

        if (usage.TotalForegroundSeconds > maxForegroundSeconds)
        {
            return "TotalForegroundSeconds is too large.";
        }

        if (usage.UpdatedAt == default)
        {
            return "App usage UpdatedAt is required.";
        }
    }

    return null;
}

static bool TryGetJsonString(JsonElement element, string propertyName, out string value)
{
    value = "";

    if (element.ValueKind != JsonValueKind.Object ||
        !element.TryGetProperty(propertyName, out var property) ||
        property.ValueKind != JsonValueKind.String)
    {
        return false;
    }

    value = property.GetString() ?? "";
    return !string.IsNullOrWhiteSpace(value);
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
