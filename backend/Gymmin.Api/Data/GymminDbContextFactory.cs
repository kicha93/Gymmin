using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Gymmin.Api.Services;

namespace Gymmin.Api.Data;

public sealed class GymminDbContextFactory : IDesignTimeDbContextFactory<GymminDbContext>
{
    public GymminDbContext CreateDbContext(string[] args)
    {
        var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Development";
        var configuration = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json", optional: true)
            .AddJsonFile($"appsettings.{environment}.json", optional: true)
            .AddEnvironmentVariables()
            .Build();
        var storage = GymminStorageConfigurationReader.Read(configuration);
        var optionsBuilder = new DbContextOptionsBuilder<GymminDbContext>();
        GymminStorageConfigurationReader.ConfigureDbContext(optionsBuilder, storage);
        return new GymminDbContext(optionsBuilder.Options);
    }
}
