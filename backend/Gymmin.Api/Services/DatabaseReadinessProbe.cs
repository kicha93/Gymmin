using Gymmin.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Gymmin.Api.Services;

public sealed class DatabaseReadinessProbe(
    IDbContextFactory<GymminDbContext> dbFactory,
    IConfiguration configuration,
    ILogger<DatabaseReadinessProbe> logger)
{
    private readonly SemaphoreSlim _gate = new(1, 1);
    private DatabaseHealth? _cached;
    private DateTimeOffset _cachedUntil;

    public async Task<DatabaseHealth> CheckAsync(bool forceRefresh = false, CancellationToken cancellationToken = default)
    {
        var now = DateTimeOffset.UtcNow;
        if (!forceRefresh && _cached is not null && _cachedUntil > now) return _cached;

        await _gate.WaitAsync(cancellationToken);
        try
        {
            now = DateTimeOffset.UtcNow;
            if (!forceRefresh && _cached is not null && _cachedUntil > now) return _cached;

            DatabaseHealth result;
            try
            {
                await using var db = await dbFactory.CreateDbContextAsync(cancellationToken);
                var canConnect = await db.Database.CanConnectAsync(cancellationToken);
                if (!canConnect)
                {
                    result = new DatabaseHealth(true, false, false, null);
                }
                else
                {
                    var pendingCount = (await db.Database.GetPendingMigrationsAsync(cancellationToken)).Count();
                    result = new DatabaseHealth(true, true, pendingCount == 0, pendingCount);
                }
            }
            catch (Exception error)
            {
                logger.LogWarning(error, "Database readiness check failed.");
                result = new DatabaseHealth(true, false, false, null);
            }

            var cacheSeconds = Math.Clamp(
                configuration.GetValue("Gymmin:Storage:ReadinessCacheSeconds", 15),
                1,
                300);
            _cached = result;
            _cachedUntil = now.AddSeconds(cacheSeconds);
            return result;
        }
        finally
        {
            _gate.Release();
        }
    }
}
