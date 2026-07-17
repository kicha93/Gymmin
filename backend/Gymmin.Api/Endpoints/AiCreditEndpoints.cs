using Gymmin.Api.Domain;
using Gymmin.Api.Services;

namespace Gymmin.Api.Endpoints;

internal static class AiCreditEndpoints
{
    public static void MapAiCreditEndpoints(this WebApplication app)
    {
        var aiCredits = app.MapGroup("/api/ai-credits");

        aiCredits.MapGet("/balance", (
            HttpRequest request,
            IUserStore users,
            IAiCreditService credits) =>
        {
            var userId = EndpointAuthorization.GetBearerUserId(request, users);
            return userId is null
                ? Results.Unauthorized()
                : Results.Ok(credits.GetBalance(userId));
        });

        aiCredits.MapGet("/transactions", (
            int? limit,
            HttpRequest request,
            IUserStore users,
            IAiCreditService credits) =>
        {
            var userId = EndpointAuthorization.GetBearerUserId(request, users);
            return userId is null
                ? Results.Unauthorized()
                : Results.Ok(credits.GetTransactions(userId, limit ?? 50));
        });

        aiCredits.MapGet("/packs", (
            HttpRequest request,
            IUserStore users,
            IAiCreditService credits) =>
        {
            var userId = EndpointAuthorization.GetBearerUserId(request, users);
            return userId is null
                ? Results.Unauthorized()
                : Results.Ok(credits.GetPacks());
        });

        aiCredits.MapPost("/dev/grant", (
            DevGrantAiCreditsRequest body,
            HttpRequest request,
            IWebHostEnvironment environment,
            IConfiguration configuration,
            IUserStore users,
            IAiCreditService credits) =>
        {
            var userId = EndpointAuthorization.GetBearerUserId(request, users);
            if (userId is null)
            {
                return Results.Unauthorized();
            }

            var enabled = configuration.GetValue("Gymmin:AiCredits:DevGrantEnabled", true);
            if (environment.IsProduction() || !enabled)
            {
                return Results.NotFound();
            }

            return body.Amount is > 0 and <= 100
                ? Results.Ok(credits.GrantDev(userId, body.Amount, body.Reason))
                : Results.BadRequest(new { error = "Amount must be between 1 and 100." });
        });

        aiCredits.MapGet("/purchases", (
            HttpRequest request,
            IUserStore users,
            IAiCreditPurchaseService purchases) =>
        {
            var userId = EndpointAuthorization.GetBearerUserId(request, users);
            return userId is null
                ? Results.Unauthorized()
                : Results.Ok(purchases.GetPurchases(userId));
        });

        aiCredits.MapPost("/purchases/google-play/verify", async (
            VerifyGooglePlayPurchaseRequest body,
            HttpRequest request,
            IUserStore users,
            IAiCreditPurchaseService purchases,
            CancellationToken cancellationToken) =>
        {
            var userId = EndpointAuthorization.GetBearerUserId(request, users);
            if (userId is null)
            {
                return Results.Unauthorized();
            }

            var result = await purchases.VerifyGooglePlayPurchaseAsync(
                userId,
                body,
                cancellationToken);
            if (result.Success)
            {
                return Results.Ok(result.Response);
            }

            var error = new ApiErrorResponse(new ApiError(
                result.ErrorCode ?? "invalid_google_play_purchase",
                result.ErrorMessage ?? "Purchase could not be verified",
                DiagnosticsContext.GetCorrelationId(request.HttpContext)));

            if (result.IsConflict)
            {
                return Results.Json(error, statusCode: StatusCodes.Status409Conflict);
            }

            return result.IsRetryable
                ? Results.Json(error, statusCode: StatusCodes.Status503ServiceUnavailable)
                : Results.BadRequest(error);
        });
    }
}
