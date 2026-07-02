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
                ["ConnectionStrings:DefaultConnection"] = $"Data Source={_databasePath}"
            });
        });
        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IDbContextFactory<GymminDbContext>>();
            services.RemoveAll<IUserStore>();
            services.RemoveAll<IUserSettingsStore>();
            services.RemoveAll<IWorkoutStore>();
            services.RemoveAll<IFavoriteExerciseStore>();
            services.RemoveAll<IWorkoutSessionStore>();
            services.RemoveAll<IWorkoutPlanJobStore>();
            services.RemoveAll<IAiCreditService>();
            services.AddDbContextFactory<GymminDbContext>(options => options.UseSqlite($"Data Source={_databasePath}"));
            services.AddSingleton<IUserStore, EfUserStore>();
            services.AddSingleton<IUserSettingsStore, EfUserSettingsStore>();
            services.AddSingleton<IWorkoutStore, EfWorkoutStore>();
            services.AddSingleton<IFavoriteExerciseStore, EfFavoriteExerciseStore>();
            services.AddSingleton<IWorkoutSessionStore, EfWorkoutSessionStore>();
            services.AddSingleton<IWorkoutPlanJobStore, EfWorkoutPlanJobStore>();
            services.AddSingleton<IAiCreditService, EfAiCreditService>();
            services.RemoveAll<IAiCreditPurchaseService>();
            services.AddSingleton<IAiCreditPurchaseService, EfAiCreditPurchaseService>();
            services.RemoveAll<IGooglePlayPurchaseValidator>();
            services.AddSingleton<IGooglePlayPurchaseValidator>(GooglePlayPurchaseValidator);
            services.AddHostedService<TestDatabaseInitializer>();
            services.RemoveAll<IWorkoutPlanGenerator>();
            services.AddSingleton<IWorkoutPlanGenerator>(WorkoutPlanGenerator);
            services.RemoveAll<IBugReportEmailSender>();
            services.AddSingleton<IBugReportEmailSender>(BugReportEmailSender);
            services.RemoveAll<IPasswordResetEmailSender>();
            services.AddSingleton<IPasswordResetEmailSender>(PasswordResetEmailSender);
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
    public int ValidateCalls { get; private set; }
    public int ConsumeCalls { get; private set; }

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
            IsValid ? null : "Purchase could not be verified"));
    }

    public Task<GooglePlayConsumeResult> ConsumeOneTimeProductAsync(string productId, string purchaseToken, CancellationToken cancellationToken)
    {
        ConsumeCalls++;
        return Task.FromResult(ConsumeShouldFail
            ? new GooglePlayConsumeResult(false, ConsumeIsRetryable, "consume_failed", "Synthetic consume failure.")
            : new GooglePlayConsumeResult(true, false, null, null));
    }

    public void Reset()
    {
        IsValid = true;
        IsRetryable = false;
        ConsumeShouldFail = false;
        ConsumeIsRetryable = true;
        PurchaseState = GooglePlayPurchaseStates.Purchased;
        ProductIdOverride = null;
        ValidateCalls = 0;
        ConsumeCalls = 0;
    }
}

internal sealed class FakeBugReportEmailSender : IBugReportEmailSender
{
    public Guid? LastReportId { get; private set; }
    public CreateBugReportRequest? LastReport { get; private set; }

    public Task SendAsync(Guid reportId, CreateBugReportRequest report, CancellationToken cancellationToken)
    {
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
