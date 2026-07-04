namespace Gymmin.Api.Domain;

public sealed record UserAchievementDto(
    string AchievementId,
    DateTimeOffset UnlockedAt,
    double? ProgressAtUnlock,
    DateTimeOffset? UpdatedAt);

public sealed record AppUsageStatsDto(
    long TotalForegroundSeconds,
    DateTimeOffset UpdatedAt);

public sealed record AchievementsResponse(
    IReadOnlyList<UserAchievementDto> Unlocked,
    AppUsageStatsDto AppUsageStats,
    DateTimeOffset ServerTime);

public sealed record SyncAchievementsRequest(
    IReadOnlyList<UserAchievementDto>? Unlocked,
    AppUsageStatsDto? AppUsageStats,
    DateTimeOffset? LastPulledAt);
