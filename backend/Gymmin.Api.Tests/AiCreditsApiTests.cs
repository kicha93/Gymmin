using System.Net;
using System.Net.Http.Json;
using Gymmin.Api.Domain;
using Gymmin.Api.Services;
using Microsoft.Extensions.DependencyInjection;

namespace Gymmin.Api.Tests;

public sealed class AiCreditsApiTests : IClassFixture<GymminApiFactory>
{
    private readonly GymminApiFactory _factory;

    public AiCreditsApiTests(GymminApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Balance_initial_grant_is_idempotent_and_requires_auth()
    {
        using var client = _factory.CreateClient();

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/ai-credits/balance")).StatusCode);

        var auth = await TestPayloads.RegisterAsync(client, "ai-balance");
        client.Authorize(auth.Token);

        var first = await client.GetFromJsonAsync<AiCreditBalanceResponse>("/api/ai-credits/balance");
        var second = await client.GetFromJsonAsync<AiCreditBalanceResponse>("/api/ai-credits/balance");

        Assert.Equal(1, first!.Balance);
        Assert.Equal(1, first.PlanCost);
        Assert.Equal(1, first.RewriteCost);
        Assert.Equal(1, second!.Balance);

        var transactions = await client.GetFromJsonAsync<AiCreditTransactionsResponse>("/api/ai-credits/transactions");
        Assert.Single(transactions!.Transactions);
        Assert.Equal(AiCreditTransactionTypes.InitialGrant, transactions.Transactions[0].Type);
        Assert.Equal(1, transactions.Transactions[0].Amount);
    }

    [Fact]
    public async Task Dev_grant_adds_credits_and_validates_amount()
    {
        using var client = _factory.CreateClient();
        var auth = await TestPayloads.RegisterAsync(client, "ai-dev-grant");
        client.Authorize(auth.Token);

        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/ai-credits/dev/grant", new DevGrantAiCreditsRequest(0, "bad"))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/ai-credits/dev/grant", new DevGrantAiCreditsRequest(101, "bad"))).StatusCode);

        var response = await client.PostAsJsonAsync("/api/ai-credits/dev/grant", new DevGrantAiCreditsRequest(10, "test top-up"));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var balance = await response.Content.ReadFromJsonAsync<AiCreditBalanceResponse>();
        Assert.Equal(11, balance!.Balance);

        var transactions = await client.GetFromJsonAsync<AiCreditTransactionsResponse>("/api/ai-credits/transactions?limit=10");
        Assert.Contains(transactions!.Transactions, transaction => transaction.Type == AiCreditTransactionTypes.DevGrant && transaction.Amount == 10);
    }

    [Fact]
    public async Task Plan_and_rewrite_consume_credits_and_insufficient_balance_returns_402()
    {
        using var client = _factory.CreateClient();
        var auth = await TestPayloads.RegisterAsync(client, "ai-consume");
        client.Authorize(auth.Token);
        await GrantDevCreditsAsync(client, 2);

        var plan = await client.PostAsJsonAsync("/api/workout-creator/plan", new CreateWorkoutPlanRequest(
            [new WorkoutCreatorQuestionAnswer("Goal", "Strength")],
            "en",
            null));
        Assert.Equal(HttpStatusCode.Accepted, plan.StatusCode);

        var rewrite = await client.PostAsJsonAsync("/api/workout-creator/rewrite", new
        {
            language = "en",
            workout = new { name = "Push", steps = Array.Empty<object>() },
            instruction = "Shorten"
        });
        Assert.Equal(HttpStatusCode.Accepted, rewrite.StatusCode);

        var secondPlan = await client.PostAsJsonAsync("/api/workout-creator/plan", new CreateWorkoutPlanRequest(
            [new WorkoutCreatorQuestionAnswer("Goal", "Hypertrophy")],
            "en",
            null));
        Assert.Equal(HttpStatusCode.Accepted, secondPlan.StatusCode);

        var insufficient = await client.PostAsJsonAsync("/api/workout-creator/plan", new CreateWorkoutPlanRequest(
            [new WorkoutCreatorQuestionAnswer("Goal", "Endurance")],
            "en",
            null));
        Assert.Equal(HttpStatusCode.PaymentRequired, insufficient.StatusCode);
        var error = await insufficient.Content.ReadFromJsonAsync<ApiErrorResponse>();
        Assert.Equal("insufficient_ai_credits", error!.Error.Code);

        var balance = await client.GetFromJsonAsync<AiCreditBalanceResponse>("/api/ai-credits/balance");
        Assert.Equal(0, balance!.Balance);
    }

    [Fact]
    public async Task Idempotency_key_returns_existing_job_without_second_charge()
    {
        using var client = _factory.CreateClient();
        var auth = await TestPayloads.RegisterAsync(client, "ai-idempotent");
        client.Authorize(auth.Token);
        client.DefaultRequestHeaders.Add("X-Idempotency-Key", "same-plan-request");

        var request = new CreateWorkoutPlanRequest(
            [new WorkoutCreatorQuestionAnswer("Goal", "Strength")],
            "en",
            null);
        var first = await client.PostAsJsonAsync("/api/workout-creator/plan", request);
        var second = await client.PostAsJsonAsync("/api/workout-creator/plan", request);

        Assert.Equal(HttpStatusCode.Accepted, first.StatusCode);
        Assert.Equal(HttpStatusCode.Accepted, second.StatusCode);
        var firstJob = await first.Content.ReadFromJsonAsync<CreateWorkoutPlanJobResponse>();
        var secondJob = await second.Content.ReadFromJsonAsync<CreateWorkoutPlanJobResponse>();
        Assert.Equal(firstJob!.JobId, secondJob!.JobId);

        var balance = await client.GetFromJsonAsync<AiCreditBalanceResponse>("/api/ai-credits/balance");
        Assert.Equal(0, balance!.Balance);
    }

    [Fact]
    public async Task Parallel_ai_requests_do_not_overdraw_balance()
    {
        using var client = _factory.CreateClient();
        var auth = await TestPayloads.RegisterAsync(client, "ai-parallel");
        client.Authorize(auth.Token);
        await GrantDevCreditsAsync(client, 2);

        var request = new CreateWorkoutPlanRequest(
            [new WorkoutCreatorQuestionAnswer("Goal", "Strength")],
            "en",
            null);

        Assert.Equal(HttpStatusCode.Accepted, (await client.PostAsJsonAsync("/api/workout-creator/plan", request)).StatusCode);
        Assert.Equal(HttpStatusCode.Accepted, (await client.PostAsJsonAsync("/api/workout-creator/plan", request)).StatusCode);

        var first = client.PostAsJsonAsync("/api/workout-creator/plan", request);
        var second = client.PostAsJsonAsync("/api/workout-creator/plan", request);
        var responses = await Task.WhenAll(first, second);
        var statuses = responses.Select(response => response.StatusCode).OrderBy(status => status).ToArray();

        Assert.Contains(HttpStatusCode.Accepted, statuses);
        Assert.Contains(HttpStatusCode.PaymentRequired, statuses);
        var balance = await client.GetFromJsonAsync<AiCreditBalanceResponse>("/api/ai-credits/balance");
        Assert.Equal(0, balance!.Balance);
        var transactions = await client.GetFromJsonAsync<AiCreditTransactionsResponse>("/api/ai-credits/transactions?limit=20");
        Assert.Equal(3, transactions!.Transactions.Count(transaction => transaction.Type == AiCreditTransactionTypes.Consume));
        Assert.Equal(0, transactions.Transactions.Where(transaction => transaction.Type == AiCreditTransactionTypes.Consume).Min(transaction => transaction.BalanceAfter));
    }

    [Fact]
    public async Task Same_idempotency_key_is_scoped_per_user()
    {
        using var firstClient = _factory.CreateClient();
        using var secondClient = _factory.CreateClient();
        var firstAuth = await TestPayloads.RegisterAsync(firstClient, "ai-idempotency-user-a");
        var secondAuth = await TestPayloads.RegisterAsync(secondClient, "ai-idempotency-user-b");
        firstClient.Authorize(firstAuth.Token);
        secondClient.Authorize(secondAuth.Token);
        firstClient.DefaultRequestHeaders.Add("X-Idempotency-Key", "same-key-across-users");
        secondClient.DefaultRequestHeaders.Add("X-Idempotency-Key", "same-key-across-users");

        var request = new CreateWorkoutPlanRequest(
            [new WorkoutCreatorQuestionAnswer("Goal", "Strength")],
            "en",
            null);

        var first = await firstClient.PostAsJsonAsync("/api/workout-creator/plan", request);
        var second = await secondClient.PostAsJsonAsync("/api/workout-creator/plan", request);

        Assert.Equal(HttpStatusCode.Accepted, first.StatusCode);
        Assert.Equal(HttpStatusCode.Accepted, second.StatusCode);
        var firstBalance = await firstClient.GetFromJsonAsync<AiCreditBalanceResponse>("/api/ai-credits/balance");
        var secondBalance = await secondClient.GetFromJsonAsync<AiCreditBalanceResponse>("/api/ai-credits/balance");
        Assert.Equal(0, firstBalance!.Balance);
        Assert.Equal(0, secondBalance!.Balance);
    }

    [Fact]
    public async Task Too_long_idempotency_key_returns_bad_request_without_consuming_credit()
    {
        using var client = _factory.CreateClient();
        var auth = await TestPayloads.RegisterAsync(client, "ai-idempotency-too-long");
        client.Authorize(auth.Token);
        client.DefaultRequestHeaders.Add("X-Idempotency-Key", new string('x', EfAiCreditService.MaxIdempotencyKeyLength + 1));

        var response = await client.PostAsJsonAsync("/api/workout-creator/plan", new CreateWorkoutPlanRequest(
            [new WorkoutCreatorQuestionAnswer("Goal", "Strength")],
            "en",
            null));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var error = await response.Content.ReadFromJsonAsync<ApiErrorResponse>();
        Assert.Equal("invalid_idempotency_key", error!.Error.Code);
        var balance = await client.GetFromJsonAsync<AiCreditBalanceResponse>("/api/ai-credits/balance");
        Assert.Equal(1, balance!.Balance);
    }

    [Fact]
    public async Task Failed_generator_refunds_consumed_credit()
    {
        using var client = _factory.CreateClient();
        var auth = await TestPayloads.RegisterAsync(client, "ai-refund");
        client.Authorize(auth.Token);

        _factory.WorkoutPlanGenerator.ShouldFail = true;
        try
        {
            var start = await client.PostAsJsonAsync("/api/workout-creator/plan", new CreateWorkoutPlanRequest(
                [new WorkoutCreatorQuestionAnswer("Goal", "Strength")],
                "en",
                null));
            Assert.Equal(HttpStatusCode.Accepted, start.StatusCode);
            var job = await start.Content.ReadFromJsonAsync<CreateWorkoutPlanJobResponse>();
            var status = await WaitForJobAsync(client, $"/api/workout-creator/plan/{job!.JobId}");
            Assert.Equal(HttpStatusCode.OK, status.StatusCode);
            var statusDetails = await client.GetAsync($"/api/workout-creator/plan/{job.JobId}");
            var body = await statusDetails.Content.ReadFromJsonAsync<WorkoutPlanJobStatusResponse>();
            Assert.Equal("failed", body!.Status);

            var balance = await client.GetFromJsonAsync<AiCreditBalanceResponse>("/api/ai-credits/balance");
            Assert.Equal(1, balance!.Balance);

            var transactions = await client.GetFromJsonAsync<AiCreditTransactionsResponse>("/api/ai-credits/transactions?limit=10");
            Assert.Contains(transactions!.Transactions, transaction => transaction.Type == AiCreditTransactionTypes.Consume && transaction.Amount == -1);
            Assert.Contains(transactions.Transactions, transaction => transaction.Type == AiCreditTransactionTypes.Refund && transaction.Amount == 1);
            Assert.Single(transactions.Transactions, transaction => transaction.Type == AiCreditTransactionTypes.Refund);

            using var scope = _factory.Services.CreateScope();
            var credits = scope.ServiceProvider.GetRequiredService<IAiCreditService>();
            Assert.False(credits.RefundForJob(auth.User.Id, job.JobId, AiCreditReasons.TechnicalFailureRefund));
            var afterSecondRefundAttempt = await client.GetFromJsonAsync<AiCreditBalanceResponse>("/api/ai-credits/balance");
            Assert.Equal(1, afterSecondRefundAttempt!.Balance);
        }
        finally
        {
            _factory.WorkoutPlanGenerator.ShouldFail = false;
        }
    }

    [Fact]
    public async Task Packs_require_auth_and_return_configured_products()
    {
        using var client = _factory.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/ai-credits/packs")).StatusCode);

        var auth = await TestPayloads.RegisterAsync(client, "ai-packs");
        client.Authorize(auth.Token);

        var response = await client.GetFromJsonAsync<AiCreditPacksResponse>("/api/ai-credits/packs");
        Assert.Contains(response!.Packs, pack => pack.ProductId == "ai_tokens_1" && pack.Credits == 1);
        Assert.Contains(response.Packs, pack => pack.ProductId == "ai_tokens_3" && pack.Credits == 3);
        Assert.Contains(response.Packs, pack => pack.ProductId == "ai_tokens_10" && pack.Credits == 10);
    }

    [Fact]
    public async Task Google_play_purchase_verification_credits_account_once()
    {
        _factory.GooglePlayPurchaseValidator.Reset();
        using var client = _factory.CreateClient();
        var auth = await TestPayloads.RegisterAsync(client, "ai-google-purchase");
        client.Authorize(auth.Token);

        var response = await client.PostAsJsonAsync("/api/ai-credits/purchases/google-play/verify", new VerifyGooglePlayPurchaseRequest(
            "ai_tokens_10",
            "purchase-token-1",
            "GPA.test-order"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<VerifyGooglePlayPurchaseResponse>();
        Assert.Equal("credited", body!.Status);
        Assert.Equal(10, body.CreditsAdded);
        Assert.Equal(11, body.Balance);
        Assert.False(string.IsNullOrWhiteSpace(body.TransactionId));
        Assert.False(string.IsNullOrWhiteSpace(body.PurchaseId));

        var duplicate = await client.PostAsJsonAsync("/api/ai-credits/purchases/google-play/verify", new VerifyGooglePlayPurchaseRequest(
            "ai_tokens_10",
            "purchase-token-1",
            "GPA.test-order"));
        Assert.Equal(HttpStatusCode.OK, duplicate.StatusCode);
        var duplicateBody = await duplicate.Content.ReadFromJsonAsync<VerifyGooglePlayPurchaseResponse>();
        Assert.Equal("already_processed", duplicateBody!.Status);
        Assert.Equal(0, duplicateBody.CreditsAdded);
        Assert.Equal(11, duplicateBody.Balance);

        var transactions = await client.GetFromJsonAsync<AiCreditTransactionsResponse>("/api/ai-credits/transactions?limit=20");
        Assert.Single(transactions!.Transactions, transaction => transaction.Type == AiCreditTransactionTypes.Purchase);
        Assert.Contains(transactions.Transactions, transaction => transaction.Type == AiCreditTransactionTypes.Purchase && transaction.Amount == 10);
    }

    [Fact]
    public async Task Google_play_purchase_token_cannot_be_reused_by_another_user()
    {
        _factory.GooglePlayPurchaseValidator.Reset();
        using var firstClient = _factory.CreateClient();
        using var secondClient = _factory.CreateClient();
        var firstAuth = await TestPayloads.RegisterAsync(firstClient, "ai-google-owner-a");
        var secondAuth = await TestPayloads.RegisterAsync(secondClient, "ai-google-owner-b");
        firstClient.Authorize(firstAuth.Token);
        secondClient.Authorize(secondAuth.Token);

        var request = new VerifyGooglePlayPurchaseRequest("ai_tokens_10", "shared-purchase-token", null);
        Assert.Equal(HttpStatusCode.OK, (await firstClient.PostAsJsonAsync("/api/ai-credits/purchases/google-play/verify", request)).StatusCode);

        var conflict = await secondClient.PostAsJsonAsync("/api/ai-credits/purchases/google-play/verify", request);
        Assert.Equal(HttpStatusCode.Conflict, conflict.StatusCode);
        var error = await conflict.Content.ReadFromJsonAsync<ApiErrorResponse>();
        Assert.Equal("purchase_token_already_used", error!.Error.Code);
    }

    [Fact]
    public async Task Google_play_purchase_account_identifier_must_match_signed_in_user()
    {
        _factory.GooglePlayPurchaseValidator.Reset();
        using var client = _factory.CreateClient();
        var auth = await TestPayloads.RegisterAsync(client, "ai-google-account-id");
        client.Authorize(auth.Token);
        _factory.GooglePlayPurchaseValidator.ObfuscatedExternalAccountId =
            $"gymmin_{Guid.NewGuid():N}";

        var response = await client.PostAsJsonAsync(
            "/api/ai-credits/purchases/google-play/verify",
            new VerifyGooglePlayPurchaseRequest("ai_tokens_3", "wrong-account-token", null));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var error = await response.Content.ReadFromJsonAsync<ApiErrorResponse>();
        Assert.Equal("google_play_account_mismatch", error!.Error.Code);

        var balance = await client.GetFromJsonAsync<AiCreditBalanceResponse>("/api/ai-credits/balance");
        Assert.Equal(1, balance!.Balance);
    }

    [Fact]
    public async Task Google_play_invalid_or_pending_purchase_does_not_credit()
    {
        _factory.GooglePlayPurchaseValidator.Reset();
        _factory.GooglePlayPurchaseValidator.IsValid = false;
        _factory.GooglePlayPurchaseValidator.PurchaseState = GooglePlayPurchaseStates.Pending;
        using var client = _factory.CreateClient();
        var auth = await TestPayloads.RegisterAsync(client, "ai-google-invalid");
        client.Authorize(auth.Token);

        var response = await client.PostAsJsonAsync("/api/ai-credits/purchases/google-play/verify", new VerifyGooglePlayPurchaseRequest(
            "ai_tokens_10",
            "pending-token",
            null));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var balance = await client.GetFromJsonAsync<AiCreditBalanceResponse>("/api/ai-credits/balance");
        Assert.Equal(1, balance!.Balance);
        var transactions = await client.GetFromJsonAsync<AiCreditTransactionsResponse>("/api/ai-credits/transactions?limit=20");
        Assert.DoesNotContain(transactions!.Transactions, transaction => transaction.Type == AiCreditTransactionTypes.Purchase);
    }

    [Fact]
    public async Task Google_play_consume_failure_is_retry_safe_without_second_credit()
    {
        _factory.GooglePlayPurchaseValidator.Reset();
        _factory.GooglePlayPurchaseValidator.ConsumeShouldFail = true;
        using var client = _factory.CreateClient();
        var auth = await TestPayloads.RegisterAsync(client, "ai-google-consume-retry");
        client.Authorize(auth.Token);

        var request = new VerifyGooglePlayPurchaseRequest("ai_tokens_3", "consume-retry-token", null);
        var first = await client.PostAsJsonAsync("/api/ai-credits/purchases/google-play/verify", request);
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        var firstBody = await first.Content.ReadFromJsonAsync<VerifyGooglePlayPurchaseResponse>();
        Assert.Equal("credited_consume_pending", firstBody!.Status);

        _factory.GooglePlayPurchaseValidator.ConsumeShouldFail = false;
        var second = await client.PostAsJsonAsync("/api/ai-credits/purchases/google-play/verify", request);
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        var secondBody = await second.Content.ReadFromJsonAsync<VerifyGooglePlayPurchaseResponse>();
        Assert.Equal("already_processed", secondBody!.Status);
        Assert.Equal(0, secondBody.CreditsAdded);
        Assert.Equal(4, secondBody.Balance);
        Assert.True(_factory.GooglePlayPurchaseValidator.ConsumeCalls >= 2);

        var transactions = await client.GetFromJsonAsync<AiCreditTransactionsResponse>("/api/ai-credits/transactions?limit=20");
        Assert.Single(transactions!.Transactions, transaction => transaction.Type == AiCreditTransactionTypes.Purchase);
    }

    [Fact]
    public async Task Google_play_purchase_request_validation_and_security()
    {
        _factory.GooglePlayPurchaseValidator.Reset();
        using var client = _factory.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/ai-credits/purchases/google-play/verify", new VerifyGooglePlayPurchaseRequest("ai_tokens_10", "token", null))).StatusCode);

        var auth = await TestPayloads.RegisterAsync(client, "ai-google-validation");
        client.Authorize(auth.Token);

        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/ai-credits/purchases/google-play/verify", new VerifyGooglePlayPurchaseRequest("", "token", null))).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/ai-credits/purchases/google-play/verify", new VerifyGooglePlayPurchaseRequest("ai_tokens_missing", "token", null))).StatusCode);

        var purchase = await client.PostAsJsonAsync("/api/ai-credits/purchases/google-play/verify", new VerifyGooglePlayPurchaseRequest("ai_tokens_10", "secret-purchase-token", null));
        Assert.Equal(HttpStatusCode.OK, purchase.StatusCode);
        Assert.DoesNotContain("secret-purchase-token", await purchase.Content.ReadAsStringAsync());

        var history = await client.GetFromJsonAsync<AiCreditPurchasesResponse>("/api/ai-credits/purchases");
        Assert.Single(history!.Purchases);
        var transactionBody = await (await client.GetAsync("/api/ai-credits/transactions?limit=20")).Content.ReadAsStringAsync();
        Assert.DoesNotContain("secret-purchase-token", transactionBody);
    }

    private static async Task GrantDevCreditsAsync(HttpClient client, int amount)
    {
        var response = await client.PostAsJsonAsync("/api/ai-credits/dev/grant", new DevGrantAiCreditsRequest(amount, "test top-up"));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    private static async Task<HttpResponseMessage> WaitForJobAsync(HttpClient client, string path)
    {
        HttpResponseMessage? latest = null;

        for (var attempt = 0; attempt < 20; attempt++)
        {
            latest?.Dispose();
            latest = await client.GetAsync(path);
            if (latest.StatusCode != HttpStatusCode.OK)
            {
                return latest;
            }

            var body = await latest.Content.ReadFromJsonAsync<WorkoutPlanJobStatusResponse>();
            if (body?.Status is "completed" or "failed")
            {
                return latest;
            }

            await Task.Delay(50);
        }

        return latest ?? await client.GetAsync(path);
    }
}
