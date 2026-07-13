using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Gymmin.Api.Domain;

namespace Gymmin.Api.Services;

public interface IUserStore
{
    AuthResult Register(RegisterRequest request, AuthRequestMetadata? metadata = null);
    AuthResult Login(LoginRequest request, AuthRequestMetadata? metadata = null);
    AuthSessionContext? GetSessionByToken(string token);
    AuthUserResponse? GetUserByToken(string token);
    UserAvatarMetadata? GetAvatarMetadata(string userId);
    bool UpdateAvatar(string userId, string fileName, string contentType, DateTimeOffset updatedAt);
    bool ClearAvatar(string userId);
    void RevokeSession(string token);
    IReadOnlyList<AuthSessionResponse> ListSessions(string userId, string? currentSessionId);
    bool UpdateSessionMetadata(string userId, string sessionId, AuthRequestMetadata metadata);
    bool RevokeSession(string userId, string sessionId, string reason);
    void RevokeAllSessions(string userId, string reason, string? exceptSessionId = null);
    AuthResult ChangePassword(string userId, string currentPassword, string newPassword, string? currentSessionId);
    PasswordResetIssue? CreatePasswordResetToken(string email, AuthRequestMetadata? metadata = null);
    AuthResult ConfirmPasswordReset(string token, string newPassword);
}

public sealed record AuthResult(
    bool Success,
    AuthResponse? Response,
    string? Error,
    int StatusCode);

public sealed record AuthRequestMetadata(
    string? UserAgent,
    string? DeviceName,
    string? IpAddress);

public sealed record AuthSessionContext(
    AuthUserResponse User,
    string SessionId);

public sealed record PasswordResetIssue(
    string Email,
    string Token,
    DateTimeOffset ExpiresAt);

internal static class AuthSecurity
{
    public const int PasswordHashIterations = 120_000;
    private const int SaltSize = 16;
    private const int HashSize = 32;

    public static bool IsValidNewPassword(string? password) =>
        !string.IsNullOrWhiteSpace(password) && password.Length >= 8 && password.Length <= 200;

    public static PersistedPassword CreatePasswordHash(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltSize);
        var hash = Rfc2898DeriveBytes.Pbkdf2(
            password,
            salt,
            PasswordHashIterations,
            HashAlgorithmName.SHA256,
            HashSize);

        return new PersistedPassword(
            Convert.ToBase64String(hash),
            PasswordHashIterations,
            Convert.ToBase64String(salt));
    }

    public static bool VerifyPassword(string password, PersistedPassword persistedPassword)
    {
        try
        {
            var salt = Convert.FromBase64String(persistedPassword.Salt);
            var expectedHash = Convert.FromBase64String(persistedPassword.Hash);
            var actualHash = Rfc2898DeriveBytes.Pbkdf2(
                password,
                salt,
                persistedPassword.Iterations,
                HashAlgorithmName.SHA256,
                expectedHash.Length);

            return CryptographicOperations.FixedTimeEquals(actualHash, expectedHash);
        }
        catch
        {
            return false;
        }
    }

    public static string CreateToken()
    {
        return Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .Replace("+", "-")
            .Replace("/", "_")
            .TrimEnd('=');
    }

    public static string HashToken(string? token)
    {
        var normalized = token?.Trim() ?? "";

        if (string.IsNullOrWhiteSpace(normalized))
        {
            return "";
        }

        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(normalized));
        return Convert.ToBase64String(bytes);
    }
}

public sealed record PersistedPassword(
    string Hash,
    int Iterations,
    string Salt);

