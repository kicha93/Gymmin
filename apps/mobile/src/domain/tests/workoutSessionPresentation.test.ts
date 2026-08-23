import { describe, expect, it } from "vitest";

import {
  canRecordWorkoutSessionPerformance,
  clampWorkoutSessionEntryIndex,
  getGuidedEntryGroups,
  getGuidedGroupIndex,
  getPreviousExerciseValues,
  getSessionEntryPreviewStep,
  groupInlineWorkoutEntries,
  isSimpleWarmupEntry
} from "../workoutSessionPresentation";
import type { WorkoutSession, WorkoutSessionEntry } from "../workoutSessions";
import { createStep } from "../workouts";

function entry(overrides: Partial<WorkoutSessionEntry> = {}): WorkoutSessionEntry {
  return {
    elementIndex: 0,
    id: "entry-1",
    isCompleted: false,
    seriesIndex: 0,
    setIteration: 1,
    stageIndex: 0,
    type: "exercise",
    ...overrides
  };
}

function session(entries: WorkoutSessionEntry[], overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    entries,
    executionMode: "guided",
    id: "session-1",
    planSnapshot: { name: "Plan", notes: "", sport: "strength", steps: [] },
    sourceWorkoutId: "workout-1",
    sourceWorkoutName: "Plan",
    startedAt: "2026-01-01T10:00:00.000Z",
    status: "active",
    ...overrides
  };
}

describe("workoutSessionPresentation", () => {
  it("never exposes performance inputs for warmup entries", () => {
    expect(canRecordWorkoutSessionPerformance(entry({
      exerciseId: "jumping-jacks",
      exerciseName: "Jumping jacks",
      plannedTarget: "60",
      plannedTargetType: "time",
      type: "warmup"
    }))).toBe(false);
    expect(canRecordWorkoutSessionPerformance(entry({ type: "rest" }))).toBe(false);
    expect(canRecordWorkoutSessionPerformance(entry({ plannedTargetType: "buttonPress" }))).toBe(false);
    expect(canRecordWorkoutSessionPerformance(entry({ plannedTargetType: "repetitions" }))).toBe(true);
  });

  it("simplifies only an actually empty warmup entry", () => {
    expect(isSimpleWarmupEntry(entry({ type: "warmup" }))).toBe(true);
    expect(isSimpleWarmupEntry(entry({
      exerciseId: "bodyweight-squat",
      exerciseName: "Bodyweight squat",
      plannedTarget: "15",
      plannedTargetType: "repetitions",
      type: "warmup"
    }))).toBe(false);
    expect(isSimpleWarmupEntry(entry({ plannedTarget: "30", type: "warmup" }))).toBe(false);
    expect(isSimpleWarmupEntry(entry({ exerciseName: "Leg swings", type: "warmup" }))).toBe(false);
  });

  it("clamps persisted entry indexes to the current session shape", () => {
    const workoutSession = session([entry({ id: "one" }), entry({ id: "two" })]);

    expect(clampWorkoutSessionEntryIndex("1", workoutSession)).toBe(1);
    expect(clampWorkoutSessionEntryIndex(99, workoutSession)).toBe(1);
    expect(clampWorkoutSessionEntryIndex(-5, workoutSession)).toBe(0);
    expect(clampWorkoutSessionEntryIndex("invalid", workoutSession)).toBe(0);
  });

  it("groups repeated guided sets and attaches the matching rest entry", () => {
    const first = entry({
      id: "set-1",
      sourceElementId: "squat",
      sourceSeriesId: "series-1",
      sourceStageId: "stage-1"
    });
    const second = entry({
      id: "set-2",
      setIteration: 2,
      sourceElementId: "squat",
      sourceSeriesId: "series-1",
      sourceStageId: "stage-1"
    });
    const rest = entry({
      elementIndex: 1,
      id: "rest-1",
      sourceSeriesId: "series-1",
      type: "rest"
    });
    const groups = getGuidedEntryGroups(session([first, rest, second]));

    expect(groups).toHaveLength(1);
    expect(groups[0].entries.map((item) => item.id)).toEqual(["set-1", "set-2"]);
    expect(groups[0].restEntry?.id).toBe("rest-1");
    expect(getGuidedGroupIndex(groups, 2, second)).toBe(0);
  });

  it("uses the snapshot exercise when available and builds a fallback otherwise", () => {
    const snapshotStep = createStep({
      exerciseName: "Front squat",
      id: "exercise-step",
      kind: "exercise"
    });
    const workoutSession = session(
      [entry({ id: "known", sourceElementId: "exercise-step" })],
      { planSnapshot: { name: "Plan", notes: "", sport: "strength", steps: [snapshotStep] } }
    );

    expect(getSessionEntryPreviewStep(workoutSession, workoutSession.entries[0])).toBe(snapshotStep);
    expect(
      getSessionEntryPreviewStep(
        workoutSession,
        entry({ exerciseName: "Fallback", id: "fallback", plannedTarget: "8" })
      )
    ).toMatchObject({ exerciseName: "Fallback", targetValue: "8" });
  });

  it("groups inline entries by exercise identity", () => {
    const workoutSession = session([
      entry({ exerciseId: "front-squat", exerciseName: "Front squat", id: "one" }),
      entry({ exerciseId: "front-squat", exerciseName: "Front squat", id: "two", setIteration: 2 }),
      entry({ exerciseName: "Row", id: "three" })
    ]);
    const groups = groupInlineWorkoutEntries(workoutSession, () => true, "en", (item) => item.exerciseName ?? "");

    expect(groups).toHaveLength(2);
    expect(groups[0].entries).toHaveLength(2);
    expect(groups[1].title).toBeTruthy();
  });

  it("reads previous values from the most recent matching exercise result", () => {
    const currentEntry = entry({ exerciseId: "front-squat", exerciseName: "Front squat", id: "current" });
    const previous = session(
      [
        entry({
          actualReps: "8",
          actualWeight: "90",
          exerciseId: "front-squat",
          exerciseName: "Front squat",
          id: "previous",
          isCompleted: true
        })
      ],
      {
        finishedAt: "2026-01-02T11:00:00.000Z",
        id: "previous-session",
        startedAt: "2026-01-02T10:00:00.000Z",
        status: "completed"
      }
    );

    expect(getPreviousExerciseValues([currentEntry], [previous])).toEqual({ reps: "8", weight: "90" });
  });
});
