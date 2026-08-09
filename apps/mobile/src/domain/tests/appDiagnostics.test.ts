import { describe, expect, it, vi } from "vitest";

describe("appDiagnostics", () => {
  it("keeps a 100 item safe local ring buffer", async () => {
    vi.resetModules();
    const diagnostics = await import("../appDiagnostics");
    for (let index = 0; index < 101; index += 1) {
      diagnostics.addDiagnosticEvent({
        area: "storage",
        level: "info",
        message: `event-${index}`,
        extra: { token: "secret", count: index }
      });
    }
    const snapshot = diagnostics.getDiagnosticsSnapshot();
    expect(snapshot.recentEvents).toHaveLength(100);
    expect(snapshot.recentEvents[0]?.message).toBe("event-1");
    expect(snapshot.recentEvents[99]?.message).toBe("event-100");
    expect(snapshot.recentEvents[0]?.extra).toEqual({ count: 1 });
  });
});
