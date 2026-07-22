import { describe, expect, it } from "vitest";

import { createWorkoutExportFilename } from "../workoutExport/workoutExportFilename";

const date = new Date("2026-07-22T12:00:00.000Z");

describe("createWorkoutExportFilename", () => {
  it("keeps Polish characters, replaces spaces and removes forbidden characters", () => {
    expect(createWorkoutExportFilename(' FBW siła: dzień/3*?"<>| ', "csv", date))
      .toBe("Gymmin_FBW_siła_dzień_3_2026-07-22.csv");
  });

  it("uses a fallback for an empty or fully invalid name", () => {
    expect(createWorkoutExportFilename(" /:*? ", "xlsx", date)).toBe("Gymmin_trening_2026-07-22.xlsx");
  });

  it("bounds very long names and keeps the requested extension", () => {
    const filename = createWorkoutExportFilename("a".repeat(300), "xlsx", date);
    expect(filename).toMatch(/^Gymmin_a{80}_2026-07-22\.xlsx$/);
    expect(filename.length).toBeLessThan(120);
  });
});
