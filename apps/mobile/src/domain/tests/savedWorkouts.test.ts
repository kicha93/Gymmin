import { describe, expect, it } from "vitest";

import { isWorkoutArchived, setWorkoutArchived, type SavedWorkout } from "../savedWorkouts";

const workout: SavedWorkout = {
  draft: { name: "Plan", notes: "", sport: "strength", steps: [] },
  id: "plan-1",
  name: "Plan"
};

describe("savedWorkouts archive state", () => {
  it("archives with a timestamp and restores without changing workout data", () => {
    const archived = setWorkoutArchived(workout, true, new Date("2026-07-27T10:00:00.000Z"));
    expect(archived.archivedAt).toBe("2026-07-27T10:00:00.000Z");
    expect(isWorkoutArchived(archived)).toBe(true);

    const restored = setWorkoutArchived(archived, false);
    expect(restored.archivedAt).toBeNull();
    expect(restored.draft).toBe(workout.draft);
    expect(isWorkoutArchived(restored)).toBe(false);
  });
});
