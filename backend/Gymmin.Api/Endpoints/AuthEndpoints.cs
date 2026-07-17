using Gymmin.Api.Domain;
using Gymmin.Api.Services;

namespace Gymmin.Api.Endpoints;

internal static class AuthEndpoints
{
    public static void MapAuthEndpoints(this WebApplication app)
    {
        app.MapPost("/api/auth/register", async (
            RegisterRequest body,
            HttpRequest request,
            IUserStore users,
            IEmailVerificationEmailSender emailSender,
            AuthRateLimiter rateLimiter,
            IWebHostEnvironment environment,
            ILogger<Program> logger,
            CancellationToken cancellationToken) =>
        {
            if (!rateLimiter.TryConsume(
                    "RegisterIp",
                    AuthRateLimiter.BuildKey(EndpointRequest.GetClientIpAddress(request))) ||
                !rateLimiter.TryConsume(
                    "RegisterEmail",
                    AuthRateLimiter.BuildKey(body.Email)))
            {
                return EndpointResults.RateLimited(request);
            }

            var result = users.Register(body, EndpointRequest.GetAuthMetadata(request));
            if (result.Success && result.Response is { } response)
            {
                var verification = users.CreateEmailVerificationCode(response.User.Id);
                if (verification is not null)
                {
                    if (environment.IsEnvironment("Testing"))
                    {
                        var verifiedUser = users.ConfirmEmailVerification(
                            response.User.Id,
                            verification.Code);
                        if (verifiedUser is not null)
                        {
                            result = result with
                            {
                                Response = new AuthResponse(response.Token, verifiedUser)
                            };
                        }
                    }
                    else
                    {
                        try
                        {
                            await emailSender.SendAsync(
                                verification.Email,
                                verification.Code,
                                verification.ExpiresAt,
                                cancellationToken);
                        }
                        catch (Exception error)
                        {
                            logger.LogWarning(
                                error,
                                "Registration verification email could not be sent.");
                        }
                    }
                }
            }

            return result.Success
                ? Results.Ok(result.Response)
                : Results.Json(new { error = result.Error }, statusCode: result.StatusCode);
        });

        app.MapPost("/api/auth/login", (
            LoginRequest body,
            HttpRequest request,
            IUserStore users,
            AuthRateLimiter rateLimiter) =>
        {
            if (!rateLimiter.TryConsume(
                "Login",
                AuthRateLimiter.BuildKey(
                    EndpointRequest.GetClientIpAddress(request),
                    body.Email)))
            {
                return EndpointResults.RateLimited(request);
            }

            var result = users.Login(body, EndpointRequest.GetAuthMetadata(request));
            return result.Success
                ? Results.Ok(result.Response)
                : Results.Json(new { error = result.Error }, statusCode: result.StatusCode);
        });

        app.MapGet("/api/auth/me", (HttpRequest request, IUserStore users) =>
        {
            var token = EndpointAuthorization.GetBearerToken(request);
            var user = token is null ? null : users.GetUserByToken(token);
            return user is null ? Results.Unauthorized() : Results.Ok(user);
        });

        app.MapPost("/api/auth/logout", (HttpRequest request, IUserStore users) =>
        {
            var token = EndpointAuthorization.GetBearerToken(request);
            if (token is not null)
            {
                users.RevokeSession(token);
            }

            return Results.NoContent();
        });

        app.MapGet("/api/auth/sessions", (HttpRequest request, IUserStore users) =>
        {
            var context = EndpointAuthorization.GetBearerSession(request, users);
            if (context is null)
            {
                return Results.Unauthorized();
            }

            users.UpdateSessionMetadata(
                context.User.Id,
                context.SessionId,
                EndpointRequest.GetAuthMetadata(request));
            return Results.Ok(new AuthSessionsResponse(
                users.ListSessions(context.User.Id, context.SessionId)));
        });

        app.MapDelete("/api/auth/sessions/{sessionId}", (
            string sessionId,
            HttpRequest request,
            IUserStore users) =>
        {
            var context = EndpointAuthorization.GetBearerSession(request, users);
            if (context is null)
            {
                return Results.Unauthorized();
            }

            return users.RevokeSession(context.User.Id, sessionId, "session-revoke")
                ? Results.NoContent()
                : Results.NotFound();
        });

        app.MapPost("/api/auth/logout-all", (
            LogoutAllRequest? body,
            HttpRequest request,
            IUserStore users) =>
        {
            var context = EndpointAuthorization.GetBearerSession(request, users);
            if (context is null)
            {
                return Results.Unauthorized();
            }

            users.RevokeAllSessions(
                context.User.Id,
                "logout-all",
                body?.ExceptCurrent == true ? context.SessionId : null);
            return Results.NoContent();
        });

        app.MapPost("/api/auth/change-password", (
            ChangePasswordRequest body,
            HttpRequest request,
            IUserStore users) =>
        {
            var context = EndpointAuthorization.GetBearerSession(request, users);
            if (context is null)
            {
                return Results.Unauthorized();
            }

            var result = users.ChangePassword(
                context.User.Id,
                body.CurrentPassword,
                body.NewPassword,
                context.SessionId);
            return result.Success
                ? Results.NoContent()
                : Results.Json(new { error = result.Error }, statusCode: result.StatusCode);
        });

        app.MapPost("/api/auth/password-reset/request", async (
            PasswordResetRequest body,
            HttpRequest request,
            IUserStore users,
            IPasswordResetEmailSender emailSender,
            AuthRateLimiter rateLimiter,
            ILogger<Program> logger,
            CancellationToken cancellationToken) =>
        {
            if (!rateLimiter.TryConsume(
                "PasswordResetRequest",
                AuthRateLimiter.BuildKey(
                    EndpointRequest.GetClientIpAddress(request),
                    body.Email)))
            {
                return EndpointResults.RateLimited(request);
            }

            var reset = users.CreatePasswordResetToken(
                body.Email,
                EndpointRequest.GetAuthMetadata(request));
            if (reset is not null)
            {
                try
                {
                    await emailSender.SendAsync(
                        reset.Email,
                        reset.Token,
                        reset.ExpiresAt,
                        cancellationToken);
                }
                catch (Exception error)
                {
                    logger.LogWarning(error, "Password reset email could not be sent.");
                }
            }

            return Results.NoContent();
        });

        app.MapPost("/api/auth/password-reset/confirm", (
            PasswordResetConfirmRequest body,
            HttpRequest request,
            IUserStore users,
            AuthRateLimiter rateLimiter) =>
        {
            if (!rateLimiter.TryConsume(
                "PasswordResetConfirm",
                AuthRateLimiter.BuildKey(
                    EndpointRequest.GetClientIpAddress(request),
                    AuthSecurity.HashToken(body.Token))))
            {
                return EndpointResults.RateLimited(request);
            }

            var result = users.ConfirmPasswordReset(body.Token, body.NewPassword);
            return result.Success
                ? Results.NoContent()
                : Results.Json(new { error = result.Error }, statusCode: result.StatusCode);
        });

        app.MapPost("/api/auth/email-verification/request", async (
            HttpRequest request,
            IUserStore users,
            IEmailVerificationEmailSender emailSender,
            AuthRateLimiter rateLimiter,
            ILogger<Program> logger,
            CancellationToken cancellationToken) =>
        {
            var context = EndpointAuthorization.GetBearerSession(request, users);
            if (context is null)
            {
                return Results.Unauthorized();
            }

            if (context.User.EmailVerified)
            {
                return Results.NoContent();
            }

            if (!rateLimiter.TryConsume(
                    "EmailVerificationRequestUser",
                    AuthRateLimiter.BuildKey(context.User.Id)) ||
                !rateLimiter.TryConsume(
                    "EmailVerificationRequestIp",
                    AuthRateLimiter.BuildKey(EndpointRequest.GetClientIpAddress(request))))
            {
                return EndpointResults.RateLimited(request);
            }

            var verification = users.CreateEmailVerificationCode(context.User.Id);
            if (verification is not null)
            {
                try
                {
                    await emailSender.SendAsync(
                        verification.Email,
                        verification.Code,
                        verification.ExpiresAt,
                        cancellationToken);
                }
                catch (Exception error)
                {
                    logger.LogWarning(error, "Verification email could not be sent.");
                }
            }

            return Results.NoContent();
        });

        app.MapPost("/api/auth/email-verification/confirm", (
            EmailVerificationConfirmRequest body,
            HttpRequest request,
            IUserStore users,
            AuthRateLimiter rateLimiter) =>
        {
            var context = EndpointAuthorization.GetBearerSession(request, users);
            if (context is null)
            {
                return Results.Unauthorized();
            }

            if (!rateLimiter.TryConsume(
                    "EmailVerificationConfirmUser",
                    AuthRateLimiter.BuildKey(context.User.Id)) ||
                !rateLimiter.TryConsume(
                    "EmailVerificationConfirmIp",
                    AuthRateLimiter.BuildKey(EndpointRequest.GetClientIpAddress(request))))
            {
                return EndpointResults.RateLimited(request);
            }

            if (string.IsNullOrWhiteSpace(body.Code) || body.Code.Trim().Length != 6)
            {
                return Results.BadRequest(new { error = "Invalid verification code." });
            }

            var user = users.ConfirmEmailVerification(context.User.Id, body.Code.Trim());
            return user is null
                ? Results.BadRequest(new
                {
                    error = "Invalid or expired verification code."
                })
                : Results.Ok(user);
        });
    }
}
