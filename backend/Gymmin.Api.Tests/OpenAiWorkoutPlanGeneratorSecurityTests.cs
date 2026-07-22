using System.Net;
using System.Text;
using Gymmin.Api.Domain;
using Gymmin.Api.Services;
using Microsoft.Extensions.Configuration;

namespace Gymmin.Api.Tests;

public sealed class OpenAiWorkoutPlanGeneratorSecurityTests
{
    [Fact]
    public async Task Provider_error_body_is_not_exposed_in_exception()
    {
        const string sensitiveProviderBody = "provider-debug-secret";
        var handler = new StaticResponseHandler(
            HttpStatusCode.BadRequest,
            sensitiveProviderBody);
        using var httpClient = new HttpClient(handler);
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["OpenAI:ApiKey"] = "test-api-key"
            })
            .Build();
        var generator = new OpenAiWorkoutPlanGenerator(configuration, httpClient);

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => generator.CreatePlanAsync(
            new CreateWorkoutPlanRequest(
                [new WorkoutCreatorQuestionAnswer("Goal", "Strength")],
                "en",
                null),
            CancellationToken.None));

        Assert.Contains("status 400", error.Message);
        Assert.DoesNotContain(sensitiveProviderBody, error.ToString());
        Assert.DoesNotContain("test-api-key", error.ToString());
        Assert.Contains("\"max_output_tokens\":12000", handler.RequestBody);
    }

    private sealed class StaticResponseHandler(HttpStatusCode statusCode, string body) : HttpMessageHandler
    {
        public string RequestBody { get; private set; } = "";

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            RequestBody = request.Content is null
                ? ""
                : await request.Content.ReadAsStringAsync(cancellationToken);
            return new HttpResponseMessage(statusCode)
            {
                Content = new StringContent(body, Encoding.UTF8, "application/json")
            };
        }
    }
}
