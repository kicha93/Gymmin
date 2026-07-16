using Gymmin.Api.Data;
using Gymmin.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Gymmin.Api.Services;

public sealed class EfUserStore : IUserStore
{
    private static readonly TimeSpan LastSeenAtWriteInterval = TimeSpan.FromMinutes(5);
    private readonly IDbContextFactory<GymminDbContext> _dbFactory;
    private readonly int _sessionLifetimeDays;
    private readonly int _resetTokenMinutes;
    private readonly int _emailVerificationCodeMinutes;

    public EfUserStore(IDbContextFactory<GymminDbContext> dbFactory, IConfiguration configuration)
    {
        _dbFactory = dbFactory;
        _sessionLifetimeDays = Math.Clamp(configuration.GetValue("Gymmin:Auth:SessionLifetimeDays", 30), 1, 365);
        _resetTokenMinutes = Math.Clamp(configuration.GetValue("Gymmin:Auth:PasswordResetTokenMinutes", 30), 5, 240);
        _emailVerificationCodeMinutes = Math.Clamp(configuration.GetValue("Gymmin:Auth:EmailVerificationCodeMinutes", 30), 5, 240);
    }

    public AuthResult Register(RegisterRequest request, AuthRequestMetadata? metadata = null)
    {
        var email = NormalizeEmail(request.Email);
        var name = request.Name?.Trim() ?? "";
        var password = request.Password ?? "";

        if (!IsValidEmail(email) || !AuthSecurity.IsValidNewPassword(password) || string.IsNullOrWhiteSpace(name))
        {
            return new AuthResult(false, null, "Invalid registration data.", StatusCodes.Status400BadRequest);
        }

        using var db = _dbFactory.CreateDbContext();
        if (db.Users.Any(user => user.NormalizedEmail == email))
        {
            return new AuthResult(false, null, "Account with this email already exists.", StatusCodes.Status409Conflict);
        }

        var now = DateTimeOffset.UtcNow;
        var passwordHash = AuthSecurity.CreatePasswordHash(password);
        var user = new UserEntity
        {
            CreatedAt = now,
            Email = email,
            Id = Guid.NewGuid().ToString("N"),
            Name = name,
            NormalizedEmail = email,
            PasswordHash = passwordHash.Hash,
            PasswordIterations = passwordHash.Iterations,
            PasswordSalt = passwordHash.Salt,
            UpdatedAt = now
        };
        var token = AddSession(user, now, metadata);

        db.Users.Add(user);
        db.SaveChanges();

        return AuthSuccess(user, token);
    }

    public AuthResult Login(LoginRequest request, AuthRequestMetadata? metadata = null)
    {
        var email = NormalizeEmail(request.Email);
        var password = request.Password ?? "";

        if (!IsValidEmail(email) || password.Length < 4)
        {
            return new AuthResult(false, null, "Invalid email or password.", StatusCodes.Status401Unauthorized);
        }

        using var db = _dbFactory.CreateDbContext();
        var user = db.Users
            .Include(item => item.Sessions)
            .FirstOrDefault(item => item.NormalizedEmail == email);

        if (user is null ||
            !AuthSecurity.VerifyPassword(password, new PersistedPassword(user.PasswordHash, user.PasswordIterations, user.PasswordSalt)))
        {
            return new AuthResult(false, null, "Invalid email or password.", StatusCodes.Status401Unauthorized);
        }

        var token = AddSession(user, DateTimeOffset.UtcNow, metadata);
        db.SaveChanges();

        return AuthSuccess(user, token);
    }

    public AuthSessionContext? GetSessionByToken(string token)
    {
        var tokenHash = AuthSecurity.HashToken(token);
        if (string.IsNullOrWhiteSpace(tokenHash))
        {
            return null;
        }

        var now = DateTimeOffset.UtcNow;
        using var db = _dbFactory.CreateDbContext();
        var session = db.UserSessions
            .Include(item => item.User)
            .FirstOrDefault(item => item.TokenHash == tokenHash && item.RevokedAt == null);

        if (session?.User is null || GetEffectiveExpiresAt(session) <= now)
        {
            return null;
        }

        if (ShouldUpdateLastSeenAt(session.LastSeenAt, session.CreatedAt, now))
        {
            session.LastSeenAt = now;
            db.SaveChanges();
        }

        return new AuthSessionContext(ToResponse(session.User), session.Id);
    }

    public AuthUserResponse? GetUserByToken(string token) => GetSessionByToken(token)?.User;

    public UserAvatarMetadata? GetAvatarMetadata(string userId)
    {
        using var db = _dbFactory.CreateDbContext();
        var user = db.Users.FirstOrDefault(item => item.Id == userId);
        return user is null ? null : ToAvatarMetadata(user);
    }

