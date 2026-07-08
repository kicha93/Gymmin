namespace Gymmin.Api.Domain;

public static class SystemStatusKinds
{
    public const string Ok = "ok";
    public const string Degraded = "degraded";
    public const string Maintenance = "maintenance";
    public const string Update = "update";

    public static string Normalize(string? value)
    {
        var normalized = value?.Trim().ToLowerInvariant();
        return normalized is Degraded or Maintenance or Update ? normalized : Ok;
    }
}

public sealed record LocalizedSystemStatusMessage(
    string? Pl,
    string? En);

public sealed record SystemStatusResponse(
    string Kind,
    LocalizedSystemStatusMessage? Message,
    DateTimeOffset UpdatedAt);
