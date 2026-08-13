import { describe, expect, it } from "vitest";

import { findExerciseById, type Exercise } from "../exercises";
import type { SavedWorkout } from "../savedWorkouts";
import {
  buildWeeklyMuscleVolumeSummary,
  formatWeeklyMuscleSets,
  getFractionalSetWeight,
  getWeeklyMuscleVolumeEntriesForSide,
  getWeeklyMuscleVolumeStatus,
  isWorkoutSessionEntryActuallyCompleted
} from "../weeklyMuscleVolume";
import type { WeeklyPlanSettings } from "../weeklyPlan";
import type { WorkoutSession, WorkoutSessionEntry } from "../workoutSessions";
import type { WorkoutDraft, WorkoutStep } from "../workouts";

const zeroImpact = {
  abductors: 0, abs: 0, adductors: 0, biceps: 0, calves: 0, chest: 0,
  forearm: 0, glutes: 0, hamstrings: 0, hips: 0, lats: 0, lowerBack: 0,
  obliques: 0, quads: 0, shoulders: 0, traps: 0, triceps: 0
} as const;

const zeroEquipment = {
  ankleWeight: 0, band: 0, barbell: 0, battleRope: 0, bench: 0, bike: 0,
  bosuBall: 0, box: 0, cableMachine: 0, dumbbell: 0, ezBar: 0, foamRoller: 0,
  jumpRope: 0, kettlebell: 0, machine: 0, medicineBall: 0, other: 0, plate: 0,
  pullupBar: 0, rings: 0, rope: 0, sandbag: 0, sled: 0, slidingDisc: 0,
  smithMachine: 0, squatRack: 0, swissBall: 0, trx: 0, weightVest: 0
} as const;

const bench: Exercise = {
  category: "BENCH_PRESS",
  equipment: zeroEquipment,
  id: "bench",
  libraryTier: "main",
  muscleImpact: { ...zeroImpact, chest: 5, shoulders: 3, triceps: 4 },
  name: "Bench press",
  polishName: "Wyciskanie"
};

const row: Exercise = {
  ...bench,
  category: "ROW",
  id: "row",
  muscleImpact: { ...zeroImpact, biceps: 3, lats: 5, lowerBack: 3, traps: 4 },
  name: "Row",
  polishName: "Wiosłowanie"
};

function step(overrides: Partial<WorkoutStep>): WorkoutStep {
  return {
    exerciseId: "",
    exerciseName: "",
    goalType: "repetitions",
    id: "step",
    intensity: "moderate",
    kind: "exercise",
    label: "",
    loadKg: "",
    notes: "",
    parentSetId: "set",
    restSeconds: "",
    setCount: "",
    stageType: "exercise",
    targetValue: "10",
    ...overrides
  };
}

function draft(exercises: string[] = ["bench"], setCount = "4", stageType: WorkoutStep["stageType"] = "exercise"): WorkoutDraft {
  return {
    name: "Workout",
    notes: "",
    sport: "strength",
    steps: [
      step({ id: "stage", kind: "stage", parentSetId: undefined, stageType }),
      step({ id: "set", kind: "set", parentSetId: undefined, parentStageId: "stage", setCount, stageType }),
      ...exercises.map((exerciseId, index) => step({ exerciseId, id: `exercise-${index}`, parentSetId: "set", stageType }))
    ]
  };
}

function savedWorkout(id = "workout", workoutDraft = draft()): SavedWorkout {
  return { draft: workoutDraft, id, name: workoutDraft.name };
}

function plan(items: WeeklyPlanSettings["items"] = [{ day: "monday", order: 0, workoutId: "workout" }]): WeeklyPlanSettings {
  return { enabled: items.length > 0, items, updatedAt: "2026-08-10T10:00:00.000Z" };
}

function entry(overrides: Partial<WorkoutSessionEntry> = {}): WorkoutSessionEntry {
  return {
    actualReps: "10",
    completedAt: "2026-08-10T10:05:00.000Z",
    elementIndex: 0,
    exerciseId: "bench",
    id: "entry",
    isCompleted: true,
    seriesIndex: 0,
    setIteration: 1,
    stageIndex: 0,
    type: "exercise",
    ...overrides
  };
}

function session(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    deletedAt: null,
    entries: [entry()],
    executionMode: "guided",
    id: "session",
    planSnapshot: draft(),
    sourceWorkoutId: "workout",
    sourceWorkoutName: "Workout",
    startedAt: "2026-08-10T10:00:00.000Z",
    status: "completed",
    ...overrides
  };
}

function calculate(overrides: {
  plan?: WeeklyPlanSettings;
  sessions?: WorkoutSession[];
  workouts?: SavedWorkout[];
} = {}) {
  return buildWeeklyMuscleVolumeSummary({
    exercises: [bench, row],
    now: new Date(2026, 7, 12, 12),
    plan: overrides.plan ?? plan(),
    sessions: overrides.sessions ?? [],
    workouts: overrides.workouts ?? [savedWorkout()]
  });
}

function volume(summary: ReturnType<typeof calculate>, id: string) {
  return summary.entries.find((item) => item.id === id)!;
}

