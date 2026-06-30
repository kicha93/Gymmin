using System.Text.Json;

namespace Gymmin.Api.Domain;

public sealed record WorkoutSessionEnvelope(
    string ClientSessionId,
    string SourceWorkoutId,
    string SourceWorkoutName,
    string ExecutionMode,
    string Status,
    DateTimeOffset StartedAt,
    DateTimeOffset? FinishedAt,
    DateTimeOffset? AbandonedAt,
    DateTimeOffset ClientUpdatedAt,
    DateTimeOffset ServerUpdatedAt,
    DateTimeOffset? DeletedAt,
    JsonElement Session);

public sealed record WorkoutSessionsResponse(
    IReadOnlyList<WorkoutSessionEnvelope> Sessions,
    DateTimeOffset ServerTime);

public sealed record UpsertWorkoutSessionRequest(
    string ClientSessionId,
    JsonElement Session,
    DateTimeOffset? ClientUpdatedAt,
    DateTimeOffset? DeletedAt);

public sealed record SyncWorkoutSessionsRequest(
    DateTimeOffset? LastPulledAt,
    IReadOnlyList<UpsertWorkoutSessionRequest> Sessions,
    IReadOnlyList<string> DeletedClientSessionIds);
