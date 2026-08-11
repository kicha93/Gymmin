import { useEffect, useState } from "react";

import {
  ACHIEVEMENTS_STORAGE_BASE_KEY,
  APP_USAGE_STATS_STORAGE_BASE_KEY
} from "../../domain/achievements";
import {
  FAVORITE_EXERCISES_LEGACY_STORAGE_KEY,
  FAVORITE_EXERCISES_STORAGE_BASE_KEY
} from "../../domain/favoriteExercises";
import type { LegacyAccountStorageMapping } from "../../domain/accountStorage";
import {
  initializeLocalOnlyStorageRuntime
} from "../../domain/localOnlyStorageMigration";
import { recoverInterruptedGymminBackupImport } from "../../domain/localBackup/gymminBackupStorage";
import { WEEKLY_PLAN_STORAGE_BASE_KEY } from "../../domain/weeklyPlan";
import {
  WORKOUT_SESSIONS_STORAGE_BASE_KEY
} from "../../domain/workoutSessions";
import {
  ACTIVE_WORKOUT_SESSION_STORAGE_BASE_KEY,
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
  { baseKey: WORKOUT_SESSIONS_STORAGE_BASE_KEY, legacyKey: "gymmin.workoutSessions" },
  {
    baseKey: FAVORITE_EXERCISES_STORAGE_BASE_KEY,
    legacyKey: FAVORITE_EXERCISES_LEGACY_STORAGE_KEY
  }
];

export const localOnlyStorageBaseKeys = [
  LOCAL_WORKOUTS_STORAGE_BASE_KEY,
  LOCAL_SETTINGS_STORAGE_BASE_KEY,
  LOCAL_CREATOR_PROFILES_STORAGE_BASE_KEY,
  ACTIVE_WORKOUT_SESSION_STORAGE_BASE_KEY,
  WORKOUT_SESSIONS_STORAGE_BASE_KEY,
  FAVORITE_EXERCISES_STORAGE_BASE_KEY,
  ACHIEVEMENTS_STORAGE_BASE_KEY,
  APP_USAGE_STATS_STORAGE_BASE_KEY,
  WEEKLY_PLAN_STORAGE_BASE_KEY
] as const;

export type LocalOnlyStorageBootstrapHookState = {
  error: string;
  hasLoaded: boolean;
  isSelecting: boolean;
  retry: () => Promise<void>;
};

export function useLocalOnlyStorageBootstrap(): LocalOnlyStorageBootstrapHookState {
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState("");
  const [isSelecting, setIsSelecting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function runMigration() {
      try {
        await recoverInterruptedGymminBackupImport();
        await initializeLocalOnlyStorageRuntime();
        if (isMounted) {
          setHasLoaded(true);
        }
      } catch (migrationError) {
        console.error("Failed to prepare local-only storage migration", migrationError);
        if (isMounted) {
          setError(migrationError instanceof Error ? migrationError.message : "Storage migration failed.");
        }
      }
    }

    void runMigration();

    return () => {
      isMounted = false;
    };
  }, []);

  async function retry() {
    setIsSelecting(true);
    setError("");
    try {
      await recoverInterruptedGymminBackupImport();
      await initializeLocalOnlyStorageRuntime();
      setHasLoaded(true);
    } catch (migrationError) {
      console.error("Failed to retry local-only storage migration", migrationError);
      setError(migrationError instanceof Error ? migrationError.message : "Storage migration failed.");
    } finally {
      setIsSelecting(false);
    }
  }

  return {
    error,
    hasLoaded,
    isSelecting,
    retry
  };
}
