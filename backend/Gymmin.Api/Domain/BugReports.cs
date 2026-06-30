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
    string Status);
