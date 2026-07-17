import {
  ANONYMOUS_LOCAL_OWNER,
  loadAccountJson,
  removeAccountJson,
  saveAccountJson
} from "../domain/accountStorage";
import {
  defaultWorkoutSort,
  normalizeSavedWorkoutTextFields,
  normalizeWorkoutSortSettings
} from "../domain/savedWorkoutNormalization";
import type { SavedWorkout, WorkoutSortSettings } from "../domain/savedWorkouts";
import {
  normalizeWorkoutSessions,
  WORKOUT_SESSIONS_STORAGE_BASE_KEY,
  type WorkoutSession
} from "../domain/workoutSessions";
import type { WorkoutCreatorProfile } from "../domain/workoutCreator";
import {
  normalizePendingWorkoutCreatorJob,
  type PendingWorkoutCreatorJob
} from "../domain/workoutCreatorJob";
import {
  normalizeAppSettings,
  type AppSettings,
  type LocalSettingsStorage
} from "../domain/appSettings";

export const LOCAL_WORKOUTS_STORAGE_BASE_KEY = "localWorkouts.v1";
export const LOCAL_SETTINGS_STORAGE_BASE_KEY = "localSettings.v1";
export const LOCAL_CREATOR_PROFILES_STORAGE_BASE_KEY = "localCreatorProfiles.v1";
export const LOCAL_CREATOR_JOB_STORAGE_BASE_KEY = "localCreatorJob.v1";
export const ACTIVE_WORKOUT_SESSION_STORAGE_BASE_KEY = "activeWorkoutSession.v1";
export const ANONYMOUS_MERGE_HANDLED_STORAGE_BASE_KEY = "anonymousMergeHandled.v1";

export type LocalWorkoutsStorage = {
  selectedWorkoutId: string;
  sort?: WorkoutSortSettings;
  updatedAt: string;
  version: 1;
  workouts: SavedWorkout[];
};

export type LocalWorkoutSessionsStorage = {
  sessions: WorkoutSession[];
  updatedAt: string;
  version: 1;
};

export type LocalActiveWorkoutSessionStorage = {
  entryIndex: number;
  sessionId: string | null;
  updatedAt: string;
  version: 1;
};

export type LocalCreatorProfilesStorage = {
  profiles: WorkoutCreatorProfile[];
  selectedProfileId: string | null;
  updatedAt: string;
  version: 1;
};

export type AnonymousMergeAction = "merged" | "deleted" | "skipped";

export async function loadWorkoutsForOwner(ownerId: string) {
  try {
    const storedData = await loadAccountJson<Partial<LocalWorkoutsStorage>>(
      LOCAL_WORKOUTS_STORAGE_BASE_KEY,
      ownerId
    );
    if (!storedData) {
      return { exists: false, selectedWorkoutId: "", sort: defaultWorkoutSort, workouts: [] as SavedWorkout[] };
    }

    return {
      exists: true,
      selectedWorkoutId: typeof storedData.selectedWorkoutId === "string" ? storedData.selectedWorkoutId : "",
      sort: normalizeWorkoutSortSettings(storedData.sort),
      workouts: Array.isArray(storedData.workouts)
        ? storedData.workouts.map(normalizeSavedWorkoutTextFields)
        : []
    };
  } catch (error) {
    console.error("Failed to load account-scoped workouts", error);
    return { exists: false, selectedWorkoutId: "", sort: defaultWorkoutSort, workouts: [] as SavedWorkout[] };
  }
}

export async function saveWorkoutsForOwner(
  ownerId: string,
  workouts: SavedWorkout[],
  selectedWorkoutId = "",
  sortSettings: WorkoutSortSettings = defaultWorkoutSort
) {
  const selectedId = selectedWorkoutId && workouts.some((workout) => workout.id === selectedWorkoutId)
    ? selectedWorkoutId
    : workouts[0]?.id ?? "";
  const payload: LocalWorkoutsStorage = {
    selectedWorkoutId: selectedId,
    sort: normalizeWorkoutSortSettings(sortSettings),
    updatedAt: new Date().toISOString(),
    version: 1,
    workouts: workouts.map(normalizeSavedWorkoutTextFields)
  };

  await saveAccountJson(LOCAL_WORKOUTS_STORAGE_BASE_KEY, payload, ownerId);
}

export async function loadWorkoutSessionsForOwner(ownerId: string) {
  try {
    const storedData = await loadAccountJson<Partial<LocalWorkoutSessionsStorage>>(
      WORKOUT_SESSIONS_STORAGE_BASE_KEY,
      ownerId
    );
    return normalizeWorkoutSessions(Array.isArray(storedData?.sessions) ? storedData.sessions : []);
  } catch (error) {
    console.error("Failed to load account-scoped workout sessions", error);
    return [];
  }
}

export async function saveWorkoutSessionsForOwner(ownerId: string, sessions: WorkoutSession[]) {
  const payload: LocalWorkoutSessionsStorage = {
    sessions: normalizeWorkoutSessions(sessions),
    updatedAt: new Date().toISOString(),
    version: 1
  };
  await saveAccountJson(WORKOUT_SESSIONS_STORAGE_BASE_KEY, payload, ownerId);
}

export async function loadSettingsForOwner(
  ownerId: string,
  collapsedPanelDefaults: Record<string, boolean>
) {
  try {
    const storedData = await loadAccountJson<Partial<LocalSettingsStorage>>(
      LOCAL_SETTINGS_STORAGE_BASE_KEY,
      ownerId
    );
    return normalizeAppSettings(storedData, collapsedPanelDefaults);
  } catch (error) {
    console.error("Failed to load local settings", error);
    return normalizeAppSettings(null, collapsedPanelDefaults);
  }
}

