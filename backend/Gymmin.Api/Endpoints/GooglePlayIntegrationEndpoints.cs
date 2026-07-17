using Gymmin.Api.Domain;
using Gymmin.Api.Services;

namespace Gymmin.Api.Endpoints;

internal static class GooglePlayIntegrationEndpoints
{
    public static void MapGooglePlayIntegrationEndpoints(this WebApplication app)
    {
        app.MapPost("/api/integrations/google-play/rtdn", async (
            PubSubPushEnvelope? body,
            HttpRequest request,
            GooglePlayRtdnService service,
            CancellationToken cancellationToken) =>
        {
            var result = await service.ReceiveAsync(
                request.Headers.Authorization.ToString(),
                body,
                cancellationToken);
            return result.StatusCode == StatusCodes.Status204NoContent
                ? Results.NoContent()
                : Results.Json(new { error = result.ErrorCode }, statusCode: result.StatusCode);
        });
    }
}
