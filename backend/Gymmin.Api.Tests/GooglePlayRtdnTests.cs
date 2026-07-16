using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using Gymmin.Api.Data;
using Gymmin.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Gymmin.Api.Tests;

public sealed class GooglePlayRtdnTests : IClassFixture<GymminApiFactory>
{
    private readonly GymminApiFactory _factory;

    public GooglePlayRtdnTests(GymminApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Authenticated_notification_is_idempotently_persisted_without_raw_purchase_token()
    {
        const string purchaseToken = "purchase-token-that-must-not-be-stored";
        var data = Convert.ToBase64String(Encoding.UTF8.GetBytes("""
            {"version":"1.0","packageName":"com.gymmin.app","eventTimeMillis":"1784151000000","oneTimeProductNotification":{"version":"1.0","notificationType":1,"purchaseToken":"purchase-token-that-must-not-be-stored","sku":"ai_tokens_3"}}
            """));
        var requestBody = new PubSubPushEnvelope(new PubSubPushMessage(data, "rtdn-message-1", DateTimeOffset.UtcNow), "projects/test/subscriptions/gymmin");
        using var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", "valid-pubsub-token");

        Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsJsonAsync("/api/integrations/google-play/rtdn", requestBody)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await client.PostAsJsonAsync("/api/integrations/google-play/rtdn", requestBody)).StatusCode);

        var dbFactory = _factory.Services.GetRequiredService<IDbContextFactory<GymminDbContext>>();
        await using var db = await dbFactory.CreateDbContextAsync();
        var stored = Assert.Single(await db.GooglePlayRtdnEvents.Where(item => item.MessageId == "rtdn-message-1").ToListAsync());
        Assert.Equal("unmatched", stored.ProcessingStatus);
        Assert.Equal("ai_tokens_3", stored.ProductId);
        Assert.DoesNotContain(purchaseToken, System.Text.Json.JsonSerializer.Serialize(stored));
        Assert.Equal(64, stored.PurchaseTokenHash?.Length);
    }

    [Fact]
    public async Task Notification_rejects_missing_oidc_identity_and_wrong_package()
    {
        using var client = _factory.CreateClient();
        var noAuth = await client.PostAsJsonAsync("/api/integrations/google-play/rtdn", new PubSubPushEnvelope(null, null));
        Assert.Equal(HttpStatusCode.Unauthorized, noAuth.StatusCode);

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", "valid-pubsub-token");
        var data = Convert.ToBase64String(Encoding.UTF8.GetBytes("{\"packageName\":\"attacker.app\",\"eventTimeMillis\":\"1\",\"testNotification\":{\"version\":\"1.0\"}}"));
        var wrongPackage = await client.PostAsJsonAsync("/api/integrations/google-play/rtdn", new PubSubPushEnvelope(new PubSubPushMessage(data, "wrong-package", null), null));
        Assert.Equal(HttpStatusCode.BadRequest, wrongPackage.StatusCode);
    }
}
