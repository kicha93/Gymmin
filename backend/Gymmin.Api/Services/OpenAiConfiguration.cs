namespace Gymmin.Api.Services;

public static class OpenAiConfiguration
{
    public static string? GetApiKey(IConfiguration configuration) => FirstNonEmpty(
        configuration["OpenAI:ApiKey"],
        configuration["OpenAi:ApiKey"],
        configuration["OPENAI_API_KEY"],
        Environment.GetEnvironmentVariable("OPENAI_API_KEY"));

    public static string GetModel(IConfiguration configuration) => FirstNonEmpty(
        configuration["OpenAI:Model"],
        configuration["OPENAI_MODEL"],
        Environment.GetEnvironmentVariable("OPENAI_MODEL")) ?? "gpt-5.5";

    public static string GetReasoningEffort(IConfiguration configuration) => FirstNonEmpty(
        configuration["OpenAI:ReasoningEffort"],
        configuration["OPENAI_REASONING_EFFORT"],
        Environment.GetEnvironmentVariable("OPENAI_REASONING_EFFORT")) ?? "low";

    private static string? FirstNonEmpty(params string?[] values) =>
        values.FirstOrDefault(value => !string.IsNullOrWhiteSpace(value))?.Trim();
}
