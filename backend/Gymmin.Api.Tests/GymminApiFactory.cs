using System.Net.Http.Headers;
using Gymmin.Api.Domain;
using Gymmin.Api.Data;
using Gymmin.Api.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;

namespace Gymmin.Api.Tests;

public sealed class GymminApiFactory : WebApplicationFactory<Program>
{
    private readonly string _databasePath = Path.Combine(Path.GetTempPath(), "gymmin-tests", $"{Guid.NewGuid():N}.db");
    internal FakeBugReportEmailSender BugReportEmailSender { get; } = new();
    public FakePasswordResetEmailSender PasswordResetEmailSender { get; } = new();
    internal FakeWorkoutPlanGenerator WorkoutPlanGenerator { get; } = new();
    internal FakeGooglePlayPurchaseValidator GooglePlayPurchaseValidator { get; } = new();
    internal FakePubSubOidcTokenValidator PubSubOidcTokenValidator { get; } = new();

    public GymminApiFactory()
    {
        Directory.CreateDirectory(Path.GetDirectoryName(_databasePath)!);
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureLogging(logging => logging.ClearProviders());
        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Gymmin:Storage:Provider"] = "Database",
                ["Gymmin:Storage:DatabaseProvider"] = "SQLite",
                ["Gymmin:Storage:ApplyMigrationsOnStartup"] = "true",
                ["Gymmin:GooglePlay:Enabled"] = "true",
                ["Gymmin:GooglePlay:PackageName"] = "com.gymmin.app",
                ["Gymmin:GooglePlay:RtdnEnabled"] = "true",
                ["Gymmin:GooglePlay:RtdnAudience"] = "https://api.gymmin.test/api/integrations/google-play/rtdn",
                ["Gymmin:GooglePlay:RtdnServiceAccountEmail"] = "gymmin-pubsub@example.iam.gserviceaccount.com",
                ["Gymmin:Admin:Enabled"] = "true",
                ["Gymmin:Admin:KeyId"] = "test-key-1",
                ["Gymmin:Admin:ApiKeySha256"] = "944650a7cd0f9e14d5c4fb15edbffb7fa45fb9ed36a4fa9be3d7e5476ae51bd9",
                ["Gymmin:Auth:RateLimits:BugReport:Limit"] = "1000",
                ["Gymmin:Auth:RateLimits:RegisterIp:Limit"] = "1000",
                ["Gymmin:Auth:RateLimits:RegisterEmail:Limit"] = "1000",
                ["Gymmin:Auth:RateLimits:EmailVerificationConfirmUser:Limit"] = "1000",
                ["Gymmin:Auth:RateLimits:EmailVerificationConfirmIp:Limit"] = "1000",
                ["Gymmin:Auth:RateLimits:WorkoutCreatorUser:Limit"] = "1000",
                ["Gymmin:Auth:RateLimits:WorkoutCreatorIp:Limit"] = "1000",
                ["Gymmin:WorkoutCreator:Worker:PollMilliseconds"] = "200",
                ["Gymmin:WorkoutCreator:Worker:LeaseSeconds"] = "30",
                ["BugReports:EmailDelivery:PollSeconds"] = "1",
                ["ConnectionStrings:DefaultConnection"] = $"Data Source={_databasePath};Cache=Shared;Default Timeout=30"
            });
        });
        builder.ConfigureTestServices(services =>
        {
            foreach (var descriptor in services
                .Where(descriptor =>
                    descriptor.ServiceType == typeof(IHostedService) &&
                    descriptor.ImplementationType == typeof(WorkoutPlanJobWorker))
                .ToList())
            {
                services.Remove(descriptor);
            }
            services.RemoveAll<IDbContextFactory<GymminDbContext>>();
            services.RemoveAll<IUserStore>();
            services.RemoveAll<IUserSettingsStore>();
            services.RemoveAll<IWorkoutStore>();
            services.RemoveAll<IFavoriteExerciseStore>();
            services.RemoveAll<IWorkoutSessionStore>();
            services.RemoveAll<IAchievementStore>();
            services.RemoveAll<IWorkoutPlanJobStore>();
            services.RemoveAll<IAiCreditService>();
            services.RemoveAll<IBugReportStore>();
            services.RemoveAll<IAccountDeletionService>();
            services.RemoveAll<IUserAvatarStorage>();
            services.AddDbContextFactory<GymminDbContext>(options =>
                options.UseSqlite($"Data Source={_databasePath};Cache=Shared;Default Timeout=30"));
            services.AddSingleton<IUserStore, EfUserStore>();
            services.AddSingleton<IUserSettingsStore, EfUserSettingsStore>();
            services.AddSingleton<IWorkoutStore, EfWorkoutStore>();
            services.AddSingleton<IFavoriteExerciseStore, EfFavoriteExerciseStore>();
            services.AddSingleton<IWorkoutSessionStore, EfWorkoutSessionStore>();
            services.AddSingleton<IAchievementStore, EfAchievementStore>();
            services.AddSingleton<IWorkoutPlanJobStore, EfWorkoutPlanJobStore>();
            services.AddSingleton<EfWorkoutPlanJobProcessor>();
            services.AddSingleton<IAiCreditService, EfAiCreditService>();
            services.AddSingleton<IBugReportStore, EfBugReportStore>();
            services.AddSingleton<IUserAvatarStorage, DatabaseUserAvatarStorage>();
            services.AddSingleton<IAccountDeletionService, EfAccountDeletionService>();
            services.RemoveAll<IAiCreditPurchaseService>();
            services.AddSingleton<IAiCreditPurchaseService, EfAiCreditPurchaseService>();
            services.RemoveAll<IGooglePlayPurchaseValidator>();
            services.AddSingleton<IGooglePlayPurchaseValidator>(GooglePlayPurchaseValidator);
            services.RemoveAll<IPubSubOidcTokenValidator>();
            services.AddSingleton<IPubSubOidcTokenValidator>(PubSubOidcTokenValidator);
            services.AddSingleton<GooglePlayVoidedPurchasesWorker>();
            services.AddSingleton<DataRetentionWorker>();
            services.AddHostedService<TestDatabaseInitializer>();
            services.RemoveAll<IWorkoutPlanGenerator>();
            services.AddSingleton<IWorkoutPlanGenerator>(WorkoutPlanGenerator);
            services.RemoveAll<IBugReportEmailSender>();
            services.AddSingleton<IBugReportEmailSender>(BugReportEmailSender);
            services.RemoveAll<IPasswordResetEmailSender>();
            services.AddSingleton<IPasswordResetEmailSender>(PasswordResetEmailSender);
            services.AddHostedService<WorkoutPlanJobWorker>();
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);

        try
        {
            if (File.Exists(_databasePath))
            {
                File.Delete(_databasePath);
            }
        }
        catch
        {
            // Best-effort cleanup only; a locked temp DB should not hide test results.
        }
    }
}

