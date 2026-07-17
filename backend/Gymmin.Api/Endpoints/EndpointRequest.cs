using Gymmin.Api.Services;

namespace Gymmin.Api.Endpoints;

internal static class EndpointRequest
{
    public static string? GetClientIpAddress(HttpRequest request) =>
        request.HttpContext.Connection.RemoteIpAddress?.ToString();

    public static AuthRequestMetadata GetAuthMetadata(HttpRequest request)
    {
        var userAgent = request.Headers.UserAgent.ToString();
        var deviceName = request.Headers.TryGetValue("X-Gymmin-Device-Name", out var deviceValue)
            ? deviceValue.ToString()
            : null;
        return new AuthRequestMetadata(
            userAgent,
            deviceName,
            GetClientIpAddress(request));
    }

    public static string? GetIdempotencyKey(HttpRequest request)
    {
        var key = request.Headers.TryGetValue("X-Idempotency-Key", out var value)
            ? value.ToString().Trim()
            : "";
        return string.IsNullOrWhiteSpace(key) ? null : key;
    }
}
