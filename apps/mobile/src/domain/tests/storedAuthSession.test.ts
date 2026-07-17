import { describe, expect, it, vi } from "vitest";

import {
  persistStoredAuthSession,
  restoreStoredAuthSession,
  updateStoredAuthUser,
  type StoredAuthDependencies
} from "../../features/auth/authSession";

function storage(raw: string | null, token: string | null) {
  let currentRaw = raw;
  let currentToken = token;
  const dependencies: StoredAuthDependencies = {
    deleteToken: vi.fn(async () => { currentToken = null; }),
    getRaw: vi.fn(async () => currentRaw),
    getToken: vi.fn(async () => currentToken),
    removeRaw: vi.fn(async () => { currentRaw = null; }),
    setRaw: vi.fn(async (value) => { currentRaw = value; }),
    setToken: vi.fn(async (value) => { currentToken = value; })
  };
  return dependencies;
}

const cachedUser = { email: "user@example.com", id: "user-1", name: "Cached" };

describe("restoreStoredAuthSession", () => {
  it("migrates a legacy token and refreshes the cached user", async () => {
    const dependencies = storage(JSON.stringify({ token: " legacy-token ", user: cachedUser }), null);
    const session = await restoreStoredAuthSession({
      dependencies,
      fallbackName: "User",
      getCurrentUser: async () => ({ ...cachedUser, name: "Fresh" })
    });
    expect(session).toMatchObject({ name: "Fresh", token: "legacy-token" });
    expect(dependencies.setToken).toHaveBeenCalledWith("legacy-token");
    expect(dependencies.setRaw).toHaveBeenCalledOnce();
  });

  it("uses a valid cached session when the online check is unavailable", async () => {
    const dependencies = storage(JSON.stringify({ user: cachedUser, version: 2 }), "token");
    await expect(restoreStoredAuthSession({
      dependencies,
      fallbackName: "User",
      getCurrentUser: async () => { throw Object.assign(new Error("offline"), { status: 503 }); }
    })).resolves.toMatchObject({ id: "user-1", name: "Cached" });
  });

  it("clears stored credentials after unauthorized or malformed data", async () => {
    const dependencies = storage(JSON.stringify({ user: cachedUser, version: 2 }), "token");
    await expect(restoreStoredAuthSession({
      dependencies,
      fallbackName: "User",
      getCurrentUser: async () => { throw Object.assign(new Error("unauthorized"), { status: 401 }); }
    })).resolves.toBeNull();
    expect(dependencies.deleteToken).toHaveBeenCalledOnce();
    expect(dependencies.removeRaw).toHaveBeenCalledOnce();

    const malformed = storage(JSON.stringify({ user: { id: "missing-email" } }), "token");
    await expect(restoreStoredAuthSession({
      dependencies: malformed,
      fallbackName: "User",
      getCurrentUser: async () => cachedUser
    })).resolves.toBeNull();
    expect(malformed.deleteToken).toHaveBeenCalledOnce();
  });

  it("persists a new session and updates its cached user", async () => {
    const dependencies = storage(null, null);
    const session = await persistStoredAuthSession({
      token: "token",
      user: cachedUser
    }, "User", dependencies);
    expect(session).toMatchObject({ id: "user-1", token: "token" });
    expect(dependencies.setToken).toHaveBeenCalledWith("token");

    await updateStoredAuthUser({ ...session, emailVerified: true, name: "Updated" }, dependencies);
    const stored = JSON.parse((await dependencies.getRaw()) ?? "null");
    expect(stored).toMatchObject({ user: { emailVerified: true, name: "Updated" }, version: 2 });
  });
});
