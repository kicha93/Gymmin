namespace Gymmin.Api.Domain;

public static class AiCreditTransactionTypes
{
    public const string InitialGrant = "InitialGrant";
    public const string Purchase = "Purchase";
    public const string Consume = "Consume";
    public const string Refund = "Refund";
    public const string AdminAdjustment = "AdminAdjustment";
    public const string DevGrant = "DevGrant";
}

public static class AiCreditReasons
{
    public const string WorkoutCreatorPlan = "WorkoutCreatorPlan";
    public const string WorkoutCreatorRewrite = "WorkoutCreatorRewrite";
    public const string TechnicalFailureRefund = "TechnicalFailureRefund";
}

public sealed record AiCreditBalanceResponse(
    int Balance,
    int PlanCost,
    int RewriteCost);

public sealed record AiCreditTransactionResponse(
    string Id,
    int Amount,
    string Type,
    string? Reason,
    string? RelatedJobId,
    int BalanceAfter,
    DateTimeOffset CreatedAt);

public sealed record AiCreditTransactionsResponse(
    IReadOnlyList<AiCreditTransactionResponse> Transactions);

public sealed record AiCreditPackResponse(
    string ProductId,
    int Credits,
    string DisplayName,
    bool Active);

public sealed record AiCreditPacksResponse(
    IReadOnlyList<AiCreditPackResponse> Packs);

public sealed record DevGrantAiCreditsRequest(
    int Amount,
    string? Reason);

public sealed record AiCreditConsumeResult(
    bool Success,
    string? TransactionId,
    int Balance,
    string? ExistingJobId = null);

public sealed record AiCreditJobCharge(
    int Cost,
    string Reason,
    string? IdempotencyKey);

public sealed class InsufficientAiCreditsException : Exception
{
    public InsufficientAiCreditsException()
        : base("Not enough AI credits")
    {
    }
}

public sealed class InvalidAiCreditIdempotencyKeyException : Exception
{
    public InvalidAiCreditIdempotencyKeyException()
        : base("AI credit idempotency key is too long")
    {
    }
}
