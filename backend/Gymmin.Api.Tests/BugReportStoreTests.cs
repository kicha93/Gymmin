using Gymmin.Api.Domain;
using Gymmin.Api.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Logging.Abstractions;

namespace Gymmin.Api.Tests;

public sealed class BugReportStoreTests
{
    [Fact]
    public void File_store_persists_atomically_and_deduplicates_retries()
    {
        var root = Path.Combine(Path.GetTempPath(), "gymmin-bug-store-tests", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(root);
        try
        {
            var environment = new TestWebHostEnvironment(root);
            var store = new FileBackedBugReportStore(environment, NullLogger<FileBackedBugReportStore>.Instance);
            var request = new CreateBugReportRequest("Title", "Description", "Android", "Profile", "pl", "1.0");
            var first = store.CreateOrGet(Guid.NewGuid(), "stable-key", "user-1", request);
            var duplicate = store.CreateOrGet(Guid.NewGuid(), "stable-key", "user-1", request);

            Assert.True(first.Created);
            Assert.False(duplicate.Created);
            Assert.Equal(first.Report.Id, duplicate.Report.Id);
            Assert.Empty(Directory.GetFiles(Path.Combine(root, "App_Data"), "*.tmp"));

            var reloaded = new FileBackedBugReportStore(environment, NullLogger<FileBackedBugReportStore>.Instance);
            Assert.Equal(first.Report.Id, reloaded.Get(first.Report.Id)?.Id);
        }
        finally
        {
            Directory.Delete(root, true);
        }
    }

    [Fact]
    public void Bug_report_rate_limit_defaults_to_ten_per_hour()
    {
        var limiter = new AuthRateLimiter(new ConfigurationBuilder().Build());

        for (var attempt = 0; attempt < 10; attempt++) Assert.True(limiter.TryConsume("BugReport", "same-client"));
        Assert.False(limiter.TryConsume("BugReport", "same-client"));
        Assert.True(limiter.TryConsume("BugReport", "other-client"));
    }

    private sealed class TestWebHostEnvironment(string root) : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "Gymmin.Api.Tests";
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public string WebRootPath { get; set; } = root;
        public string EnvironmentName { get; set; } = "Testing";
        public string ContentRootPath { get; set; } = root;
        public IFileProvider ContentRootFileProvider { get; set; } = new PhysicalFileProvider(root);
    }
}
