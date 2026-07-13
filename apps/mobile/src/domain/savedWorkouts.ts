import type { WorkoutDraft } from "./workouts";

export type SavedWorkout = {
  createdAt?: string;
  draft: WorkoutDraft;
  id: string;
  name: string;
};

export type WorkoutSortField = "createdAt" | "name";
export type SortDirection = "asc" | "desc";

export type WorkoutSortSettings = {
  direction: SortDirection;
  field: WorkoutSortField;
};
