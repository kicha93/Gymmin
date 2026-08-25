import { describe, expect, it } from "vitest";

import {
  createWorkoutSessionSuperset,
  getGuidedStepRangeForEntry,
  getMainExerciseProgressForEntry,
  getNextGuidedEntryId,
  getPreviousGuidedEntryId,
  getSupersetRoundRows,
  getWorkoutSessionGuidedSteps,
  getWorkoutSessionSupersetCandidate,
  normalizeWorkoutSessionSupersets,
  removeWorkoutSessionSuperset,
  toggleSupersetRoundCompleted,
  updateSupersetRoundValue
} from "../workoutSessionSupersets";
import {
  createWorkoutSessionFromWorkout,
  normalizeWorkoutSessions,
  type WorkoutSession,
  type WorkoutSessionEntry
} from "../workoutSessions";
import { createStep, type WorkoutDraft } from "../workouts";

const timestamp = "2026-07-21T10:00:00.000Z";

function exerciseEntry(
  exercise: "a" | "b" | "c",
  setIteration: number,
  overrides: Partial<WorkoutSessionEntry> = {}
): WorkoutSessionEntry {
  const elementIndex = { a: 0, b: 1, c: 2 }[exercise];
  return {
    elementIndex,
    exerciseId: `exercise-${exercise}`,
    exerciseName: `Exercise ${exercise.toUpperCase()}`,
    id: `${exercise}-${setIteration}`,
    isCompleted: false,
    plannedTarget: exercise === "b" ? "8" : "6",
    plannedTargetType: "repetitions",
    seriesIndex: 0,
    setIteration,
    sourceElementId: `element-${exercise}`,
    sourceSeriesId: "series-1",
    sourceStageId: "stage-1",
    stageIndex: 0,
    type: "exercise",
    ...overrides
  };
}

function createSession(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    deletedAt: null,
    entries: [
      ...Array.from({ length: 4 }, (_, index) => exerciseEntry("a", index + 1)),
      ...Array.from({ length: 3 }, (_, index) => exerciseEntry("b", index + 1)),
      ...Array.from({ length: 2 }, (_, index) => exerciseEntry("c", index + 1))
    ],
    executionMode: "guided",
    id: "session-1",
    planSnapshot: { name: "Workout", notes: "", sport: "strength", steps: [] },
    sourceWorkoutId: "workout-1",
    sourceWorkoutName: "Workout",
    startedAt: timestamp,
    status: "active",
    updatedAt: timestamp,
    ...overrides
  };
}

function createWorkoutWithSeries(elementCount: number, secondType: "exercise" | "rest" = "exercise"): WorkoutDraft {
  const stage = createStep({ id: "stage-1", kind: "stage", label: "Main", stageType: "exercise" });
  const set = createStep({ id: "set-1", kind: "set", parentStageId: stage.id, setCount: "3" });
  const elements = Array.from({ length: elementCount }, (_, index) => createStep({
    exerciseId: `exercise-${index + 1}`,
    exerciseName: `Exercise ${index + 1}`,
    id: `element-${index + 1}`,
    kind: "exercise",
    parentSetId: set.id,
    stageType: index === 1 ? secondType : "exercise",
    targetValue: "8"
  }));

  return {
    name: "Planned superset",
    notes: "",
    sport: "strength",
    steps: [stage, set, ...elements]
  };
}