    public bool UpdateAvatar(string userId, string fileName, string contentType, DateTimeOffset updatedAt)
    {
        using var db = _dbFactory.CreateDbContext();
        var user = db.Users.FirstOrDefault(item => item.Id == userId);
        if (user is null)
        {
            return false;
        }

        user.AvatarFileName = fileName;
        user.AvatarContentType = contentType;
        user.AvatarUpdatedAt = updatedAt;
        user.UpdatedAt = updatedAt;
        db.SaveChanges();
        return true;
    }

    public bool ClearAvatar(string userId)
    {
        using var db = _dbFactory.CreateDbContext();
        var user = db.Users.FirstOrDefault(item => item.Id == userId);
        if (user is null)
        {
            return false;
        }

        user.AvatarFileName = null;
        user.AvatarContentType = null;
        user.AvatarUpdatedAt = null;
        user.UpdatedAt = DateTimeOffset.UtcNow;
        db.SaveChanges();
        return true;
    }

    public void RevokeSession(string token)
    {
        var tokenHash = AuthSecurity.HashToken(token);
        if (string.IsNullOrWhiteSpace(tokenHash))
        {
            return;
        }

        using var db = _dbFactory.CreateDbContext();
        var session = db.UserSessions.FirstOrDefault(item => item.TokenHash == tokenHash && item.RevokedAt == null);
        if (session is null)
        {
            return;
        }

        session.RevokedAt = DateTimeOffset.UtcNow;
        session.RevokedReason = "logout";
        db.SaveChanges();
    }

    public IReadOnlyList<AuthSessionResponse> ListSessions(string userId, string? currentSessionId)
    {
        var now = DateTimeOffset.UtcNow;
        using var db = _dbFactory.CreateDbContext();
        return db.UserSessions
            .Where(session => session.UserId == userId && session.RevokedAt == null)
            .AsEnumerable()
            .Where(session => GetEffectiveExpiresAt(session) > now)
            .OrderByDescending(session => session.LastSeenAt)
            .Select(session => new AuthSessionResponse(
                session.Id,
                session.CreatedAt,
                session.LastSeenAt,
                GetEffectiveExpiresAt(session),
                session.DeviceName,
                session.Id == currentSessionId))
            .ToList();
    }

    public bool UpdateSessionMetadata(string userId, string sessionId, AuthRequestMetadata metadata)
    {
        using var db = _dbFactory.CreateDbContext();
        var session = db.UserSessions.FirstOrDefault(item => item.UserId == userId && item.Id == sessionId);
        var deviceName = !string.IsNullOrWhiteSpace(metadata.DeviceName)
            ? NormalizeDeviceName(metadata.DeviceName, null)
            : NeedsDeviceNameRepair(session?.DeviceName)
                ? NormalizeDeviceName(null, metadata.UserAgent)
                : null;
        if (session is null || string.IsNullOrWhiteSpace(deviceName))
        {
            return false;
        }

        session.DeviceName = deviceName;
        session.UserAgent = string.IsNullOrWhiteSpace(metadata.UserAgent) ? session.UserAgent : metadata.UserAgent;
        session.LastIpAddress = string.IsNullOrWhiteSpace(metadata.IpAddress) ? session.LastIpAddress : metadata.IpAddress;
        db.SaveChanges();
        return true;
    }

    public bool RevokeSession(string userId, string sessionId, string reason)
    {
        using var db = _dbFactory.CreateDbContext();
        var session = db.UserSessions.FirstOrDefault(item => item.UserId == userId && item.Id == sessionId);
        if (session is null)
        {
            return false;
        }

        session.RevokedAt ??= DateTimeOffset.UtcNow;
        session.RevokedReason = reason;
        db.SaveChanges();
        return true;
    }

    public void RevokeAllSessions(string userId, string reason, string? exceptSessionId = null)
    {
        using var db = _dbFactory.CreateDbContext();
        var now = DateTimeOffset.UtcNow;
        var sessions = db.UserSessions
            .Where(session => session.UserId == userId && session.RevokedAt == null && session.Id != exceptSessionId)
            .ToList();

        foreach (var session in sessions)
        {
            session.RevokedAt = now;
            session.RevokedReason = reason;
        }

        db.SaveChanges();
    }

