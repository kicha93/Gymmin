using Gymmin.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Gymmin.Api.Services;

public interface IUserScopedDataStore
{
    bool DeleteUserData(string userId);
}

public interface IAccountDeletionService
{
    bool DeleteAccount(string userId);
}

public sealed class EfAccountDeletionService : IAccountDeletionService
{
    private readonly IDbContextFactory<GymminDbContext> _dbFactory;
    private readonly IUserAvatarStorage _avatars;

    public EfAccountDeletionService(IDbContextFactory<GymminDbContext> dbFactory, IUserAvatarStorage avatars)
    {
        _dbFactory = dbFactory;
        _avatars = avatars;
    }

    public bool DeleteAccount(string userId)
    {
        using var db = _dbFactory.CreateDbContext();
        var user = db.Users.FirstOrDefault(item => item.Id == userId);
        if (user is null)
        {
            return false;
        }

        _avatars.Delete(userId);
        foreach (var report in db.BugReports.Where(report => report.ReporterUserId == userId))
        {
            report.ReporterUserId = null;
            report.DiagnosticsJson = BugReportDiagnosticsSanitizer.RemoveAccountIdentifiers(report.DiagnosticsJson, userId);
            report.UpdatedAt = DateTimeOffset.UtcNow;
        }
        db.Users.Remove(user);
        db.SaveChanges();
        return true;
    }
}

public sealed class FileBackedAccountDeletionService : IAccountDeletionService
{
    private readonly IUserAvatarStorage _avatars;
    private readonly IEnumerable<object> _stores;

    public FileBackedAccountDeletionService(
        IUserAvatarStorage avatars,
        IUserStore users,
        IUserSettingsStore settings,
        IWorkoutStore workouts,
        IWorkoutPlanJobStore jobs,
        IFavoriteExerciseStore favorites,
        IWorkoutSessionStore workoutSessions,
        IAchievementStore achievements,
        IAiCreditService credits,
        IAiCreditPurchaseService purchases,
        IBugReportStore bugReports)
    {
        _avatars = avatars;
        _stores =
        [
            settings,
            workouts,
            jobs,
            favorites,
            workoutSessions,
            achievements,
            credits,
            purchases,
            bugReports,
            users
        ];
    }

    public bool DeleteAccount(string userId)
    {
        _avatars.Delete(userId);
        var removedUser = false;
        foreach (var store in _stores.OfType<IUserScopedDataStore>())
        {
            var removed = store.DeleteUserData(userId);
            removedUser = removedUser || store is IUserStore && removed;
        }

        return removedUser;
    }
}
