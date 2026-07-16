using Gymmin.Api.Data;
using Gymmin.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Gymmin.Api.Tests;

public sealed class DataRetentionWorkerTests : IClassFixture<GymminApiFactory>
{
    private readonly GymminApiFactory _factory;
    public DataRetentionWorkerTests(GymminApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Cleanup_removes_only_expired_security_and_integration_data()
    {
        using var client = _factory.CreateClient();
        var user = await TestPayloads.RegisterAsync(client, "retention");
        var dbFactory = _factory.Services.GetRequiredService<IDbContextFactory<GymminDbContext>>();
        var now = DateTimeOffset.UtcNow;
        var old = now.AddDays(-120);
        var suffix = Guid.NewGuid().ToString("N");
        await using (var db = await dbFactory.CreateDbContextAsync())
        {
            var storedUser = await db.Users.SingleAsync(item => item.Id == user.User.Id);
            storedUser.EmailVerificationCodeHash = new string('a', 64);
            storedUser.EmailVerificationCodeExpiresAt = old;
            db.PasswordResetTokens.Add(new PasswordResetTokenEntity
            {
                Id = $"reset-{suffix}", UserId = user.User.Id, TokenHash = $"hash-{suffix}",
                CreatedAt = old, ExpiresAt = old.AddHours(1), UsedAt = null
            });
            db.UserSessions.Add(new UserSessionEntity
            {
                Id = $"session-{suffix}", UserId = user.User.Id, TokenHash = $"session-hash-{suffix}",
                CreatedAt = old, LastSeenAt = old, ExpiresAt = old.AddHours(1), RevokedAt = old
            });
            db.AbuseRateLimitBuckets.Add(new AbuseRateLimitBucketEntity
            {
                Id = $"bucket-{suffix}", Action = "test", KeyHash = suffix,
                AttemptCount = 1, WindowStartedAt = old, ExpiresAt = old
            });
            db.GooglePlayRtdnEvents.Add(new GooglePlayRtdnEventEntity
            {
                MessageId = $"retention-{suffix}", PackageName = "com.gymmin.app", NotificationKind = "test",
                ProcessingStatus = "test", ReceivedAt = old, ProcessedAt = old
            });
            await db.SaveChangesAsync();
        }

        await _factory.Services.GetRequiredService<DataRetentionWorker>().RunOnceAsync();

        await using var verification = await dbFactory.CreateDbContextAsync();
        Assert.False(await verification.PasswordResetTokens.AnyAsync(item => item.Id == $"reset-{suffix}"));
        Assert.False(await verification.UserSessions.AnyAsync(item => item.Id == $"session-{suffix}"));
        Assert.False(await verification.AbuseRateLimitBuckets.AnyAsync(item => item.Id == $"bucket-{suffix}"));
        Assert.False(await verification.GooglePlayRtdnEvents.AnyAsync(item => item.MessageId == $"retention-{suffix}"));
        var retainedUser = await verification.Users.SingleAsync(item => item.Id == user.User.Id);
        Assert.Null(retainedUser.EmailVerificationCodeHash);
        Assert.True(await verification.UserSessions.AnyAsync(item => item.UserId == user.User.Id && item.RevokedAt == null));
    }
}
