using System.Collections.Concurrent;

namespace Gymmin.Api.Services;

public sealed class AuthRateLimiter
{
    private readonly ConcurrentDictionary<string, Bucket> _buckets = new();
    private readonly IConfiguration _configuration;

    public AuthRateLimiter(IConfiguration configuration)
    {
        _configuration = configuration;
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

    public static string BuildKey(params string?[] parts)
    {
        return string.Join(":", parts.Select(part =>
            string.IsNullOrWhiteSpace(part)
                ? "unknown"
                : part.Trim().ToLowerInvariant()));
    }

    private static int GetDefaultLimit(string action) => action switch
    {
        "Login" => 10,
        "PasswordResetRequest" => 5,
        "PasswordResetConfirm" => 10,
        _ => 20
    };

    private static int GetDefaultWindowMinutes(string action) => action switch
    {
        "Login" => 5,
        "PasswordResetRequest" => 15,
        "PasswordResetConfirm" => 15,
        _ => 15
    };

    private sealed class Bucket
    {
        public Queue<DateTimeOffset> Attempts { get; } = new();
    }
}
