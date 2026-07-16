using System.Text.Json;

namespace Gymmin.Api.Domain;

public sealed record CreateBugReportRequest(
    string Title,
    string Description,
    string? Device,
    string? Screen,
    string? Language,
    string? AppVersion,
    JsonElement? Diagnostics = null);

public sealed record BugReportResponse(
    Guid Id,
    string Status,
    string EmailDeliveryStatus);

public sealed record BugReportStatusResponse(
    Guid Id,
    string Status,
    string EmailDeliveryStatus,
    string? AdminResponse,
    DateTimeOffset? AdminRespondedAt,
    int RewardPoints,
    DateTimeOffset? RewardedAt,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record BugReportCreateResult(StoredBugReport Report, bool Created);

public static class BugReportStatuses
{
    public const string New = "new";
}

public static class BugReportEmailDeliveryStatuses
{
    public const string Pending = "pending";
    public const string Sending = "sending";
    public const string Sent = "sent";
    public const string Failed = "failed";
}

public sealed record StoredBugReport(
    Guid Id,
    string? IdempotencyKey,
    string? ReporterUserId,
    string Title,
    string Description,
    string? Device,
    string? Screen,
    string? Language,
    string? AppVersion,
    string? DiagnosticsJson,
    string Status,
    string EmailDeliveryStatus,
    string? EmailDeliveryError,
    int EmailAttemptCount,
    DateTimeOffset? EmailLastAttemptAt,
    DateTimeOffset? EmailNextAttemptAt,
    DateTimeOffset? EmailSentAt,
    string? EmailLeaseId,
    DateTimeOffset? EmailLeaseExpiresAt,
    string? AdminResponse,
    DateTimeOffset? AdminRespondedAt,
    int RewardPoints,
    DateTimeOffset? RewardedAt,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);
