using System.Reflection;
using Gymmin.Api.Services;

namespace Gymmin.Api.Tests;

public sealed class GooglePlayPurchaseValidatorTests
{
    [Fact]
    public void Raw_google_response_redacts_purchase_token_and_developer_payload()
    {
        var sanitize = typeof(GooglePlayPurchaseValidator).GetMethod(
            "SanitizeRawResponse",
            BindingFlags.NonPublic | BindingFlags.Static);

        var result = Assert.IsType<string>(sanitize!.Invoke(null,
        [
            """{"purchaseToken":"secret-token","developerPayload":"secret-payload","nested":{"purchaseToken":"nested-token"},"orderId":"GPA.123"}"""
        ]));

        Assert.DoesNotContain("secret-token", result);
        Assert.DoesNotContain("secret-payload", result);
        Assert.DoesNotContain("nested-token", result);
        Assert.Contains("GPA.123", result);
        Assert.Contains("[redacted]", result);
    }
}