internal sealed class FakePubSubOidcTokenValidator : IPubSubOidcTokenValidator
{
    public bool IsValid { get; set; } = true;

    public Task<bool> ValidateAsync(string token, string audience, string expectedEmail, CancellationToken cancellationToken) =>
        Task.FromResult(IsValid && token == "valid-pubsub-token");
}

internal sealed class TestDatabaseInitializer : IHostedService
{
    private readonly IDbContextFactory<GymminDbContext> _dbFactory;

    public TestDatabaseInitializer(IDbContextFactory<GymminDbContext> dbFactory)
    {
        _dbFactory = dbFactory;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        await using var db = await _dbFactory.CreateDbContextAsync(cancellationToken);
        await db.Database.MigrateAsync(cancellationToken);
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }
}

public static class GymminApiTestClientExtensions
{
    public static void Authorize(this HttpClient client, string token)
    {
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    public static void ClearAuthorization(this HttpClient client)
    {
        client.DefaultRequestHeaders.Authorization = null;
    }
}

internal sealed class FakeWorkoutPlanGenerator : IWorkoutPlanGenerator
{
    public bool ShouldFail { get; set; }

    public Task<CreateWorkoutPlanResponse> CreatePlanAsync(CreateWorkoutPlanRequest request, CancellationToken cancellationToken)
    {
        if (ShouldFail)
        {
            throw new InvalidOperationException("Synthetic generator failure.");
        }

        return Task.FromResult(new CreateWorkoutPlanResponse(
            "completed",
            "fake prompt",
            """[{"name":"Generated workout","steps":[]}]""",
            "fake-model",
            "fake"));
    }

