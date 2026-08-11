import { describe, expect, it } from "vitest";

import { BUG_REPORT_EMAIL, prepareBugReportEmail } from "../bugReportEmail";

describe("bug report email", () => {
  it("creates a bounded mailto report without private product data", () => {
    const result = prepareBugReportEmail({
      currentScreen: "settings",
      description: `Nie działa zapis ${"x".repeat(5000)}`,
      device: {
        appVersion: "1.0",
        buildVersion: "7",
        model: "Pixel",
        osVersion: "16",
        platform: "android"
      },
      language: "pl",
      recentEvents: Array.from({ length: 12 }, (_, index) => ({
        area: "ui" as const,
        level: "info" as const,
        message: `event ${index}`,
        timestamp: `2026-08-09T10:00:${String(index).padStart(2, "0")}Z`
      })),
      title: "Problem"
    });

    expect(result.mailtoUrl.startsWith(`mailto:${BUG_REPORT_EMAIL}?`)).toBe(true);
    expect(result.body.length).toBeLessThanOrEqual(6000);
    expect(result.body).toContain("event 11");
    expect(result.body).not.toContain("event 0");
    expect(result.body).not.toContain("bearer");
    expect(result.copyText).toContain(`To: ${BUG_REPORT_EMAIL}`);
    expect(result.copyText).toContain("Subject: Gymmin - zgłoszenie błędu - Problem");
  });

  it("localizes the prepared email without sending anything", () => {
    const result = prepareBugReportEmail({
      currentScreen: "settings",
      description: "The save button does not work",
      device: {
        appVersion: "1.1",
        buildVersion: "2",
        model: "Pixel",
        osVersion: "16",
        platform: "android"
      },
      language: "en",
      recentEvents: [],
      title: "Save issue"
    });

    expect(result.subject).toBe("Gymmin - bug report - Save issue");
    expect(result.body).toContain("User description:");
    expect(result.body).toContain("No events.");
  });
});
