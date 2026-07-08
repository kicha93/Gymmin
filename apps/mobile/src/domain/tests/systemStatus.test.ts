import { describe, expect, it } from "vitest";

import {
  createOfflineSystemStatus,
  getSystemStatusCopy,
  normalizeSystemStatusResponse,
  shouldFetchSystemStatus
} from "../systemStatus";

describe("systemStatus", () => {
  it("returns null copy for ok status", () => {
    expect(getSystemStatusCopy({ kind: "ok" }, "pl")).toBeNull();
  });

  it("maps offline copy in Polish", () => {
    const copy = getSystemStatusCopy({ kind: "offline" }, "pl");

    expect(copy?.title).toBe("Nie możemy połączyć się z serwerem");
    expect(copy?.description).toContain("lokalne treningi nadal są bezpieczne");
    expect(copy?.cta).toBe("Spróbuj ponownie");
  });

  it("maps maintenance copy in both languages", () => {
    expect(getSystemStatusCopy({ kind: "maintenance" }, "pl")?.title).toBe("Trwa przerwa techniczna");
    expect(getSystemStatusCopy({ kind: "maintenance" }, "en")?.title).toBe("Maintenance in progress");
  });

  it("uses custom backend message for the active language", () => {
    const copy = getSystemStatusCopy({
      kind: "maintenance",
      message: {
        en: "Maintenance should take a few minutes.",
        pl: "Przerwa potrwa kilka minut."
      }
    }, "pl");

    expect(copy?.description).toBe("Przerwa potrwa kilka minut.");
  });

  it("normalizes failed or invalid backend status to safe defaults", () => {
    expect(normalizeSystemStatusResponse(null).kind).toBe("ok");
    expect(normalizeSystemStatusResponse({ kind: "broken" }).kind).toBe("ok");
    expect(normalizeSystemStatusResponse({ kind: "degraded", updatedAt: "2026-07-06T10:00:00Z" })).toEqual({
      kind: "degraded",
      message: null,
      updatedAt: "2026-07-06T10:00:00Z"
    });
  });

  it("limits automatic refreshes through a cache ttl helper", () => {
    expect(shouldFetchSystemStatus(null, 1000, 5000)).toBe(true);
    expect(shouldFetchSystemStatus(1000, 2000, 5000)).toBe(false);
    expect(shouldFetchSystemStatus(1000, 7000, 5000)).toBe(true);
  });

  it("creates offline status for failed fetches", () => {
    expect(createOfflineSystemStatus("2026-07-06T12:00:00.000Z")).toEqual({
      kind: "offline",
      message: null,
      updatedAt: "2026-07-06T12:00:00.000Z"
    });
  });
});
