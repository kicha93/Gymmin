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
            request.Steps.Select(WorkoutStep.FromRequest).ToList(),
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
    string SetCount,
    string Notes)
{
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
            Workout.NormalizeText(request.SetCount, string.Empty),
            Workout.NormalizeText(request.Notes, string.Empty));
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
