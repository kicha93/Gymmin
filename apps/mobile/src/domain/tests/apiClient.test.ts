import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildApiHeaders,
  createApiError,
  requestApi
} from "../../api/apiClient";

describe("apiClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("builds correlated bearer headers without mutating additional headers", () => {
    const additionalHeaders = { "Content-Type": "application/json" };
    const headers = buildApiHeaders({ token: "secret-token" }, additionalHeaders);

    expect(headers.Authorization).toBe("Bearer secret-token");
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["X-Correlation-Id"]).toMatch(/^mobile-/);
    expect(additionalHeaders).toEqual({ "Content-Type": "application/json" });
  });

  it("requests a relative API endpoint and preserves request options", async () => {
    const response = new Response(null, {
      headers: { "X-Correlation-Id": "server-correlation" },
      status: 204
    });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(response);

    await expect(requestApi("https://api.example.com", "/api/settings", {
      headers: { Authorization: "Bearer token" },
      method: "PUT"
    })).resolves.toBe(response);

    expect(fetchMock).toHaveBeenCalledWith("https://api.example.com/api/settings", {
      headers: { Authorization: "Bearer token" },
      method: "PUT"
    });
  });

  it("normalizes structured rate-limit errors", async () => {
    const response = new Response(JSON.stringify({
      error: {
        code: "rate_limited",
        correlationId: "body-correlation",
        message: "server message"
      }
    }), {
      headers: {
        "Content-Type": "application/json",
        "X-Correlation-Id": "header-correlation"
      },
      status: 429
    });

    const error = await createApiError(
      response,
      "/api/workout-creator/plan",
      "POST",
      "fallback",
      "localized limit"
    );

    expect(error.message).toBe("localized limit");
    expect(error.code).toBe("rate_limited");
    expect(error.status).toBe(429);
    expect(error.correlationId).toBe("body-correlation");
  });
});
