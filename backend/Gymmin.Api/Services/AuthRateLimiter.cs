using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using Gymmin.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Gymmin.Api.Services;

public sealed class AuthRateLimiter
{
    private readonly ConcurrentDictionary<string, Bucket> _buckets = new();
    private readonly IConfiguration _configuration;
    private readonly IDbContextFactory<GymminDbContext>? _dbFactory;
    private long _databaseAttempts;

    public AuthRateLimiter(IConfiguration configuration, IDbContextFactory<GymminDbContext>? dbFactory = null)
    {
        _configuration = configuration;
        _dbFactory = dbFactory;
    }

    public bool TryConsume(string action, string key)
    {
        if (!_configuration.GetValue("Gymmin:Auth:RateLimits:Enabled", true))
        {
            return true;
        }

        var limit = Math.Clamp(_configuration.GetValue($"Gymmin:Auth:RateLimits:{action}:Limit", GetDefaultLimit(action)), 1, 10_000);
        var windowMinutes = Math.Clamp(_configuration.GetValue($"Gymmin:Auth:RateLimits:{action}:WindowMinutes", GetDefaultWindowMinutes(action)), 1, 24 * 60);
        var now = DateTimeOffset.UtcNow;
        var window = TimeSpan.FromMinutes(windowMinutes);
        if (_dbFactory is not null && string.Equals(_configuration.GetValue("Gymmin:Storage:Provider", "File"), "Database", StringComparison.OrdinalIgnoreCase))
        {
            return TryConsumeDatabase(action, key, limit, window, now);
        }
        var bucket = _buckets.GetOrAdd($"{action}:{key}", _ => new Bucket());

        lock (bucket)
        {
            while (bucket.Attempts.Count > 0 && now - bucket.Attempts.Peek() > window)
            {
                bucket.Attempts.Dequeue();
            }

            if (bucket.Attempts.Count >= limit)
            {
                return false;
            }

            bucket.Attempts.Enqueue(now);
            return true;
        }
    }

    private bool TryConsumeDatabase(string action, string key, int limit, TimeSpan window, DateTimeOffset now)
    {
        var windowSeconds = Math.Max(60L, (long)window.TotalSeconds);
        var startedUnix = now.ToUnixTimeSeconds() / windowSeconds * windowSeconds;
        var startedAt = DateTimeOffset.FromUnixTimeSeconds(startedUnix);
        var keyHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(key)));
        var id = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes($"{action}:{keyHash}:{startedUnix}")));

        using var db = _dbFactory!.CreateDbContext();
        var updated = db.AbuseRateLimitBuckets
            .Where(bucket => bucket.Id == id && bucket.AttemptCount < limit)
            .ExecuteUpdate(setters => setters.SetProperty(bucket => bucket.AttemptCount, bucket => bucket.AttemptCount + 1));
        if (updated == 1) return true;
        if (db.AbuseRateLimitBuckets.AsNoTracking().Any(bucket => bucket.Id == id)) return false;

        db.AbuseRateLimitBuckets.Add(new AbuseRateLimitBucketEntity
        {
            Id = id,
            Action = action[..Math.Min(action.Length, 64)],
            KeyHash = keyHash,
            AttemptCount = 1,
            WindowStartedAt = startedAt,
            ExpiresAt = startedAt.Add(window).AddMinutes(5)
        });
        try { db.SaveChanges(); }
        catch (DbUpdateException)
        {
            db.ChangeTracker.Clear();
            return db.AbuseRateLimitBuckets
                .Where(bucket => bucket.Id == id && bucket.AttemptCount < limit)
                .ExecuteUpdate(setters => setters.SetProperty(bucket => bucket.AttemptCount, bucket => bucket.AttemptCount + 1)) == 1;
        }

        if (Interlocked.Increment(ref _databaseAttempts) % 250 == 0)
        {
            db.AbuseRateLimitBuckets.Where(bucket => bucket.ExpiresAt < now).ExecuteDelete();
        }
        return true;
    }

    public static string BuildKey(params string?[] parts)
    {
        return string.Join(":", parts.Select(part =>
            string.IsNullOrWhiteSpace(part)
                ? "unknown"
                : part.Trim().ToLowerInvariant()));
    }

    private static int GetDefaultLimit(string action) => action switch
    {
        "LoginIp" => 50,
        "LoginAccount" => 10,
        "RegisterIp" => 10,
        "RegisterEmail" => 3,
        "EmailVerificationRequestUser" => 3,
        "EmailVerificationRequestIp" => 20,
        "EmailVerificationConfirmUser" => 10,
        "EmailVerificationConfirmIp" => 50,
        "WorkoutCreatorUser" => 10,
        "WorkoutCreatorIp" => 30,
        "AccountDeletionUser" => 5,
        "AccountDeletionIp" => 20,
        "ChangePasswordUser" => 5,
        "ChangePasswordIp" => 20,
        "AvatarUploadUser" => 10,
        "PurchaseVerificationUser" => 20,
        "PurchaseVerificationIp" => 50,
        "DataSyncUser" => 120,
        "PasswordResetRequestIp" => 20,
        "PasswordResetRequestAccount" => 5,
        "PasswordResetConfirmIp" => 50,
        "PasswordResetConfirmToken" => 10,
        "BugReport" => 10,
        _ => 20
    };

    private static int GetDefaultWindowMinutes(string action) => action switch
    {
        "LoginIp" => 5,
        "LoginAccount" => 5,
        "RegisterIp" => 60,
        "RegisterEmail" => 60,
        "EmailVerificationRequestUser" => 15,
        "EmailVerificationRequestIp" => 60,
        "EmailVerificationConfirmUser" => 15,
        "EmailVerificationConfirmIp" => 15,
        "WorkoutCreatorUser" => 60,
        "WorkoutCreatorIp" => 60,
        "AccountDeletionUser" => 15,
        "AccountDeletionIp" => 60,
        "ChangePasswordUser" => 15,
        "ChangePasswordIp" => 60,
        "AvatarUploadUser" => 60,
        "PurchaseVerificationUser" => 15,
        "PurchaseVerificationIp" => 15,
        "DataSyncUser" => 15,
        "PasswordResetRequestIp" => 60,
        "PasswordResetRequestAccount" => 15,
        "PasswordResetConfirmIp" => 15,
        "PasswordResetConfirmToken" => 15,
        "BugReport" => 60,
        _ => 15
    };

    private sealed class Bucket
    {
        public Queue<DateTimeOffset> Attempts { get; } = new();
    }
}
