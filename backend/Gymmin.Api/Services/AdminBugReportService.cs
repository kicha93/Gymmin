using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Gymmin.Api.Data;
using Gymmin.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Gymmin.Api.Services;

public sealed record AdminBugReportUpdateRequest(string Status, string? Response, int RewardPoints);

public sealed class AdminBugReportService(IConfiguration configuration, IServiceScopeFactory scopeFactory)
{
    private static readonly HashSet<string> AllowedStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "new", "triaged", "in_progress", "resolved", "rejected"
    };

    public bool TryAuthenticate(string? suppliedKey, out string actorKeyId)
    {
        actorKeyId = configuration["Gymmin:Admin:KeyId"]?.Trim() ?? "";
        var expectedHex = configuration["Gymmin:Admin:ApiKeySha256"]?.Trim() ?? "";
        if (!configuration.GetValue("Gymmin:Admin:Enabled", false) || string.IsNullOrWhiteSpace(suppliedKey) ||
            suppliedKey.Length > 512 || expectedHex.Length != 64 || actorKeyId.Length is 0 or > 100) return false;
        try
        {
            var expected = Convert.FromHexString(expectedHex);
            var actual = SHA256.HashData(Encoding.UTF8.GetBytes(suppliedKey));
            return CryptographicOperations.FixedTimeEquals(actual, expected);
        }
        catch (FormatException) { return false; }
    }

    public async Task<IReadOnlyList<AdminBugReportListItem>> ListAsync(int skip, int take, CancellationToken cancellationToken)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var factory = scope.ServiceProvider.GetRequiredService<IDbContextFactory<GymminDbContext>>();
        await using var db = await factory.CreateDbContextAsync(cancellationToken);
        return await db.BugReports.AsNoTracking().OrderByDescending(report => report.CreatedAt)
            .Skip(Math.Clamp(skip, 0, 100_000)).Take(Math.Clamp(take, 1, 100))
            .Select(report => new AdminBugReportListItem(report.Id, report.ReporterUserId, report.Title, report.Status,
                report.EmailDeliveryStatus, report.AdminResponse, report.RewardPoints, report.CreatedAt, report.UpdatedAt))
            .ToListAsync(cancellationToken);
    }

    public async Task<AdminBugReportUpdateResult> UpdateAsync(Guid id, AdminBugReportUpdateRequest request, string actorKeyId,
        string? correlationId, CancellationToken cancellationToken)
    {
        var status = request.Status?.Trim().ToLowerInvariant() ?? "";
        var response = string.IsNullOrWhiteSpace(request.Response) ? null : request.Response.Trim();
        if (!AllowedStatuses.Contains(status) || response?.Length > 4_000 || request.RewardPoints is < 0 or > 10_000)
            return new(400, "invalid_admin_update", null);

        await using var scope = scopeFactory.CreateAsyncScope();
        var factory = scope.ServiceProvider.GetRequiredService<IDbContextFactory<GymminDbContext>>();
        await using var db = await factory.CreateDbContextAsync(cancellationToken);
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var report = await db.BugReports.SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (report is null) return new(404, "bug_report_not_found", null);
        if (request.RewardPoints > 0 && report.ReporterUserId is null) return new(409, "anonymous_report_cannot_be_rewarded", null);

        var existingReward = await db.BugReportRewardTransactions.SingleOrDefaultAsync(item => item.BugReportId == id, cancellationToken);
        if (existingReward is not null && existingReward.Points != request.RewardPoints)
            return new(409, "reward_is_immutable", null);
        if (existingReward is null && request.RewardPoints > 0)
        {
            db.BugReportRewardTransactions.Add(new BugReportRewardTransactionEntity
            {
                Id = Guid.NewGuid(), BugReportId = id, UserId = report.ReporterUserId,
                Points = request.RewardPoints, Reason = "Bug report reward", AwardedBy = actorKeyId, CreatedAt = DateTimeOffset.UtcNow
            });
            report.RewardPoints = request.RewardPoints;
            report.RewardedAt = DateTimeOffset.UtcNow;
        }

        report.Status = status;
        report.AdminResponse = response;
        report.AdminRespondedAt = response is null ? report.AdminRespondedAt : DateTimeOffset.UtcNow;
        report.UpdatedAt = DateTimeOffset.UtcNow;
        db.AdminAuditEvents.Add(new AdminAuditEventEntity
        {
            Id = Guid.NewGuid(), ActorKeyId = actorKeyId, Action = "bug_report.update", TargetType = "bug_report",
            TargetId = id.ToString(), CorrelationId = correlationId,
            DetailsJson = JsonSerializer.Serialize(new { status, hasResponse = response is not null, rewardPoints = request.RewardPoints }),
            CreatedAt = DateTimeOffset.UtcNow
        });
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return new(200, null, new AdminBugReportListItem(report.Id, report.ReporterUserId, report.Title, report.Status,
            report.EmailDeliveryStatus, report.AdminResponse, report.RewardPoints, report.CreatedAt, report.UpdatedAt));
    }
}

public sealed record AdminBugReportListItem(Guid Id, string? ReporterUserId, string Title, string Status,
    string EmailDeliveryStatus, string? AdminResponse, int RewardPoints, DateTimeOffset CreatedAt, DateTimeOffset UpdatedAt);
public sealed record AdminBugReportUpdateResult(int StatusCode, string? ErrorCode, AdminBugReportListItem? Report);
