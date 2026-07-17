import { useEffect, useState } from "react";

import {
  FAVORITE_EXERCISES_LEGACY_STORAGE_KEY,
  FAVORITE_EXERCISES_LEGACY_SYNC_STORAGE_KEY,
  FAVORITE_EXERCISES_STORAGE_BASE_KEY,
  FAVORITE_EXERCISES_SYNC_STORAGE_BASE_KEY
} from "../../domain/favoriteExercises";
import {
  migrateLegacyAccountStorage,
  type LegacyAccountStorageMapping
} from "../../domain/accountStorage";
import {
  WORKOUT_SESSIONS_LEGACY_SYNC_STORAGE_KEY,
  WORKOUT_SESSIONS_STORAGE_BASE_KEY,
  WORKOUT_SESSIONS_SYNC_STORAGE_BASE_KEY
} from "../../domain/workoutSessions";
import {
  LOCAL_CREATOR_JOB_STORAGE_BASE_KEY,
  LOCAL_CREATOR_PROFILES_STORAGE_BASE_KEY,
  LOCAL_SETTINGS_STORAGE_BASE_KEY,
  LOCAL_WORKOUTS_STORAGE_BASE_KEY
} from "../../storage/localDataRepositories";

export const accountStorageLegacyMappings: LegacyAccountStorageMapping[] = [
  { baseKey: LOCAL_WORKOUTS_STORAGE_BASE_KEY, legacyKey: "gymmin.localWorkouts.v1" },
  { baseKey: LOCAL_WORKOUTS_STORAGE_BASE_KEY, legacyKey: "gymmin.workouts" },
  { baseKey: LOCAL_SETTINGS_STORAGE_BASE_KEY, legacyKey: "gymmin.localSettings.v1" },
  { baseKey: LOCAL_SETTINGS_STORAGE_BASE_KEY, legacyKey: "gymmin.settings" },
  { baseKey: LOCAL_CREATOR_PROFILES_STORAGE_BASE_KEY, legacyKey: "gymmin.localCreatorProfiles.v1" },
  { baseKey: LOCAL_CREATOR_JOB_STORAGE_BASE_KEY, legacyKey: "gymmin.localCreatorJob.v1" },
  { baseKey: WORKOUT_SESSIONS_STORAGE_BASE_KEY, legacyKey: "gymmin.workoutSessions" },
  {
    baseKey: WORKOUT_SESSIONS_SYNC_STORAGE_BASE_KEY,
    legacyKey: WORKOUT_SESSIONS_LEGACY_SYNC_STORAGE_KEY
  },
  {
    baseKey: FAVORITE_EXERCISES_STORAGE_BASE_KEY,
    legacyKey: FAVORITE_EXERCISES_LEGACY_STORAGE_KEY
  },
  {
    baseKey: FAVORITE_EXERCISES_SYNC_STORAGE_BASE_KEY,
    legacyKey: FAVORITE_EXERCISES_LEGACY_SYNC_STORAGE_KEY
  }
];

export function useAccountStorageMigration() {
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function runMigration() {
      await migrateLegacyAccountStorage(accountStorageLegacyMappings);

      if (isMounted) {
        setHasLoaded(true);
      }
    }

    void runMigration();

    return () => {
      isMounted = false;
    };
  }, []);

  return hasLoaded;
}
