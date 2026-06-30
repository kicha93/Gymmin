namespace Gymmin.Api.Domain;

public sealed record ApiErrorResponse(ApiError Error);

public sealed record ApiError(
    string Code,
    string Message,
    string? CorrelationId = null);
