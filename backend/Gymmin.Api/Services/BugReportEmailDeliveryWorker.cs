using Gymmin.Api.Domain;

namespace Gymmin.Api.Services;

public sealed class BugReportEmailDeliveryWorker(
    IBugReportStore reports,
    IBugReportEmailSender emailSender,
    IConfiguration configuration,
    ILogger<BugReportEmailDeliveryWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var pollSeconds = Math.Clamp(configuration.GetValue("BugReports:EmailDelivery:PollSeconds", 10), 1, 300);
        var batchSize = Math.Clamp(configuration.GetValue("BugReports:EmailDelivery:BatchSize", 20), 1, 100);
        var leaseDuration = TimeSpan.FromMinutes(2);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var now = DateTimeOffset.UtcNow;
                foreach (var id in reports.GetDueEmailDeliveryIds(now, batchSize))
                {
                    await DeliverAsync(id, leaseDuration, stoppingToken);
                }
            }
            catch (Exception error) when (error is not OperationCanceledException)
            {
                logger.LogError(error, "Bug report email delivery worker iteration failed.");
            }

            await Task.Delay(TimeSpan.FromSeconds(pollSeconds), stoppingToken);
        }
    }

    private async Task DeliverAsync(Guid id, TimeSpan leaseDuration, CancellationToken cancellationToken)
    {
        var leaseId = Guid.NewGuid().ToString("N");
        var report = reports.ClaimEmailDelivery(id, leaseId, DateTimeOffset.UtcNow, leaseDuration);
        if (report is null) return;

        try
        {
            await emailSender.SendAsync(report.Id, BugReportStoreMapper.ToRequest(report), cancellationToken);
            reports.CompleteEmailDelivery(report.Id, leaseId, true, null, DateTimeOffset.UtcNow);
            logger.LogInformation("Bug report {ReportId} email delivered on attempt {Attempt}.", report.Id, report.EmailAttemptCount);
        }
        catch (Exception error) when (error is not OperationCanceledException)
        {
            reports.CompleteEmailDelivery(report.Id, leaseId, false, error.Message, DateTimeOffset.UtcNow);
            logger.LogWarning(error, "Bug report {ReportId} email attempt {Attempt} failed.", report.Id, report.EmailAttemptCount);
        }
    }
}
