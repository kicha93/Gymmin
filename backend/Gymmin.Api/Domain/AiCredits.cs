namespace Gymmin.Api.Domain;

public static class AiCreditTransactionTypes
{
    public const string InitialGrant = "InitialGrant";
    public const string Purchase = "Purchase";
    public const string Consume = "Consume";
    public const string Refund = "Refund";
    public const string AdminAdjustment = "AdminAdjustment";
    public const string PurchaseClawback = "PurchaseClawback";
    public const string DevGrant = "DevGrant";
}

public static class AiCreditReasons
{
    public const string WorkoutCreatorPlan = "WorkoutCreatorPlan";
    public const string WorkoutCreatorRewrite = "WorkoutCreatorRewrite";
    public const string TechnicalFailureRefund = "TechnicalFailureRefund";
    public const string GooglePlayPurchase = "GooglePlayPurchase";
    public const string GooglePlayVoidedPurchase = "GooglePlayVoidedPurchase";
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

public sealed record VerifyGooglePlayPurchaseRequest(
    string? ProductId,
    string? PurchaseToken,
    string? OrderId);

public sealed record VerifyGooglePlayPurchaseResponse(
    string Status,
    int CreditsAdded,
    int Balance,
    string? TransactionId,
    string PurchaseId);

public sealed record AiCreditPurchaseResponse(
    string Id,
    string Platform,
    string ProductId,
    int Credits,
    string ProcessStatus,
    string? GoogleOrderId,
    DateTimeOffset CreatedAt);

public sealed record AiCreditPurchasesResponse(
    IReadOnlyList<AiCreditPurchaseResponse> Purchases);

public sealed record AiCreditConsumeResult(
    bool Success,
    string? TransactionId,
    int Balance,
    string? ExistingJobId = null);

public sealed record AiCreditPurchaseCreditResult(
    int Balance,
    string TransactionId);

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

public static class AiCreditPurchasePlatforms
{
    public const string AndroidGooglePlay = "AndroidGooglePlay";
}

public static class AiCreditPurchaseStatuses
{
    public const string Received = "Received";
    public const string Verified = "Verified";
    public const string Credited = "Credited";
    public const string Consumed = "Consumed";
    public const string Failed = "Failed";
    public const string Duplicate = "Duplicate";
    public const string Voided = "Voided";
}

public static class GooglePlayPurchaseStates
{
    public const string Purchased = "Purchased";
    public const string Pending = "Pending";
    public const string Canceled = "Canceled";
    public const string Unknown = "Unknown";
}
