using System.Text.Json;
using Gymmin.Api.Data;
using Gymmin.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Gymmin.Api.Services;

public sealed class AppDataDatabaseImporter
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly IDbContextFactory<GymminDbContext> _dbFactory;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<AppDataDatabaseImporter> _logger;

    public AppDataDatabaseImporter(
        IDbContextFactory<GymminDbContext> dbFactory,
        IWebHostEnvironment environment,
        ILogger<AppDataDatabaseImporter> logger)
    {
        _dbFactory = dbFactory;
        _environment = environment;
        _logger = logger;
    }

    public async Task ImportAsync(CancellationToken cancellationToken = default)
    {
        var appData = Path.Combine(_environment.ContentRootPath, "App_Data");

        if (!Directory.Exists(appData))
        {
            return;
        }

        await ImportUsersAsync(Path.Combine(appData, "users.json"), cancellationToken);
        await ImportAvatarsAsync(
            Path.Combine(appData, "users.json"),
            Path.Combine(appData, "avatars"),
            cancellationToken);
        await ImportSettingsAsync(Path.Combine(appData, "user-settings.json"), cancellationToken);
        await ImportWorkoutsAsync(Path.Combine(appData, "workouts.json"), cancellationToken);
        await ImportCreatorJobsAsync(Path.Combine(appData, "workout-creator-jobs.json"), cancellationToken);
    }

    private async Task ImportUsersAsync(string path, CancellationToken cancellationToken)
    {
        var users = ReadJson<List<PersistedUser>>(path) ?? [];

        if (users.Count == 0)
        {
            return;
        }

        await using var db = await _dbFactory.CreateDbContextAsync(cancellationToken);

        foreach (var user in users.Where(user => !string.IsNullOrWhiteSpace(user.Id)))
        {
            var normalizedEmail = (user.Email ?? "").Trim().ToLowerInvariant();

            if (string.IsNullOrWhiteSpace(normalizedEmail) ||
                await db.Users.AnyAsync(item => item.Id == user.Id || item.NormalizedEmail == normalizedEmail, cancellationToken))
            {
                continue;
            }

            var entity = new UserEntity
            {
                CreatedAt = user.CreatedAt,
                Email = normalizedEmail,
                Id = user.Id,
                Name = user.Name ?? "",
                NormalizedEmail = normalizedEmail,
                PasswordHash = user.Password?.Hash ?? "",
                PasswordIterations = user.Password?.Iterations ?? 120_000,
                PasswordSalt = user.Password?.Salt ?? "",
                UpdatedAt = user.UpdatedAt
            };

            foreach (var session in user.Sessions ?? [])
            {
                if (string.IsNullOrWhiteSpace(session.TokenHash))
                {
                    continue;
                }

                entity.Sessions.Add(new UserSessionEntity
                {
                    CreatedAt = session.CreatedAt,
                    Id = Guid.NewGuid().ToString("N"),
                    LastSeenAt = session.CreatedAt,
                    TokenHash = session.TokenHash,
                    UserId = entity.Id
                });
            }

            db.Users.Add(entity);
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    private async Task ImportSettingsAsync(string path, CancellationToken cancellationToken)
    {
        var settingsByUserId = ReadJson<Dictionary<string, UserSettings>>(path) ?? [];

        if (settingsByUserId.Count == 0)
        {
            return;
        }

        await using var db = await _dbFactory.CreateDbContextAsync(cancellationToken);

        foreach (var (userId, settings) in settingsByUserId)
        {
            if (string.IsNullOrWhiteSpace(userId) ||
                !await db.Users.AnyAsync(user => user.Id == userId, cancellationToken) ||
                await db.UserSettings.AnyAsync(item => item.UserId == userId, cancellationToken))
            {
                continue;
            }

            db.UserSettings.Add(new UserSettingsEntity
            {
                CollapsedPanelsJson = JsonSerializer.Serialize(settings.CollapsedPanels ?? new Dictionary<string, bool>(), JsonOptions),
                DefaultSetCount = settings.DefaultSetCount,
                DefaultStageType = settings.DefaultStageType?.ToString(),
                DefaultWeight = settings.DefaultWeight,
                DefaultWorkoutExecutionMode = string.IsNullOrWhiteSpace(settings.DefaultWorkoutExecutionMode)
                    ? "guided"
                    : settings.DefaultWorkoutExecutionMode,
                DefaultWorkoutTableOrientation = string.IsNullOrWhiteSpace(settings.DefaultWorkoutTableOrientation)
                    ? "vertical"
                    : settings.DefaultWorkoutTableOrientation,
                ShowRestTimer = settings.ShowRestTimer,
                IsAuthPanelDismissed = settings.IsAuthPanelDismissed,
                Language = settings.Language,
                ThemeName = settings.ThemeName,
                UpdatedAt = settings.UpdatedAt,
                WorkoutRemindersJson = settings.WorkoutReminders is null
                    ? ""
                    : JsonSerializer.Serialize(settings.WorkoutReminders, JsonOptions),
                UserId = userId
            });
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    private async Task ImportAvatarsAsync(
        string usersPath,
        string avatarsRoot,
        CancellationToken cancellationToken)
    {
        var users = ReadJson<List<PersistedUser>>(usersPath) ?? [];
        if (users.Count == 0 || !Directory.Exists(avatarsRoot))
        {
            return;
        }

        await using var db = await _dbFactory.CreateDbContextAsync(cancellationToken);
        foreach (var imported in users.Where(user =>
            !string.IsNullOrWhiteSpace(user.Id) &&
            !string.IsNullOrWhiteSpace(user.AvatarFileName) &&
            !string.IsNullOrWhiteSpace(user.AvatarContentType) &&
            user.AvatarUpdatedAt is not null))
        {
            var user = await db.Users.FirstOrDefaultAsync(item => item.Id == imported.Id, cancellationToken);
            if (user is null || user.AvatarContent is not null)
            {
                continue;
            }

            var fileName = imported.AvatarFileName!;
            if (fileName.Contains(Path.DirectorySeparatorChar) || fileName.Contains(Path.AltDirectorySeparatorChar))
            {
                continue;
            }

            var contentType = FileSystemUserAvatarStorage.NormalizeContentType(imported.AvatarContentType);
            var safeId = new string(imported.Id.Where(character =>
                char.IsLetterOrDigit(character) || character is '-' or '_').ToArray());
            var path = Path.Combine(avatarsRoot, safeId, fileName);
            if (contentType is null || !File.Exists(path))
            {
                continue;
            }

            var info = new FileInfo(path);
            if (info.Length is <= 0 or > FileSystemUserAvatarStorage.MaxAvatarBytes)
            {
                _logger.LogWarning("Skipping invalid legacy avatar size for user {UserId}.", imported.Id);
                continue;
            }

            var bytes = await File.ReadAllBytesAsync(path, cancellationToken);
            if (!FileSystemUserAvatarStorage.MatchesMagicBytes(contentType, bytes.AsSpan(0, Math.Min(12, bytes.Length))))
            {
                _logger.LogWarning("Skipping legacy avatar with invalid content for user {UserId}.", imported.Id);
                continue;
            }

            user.AvatarContent = bytes;
            user.AvatarContentType = contentType;
            user.AvatarFileName = fileName;
            var avatarUpdatedAt = imported.AvatarUpdatedAt.GetValueOrDefault(user.UpdatedAt);
            user.AvatarUpdatedAt = avatarUpdatedAt;
            user.UpdatedAt = new[] { user.UpdatedAt, avatarUpdatedAt }.Max();
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    private async Task ImportWorkoutsAsync(string path, CancellationToken cancellationToken)
    {
        var workouts = ReadJson<List<Workout>>(path) ?? [];

        if (workouts.Count == 0)
        {
            return;
        }

        await using var db = await _dbFactory.CreateDbContextAsync(cancellationToken);

        foreach (var workout in workouts)
        {
            if (string.IsNullOrWhiteSpace(workout.UserId) ||
                string.IsNullOrWhiteSpace(workout.ClientWorkoutId) ||
                !await db.Users.AnyAsync(user => user.Id == workout.UserId, cancellationToken) ||
                await db.Workouts.AnyAsync(item =>
                    item.UserId == workout.UserId &&
                    item.ClientWorkoutId == workout.ClientWorkoutId,
                    cancellationToken))
            {
                continue;
            }

            db.Workouts.Add(new WorkoutEntity
            {
                ClientWorkoutId = workout.ClientWorkoutId,
                DeletedAt = workout.DeletedAt,
                Id = workout.Id,
                Name = workout.Name,
                Notes = workout.Notes,
                ServerUpdatedAt = workout.UpdatedAt,
                Sport = workout.Sport.ToString(),
                UserId = workout.UserId,
                WorkoutJson = JsonSerializer.Serialize(workout, JsonOptions)
            });
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    private async Task ImportCreatorJobsAsync(string path, CancellationToken cancellationToken)
    {
        var jobs = ReadJson<List<PersistedWorkoutPlanJob>>(path) ?? [];

        if (jobs.Count == 0)
        {
            return;
        }

        await using var db = await _dbFactory.CreateDbContextAsync(cancellationToken);

        foreach (var job in jobs)
        {
            if (string.IsNullOrWhiteSpace(job.JobId) ||
                string.IsNullOrWhiteSpace(job.UserId) ||
                !await db.Users.AnyAsync(user => user.Id == job.UserId, cancellationToken) ||
                await db.WorkoutCreatorJobs.AnyAsync(item => item.Id == job.JobId, cancellationToken))
            {
                if (!string.IsNullOrWhiteSpace(job.JobId) && string.IsNullOrWhiteSpace(job.UserId))
                {
                    _logger.LogInformation("Skipping legacy workout creator job {JobId} without UserId during DB import.", job.JobId);
                }

                continue;
            }

            var resultJson = job.Result is null ? null : JsonSerializer.Serialize(job.Result, JsonOptions);
            var requestJson = job.JobType == "rewrite"
                ? JsonSerializer.Serialize(job.RewriteRequest, JsonOptions)
                : JsonSerializer.Serialize(job.Request, JsonOptions);

            db.WorkoutCreatorJobs.Add(new WorkoutCreatorJobEntity
            {
                CompletedAt = job.Status is "completed" or "failed" ? job.UpdatedAt : null,
                CreatedAt = job.CreatedAt,
                Error = job.Error,
                Id = job.JobId,
                JobType = string.IsNullOrWhiteSpace(job.JobType) ? "plan" : job.JobType,
                Language = job.RewriteRequest?.Language ?? job.Request?.Language ?? "",
                Model = job.Result?.Model,
                ReasoningEffort = job.Result?.ReasoningEffort,
                RequestJson = requestJson,
                ResultJson = resultJson,
                Status = string.IsNullOrWhiteSpace(job.Status) ? "failed" : job.Status,
                UpdatedAt = job.UpdatedAt,
                UserId = job.UserId
            });
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    private T? ReadJson<T>(string path)
    {
        if (!File.Exists(path))
        {
            return default;
        }

        try
        {
            return JsonSerializer.Deserialize<T>(File.ReadAllText(path), JsonOptions);
        }
        catch (Exception error)
        {
            _logger.LogError(error, "Failed to import App_Data JSON from {Path}.", path);
            return default;
        }
    }

    private sealed record PersistedPassword(string Hash, int Iterations, string Salt);
    private sealed record PersistedUserSession(string TokenHash, DateTimeOffset CreatedAt);

    private sealed class PersistedUser
    {
        public string Id { get; set; } = "";
        public string Email { get; set; } = "";
        public string Name { get; set; } = "";
        public PersistedPassword? Password { get; set; }
        public List<PersistedUserSession> Sessions { get; set; } = [];
        public string? AvatarFileName { get; set; }
        public string? AvatarContentType { get; set; }
        public DateTimeOffset? AvatarUpdatedAt { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset UpdatedAt { get; set; }
    }

    private sealed record PersistedWorkoutPlanJob(
        string JobId,
        CreateWorkoutPlanRequest? Request,
        string Status,
        CreateWorkoutPlanResponse? Result,
        string? Error,
        DateTimeOffset CreatedAt,
        DateTimeOffset UpdatedAt,
        string JobType = "plan",
        CreateWorkoutRewriteRequest? RewriteRequest = null,
        string? UserId = null);
}
