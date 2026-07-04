import { describe, expect, it } from "vitest";

import { applyAvatarResponse, buildAvatarImageUri } from "../avatar";

describe("avatar", () => {
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
});