    public Task<CreateWorkoutPlanResponse> RewritePlanAsync(CreateWorkoutRewriteRequest request, CancellationToken cancellationToken)
    {
        if (ShouldFail)
        {
            throw new InvalidOperationException("Synthetic generator failure.");
        }

        return Task.FromResult(new CreateWorkoutPlanResponse(
            "completed",
            "fake rewrite prompt",
            """[{"name":"Rewritten workout","steps":[]}]""",
            "fake-model",
            "fake"));
    }
}

internal sealed class FakeGooglePlayPurchaseValidator : IGooglePlayPurchaseValidator
{
    public bool IsValid { get; set; } = true;
    public bool IsRetryable { get; set; }
    public bool ConsumeShouldFail { get; set; }
    public bool ConsumeIsRetryable { get; set; } = true;
    public string PurchaseState { get; set; } = GooglePlayPurchaseStates.Purchased;
    public string? ProductIdOverride { get; set; }
    public string? ObfuscatedExternalAccountId { get; set; }
    public int ValidateCalls { get; private set; }
    public int ConsumeCalls { get; private set; }
    public List<GooglePlayVoidedPurchase> VoidedPurchases { get; } = [];

    public Task<GooglePlayPurchaseValidationResult> ValidateOneTimeProductAsync(string productId, string purchaseToken, CancellationToken cancellationToken)
    {
        ValidateCalls++;
        return Task.FromResult(new GooglePlayPurchaseValidationResult(
            IsValid,
            IsRetryable,
            ProductIdOverride ?? productId,
            $"GPA.fake-{purchaseToken[^Math.Min(6, purchaseToken.Length)..]}",
            PurchaseState,
            0,
            1,
            DateTimeOffset.UtcNow,
            "PL",
            """{"sanitized":true}""",
            IsValid ? null : "invalid_google_play_purchase",
            IsValid ? null : "Purchase could not be verified",
            ObfuscatedExternalAccountId));
    }

    public Task<GooglePlayConsumeResult> ConsumeOneTimeProductAsync(string productId, string purchaseToken, CancellationToken cancellationToken)
    {
        ConsumeCalls++;
        return Task.FromResult(ConsumeShouldFail
            ? new GooglePlayConsumeResult(false, ConsumeIsRetryable, "consume_failed", "Synthetic consume failure.")
            : new GooglePlayConsumeResult(true, false, null, null));
    }

    public Task<GooglePlayVoidedPurchasesResult> ListVoidedPurchasesAsync(
        DateTimeOffset startTime,
        DateTimeOffset endTime,
        string? pageToken,
        CancellationToken cancellationToken) =>
        Task.FromResult(new GooglePlayVoidedPurchasesResult(true, false, VoidedPurchases.ToList(), null, null, null));

    public void Reset()
    {
        IsValid = true;
        IsRetryable = false;
        ConsumeShouldFail = false;
        ConsumeIsRetryable = true;
        PurchaseState = GooglePlayPurchaseStates.Purchased;
        ProductIdOverride = null;
        ObfuscatedExternalAccountId = null;
        ValidateCalls = 0;
        ConsumeCalls = 0;
        VoidedPurchases.Clear();
    }
}

internal sealed class FakeBugReportEmailSender : IBugReportEmailSender
{
    public bool FailNextSend { get; set; }
    public Guid? LastReportId { get; private set; }
    public CreateBugReportRequest? LastReport { get; private set; }

    public Task SendAsync(Guid reportId, CreateBugReportRequest report, CancellationToken cancellationToken)
    {
        if (FailNextSend)
        {
            FailNextSend = false;
            throw new InvalidOperationException("Synthetic SMTP failure.");
        }

        LastReportId = reportId;
        LastReport = report;
        return Task.CompletedTask;
    }
}

public sealed class FakePasswordResetEmailSender : IPasswordResetEmailSender
{
    public string? LastEmail { get; private set; }
    public string? LastToken { get; private set; }
    public DateTimeOffset? LastExpiresAt { get; private set; }

    public Task SendAsync(string email, string token, DateTimeOffset expiresAt, CancellationToken cancellationToken)
    {
        LastEmail = email;
        LastToken = token;
        LastExpiresAt = expiresAt;
        return Task.CompletedTask;
    }
}
