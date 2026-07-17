import { describe, expect, it, vi } from "vitest";

import {
  createAccountDataApiClient,
  normalizeApiWorkouts
} from "../../api/accountDataApi";

function jsonResponse(value: unknown, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(value), {
    headers: { "Content-Type": "application/json" },
    status
  });
}

describe("accountDataApi", () => {
  it("loads workouts and treats a missing settings record as empty", async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(jsonResponse([{ clientWorkoutId: "plan-1", name: "Plan", sport: "strength", steps: [] }]))
      .mockResolvedValueOnce(jsonResponse(null, 404));
    const client = createAccountDataApiClient({
      createError: async () => new Error("api error"),
      request
    });

    await expect(client.getWorkouts({}, "fallback")).resolves.toHaveLength(1);
    await expect(client.getSettings({}, "fallback")).resolves.toBeNull();
  });

  it("serializes synchronization requests with JSON headers", async () => {
    const request = vi.fn(async () => jsonResponse({ favorites: [] }));
    const client = createAccountDataApiClient({
      createError: async () => new Error("api error"),
      request
    });
    const body = { deletedExerciseIds: [], favorites: [], lastPulledAt: null };

    await client.syncFavoriteExercises(body, { Authorization: "Bearer token" }, "fallback");

    expect(request).toHaveBeenCalledWith("/api/sync/favorite-exercises", expect.objectContaining({
      body: JSON.stringify(body),
      headers: expect.objectContaining({
        Authorization: "Bearer token",
        "Content-Type": "application/json"
      }),
      method: "POST"
    }));
  });

  it("accepts an idempotent workout delete returning 404", async () => {
    const client = createAccountDataApiClient({
      createError: async () => new Error("api error"),
      request: async () => jsonResponse(null, 404)
    });

    await expect(client.deleteWorkout("plan / 1", {}, "fallback")).resolves.toBeUndefined();
  });

  it("routes failed responses through shared API diagnostics", async () => {
    const createError = vi.fn(async () => Object.assign(new Error("unauthorized"), { status: 401 }));
    const client = createAccountDataApiClient({
      createError,
      request: async () => jsonResponse({}, 401)
    });

    await expect(client.syncAchievements({
      appUsageStats: { totalForegroundSeconds: 0, updatedAt: "2026-07-17T00:00:00.000Z" },
      lastPulledAt: null,
      unlocked: []
    }, {}, "fallback")).rejects.toMatchObject({ status: 401 });
    expect(createError).toHaveBeenCalledOnce();
  });

  it("drops malformed workouts and steps before they reach account merge", () => {
    expect(normalizeApiWorkouts([
      null,
      { name: "Missing id", steps: [] },
      {
        clientWorkoutId: " plan-1 ",
        name: "Plan",
        steps: [
          { clientStepId: "step-1", kind: "exercise" },
          { clientStepId: "", kind: "exercise" },
          { clientStepId: "step-2", kind: "unsupported" }
        ]
      }
    ])).toEqual([expect.objectContaining({
      clientWorkoutId: "plan-1",
      steps: [expect.objectContaining({ clientStepId: "step-1", kind: "exercise" })]
    })]);
  });
});
