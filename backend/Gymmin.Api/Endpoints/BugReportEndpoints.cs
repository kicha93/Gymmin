using System.Text.Json;
using Gymmin.Api.Domain;
using Gymmin.Api.Services;

namespace Gymmin.Api.Endpoints;

internal static class BugReportEndpoints
{
    public static void MapBugReportEndpoints(this WebApplication app)
    {
        app.MapPost("/api/bug-reports", (
            CreateBugReportRequest body,
            HttpRequest request,
            IUserStore users,
            IBugReportStore reports,
            AuthRateLimiter rateLimiter,
            ILogger<Program> logger) =>
        {
            var reporterUserId = EndpointAuthorization.GetBearerUserId(request, users);
            if (!rateLimiter.TryConsume(
                "BugReport",
                AuthRateLimiter.BuildKey(reporterUserId ?? EndpointRequest.GetClientIpAddress(request))))
            {
                return EndpointResults.RateLimited(request);
            }

            var validationError = Validate(body);
            if (validationError is not null)
            {
                return Results.BadRequest(new { error = validationError });
            }

            BugReportCreateResult created;
            try
            {
                created = reports.CreateOrGet(
                    Guid.NewGuid(),
                    EndpointRequest.GetIdempotencyKey(request),
                    reporterUserId,
                    body);
            }
            catch (InvalidBugReportIdempotencyKeyException)
            {
                return Results.BadRequest(new ApiErrorResponse(new ApiError(
                    "invalid_idempotency_key",
                    $"X-Idempotency-Key must be {BugReportStoreMapper.MaxIdempotencyKeyLength} characters or fewer.",
                    DiagnosticsContext.GetCorrelationId(request.HttpContext))));
            }

            logger.LogInformation(
                "Bug report {ReportId} {Action}. Screen={Screen} Language={Language}",
                created.Report.Id,
                created.Created ? "stored" : "deduplicated",
                body.Screen,
                body.Language);
            return Results.Accepted(
                $"/api/bug-reports/{created.Report.Id}",
                new BugReportResponse(
                    created.Report.Id,
                    "received",
                    created.Report.EmailDeliveryStatus));
        });

        app.MapGet("/api/bug-reports/{reportId:guid}", (
            Guid reportId,
            HttpRequest request,
            IUserStore users,
            IBugReportStore reports) =>
        {
            var report = reports.Get(reportId);
            if (report is null)
            {
                return Results.NotFound();
            }

            var userId = EndpointAuthorization.GetBearerUserId(request, users);
            if (report.ReporterUserId is not null && report.ReporterUserId != userId)
            {
                return Results.NotFound();
            }

            return Results.Ok(new BugReportStatusResponse(
                report.Id,
                report.Status,
                report.EmailDeliveryStatus,
                report.ReporterUserId is null ? null : report.AdminResponse,
                report.ReporterUserId is null ? null : report.AdminRespondedAt,
                report.RewardPoints,
                report.RewardedAt,
                report.CreatedAt,
                report.UpdatedAt));
        });

        app.MapGet("/api/admin/bug-reports", async (
            int? skip,
            int? take,
            HttpRequest request,
            AdminBugReportService admin,
            AuthRateLimiter rateLimiter,
            CancellationToken cancellationToken) =>
        {
            if (!rateLimiter.TryConsume(
                "AdminAuthIp",
                AuthRateLimiter.BuildKey(EndpointRequest.GetClientIpAddress(request))))
            {
                return EndpointResults.RateLimited(request);
            }

            if (!admin.TryAuthenticate(request.Headers["X-Gymmin-Admin-Key"].ToString(), out _))
            {
                return Results.NotFound();
            }

            return Results.Ok(await admin.ListAsync(skip ?? 0, take ?? 50, cancellationToken));
        });

        app.MapPut("/api/admin/bug-reports/{reportId:guid}", async (
            Guid reportId,
            AdminBugReportUpdateRequest body,
            HttpRequest request,
            AdminBugReportService admin,
            AuthRateLimiter rateLimiter,
            CancellationToken cancellationToken) =>
        {
            if (!rateLimiter.TryConsume(
                "AdminAuthIp",
                AuthRateLimiter.BuildKey(EndpointRequest.GetClientIpAddress(request))))
            {
                return EndpointResults.RateLimited(request);
            }

            if (!admin.TryAuthenticate(
                request.Headers["X-Gymmin-Admin-Key"].ToString(),
                out var actorKeyId))
            {
                return Results.NotFound();
            }

            var result = await admin.UpdateAsync(
                reportId,
                body,
                actorKeyId,
                DiagnosticsContext.GetCorrelationId(request.HttpContext),
                cancellationToken);
            return result.StatusCode == StatusCodes.Status200OK
                ? Results.Ok(result.Report)
                : Results.Json(new { error = result.ErrorCode }, statusCode: result.StatusCode);
        });
    }

    private static string? Validate(CreateBugReportRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Description))
        {
            return "Description is required.";
        }

        if ((request.Title?.Length ?? 0) > 250 || request.Description.Length > 10_000)
        {
            return "Bug report content is too long.";
        }

        if ((request.Device?.Length ?? 0) > 1_000 ||
            (request.Screen?.Length ?? 0) > 200 ||
            (request.Language?.Length ?? 0) > 16 ||
            (request.AppVersion?.Length ?? 0) > 50)
        {
            return "Bug report metadata is too long.";
        }

        return request.Diagnostics is
            { ValueKind: not JsonValueKind.Null and not JsonValueKind.Undefined } diagnostics &&
            diagnostics.GetRawText().Length > 50_000
            ? "Bug report diagnostics are too long."
            : null;
    }
}
