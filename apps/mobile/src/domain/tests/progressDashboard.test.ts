import { describe, expect, it } from "vitest";

import {
  formatProgressDashboardVolume,
  getProgressDashboardStats,
  getProgressSparklineValues,
  getSortedProgressItems,
  getSparklinePolylinePoints
} from "../progressDashboard";
import { getExerciseProgressItems, type WorkoutSession } from "../workoutSessions";

const baseSession: WorkoutSession = {
  id: "session-1",
  sourceWorkoutId: "workout-1",
  sourceWorkoutName: "Workout",
  executionMode: "guided",
  status: "completed",
  startedAt: "2026-07-01T10:00:00.000Z",
  finishedAt: "2026-07-01T11:00:00.000Z",
  updatedAt: "2026-07-01T11:00:00.000Z",
  deletedAt: null,
  planSnapshot: { name: "Workout", notes: "", sport: "strength", steps: [] },
  entries: []
};

function session(overrides: Partial<WorkoutSession>): WorkoutSession {
  return {
    ...baseSession,
    ...overrides,
    entries: overrides.entries ?? baseSession.entries,
    planSnapshot: overrides.planSnapshot ?? baseSession.planSnapshot
  };
}

function exerciseEntry(name: string, weight: number | null, reps: number | null) {
  return {
    actualReps: reps === null ? "" : String(reps),
    actualWeight: weight === null ? "" : String(weight),
    elementIndex: 0,
    exerciseName: name,
    id: `${name}-${weight}-${reps}`,
    isCompleted: true,
    plannedTarget: reps === null ? "" : String(reps),
    seriesIndex: 0,
    setIteration: 1,
    stageIndex: 0,
    type: "exercise"
  };
}

describe("progressDashboard", () => {
  it("formats monthly volume compactly without unnecessary decimals", () => {
    expect(formatProgressDashboardVolume(379.6, "pl")).toBe("380 kg");
    expect(formatProgressDashboardVolume(4000, "pl")).toBe("4 t");
    expect(formatProgressDashboardVolume(16816.8, "pl")).toBe("16,8 t");
    expect(formatProgressDashboardVolume(16816.8, "en")).toBe("16.8 t");
    expect(formatProgressDashboardVolume(Number.NaN, "pl")).toBe("0 kg");
  });

  it("calculates dashboard stats from completed current-month sessions only", () => {
    const sessions = [
      session({
        id: "july",
        entries: [
          exerciseEntry("Bench", 100, 5),
          exerciseEntry("Row", 50, 10)
        ]
      }),
      session({
        id: "old",
        startedAt: "2026-06-15T10:00:00.000Z",
        entries: [exerciseEntry("Bench", 80, 5)]
      }),
      session({
        id: "active",
        status: "active",
        entries: [exerciseEntry("Squat", 200, 5)]
      }),
      session({
        deletedAt: "2026-07-02T10:00:00.000Z",
        id: "deleted",
        entries: [exerciseEntry("Deadlift", 300, 5)]
      })
    ];
    const items = getExerciseProgressItems(sessions);

    expect(getProgressDashboardStats(items, sessions, new Date("2026-07-20T10:00:00.000Z"))).toEqual({
      beatenRecords: 2,
      monthlyVolume: 1000,
      trackedExercises: 2
    });
  });

  it("sorts all, strength and volume progress lists predictably", () => {
    const sessions = [
      session({
        id: "bench-old",
        startedAt: "2026-07-01T10:00:00.000Z",
        entries: [exerciseEntry("Bench", 100, 5)]
      }),
      session({
        id: "row-new",
        startedAt: "2026-07-03T10:00:00.000Z",
        entries: [exerciseEntry("Row", 40, 20)]
      }),
      session({
        id: "squat-middle",
        startedAt: "2026-07-02T10:00:00.000Z",
        entries: [exerciseEntry("Squat", 120, 3)]
      })
    ];
    const items = getExerciseProgressItems(sessions);

    expect(getSortedProgressItems(items, "all").map((item) => item.exerciseName)).toEqual(["Row", "Squat", "Bench"]);
    expect(getSortedProgressItems(items, "strength").map((item) => item.exerciseName)).toEqual(["Squat", "Bench", "Row"]);
    expect(getSortedProgressItems(items, "volume").map((item) => item.exerciseName)).toEqual(["Row", "Bench", "Squat"]);
  });

  it("builds sparkline values and ignores too-short data", () => {
    const [item] = getExerciseProgressItems([
      session({
        id: "one",
        startedAt: "2026-07-01T10:00:00.000Z",
        entries: [exerciseEntry("Bench", 80, 5)]
      }),
      session({
        id: "two",
        startedAt: "2026-07-02T10:00:00.000Z",
        entries: [exerciseEntry("Bench", 90, 5)]
      })
    ]);

    expect(getProgressSparklineValues(item)).toEqual([400, 450]);
    expect(getSparklinePolylinePoints([400, 450], 100, 40)).toBe("4.0,36.0 96.0,4.0");
    expect(getSparklinePolylinePoints([400], 100, 40)).toBeNull();
  });
});
