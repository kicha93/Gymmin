import { describe, expect, it } from "vitest";

import { normalizePendingWorkoutCreatorJob } from "../workoutCreatorJob";

describe("normalizePendingWorkoutCreatorJob", () => {
  it("normalizes a plan job and legacy records without an explicit type", () => {
    expect(normalizePendingWorkoutCreatorJob({
      createdAt: "2026-07-17T08:00:00.000Z",
      jobId: " job-1 ",
      profileId: " profile-1 "
    })).toEqual({
      createdAt: "2026-07-17T08:00:00.000Z",
      jobId: "job-1",
      profileId: "profile-1",
      type: "plan",
      version: 1
    });
  });

  it("normalizes a rewrite job", () => {
    expect(normalizePendingWorkoutCreatorJob({
      jobId: "rewrite-1",
      sourceWorkoutId: "workout-1",
      type: "rewrite"
    }, "fallback-date")).toEqual({
      createdAt: "fallback-date",
      jobId: "rewrite-1",
      sourceWorkoutId: "workout-1",
      type: "rewrite",
      version: 1
    });
  });

  it("rejects malformed and unsupported jobs", () => {
    expect(normalizePendingWorkoutCreatorJob(null)).toBeNull();
    expect(normalizePendingWorkoutCreatorJob({ jobId: "" })).toBeNull();
    expect(normalizePendingWorkoutCreatorJob({ jobId: "job-1", type: "unknown" })).toBeNull();
    expect(normalizePendingWorkoutCreatorJob({ jobId: "job-1", type: "rewrite" })).toBeNull();
  });
});
