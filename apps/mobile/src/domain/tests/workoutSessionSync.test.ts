import { beforeEach, describe, expect, it } from "vitest";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  buildWorkoutSessionSyncRequest,
  normalizeApiWorkoutSessionsResponse,
  synchronizeWorkoutSessions
} from "../workoutSessionSync";
import type { WorkoutSession } from "../workoutSessions";

const baseSession: WorkoutSession = {
  entries: [],
  executionMode: "guided",
  id: "session-1",
  planSnapshot: { name: "Plan", notes: "", sport: "strength", steps: [] },
  sourceWorkoutId: "workout-1",
  sourceWorkoutName: "Plan",
  startedAt: "2026-01-01T10:00:00.000Z",
  status: "active",
  updatedAt: "2026-01-01T10:00:00.000Z"
};

describe("workoutSessionSync", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("builds bounded session envelopes and tombstone ids", () => {
    const request = buildWorkoutSessionSyncRequest([
      baseSession,
      {
        ...baseSession,
        deletedAt: "2026-01-02T10:00:00.000Z",
        id: "deleted",
        updatedAt: "2026-01-02T10:00:00.000Z"
      }
    ], null);

    expect(request.deletedClientSessionIds).toEqual(["deleted"]);
    expect(request.sessions[0]).toMatchObject({
      clientSessionId: "session-1",
      clientUpdatedAt: "2026-01-01T10:00:00.000Z"
    });
  });

  it("normalizes malformed response envelopes", () => {
    const response = normalizeApiWorkoutSessionsResponse({
      serverTime: "2026-01-03T10:00:00.000Z",
      sessions: [
        { clientSessionId: "", session: {} },
        { clientSessionId: "session-1", clientUpdatedAt: "2026-01-02T10:00:00.000Z", session: baseSession }
      ]
    });

    expect(response.sessions).toHaveLength(1);
    expect(response.sessions[0].session?.updatedAt).toBe("2026-01-02T10:00:00.000Z");
  });

  it("merges a remote completion and persists sync metadata", async () => {
    const merged = await synchronizeWorkoutSessions({
      forceFullPull: true,
      localSessions: [baseSession],
      request: async () => ({
        serverTime: "2026-01-03T10:00:00.000Z",
        sessions: [{
          clientSessionId: "session-1",
          clientUpdatedAt: "2026-01-02T10:00:00.000Z",
          session: {
            ...baseSession,
            finishedAt: "2026-01-02T09:00:00.000Z",
            status: "completed",
            updatedAt: "2026-01-02T10:00:00.000Z"
          }
        }]
      }),
      userId: "user-a"
    });

    expect(merged[0].status).toBe("completed");
  });
});
