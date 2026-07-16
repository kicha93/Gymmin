using Gymmin.Api.Data;
using Gymmin.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace Gymmin.Api.Tests;

public sealed class DatabaseReadinessProbeTests
{
    [Fact]
    public async Task Reports_pending_migrations_without_exposing_their_names()
    {
        var databasePath = Path.Combine(Path.GetTempPath(), "gymmin-tests", $"{Guid.NewGuid():N}.db");
        Directory.CreateDirectory(Path.GetDirectoryName(databasePath)!);
        try
        {
            var factory = new TestDbContextFactory(databasePath);
            await using (var db = factory.CreateDbContext())
            {
                await db.Database.OpenConnectionAsync();
                await db.Database.CloseConnectionAsync();
            }
            var probe = new DatabaseReadinessProbe(
                factory,
                new ConfigurationBuilder().AddInMemoryCollection().Build(),
                NullLogger<DatabaseReadinessProbe>.Instance);

            var result = await probe.CheckAsync(forceRefresh: true);

            Assert.True(result.CanConnect);
            Assert.False(result.SchemaCurrent);
            Assert.True(result.PendingMigrationCount > 0);
        }
        finally
        {
            SqliteConnection.ClearAllPools();
            try
            {
                if (File.Exists(databasePath)) File.Delete(databasePath);
            }
            catch (IOException)
            {
                // A pooled test connection must not hide the readiness assertion.
            }
        }
    }

    private sealed class TestDbContextFactory(string databasePath) : IDbContextFactory<GymminDbContext>
    {
        public GymminDbContext CreateDbContext() => new(
            new DbContextOptionsBuilder<GymminDbContext>()
                .UseSqlite($"Data Source={databasePath}")
                .Options);
    }
}
