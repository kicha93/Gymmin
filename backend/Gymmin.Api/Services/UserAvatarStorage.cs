using System.Security.Cryptography;
using Gymmin.Api.Domain;

namespace Gymmin.Api.Services;

public sealed record UserAvatarMetadata(
    string FileName,
    string ContentType,
    DateTimeOffset UpdatedAt);

public sealed record StoredUserAvatar(
    string FileName,
    string ContentType,
    DateTimeOffset UpdatedAt);

public sealed record AvatarValidationResult(
    bool IsValid,
    string? Error,
    int StatusCode);

public interface IUserAvatarStorage
{
    AvatarValidationResult Validate(IFormFile? file);
    Task<StoredUserAvatar> SaveAsync(string userId, IFormFile file, CancellationToken cancellationToken);
    string? GetPath(string userId, string fileName);
    void Delete(string userId);
}

public sealed class FileSystemUserAvatarStorage : IUserAvatarStorage
{
    public const long MaxAvatarBytes = 2 * 1024 * 1024;

    private static readonly Dictionary<string, string> ExtensionByContentType = new(StringComparer.OrdinalIgnoreCase)
    {
        ["image/jpeg"] = ".jpg",
        ["image/png"] = ".png",
        ["image/webp"] = ".webp"
    };

    private readonly string _rootPath;

    public FileSystemUserAvatarStorage(IWebHostEnvironment environment)
    {
        _rootPath = Path.Combine(environment.ContentRootPath, "App_Data", "avatars");
    }

    public AvatarValidationResult Validate(IFormFile? file)
    {
        if (file is null)
        {
            return new AvatarValidationResult(false, "Avatar file is required.", StatusCodes.Status400BadRequest);
        }

        if (file.Length <= 0)
        {
            return new AvatarValidationResult(false, "Avatar file is empty.", StatusCodes.Status400BadRequest);
        }

        if (file.Length > MaxAvatarBytes)
        {
            return new AvatarValidationResult(false, "Avatar file is too large.", StatusCodes.Status413PayloadTooLarge);
        }

        var contentType = NormalizeContentType(file.ContentType);
        if (contentType is null)
        {
            return new AvatarValidationResult(false, "Unsupported avatar content type.", StatusCodes.Status400BadRequest);
        }

        using var stream = file.OpenReadStream();
        Span<byte> header = stackalloc byte[12];
        var read = stream.Read(header);

        if (!MatchesMagicBytes(contentType, header[..read]))
        {
            return new AvatarValidationResult(false, "Avatar file content does not match its content type.", StatusCodes.Status400BadRequest);
        }

        return new AvatarValidationResult(true, null, StatusCodes.Status200OK);
    }

    public async Task<StoredUserAvatar> SaveAsync(string userId, IFormFile file, CancellationToken cancellationToken)
    {
        var contentType = NormalizeContentType(file.ContentType)
            ?? throw new InvalidOperationException("Avatar content type must be validated before save.");
        var extension = ExtensionByContentType[contentType];
        var userDirectory = GetUserDirectory(userId);
        Directory.CreateDirectory(userDirectory);

        foreach (var oldFile in Directory.EnumerateFiles(userDirectory, "avatar.*"))
        {
            File.Delete(oldFile);
        }

        var fileName = $"avatar{extension}";
        var path = Path.Combine(userDirectory, fileName);
        await using (var output = File.Create(path))
        await using (var input = file.OpenReadStream())
        {
            await input.CopyToAsync(output, cancellationToken);
        }

        return new StoredUserAvatar(fileName, contentType, DateTimeOffset.UtcNow);
    }

    public string? GetPath(string userId, string fileName)
    {
        if (string.IsNullOrWhiteSpace(fileName) || fileName.Contains(Path.DirectorySeparatorChar) || fileName.Contains(Path.AltDirectorySeparatorChar))
        {
            return null;
        }

        var path = Path.Combine(GetUserDirectory(userId), fileName);
        return File.Exists(path) ? path : null;
    }

    public void Delete(string userId)
    {
        var userDirectory = GetUserDirectory(userId);
        if (!Directory.Exists(userDirectory))
        {
            return;
        }

        foreach (var file in Directory.EnumerateFiles(userDirectory, "avatar.*"))
        {
            File.Delete(file);
        }
    }

    public static string? NormalizeContentType(string? contentType)
    {
        var normalized = (contentType ?? "").Split(';')[0].Trim().ToLowerInvariant();
        return normalized switch
        {
            "image/jpg" => "image/jpeg",
            "image/jpeg" or "image/png" or "image/webp" => normalized,
            _ => null
        };
    }

    public static string? BuildAvatarUrl(UserAvatarMetadata? avatar)
    {
        if (avatar is null)
        {
            return null;
        }

        return $"/api/profile/avatar?v={Uri.EscapeDataString(avatar.UpdatedAt.ToUnixTimeMilliseconds().ToString())}";
    }

    private static bool MatchesMagicBytes(string contentType, ReadOnlySpan<byte> header)
    {
        return contentType switch
        {
            "image/jpeg" => header.Length >= 3 && header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF,
            "image/png" => header.Length >= 8 &&
                header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47 &&
                header[4] == 0x0D && header[5] == 0x0A && header[6] == 0x1A && header[7] == 0x0A,
            "image/webp" => header.Length >= 12 &&
                header[0] == (byte)'R' && header[1] == (byte)'I' && header[2] == (byte)'F' && header[3] == (byte)'F' &&
                header[8] == (byte)'W' && header[9] == (byte)'E' && header[10] == (byte)'B' && header[11] == (byte)'P',
            _ => false
        };
    }

    private string GetUserDirectory(string userId)
    {
        var safeId = new string((userId ?? "").Where(character => char.IsLetterOrDigit(character) || character is '-' or '_').ToArray());
        if (string.IsNullOrWhiteSpace(safeId))
        {
            var hash = SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(userId ?? ""));
            safeId = Convert.ToHexString(hash).ToLowerInvariant();
        }

        return Path.Combine(_rootPath, safeId);
    }
}
