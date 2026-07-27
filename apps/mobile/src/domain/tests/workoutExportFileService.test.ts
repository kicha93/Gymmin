import { describe, expect, it, vi } from "vitest";

import {
  exportWorkoutToFile,
  type WorkoutExportFileDependencies
} from "../workoutExport/workoutExportFileService";
import type { WorkoutDraft } from "../workouts";

const workout: WorkoutDraft = { name: "Plan testowy", notes: "", sport: "strength", steps: [] };
const now = new Date("2026-07-22T08:00:00.000Z");

function dependencies() {
  const saveFile = vi.fn(async (
    filename: string,
    _mimeType: string,
    _content: Uint8Array,
    _notificationCopy: { openLabel: string; title: string }
  ) => ({
    notificationShown: true,
    uri: `content://downloads/${filename}`
  }));
  const value: WorkoutExportFileDependencies = {
    now: () => now,
    saveFile
  };
  return { saveFile, value };
}

describe("exportWorkoutToFile", () => {
  it("saves exact UTF-8 CSV bytes with BOM instead of opening a share sheet", async () => {
    const mocks = dependencies();
    const result = await exportWorkoutToFile({ dependencies: mocks.value, format: "csv", locale: "pl", workout });

    expect(result.filename).toBe("Plan testowy.csv");
    expect(mocks.saveFile).toHaveBeenCalledWith(
      result.filename,
      "text/csv",
      expect.any(Uint8Array),
      { openLabel: "Otwórz", title: "Plik treningu został pobrany" }
    );
    expect(result.notificationShown).toBe(true);
    const bytes = mocks.saveFile.mock.calls[0]?.[2] as Uint8Array;
    expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
  });

  it("saves XLSX bytes with the Office Open XML MIME type", async () => {
    const mocks = dependencies();
    const result = await exportWorkoutToFile({ dependencies: mocks.value, format: "xlsx", locale: "en", workout });

    expect(mocks.saveFile).toHaveBeenCalledWith(
      result.filename,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      expect.any(Uint8Array),
      { openLabel: "Open", title: "Workout file downloaded" }
    );
    const bytes = mocks.saveFile.mock.calls[0]?.[2] as Uint8Array;
    expect(Array.from(bytes.slice(0, 2))).toEqual([0x50, 0x4b]);
  });

  it("propagates a save failure without attempting another write", async () => {
    const saveFile = vi.fn(async () => {
      throw new Error("write failed");
    });
    const value: WorkoutExportFileDependencies = { now: () => now, saveFile };

    await expect(exportWorkoutToFile({ dependencies: value, format: "csv", locale: "en", workout }))
      .rejects.toThrow("write failed");
    expect(saveFile).toHaveBeenCalledOnce();
  });
});
