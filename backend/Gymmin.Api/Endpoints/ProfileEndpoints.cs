using Gymmin.Api.Domain;
using Gymmin.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace Gymmin.Api.Endpoints;

internal static class ProfileEndpoints
{
    public static void MapProfileEndpoints(this WebApplication app)
    {
        app.MapGet("/api/profile/avatar", (
            HttpRequest request,
            IUserStore users,
            IUserAvatarStorage avatars) =>
        {
            var context = EndpointAuthorization.GetBearerSession(request, users);
            if (context is null)
            {
                return Results.Unauthorized();
            }

            var avatar = users.GetAvatarMetadata(context.User.Id);
            if (avatar is null)
            {
                return Results.NotFound();
            }

            var storedAvatar = avatars.Get(context.User.Id, avatar.FileName);
            if (storedAvatar is null)
            {
                return Results.NotFound();
            }

            request.HttpContext.Response.Headers.CacheControl = "private, no-cache, max-age=0";
            return Results.File(
                storedAvatar.Bytes,
                storedAvatar.ContentType,
                enableRangeProcessing: false);
        });

        app.MapPost("/api/profile/avatar", async (
            HttpRequest request,
            IUserStore users,
            IUserAvatarStorage avatars,
            AuthRateLimiter rateLimiter,
            CancellationToken cancellationToken) =>
        {
            var context = EndpointAuthorization.GetBearerSession(request, users);
            if (context is null)
            {
                return Results.Unauthorized();
            }

            if (!rateLimiter.TryConsume(
                "AvatarUploadUser",
                AuthRateLimiter.BuildKey(context.User.Id)))
            {
                return EndpointResults.RateLimited(request);
            }

            if (!request.HasFormContentType)
            {
                return Results.BadRequest(new
                {
                    error = "Avatar upload must use multipart/form-data."
                });
            }

            var form = await request.ReadFormAsync(cancellationToken);
            var file = form.Files.GetFile("avatar");
            var validation = avatars.Validate(file);
            if (!validation.IsValid)
            {
                return Results.Json(
                    new { error = validation.Error },
                    statusCode: validation.StatusCode);
            }

            var stored = await avatars.SaveAsync(
                context.User.Id,
                file!,
                cancellationToken);
            return Results.Ok(new
            {
                avatarUrl = FileSystemUserAvatarStorage.BuildAvatarUrl(
                    new UserAvatarMetadata(
                        stored.FileName,
                        stored.ContentType,
                        stored.UpdatedAt)),
                avatarUpdatedAt = stored.UpdatedAt
            });
        });

        app.MapDelete("/api/profile/avatar", (
            HttpRequest request,
            IUserStore users,
            IUserAvatarStorage avatars) =>
        {
            var context = EndpointAuthorization.GetBearerSession(request, users);
            if (context is null)
            {
                return Results.Unauthorized();
            }

            avatars.Delete(context.User.Id);
            return Results.Ok(new
            {
                avatarUrl = (string?)null,
                avatarUpdatedAt = (DateTimeOffset?)null
            });
        });

        app.MapDelete("/api/account", (
            [FromBody] DeleteAccountRequest? body,
            HttpRequest request,
            IUserStore users,
            IAccountDeletionService accountDeletion,
            AuthRateLimiter rateLimiter) =>
        {
            var context = EndpointAuthorization.GetBearerSession(request, users);
            if (context is null)
            {
                return Results.Unauthorized();
            }

            if (!rateLimiter.TryConsume(
                    "AccountDeletionUser",
                    AuthRateLimiter.BuildKey(context.User.Id)) ||
                !rateLimiter.TryConsume(
                    "AccountDeletionIp",
                    AuthRateLimiter.BuildKey(EndpointRequest.GetClientIpAddress(request))))
            {
                return EndpointResults.RateLimited(request);
            }

            if (!users.VerifyPassword(context.User.Id, body?.Password ?? ""))
            {
                return Results.Json(
                    new
                    {
                        error = new
                        {
                            code = "invalid_credentials",
                            message = "Current password is invalid."
                        }
                    },
                    statusCode: StatusCodes.Status403Forbidden);
            }

            return accountDeletion.DeleteAccount(context.User.Id)
                ? Results.NoContent()
                : Results.NotFound();
        });
    }
}
