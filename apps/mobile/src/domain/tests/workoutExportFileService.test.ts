import { describe, expect, it, vi } from "vitest";

vi.mock("expo-file-system", () => ({
  File: class {},
  Paths: { cache: {} }
}));
vi.mock("expo-sharing", () => ({
  isAvailableAsync: vi.fn(async () => true),
  shareAsync: vi.fn(async () => undefined)
}));

import {
  exportWorkoutToFile,
  type WorkoutExportFileDependencies,
  WorkoutExportSharingUnavailableError
} from "../workoutExport/workoutExportFileService";
import type { WorkoutDraft } from "../workouts";

const workout: WorkoutDraft = { name: "Plan testowy", notes: "", sport: "strength", steps: [] };
const now = new Date("2026-07-22T08:00:00.000Z");

function dependencies(isAvailable = true) {
  const writeFile = vi.fn(async (filename: string) => `file:///cache/${filename}`);
  const shareFile = vi.fn(async () => undefined);
  const value: WorkoutExportFileDependencies = {
    isSharingAvailable: vi.fn(async () => isAvailable),
    now: () => now,
    shareFile,
    writeFile
  };
  return { shareFile, value, writeFile };
}

describe("exportWorkoutToFile", () => {
  it("writes a CSV to cache and opens sharing with the CSV MIME type", async () => {
    const mocks = dependencies();
    const result = await exportWorkoutToFile({ dependencies: mocks.value, format: "csv", locale: "pl", workout });

    expect(result.filename).toBe("Gymmin_Plan_testowy_2026-07-22.csv");
    expect(mocks.writeFile).toHaveBeenCalledWith(result.filename, expect.stringMatching(/^\uFEFF/));
    expect(mocks.shareFile).toHaveBeenCalledWith(result.uri, {
      dialogTitle: "Eksportuj trening",
      mimeType: "text/csv"
    });
  });

  it("writes XLSX bytes and uses the Office Open XML MIME type", async () => {
    const mocks = dependencies();
    const result = await exportWorkoutToFile({ dependencies: mocks.value, format: "xlsx", locale: "en", workout });

    expect(mocks.writeFile).toHaveBeenCalledWith(result.filename, expect.any(Uint8Array));
    expect(mocks.shareFile).toHaveBeenCalledWith(result.uri, expect.objectContaining({
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    }));
  });

  it("reports unavailable sharing without invoking the share sheet", async () => {
    const mocks = dependencies(false);
    await expect(exportWorkoutToFile({ dependencies: mocks.value, format: "csv", locale: "en", workout }))
      .rejects.toBeInstanceOf(WorkoutExportSharingUnavailableError);
    expect(mocks.writeFile).toHaveBeenCalledOnce();
    expect(mocks.shareFile).not.toHaveBeenCalled();
  });
});
