import { describe, expect, it } from "vitest";

import { createWorkoutExportFilename } from "../workoutExport/workoutExportFilename";

const date = new Date("2026-07-22T12:00:00.000Z");

describe("createWorkoutExportFilename", () => {
  it("uses the workout name, keeps spaces and Polish characters, and removes forbidden characters", () => {
    expect(createWorkoutExportFilename(' FBW siła: dzień/3*?"<>| ', "csv", date))
      .toBe("FBW siła dzień 3.csv");
  });

  it("uses a simple fallback for an empty or fully invalid name", () => {
    expect(createWorkoutExportFilename(" /:*? ", "xlsx", date)).toBe("Trening.xlsx");
  });

  it("bounds very long names and keeps the requested extension", () => {
    const filename = createWorkoutExportFilename("a".repeat(300), "xlsx", date);
    expect(filename).toMatch(/^a{80}\.xlsx$/);
    expect(filename.length).toBeLessThan(100);
  });
});
