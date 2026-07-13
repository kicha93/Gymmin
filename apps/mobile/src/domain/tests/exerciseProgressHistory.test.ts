import { describe, expect, it } from "vitest";

import {
  filterExerciseProgressHistoryGroups,
  formatExerciseProgressMetric,
  formatExerciseProgressSeriesValue,
  formatExerciseProgressSetCount,
  getExerciseProgressHistoryGroups
} from "../exerciseProgressHistory";
import type { WorkoutSession, WorkoutSessionEntry } from "../workoutSessions";

function entry(id: string, setIteration: number, weight: string, reps: string, exerciseName = "Bench"): WorkoutSessionEntry {
  return {
    actualReps: reps,
    actualWeight: weight,
    elementIndex: 0,
    exerciseName,
    id,
    isCompleted: true,
    seriesIndex: 0,
    setIteration,
    sourceElementId: "bench-element",
    sourceStageId: "stage-1",
    stageIndex: 0,
    type: "exercise"
  };
}

function session(id: string, startedAt: string, entries: WorkoutSessionEntry[], status: WorkoutSession["status"] = "completed"): WorkoutSession {
  return {
    deletedAt: null,
    entries,
    executionMode: "guided",
    id,
    planSnapshot: { name: "FBW A", notes: "", sport: "strength", steps: [] },
    sourceWorkoutId: "fbw-a",
    sourceWorkoutName: "FBW A",
    startedAt,
    status
  };
}

describe("exercise progress history", () => {
  it("formats metrics with a localized decimal separator and missing-data fallback", () => {
    expect(formatExerciseProgressMetric(15.8, "kg", "pl")).toBe("15,8 kg");
    expect(formatExerciseProgressMetric(15.8, "kg", "en")).toBe("15.8 kg");
    expect(formatExerciseProgressMetric(80, "kg", "pl")).toBe("80 kg");
    expect(formatExerciseProgressMetric(null, "kg", "pl")).toBe("—");
  });

  it("groups sets from one exercise execution within a session", () => {
    const groups = getExerciseProgressHistoryGroups([
      session("one", "2026-07-08T15:30:00.000Z", [
        entry("one-1", 1, "80", "5"),
        entry("one-2", 2, "80", "6"),
        entry("one-3", 3, "80", "6"),
        entry("one-4", 4, "80", "6")
      ]),
      session("two", "2026-07-02T18:20:00.000Z", [entry("two-1", 1, "75", "5")])
    ], "name:bench");

    expect(groups).toHaveLength(2);
    expect(groups[0].entries).toHaveLength(4);
    expect(groups[0].totalVolume).toBe(1840);
    expect(groups[0].bestWeight).toBe(80);
    expect(groups[0].bestReps).toBe(6);
  });

  it("keeps repeated placements of the same exercise together in one workout session", () => {
    const first = entry("first", 1, "80", "5");
    const second = { ...entry("second", 1, "80", "6"), sourceElementId: "bench-element-2", sourceStageId: "stage-2", stageIndex: 1 };
    const groups = getExerciseProgressHistoryGroups([
      session("one", "2026-07-08T15:30:00.000Z", [first, second])
    ], "name:bench");

    expect(groups).toHaveLength(1);
    expect(groups[0].entries.map((result) => result.entry.id)).toEqual(["first", "second"]);
  });

  it("keeps different exercises and non-completed sessions out of the selected history", () => {
    const groups = getExerciseProgressHistoryGroups([
      session("completed", "2026-07-08T15:30:00.000Z", [entry("bench", 1, "80", "5"), entry("row", 1, "60", "10", "Row")]),
      session("active", "2026-07-09T15:30:00.000Z", [entry("active", 1, "100", "5")], "active"),
      { ...session("deleted", "2026-07-10T15:30:00.000Z", [entry("deleted", 1, "120", "5")]), deletedAt: "2026-07-10T16:00:00.000Z" }
    ], "name:bench");

    expect(groups).toHaveLength(1);
    expect(groups[0].entries).toHaveLength(1);
  });

  it("filters older history groups by the selected time range", () => {
    const groups = getExerciseProgressHistoryGroups([
      session("recent", "2026-07-08T15:30:00.000Z", [entry("recent", 1, "80", "5")]),
      session("old", "2025-12-01T15:30:00.000Z", [entry("old", 1, "75", "5")])
    ], "name:bench");

    expect(filterExerciseProgressHistoryGroups(groups, "3m", new Date("2026-07-10T00:00:00.000Z"))).toHaveLength(1);
    expect(filterExerciseProgressHistoryGroups(groups, "all", new Date("2026-07-10T00:00:00.000Z"))).toHaveLength(2);
  });

  it("formats compact set and series values in Polish and English", () => {
    expect(formatExerciseProgressSetCount(1, "pl")).toBe("1 seria");
    expect(formatExerciseProgressSetCount(2, "pl")).toBe("2 serie");
    expect(formatExerciseProgressSetCount(5, "pl")).toBe("5 serii");
    expect(formatExerciseProgressSetCount(2, "en")).toBe("2 sets");
    expect(formatExerciseProgressSeriesValue("5", "80", 400, "pl")).toEqual({ load: "80 kg", repetitions: "5 powt.", volume: "obj. 400 kg" });
    expect(formatExerciseProgressSeriesValue("5", "80", 400, "en")).toEqual({ load: "80 kg", repetitions: "5 reps", volume: "vol. 400 kg" });
    expect(formatExerciseProgressSeriesValue("12", "15.8", 189.60000000000002, "pl")).toEqual({
      load: "15.8 kg",
      repetitions: "12 powt.",
      volume: "obj. 189,6 kg"
    });
    expect(formatExerciseProgressSeriesValue("", "", null, "pl")).toEqual({ load: "—", repetitions: "—", volume: "obj. —" });
  });
});
