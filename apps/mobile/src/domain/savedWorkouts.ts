import type { WorkoutDraft } from "./workouts";

export type SavedWorkout = {
  archivedAt?: string | null;
  createdAt?: string;
  draft: WorkoutDraft;
  id: string;
  name: string;
};

export function isWorkoutArchived(workout: Pick<SavedWorkout, "archivedAt">) {
  return Boolean(workout.archivedAt);
}

export function setWorkoutArchived(
  workout: SavedWorkout,
  archived: boolean,
  now = new Date()
): SavedWorkout {
  return {
    ...workout,
    archivedAt: archived ? now.toISOString() : null
  };
}

export type WorkoutSortField = "createdAt" | "name";
export type SortDirection = "asc" | "desc";

export type WorkoutSortSettings = {
  direction: SortDirection;
  field: WorkoutSortField;
};
