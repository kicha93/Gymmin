import { describe, expect, it, vi } from "vitest";

import { createAuthApiClient, normalizeAuthSessionsResponse } from "../../api/authApi";

function createClient(response: Response) {
  const request = vi.fn(async () => response);
  const createError = vi.fn(async (failedResponse: Response) => {
    const error = new Error("request failed") as Error & { status?: number };
    error.status = failedResponse.status;
    return error;
  });
  return { client: createAuthApiClient({ createError, request }), createError, request };
}

describe("authApi", () => {
  it("validates authentication responses", async () => {
    const { client } = createClient(new Response(JSON.stringify({
      token: "token-a",
      user: { email: "user@example.com", id: "user-a", name: "User" }
    }), { status: 200 }));

    await expect(client.authenticate("login", { email: "user@example.com" }, {}, "failed"))
      .resolves.toMatchObject({ token: "token-a", user: { id: "user-a" } });
  });

  it("rejects malformed successful authentication responses", async () => {
    const { client } = createClient(new Response(JSON.stringify({ token: "" }), { status: 200 }));

    await expect(client.authenticate("login", {}, {}, "invalid response"))
      .rejects.toThrow("invalid response");
  });

  it("routes unsuccessful statuses through the shared API error factory", async () => {
    const { client, createError } = createClient(new Response("{}", { status: 429 }));

    await expect(client.requestPasswordReset("user@example.com", {}, "failed"))
      .rejects.toMatchObject({ status: 429 });
    expect(createError).toHaveBeenCalledWith(expect.any(Response), "/api/auth/password-reset/request", "POST", "failed");
  });

  it("filters malformed active session records", () => {
    expect(normalizeAuthSessionsResponse({
      sessions: [
        null,
        {},
        {
          createdAt: "2026-01-01T10:00:00.000Z",
          expiresAt: "2026-02-01T10:00:00.000Z",
          id: "session-a",
          isCurrent: true,
          lastSeenAt: "2026-01-02T10:00:00.000Z"
        }
      ]
    })).toHaveLength(1);
  });

  it("does not treat a failed logout-all response as success", async () => {
    const { client } = createClient(new Response("{}", { status: 503 }));

    await expect(client.logoutAll({}, "failed")).rejects.toMatchObject({ status: 503 });
  });

  it("validates current-user responses and supports current-session logout", async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ email: "user@example.com", id: "user-a", name: "User" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const client = createAuthApiClient({
      createError: async () => new Error("request failed"),
      request
    });

    await expect(client.getCurrentUser({}, "failed")).resolves.toMatchObject({ id: "user-a" });
    await expect(client.logout({}, "failed")).resolves.toBeUndefined();
    expect(request).toHaveBeenLastCalledWith("/api/auth/logout", expect.objectContaining({ method: "POST" }));
  });
});
