import { describe, expect, it } from "vitest";

import { getProfileDashboardStats, getProfileDisplayName } from "../profileDashboard";
import type { SavedWorkout } from "../savedWorkouts";
import type { WorkoutSession } from "../workoutSessions";

function session(
  id: string,
  status: WorkoutSession["status"],
  deletedAt?: string
): WorkoutSession {
  return {
    id,
    sourceWorkoutId: "workout-1",
    sourceWorkoutName: "Workout",
    executionMode: "guided",
    status,
    startedAt: "2026-08-10T10:00:00.000Z",
    deletedAt,
    planSnapshot: { name: "Workout", notes: "", sport: "strength", steps: [] },
    entries: []
  };
}

function workout(id: string, archivedAt?: string): SavedWorkout {
  return {
    id,
    name: `Workout ${id}`,
    archivedAt,
    draft: { name: `Workout ${id}`, notes: "", sport: "strength", steps: [] }
  };
}

describe("profile dashboard", () => {
  it("counts only completed, non-deleted sessions and active workout plans", () => {
    expect(getProfileDashboardStats(
      [
        session("completed", "completed"),
        session("active", "active"),
        session("abandoned", "abandoned"),
        session("deleted", "completed", "2026-08-11T10:00:00.000Z")
      ],
      [workout("active"), workout("archived", "2026-08-11T10:00:00.000Z")]
    )).toEqual({ completedSessions: 1, savedPlans: 1 });
  });

  it("returns zeroes for a fresh local profile", () => {
    expect(getProfileDashboardStats([], [])).toEqual({ completedSessions: 0, savedPlans: 0 });
  });

  it("uses a trimmed display name when one is supplied", () => {
    expect(getProfileDisplayName("  Alex  ", "Local profile")).toBe("Alex");
  });

  it("uses a localized fallback when the display name is missing", () => {
    expect(getProfileDisplayName("  ", "Local profile")).toBe("Local profile");
    expect(getProfileDisplayName(undefined, "Profil lokalny")).toBe("Profil lokalny");
  });
});