describe("weekly muscle volume", () => {
  it("uses a small direct/indirect fractional model", () => {
    expect([0, 1, 2, 3, 4, 5].map(getFractionalSetWeight)).toEqual([0, 0, 0, 0.5, 0.5, 1]);
  });

  it("counts four direct sets and fractional compound contributions", () => {
    const summary = calculate();
    expect(volume(summary, "chest").projectedSets).toBe(4);
    expect(volume(summary, "triceps").projectedSets).toBe(2);
    expect(volume(summary, "shoulders").projectedSets).toBe(2);
  });

  it("uses the maximum contribution inside an aggregate group", () => {
    const summary = calculate({ workouts: [savedWorkout("workout", draft(["row"], "4"))] });
    expect(volume(summary, "back").projectedSets).toBe(4);
    expect(volume(summary, "biceps").projectedSets).toBe(2);
  });

  it("adds several exercises and keeps supersets as their original sets", () => {
    const summary = calculate({ workouts: [savedWorkout("workout", draft(["bench", "row"], "3"))] });
    expect(volume(summary, "chest").projectedSets).toBe(3);
    expect(volume(summary, "back").projectedSets).toBe(3);
    expect(volume(summary, "biceps").projectedSets).toBe(1.5);
  });

  it("counts actual completed entries, not the plan snapshot", () => {
    const completed = session({ entries: [entry({ id: "1" }), entry({ id: "2", setIteration: 2 }), entry({ id: "3", setIteration: 3 })] });
    const summary = calculate({ sessions: [completed] });
    expect(volume(summary, "chest").completedSets).toBe(3);
    expect(volume(summary, "chest").projectedSets).toBe(3);
  });

  it("does not duplicate a completed planned workout in projection", () => {
    const completed = session({ entries: [entry({ id: "1" }), entry({ id: "2", setIteration: 2 })] });
    const summary = calculate({ sessions: [completed] });
    expect(volume(summary, "chest").completedSets).toBe(2);
    expect(volume(summary, "chest").projectedSets).toBe(2);
  });

  it("adds only remaining occurrences of a repeatedly planned workout", () => {
    const repeatedPlan = plan([
      { day: "monday", order: 0, workoutId: "workout" },
      { day: "friday", order: 1, workoutId: "workout" }
    ]);
    const summary = calculate({ plan: repeatedPlan, sessions: [session()] });
    expect(volume(summary, "chest").completedSets).toBe(1);
    expect(volume(summary, "chest").projectedSets).toBe(5);
  });

  it("counts unplanned completed sessions and leaves the plan untouched", () => {
    const extra = session({ id: "extra", sourceWorkoutId: "other" });
    const summary = calculate({ sessions: [extra] });
    expect(volume(summary, "chest").completedSets).toBe(1);
    expect(volume(summary, "chest").projectedSets).toBe(5);
  });

  it("ignores active, abandoned, deleted and out-of-week sessions", () => {
    const sessions = [
      session({ id: "active", status: "active" }),
      session({ id: "abandoned", status: "abandoned" }),
      session({ deletedAt: "2026-08-10T12:00:00.000Z", id: "deleted" }),
      session({ id: "old", startedAt: "2026-08-02T10:00:00.000Z" })
    ];
    expect(volume(calculate({ plan: plan([]), sessions }), "chest").completedSets).toBe(0);
  });

  it("requires evidence of execution instead of the legacy default true flag", () => {
    expect(isWorkoutSessionEntryActuallyCompleted(entry({ actualReps: undefined, completedAt: undefined }))).toBe(false);
    expect(isWorkoutSessionEntryActuallyCompleted(entry({ actualReps: undefined, completedAt: "2026-08-10T10:00:00.000Z" }))).toBe(true);
    expect(isWorkoutSessionEntryActuallyCompleted(entry({ actualReps: "5", completedAt: undefined }))).toBe(true);
    expect(isWorkoutSessionEntryActuallyCompleted(entry({ isCompleted: false }))).toBe(false);
  });

  it("ignores warmups and missing catalog exercises without crashing", () => {
    const warmup = savedWorkout("workout", draft(["bench", "missing"], "4", "warmup"));
    const summary = calculate({ workouts: [warmup] });
    expect(summary.hasActivity).toBe(false);
  });

  it("assigns groups to their anatomy sides", () => {
    const summary = calculate();
    expect(volume(summary, "chest").sides).toEqual(["front"]);
    expect(volume(summary, "back").sides).toEqual(["back"]);
    expect(volume(summary, "shoulders").sides).toEqual(["front", "back"]);
    expect(getWeeklyMuscleVolumeEntriesForSide(summary, "front").map((item) => item.id)).toContain("chest");
    expect(getWeeklyMuscleVolumeEntriesForSide(summary, "back").map((item) => item.id)).not.toContain("chest");
  });

  it("resolves a historical exercise alias to the canonical catalog entry", () => {
    const canonical = findExerciseById("squat-barbell-back-squat-1251");
    expect(canonical).toBeDefined();
    const summary = buildWeeklyMuscleVolumeSummary({
      exercises: [canonical!],
      now: new Date(2026, 7, 12, 12),
      plan: plan([]),
      sessions: [session({
        entries: [entry({ exerciseId: "squat-back-squats-1249" })],
        sourceWorkoutId: "legacy"
      })],
      workouts: []
    });
    expect(volume(summary, "quads").completedSets).toBeGreaterThan(0);
  });

  it("classifies ranges and formats fractional values", () => {
    expect([0, 7, 7.5, 10, 20, 20.5].map((value) => getWeeklyMuscleVolumeStatus(value))).toEqual([
      "none", "below", "near", "inRange", "inRange", "high"
    ]);
    expect(formatWeeklyMuscleSets(7)).toBe("7");
    expect(formatWeeklyMuscleSets(7.5)).toBe("7.5");
  });

  it("returns an empty state without plan or sessions", () => {
    const summary = calculate({ plan: plan([]), sessions: [], workouts: [] });
    expect(summary.hasActivity).toBe(false);
    expect(summary.entries.every((item) => item.completedSets === 0 && item.projectedSets === 0)).toBe(true);
  });
});
