import { describe, expect, it } from "vitest";

import {
  calculateEntryVolume,
  getActiveWorkoutSessionsForUi,
  getCompletedWorkoutSessions,
  getDeletedWorkoutSessionIds,
  getExerciseProgressItems,
  getWorkoutSessionStatusLabel,
  getWorkoutSessionUpdatedAt,
  markWorkoutSessionDeleted,
  mergeWorkoutSessions,
  normalizeWorkoutSessions,
  workoutHasHistory,
  type WorkoutSession
} from "../workoutSessions";

const baseSession: WorkoutSession = {
  id: "session-1",
  sourceWorkoutId: "workout-1",
  sourceWorkoutName: "Push",
  executionMode: "guided",
  status: "active",
  startedAt: "2026-01-01T10:00:00.000Z",
  updatedAt: "2026-01-01T10:00:00.000Z",
  deletedAt: null,
  planSnapshot: { name: "Push", notes: "", sport: "strength", steps: [] },
  entries: []
};

function session(overrides: Partial<WorkoutSession>): WorkoutSession {
  return {
    ...baseSession,
    ...overrides,
    planSnapshot: overrides.planSnapshot ?? baseSession.planSnapshot,
    entries: overrides.entries ?? baseSession.entries
  };
}

describe("workoutSessions", () => {
  it("uses stable updatedAt fallbacks for old sessions", () => {
    expect(getWorkoutSessionUpdatedAt({})).toBe("1970-01-01T00:00:00.000Z");
    expect(getWorkoutSessionUpdatedAt({ finishedAt: "2026-01-03T10:00:00Z" })).toBe("2026-01-03T10:00:00.000Z");
  });

  it("normalizes duplicate sessions by newest version", () => {
    const normalized = normalizeWorkoutSessions([
      session({ id: "session-1", updatedAt: "2026-01-01T10:00:00.000Z" }),
      session({ id: "session-1", status: "completed", updatedAt: "2026-01-02T10:00:00.000Z" })
    ]);

    expect(normalized).toHaveLength(1);
    expect(normalized[0].status).toBe("completed");
  });

  it("keeps local active over remote active with the same id", () => {
    const merged = mergeWorkoutSessions(
      [session({ id: "session-1", updatedAt: "2026-01-02T10:00:00.000Z" })],
      [session({ id: "session-1", updatedAt: "2026-01-03T10:00:00.000Z" })]
    );

    expect(merged[0].updatedAt).toBe("2026-01-02T10:00:00.000Z");
  });

  it("lets newer completed and newer tombstone versions win", () => {
    const completed = mergeWorkoutSessions(
      [session({ id: "session-1", status: "active", updatedAt: "2026-01-01T10:00:00.000Z" })],
      [session({ id: "session-1", status: "completed", finishedAt: "2026-01-01T11:00:00.000Z", updatedAt: "2026-01-02T10:00:00.000Z" })]
    );

    expect(completed[0].status).toBe("completed");

    const deleted = mergeWorkoutSessions(
      completed,
      [session({ id: "session-1", deletedAt: "2026-01-03T10:00:00.000Z", updatedAt: "2026-01-03T10:00:00.000Z" })]
    );

    expect(getActiveWorkoutSessionsForUi(deleted)).toHaveLength(0);
  });

  it("ignores deleted, active and abandoned sessions in progress", () => {
    const completedSession = session({
      id: "completed",
      status: "completed",
      finishedAt: "2026-01-01T11:00:00.000Z",
      entries: [{
        id: "entry-1",
        stageIndex: 0,
        seriesIndex: 0,
        setIteration: 1,
        elementIndex: 0,
        type: "exercise",
        exerciseId: "bench",
        exerciseName: "Bench press",
        actualWeight: "62,5",
        actualReps: "8",
        isCompleted: true
      }]
    });
    const abandonedSession = session({ id: "abandoned", status: "abandoned" });
    const deletedSession = session({ id: "deleted", status: "completed", deletedAt: "2026-01-02T10:00:00.000Z" });

    expect(calculateEntryVolume(completedSession.entries[0])).toBe(500);
    expect(getCompletedWorkoutSessions([completedSession, abandonedSession, deletedSession])).toHaveLength(1);
    expect(getExerciseProgressItems([completedSession, abandonedSession, deletedSession])).toHaveLength(1);
  });

  it("marks a workout history entry as a tombstone and excludes it from UI/progress", () => {
    const completedSession = session({
      id: "completed",
      status: "completed",
      finishedAt: "2026-01-01T11:00:00.000Z",
      entries: [{
        id: "entry-1",
        stageIndex: 0,
        seriesIndex: 0,
        setIteration: 1,
        elementIndex: 0,
        type: "exercise",
        exerciseId: "bench",
        exerciseName: "Bench press",
        actualWeight: "60",
        actualReps: "10",
        isCompleted: true
      }]
    });
    const deletedSession = markWorkoutSessionDeleted(completedSession, "2026-01-02T12:00:00.000Z");

    expect(deletedSession.deletedAt).toBe("2026-01-02T12:00:00.000Z");
    expect(deletedSession.updatedAt).toBe("2026-01-02T12:00:00.000Z");
    expect(getActiveWorkoutSessionsForUi([deletedSession])).toHaveLength(0);
    expect(getCompletedWorkoutSessions([deletedSession])).toHaveLength(0);
    expect(getExerciseProgressItems([deletedSession])).toHaveLength(0);
    expect(getDeletedWorkoutSessionIds([deletedSession])).toEqual(["completed"]);
  });

  it("detects whether a workout has non-deleted history entries", () => {
    expect(workoutHasHistory("workout-1", [])).toBe(false);
    expect(workoutHasHistory("workout-1", [session({ id: "completed", status: "completed" })])).toBe(true);
    expect(workoutHasHistory("workout-1", [session({ id: "abandoned", status: "abandoned" })])).toBe(true);
    expect(workoutHasHistory("workout-1", [session({ id: "active", status: "active" })])).toBe(true);
    expect(workoutHasHistory("workout-1", [
      session({ id: "deleted", deletedAt: "2026-01-02T10:00:00.000Z" })
    ])).toBe(false);
    expect(workoutHasHistory("workout-1", [
      session({ id: "other", sourceWorkoutId: "workout-2" })
    ])).toBe(false);
  });

  it("detects workout history from legacy source workout id fields", () => {
    expect(workoutHasHistory("legacy-workout", [
      {
        ...session({ id: "legacy-workout-id" }),
        sourceWorkoutId: undefined,
        workoutId: "legacy-workout"
      } as unknown as WorkoutSession
    ])).toBe(true);

    expect(workoutHasHistory("legacy-client-workout", [
      {
        ...session({ id: "legacy-client-workout-id" }),
        sourceWorkoutId: "",
        clientWorkoutId: "legacy-client-workout"
      } as unknown as WorkoutSession
    ])).toBe(true);

    expect(workoutHasHistory("legacy-nested-workout", [
      {
        ...session({ id: "legacy-nested-workout-id" }),
        sourceWorkoutId: "",
        sourceWorkout: { id: "legacy-nested-workout" }
      } as unknown as WorkoutSession
    ])).toBe(true);
  });

  it("maps session statuses to localized labels with a safe fallback", () => {
    const plLabels = { abandoned: "Przerwany", active: "Aktywny", completed: "Ukończony", unknown: "Brak danych" };
    const enLabels = { abandoned: "Abandoned", active: "Active", completed: "Completed", unknown: "No data" };

    expect(getWorkoutSessionStatusLabel("abandoned", plLabels)).toBe("Przerwany");
    expect(getWorkoutSessionStatusLabel("abandoned", enLabels)).toBe("Abandoned");
    expect(getWorkoutSessionStatusLabel("mystery", plLabels)).toBe("Brak danych");
  });
});
