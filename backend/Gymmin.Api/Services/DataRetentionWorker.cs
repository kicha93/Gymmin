using Gymmin.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Gymmin.Api.Services;

public sealed class DataRetentionWorker(
    IDbContextFactory<GymminDbContext> dbFactory,
    IConfiguration configuration,
    ILogger<DataRetentionWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!configuration.GetValue("Gymmin:DataRetention:Enabled", false)) return;
        var interval = TimeSpan.FromHours(Math.Clamp(configuration.GetValue("Gymmin:DataRetention:IntervalHours", 6), 1, 24));
        while (!stoppingToken.IsCancellationRequested)
        {
            try { await RunOnceAsync(stoppingToken); }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception error) { logger.LogError(error, "Data retention cleanup failed."); }
            await Task.Delay(interval, stoppingToken);
        }
    }

    public async Task RunOnceAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTimeOffset.UtcNow;
        var resetGrace = TimeSpan.FromDays(Math.Clamp(configuration.GetValue("Gymmin:DataRetention:ExpiredResetTokenDays", 7), 1, 30));
        var sessionGrace = TimeSpan.FromDays(Math.Clamp(configuration.GetValue("Gymmin:DataRetention:ExpiredSessionDays", 30), 1, 365));
        var rtdnRetention = TimeSpan.FromDays(Math.Clamp(configuration.GetValue("Gymmin:DataRetention:RtdnEventDays", 90), 30, 365));
        var workoutCreatorJobRetention = TimeSpan.FromDays(Math.Clamp(
            configuration.GetValue("Gymmin:DataRetention:WorkoutCreatorJobDays", 90),
            7,
            365));
        await using var db = await dbFactory.CreateDbContextAsync(cancellationToken);

        var resetTokens = await db.PasswordResetTokens
            .Where(token => token.ExpiresAt < now.Subtract(resetGrace) || (token.UsedAt != null && token.UsedAt < now.Subtract(resetGrace)))
            .ExecuteDeleteAsync(cancellationToken);
        var sessions = await db.UserSessions
            .Where(session => (session.ExpiresAt != null && session.ExpiresAt < now.Subtract(sessionGrace)) ||
                (session.RevokedAt != null && session.RevokedAt < now.Subtract(sessionGrace)))
            .ExecuteDeleteAsync(cancellationToken);
        var rateLimits = await db.AbuseRateLimitBuckets.Where(bucket => bucket.ExpiresAt < now).ExecuteDeleteAsync(cancellationToken);
        var rtdn = await db.GooglePlayRtdnEvents.Where(item => item.ReceivedAt < now.Subtract(rtdnRetention)).ExecuteDeleteAsync(cancellationToken);
        var workoutCreatorJobs = await db.WorkoutCreatorJobs
            .Where(job =>
                job.CompletedAt != null &&
                job.CompletedAt < now.Subtract(workoutCreatorJobRetention) &&
                (job.Status == "completed" || job.Status == "failed"))
            .ExecuteDeleteAsync(cancellationToken);
        var verificationCodes = await db.Users
            .Where(user => user.EmailVerificationCodeHash != null &&
                (user.EmailVerifiedAt != null || user.EmailVerificationCodeExpiresAt < now.Subtract(resetGrace)))
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(user => user.EmailVerificationCodeHash, (string?)null)
                .SetProperty(user => user.EmailVerificationCodeExpiresAt, (DateTimeOffset?)null), cancellationToken);

        logger.LogInformation(
            "Data retention cleanup removed ResetTokens={ResetTokens} Sessions={Sessions} RateLimits={RateLimits} RtdnEvents={RtdnEvents} WorkoutCreatorJobs={WorkoutCreatorJobs}; cleared VerificationCodes={VerificationCodes}.",
            resetTokens, sessions, rateLimits, rtdn, workoutCreatorJobs, verificationCodes);
    }
}
