using System.Net;
using System.Net.Http.Json;
using Gymmin.Api.Data;
using Gymmin.Api.Domain;
using Gymmin.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Gymmin.Api.Tests;

public sealed class GooglePlayVoidedPurchasesTests : IClassFixture<GymminApiFactory>
{
    private readonly GymminApiFactory _factory;

    public GooglePlayVoidedPurchasesTests(GymminApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Reconciliation_claws_back_only_unused_credits_and_is_idempotent()
    {
        _factory.GooglePlayPurchaseValidator.Reset();
        using var client = _factory.CreateClient();
        var user = await TestPayloads.RegisterAsync(client, "voided-partial");
        client.Authorize(user.Token);
        const string token = "voided-partial-purchase-token";
        var purchaseResponse = await client.PostAsJsonAsync(
            "/api/ai-credits/purchases/google-play/verify",
            new VerifyGooglePlayPurchaseRequest("ai_tokens_3", token, null));
        Assert.Equal(HttpStatusCode.OK, purchaseResponse.StatusCode);

        var credits = _factory.Services.GetRequiredService<IAiCreditService>();
        Assert.True(credits.ConsumeForJob(user.User.Id, "voided-job-1", 1, AiCreditReasons.WorkoutCreatorPlan, "voided-use-1").Success);
        Assert.True(credits.ConsumeForJob(user.User.Id, "voided-job-2", 1, AiCreditReasons.WorkoutCreatorPlan, "voided-use-2").Success);
        Assert.Equal(2, credits.GetBalance(user.User.Id).Balance);

        var voidedAt = DateTimeOffset.UtcNow.AddMinutes(-1);
        _factory.GooglePlayPurchaseValidator.VoidedPurchases.Add(new GooglePlayVoidedPurchase(
            token, "GPA.voided-partial", DateTimeOffset.UtcNow.AddHours(-1), voidedAt, 2, 7, 1));
        var worker = _factory.Services.GetRequiredService<GooglePlayVoidedPurchasesWorker>();
        await worker.RunOnceAsync();
        await worker.RunOnceAsync();

        var dbFactory = _factory.Services.GetRequiredService<IDbContextFactory<GymminDbContext>>();
        await using var db = await dbFactory.CreateDbContextAsync();
        var purchase = await db.AiCreditPurchases.SingleAsync(item => item.UserId == user.User.Id && item.PurchaseTokenHash != "");
        Assert.Equal(AiCreditPurchaseStatuses.Voided, purchase.ProcessStatus);
        Assert.Equal(2, purchase.ClawbackCredits);
        Assert.Equal(1, purchase.UnrecoveredCredits);
        Assert.Equal(0, (await db.AiCreditAccounts.SingleAsync(item => item.UserId == user.User.Id)).Balance);
        var clawback = Assert.Single(await db.AiCreditTransactions
            .Where(item => item.RelatedPurchaseId == purchase.Id && item.Type == AiCreditTransactionTypes.PurchaseClawback)
            .ToListAsync());
        Assert.Equal(-2, clawback.Amount);
        var stored = Assert.Single(await db.GooglePlayVoidedPurchases.Where(item => item.PurchaseId == purchase.Id).ToListAsync());
        Assert.Equal("partial_clawback", stored.ProcessingStatus);
        Assert.DoesNotContain(token, System.Text.Json.JsonSerializer.Serialize(stored));
    }

    [Fact]
    public async Task Token_seen_as_voided_before_mobile_verification_cannot_grant_credits()
    {
        _factory.GooglePlayPurchaseValidator.Reset();
        const string token = "voided-before-verification-token";
        _factory.GooglePlayPurchaseValidator.VoidedPurchases.Add(new GooglePlayVoidedPurchase(
            token, "GPA.voided-before", DateTimeOffset.UtcNow.AddHours(-2), DateTimeOffset.UtcNow.AddMinutes(-2), 2, 7, 1));
        await _factory.Services.GetRequiredService<GooglePlayVoidedPurchasesWorker>().RunOnceAsync();

        using var client = _factory.CreateClient();
        var user = await TestPayloads.RegisterAsync(client, "voided-before");
        client.Authorize(user.Token);
        var response = await client.PostAsJsonAsync(
            "/api/ai-credits/purchases/google-play/verify",
            new VerifyGooglePlayPurchaseRequest("ai_tokens_3", token, null));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal(1, _factory.Services.GetRequiredService<IAiCreditService>().GetBalance(user.User.Id).Balance);
    }
}
