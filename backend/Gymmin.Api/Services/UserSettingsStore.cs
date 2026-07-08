using System.Text.Json;
using Gymmin.Api.Domain;

namespace Gymmin.Api.Services;

public interface IUserSettingsStore
{
    UserSettings? Get(string userId);
    UserSettings Upsert(string userId, UpsertUserSettingsRequest request);
}

public sealed class FileBackedUserSettingsStore : IUserSettingsStore, IUserScopedDataStore
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true
    };

    private readonly object _gate = new();
    private readonly string _filePath;
    private readonly ILogger<FileBackedUserSettingsStore> _logger;
    private Dictionary<string, UserSettings> _settingsByUserId = [];

    public FileBackedUserSettingsStore(IWebHostEnvironment environment, ILogger<FileBackedUserSettingsStore> logger)
    {
        _logger = logger;
        var dataDirectory = Path.Combine(environment.ContentRootPath, "App_Data");
        Directory.CreateDirectory(dataDirectory);
        _filePath = Path.Combine(dataDirectory, "user-settings.json");
        _settingsByUserId = Load();
    }

    public UserSettings? Get(string userId)
    {
        lock (_gate)
        {
            return _settingsByUserId.GetValueOrDefault(userId);
        }
    }

    public UserSettings Upsert(string userId, UpsertUserSettingsRequest request)
    {
        lock (_gate)
        {
            var existing = _settingsByUserId.GetValueOrDefault(userId);
            var settings = UserSettings.FromRequest(userId, request, existing);
            _settingsByUserId[userId] = settings;
            Save();
            return settings;
        }
    }

    public bool DeleteUserData(string userId)
    {
        lock (_gate)
        {
            var removed = _settingsByUserId.Remove(userId);
            if (removed)
            {
                Save();
            }

            return removed;
        }
    }

    private Dictionary<string, UserSettings> Load()
    {
        if (!File.Exists(_filePath))
        {
            return [];
        }

        try
        {
            var json = File.ReadAllText(_filePath);
            return JsonSerializer.Deserialize<Dictionary<string, UserSettings>>(json, JsonOptions) ?? [];
        }
        catch (Exception error)
        {
            _logger.LogError(error, "Failed to load user settings store from {FilePath}", _filePath);
            return [];
        }
    }

    private void Save()
    {
        var json = JsonSerializer.Serialize(_settingsByUserId, JsonOptions);
        File.WriteAllText(_filePath, json);
    }
}