    public AuthResult ChangePassword(string userId, string currentPassword, string newPassword, string? currentSessionId)
    {
        if (!AuthSecurity.IsValidNewPassword(newPassword))
        {
            return new AuthResult(false, null, "Invalid password.", StatusCodes.Status400BadRequest);
        }

        using var db = _dbFactory.CreateDbContext();
        var user = db.Users
            .Include(item => item.Sessions)
            .FirstOrDefault(item => item.Id == userId);
        if (user is null ||
            !AuthSecurity.VerifyPassword(currentPassword ?? "", new PersistedPassword(user.PasswordHash, user.PasswordIterations, user.PasswordSalt)))
        {
            return new AuthResult(false, null, "Invalid password.", StatusCodes.Status400BadRequest);
        }

        var now = DateTimeOffset.UtcNow;
        var passwordHash = AuthSecurity.CreatePasswordHash(newPassword);
        user.PasswordHash = passwordHash.Hash;
        user.PasswordIterations = passwordHash.Iterations;
        user.PasswordSalt = passwordHash.Salt;
        user.UpdatedAt = now;
        foreach (var session in user.Sessions.Where(session => session.Id != currentSessionId && session.RevokedAt is null))
        {
            session.RevokedAt = now;
            session.RevokedReason = "password-change";
        }

        db.SaveChanges();
        return new AuthResult(true, null, null, StatusCodes.Status204NoContent);
    }

    public bool VerifyPassword(string userId, string password)
    {
        if (string.IsNullOrEmpty(password)) return false;
        using var db = _dbFactory.CreateDbContext();
        var user = db.Users.AsNoTracking().FirstOrDefault(item => item.Id == userId);
        return user is not null && AuthSecurity.VerifyPassword(
            password,
            new PersistedPassword(user.PasswordHash, user.PasswordIterations, user.PasswordSalt));
    }

    public PasswordResetIssue? CreatePasswordResetToken(string email, AuthRequestMetadata? metadata = null)
    {
        var normalizedEmail = NormalizeEmail(email);
        using var db = _dbFactory.CreateDbContext();
        var user = db.Users.FirstOrDefault(item => item.NormalizedEmail == normalizedEmail);
        if (user is null)
        {
            return null;
        }

        var now = DateTimeOffset.UtcNow;
        var token = AuthSecurity.CreateToken();
        var expiresAt = now.AddMinutes(_resetTokenMinutes);
        db.PasswordResetTokens.Add(new PasswordResetTokenEntity
        {
            Id = Guid.NewGuid().ToString("N"),
            UserId = user.Id,
            TokenHash = AuthSecurity.HashToken(token),
            CreatedAt = now,
            ExpiresAt = expiresAt,
            RequestedIpAddress = metadata?.IpAddress,
            UserAgent = metadata?.UserAgent
        });
        db.SaveChanges();
        return new PasswordResetIssue(user.Email, token, expiresAt);
    }

    public AuthResult ConfirmPasswordReset(string token, string newPassword)
    {
        if (!AuthSecurity.IsValidNewPassword(newPassword))
        {
            return new AuthResult(false, null, "Invalid reset token or password.", StatusCodes.Status400BadRequest);
        }

        var tokenHash = AuthSecurity.HashToken(token);
        if (string.IsNullOrWhiteSpace(tokenHash))
        {
            return new AuthResult(false, null, "Invalid reset token or password.", StatusCodes.Status400BadRequest);
        }

        using var db = _dbFactory.CreateDbContext();
        var now = DateTimeOffset.UtcNow;
        var resetToken = db.PasswordResetTokens
            .Include(item => item.User)
            .ThenInclude(user => user!.Sessions)
            .FirstOrDefault(item => item.TokenHash == tokenHash);

        if (resetToken?.User is null || resetToken.UsedAt is not null || resetToken.ExpiresAt <= now)
        {
            return new AuthResult(false, null, "Invalid reset token or password.", StatusCodes.Status400BadRequest);
        }

        var passwordHash = AuthSecurity.CreatePasswordHash(newPassword);
        resetToken.User.PasswordHash = passwordHash.Hash;
        resetToken.User.PasswordIterations = passwordHash.Iterations;
        resetToken.User.PasswordSalt = passwordHash.Salt;
        resetToken.User.UpdatedAt = now;
        resetToken.UsedAt = now;
        foreach (var session in resetToken.User.Sessions.Where(session => session.RevokedAt is null))
        {
            session.RevokedAt = now;
            session.RevokedReason = "password-reset";
        }

        db.SaveChanges();
        return new AuthResult(true, null, null, StatusCodes.Status204NoContent);
    }

    public EmailVerificationIssue? CreateEmailVerificationCode(string userId)
    {
        using var db = _dbFactory.CreateDbContext();
        var user = db.Users.FirstOrDefault(item => item.Id == userId);
        if (user is null || user.EmailVerifiedAt is not null) return null;

        var now = DateTimeOffset.UtcNow;
        var code = AuthSecurity.CreateVerificationCode();
        user.EmailVerificationCodeHash = AuthSecurity.HashToken(code);
        user.EmailVerificationCodeExpiresAt = now.AddMinutes(_emailVerificationCodeMinutes);
        user.EmailVerificationSentAt = now;
        user.UpdatedAt = now;
        db.SaveChanges();
        return new EmailVerificationIssue(user.Email, code, user.EmailVerificationCodeExpiresAt.Value);
    }

