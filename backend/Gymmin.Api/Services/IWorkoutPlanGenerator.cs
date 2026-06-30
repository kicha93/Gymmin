using Gymmin.Api.Domain;

namespace Gymmin.Api.Services;

public interface IWorkoutPlanGenerator
{
    Task<CreateWorkoutPlanResponse> CreatePlanAsync(CreateWorkoutPlanRequest request, CancellationToken cancellationToken);
    Task<CreateWorkoutPlanResponse> RewritePlanAsync(CreateWorkoutRewriteRequest request, CancellationToken cancellationToken);
}
