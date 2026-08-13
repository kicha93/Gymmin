import { isWorkoutArchived, type SavedWorkout } from "./savedWorkouts";
import { getCompletedWorkoutSessions, type WorkoutSession } from "./workoutSessions";

export type ProfileDashboardStats = {
  completedSessions: number;
  savedPlans: number;
};

export function getProfileDashboardStats(
  sessions: WorkoutSession[],
  workouts: SavedWorkout[]
): ProfileDashboardStats {
  return {
    completedSessions: getCompletedWorkoutSessions(sessions).length,
    savedPlans: workouts.filter((workout) => !isWorkoutArchived(workout)).length
  };
}

export function getProfileDisplayName(displayName: string | undefined, fallback: string): string {
  return displayName?.trim() || fallback;
}
