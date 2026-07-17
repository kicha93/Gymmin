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
  loadWorkoutsForOwner,
  saveWorkoutsForOwner
} from "../../storage/localDataRepositories";

export function useAccountScopedWorkouts(
  storageOwnerId: string,
  hasLoadedAccountStorageMigration: boolean,
  initialWorkouts: SavedWorkout[]
) {
  const normalizedInitialWorkouts = () => initialWorkouts.map(normalizeSavedWorkoutTextFields);
  const [savedWorkouts, setSavedWorkouts] = useState<SavedWorkout[]>(normalizedInitialWorkouts);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState(initialWorkouts[0]?.id ?? "");
  const [workoutSort, setWorkoutSort] = useState<WorkoutSortSettings>(defaultWorkoutSort);
  const [hasLoadedLocalWorkouts, setHasLoadedLocalWorkouts] = useState(false);
  const [loadedWorkoutsOwnerId, setLoadedWorkoutsOwnerId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadLocalWorkouts() {
      if (!hasLoadedAccountStorageMigration) {
        return;
      }

      const ownerId = storageOwnerId;
      setHasLoadedLocalWorkouts(false);
      setLoadedWorkoutsOwnerId(null);

      const storedData = await loadWorkoutsForOwner(ownerId);
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

      setLoadedWorkoutsOwnerId(ownerId);
      setHasLoadedLocalWorkouts(true);
    }

    void loadLocalWorkouts();
    return () => {
      isMounted = false;
    };
  }, [hasLoadedAccountStorageMigration, storageOwnerId]);

  useEffect(() => {
    if (!hasLoadedLocalWorkouts || loadedWorkoutsOwnerId !== storageOwnerId) {
      return;
    }

    saveWorkoutsForOwner(
      storageOwnerId,
      savedWorkouts,
      selectedWorkoutId,
      workoutSort
    ).catch((error) => {
      console.error("Failed to save local workouts", error);
    });
  }, [
    hasLoadedLocalWorkouts,
    loadedWorkoutsOwnerId,
    savedWorkouts,
    selectedWorkoutId,
    storageOwnerId,
    workoutSort
  ]);

  return {
    hasLoadedLocalWorkouts,
    loadedWorkoutsOwnerId,
    savedWorkouts,
    selectedWorkoutId,
    setSavedWorkouts,
    setSelectedWorkoutId,
    setWorkoutSort,
    workoutSort
  };
}
