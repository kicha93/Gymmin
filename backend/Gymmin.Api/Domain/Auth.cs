namespace Gymmin.Api.Domain;

public sealed record RegisterRequest(
    string Email,
    string Password,
    string Name);

public sealed record LoginRequest(
    string Email,
    string Password);

public sealed record ChangePasswordRequest(
    string CurrentPassword,
    string NewPassword);

public sealed record PasswordResetRequest(
    string Email);

public sealed record PasswordResetConfirmRequest(
    string Token,
    string NewPassword);

public sealed record LogoutAllRequest(
    bool ExceptCurrent);

public sealed record AuthUserResponse(
    string Id,
    string Email,
    string Name,
    string? AvatarUrl = null,
    DateTimeOffset? AvatarUpdatedAt = null,
    DateTimeOffset? CreatedOn = null,
    DateTimeOffset? ModifiedOn = null);

public sealed record AuthResponse(
    string Token,
    AuthUserResponse User);

public sealed record AuthSessionResponse(
    string Id,
    DateTimeOffset CreatedAt,
    DateTimeOffset LastSeenAt,
    DateTimeOffset ExpiresAt,
    string? DeviceName,
    bool IsCurrent);

public sealed record AuthSessionsResponse(
    IReadOnlyList<AuthSessionResponse> Sessions);
