using Gymmin.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Gymmin.Api.Services;

public sealed record GymminStorageConfiguration(
    string StorageProvider,
    string DatabaseProvider,
    string? ConnectionString)
{
    public bool UsesDatabase => StorageProvider.Equals("Database", StringComparison.OrdinalIgnoreCase);
    public bool UsesFile => StorageProvider.Equals("File", StringComparison.OrdinalIgnoreCase);
    public bool UsesSqlite => DatabaseProvider.Equals("SQLite", StringComparison.OrdinalIgnoreCase);
    public bool UsesPostgreSql => DatabaseProvider.Equals("PostgreSQL", StringComparison.OrdinalIgnoreCase);
}

public static class GymminStorageConfigurationReader
{
    public static GymminStorageConfiguration Read(IConfiguration configuration)
    {
        var storageProvider = configuration["Gymmin:Storage:Provider"] ?? "File";
        var databaseProvider = configuration["Gymmin:Storage:DatabaseProvider"] ?? "SQLite";
        var connectionString = configuration.GetConnectionString("DefaultConnection");

        Validate(storageProvider, databaseProvider, connectionString);
        return new GymminStorageConfiguration(storageProvider, databaseProvider, connectionString);
    }

    public static void Validate(string storageProvider, string databaseProvider, string? connectionString)
    {
        if (!storageProvider.Equals("File", StringComparison.OrdinalIgnoreCase) &&
            !storageProvider.Equals("Database", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Unsupported Gymmin:Storage:Provider. Use File or Database.");
        }

        if (storageProvider.Equals("File", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        if (!databaseProvider.Equals("SQLite", StringComparison.OrdinalIgnoreCase) &&
            !databaseProvider.Equals("PostgreSQL", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Unsupported Gymmin:Storage:DatabaseProvider. Use SQLite or PostgreSQL.");
        }

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException("ConnectionStrings:DefaultConnection is required when Gymmin:Storage:Provider is Database.");
        }
    }

    public static void ConfigureDbContext(DbContextOptionsBuilder options, GymminStorageConfiguration storage)
    {
        if (!storage.UsesDatabase)
        {
            throw new InvalidOperationException("Cannot configure DbContext for File storage provider.");
        }

        if (storage.UsesPostgreSql)
        {
            options.UseNpgsql(storage.ConnectionString);
            return;
        }

        options.UseSqlite(storage.ConnectionString);
    }
}
