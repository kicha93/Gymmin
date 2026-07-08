using Gymmin.Api.Data;
using Gymmin.Api.Domain;
using Gymmin.Api.Services;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

var storage = GymminStorageConfigurationReader.Read(builder.Configuration);
var storageProvider = storage.StorageProvider;
var databaseProvider = storage.DatabaseProvider;
var useDatabaseStorage = storage.UsesDatabase;

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
    builder.Services.AddSingleton<IAccountDeletionService, EfAccountDeletionService>();
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
    builder.Services.AddSingleton<IAccountDeletionService, FileBackedAccountDeletionService>();
}

builder.Services.Configure<AiCreditsOptions>(builder.Configuration.GetSection("Gymmin:AiCredits"));
builder.Services.Configure<GooglePlayOptions>(builder.Configuration.GetSection("Gymmin:GooglePlay"));
builder.Services.AddHttpClient<IWorkoutPlanGenerator, OpenAiWorkoutPlanGenerator>();
builder.Services.AddHttpClient<IGooglePlayPurchaseValidator, GooglePlayPurchaseValidator>();
builder.Services.AddSingleton<IBugReportEmailSender, SmtpBugReportEmailSender>();
builder.Services.AddSingleton<IPasswordResetEmailSender, SmtpPasswordResetEmailSender>();
builder.Services.AddSingleton<IUserAvatarStorage, FileSystemUserAvatarStorage>();
builder.Services.AddSingleton<AuthRateLimiter>();
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase));
});
builder.Services.AddCors(options =>
{
    options.AddPolicy("mobile-dev", policy =>
    {
        policy
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowAnyOrigin();
    });
});
builder.Services.AddEndpointsApiExplorer();

var app = builder.Build();
var startupLogger = app.Services.GetRequiredService<ILogger<Program>>();

if (app.Environment.IsProduction() && app.Configuration.GetValue("Gymmin:Storage:ApplyMigrationsOnStartup", false))
{
    startupLogger.LogWarning("ApplyMigrationsOnStartup is enabled in Production. Prefer running migrations explicitly before deployment.");
}

if (app.Environment.IsProduction() && app.Configuration.GetValue("Gymmin:Diagnostics:Enabled", false))
{
    startupLogger.LogWarning("Diagnostics endpoint is explicitly enabled in Production. Ensure access is protected.");
}

if (string.IsNullOrWhiteSpace(app.Configuration["BugReports:Smtp:Host"]) ||
    string.IsNullOrWhiteSpace(app.Configuration["BugReports:Smtp:Username"]))
{
    startupLogger.LogWarning("Bug report SMTP configuration is incomplete. Bug report email delivery may fail.");
}

var openAiConfiguredAtStartup = !string.IsNullOrWhiteSpace(app.Configuration["OpenAI:ApiKey"]) ||
    !string.IsNullOrWhiteSpace(app.Configuration["OpenAi:ApiKey"]) ||
    !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("OPENAI_API_KEY"));
if (!openAiConfiguredAtStartup)
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
}

app.UseCors("mobile-dev");
app.UseMiddleware<CorrelationIdMiddleware>();
app.UseMiddleware<ApiExceptionHandlingMiddleware>();
app.UseMiddleware<RequestDiagnosticsLoggingMiddleware>();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
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
app.MapGet("/api/health", async (IServiceProvider services, ILogger<Program> logger) => Results.Ok(new
{
    status = "ok",
    storageProvider,
    databaseProvider = useDatabaseStorage ? databaseProvider : null,
    database = await GetDatabaseHealthAsync(useDatabaseStorage, services, logger)
}));
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

    var openAiConfigured = !string.IsNullOrWhiteSpace(configuration["OpenAI:ApiKey"]) ||
        !string.IsNullOrWhiteSpace(configuration["OpenAi:ApiKey"]) ||
        !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("OPENAI_API_KEY"));
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