    public AuthUserResponse? ConfirmEmailVerification(string userId, string code)
    {
        var codeHash = AuthSecurity.HashToken(code);
        using var db = _dbFactory.CreateDbContext();
        var now = DateTimeOffset.UtcNow;
        var user = db.Users.FirstOrDefault(item => item.Id == userId);
        if (user is null || user.EmailVerifiedAt is not null) return user is null ? null : ToResponse(user);
        if (string.IsNullOrWhiteSpace(codeHash) || user.EmailVerificationCodeHash != codeHash || user.EmailVerificationCodeExpiresAt <= now) return null;

        user.EmailVerifiedAt = now;
        user.EmailVerificationCodeHash = null;
        user.EmailVerificationCodeExpiresAt = null;
        user.UpdatedAt = now;
        db.SaveChanges();
        return ToResponse(user);
    }

    private static AuthResult AuthSuccess(UserEntity user, string token)
    {
        return new AuthResult(true, new AuthResponse(token, ToResponse(user)), null, StatusCodes.Status200OK);
    }

    private static AuthUserResponse ToResponse(UserEntity user)
    {
        var avatar = ToAvatarMetadata(user);
        return new AuthUserResponse(
            user.Id,
            user.Email,
            user.Name,
            FileSystemUserAvatarStorage.BuildAvatarUrl(avatar),
            avatar?.UpdatedAt,
            user.CreatedAt,
            user.UpdatedAt,
            user.EmailVerifiedAt is not null);
    }

    private static UserAvatarMetadata? ToAvatarMetadata(UserEntity user)
    {
        if (string.IsNullOrWhiteSpace(user.AvatarFileName) ||
            string.IsNullOrWhiteSpace(user.AvatarContentType) ||
            user.AvatarUpdatedAt is null)
        {
            return null;
        }

        return new UserAvatarMetadata(user.AvatarFileName, user.AvatarContentType, user.AvatarUpdatedAt.Value);
    }

    private string AddSession(UserEntity user, DateTimeOffset now, AuthRequestMetadata? metadata)
    {
        var token = AuthSecurity.CreateToken();
        user.Sessions.Add(new UserSessionEntity
        {
            CreatedAt = now,
            Id = Guid.NewGuid().ToString("N"),
            LastSeenAt = now,
            ExpiresAt = now.AddDays(_sessionLifetimeDays),
            TokenHash = AuthSecurity.HashToken(token),
            UserAgent = metadata?.UserAgent,
            DeviceName = NormalizeDeviceName(metadata?.DeviceName, metadata?.UserAgent),
            LastIpAddress = metadata?.IpAddress,
            UserId = user.Id
        });
        user.UpdatedAt = now;
        return token;
    }

    private DateTimeOffset GetEffectiveExpiresAt(UserSessionEntity session) =>
        session.ExpiresAt ?? session.CreatedAt.AddDays(_sessionLifetimeDays);

    private static bool ShouldUpdateLastSeenAt(DateTimeOffset lastSeenAt, DateTimeOffset createdAt, DateTimeOffset now)
    {
        var effectiveLastSeenAt = lastSeenAt == default ? createdAt : lastSeenAt;
        return now - effectiveLastSeenAt >= LastSeenAtWriteInterval;
    }

    private static string NormalizeEmail(string? email)
    {
        return (email ?? "").Trim().ToLowerInvariant();
    }

    private static bool IsValidEmail(string email)
    {
        return email.Contains('@') && email.Contains('.') && email.Length <= 254;
    }

    private static string? NormalizeDeviceName(string? deviceName, string? userAgent)
    {
        if (!string.IsNullOrWhiteSpace(deviceName))
        {
            return deviceName.Trim()[..Math.Min(deviceName.Trim().Length, 120)];
        }

        if (string.IsNullOrWhiteSpace(userAgent))
        {
            return null;
        }

        if (userAgent.Contains("Android", StringComparison.OrdinalIgnoreCase) ||
            userAgent.Contains("okhttp", StringComparison.OrdinalIgnoreCase))
        {
            return "Android";
        }

        if (userAgent.Contains("iPhone", StringComparison.OrdinalIgnoreCase) ||
            userAgent.Contains("iOS", StringComparison.OrdinalIgnoreCase))
        {
            return "iOS";
        }

        return "Unknown device";
    }

    private static bool NeedsDeviceNameRepair(string? deviceName) =>
        string.IsNullOrWhiteSpace(deviceName) ||
        deviceName.Equals("Unknown device", StringComparison.OrdinalIgnoreCase);
}
