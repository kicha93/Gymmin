import {
  loadLocalOnlyJson,
  removeLocalOnlyValue,
  saveLocalOnlyJson
} from "../domain/localOnlyStorageMigration";
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
import {
  normalizeWorkoutCreatorProfiles,
  type WorkoutCreatorProfile
} from "../domain/workoutCreator";
import {
  normalizeAppSettings,
  type AppSettings,
  type LocalSettingsStorage
} from "../domain/appSettings";

export const LOCAL_WORKOUTS_STORAGE_BASE_KEY = "localWorkouts.v1";
export const LOCAL_SETTINGS_STORAGE_BASE_KEY = "localSettings.v1";
export const LOCAL_CREATOR_PROFILES_STORAGE_BASE_KEY = "localCreatorProfiles.v1";
export const ACTIVE_WORKOUT_SESSION_STORAGE_BASE_KEY = "activeWorkoutSession.v1";

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


export async function loadLocalWorkouts() {
  try {
    const storedData = await loadLocalOnlyJson<Partial<LocalWorkoutsStorage>>(LOCAL_WORKOUTS_STORAGE_BASE_KEY);
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
    console.error("Failed to load local workouts", error);
    return { exists: false, selectedWorkoutId: "", sort: defaultWorkoutSort, workouts: [] as SavedWorkout[] };
  }
}

export async function saveLocalWorkouts(
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

  await saveLocalOnlyJson(LOCAL_WORKOUTS_STORAGE_BASE_KEY, payload);
}

export async function loadLocalWorkoutSessions() {
  try {
    const storedData = await loadLocalOnlyJson<Partial<LocalWorkoutSessionsStorage>>(WORKOUT_SESSIONS_STORAGE_BASE_KEY);
    return normalizeWorkoutSessions(Array.isArray(storedData?.sessions) ? storedData.sessions : []);
  } catch (error) {
    console.error("Failed to load local workout sessions", error);
    return [];
  }
}

export async function saveLocalWorkoutSessions(sessions: WorkoutSession[]) {
  const payload: LocalWorkoutSessionsStorage = {
    sessions: normalizeWorkoutSessions(sessions),
    updatedAt: new Date().toISOString(),
    version: 1
  };
  await saveLocalOnlyJson(WORKOUT_SESSIONS_STORAGE_BASE_KEY, payload);
}

export async function loadLocalSettings(
  collapsedPanelDefaults: Record<string, boolean>
) {
  try {
    const storedData = await loadLocalOnlyJson<Partial<LocalSettingsStorage>>(LOCAL_SETTINGS_STORAGE_BASE_KEY);
    return {
      exists: Boolean(storedData),
      settings: normalizeAppSettings(storedData, collapsedPanelDefaults)
    };
  } catch (error) {
    console.error("Failed to load local settings", error);
    return {
      exists: false,
      settings: normalizeAppSettings(null, collapsedPanelDefaults)
    };
  }
}

export async function saveLocalSettings(settings: AppSettings) {
  await saveLocalOnlyJson(LOCAL_SETTINGS_STORAGE_BASE_KEY, {
    ...settings,
    version: 1
  } satisfies LocalSettingsStorage);
}

export async function loadLocalActiveWorkoutSession() {
  try {
    const storedData = await loadLocalOnlyJson<Partial<LocalActiveWorkoutSessionStorage>>(ACTIVE_WORKOUT_SESSION_STORAGE_BASE_KEY);
    return {
      entryIndex: storedData?.entryIndex,
      sessionId: typeof storedData?.sessionId === "string" ? storedData.sessionId : null
    };
  } catch (error) {
    console.error("Failed to load active workout session progress", error);
    return { entryIndex: 0, sessionId: null };
  }
}

export async function saveLocalActiveWorkoutSession(
  sessionId: string | null,
  entryIndex: number
) {
  if (!sessionId) {
    await removeLocalOnlyValue(ACTIVE_WORKOUT_SESSION_STORAGE_BASE_KEY);
    return;
  }

  const payload: LocalActiveWorkoutSessionStorage = {
    entryIndex,
    sessionId,
    updatedAt: new Date().toISOString(),
    version: 1
  };
  await saveLocalOnlyJson(ACTIVE_WORKOUT_SESSION_STORAGE_BASE_KEY, payload);
}

export async function loadLocalCreatorProfiles() {
  try {
    const storedData = await loadLocalOnlyJson<Partial<LocalCreatorProfilesStorage>>(LOCAL_CREATOR_PROFILES_STORAGE_BASE_KEY);
    return {
      profiles: normalizeWorkoutCreatorProfiles(storedData?.profiles),
      selectedProfileId: typeof storedData?.selectedProfileId === "string"
        ? storedData.selectedProfileId
        : null
    };
  } catch (error) {
    console.error("Failed to load local creator profiles", error);
    return { profiles: [] as WorkoutCreatorProfile[], selectedProfileId: null as string | null };
  }
}

export async function saveLocalCreatorProfiles(
  profiles: WorkoutCreatorProfile[],
  selectedProfileId: string | null
) {
  const normalizedProfiles = normalizeWorkoutCreatorProfiles(profiles);
  const selectedId = selectedProfileId && normalizedProfiles.some((profile) => profile.id === selectedProfileId)
    ? selectedProfileId
    : null;
  const payload: LocalCreatorProfilesStorage = {
    profiles: normalizedProfiles,
    selectedProfileId: selectedId,
    updatedAt: new Date().toISOString(),
    version: 1
  };
  await saveLocalOnlyJson(LOCAL_CREATOR_PROFILES_STORAGE_BASE_KEY, payload);
}
