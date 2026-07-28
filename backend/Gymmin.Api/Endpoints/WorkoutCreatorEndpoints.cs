using System.Text.Json;
using Gymmin.Api.Domain;
using Gymmin.Api.Services;

namespace Gymmin.Api.Endpoints;

internal static class WorkoutCreatorEndpoints
{
    public static void MapWorkoutCreatorEndpoints(this WebApplication app)
    {
        app.MapPost("/api/workout-creator/plan", (
            CreateWorkoutPlanRequest body,
            HttpRequest request,
            IUserStore users,
            IWorkoutPlanJobStore jobs,
            IConfiguration configuration,
            AuthRateLimiter rateLimiter,
            ILogger<Program> logger) =>
        {
            var context = EndpointAuthorization.GetBearerSession(request, users);
            if (context is null)
            {
                return Results.Unauthorized();
            }

            var userId = context.User.Id;
            if (!context.User.EmailVerified)
            {
                return EmailVerificationRequired(request);
            }

            if (!CanStartJob(request, userId, rateLimiter))
            {
                return EndpointResults.RateLimited(request);
            }

            if (!body.SensitiveDataConsent)
            {
                return Results.BadRequest(new ApiErrorResponse(new ApiError(
                    "sensitive_data_consent_required",
                    "Explicit consent is required before health and lifestyle data can be sent to the AI provider.",
                    DiagnosticsContext.GetCorrelationId(request.HttpContext))));
            }

            if (body.QuestionsAndAnswers is null ||
                body.QuestionsAndAnswers.Count is 0 or > 30 ||
                body.QuestionsAndAnswers.Any(item =>
                    item is null ||
                    string.IsNullOrWhiteSpace(item.Question) ||
                    item.Question.Length > 1_000 ||
                    (item.Answer?.Length ?? 0) > 2_000))
            {
                return Results.BadRequest(new
                {
                    error = "QuestionsAndAnswers is invalid or too large."
                });
            }

            var cost = Math.Max(0, configuration.GetValue("Gymmin:AiCredits:PlanCost", 1));
            CreateWorkoutPlanJobResponse job;
            try
            {
                job = jobs.Start(
                    body,
                    userId,
                    new AiCreditJobCharge(
                        cost,
                        AiCreditReasons.WorkoutCreatorPlan,
                        EndpointRequest.GetIdempotencyKey(request)));
            }
            catch (InsufficientAiCreditsException)
            {
                return InsufficientAiCredits(request);
            }
            catch (InvalidAiCreditIdempotencyKeyException)
            {
                return InvalidIdempotencyKey(request);
            }

            logger.LogInformation(
                "Started workout creator job {JobId} for user {UserId}. JobType={JobType}",
                job.JobId,
                userId,
                "plan");
            return Results.Accepted($"/api/workout-creator/plan/{job.JobId}", job);
        });

        app.MapPost("/api/workout-creator/rewrite", (
            CreateWorkoutRewriteRequest body,
            HttpRequest request,
            IUserStore users,
            IWorkoutPlanJobStore jobs,
            IConfiguration configuration,
            AuthRateLimiter rateLimiter,
            ILogger<Program> logger) =>
        {
            var context = EndpointAuthorization.GetBearerSession(request, users);
            if (context is null)
            {
                return Results.Unauthorized();
            }

            var userId = context.User.Id;
            if (!context.User.EmailVerified)
            {
                return EmailVerificationRequired(request);
            }

            if (!CanStartJob(request, userId, rateLimiter))
            {
                return EndpointResults.RateLimited(request);
            }

            if (string.IsNullOrWhiteSpace(body.Instruction) || body.Instruction.Length > 2_000)
            {
                return Results.BadRequest(new { error = "Instruction is required." });
            }

            if (body.Workout.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null)
            {
                return Results.BadRequest(new { error = "Workout is required." });
            }

            if (body.Workout.GetRawText().Length > 100_000)
            {
                return Results.BadRequest(new { error = "Workout is too large." });
            }

            var cost = Math.Max(0, configuration.GetValue("Gymmin:AiCredits:RewriteCost", 1));
            CreateWorkoutPlanJobResponse job;
            try
            {
                job = jobs.StartRewrite(
                    body with
                    {
                        Preferences = body.Preferences ?? new WorkoutRewritePreferences(true)
                    },
                    userId,
                    new AiCreditJobCharge(
                        cost,
                        AiCreditReasons.WorkoutCreatorRewrite,
                        EndpointRequest.GetIdempotencyKey(request)));
            }
            catch (InsufficientAiCreditsException)
            {
                return InsufficientAiCredits(request);
            }
            catch (InvalidAiCreditIdempotencyKeyException)
            {
                return InvalidIdempotencyKey(request);
            }

            logger.LogInformation(
                "Started workout creator job {JobId} for user {UserId}. JobType={JobType}",
                job.JobId,
                userId,
                "rewrite");
            return Results.Accepted($"/api/workout-creator/plan/{job.JobId}", job);
        });

        MapJobStatus(app, "/api/workout-creator/plan/{jobId}");
        MapJobStatus(app, "/api/workout-creator/jobs/{jobId}");
    }

    private static void MapJobStatus(WebApplication app, string route)
    {
        app.MapGet(route, (
            string jobId,
            HttpRequest request,
            IUserStore users,
            IWorkoutPlanJobStore jobs) =>
        {
            var userId = EndpointAuthorization.GetBearerUserId(request, users);
            if (userId is null)
            {
                return Results.Unauthorized();
            }

            var job = jobs.Get(jobId, userId);
            return job is null
                ? Results.NotFound(new { error = "Workout creator job not found." })
                : Results.Ok(job);
        });
    }

    private static bool CanStartJob(
        HttpRequest request,
        string userId,
        AuthRateLimiter rateLimiter) =>
        rateLimiter.TryConsume("WorkoutCreatorUser", AuthRateLimiter.BuildKey(userId)) &&
        rateLimiter.TryConsume(
            "WorkoutCreatorIp",
            AuthRateLimiter.BuildKey(EndpointRequest.GetClientIpAddress(request)));

    private static IResult InsufficientAiCredits(HttpRequest request) =>
        Results.Json(
            new ApiErrorResponse(new ApiError(
                "insufficient_ai_credits",
                "Not enough AI credits",
                DiagnosticsContext.GetCorrelationId(request.HttpContext))),
            statusCode: StatusCodes.Status402PaymentRequired);

    private static IResult EmailVerificationRequired(HttpRequest request) =>
        Results.Json(
            new ApiErrorResponse(new ApiError(
                "email_not_verified",
                "Verify your email before using AI features.",
                DiagnosticsContext.GetCorrelationId(request.HttpContext))),
            statusCode: StatusCodes.Status403Forbidden);

    private static IResult InvalidIdempotencyKey(HttpRequest request) =>
        Results.BadRequest(new ApiErrorResponse(new ApiError(
            "invalid_idempotency_key",
            $"X-Idempotency-Key must be {EfAiCreditService.MaxIdempotencyKeyLength} characters or fewer.",
            DiagnosticsContext.GetCorrelationId(request.HttpContext))));
}
