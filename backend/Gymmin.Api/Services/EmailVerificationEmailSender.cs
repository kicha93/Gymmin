using System.Net;
using System.Net.Mail;
using System.Text;

namespace Gymmin.Api.Services;

public interface IEmailVerificationEmailSender
{
    Task SendAsync(string email, string code, DateTimeOffset expiresAt, CancellationToken cancellationToken);
}

public sealed class SmtpEmailVerificationEmailSender(IConfiguration configuration, ILogger<SmtpEmailVerificationEmailSender> logger)
    : IEmailVerificationEmailSender
{
    public async Task SendAsync(string email, string code, DateTimeOffset expiresAt, CancellationToken cancellationToken)
    {
        var settings = configuration.GetSection("Auth:Smtp");
        if (!settings.Exists()) settings = configuration.GetSection("BugReports:Smtp");
        var host = settings["Host"];
        var username = settings["Username"];
        var password = settings["Password"];
        var from = settings["From"] ?? username;
        var port = int.TryParse(settings["Port"], out var parsedPort) ? parsedPort : 587;
        var enableSsl = !bool.TryParse(settings["EnableSsl"], out var parsedEnableSsl) || parsedEnableSsl;

        if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(password) || string.IsNullOrWhiteSpace(from))
        {
            logger.LogWarning("Email verification SMTP configuration is missing. Verification email was not sent.");
            return;
        }

        using var message = new MailMessage(from, email)
        {
            Subject = "Verify your Gymmin email",
            Body = $"Your Gymmin verification code is: {code}\n\nIt expires at {expiresAt:O}.\nIf this was not you, ignore this message.",
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
}
