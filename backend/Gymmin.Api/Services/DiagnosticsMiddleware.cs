using System.Diagnostics;
using System.Text.Json;
using Gymmin.Api.Domain;

namespace Gymmin.Api.Services;

public static class DiagnosticsContext
{
    public const string CorrelationIdHeader = "X-Correlation-Id";
    public const string CorrelationIdItem = "Gymmin.CorrelationId";
    public const string UserIdItem = "Gymmin.UserId";

    public static string GetCorrelationId(HttpContext context) =>
        context.Items.TryGetValue(CorrelationIdItem, out var value) && value is string id && !string.IsNullOrWhiteSpace(id)
            ? id
            : Activity.Current?.TraceId.ToString() ?? Guid.NewGuid().ToString("D");
}

public sealed class CorrelationIdMiddleware
{
    private readonly RequestDelegate _next;

    public CorrelationIdMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, ILogger<CorrelationIdMiddleware> logger)
    {
        var requestedId = context.Request.Headers.TryGetValue(DiagnosticsContext.CorrelationIdHeader, out var headerValue)
            ? headerValue.ToString().Trim()
            : "";
        var correlationId = string.IsNullOrWhiteSpace(requestedId)
            ? Activity.Current?.TraceId.ToString() ?? Guid.NewGuid().ToString("D")
            : requestedId;

        context.Items[DiagnosticsContext.CorrelationIdItem] = correlationId;
        context.Response.OnStarting(() =>
        {
            context.Response.Headers[DiagnosticsContext.CorrelationIdHeader] = correlationId;
            return Task.CompletedTask;
        });

        using (logger.BeginScope(new Dictionary<string, object> { ["CorrelationId"] = correlationId }))
        {
            await _next(context);
        }
    }
}

public sealed class ApiExceptionHandlingMiddleware
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly RequestDelegate _next;

    public ApiExceptionHandlingMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, ILogger<ApiExceptionHandlingMiddleware> logger)
    {
        try
        {
            await _next(context);
        }
        catch (Exception error)
        {
            var correlationId = DiagnosticsContext.GetCorrelationId(context);
            logger.LogError(error,
                "Unhandled API exception {ExceptionType} on {Method} {Path}.",
                error.GetType().Name,
                context.Request.Method,
                context.Request.Path.Value);

            if (context.Response.HasStarted)
            {
                throw;
            }

            context.Response.Clear();
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/json";
            context.Response.Headers[DiagnosticsContext.CorrelationIdHeader] = correlationId;

            var response = new ApiErrorResponse(new ApiError("internal_error", "Unexpected error", correlationId));
            await context.Response.WriteAsync(JsonSerializer.Serialize(response, JsonOptions));
        }
    }
}

public sealed class RequestDiagnosticsLoggingMiddleware
{
    private readonly RequestDelegate _next;

    public RequestDiagnosticsLoggingMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, ILogger<RequestDiagnosticsLoggingMiddleware> logger)
    {
        var stopwatch = Stopwatch.StartNew();
        try
        {
            await _next(context);
        }
        finally
        {
            stopwatch.Stop();
            var correlationId = DiagnosticsContext.GetCorrelationId(context);
            var userId = context.Items.TryGetValue(DiagnosticsContext.UserIdItem, out var value) ? value as string : null;
            var statusCode = context.Response.StatusCode;
            var logLevel = statusCode >= 500 ? LogLevel.Error : statusCode >= 400 ? LogLevel.Warning : LogLevel.Information;

            logger.Log(logLevel,
                "HTTP {Method} {Path} responded {StatusCode} in {ElapsedMs}ms. CorrelationId={CorrelationId} UserId={UserId}",
                context.Request.Method,
                context.Request.Path.Value,
                statusCode,
                stopwatch.ElapsedMilliseconds,
                correlationId,
                userId ?? "anonymous");
        }
    }
}
