namespace Gymmin.Api.Domain;

public sealed record FavoriteExercise(
    string ExerciseId,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    DateTimeOffset? DeletedAt);

public sealed record FavoriteExercisesResponse(
    IReadOnlyList<FavoriteExercise> Favorites,
    DateTimeOffset ServerTime);

public sealed record PutFavoriteExercisesRequest(
    IReadOnlyList<FavoriteExercise> Favorites,
    DateTimeOffset? ClientUpdatedAt);

public sealed record SyncFavoriteExercisesRequest(
    DateTimeOffset? LastPulledAt,
    IReadOnlyList<FavoriteExercise> Favorites,
    IReadOnlyList<string> DeletedExerciseIds);
