namespace Gymmin.Api.Domain;

public sealed record Workout(
    Guid Id,
    string UserId,
    string ClientWorkoutId,
    string Name,
    string Notes,
    SportType Sport,
    IReadOnlyList<WorkoutStep> Steps,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    DateTimeOffset? DeletedAt)
{
    public static Workout FromRequest(string userId, UpsertWorkoutRequest request, Workout? existing = null)
    {
        var now = DateTimeOffset.UtcNow;

        return new Workout(
            existing?.Id ?? Guid.NewGuid(),
            userId.Trim(),
            NormalizeRequired(request.ClientWorkoutId, "workout"),
            NormalizeText(request.Name, "Nowy trening"),
            NormalizeText(request.Notes, string.Empty),
            request.Sport,
            WorkoutStep.FromRequests(request.Steps, existing?.Steps),
            existing?.CreatedAt ?? now,
            now,
            null);
    }

    public Workout MarkDeleted()
    {
        return this with
        {
            DeletedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
    }

    internal static string NormalizeText(string? value, string fallback)
    {
        var normalized = value?.Trim();
        return string.IsNullOrWhiteSpace(normalized) ? fallback : normalized;
    }

    internal static string NormalizeRequired(string? value, string fallbackPrefix)
    {
        var normalized = value?.Trim();
        return string.IsNullOrWhiteSpace(normalized)
            ? $"{fallbackPrefix}-{Guid.NewGuid():N}"
            : normalized;
    }
}

public sealed record WorkoutStep(
    Guid Id,
    string ClientStepId,
    WorkoutStepKind Kind,
    string Label,
    string ExerciseName,
    string LoadKg,
    string ParentStageClientId,
    string ParentSetClientId,
    StageType? StageType,
    GoalType? GoalType,
    TargetComparator? TargetComparator,
    string TargetValue,
    string RestSeconds,
    string SetCount,
    string Notes)
{
    public static IReadOnlyList<WorkoutStep> FromRequests(
        IReadOnlyList<UpsertWorkoutStepRequest> requests,
        IReadOnlyList<WorkoutStep>? existingSteps = null)
    {
        var normalized = new List<WorkoutStep>();
        var existingByClientStepId = (existingSteps ?? [])
            .Where(step => !string.IsNullOrWhiteSpace(step.ClientStepId))
            .GroupBy(step => step.ClientStepId, StringComparer.Ordinal)
            .ToDictionary(group => group.Key, group => group.First(), StringComparer.Ordinal);

        foreach (var request in requests)
        {
            var step = FromRequest(request);
            if (
                string.IsNullOrWhiteSpace(step.RestSeconds) &&
                existingByClientStepId.TryGetValue(step.ClientStepId, out var existingStep) &&
                ParseDurationSeconds(existingStep.RestSeconds) is not null)
            {
                step = step with { RestSeconds = existingStep.RestSeconds };
            }
            var legacyRestSeconds = step.Kind == WorkoutStepKind.Exercise &&
                                    step.StageType == global::Gymmin.Api.Domain.StageType.Rest
                ? ParseDurationSeconds(step.TargetValue)
                : null;
            var previousIndex = legacyRestSeconds is null || string.IsNullOrWhiteSpace(step.ParentSetClientId)
                ? -1
                : normalized.FindLastIndex(candidate =>
                    candidate.Kind == WorkoutStepKind.Exercise &&
                    candidate.StageType != global::Gymmin.Api.Domain.StageType.Rest &&
                    candidate.ParentSetClientId == step.ParentSetClientId);

            if (previousIndex >= 0)
            {
                var previous = normalized[previousIndex];
                var existingRestSeconds = ParseDurationSeconds(previous.RestSeconds);
                if (existingRestSeconds is null || existingRestSeconds == legacyRestSeconds)
                {
                    normalized[previousIndex] = previous with
                    {
                        RestSeconds = existingRestSeconds is null
                            ? legacyRestSeconds.GetValueOrDefault().ToString()
                            : previous.RestSeconds
                    };
                    continue;
                }
            }

            normalized.Add(step);
        }

        return normalized;
    }

    public static WorkoutStep FromRequest(UpsertWorkoutStepRequest request)
    {
        return new WorkoutStep(
            Guid.NewGuid(),
            Workout.NormalizeRequired(request.ClientStepId, "step"),
            request.Kind,
            Workout.NormalizeText(request.Label, string.Empty),
            Workout.NormalizeText(request.ExerciseName, string.Empty),
            Workout.NormalizeText(request.LoadKg, string.Empty),
            Workout.NormalizeText(request.ParentStageClientId, string.Empty),
            Workout.NormalizeText(request.ParentSetClientId, string.Empty),
            request.StageType,
            request.GoalType,
            request.TargetComparator,
            Workout.NormalizeText(request.TargetValue, string.Empty),
            Workout.NormalizeText(request.RestSeconds, string.Empty),
            Workout.NormalizeText(request.SetCount, string.Empty),
            Workout.NormalizeText(request.Notes, string.Empty));
    }

    private static int? ParseDurationSeconds(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        if (int.TryParse(value, out var seconds) && seconds > 0)
        {
            return seconds;
        }

        return TimeSpan.TryParse(value, System.Globalization.CultureInfo.InvariantCulture, out var duration) &&
               duration > TimeSpan.Zero &&
               duration.TotalSeconds <= 359_999
            ? (int)Math.Round(duration.TotalSeconds)
            : null;
    }
}

public sealed record UpsertWorkoutRequest(
    string ClientWorkoutId,
    string Name,
    string? Notes,
    SportType Sport,
    IReadOnlyList<UpsertWorkoutStepRequest> Steps,
    DateTimeOffset? ClientUpdatedAt);

public sealed record UpsertWorkoutStepRequest(
    string ClientStepId,
    WorkoutStepKind Kind,
    string? Label,
    string? ExerciseName,
    string? LoadKg,
    string? ParentStageClientId,
    string? ParentSetClientId,
    StageType? StageType,
    GoalType? GoalType,
    TargetComparator? TargetComparator,
    string? TargetValue,
    string? RestSeconds,
    string? SetCount,
    string? Notes);

public sealed record SyncWorkoutsRequest(
    IReadOnlyList<UpsertWorkoutRequest> Workouts,
    IReadOnlyList<string> DeletedClientWorkoutIds,
    DateTimeOffset? LastPulledAt);

public sealed record SyncWorkoutsResponse(
    IReadOnlyList<Workout> Workouts,
    DateTimeOffset ServerTime);

public enum SportType
{
    Strength
}

public enum WorkoutStepKind
{
    Stage,
    Set,
    Exercise
}

public enum StageType
{
    Warmup,
    Exercise,
    Recovery,
    Rest,
    Cooldown,
    Other
}

public enum GoalType
{
    Repetitions,
    Time,
    ButtonPress,
    Calories,
    HeartRate
}

public enum TargetComparator
{
    Below,
    Above
}