describe("workout session supersets", () => {
  it("creates a guided session superset from two exercises in one planned series", () => {
    const session = createWorkoutSessionFromWorkout(createWorkoutWithSeries(2), "workout-1", "guided");
    const supersetId = session.supersets?.[0].id ?? "";

    expect(session.supersets).toHaveLength(1);
    expect(session.supersets?.[0].entryIds).toEqual([
      "stage-1-set-1-element-1-1",
      "stage-1-set-1-element-2-1"
    ]);
    expect(getWorkoutSessionGuidedSteps(session)).toHaveLength(1);
    expect(getSupersetRoundRows(session, supersetId)).toHaveLength(3);

    const split = removeWorkoutSessionSuperset(session, supersetId, timestamp);
    expect(split.supersets).toBeUndefined();
    expect(getWorkoutSessionGuidedSteps(split)).toHaveLength(2);
    expect(split.planSnapshot.steps.filter((step) => step.kind === "exercise")).toHaveLength(2);
  });

  it("does not infer a planned superset outside guided mode or from invalid series", () => {
    const inline = createWorkoutSessionFromWorkout(createWorkoutWithSeries(2), "workout-1", "inline-table");
    const single = createWorkoutSessionFromWorkout(createWorkoutWithSeries(1), "workout-1", "guided");
    const triple = createWorkoutSessionFromWorkout(createWorkoutWithSeries(3), "workout-1", "guided");
    const withRest = createWorkoutSessionFromWorkout(createWorkoutWithSeries(2, "rest"), "workout-1", "guided");

    expect(inline.supersets).toBeUndefined();
    expect(single.supersets).toBeUndefined();
    expect(triple.supersets).toBeUndefined();
    expect(withRest.supersets).toBeUndefined();
  });

  it("creates a session-only superset from the current and next exercise group", () => {
    const result = createWorkoutSessionSuperset(createSession(), "a-2", timestamp);

    expect(result.supersets).toHaveLength(1);
    expect(result.supersets?.[0].entryIds).toEqual(["a-1", "b-1"]);
    expect(result.planSnapshot).toEqual(createSession().planSnapshot);
  });

  it("does not create a superset without a next exercise or for a rest entry", () => {
    const session = createSession();
    expect(getWorkoutSessionSupersetCandidate(session, "c-1").status).toBe("no-next");
    expect(createWorkoutSessionSuperset(session, "c-1", timestamp)).toBe(session);

    const restSession = createSession({
      entries: [{
        elementIndex: 0,
        id: "rest-1",
        isCompleted: false,
        plannedTarget: "60",
        seriesIndex: 0,
        setIteration: 1,
        stageIndex: 0,
        type: "rest"
      }]
    });
    expect(getWorkoutSessionSupersetCandidate(restSession, "rest-1").status).toBe("ineligible");
    expect(createWorkoutSessionSuperset(restSession, "rest-1", timestamp)).toBe(restSession);
  });

  it("shows one warm-up stage as one guided step and never allows warm-up supersets", () => {
    const session = createSession({
      entries: [
        exerciseEntry("a", 1, {
          id: "warmup-a",
          sourceElementId: "warmup-element-a",
          sourceStageId: "warmup-stage",
          type: "warmup"
        }),
        exerciseEntry("b", 1, {
          id: "warmup-b",
          sourceElementId: "warmup-element-b",
          sourceStageId: "warmup-stage",
          type: "warmup"
        }),
        exerciseEntry("c", 1, {
          id: "main-c",
          sourceStageId: "main-stage"
        })
      ]
    });

    const steps = getWorkoutSessionGuidedSteps(session);

    expect(steps).toHaveLength(2);
    expect(steps[0].groups.map((group) => group.entries[0].id)).toEqual(["warmup-a", "warmup-b"]);
    expect(getGuidedStepRangeForEntry(session, "warmup-b")).toEqual({ end: 2, start: 1, total: 3 });
    expect(getNextGuidedEntryId(session, "warmup-a")).toBe("main-c");
    expect(getWorkoutSessionSupersetCandidate(session, "warmup-a").status).toBe("ineligible");
    expect(createWorkoutSessionSuperset(session, "warmup-a", timestamp)).toBe(session);
    expect(getMainExerciseProgressForEntry(session, "warmup-a")).toEqual({
      end: 0,
      isWarmup: true,
      start: 0,
      total: 1
    });
    expect(getMainExerciseProgressForEntry(session, "main-c")).toEqual({
      end: 1,
      isWarmup: false,
      start: 1,
      total: 1
    });
  });

  it("prevents one exercise from overlapping two supersets", () => {
    const withSuperset = createWorkoutSessionSuperset(createSession(), "a-1", timestamp);

    expect(getWorkoutSessionSupersetCandidate(withSuperset, "b-1").status).toBe("overlap");
    expect(createWorkoutSessionSuperset(withSuperset, "b-1", timestamp)).toBe(withSuperset);
  });

  it("navigates over the combined second exercise and restores normal steps after split", () => {
    const withSuperset = createWorkoutSessionSuperset(createSession(), "a-1", timestamp);
    const supersetId = withSuperset.supersets?.[0].id ?? "";

    expect(getWorkoutSessionGuidedSteps(withSuperset)).toHaveLength(2);
    expect(getGuidedStepRangeForEntry(withSuperset, "b-2")).toEqual({ end: 2, start: 1, total: 3 });
    expect(getNextGuidedEntryId(withSuperset, "a-1")).toBe("c-1");
    expect(getPreviousGuidedEntryId(withSuperset, "c-1")).toBe("a-1");

    const split = removeWorkoutSessionSuperset(withSuperset, supersetId, timestamp);
    expect(getWorkoutSessionGuidedSteps(split)).toHaveLength(3);
    expect(getNextGuidedEntryId(split, "a-1")).toBe("b-1");
  });

  it("uses the larger set count and exposes a disabled missing side", () => {
    const withSuperset = createWorkoutSessionSuperset(createSession(), "a-1", timestamp);
    const rounds = getSupersetRoundRows(withSuperset, withSuperset.supersets?.[0].id ?? "");

    expect(rounds).toHaveLength(4);
    expect(rounds[2].entryB?.id).toBe("b-3");
    expect(rounds[3].entryA?.id).toBe("a-4");
    expect(rounds[3].entryB).toBeNull();
  });

  it("writes A and B values to their original entries and keeps them after split", () => {
    const withSuperset = createWorkoutSessionSuperset(createSession(), "a-1", timestamp);
    const supersetId = withSuperset.supersets?.[0].id ?? "";
    const completed = toggleSupersetRoundCompleted(withSuperset, supersetId, 1, timestamp);
    const withA = updateSupersetRoundValue(completed, supersetId, 1, "A", "actualWeight", "80", timestamp);
    const withB = updateSupersetRoundValue(withA, supersetId, 1, "B", "actualReps", "8", timestamp);
    const split = removeWorkoutSessionSuperset(withB, supersetId, timestamp);

    expect(split.entries.find((entry) => entry.id === "a-2")?.actualWeight).toBe("80");
    expect(split.entries.find((entry) => entry.id === "b-2")?.actualReps).toBe("8");
    expect(split.entries.find((entry) => entry.id === "a-2")?.isCompleted).toBe(true);
    expect(split.entries.find((entry) => entry.id === "b-2")?.isCompleted).toBe(true);
    expect(split.supersets).toBeUndefined();
  });

  it("normalizes persisted supersets to group anchors and rejects corrupt overlaps", () => {
    const session = createSession();
    const normalized = normalizeWorkoutSessionSupersets([
      { id: "valid", entryIds: ["a-3", "b-2"], createdAt: timestamp, updatedAt: timestamp },
      { id: "overlap", entryIds: ["b-1", "c-1"], createdAt: timestamp, updatedAt: timestamp },
      { id: "missing", entryIds: ["missing", "c-1"], createdAt: timestamp, updatedAt: timestamp }
    ], session.entries, timestamp);

    expect(normalized).toEqual([{
      id: "valid",
      entryIds: ["a-1", "b-1"],
      createdAt: timestamp,
      updatedAt: timestamp
    }]);
  });

  it("keeps supersets after session normalization and accepts legacy sessions without them", () => {
    const withSuperset = createWorkoutSessionSuperset(createSession(), "a-1", timestamp);
    const resumed = normalizeWorkoutSessions([withSuperset])[0];
    const legacy = normalizeWorkoutSessions([{ ...createSession(), supersets: undefined }])[0];

    expect(resumed.supersets?.[0].entryIds).toEqual(["a-1", "b-1"]);
    expect(getSupersetRoundRows(resumed, resumed.supersets?.[0].id ?? "")).toHaveLength(4);
    expect(legacy.supersets).toBeUndefined();
  });
});
