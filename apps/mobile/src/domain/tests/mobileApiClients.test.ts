import { describe, expect, it, vi } from "vitest";

import { createMobileApiClients } from "../../api/mobileApiClients";

describe("mobileApiClients", () => {
  it("shares one request transport across typed API clients", async () => {
    const request = vi.fn(async () => new Response(JSON.stringify({
      email: "user@example.com",
      id: "user-1",
      name: "User"
    }), { status: 200 }));
    const clients = createMobileApiClients({
      apiBaseUrl: "https://api.example.com",
      rateLimitMessage: "Too many requests",
      request
    });

    await expect(clients.authApi.getCurrentUser({}, "failed"))
      .resolves.toMatchObject({ id: "user-1" });
    expect(request).toHaveBeenCalledWith("/api/auth/me", { headers: {} });
    expect(Object.keys(clients).sort()).toEqual([
      "accountDataApi",
      "aiCreditsApi",
      "authApi",
      "bugReportsApi",
      "profileApi",
      "workoutCreatorApi"
    ]);
  });
});
