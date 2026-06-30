using Gymmin.Api.Domain;

namespace Gymmin.Api.Services;

public interface IWorkoutStore
{
    IReadOnlyList<Workout> List(string userId, bool includeDeleted = false);
    IReadOnlyList<Workout> ListChangedSince(string userId, DateTimeOffset? changedSince);
    Workout? Get(string userId, string clientWorkoutId);
    Workout Upsert(string userId, UpsertWorkoutRequest request);
    bool Delete(string userId, string clientWorkoutId);
    SyncWorkoutsResponse Sync(string userId, SyncWorkoutsRequest request);
}
