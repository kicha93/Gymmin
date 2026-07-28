using System.Text.Json;

namespace Gymmin.Api.Domain;

public sealed record WorkoutCreatorQuestionAnswer(
    string Question,
    string Answer);

public sealed record CreateWorkoutPlanRequest(
    IReadOnlyList<WorkoutCreatorQuestionAnswer> QuestionsAndAnswers,
    string? Language,
    string? ProfileId,
    bool SensitiveDataConsent = false);

public sealed record CreateWorkoutRewriteRequest(
    string? Language,
    JsonElement Workout,
    string Instruction,
    WorkoutRewritePreferences? Preferences);

public sealed record WorkoutRewritePreferences(
    bool CatalogOnly);

public sealed record CreateWorkoutPlanResponse(
    string Status,
    string Prompt,
    string? PlanText,
    string Model,
    string ReasoningEffort);

public sealed record CreateWorkoutPlanJobResponse(
    string Status,
    string JobId);

public sealed record WorkoutPlanJobStatusResponse(
    string Status,
    CreateWorkoutPlanResponse? Result,
    string? Error);