public sealed class FileBackedUserStore : IUserStore, IUserScopedDataStore
{
    private static readonly TimeSpan LastSeenAtWriteInterval = TimeSpan.FromMinutes(5);
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true
    };

    private readonly ConcurrentDictionary<string, PersistedUser> _usersById = new();
    private readonly ConcurrentDictionary<string, string> _userIdsByEmail = new();
    private readonly List<PersistedPasswordResetToken> _passwordResetTokens = [];
    private readonly object _fileLock = new();
    private readonly int _sessionLifetimeDays;
    private readonly int _resetTokenMinutes;
    private readonly string _storagePath;
    private readonly string _resetTokensPath;
    private readonly ILogger<FileBackedUserStore> _logger;

    public FileBackedUserStore(IWebHostEnvironment environment, IConfiguration configuration, ILogger<FileBackedUserStore> logger)
    {
        _logger = logger;
        _sessionLifetimeDays = Math.Clamp(configuration.GetValue("Gymmin:Auth:SessionLifetimeDays", 30), 1, 365);
        _resetTokenMinutes = Math.Clamp(configuration.GetValue("Gymmin:Auth:PasswordResetTokenMinutes", 30), 5, 240);
        _storagePath = Path.Combine(environment.ContentRootPath, "App_Data", "users.json");
        _resetTokensPath = Path.Combine(environment.ContentRootPath, "App_Data", "password-reset-tokens.json");
        LoadUsers();
        LoadPasswordResetTokens();
    }

    public AuthResult Register(RegisterRequest request, AuthRequestMetadata? metadata = null)
    {
        var email = NormalizeEmail(request.Email);
        var name = request.Name?.Trim() ?? "";
        var password = request.Password ?? "";

        if (!IsValidEmail(email) || password.Length < 4 || string.IsNullOrWhiteSpace(name))
        {
            return new AuthResult(false, null, "Invalid registration data.", StatusCodes.Status400BadRequest);
        }

        lock (_fileLock)
        {
            if (_userIdsByEmail.ContainsKey(email))
            {
                return new AuthResult(false, null, "Account with this email already exists.", StatusCodes.Status409Conflict);
            }

            var now = DateTimeOffset.UtcNow;
            var user = new PersistedUser
            {
                CreatedAt = now,
                Email = email,
                Id = Guid.NewGuid().ToString("N"),
                Name = name,
                Password = AuthSecurity.CreatePasswordHash(password),
                Sessions = [],
                UpdatedAt = now
            };

            var token = AddSession(user, now, metadata);
            _usersById[user.Id] = user;
            _userIdsByEmail[email] = user.Id;
            SaveUsers();

            return AuthSuccess(user, token);
        }
    }

    public AuthResult Login(LoginRequest request, AuthRequestMetadata? metadata = null)
    {
        var email = NormalizeEmail(request.Email);
        var password = request.Password ?? "";

        if (!IsValidEmail(email) || password.Length < 4)
        {
            return new AuthResult(false, null, "Invalid email or password.", StatusCodes.Status401Unauthorized);
        }

        lock (_fileLock)
        {
            if (!_userIdsByEmail.TryGetValue(email, out var userId) ||
                !_usersById.TryGetValue(userId, out var user) ||
                !AuthSecurity.VerifyPassword(password, user.Password))
            {
                return new AuthResult(false, null, "Invalid email or password.", StatusCodes.Status401Unauthorized);
            }

            var token = AddSession(user, DateTimeOffset.UtcNow, metadata);
            _usersById[user.Id] = user;
            SaveUsers();

            return AuthSuccess(user, token);
        }
    }

    public AuthSessionContext? GetSessionByToken(string token)
    {
        var tokenHash = AuthSecurity.HashToken(token);

        if (string.IsNullOrWhiteSpace(tokenHash))
        {
            return null;
        }

        lock (_fileLock)
        {
            foreach (var user in _usersById.Values)
            {
                var now = DateTimeOffset.UtcNow;
                var session = user.Sessions.FirstOrDefault(item => item.TokenHash == tokenHash);
                if (session is null || !IsSessionActive(session, now))
                {
                    continue;
                }

                if (ShouldUpdateLastSeenAt(session.LastSeenAt, session.CreatedAt, now))
                {
                    session.LastSeenAt = now;
                    user.UpdatedAt = now;
                    SaveUsers();
                }

                return new AuthSessionContext(ToResponse(user), session.Id);
            }
        }

        return null;
    }

    public AuthUserResponse? GetUserByToken(string token) => GetSessionByToken(token)?.User;

    public void RevokeSession(string token)
    {
        var tokenHash = AuthSecurity.HashToken(token);

        if (string.IsNullOrWhiteSpace(tokenHash))
        {
            return;
        }

        lock (_fileLock)
        {
            var changed = false;

            foreach (var user in _usersById.Values.ToList())
            {
                var session = user.Sessions.FirstOrDefault(item => item.TokenHash == tokenHash && item.RevokedAt is null);
                if (session is null) continue;
                session.RevokedAt = DateTimeOffset.UtcNow;
                session.RevokedReason = "logout";
                user.UpdatedAt = session.RevokedAt.Value;
                changed = true;
            }

            if (changed)
            {
                SaveUsers();
            }
        }
    }

    public IReadOnlyList<AuthSessionResponse> ListSessions(string userId, string? currentSessionId)
    {
        lock (_fileLock)
        {
            if (!_usersById.TryGetValue(userId, out var user))
            {
                return [];
            }

            var now = DateTimeOffset.UtcNow;
            return user.Sessions
                .Where(session => IsSessionActive(session, now))
                .OrderByDescending(session => session.LastSeenAt)
                .Select(session => ToSessionResponse(session, currentSessionId))
                .ToList();
        }
    }

    public bool UpdateSessionMetadata(string userId, string sessionId, AuthRequestMetadata metadata)
    {
        lock (_fileLock)
        {
            if (!_usersById.TryGetValue(userId, out var user))
            {
                return false;
            }

            var session = user.Sessions.FirstOrDefault(item => item.Id == sessionId);
            var deviceName = !string.IsNullOrWhiteSpace(metadata.DeviceName)
                ? NormalizeDeviceName(metadata.DeviceName, null)
                : NeedsDeviceNameRepair(session?.DeviceName)
                    ? NormalizeDeviceName(null, metadata.UserAgent)
                    : null;
            if (session is null || string.IsNullOrWhiteSpace(deviceName))
            {
                return false;
            }

            var changed = session.DeviceName != deviceName ||
                (!string.IsNullOrWhiteSpace(metadata.UserAgent) && session.UserAgent != metadata.UserAgent) ||
                (!string.IsNullOrWhiteSpace(metadata.IpAddress) && session.LastIpAddress != metadata.IpAddress);
            if (!changed)
            {
                return true;
            }

            session.DeviceName = deviceName;
            session.UserAgent = string.IsNullOrWhiteSpace(metadata.UserAgent) ? session.UserAgent : metadata.UserAgent;
            session.LastIpAddress = string.IsNullOrWhiteSpace(metadata.IpAddress) ? session.LastIpAddress : metadata.IpAddress;
            user.UpdatedAt = DateTimeOffset.UtcNow;
            SaveUsers();
            return true;
        }
    }

    public bool RevokeSession(string userId, string sessionId, string reason)
    {
        lock (_fileLock)
        {
            if (!_usersById.TryGetValue(userId, out var user))
            {
                return false;
            }

            var session = user.Sessions.FirstOrDefault(item => item.Id == sessionId);
            if (session is null)
            {
                return false;
            }

            var now = DateTimeOffset.UtcNow;
            session.RevokedAt ??= now;
            session.RevokedReason = reason;
            user.UpdatedAt = now;
            SaveUsers();
            return true;
        }
    }

    public void RevokeAllSessions(string userId, string reason, string? exceptSessionId = null)
    {
        lock (_fileLock)
        {
            if (!_usersById.TryGetValue(userId, out var user))
            {
                return;
            }

            var now = DateTimeOffset.UtcNow;
            foreach (var session in user.Sessions.Where(session => session.Id != exceptSessionId && session.RevokedAt is null))
            {
                session.RevokedAt = now;
                session.RevokedReason = reason;
            }

            user.UpdatedAt = now;
            SaveUsers();
        }
    }

    public AuthResult ChangePassword(string userId, string currentPassword, string newPassword, string? currentSessionId)
    {
        if (!AuthSecurity.IsValidNewPassword(newPassword))
        {
            return new AuthResult(false, null, "Invalid password.", StatusCodes.Status400BadRequest);
        }

        lock (_fileLock)
        {
            if (!_usersById.TryGetValue(userId, out var user) || !AuthSecurity.VerifyPassword(currentPassword ?? "", user.Password))
            {
                return new AuthResult(false, null, "Invalid password.", StatusCodes.Status400BadRequest);
            }

            var now = DateTimeOffset.UtcNow;
            user.Password = AuthSecurity.CreatePasswordHash(newPassword);
            user.UpdatedAt = now;
            foreach (var session in user.Sessions.Where(session => session.Id != currentSessionId && session.RevokedAt is null))
            {
                session.RevokedAt = now;
                session.RevokedReason = "password-change";
            }

            SaveUsers();
            return new AuthResult(true, null, null, StatusCodes.Status204NoContent);
        }
    }

    public PasswordResetIssue? CreatePasswordResetToken(string email, AuthRequestMetadata? metadata = null)
    {
        var normalizedEmail = NormalizeEmail(email);
        lock (_fileLock)
        {
            if (!_userIdsByEmail.TryGetValue(normalizedEmail, out var userId) || !_usersById.ContainsKey(userId))
            {
                return null;
            }

            var now = DateTimeOffset.UtcNow;
            var token = AuthSecurity.CreateToken();
            _passwordResetTokens.Add(new PersistedPasswordResetToken
            {
                Id = Guid.NewGuid().ToString("N"),
                UserId = userId,
                TokenHash = AuthSecurity.HashToken(token),
                CreatedAt = now,
                ExpiresAt = now.AddMinutes(_resetTokenMinutes),
                RequestedIpAddress = metadata?.IpAddress,
                UserAgent = metadata?.UserAgent
            });
            SavePasswordResetTokens();
            return new PasswordResetIssue(normalizedEmail, token, now.AddMinutes(_resetTokenMinutes));
        }
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

        lock (_fileLock)
        {
            var now = DateTimeOffset.UtcNow;
            var resetToken = _passwordResetTokens.FirstOrDefault(item => item.TokenHash == tokenHash);
            if (resetToken is null || resetToken.UsedAt is not null || resetToken.ExpiresAt <= now ||
                !_usersById.TryGetValue(resetToken.UserId, out var user))
            {
                return new AuthResult(false, null, "Invalid reset token or password.", StatusCodes.Status400BadRequest);
            }

            user.Password = AuthSecurity.CreatePasswordHash(newPassword);
            user.UpdatedAt = now;
            resetToken.UsedAt = now;
            foreach (var session in user.Sessions.Where(session => session.RevokedAt is null))
            {
                session.RevokedAt = now;
                session.RevokedReason = "password-reset";
            }

            SaveUsers();
            SavePasswordResetTokens();
            return new AuthResult(true, null, null, StatusCodes.Status204NoContent);
        }
    }

    public bool DeleteUserData(string userId)
    {
        lock (_fileLock)
        {
            if (!_usersById.TryRemove(userId, out var user))
            {
                return false;
            }

            _userIdsByEmail.TryRemove(user.Email, out _);
            _passwordResetTokens.RemoveAll(token => token.UserId == userId);
            SaveUsers();
            SavePasswordResetTokens();
            return true;
        }
    }

    private static AuthResult AuthSuccess(PersistedUser user, string token)
    {
        return new AuthResult(true, new AuthResponse(token, ToResponse(user)), null, StatusCodes.Status200OK);
    }

    private static AuthUserResponse ToResponse(PersistedUser user)
    {
        var avatar = ToAvatarMetadata(user);
        return new AuthUserResponse(
            user.Id,
            user.Email,
            user.Name,
            FileSystemUserAvatarStorage.BuildAvatarUrl(avatar),
            avatar?.UpdatedAt,
            user.CreatedAt,
            user.UpdatedAt);
    }

    public UserAvatarMetadata? GetAvatarMetadata(string userId)
    {
        lock (_fileLock)
        {
            return _usersById.TryGetValue(userId, out var user) ? ToAvatarMetadata(user) : null;
        }
    }

    public bool UpdateAvatar(string userId, string fileName, string contentType, DateTimeOffset updatedAt)
    {
        lock (_fileLock)
        {
            if (!_usersById.TryGetValue(userId, out var user))
            {
                return false;
            }

            user.AvatarFileName = fileName;
            user.AvatarContentType = contentType;
            user.AvatarUpdatedAt = updatedAt;
            user.UpdatedAt = updatedAt;
            SaveUsers();
            return true;
        }
    }

    public bool ClearAvatar(string userId)
    {
        lock (_fileLock)
        {
            if (!_usersById.TryGetValue(userId, out var user))
            {
                return false;
            }

            var now = DateTimeOffset.UtcNow;
            user.AvatarFileName = null;
            user.AvatarContentType = null;
            user.AvatarUpdatedAt = null;
            user.UpdatedAt = now;
            SaveUsers();
            return true;
        }
    }

    private static UserAvatarMetadata? ToAvatarMetadata(PersistedUser user)
    {
        if (string.IsNullOrWhiteSpace(user.AvatarFileName) ||
            string.IsNullOrWhiteSpace(user.AvatarContentType) ||
            user.AvatarUpdatedAt is null)
        {
            return null;
        }

        return new UserAvatarMetadata(user.AvatarFileName, user.AvatarContentType, user.AvatarUpdatedAt.Value);
    }

    private string AddSession(PersistedUser user, DateTimeOffset now, AuthRequestMetadata? metadata)
    {
        var token = AuthSecurity.CreateToken();
        var session = new PersistedUserSession
        {
            Id = Guid.NewGuid().ToString("N"),
            TokenHash = AuthSecurity.HashToken(token),
            CreatedAt = now,
            LastSeenAt = now,
            ExpiresAt = now.AddDays(_sessionLifetimeDays),
            UserAgent = metadata?.UserAgent,
            DeviceName = NormalizeDeviceName(metadata?.DeviceName, metadata?.UserAgent),
            LastIpAddress = metadata?.IpAddress
        };
        user.Sessions.Add(session);
        user.UpdatedAt = now;
        return token;
    }

    private static string NormalizeEmail(string? email)
    {
        return (email ?? "").Trim().ToLowerInvariant();
    }

    private static bool IsValidEmail(string email)
    {
        return email.Contains('@') && email.Contains('.') && email.Length <= 254;
    }

    private DateTimeOffset GetEffectiveExpiresAt(PersistedUserSession session) =>
        session.ExpiresAt ?? session.CreatedAt.AddDays(_sessionLifetimeDays);

    private bool IsSessionActive(PersistedUserSession session, DateTimeOffset now) =>
        session.RevokedAt is null && GetEffectiveExpiresAt(session) > now;

    private static bool ShouldUpdateLastSeenAt(DateTimeOffset lastSeenAt, DateTimeOffset createdAt, DateTimeOffset now)
    {
        var effectiveLastSeenAt = lastSeenAt == default ? createdAt : lastSeenAt;
        return now - effectiveLastSeenAt >= LastSeenAtWriteInterval;
    }

    private AuthSessionResponse ToSessionResponse(PersistedUserSession session, string? currentSessionId) =>
        new(
            session.Id,
            session.CreatedAt,
            session.LastSeenAt == default ? session.CreatedAt : session.LastSeenAt,
            GetEffectiveExpiresAt(session),
            session.DeviceName,
            session.Id == currentSessionId);

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

    private void LoadUsers()
    {
        try
        {
            if (!File.Exists(_storagePath))
            {
                return;
            }

            var json = File.ReadAllText(_storagePath);
            var users = JsonSerializer.Deserialize<List<PersistedUser>>(json, JsonOptions);

            if (users is null)
            {
                return;
            }

            foreach (var user in users.Where(user => !string.IsNullOrWhiteSpace(user.Id)))
            {
                _usersById[user.Id] = user;
                _userIdsByEmail[user.Email] = user.Id;
                foreach (var session in user.Sessions.Where(session => string.IsNullOrWhiteSpace(session.Id)))
                {
                    session.Id = Guid.NewGuid().ToString("N");
                    if (session.LastSeenAt == default)
                    {
                        session.LastSeenAt = session.CreatedAt;
                    }
                }
            }
        }
        catch (Exception error)
        {
            _logger.LogError(error, "Failed to load users from {StoragePath}.", _storagePath);
        }
    }

    private void LoadPasswordResetTokens()
    {
        try
        {
            if (!File.Exists(_resetTokensPath))
            {
                return;
            }

            var json = File.ReadAllText(_resetTokensPath);
            var tokens = JsonSerializer.Deserialize<List<PersistedPasswordResetToken>>(json, JsonOptions);
            if (tokens is not null)
            {
                _passwordResetTokens.AddRange(tokens.Where(token => !string.IsNullOrWhiteSpace(token.TokenHash)));
            }
        }
        catch (Exception error)
        {
            _logger.LogError(error, "Failed to load password reset tokens from {StoragePath}.", _resetTokensPath);
        }
    }

    private void SaveUsers()
    {
        Directory.CreateDirectory(Path.GetDirectoryName(_storagePath)!);

        var users = _usersById.Values
            .OrderBy(user => user.Email)
            .ToList();
        var json = JsonSerializer.Serialize(users, JsonOptions);
        var tempPath = $"{_storagePath}.tmp";

        File.WriteAllText(tempPath, json);

        if (File.Exists(_storagePath))
        {
            File.Delete(_storagePath);
        }

        File.Move(tempPath, _storagePath);
    }

    private void SavePasswordResetTokens()
    {
        Directory.CreateDirectory(Path.GetDirectoryName(_resetTokensPath)!);
        var json = JsonSerializer.Serialize(_passwordResetTokens, JsonOptions);
        var tempPath = $"{_resetTokensPath}.tmp";
        File.WriteAllText(tempPath, json);
        if (File.Exists(_resetTokensPath))
        {
            File.Delete(_resetTokensPath);
        }
        File.Move(tempPath, _resetTokensPath);
    }

    private sealed class PersistedUserSession
    {
        public string Id { get; set; } = "";
        public string TokenHash { get; set; } = "";
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset LastSeenAt { get; set; }
        public DateTimeOffset? ExpiresAt { get; set; }
        public DateTimeOffset? RevokedAt { get; set; }
        public string? UserAgent { get; set; }
        public string? DeviceName { get; set; }
        public string? LastIpAddress { get; set; }
        public string? RevokedReason { get; set; }
    }

    private sealed class PersistedPasswordResetToken
    {
        public string Id { get; set; } = "";
        public string UserId { get; set; } = "";
        public string TokenHash { get; set; } = "";
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset ExpiresAt { get; set; }
        public DateTimeOffset? UsedAt { get; set; }
        public string? RequestedIpAddress { get; set; }
        public string? UserAgent { get; set; }
    }

    private sealed class PersistedUser
    {
        public string Id { get; set; } = "";
        public string Email { get; set; } = "";
        public string Name { get; set; } = "";
        public PersistedPassword Password { get; set; } = new("", AuthSecurity.PasswordHashIterations, "");
        public string? AvatarFileName { get; set; }
        public string? AvatarContentType { get; set; }
        public DateTimeOffset? AvatarUpdatedAt { get; set; }
        public List<PersistedUserSession> Sessions { get; set; } = [];
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset UpdatedAt { get; set; }
    }
}
