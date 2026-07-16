using System.Net;
using System.Net.Mail;
using System.Text;

namespace Gymmin.Api.Services;

public interface IPasswordResetEmailSender
{
    Task SendAsync(string email, string token, DateTimeOffset expiresAt, CancellationToken cancellationToken);
}

public sealed class SmtpPasswordResetEmailSender(IConfiguration configuration, ILogger<SmtpPasswordResetEmailSender> logger) : IPasswordResetEmailSender
{
    public async Task SendAsync(string email, string token, DateTimeOffset expiresAt, CancellationToken cancellationToken)
    {
        var settings = configuration.GetSection("Auth:Smtp");
        if (!settings.Exists())
        {
            settings = configuration.GetSection("BugReports:Smtp");
        }

        var host = settings["Host"];
        var username = settings["Username"];
        var password = settings["Password"];
        var from = settings["From"] ?? username;
        var port = int.TryParse(settings["Port"], out var parsedPort) ? parsedPort : 587;
        var enableSsl = !bool.TryParse(settings["EnableSsl"], out var parsedEnableSsl) || parsedEnableSsl;

        if (string.IsNullOrWhiteSpace(host) ||
            string.IsNullOrWhiteSpace(username) ||
            string.IsNullOrWhiteSpace(password) ||
            string.IsNullOrWhiteSpace(from))
        {
            logger.LogWarning("Password reset SMTP configuration is missing. Reset email was not sent.");
            return;
        }

        using var message = new MailMessage(from, email)
        {
            Subject = "Gymmin password reset",
            Body = BuildBody(token, expiresAt),
            BodyEncoding = Encoding.UTF8,
            SubjectEncoding = Encoding.UTF8
        };

        using var client = new SmtpClient(host, port)
        {
            Credentials = new NetworkCredential(username, password),
            EnableSsl = enableSsl
        };

        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(TimeSpan.FromSeconds(Math.Clamp(configuration.GetValue("Gymmin:Security:SmtpTimeoutSeconds", 30), 5, 120)));
        using var registration = timeout.Token.Register(client.SendAsyncCancel);
        await client.SendMailAsync(message, timeout.Token);
    }

    private static string BuildBody(string token, DateTimeOffset expiresAt)
    {
        var builder = new StringBuilder();
        builder.AppendLine("We received a request to reset your Gymmin password.");
        builder.AppendLine("Use the code below to set a new password.");
        builder.AppendLine($"Code: {token}");
        builder.AppendLine($"Expires at: {expiresAt:O}");
        builder.AppendLine();
        builder.AppendLine("If this was not you, ignore this message.");
        return builder.ToString();
    }
}
