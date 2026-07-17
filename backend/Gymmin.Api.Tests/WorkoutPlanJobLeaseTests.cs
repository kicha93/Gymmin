using Gymmin.Api.Data;
using Gymmin.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace Gymmin.Api.Tests;

public sealed class WorkoutPlanJobLeaseTests
{
    [Fact]
    public async Task Concurrent_workers_claim_job_once_and_expired_lease_can_be_recovered()
    {
        var databasePath = Path.Combine(Path.GetTempPath(), "gymmin-tests", $"lease-{Guid.NewGuid():N}.db");
        Directory.CreateDirectory(Path.GetDirectoryName(databasePath)!);
        var services = new ServiceCollection();
        services.AddDbContextFactory<GymminDbContext>(options =>
            options.UseSqlite($"Data Source={databasePath};Default Timeout=10"));
        await using var provider = services.BuildServiceProvider();
        var dbFactory = provider.GetRequiredService<IDbContextFactory<GymminDbContext>>();

        await using (var db = await dbFactory.CreateDbContextAsync())
        {
            await db.Database.EnsureCreatedAsync();
            var now = DateTimeOffset.UtcNow;
            db.Users.Add(new UserEntity
            {
                Id = "lease-user",
                Email = "lease@example.com",
                NormalizedEmail = "LEASE@EXAMPLE.COM",
                Name = "Lease User",
                PasswordHash = "hash",
                PasswordIterations = 1,
                PasswordSalt = "salt",
                CreatedAt = now,
                UpdatedAt = now
            });
            db.WorkoutCreatorJobs.Add(new WorkoutCreatorJobEntity
            {
                Id = "lease-job",
                UserId = "lease-user",
                JobType = "plan",
                Status = "processing",
                Language = "en",
                RequestJson = "{}",
                CreatedAt = now,
                UpdatedAt = now
            });
            await db.SaveChangesAsync();
        }

        var processorA = CreateProcessor(dbFactory);
        var processorB = CreateProcessor(dbFactory);
        var claims = await Task.WhenAll(
            processorA.TryClaimNextAsync(TimeSpan.FromMinutes(5), CancellationToken.None),
            processorB.TryClaimNextAsync(TimeSpan.FromMinutes(5), CancellationToken.None));

        var firstClaim = Assert.Single(claims, claim => claim is not null)!;
        Assert.Equal("lease-job", firstClaim.Id);
        Assert.Null(await processorA.TryClaimNextAsync(TimeSpan.FromMinutes(5), CancellationToken.None));

        await using (var db = await dbFactory.CreateDbContextAsync())
        {
            var stored = await db.WorkoutCreatorJobs.SingleAsync(job => job.Id == "lease-job");
            Assert.Equal(1, stored.AttemptCount);
            Assert.Equal(firstClaim.LeaseId, stored.LeaseId);
            stored.LeaseExpiresAt = DateTimeOffset.UtcNow.AddSeconds(-1);
            await db.SaveChangesAsync();
        }

        var recovered = await processorB.TryClaimNextAsync(TimeSpan.FromMinutes(5), CancellationToken.None);
        Assert.NotNull(recovered);
        Assert.NotEqual(firstClaim.LeaseId, recovered!.LeaseId);

        await using (var db = await dbFactory.CreateDbContextAsync())
        {
            var stored = await db.WorkoutCreatorJobs.AsNoTracking().SingleAsync(job => job.Id == "lease-job");
            Assert.Equal(2, stored.AttemptCount);
            Assert.Equal(recovered.LeaseId, stored.LeaseId);
        }

        try
        {
            File.Delete(databasePath);
        }
        catch
        {
            // Best-effort cleanup must not hide the lease assertion result.
        }
    }

    private static EfWorkoutPlanJobProcessor CreateProcessor(IDbContextFactory<GymminDbContext> dbFactory) =>
        new(
            dbFactory,
            null!,
            null!,
            NullLogger<EfWorkoutPlanJobProcessor>.Instance);
}
