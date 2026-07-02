using Gymmin.Api.Domain;

namespace Gymmin.Api.Services;

public sealed class AiCreditsOptions
{
    public int InitialGrant { get; set; } = 3;
    public int PlanCost { get; set; } = 1;
    public int RewriteCost { get; set; } = 1;
    public bool DevGrantEnabled { get; set; } = true;
    public List<AiCreditPackOptions> Packs { get; set; } =
    [
        new AiCreditPackOptions("ai_tokens_10", 10, "10 tokenów AI", true),
        new AiCreditPackOptions("ai_tokens_30", 30, "30 tokenów AI", true),
        new AiCreditPackOptions("ai_tokens_100", 100, "100 tokenów AI", true)
    ];

    public AiCreditBalanceResponse ToBalanceResponse(int balance) =>
        new(balance, Math.Max(0, PlanCost), Math.Max(0, RewriteCost));
}

public sealed record AiCreditPackOptions(
    string ProductId,
    int Credits,
    string DisplayName,
    bool Active);

public sealed class GooglePlayOptions
{
    public bool Enabled { get; set; }
    public string PackageName { get; set; } = "";
    public string ServiceAccountJsonPath { get; set; } = "";
    public string ServiceAccountJsonBase64 { get; set; } = "";
    public bool ValidatePurchases { get; set; } = true;
    public bool ConsumePurchases { get; set; } = true;
}
