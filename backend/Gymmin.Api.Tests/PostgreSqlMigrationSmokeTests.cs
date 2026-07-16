using Gymmin.Api.Data;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Gymmin.Api.Tests;

public sealed class PostgreSqlMigrationSmokeTests
{
    [Fact]
    public async Task All_migrations_apply_to_real_postgresql_when_configured()
    {
        var adminConnectionString = Environment.GetEnvironmentVariable("GYMMIN_TEST_POSTGRES");
        if (string.IsNullOrWhiteSpace(adminConnectionString)) return;

        var databaseName = $"gymmin_migration_smoke_{Guid.NewGuid():N}";
        var adminBuilder = new NpgsqlConnectionStringBuilder(adminConnectionString) { Database = "postgres" };
        await using var admin = new NpgsqlConnection(adminBuilder.ConnectionString);
        await admin.OpenAsync();

        await using (var create = new NpgsqlCommand($"CREATE DATABASE \"{databaseName}\"", admin))
        {
            await create.ExecuteNonQueryAsync();
        }

        var smokeBuilder = new NpgsqlConnectionStringBuilder(adminConnectionString) { Database = databaseName };
        try
        {
            var options = new DbContextOptionsBuilder<GymminDbContext>()
                .UseNpgsql(smokeBuilder.ConnectionString)
                .Options;
            await using (var db = new GymminDbContext(options))
            {
                await db.Database.MigrateAsync();
                Assert.True(await db.Database.CanConnectAsync());
            }

            await using var smoke = new NpgsqlConnection(smokeBuilder.ConnectionString);
            await smoke.OpenAsync();
            await using var verify = new NpgsqlCommand(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('BugReports', 'BugReportRewardTransactions', 'GooglePlayRtdnEvents', 'AdminAuditEvents', 'GooglePlayVoidedPurchases', 'IntegrationCheckpoints')",
                smoke);
            Assert.Equal(6L, (long)(await verify.ExecuteScalarAsync())!);
        }
        finally
        {
            NpgsqlConnection.ClearAllPools();
            await using var drop = new NpgsqlCommand($"DROP DATABASE IF EXISTS \"{databaseName}\" WITH (FORCE)", admin);
            await drop.ExecuteNonQueryAsync();
        }
    }
}
