using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
using System.Globalization;

namespace Gymmin.Api.Data;

public sealed class GymminDbContext : DbContext
{
    public GymminDbContext(DbContextOptions<GymminDbContext> options)
        : base(options)
    {
    }

    public DbSet<UserEntity> Users => Set<UserEntity>();
    public DbSet<UserSessionEntity> UserSessions => Set<UserSessionEntity>();
    public DbSet<PasswordResetTokenEntity> PasswordResetTokens => Set<PasswordResetTokenEntity>();
    public DbSet<UserSettingsEntity> UserSettings => Set<UserSettingsEntity>();
    public DbSet<WorkoutEntity> Workouts => Set<WorkoutEntity>();
    public DbSet<WorkoutCreatorJobEntity> WorkoutCreatorJobs => Set<WorkoutCreatorJobEntity>();
    public DbSet<UserFavoriteExerciseEntity> UserFavoriteExercises => Set<UserFavoriteExerciseEntity>();
    public DbSet<WorkoutSessionEntity> WorkoutSessions => Set<WorkoutSessionEntity>();
    public DbSet<AiCreditAccountEntity> AiCreditAccounts => Set<AiCreditAccountEntity>();
    public DbSet<AiCreditTransactionEntity> AiCreditTransactions => Set<AiCreditTransactionEntity>();
    public DbSet<AiCreditPurchaseEntity> AiCreditPurchases => Set<AiCreditPurchaseEntity>();
    public DbSet<UserAchievementEntity> UserAchievements => Set<UserAchievementEntity>();
    public DbSet<UserAppUsageStatsEntity> UserAppUsageStats => Set<UserAppUsageStatsEntity>();
    public DbSet<BugReportEntity> BugReports => Set<BugReportEntity>();
    public DbSet<BugReportRewardTransactionEntity> BugReportRewardTransactions => Set<BugReportRewardTransactionEntity>();
    public DbSet<AbuseRateLimitBucketEntity> AbuseRateLimitBuckets => Set<AbuseRateLimitBucketEntity>();
    public DbSet<GooglePlayRtdnEventEntity> GooglePlayRtdnEvents => Set<GooglePlayRtdnEventEntity>();
    public DbSet<AdminAuditEventEntity> AdminAuditEvents => Set<AdminAuditEventEntity>();
    public DbSet<GooglePlayVoidedPurchaseEntity> GooglePlayVoidedPurchases => Set<GooglePlayVoidedPurchaseEntity>();
    public DbSet<IntegrationCheckpointEntity> IntegrationCheckpoints => Set<IntegrationCheckpointEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<UserEntity>(entity =>
        {
            entity.ToTable("Users");
            entity.HasKey(user => user.Id);
            entity.Property(user => user.Email).HasMaxLength(254).IsRequired();
            entity.Property(user => user.NormalizedEmail).HasMaxLength(254).IsRequired();
            entity.Property(user => user.Name).HasMaxLength(200).IsRequired();
            entity.Property(user => user.PasswordHash).IsRequired();
            entity.Property(user => user.PasswordSalt).IsRequired();
            entity.Property(user => user.AvatarFileName).HasMaxLength(260);
            entity.Property(user => user.AvatarContentType).HasMaxLength(80);
            entity.Property(user => user.AvatarContent);
            entity.Property(user => user.EmailVerificationCodeHash).HasMaxLength(64);
            entity.HasIndex(user => user.NormalizedEmail).IsUnique();
        });

