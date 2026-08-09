import { describe, expect, it, vi } from "vitest";

import { cleanupLegacyAuthCredentials } from "../legacyAuthCleanup";

describe("legacy auth credential cleanup", () => {
  it("removes only legacy auth values and writes a marker", async () => {
    const dependencies = {
      deleteSecureValue: vi.fn(async () => undefined),
      getMarker: vi.fn(async () => null),
      removeLegacyAuth: vi.fn(async () => undefined),
      setMarker: vi.fn(async () => undefined)
    };

    await expect(cleanupLegacyAuthCredentials(dependencies)).resolves.toBe("cleaned");
    expect(dependencies.removeLegacyAuth).toHaveBeenCalledOnce();
    expect(dependencies.deleteSecureValue).toHaveBeenCalledWith("gymmin.auth.token.v1");
    expect(dependencies.setMarker).toHaveBeenCalledOnce();
  });

  it("does not repeat cleanup after the marker exists", async () => {
    const dependencies = {
      deleteSecureValue: vi.fn(async () => undefined),
      getMarker: vi.fn(async () => "done"),
      removeLegacyAuth: vi.fn(async () => undefined),
      setMarker: vi.fn(async () => undefined)
    };

    await expect(cleanupLegacyAuthCredentials(dependencies)).resolves.toBe("already-clean");
    expect(dependencies.removeLegacyAuth).not.toHaveBeenCalled();
  });
});