app.MapPost("/api/auth/register", (RegisterRequest body, HttpRequest request, IUserStore users) =>
{
    var result = users.Register(body, GetAuthMetadata(request));
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
    CancellationToken cancellationToken) =>
{
    var context = GetBearerSession(request, users);
    if (context is null)
    {
        return Results.Unauthorized();
    }

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

app.MapDelete("/api/account", (HttpRequest request, IUserStore users, IAccountDeletionService accountDeletion) =>
{
    var context = GetBearerSession(request, users);
    if (context is null)
    {
        return Results.Unauthorized();
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

app.MapPost("/api/sync/workouts", (SyncWorkoutsRequest body, HttpRequest request, IWorkoutStore store, IUserStore users) =>
{
    var userId = GetUserId(request, users);
    if (userId is null)
    {
        return Results.Unauthorized();
    }

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
    IUserStore users) =>
{
    var userId = GetBearerUserId(request, users);
    if (userId is null)
    {
        return Results.Unauthorized();
    }

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
    IUserStore users) =>
{
    var userId = GetBearerUserId(request, users);
    if (userId is null)
    {
        return Results.Unauthorized();
    }

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
    IUserStore users) =>
{
    var userId = GetBearerUserId(request, users);
    if (userId is null)
    {
        return Results.Unauthorized();
    }

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

app.MapPost("/api/workout-creator/plan", (
    CreateWorkoutPlanRequest body,
    HttpRequest request,
    IUserStore users,
    IWorkoutPlanJobStore jobs,
    IConfiguration configuration,
    ILogger<Program> logger) =>
{
    var userId = GetBearerUserId(request, users);
    if (userId is null)
    {
        return Results.Unauthorized();
    }

    if (body.QuestionsAndAnswers is null || body.QuestionsAndAnswers.Count == 0)
    {
        return Results.BadRequest(new { error = "QuestionsAndAnswers is required." });
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
    ILogger<Program> logger) =>
{
    var userId = GetBearerUserId(request, users);
    if (userId is null)
    {
        return Results.Unauthorized();
    }

    if (string.IsNullOrWhiteSpace(body.Instruction))
    {
        return Results.BadRequest(new { error = "Instruction is required." });
    }

    if (body.Workout.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null)
    {
        return Results.BadRequest(new { error = "Workout is required." });
    }

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

app.MapPost("/api/bug-reports", async (
    CreateBugReportRequest body,
    IBugReportEmailSender emailSender,
    ILogger<Program> logger,
    CancellationToken cancellationToken) =>
{
    var validationError = ValidateBugReport(body);
    if (validationError is not null)
    {
        return Results.BadRequest(new { error = validationError });
    }

    var reportId = Guid.NewGuid();

    try
    {
        await emailSender.SendAsync(reportId, body, cancellationToken);
        logger.LogInformation("Bug report {ReportId} accepted. Screen={Screen} Language={Language}", reportId, body.Screen, body.Language);
        return Results.Accepted($"/api/bug-reports/{reportId}", new BugReportResponse(reportId, "sent"));
    }
    catch (InvalidOperationException error)
    {
        logger.LogWarning(error, "Bug report {ReportId} could not be sent because SMTP is not configured.", reportId);
        return Results.Problem(error.Message, statusCode: StatusCodes.Status503ServiceUnavailable);
    }
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

static async Task<object> GetDatabaseHealthAsync(bool useDatabaseStorage, IServiceProvider services, ILogger logger)
{
    if (!useDatabaseStorage)
    {
        return new { configured = false, canConnect = (bool?)null };
    }

    try
    {
        await using var scope = services.CreateAsyncScope();
        var dbFactory = scope.ServiceProvider.GetRequiredService<IDbContextFactory<GymminDbContext>>();
        await using var db = await dbFactory.CreateDbContextAsync();
        return new { configured = true, canConnect = await db.Database.CanConnectAsync() };
    }
    catch (Exception error)
    {
        logger.LogWarning(error, "Database health check failed.");
        return new { configured = true, canConnect = false };
    }
}

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

static string? GetIdempotencyKey(HttpRequest request)
{
    var key = request.Headers.TryGetValue("X-Idempotency-Key", out var value)
        ? value.ToString().Trim()
        : "";
    return string.IsNullOrWhiteSpace(key) ? null : key;
}

static string? ValidateWorkout(UpsertWorkoutRequest request)
{
    if (string.IsNullOrWhiteSpace(request.ClientWorkoutId))
    {
        return "ClientWorkoutId is required.";
    }

    if (string.IsNullOrWhiteSpace(request.Name))
    {
        return "Name is required.";
    }

    return null;
}

static string? ValidateBugReport(CreateBugReportRequest request)
{
    if (string.IsNullOrWhiteSpace(request.Description))
    {
        return "Description is required.";
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
    if (string.IsNullOrWhiteSpace(request.ClientSessionId))
    {
        return "ClientSessionId is required.";
    }

    if (request.Session.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null)
    {
        return "Session is required.";
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

public partial class Program;
