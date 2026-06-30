using Gymmin.Api.Services;

namespace Gymmin.Api.Tests;

public sealed class StorageConfigurationTests
{
    [Fact]
    public void File_storage_allows_empty_connection_string()
    {
        GymminStorageConfigurationReader.Validate("File", "SQLite", null);
    }

    [Fact]
    public void Unknown_storage_provider_fails_fast()
    {
        var error = Assert.Throws<InvalidOperationException>(() =>
            GymminStorageConfigurationReader.Validate("Unknown", "SQLite", "Data Source=test.db"));

        Assert.Contains("Storage:Provider", error.Message);
    }

    [Fact]
    public void Unknown_database_provider_fails_fast()
    {
        var error = Assert.Throws<InvalidOperationException>(() =>
            GymminStorageConfigurationReader.Validate("Database", "Oracle", "Host=localhost"));

        Assert.Contains("DatabaseProvider", error.Message);
    }

    [Fact]
    public void Database_storage_requires_connection_string()
    {
        var error = Assert.Throws<InvalidOperationException>(() =>
            GymminStorageConfigurationReader.Validate("Database", "SQLite", ""));

        Assert.Contains("DefaultConnection", error.Message);
    }
}
