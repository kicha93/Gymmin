import { describe, expect, it } from "vitest";

import {
  calculateEntryVolume,
  getActiveWorkoutSessionsForUi,
  getCompletedWorkoutSessions,
  getExerciseProgressItems,
  getWorkoutSessionUpdatedAt,
  mergeWorkoutSessions,
  normalizeWorkoutSessions,
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
});
