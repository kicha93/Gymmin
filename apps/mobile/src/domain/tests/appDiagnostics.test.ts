import { describe, expect, it, vi } from "vitest";

describe("appDiagnostics", () => {
  async function freshDiagnostics() {
    vi.resetModules();
    return import("../appDiagnostics");
  }

  it("keeps a 100 item ring buffer and preserves order", async () => {
    const diagnostics = await freshDiagnostics();

    for (let index = 0; index < 105; index += 1) {
      diagnostics.addDiagnosticEvent({
        area: "sync",
        level: "info",
        message: `event-${index}`
      });
    }

    const snapshot = diagnostics.getDiagnosticsSnapshot();
    expect(snapshot.recentEvents).toHaveLength(100);
    expect(snapshot.recentEvents[0].message).toBe("event-5");
    expect(snapshot.recentEvents[99].message).toBe("event-104");
  });

  it("sanitizes sensitive extra fields and records correlation ids", async () => {
    const diagnostics = await freshDiagnostics();

    diagnostics.addDiagnosticEvent({
      area: "api",
      correlationId: "corr-1",
      extra: {
        password: "secret",
        token: "token",
        safe: "visible"
      },
      level: "error",
      message: "failed"
    });
    diagnostics.recordApiError({
      correlationId: "corr-2",
      endpoint: "/api/test",
      message: "Server failed",
      method: "GET",
      status: 500
    });

    const snapshot = diagnostics.getDiagnosticsSnapshot();
    expect(snapshot.lastCorrelationIds.slice(0, 2)).toEqual(["corr-2", "corr-1"]);
    expect(snapshot.recentEvents[0].extra).toEqual({ safe: "visible" });
    expect(snapshot.lastApiError?.correlationId).toBe("corr-2");
  });
});
