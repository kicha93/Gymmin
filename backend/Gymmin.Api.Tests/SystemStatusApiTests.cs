using System.Net;
using System.Net.Http.Json;
using Gymmin.Api.Domain;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;

namespace Gymmin.Api.Tests;

public sealed class SystemStatusApiTests : IClassFixture<GymminApiFactory>
{
    private readonly GymminApiFactory _factory;

    public SystemStatusApiTests(GymminApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task System_status_is_public_and_ok_by_default()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/system/status");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<SystemStatusResponse>();
        Assert.Equal(SystemStatusKinds.Ok, body!.Kind);
        Assert.Null(body.Message);
        Assert.True(body.UpdatedAt > DateTimeOffset.MinValue);
    }

    [Theory]
    [InlineData("maintenance")]
    [InlineData("update")]
    [InlineData("degraded")]
    public async Task System_status_uses_configured_kind(string kind)
    {
        using var factory = CreateFactoryWithStatus(kind);
        using var client = factory.CreateClient();

        var body = await client.GetFromJsonAsync<SystemStatusResponse>("/api/system/status");

        Assert.Equal(kind, body!.Kind);
    }

    [Fact]
    public async Task System_status_falls_back_to_ok_for_invalid_configuration()
    {
        using var factory = CreateFactoryWithStatus("broken");
        using var client = factory.CreateClient();

        var body = await client.GetFromJsonAsync<SystemStatusResponse>("/api/system/status");

        Assert.Equal(SystemStatusKinds.Ok, body!.Kind);
    }

    [Fact]
    public async Task System_status_returns_custom_localized_message_when_configured()
    {
        using var factory = CreateFactoryWithStatus(
            "maintenance",
            new Dictionary<string, string?>
            {
                ["SystemStatus:MessagePl"] = "Przerwa potrwa kilka minut.",
                ["SystemStatus:MessageEn"] = "Maintenance should take a few minutes."
            });
        using var client = factory.CreateClient();

        var body = await client.GetFromJsonAsync<SystemStatusResponse>("/api/system/status");

        Assert.Equal(SystemStatusKinds.Maintenance, body!.Kind);
        Assert.Equal("Przerwa potrwa kilka minut.", body.Message!.Pl);
        Assert.Equal("Maintenance should take a few minutes.", body.Message.En);
    }

    private WebApplicationFactory<Program> CreateFactoryWithStatus(string kind, Dictionary<string, string?>? extra = null)
    {
        var values = new Dictionary<string, string?>
        {
            ["SystemStatus:Kind"] = kind
        };

        if (extra is not null)
        {
            foreach (var item in extra)
            {
                values[item.Key] = item.Value;
            }
        }

        return _factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((_, config) =>
            {
                config.AddInMemoryCollection(values);
            });
        });
    }
}