        modelBuilder.Entity<UserSessionEntity>(entity =>
        {
            entity.ToTable("UserSessions");
            entity.HasKey(session => session.Id);
            entity.Property(session => session.TokenHash).IsRequired();
            entity.Property(session => session.DeviceName).HasMaxLength(120);
            entity.Property(session => session.LastIpAddress).HasMaxLength(80);
            entity.Property(session => session.RevokedReason).HasMaxLength(80);
            entity.HasIndex(session => session.TokenHash);
            entity.HasIndex(session => session.UserId);
            entity.HasOne(session => session.User)
                .WithMany(user => user.Sessions)
                .HasForeignKey(session => session.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AbuseRateLimitBucketEntity>(entity =>
        {
            entity.ToTable("AbuseRateLimitBuckets");
            entity.HasKey(bucket => bucket.Id);
            entity.Property(bucket => bucket.Id).HasMaxLength(64);
            entity.Property(bucket => bucket.Action).HasMaxLength(64).IsRequired();
            entity.Property(bucket => bucket.KeyHash).HasMaxLength(64).IsRequired();
            entity.HasIndex(bucket => bucket.ExpiresAt);
        });

        modelBuilder.Entity<PasswordResetTokenEntity>(entity =>
        {
            entity.ToTable("PasswordResetTokens");
            entity.HasKey(token => token.Id);
            entity.Property(token => token.TokenHash).IsRequired();
            entity.Property(token => token.RequestedIpAddress).HasMaxLength(80);
            entity.HasIndex(token => token.TokenHash).IsUnique();
            entity.HasIndex(token => token.UserId);
            entity.HasIndex(token => token.ExpiresAt);
            entity.HasOne(token => token.User)
                .WithMany()
                .HasForeignKey(token => token.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<UserSettingsEntity>(entity =>
        {
            entity.ToTable("UserSettings");
            entity.HasKey(settings => settings.UserId);
            entity.Property(settings => settings.Language).HasMaxLength(16).IsRequired();
            entity.Property(settings => settings.ThemeName).HasMaxLength(32).IsRequired();
            entity.Property(settings => settings.DefaultSetCount).HasMaxLength(32).IsRequired();
            entity.Property(settings => settings.DefaultWeight).HasMaxLength(32).IsRequired();
            entity.Property(settings => settings.DefaultWorkoutExecutionMode).HasMaxLength(64).IsRequired();
            entity.Property(settings => settings.DefaultWorkoutTableOrientation).HasMaxLength(20).IsRequired();
            entity.Property(settings => settings.ShowRestTimer).IsRequired();
            entity.Property(settings => settings.CollapsedPanelsJson).IsRequired();
            entity.Property(settings => settings.WorkoutRemindersJson).IsRequired();
            entity.HasOne(settings => settings.User)
                .WithOne()
                .HasForeignKey<UserSettingsEntity>(settings => settings.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<WorkoutEntity>(entity =>
        {
            entity.ToTable("Workouts");
            entity.HasKey(workout => workout.Id);
            entity.Property(workout => workout.ClientWorkoutId).HasMaxLength(128).IsRequired();
            entity.Property(workout => workout.Name).HasMaxLength(250).IsRequired();
            entity.Property(workout => workout.Notes).IsRequired();
            entity.Property(workout => workout.Sport).HasMaxLength(64).IsRequired();
            entity.Property(workout => workout.WorkoutJson).IsRequired();
            entity.HasIndex(workout => new { workout.UserId, workout.ClientWorkoutId }).IsUnique();
            entity.HasIndex(workout => new { workout.UserId, workout.DeletedAt });
            entity.HasOne(workout => workout.User)
                .WithMany()
                .HasForeignKey(workout => workout.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<WorkoutCreatorJobEntity>(entity =>
        {
            entity.ToTable("WorkoutCreatorJobs");
            entity.HasKey(job => job.Id);
            entity.Property(job => job.JobType).HasMaxLength(32).IsRequired();
            entity.Property(job => job.Status).HasMaxLength(32).IsRequired();
            entity.Property(job => job.Language).HasMaxLength(16).IsRequired();
            entity.Property(job => job.RequestJson).IsRequired();
            entity.Property(job => job.IdempotencyKey).HasMaxLength(160);
            entity.Property(job => job.TokenTransactionId).HasMaxLength(80);
            entity.Property(job => job.TokenRefundReason).HasMaxLength(250);
            entity.Property(job => job.LeaseId).HasMaxLength(64);
            entity.HasIndex(job => job.UserId);
            entity.HasIndex(job => job.Status);
            entity.HasIndex(job => job.CreatedAt);
            entity.HasIndex(job => job.LeaseExpiresAt);
            entity.HasIndex(job => new { job.UserId, job.JobType, job.IdempotencyKey });
            entity.HasOne(job => job.User)
                .WithMany()
                .HasForeignKey(job => job.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<UserFavoriteExerciseEntity>(entity =>
        {
            entity.ToTable("UserFavoriteExercises");
            entity.HasKey(favorite => favorite.Id);
            entity.Property(favorite => favorite.ExerciseId).HasMaxLength(160).IsRequired();
            entity.HasIndex(favorite => new { favorite.UserId, favorite.ExerciseId }).IsUnique();
            entity.HasIndex(favorite => favorite.UserId);
            entity.HasIndex(favorite => favorite.UpdatedAt);
            entity.HasIndex(favorite => favorite.DeletedAt);
            entity.HasOne(favorite => favorite.User)
                .WithMany()
                .HasForeignKey(favorite => favorite.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<WorkoutSessionEntity>(entity =>
        {
            entity.ToTable("WorkoutSessions");
            entity.HasKey(session => session.Id);
            entity.Property(session => session.ClientSessionId).HasMaxLength(160).IsRequired();
            entity.Property(session => session.SourceWorkoutId).HasMaxLength(160).IsRequired();
            entity.Property(session => session.SourceWorkoutName).HasMaxLength(250).IsRequired();
            entity.Property(session => session.ExecutionMode).HasMaxLength(64).IsRequired();
            entity.Property(session => session.Status).HasMaxLength(32).IsRequired();
            entity.Property(session => session.SessionJson).IsRequired();
            entity.HasIndex(session => new { session.UserId, session.ClientSessionId }).IsUnique();
            entity.HasIndex(session => session.UserId);
            entity.HasIndex(session => new { session.UserId, session.DeletedAt });
            entity.HasIndex(session => new { session.UserId, session.ClientUpdatedAt });
            entity.HasIndex(session => new { session.UserId, session.ServerUpdatedAt });
            entity.HasIndex(session => session.StartedAt);
            entity.HasOne(session => session.User)
                .WithMany()
                .HasForeignKey(session => session.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AiCreditAccountEntity>(entity =>
        {
            entity.ToTable("AiCreditAccounts");
            entity.HasKey(account => account.UserId);
            entity.HasOne(account => account.User)
                .WithOne()
                .HasForeignKey<AiCreditAccountEntity>(account => account.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AiCreditTransactionEntity>(entity =>
        {
            entity.ToTable("AiCreditTransactions");
            entity.HasKey(transaction => transaction.Id);
            entity.Property(transaction => transaction.Type).HasMaxLength(40).IsRequired();
            entity.Property(transaction => transaction.Reason).HasMaxLength(120);
            entity.Property(transaction => transaction.RelatedJobId).HasMaxLength(80);
            entity.Property(transaction => transaction.RelatedPurchaseId).HasMaxLength(160);
            entity.Property(transaction => transaction.IdempotencyKey).HasMaxLength(160);
            entity.HasIndex(transaction => transaction.UserId);
            entity.HasIndex(transaction => transaction.CreatedAt);
            entity.HasIndex(transaction => transaction.RelatedJobId);
            entity.HasIndex(transaction => transaction.RelatedPurchaseId);
            entity.HasIndex(transaction => transaction.IdempotencyKey);
            entity.HasIndex(transaction => new { transaction.UserId, transaction.RelatedJobId, transaction.Type }).IsUnique();
            entity.HasIndex(transaction => new { transaction.UserId, transaction.RelatedPurchaseId, transaction.Type }).IsUnique();
            entity.HasIndex(transaction => new { transaction.UserId, transaction.Reason, transaction.IdempotencyKey }).IsUnique();
            entity.HasOne(transaction => transaction.User)
                .WithMany()
                .HasForeignKey(transaction => transaction.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AiCreditPurchaseEntity>(entity =>
        {
            entity.ToTable("AiCreditPurchases");
            entity.HasKey(purchase => purchase.Id);
            entity.Property(purchase => purchase.Platform).HasMaxLength(40).IsRequired();
            entity.Property(purchase => purchase.ProductId).HasMaxLength(120).IsRequired();
            entity.Property(purchase => purchase.PurchaseTokenHash).HasMaxLength(160).IsRequired();
            entity.Property(purchase => purchase.PurchaseTokenLastChars).HasMaxLength(16);
            entity.Property(purchase => purchase.GoogleOrderId).HasMaxLength(160);
            entity.Property(purchase => purchase.PurchaseState).HasMaxLength(40).IsRequired();
            entity.Property(purchase => purchase.ProcessStatus).HasMaxLength(40).IsRequired();
            entity.Property(purchase => purchase.RelatedTransactionId).HasMaxLength(80);
            entity.Property(purchase => purchase.ClawbackTransactionId).HasMaxLength(80);
            entity.Property(purchase => purchase.ErrorCode).HasMaxLength(120);
            entity.Property(purchase => purchase.ErrorMessage).HasMaxLength(500);
            entity.HasIndex(purchase => purchase.UserId);
            entity.HasIndex(purchase => purchase.ProductId);
            entity.HasIndex(purchase => purchase.GoogleOrderId);
            entity.HasIndex(purchase => purchase.PurchaseTokenHash).IsUnique();
            entity.HasOne(purchase => purchase.User)
                .WithMany()
                .HasForeignKey(purchase => purchase.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<GooglePlayRtdnEventEntity>(entity =>
        {
            entity.ToTable("GooglePlayRtdnEvents");
            entity.HasKey(notification => notification.MessageId);
            entity.Property(notification => notification.MessageId).HasMaxLength(200);
            entity.Property(notification => notification.PackageName).HasMaxLength(250).IsRequired();
            entity.Property(notification => notification.NotificationKind).HasMaxLength(80).IsRequired();
            entity.Property(notification => notification.ProductId).HasMaxLength(120);
            entity.Property(notification => notification.PurchaseTokenHash).HasMaxLength(64);
            entity.Property(notification => notification.ProcessingStatus).HasMaxLength(40).IsRequired();
            entity.Property(notification => notification.ErrorCode).HasMaxLength(120);
            entity.HasIndex(notification => notification.ReceivedAt);
            entity.HasIndex(notification => notification.PurchaseTokenHash);
            entity.HasIndex(notification => notification.ProcessingStatus);
        });

        modelBuilder.Entity<AdminAuditEventEntity>(entity =>
        {
            entity.ToTable("AdminAuditEvents");
            entity.HasKey(audit => audit.Id);
            entity.Property(audit => audit.ActorKeyId).HasMaxLength(100).IsRequired();
            entity.Property(audit => audit.Action).HasMaxLength(120).IsRequired();
            entity.Property(audit => audit.TargetType).HasMaxLength(80).IsRequired();
            entity.Property(audit => audit.TargetId).HasMaxLength(160).IsRequired();
            entity.Property(audit => audit.CorrelationId).HasMaxLength(128);
            entity.HasIndex(audit => audit.CreatedAt);
            entity.HasIndex(audit => new { audit.TargetType, audit.TargetId });
        });

        modelBuilder.Entity<GooglePlayVoidedPurchaseEntity>(entity =>
        {
            entity.ToTable("GooglePlayVoidedPurchases");
            entity.HasKey(item => item.Id);
            entity.Property(item => item.Id).HasMaxLength(64);
            entity.Property(item => item.PurchaseTokenHash).HasMaxLength(64).IsRequired();
            entity.Property(item => item.GoogleOrderId).HasMaxLength(160);
            entity.Property(item => item.PurchaseId).HasMaxLength(160);
            entity.Property(item => item.UserId).HasMaxLength(160);
            entity.Property(item => item.ProcessingStatus).HasMaxLength(40).IsRequired();
            entity.Property(item => item.ClawbackTransactionId).HasMaxLength(80);
            entity.HasIndex(item => item.PurchaseTokenHash);
            entity.HasIndex(item => item.GoogleOrderId);
            entity.HasIndex(item => item.ReceivedAt);
            entity.HasIndex(item => item.ProcessingStatus);
        });

        modelBuilder.Entity<IntegrationCheckpointEntity>(entity =>
        {
            entity.ToTable("IntegrationCheckpoints");
            entity.HasKey(checkpoint => checkpoint.Id);
            entity.Property(checkpoint => checkpoint.Id).HasMaxLength(100);
        });

        modelBuilder.Entity<UserAchievementEntity>(entity =>
        {
            entity.ToTable("UserAchievements");
            entity.HasKey(achievement => achievement.Id);
            entity.Property(achievement => achievement.AchievementId).HasMaxLength(100).IsRequired();
            entity.HasIndex(achievement => new { achievement.UserId, achievement.AchievementId }).IsUnique();
            entity.HasIndex(achievement => achievement.UserId);
            entity.HasIndex(achievement => achievement.AchievementId);
            entity.HasIndex(achievement => achievement.UnlockedAt);
            entity.HasOne(achievement => achievement.User)
                .WithMany()
                .HasForeignKey(achievement => achievement.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<UserAppUsageStatsEntity>(entity =>
        {
            entity.ToTable("UserAppUsageStats");
            entity.HasKey(stats => stats.UserId);
            entity.HasOne(stats => stats.User)
                .WithOne()
                .HasForeignKey<UserAppUsageStatsEntity>(stats => stats.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<BugReportEntity>(entity =>
        {
            entity.ToTable("BugReports");
            entity.HasKey(report => report.Id);
            entity.Property(report => report.IdempotencyKey).HasMaxLength(160);
            entity.Property(report => report.Title).HasMaxLength(250).IsRequired();
            entity.Property(report => report.Description).IsRequired();
            entity.Property(report => report.Device).HasMaxLength(1_000);
            entity.Property(report => report.Screen).HasMaxLength(200);
            entity.Property(report => report.Language).HasMaxLength(16);
            entity.Property(report => report.AppVersion).HasMaxLength(50);
            entity.Property(report => report.Status).HasMaxLength(32).IsRequired();
            entity.Property(report => report.EmailDeliveryStatus).HasMaxLength(32).IsRequired();
            entity.Property(report => report.EmailDeliveryError).HasMaxLength(500);
            entity.Property(report => report.EmailLeaseId).HasMaxLength(80);
            entity.HasIndex(report => report.IdempotencyKey).IsUnique();
            entity.HasIndex(report => report.ReporterUserId);
            entity.HasIndex(report => report.Status);
            entity.HasIndex(report => report.CreatedAt);
            entity.HasIndex(report => new { report.EmailDeliveryStatus, report.EmailNextAttemptAt });
            entity.HasOne(report => report.ReporterUser)
                .WithMany()
                .HasForeignKey(report => report.ReporterUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<BugReportRewardTransactionEntity>(entity =>
        {
            entity.ToTable("BugReportRewardTransactions");
            entity.HasKey(transaction => transaction.Id);
            entity.Property(transaction => transaction.Reason).HasMaxLength(500);
            entity.Property(transaction => transaction.AwardedBy).HasMaxLength(160).IsRequired();
            entity.HasIndex(transaction => transaction.BugReportId).IsUnique();
            entity.HasIndex(transaction => transaction.UserId);
            entity.HasOne(transaction => transaction.BugReport).WithMany().HasForeignKey(transaction => transaction.BugReportId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(transaction => transaction.User).WithMany().HasForeignKey(transaction => transaction.UserId).OnDelete(DeleteBehavior.SetNull);
        });

        ApplyTextCompatibleConverters(modelBuilder);
    }

    private static void ApplyTextCompatibleConverters(ModelBuilder modelBuilder)
    {
        var dateTimeOffsetConverter = new ValueConverter<DateTimeOffset, string>(
            value => value.ToUniversalTime().ToString("O", CultureInfo.InvariantCulture),
            value => DateTimeOffset.Parse(value, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind));
        var nullableDateTimeOffsetConverter = new ValueConverter<DateTimeOffset?, string?>(
            value => value.HasValue ? value.Value.ToUniversalTime().ToString("O", CultureInfo.InvariantCulture) : null,
            value => string.IsNullOrWhiteSpace(value)
                ? null
                : DateTimeOffset.Parse(value, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind));
        var guidConverter = new ValueConverter<Guid, string>(
            value => value.ToString("D"),
            value => Guid.Parse(value));
        var boolConverter = new ValueConverter<bool, int>(
            value => value ? 1 : 0,
            value => value != 0);

        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entityType.GetProperties())
            {
                if (property.ClrType == typeof(DateTimeOffset))
                {
                    property.SetValueConverter(dateTimeOffsetConverter);
                }
                else if (property.ClrType == typeof(DateTimeOffset?))
                {
                    property.SetValueConverter(nullableDateTimeOffsetConverter);
                }
                else if (property.ClrType == typeof(Guid))
                {
                    property.SetValueConverter(guidConverter);
                }
                else if (property.ClrType == typeof(bool))
                {
                    property.SetValueConverter(boolConverter);
                }
            }
        }
    }
}

public sealed class UserEntity
{
    public string Id { get; set; } = "";
    public string Email { get; set; } = "";
    public string NormalizedEmail { get; set; } = "";
    public string Name { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public int PasswordIterations { get; set; }
    public string PasswordSalt { get; set; } = "";
    public string? AvatarFileName { get; set; }
    public string? AvatarContentType { get; set; }
    public byte[]? AvatarContent { get; set; }
    public DateTimeOffset? AvatarUpdatedAt { get; set; }
    public DateTimeOffset? EmailVerifiedAt { get; set; }
    public string? EmailVerificationCodeHash { get; set; }
    public DateTimeOffset? EmailVerificationCodeExpiresAt { get; set; }
    public DateTimeOffset? EmailVerificationSentAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public List<UserSessionEntity> Sessions { get; set; } = [];
}

public sealed class UserSessionEntity
{
    public string Id { get; set; } = "";
    public string UserId { get; set; } = "";
    public string TokenHash { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset LastSeenAt { get; set; }
    public DateTimeOffset? ExpiresAt { get; set; }
    public DateTimeOffset? RevokedAt { get; set; }
    public string? UserAgent { get; set; }
    public string? DeviceName { get; set; }
    public string? LastIpAddress { get; set; }
    public string? RevokedReason { get; set; }
    public UserEntity? User { get; set; }
}

public sealed class AbuseRateLimitBucketEntity
{
    public string Id { get; set; } = "";
    public string Action { get; set; } = "";
    public string KeyHash { get; set; } = "";
    public int AttemptCount { get; set; }
    public DateTimeOffset WindowStartedAt { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
}

public sealed class PasswordResetTokenEntity
{
    public string Id { get; set; } = "";
    public string UserId { get; set; } = "";
    public string TokenHash { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset? UsedAt { get; set; }
    public string? RequestedIpAddress { get; set; }
    public string? UserAgent { get; set; }
    public UserEntity? User { get; set; }
}

public sealed class UserSettingsEntity
{
    public string UserId { get; set; } = "";
    public string Language { get; set; } = "en";
    public string ThemeName { get; set; } = "light";
    public string DefaultSetCount { get; set; } = "";
    public string DefaultWeight { get; set; } = "";
    public string? DefaultStageType { get; set; }
    public string DefaultWorkoutExecutionMode { get; set; } = "guided";
    public string DefaultWorkoutTableOrientation { get; set; } = "vertical";
    public bool ShowRestTimer { get; set; } = true;
    public string CollapsedPanelsJson { get; set; } = "{}";
    public string WorkoutRemindersJson { get; set; } = "";
    public bool IsAuthPanelDismissed { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public UserEntity? User { get; set; }
}

public sealed class WorkoutEntity
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = "";
    public string ClientWorkoutId { get; set; } = "";
    public string Name { get; set; } = "";
    public string Notes { get; set; } = "";
    public string Sport { get; set; } = "strength";
    public DateTimeOffset? ClientUpdatedAt { get; set; }
    public DateTimeOffset ServerUpdatedAt { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
    public string WorkoutJson { get; set; } = "";
    public UserEntity? User { get; set; }
}

public sealed class WorkoutCreatorJobEntity
{
    public string Id { get; set; } = "";
    public string UserId { get; set; } = "";
    public string JobType { get; set; } = "plan";
    public string Status { get; set; } = "processing";
    public string Language { get; set; } = "";
    public string RequestJson { get; set; } = "";
    public string? ResultJson { get; set; }
    public string? Error { get; set; }
    public string? Model { get; set; }
    public string? ReasoningEffort { get; set; }
    public int TokenCost { get; set; }
    public string? TokenTransactionId { get; set; }
    public DateTimeOffset? TokenRefundedAt { get; set; }
    public string? TokenRefundReason { get; set; }
    public string? IdempotencyKey { get; set; }
    public string? LeaseId { get; set; }
    public DateTimeOffset? LeaseExpiresAt { get; set; }
    public int AttemptCount { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
    public UserEntity? User { get; set; }
}

public sealed class UserFavoriteExerciseEntity
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = "";
    public string ExerciseId { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
    public UserEntity? User { get; set; }
}

public sealed class WorkoutSessionEntity
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = "";
    public string ClientSessionId { get; set; } = "";
    public string SourceWorkoutId { get; set; } = "";
    public string SourceWorkoutName { get; set; } = "";
    public string ExecutionMode { get; set; } = "";
    public string Status { get; set; } = "";
    public DateTimeOffset StartedAt { get; set; }
    public DateTimeOffset? FinishedAt { get; set; }
    public DateTimeOffset? AbandonedAt { get; set; }
    public DateTimeOffset ClientUpdatedAt { get; set; }
    public DateTimeOffset ServerUpdatedAt { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public string SessionJson { get; set; } = "";
    public UserEntity? User { get; set; }
}

public sealed class AiCreditAccountEntity
{
    public string UserId { get; set; } = "";
    public int Balance { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public UserEntity? User { get; set; }
}

public sealed class AiCreditTransactionEntity
{
    public string Id { get; set; } = "";
    public string UserId { get; set; } = "";
    public int Amount { get; set; }
    public string Type { get; set; } = "";
    public string? Reason { get; set; }
    public string? RelatedJobId { get; set; }
    public string? RelatedPurchaseId { get; set; }
    public string? IdempotencyKey { get; set; }
    public int BalanceAfter { get; set; }
    public string? MetadataJson { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public UserEntity? User { get; set; }
}

public sealed class AiCreditPurchaseEntity
{
    public string Id { get; set; } = "";
    public string UserId { get; set; } = "";
    public string Platform { get; set; } = "";
    public string ProductId { get; set; } = "";
    public int Credits { get; set; }
    public string PurchaseTokenHash { get; set; } = "";
    public string? PurchaseTokenLastChars { get; set; }
    public string? GoogleOrderId { get; set; }
    public string PurchaseState { get; set; } = "";
    public int? ConsumptionState { get; set; }
    public int? AcknowledgementState { get; set; }
    public string ProcessStatus { get; set; } = "";
    public string? RelatedTransactionId { get; set; }
    public string? ErrorCode { get; set; }
    public string? ErrorMessage { get; set; }
    public string? RawResponseJson { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? VerifiedAt { get; set; }
    public DateTimeOffset? CreditedAt { get; set; }
    public DateTimeOffset? ConsumedAt { get; set; }
    public DateTimeOffset? VoidedAt { get; set; }
    public int? VoidedReason { get; set; }
    public int? VoidedSource { get; set; }
    public int ClawbackCredits { get; set; }
    public int UnrecoveredCredits { get; set; }
    public string? ClawbackTransactionId { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public UserEntity? User { get; set; }
}

public sealed class GooglePlayRtdnEventEntity
{
    public string MessageId { get; set; } = "";
    public string PackageName { get; set; } = "";
    public string NotificationKind { get; set; } = "";
    public int? NotificationType { get; set; }
    public string? ProductId { get; set; }
    public string? PurchaseTokenHash { get; set; }
    public string ProcessingStatus { get; set; } = "received";
    public string? ErrorCode { get; set; }
    public DateTimeOffset? EventTime { get; set; }
    public DateTimeOffset? PublishedAt { get; set; }
    public DateTimeOffset ReceivedAt { get; set; }
    public DateTimeOffset ProcessedAt { get; set; }
}

public sealed class AdminAuditEventEntity
{
    public Guid Id { get; set; }
    public string ActorKeyId { get; set; } = "";
    public string Action { get; set; } = "";
    public string TargetType { get; set; } = "";
    public string TargetId { get; set; } = "";
    public string? CorrelationId { get; set; }
    public string? DetailsJson { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public sealed class GooglePlayVoidedPurchaseEntity
{
    public string Id { get; set; } = "";
    public string PurchaseTokenHash { get; set; } = "";
    public string? GoogleOrderId { get; set; }
    public string? PurchaseId { get; set; }
    public string? UserId { get; set; }
    public int VoidedReason { get; set; }
    public int VoidedSource { get; set; }
    public int VoidedQuantity { get; set; }
    public int ClawbackCredits { get; set; }
    public int UnrecoveredCredits { get; set; }
    public string ProcessingStatus { get; set; } = "received";
    public string? ClawbackTransactionId { get; set; }
    public DateTimeOffset? PurchaseTime { get; set; }
    public DateTimeOffset VoidedTime { get; set; }
    public DateTimeOffset ReceivedAt { get; set; }
    public DateTimeOffset ProcessedAt { get; set; }
}

public sealed class IntegrationCheckpointEntity
{
    public string Id { get; set; } = "";
    public DateTimeOffset LastSuccessfulAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

public sealed class UserAchievementEntity
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = "";
    public string AchievementId { get; set; } = "";
    public DateTimeOffset UnlockedAt { get; set; }
    public double? ProgressAtUnlock { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public UserEntity? User { get; set; }
}

public sealed class UserAppUsageStatsEntity
{
    public string UserId { get; set; } = "";
    public long TotalForegroundSeconds { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public UserEntity? User { get; set; }
}

public sealed class BugReportEntity
{
    public Guid Id { get; set; }
    public string? IdempotencyKey { get; set; }
    public string? ReporterUserId { get; set; }
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public string? Device { get; set; }
    public string? Screen { get; set; }
    public string? Language { get; set; }
    public string? AppVersion { get; set; }
    public string? DiagnosticsJson { get; set; }
    public string Status { get; set; } = "new";
    public string EmailDeliveryStatus { get; set; } = "pending";
    public string? EmailDeliveryError { get; set; }
    public int EmailAttemptCount { get; set; }
    public DateTimeOffset? EmailLastAttemptAt { get; set; }
    public DateTimeOffset? EmailNextAttemptAt { get; set; }
    public DateTimeOffset? EmailSentAt { get; set; }
    public string? EmailLeaseId { get; set; }
    public DateTimeOffset? EmailLeaseExpiresAt { get; set; }
    public string? AdminResponse { get; set; }
    public DateTimeOffset? AdminRespondedAt { get; set; }
    public int RewardPoints { get; set; }
    public DateTimeOffset? RewardedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public UserEntity? ReporterUser { get; set; }
}

public sealed class BugReportRewardTransactionEntity
{
    public Guid Id { get; set; }
    public Guid BugReportId { get; set; }
    public string? UserId { get; set; }
    public int Points { get; set; }
    public string? Reason { get; set; }
    public string AwardedBy { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; }
    public BugReportEntity? BugReport { get; set; }
    public UserEntity? User { get; set; }
}
