using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Gymmin.Api.Data;
using Gymmin.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Gymmin.Api.Tests;

public sealed class ProfileAvatarApiTests : IClassFixture<GymminApiFactory>
{
    private static readonly byte[] PngBytes =
    [
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52
    ];

    private readonly GymminApiFactory _factory;

    public ProfileAvatarApiTests(GymminApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Avatar_endpoints_require_authentication()
    {
        using var client = _factory.CreateClient();

        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/profile/avatar")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsync("/api/profile/avatar", CreateAvatarContent(PngBytes, "image/png"))).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.DeleteAsync("/api/profile/avatar")).StatusCode);
    }

    [Fact]
    public async Task User_can_upload_fetch_and_delete_avatar()
    {
        using var client = _factory.CreateClient();
        var auth = await TestPayloads.RegisterAsync(client, "avatar");
        client.Authorize(auth.Token);

        var upload = await client.PostAsync("/api/profile/avatar", CreateAvatarContent(PngBytes, "image/png"));
        Assert.Equal(HttpStatusCode.OK, upload.StatusCode);

        var uploadBody = await upload.Content.ReadFromJsonAsync<AvatarUploadResponse>();
        Assert.NotNull(uploadBody);
        Assert.StartsWith("/api/profile/avatar", uploadBody!.AvatarUrl);
        Assert.NotNull(uploadBody.AvatarUpdatedAt);

        var avatar = await client.GetAsync("/api/profile/avatar");
        Assert.Equal(HttpStatusCode.OK, avatar.StatusCode);
        Assert.Equal("image/png", avatar.Content.Headers.ContentType?.MediaType);
        Assert.Contains("private", avatar.Headers.CacheControl?.ToString() ?? "");
        Assert.Equal(PngBytes, await avatar.Content.ReadAsByteArrayAsync());

        using (var scope = _factory.Services.CreateScope())
        {
            var dbFactory = scope.ServiceProvider.GetRequiredService<IDbContextFactory<GymminDbContext>>();
            await using var db = await dbFactory.CreateDbContextAsync();
            var storedUser = await db.Users.AsNoTracking().SingleAsync(user => user.Id == auth.User.Id);
            Assert.Equal(PngBytes, storedUser.AvatarContent);
            Assert.Equal("image/png", storedUser.AvatarContentType);
        }

        var me = await client.GetFromJsonAsync<AuthUserResponse>("/api/auth/me");
        Assert.NotNull(me);
        Assert.Equal(uploadBody.AvatarUrl, me!.AvatarUrl);
        Assert.Equal(uploadBody.AvatarUpdatedAt, me.AvatarUpdatedAt);
        Assert.NotNull(me.CreatedOn);
        Assert.NotNull(me.ModifiedOn);
        Assert.True(me.ModifiedOn >= me.CreatedOn);

        var delete = await client.DeleteAsync("/api/profile/avatar");
        Assert.Equal(HttpStatusCode.OK, delete.StatusCode);

        var afterDelete = await client.GetAsync("/api/profile/avatar");
        Assert.Equal(HttpStatusCode.NotFound, afterDelete.StatusCode);

        using (var scope = _factory.Services.CreateScope())
        {
            var dbFactory = scope.ServiceProvider.GetRequiredService<IDbContextFactory<GymminDbContext>>();
            await using var db = await dbFactory.CreateDbContextAsync();
            var storedUser = await db.Users.AsNoTracking().SingleAsync(user => user.Id == auth.User.Id);
            Assert.Null(storedUser.AvatarContent);
        }

        var meAfterDelete = await client.GetFromJsonAsync<AuthUserResponse>("/api/auth/me");
        Assert.Null(meAfterDelete!.AvatarUrl);
        Assert.Null(meAfterDelete.AvatarUpdatedAt);
        Assert.NotNull(meAfterDelete.CreatedOn);
        Assert.NotNull(meAfterDelete.ModifiedOn);
        Assert.Equal(me.CreatedOn, meAfterDelete.CreatedOn);
        Assert.True(meAfterDelete.ModifiedOn >= me.ModifiedOn);
    }

    [Theory]
    [InlineData("text/plain", new byte[] { 0x41, 0x42, 0x43 }, HttpStatusCode.BadRequest)]
    [InlineData("image/png", new byte[] { 0x41, 0x42, 0x43 }, HttpStatusCode.BadRequest)]
    public async Task Upload_rejects_unsupported_or_mismatched_files(string contentType, byte[] bytes, HttpStatusCode expectedStatus)
    {
        using var client = _factory.CreateClient();
        var auth = await TestPayloads.RegisterAsync(client, "avatar-validation");
        client.Authorize(auth.Token);

        var response = await client.PostAsync("/api/profile/avatar", CreateAvatarContent(bytes, contentType));
        Assert.Equal(expectedStatus, response.StatusCode);
    }

    [Fact]
    public async Task Upload_rejects_empty_and_too_large_files()
    {
        using var client = _factory.CreateClient();
        var auth = await TestPayloads.RegisterAsync(client, "avatar-size");
        client.Authorize(auth.Token);

        var empty = await client.PostAsync("/api/profile/avatar", CreateAvatarContent([], "image/png"));
        Assert.Equal(HttpStatusCode.BadRequest, empty.StatusCode);

        var tooLarge = new byte[2 * 1024 * 1024 + 1];
        PngBytes.CopyTo(tooLarge, 0);
        var large = await client.PostAsync("/api/profile/avatar", CreateAvatarContent(tooLarge, "image/png"));
        Assert.Equal(HttpStatusCode.RequestEntityTooLarge, large.StatusCode);
    }

    [Fact]
    public async Task Users_cannot_read_each_others_avatar()
    {
        using var client = _factory.CreateClient();
        var userA = await TestPayloads.RegisterAsync(client, "avatar-a");
        var userB = await TestPayloads.RegisterAsync(client, "avatar-b");

        client.Authorize(userA.Token);
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsync("/api/profile/avatar", CreateAvatarContent(PngBytes, "image/png"))).StatusCode);

        client.Authorize(userB.Token);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/api/profile/avatar")).StatusCode);
    }

    private static MultipartFormDataContent CreateAvatarContent(byte[] bytes, string contentType)
    {
        var form = new MultipartFormDataContent();
        var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        form.Add(file, "avatar", "avatar.png");
        return form;
    }

    private sealed record AvatarUploadResponse(
        string? AvatarUrl,
        DateTimeOffset? AvatarUpdatedAt);
}
