import { describe, expect, it, vi } from "vitest";

import { createProfileApiClient } from "../../api/profileApi";

function createClient(response: Response) {
  const request = vi.fn(async () => response);
  const createError = vi.fn(async (failedResponse: Response) => {
    const error = new Error("request failed") as Error & { status?: number };
    error.status = failedResponse.status;
    return error;
  });
  return { client: createProfileApiClient({ createError, request }), createError, request };
}

describe("profileApi", () => {
  it("normalizes a successful avatar response", async () => {
    const { client } = createClient(new Response(JSON.stringify({
      avatarUpdatedAt: "2026-07-17T07:00:00.000Z",
      avatarUrl: "/api/profile/avatar"
    }), { status: 200 }));

    await expect(client.uploadAvatar(new FormData(), {}, "failed")).resolves.toEqual({
      avatarUpdatedAt: "2026-07-17T07:00:00.000Z",
      avatarUrl: "/api/profile/avatar"
    });
  });

  it("uses an empty avatar fallback for a successful delete without JSON", async () => {
    const { client } = createClient(new Response(null, { status: 204 }));

    await expect(client.removeAvatar({}, "failed")).resolves.toEqual({
      avatarUpdatedAt: null,
      avatarUrl: null
    });
  });

  it("preserves a forbidden account-deletion status", async () => {
    const { client } = createClient(new Response("{}", { status: 403 }));

    await expect(client.deleteAccount("wrong-password", {}, "failed"))
      .rejects.toMatchObject({ status: 403 });
  });
});