export async function saveSettingsForOwner(ownerId: string, settings: AppSettings) {
  await saveAccountJson(LOCAL_SETTINGS_STORAGE_BASE_KEY, {
    ...settings,
    version: 1
  } satisfies LocalSettingsStorage, ownerId);
}

export async function loadActiveWorkoutSessionForOwner(ownerId: string) {
  try {
    const storedData = await loadAccountJson<Partial<LocalActiveWorkoutSessionStorage>>(
      ACTIVE_WORKOUT_SESSION_STORAGE_BASE_KEY,
      ownerId
    );
    return {
      entryIndex: storedData?.entryIndex,
      sessionId: typeof storedData?.sessionId === "string" ? storedData.sessionId : null
    };
  } catch (error) {
    console.error("Failed to load active workout session progress", error);
    return { entryIndex: 0, sessionId: null };
  }
}

export async function saveActiveWorkoutSessionForOwner(
  ownerId: string,
  sessionId: string | null,
  entryIndex: number
) {
  if (!sessionId) {
    await removeAccountJson(ACTIVE_WORKOUT_SESSION_STORAGE_BASE_KEY, ownerId);
    return;
  }

  const payload: LocalActiveWorkoutSessionStorage = {
    entryIndex,
    sessionId,
    updatedAt: new Date().toISOString(),
    version: 1
  };
  await saveAccountJson(ACTIVE_WORKOUT_SESSION_STORAGE_BASE_KEY, payload, ownerId);
}

export async function loadCreatorProfilesForOwner(ownerId: string) {
  try {
    const storedData = await loadAccountJson<Partial<LocalCreatorProfilesStorage>>(
      LOCAL_CREATOR_PROFILES_STORAGE_BASE_KEY,
      ownerId
    );
    return {
      profiles: Array.isArray(storedData?.profiles) ? storedData.profiles : [],
      selectedProfileId: typeof storedData?.selectedProfileId === "string"
        ? storedData.selectedProfileId
        : null
    };
  } catch (error) {
    console.error("Failed to load account-scoped creator profiles", error);
    return { profiles: [] as WorkoutCreatorProfile[], selectedProfileId: null as string | null };
  }
}

export async function saveCreatorProfilesForOwner(
  ownerId: string,
  profiles: WorkoutCreatorProfile[],
  selectedProfileId: string | null
) {
  const selectedId = selectedProfileId && profiles.some((profile) => profile.id === selectedProfileId)
    ? selectedProfileId
    : null;
  const payload: LocalCreatorProfilesStorage = {
    profiles,
    selectedProfileId: selectedId,
    updatedAt: new Date().toISOString(),
    version: 1
  };
  await saveAccountJson(LOCAL_CREATOR_PROFILES_STORAGE_BASE_KEY, payload, ownerId);
}

export async function loadCreatorJobForOwner(ownerId: string) {
  try {
    const storedData = await loadAccountJson<unknown>(LOCAL_CREATOR_JOB_STORAGE_BASE_KEY, ownerId);
    return normalizePendingWorkoutCreatorJob(storedData);
  } catch (error) {
    console.error("Failed to load pending creator job", error);
    return null;
  }
}

export async function saveCreatorJobForOwner(
  ownerId: string,
  job: PendingWorkoutCreatorJob | null
) {
  if (!job) {
    await removeAccountJson(LOCAL_CREATOR_JOB_STORAGE_BASE_KEY, ownerId);
    return;
  }

  await saveAccountJson(LOCAL_CREATOR_JOB_STORAGE_BASE_KEY, job, ownerId);
}

export function mergeCreatorProfilesById(
  accountProfiles: WorkoutCreatorProfile[],
  anonymousProfiles: WorkoutCreatorProfile[]
) {
  const seen = new Set<string>();
  return [...accountProfiles, ...anonymousProfiles].filter((profile) => {
    if (!profile.id || seen.has(profile.id)) {
      return false;
    }
    seen.add(profile.id);
    return true;
  });
}

export async function hasAnonymousAccountData(baseKeys: string[]) {
  for (const baseKey of baseKeys) {
    try {
      const parsed = await loadAccountJson<unknown>(baseKey, ANONYMOUS_LOCAL_OWNER);
      if (!parsed) {
        continue;
      }
      if (!isRecord(parsed)) {
        return true;
      }
      if (
        (Array.isArray(parsed.workouts) && parsed.workouts.length > 0)
        || (Array.isArray(parsed.sessions) && parsed.sessions.length > 0)
        || (Array.isArray(parsed.profiles) && parsed.profiles.length > 0)
        || (Array.isArray(parsed.favorites) && parsed.favorites.length > 0)
        || (Array.isArray(parsed.achievements) && parsed.achievements.length > 0)
        || (typeof parsed.totalForegroundSeconds === "number" && parsed.totalForegroundSeconds > 0)
        || (typeof parsed.jobId === "string" && parsed.jobId.trim().length > 0)
      ) {
        return true;
      }
    } catch {
      return true;
    }
  }
  return false;
}

export async function hasAnonymousMergeHandled(userId: string) {
  try {
    const parsed = await loadAccountJson<unknown>(ANONYMOUS_MERGE_HANDLED_STORAGE_BASE_KEY, userId);
    return isRecord(parsed) && parsed.version === 1 && typeof parsed.handledAt === "string";
  } catch {
    return false;
  }
}

export async function markAnonymousMergeHandled(userId: string, action: AnonymousMergeAction) {
  await saveAccountJson(ANONYMOUS_MERGE_HANDLED_STORAGE_BASE_KEY, {
    action,
    handledAt: new Date().toISOString(),
    version: 1
  }, userId);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
