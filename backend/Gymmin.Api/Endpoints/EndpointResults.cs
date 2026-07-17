using Gymmin.Api.Domain;
using Gymmin.Api.Services;

namespace Gymmin.Api.Endpoints;

internal static class EndpointResults
{
    public static IResult RateLimited(HttpRequest request) =>
        Results.Json(
            new ApiErrorResponse(new ApiError(
                "rate_limited",
                "Too many requests.",
                DiagnosticsContext.GetCorrelationId(request.HttpContext))),
            statusCode: StatusCodes.Status429TooManyRequests);
}
