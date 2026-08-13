import { describe, expect, it } from "vitest";

import { getWeeklyMuscleVolumeLayout, toggleWeeklyMuscleGroup } from "../weeklyMuscleVolumeLayout";

describe("weekly muscle volume responsive layout", () => {
  it("keeps both segmented controls in one row on typical and large phones", () => {
    expect(getWeeklyMuscleVolumeLayout(360).controlsStacked).toBe(false);
    expect(getWeeklyMuscleVolumeLayout(412).controlsStacked).toBe(false);
  });

  it("uses the safe two-row fallback only on extremely narrow screens", () => {
    const layout = getWeeklyMuscleVolumeLayout(320);
    expect(layout.controlsStacked).toBe(true);
    expect(layout.rowMetaStacked).toBe(true);
  });

  it("grows the anatomy column without returning to thumbnail dimensions", () => {
    const small = getWeeklyMuscleVolumeLayout(320);
    const typical = getWeeklyMuscleVolumeLayout(360);
    const large = getWeeklyMuscleVolumeLayout(430);
    expect(small.anatomyWidth).toBeGreaterThanOrEqual(122);
    expect(typical.anatomyWidth).toBeGreaterThan(small.anatomyWidth);
    expect(large.anatomyWidth).toBeGreaterThan(typical.anatomyWidth);
    expect(large.anatomyHeight).toBeGreaterThan(typical.anatomyHeight);
  });
});

describe("weekly muscle visibility", () => {
  it("hides only the selected group and restores it on the next toggle", () => {
    const hidden = toggleWeeklyMuscleGroup(new Set(["back"]), "triceps");
    expect([...hidden]).toEqual(["back", "triceps"]);

    const restored = toggleWeeklyMuscleGroup(hidden, "triceps");
    expect([...restored]).toEqual(["back"]);
  });
});
