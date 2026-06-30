using System.Net;
using System.Net.Mail;
using System.Text;
using System.Text.Json;
using Gymmin.Api.Domain;

namespace Gymmin.Api.Services;

public interface IBugReportEmailSender
{
    Task SendAsync(Guid reportId, CreateBugReportRequest report, CancellationToken cancellationToken);
}

public sealed class SmtpBugReportEmailSender(IConfiguration configuration) : IBugReportEmailSender
{
    public async Task SendAsync(Guid reportId, CreateBugReportRequest report, CancellationToken cancellationToken)
    {
        var settings = configuration.GetSection("BugReports:Smtp");
        var host = settings["Host"];
        var username = settings["Username"];
        var password = settings["Password"];
        var from = settings["From"] ?? username;
        var to = settings["To"] ?? from;
        var port = int.TryParse(settings["Port"], out var parsedPort) ? parsedPort : 587;
        var enableSsl = !bool.TryParse(settings["EnableSsl"], out var parsedEnableSsl) || parsedEnableSsl;

        if (string.IsNullOrWhiteSpace(host) ||
            string.IsNullOrWhiteSpace(username) ||
            string.IsNullOrWhiteSpace(password) ||
            string.IsNullOrWhiteSpace(from) ||
            string.IsNullOrWhiteSpace(to))
        {
            throw new InvalidOperationException("Bug report SMTP configuration is missing.");
        }

        using var message = new MailMessage(from, to)
        {
            Subject = $"Błąd {reportId}",
            Body = BuildBody(reportId, report),
            BodyEncoding = Encoding.UTF8,
            SubjectEncoding = Encoding.UTF8
        };

        using var client = new SmtpClient(host, port)
        {
            Credentials = new NetworkCredential(username, password),
            EnableSsl = enableSsl
        };

        using var registration = cancellationToken.Register(client.SendAsyncCancel);
        await client.SendMailAsync(message, cancellationToken);
    }

    private static string BuildBody(Guid reportId, CreateBugReportRequest report)
    {
        var builder = new StringBuilder();
        builder.AppendLine($"Id zgłoszenia: {reportId}");
        builder.AppendLine($"Tytuł: {report.Title.Trim()}");
        builder.AppendLine($"Ekran: {Normalize(report.Screen)}");
        builder.AppendLine($"Urządzenie i system: {Normalize(report.Device)}");
        builder.AppendLine($"Język aplikacji: {Normalize(report.Language)}");
        builder.AppendLine($"Wersja aplikacji: {Normalize(report.AppVersion)}");
        if (report.Diagnostics is { ValueKind: not JsonValueKind.Undefined and not JsonValueKind.Null } diagnostics)
        {
            builder.AppendLine();
            builder.AppendLine("Diagnostyka:");
            builder.AppendLine(JsonSerializer.Serialize(diagnostics, new JsonSerializerOptions { WriteIndented = true }));
        }
        builder.AppendLine();
        builder.AppendLine("Opis:");
        builder.AppendLine(report.Description.Trim());
        return builder.ToString();
    }

    private static string Normalize(string? value) =>
        string.IsNullOrWhiteSpace(value) ? "brak" : value.Trim();
}
