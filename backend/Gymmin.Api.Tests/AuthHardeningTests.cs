using System.Net;
using System.Net.Http.Json;
using Gymmin.Api.Data;
using Gymmin.Api.Domain;
using Gymmin.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Gymmin.Api.Tests;

public sealed class AuthHardeningTests : IClassFixture<GymminApiFactory>
{
    private readonly GymminApiFactory _factory;

    public AuthHardeningTests(GymminApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Expired_and_revoked_tokens_return_unauthorized()
    {
        using var client = _factory.CreateClient();
        var auth = await TestPayloads.RegisterAsync(client, "expiry");
        client.Authorize(auth.Token);

        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/auth/me")).StatusCode);

        await MutateCurrentSessionAsync(auth.User.Id, session =>
        {
            session.ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(-1);
        });

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/me")).StatusCode);

        var login = await TestPayloads.LoginAsync(client, auth.User.Email);
        client.Authorize(login.Token);
        await MutateCurrentSessionAsync(auth.User.Id, session =>
        {
            session.RevokedAt = DateTimeOffset.UtcNow;
            session.RevokedReason = "test";
        });

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/me")).StatusCode);
    }

    [Fact]
    public async Task Sessions_api_lists_and_revokes_sessions()
    {
        using var client = _factory.CreateClient();
        var auth = await TestPayloads.RegisterAsync(client, "sessions");
        var secondLogin = await TestPayloads.LoginAsync(client, auth.User.Email);
        client.Authorize(secondLogin.Token);

        var sessionsResponse = await client.GetAsync("/api/auth/sessions");
        Assert.Equal(HttpStatusCode.OK, sessionsResponse.StatusCode);
        var sessionsJson = await sessionsResponse.Content.ReadAsStringAsync();
        Assert.DoesNotContain("tokenHash", sessionsJson, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("reset", sessionsJson, StringComparison.OrdinalIgnoreCase);
        var sessions = await sessionsResponse.Content.ReadFromJsonAsync<AuthSessionsResponse>(TestJson.Options);
        Assert.NotNull(sessions);
        Assert.True(sessions!.Sessions.Count >= 2);
        Assert.Contains(sessions.Sessions, session => session.IsCurrent);

        var nonCurrent = sessions.Sessions.First(session => !session.IsCurrent);
        var delete = await client.DeleteAsync($"/api/auth/sessions/{nonCurrent.Id}");
        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);

        var afterDelete = await client.GetFromJsonAsync<AuthSessionsResponse>("/api/auth/sessions", TestJson.Options);
        Assert.DoesNotContain(afterDelete!.Sessions, session => session.Id == nonCurrent.Id);

        var logoutAll = await client.PostAsJsonAsync("/api/auth/logout-all", new LogoutAllRequest(false));
        Assert.Equal(HttpStatusCode.NoContent, logoutAll.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/me")).StatusCode);
    }

    [Fact]
    public async Task Sessions_api_repairs_current_session_device_name_from_request_metadata()
    {
        using var client = _factory.CreateClient();
        var auth = await TestPayloads.RegisterAsync(client, "session-device-name");
        client.Authorize(auth.Token);
        client.DefaultRequestHeaders.Add("X-Gymmin-Device-Name", "Google Pixel 8 · Android 15");

        var response = await client.GetFromJsonAsync<AuthSessionsResponse>("/api/auth/sessions", TestJson.Options);

        var currentSession = Assert.Single(response!.Sessions, session => session.IsCurrent);
        Assert.Equal("Google Pixel 8 · Android 15", currentSession.DeviceName);

        client.DefaultRequestHeaders.Remove("X-Gymmin-Device-Name");
        var persistedResponse = await client.GetFromJsonAsync<AuthSessionsResponse>("/api/auth/sessions", TestJson.Options);
        Assert.Equal(
            "Google Pixel 8 · Android 15",
            Assert.Single(persistedResponse!.Sessions, session => session.IsCurrent).DeviceName);
    }

    [Fact]
    public async Task Sessions_api_replaces_legacy_unknown_device_with_android_fallback()
    {
        using var client = _factory.CreateClient();
        var auth = await TestPayloads.RegisterAsync(client, "legacy-session-device-name");
        client.Authorize(auth.Token);
        client.DefaultRequestHeaders.UserAgent.ParseAdd("okhttp/4.9.2");

        var response = await client.GetFromJsonAsync<AuthSessionsResponse>("/api/auth/sessions", TestJson.Options);

        Assert.Equal("Android", Assert.Single(response!.Sessions, session => session.IsCurrent).DeviceName);
    }

    [Fact]
    public async Task User_cannot_revoke_another_users_session()
    {
        using var client = _factory.CreateClient();
        var owner = await TestPayloads.RegisterAsync(client, "session-owner");
        var intruder = await TestPayloads.RegisterAsync(client, "session-intruder");

        client.Authorize(owner.Token);
        var ownerSessions = await client.GetFromJsonAsync<AuthSessionsResponse>("/api/auth/sessions", TestJson.Options);
        var ownerSessionId = ownerSessions!.Sessions.Single(session => session.IsCurrent).Id;

        client.Authorize(intruder.Token);
        var delete = await client.DeleteAsync($"/api/auth/sessions/{ownerSessionId}");
        Assert.Equal(HttpStatusCode.NotFound, delete.StatusCode);
    }

    [Fact]
    public async Task Change_password_keeps_current_session_and_revokes_other_sessions()
    {
        using var client = _factory.CreateClient();
        var auth = await TestPayloads.RegisterAsync(client, "change-password");
        var otherSession = await TestPayloads.LoginAsync(client, auth.User.Email);
        client.Authorize(auth.Token);

        var tooShort = await client.PostAsJsonAsync("/api/auth/change-password", new ChangePasswordRequest("pass1234", "short"));
        Assert.Equal(HttpStatusCode.BadRequest, tooShort.StatusCode);

        var wrongCurrent = await client.PostAsJsonAsync("/api/auth/change-password", new ChangePasswordRequest("bad-password", "newpass1234"));
        Assert.Equal(HttpStatusCode.BadRequest, wrongCurrent.StatusCode);

        var changed = await client.PostAsJsonAsync("/api/auth/change-password", new ChangePasswordRequest("pass1234", "newpass1234"));
        Assert.Equal(HttpStatusCode.NoContent, changed.StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/auth/me")).StatusCode);

        using var otherClient = _factory.CreateClient();
        otherClient.Authorize(otherSession.Token);
        Assert.Equal(HttpStatusCode.Unauthorized, (await otherClient.GetAsync("/api/auth/me")).StatusCode);

        var oldPasswordLogin = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(auth.User.Email, "pass1234"));
        Assert.Equal(HttpStatusCode.Unauthorized, oldPasswordLogin.StatusCode);

        var newPasswordLogin = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(auth.User.Email, "newpass1234"));
        Assert.Equal(HttpStatusCode.OK, newPasswordLogin.StatusCode);
    }

    [Fact]
    public async Task Password_reset_is_neutral_and_changes_password_with_one_time_token()
    {
        using var client = _factory.CreateClient();
        var auth = await TestPayloads.RegisterAsync(client, "reset");
        var secondSession = await TestPayloads.LoginAsync(client, auth.User.Email);

        var missing = await client.PostAsJsonAsync("/api/auth/password-reset/request", new PasswordResetRequest("missing@example.com"));
        Assert.Equal(HttpStatusCode.NoContent, missing.StatusCode);
        Assert.Equal("", await missing.Content.ReadAsStringAsync());

        var request = await client.PostAsJsonAsync("/api/auth/password-reset/request", new PasswordResetRequest(auth.User.Email));
        Assert.Equal(HttpStatusCode.NoContent, request.StatusCode);
        Assert.Equal("", await request.Content.ReadAsStringAsync());
        Assert.Equal(auth.User.Email, _factory.PasswordResetEmailSender.LastEmail);
        Assert.False(string.IsNullOrWhiteSpace(_factory.PasswordResetEmailSender.LastToken));
        await AssertResetTokenIsStoredHashedAsync(_factory.PasswordResetEmailSender.LastToken!);

        var wrongToken = await client.PostAsJsonAsync("/api/auth/password-reset/confirm", new PasswordResetConfirmRequest("bad-token", "resetpass1234"));
        Assert.Equal(HttpStatusCode.BadRequest, wrongToken.StatusCode);

        var confirm = await client.PostAsJsonAsync(
            "/api/auth/password-reset/confirm",
            new PasswordResetConfirmRequest(_factory.PasswordResetEmailSender.LastToken!, "resetpass1234"));
        Assert.Equal(HttpStatusCode.NoContent, confirm.StatusCode);

        var reuse = await client.PostAsJsonAsync(
            "/api/auth/password-reset/confirm",
            new PasswordResetConfirmRequest(_factory.PasswordResetEmailSender.LastToken!, "anotherpass1234"));
        Assert.Equal(HttpStatusCode.BadRequest, reuse.StatusCode);

        using var secondClient = _factory.CreateClient();
        secondClient.Authorize(secondSession.Token);
        Assert.Equal(HttpStatusCode.Unauthorized, (await secondClient.GetAsync("/api/auth/me")).StatusCode);

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(auth.User.Email, "pass1234"))).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(auth.User.Email, "resetpass1234"))).StatusCode);
    }

    [Fact]
    public async Task Expired_password_reset_token_is_rejected()
    {
        using var client = _factory.CreateClient();
        var auth = await TestPayloads.RegisterAsync(client, "expired-reset");

        await client.PostAsJsonAsync("/api/auth/password-reset/request", new PasswordResetRequest(auth.User.Email));
        var token = _factory.PasswordResetEmailSender.LastToken!;

        await using var scope = _factory.Services.CreateAsyncScope();
        var dbFactory = scope.ServiceProvider.GetRequiredService<IDbContextFactory<GymminDbContext>>();
        await using var db = await dbFactory.CreateDbContextAsync();
        var resetToken = db.PasswordResetTokens.AsEnumerable().OrderByDescending(item => item.CreatedAt).First();
        resetToken.ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(-1);
        await db.SaveChangesAsync();

        var confirm = await client.PostAsJsonAsync("/api/auth/password-reset/confirm", new PasswordResetConfirmRequest(token, "resetpass1234"));
        Assert.Equal(HttpStatusCode.BadRequest, confirm.StatusCode);
    }

    [Fact]
    public void Auth_rate_limiter_blocks_after_configured_limit()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Gymmin:Auth:RateLimits:Enabled"] = "true",
                ["Gymmin:Auth:RateLimits:Login:Limit"] = "2",
                ["Gymmin:Auth:RateLimits:Login:WindowMinutes"] = "5"
            })
            .Build();

        var limiter = new AuthRateLimiter(configuration);
        var key = AuthRateLimiter.BuildKey("127.0.0.1", "user@example.com");

        Assert.True(limiter.TryConsume("Login", key));
        Assert.True(limiter.TryConsume("Login", key));
        Assert.False(limiter.TryConsume("Login", key));
    }

    private async Task MutateCurrentSessionAsync(string userId, Action<UserSessionEntity> mutate)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var dbFactory = scope.ServiceProvider.GetRequiredService<IDbContextFactory<GymminDbContext>>();
        await using var db = await dbFactory.CreateDbContextAsync();
        var session = db.UserSessions
            .Where(item => item.UserId == userId)
            .AsEnumerable()
            .OrderByDescending(item => item.CreatedAt)
            .First();
        mutate(session);
        await db.SaveChangesAsync();
    }

    private async Task AssertResetTokenIsStoredHashedAsync(string plainTextToken)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var dbFactory = scope.ServiceProvider.GetRequiredService<IDbContextFactory<GymminDbContext>>();
        await using var db = await dbFactory.CreateDbContextAsync();
        var resetToken = db.PasswordResetTokens.AsEnumerable().OrderByDescending(item => item.CreatedAt).First();
        Assert.NotEqual(plainTextToken, resetToken.TokenHash);
        Assert.False(string.IsNullOrWhiteSpace(resetToken.TokenHash));
    }
}
