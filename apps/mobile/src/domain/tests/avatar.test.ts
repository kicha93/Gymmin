import { describe, expect, it } from "vitest";

import {
  applyAvatarResponse,
  buildAvatarImageSource,
  resolveAvatarImageSource,
  buildAvatarImageUri,
  getAvatarExtension,
  getSafeAvatarCacheKey
} from "../avatar";

describe("avatar", () => {
  it("only renders remote avatars on web and waits for the protected native cache", () => {
    const remoteSource = {
      headers: { Authorization: "Bearer token" },
      uri: "https://api.gymmin.app/api/profile/avatar?v=1"
    };

    expect(resolveAvatarImageSource({
      cachedUri: null,
      hasLoadFailed: false,
      isWeb: false,
      remoteSource
    })).toBeNull();
    expect(resolveAvatarImageSource({
      cachedUri: "file:///avatar.jpg",
      hasLoadFailed: false,
      isWeb: false,
      remoteSource
    })).toEqual({ uri: "file:///avatar.jpg" });
    expect(resolveAvatarImageSource({
      cachedUri: null,
      hasLoadFailed: true,
      isWeb: false,
      remoteSource
    })).toBeNull();
    expect(resolveAvatarImageSource({
      cachedUri: null,
      hasLoadFailed: false,
      isWeb: true,
      remoteSource
    })).toEqual(remoteSource);
  });

  it("builds absolute URLs for relative backend avatar paths", () => {
    expect(buildAvatarImageUri("https://api.gymmin.app/", {
      avatarUpdatedAt: "2026-07-04T10:00:00Z",
      avatarUrl: "/api/profile/avatar"
    })).toBe("https://api.gymmin.app/api/profile/avatar?v=2026-07-04T10%3A00%3A00Z");
  });

  it("does not duplicate an existing cache buster", () => {
    expect(buildAvatarImageUri("https://api.gymmin.app", {
      avatarUpdatedAt: "2026-07-04T10:00:00Z",
      avatarUrl: "/api/profile/avatar?v=123"
    })).toBe("https://api.gymmin.app/api/profile/avatar?v=123");
  });

  it("keeps absolute URLs and returns null for missing avatars", () => {
    expect(buildAvatarImageUri("https://api.gymmin.app", {
      avatarUrl: "https://cdn.example.com/avatar.jpg"
    })).toBe("https://cdn.example.com/avatar.jpg");
    expect(buildAvatarImageUri("https://api.gymmin.app", null)).toBeNull();
  });

  it("adds bearer auth headers for protected backend avatar images", () => {
    expect(buildAvatarImageSource("https://api.gymmin.app", {
      avatarUpdatedAt: "2026-07-04T10:00:00Z",
      avatarUrl: "/api/profile/avatar",
      token: "auth-token"
    })).toEqual({
      headers: {
        Authorization: "Bearer auth-token"
      },
      uri: "https://api.gymmin.app/api/profile/avatar?v=2026-07-04T10%3A00%3A00Z"
    });

    expect(buildAvatarImageSource("https://api.gymmin.app", {
      avatarUrl: "https://api.gymmin.app/api/profile/avatar",
      token: "auth-token"
    })).toEqual({
      headers: {
        Authorization: "Bearer auth-token"
      },
      uri: "https://api.gymmin.app/api/profile/avatar"
    });

    expect(buildAvatarImageSource("https://api.gymmin.app", {
      avatarUrl: "/api/profile/avatar"
    })).toEqual({
      uri: "https://api.gymmin.app/api/profile/avatar"
    });
  });

  it("never sends the bearer token to an external avatar origin", () => {
    expect(buildAvatarImageSource("https://api.gymmin.app", {
      avatarUrl: "https://cdn.example.com/avatar.jpg",
      token: "auth-token"
    })).toEqual({
      uri: "https://cdn.example.com/avatar.jpg"
    });

    expect(buildAvatarImageSource("https://api.gymmin.app", {
      avatarUrl: "https://api.gymmin.app.evil.example/avatar.jpg",
      token: "auth-token"
    })).toEqual({
      uri: "https://api.gymmin.app.evil.example/avatar.jpg"
    });
  });

  it("applies upload and delete responses to the current user", () => {
    const user = { id: "user-1", avatarUrl: null, avatarUpdatedAt: null };
    const updated = applyAvatarResponse(user, {
      avatarUpdatedAt: "2026-07-04T10:00:00Z",
      avatarUrl: "/api/profile/avatar?v=1"
    });
    expect(updated).toEqual({
      id: "user-1",
      avatarUpdatedAt: "2026-07-04T10:00:00Z",
      avatarUrl: "/api/profile/avatar?v=1"
    });

    expect(applyAvatarResponse(updated, { avatarUrl: null, avatarUpdatedAt: null })).toEqual({
      id: "user-1",
      avatarUpdatedAt: null,
      avatarUrl: null
    });
  });

  it("normalizes safe local cache names and supported image content types", () => {
    expect(getSafeAvatarCacheKey("user/../../one@example.com")).toBe("user_______one_example_com");
    expect(getAvatarExtension("image/jpeg; charset=binary")).toBe("jpg");
    expect(getAvatarExtension("image/png")).toBe("png");
    expect(getAvatarExtension("image/webp")).toBe("webp");
    expect(getAvatarExtension("text/html")).toBeNull();
  });
});
