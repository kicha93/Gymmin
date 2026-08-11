import { exercises } from "./exerciseCatalog";
import {
  activeExerciseLibraryTiers,
  type Exercise,
  type ExerciseLibraryTier
} from "./exercises";

export type ExerciseCatalogDataSource = {
  getAvailableExercises: () => readonly Exercise[];
};

const availableExerciseTiers = new Set<ExerciseLibraryTier>(activeExerciseLibraryTiers);
const availableExercises = exercises.filter((exercise) =>
  availableExerciseTiers.has(exercise.libraryTier ?? "main")
) as readonly Exercise[];

/**
 * Product-facing exercise catalog. Deprecated compatibility entries and
 * progression-only helpers remain readable elsewhere, but are not choices
 * offered by the workout builder or AI prompt.
 */
export const exerciseCatalogDataSource: ExerciseCatalogDataSource = {
  getAvailableExercises: () => availableExercises
};
