using Gymmin.Api.Services;

namespace Gymmin.Api.Endpoints;

internal static class EndpointAuthorization
{
    public static string? GetBearerUserId(HttpRequest request, IUserStore users)
    {
        var token = GetBearerToken(request);
        var userId = token is null ? null : users.GetUserByToken(token)?.Id;
        if (userId is not null)
        {
            request.HttpContext.Items[DiagnosticsContext.UserIdItem] = userId;
        }

        return userId;
    }

    public static AuthSessionContext? GetBearerSession(HttpRequest request, IUserStore users)
    {
        var token = GetBearerToken(request);
        var session = token is null ? null : users.GetSessionByToken(token);
        if (session is not null)
        {
            request.HttpContext.Items[DiagnosticsContext.UserIdItem] = session.User.Id;
        }

        return session;
    }

    public static string? GetBearerToken(HttpRequest request)
    {
        if (!request.Headers.TryGetValue("Authorization", out var value))
        {
            return null;
        }

        var authorization = value.ToString().Trim();
        const string prefix = "Bearer ";

        return authorization.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)
            ? authorization[prefix.Length..].Trim()
            : null;
    }
}
