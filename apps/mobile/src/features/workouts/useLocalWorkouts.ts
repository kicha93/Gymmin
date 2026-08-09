import { useEffect, useState } from "react";

import {
  defaultWorkoutSort,
  normalizeSavedWorkoutTextFields
} from "../../domain/savedWorkoutNormalization";
import type {
  SavedWorkout,
  WorkoutSortSettings
} from "../../domain/savedWorkouts";
import {
  loadLocalWorkouts,
  saveLocalWorkouts
} from "../../storage/localDataRepositories";

export function useLocalWorkouts(
  hasLoadedAccountStorageMigration: boolean,
  initialWorkouts: SavedWorkout[]
) {
  const normalizedInitialWorkouts = () => initialWorkouts.map(normalizeSavedWorkoutTextFields);
  const [savedWorkouts, setSavedWorkouts] = useState<SavedWorkout[]>(normalizedInitialWorkouts);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState(initialWorkouts[0]?.id ?? "");
  const [workoutSort, setWorkoutSort] = useState<WorkoutSortSettings>(defaultWorkoutSort);
  const [hasLoadedLocalWorkouts, setHasLoadedLocalWorkouts] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function hydrateLocalWorkouts() {
      if (!hasLoadedAccountStorageMigration) {
        return;
      }

      setHasLoadedLocalWorkouts(false);

      const storedData = await loadLocalWorkouts();
      if (!isMounted) {
        return;
      }

      if (!storedData.exists) {
        const defaults = normalizedInitialWorkouts();
        setSavedWorkouts(defaults);
        setSelectedWorkoutId(defaults[0]?.id ?? "");
        setWorkoutSort(defaultWorkoutSort);
      } else {
        const selectedId = storedData.selectedWorkoutId
          && storedData.workouts.some((item) => item.id === storedData.selectedWorkoutId)
          ? storedData.selectedWorkoutId
          : storedData.workouts[0]?.id ?? "";
        setSavedWorkouts(storedData.workouts);
        setSelectedWorkoutId(selectedId);
        setWorkoutSort(storedData.sort);
      }

      setHasLoadedLocalWorkouts(true);
    }

    void hydrateLocalWorkouts();
    return () => {
      isMounted = false;
    };
  }, [hasLoadedAccountStorageMigration]);

  useEffect(() => {
    if (!hasLoadedLocalWorkouts) {
      return;
    }

    saveLocalWorkouts(
      savedWorkouts,
      selectedWorkoutId,
      workoutSort
    ).catch((error) => {
      console.error("Failed to save local workouts", error);
    });
  }, [
    hasLoadedLocalWorkouts,
    savedWorkouts,
    selectedWorkoutId,
    workoutSort
  ]);

  return {
    hasLoadedLocalWorkouts,
    savedWorkouts,
    selectedWorkoutId,
    setSavedWorkouts,
    setSelectedWorkoutId,
    setWorkoutSort,
    workoutSort
  };
}
