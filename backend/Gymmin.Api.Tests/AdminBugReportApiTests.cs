using System.Net;
using System.Net.Http.Json;
using Gymmin.Api.Data;
using Gymmin.Api.Domain;
using Gymmin.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Gymmin.Api.Tests;

public sealed class AdminBugReportApiTests : IClassFixture<GymminApiFactory>
{
    private readonly GymminApiFactory _factory;
    public AdminBugReportApiTests(GymminApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Admin_update_requires_hashed_key_and_creates_immutable_reward_and_audit_event()
    {
        using var client = _factory.CreateClient();
        var user = await TestPayloads.RegisterAsync(client, "admin-report");
        client.Authorize(user.Token);
        var createdResponse = await client.PostAsJsonAsync("/api/bug-reports", new CreateBugReportRequest(
            "Problem", "Opis problemu", "Android", "Profil", "pl", "1.0"));
        var created = await createdResponse.Content.ReadFromJsonAsync<BugReportResponse>();
        Assert.NotNull(created);

        client.ClearAuthorization();
        var update = new AdminBugReportUpdateRequest("resolved", "Dziękujemy, poprawione.", 25);
        Assert.Equal(HttpStatusCode.NotFound,
            (await client.PutAsJsonAsync($"/api/admin/bug-reports/{created!.Id}", update)).StatusCode);

        client.DefaultRequestHeaders.Add("X-Gymmin-Admin-Key", "test-admin-key");
        var accepted = await client.PutAsJsonAsync($"/api/admin/bug-reports/{created.Id}", update);
        Assert.Equal(HttpStatusCode.OK, accepted.StatusCode);
        var duplicate = await client.PutAsJsonAsync($"/api/admin/bug-reports/{created.Id}", update);
        Assert.Equal(HttpStatusCode.OK, duplicate.StatusCode);

        var changedReward = await client.PutAsJsonAsync($"/api/admin/bug-reports/{created.Id}", update with { RewardPoints = 30 });
        Assert.Equal(HttpStatusCode.Conflict, changedReward.StatusCode);

        var dbFactory = _factory.Services.GetRequiredService<IDbContextFactory<GymminDbContext>>();
        await using var db = await dbFactory.CreateDbContextAsync();
        Assert.Single(await db.BugReportRewardTransactions.Where(item => item.BugReportId == created.Id).ToListAsync());
        Assert.Equal(2, await db.AdminAuditEvents.CountAsync(item => item.TargetId == created.Id.ToString()));
    }
}
