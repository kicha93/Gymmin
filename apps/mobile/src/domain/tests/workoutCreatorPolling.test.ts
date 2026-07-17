import { describe, expect, it, vi } from "vitest";

import { pollWorkoutCreatorJob } from "../../features/workoutCreator/workoutCreatorPolling";

describe("workout creator polling", () => {
  it("returns a completed result after queued states", async () => {
    const getJob = vi.fn()
      .mockResolvedValueOnce({ error: "", result: null, status: "queued" })
      .mockResolvedValueOnce({ error: "", result: { plan: true }, status: "completed" });

    await expect(pollWorkoutCreatorJob({
      delay: async () => undefined,
      failedMessage: "failed",
      getJob,
      sessionExpiredMessage: "expired"
    })).resolves.toEqual({ plan: true });
    expect(getJob).toHaveBeenCalledTimes(2);
  });

  it("preserves failure, unauthorized and cancellation semantics", async () => {
    await expect(pollWorkoutCreatorJob({
      failedMessage: "fallback",
      getJob: async () => ({ error: "provider failed", result: null, status: "failed" }),
      sessionExpiredMessage: "expired"
    })).rejects.toThrow("provider failed");

    await expect(pollWorkoutCreatorJob({
      failedMessage: "fallback",
      getJob: async () => { throw Object.assign(new Error("unauthorized"), { status: 401 }); },
      sessionExpiredMessage: "expired"
    })).rejects.toThrow("expired");

    const getJob = vi.fn();
    await expect(pollWorkoutCreatorJob({
      cancelled: () => true,
      failedMessage: "fallback",
      getJob,
      sessionExpiredMessage: "expired"
    })).resolves.toBeNull();
    expect(getJob).not.toHaveBeenCalled();
  });
});
