import AsyncStorage from "@react-native-async-storage/async-storage";

import { getLocalOnlyStorageKey } from "./localOnlyStorageMigration";
import {
  cloneCreatorDraft,
  type WorkoutCreatorDraft,
  type WorkoutCreatorPhase
} from "./workoutCreator";

export const WORKOUT_CREATOR_SESSION_STORAGE_BASE_KEY = "workoutCreatorSession.v1";

export type WorkoutCreatorSession = {
  draft: WorkoutCreatorDraft;
  phase: WorkoutCreatorPhase;
  profileName: string;
  prompt: string;
  response: string;
  selectedProfileId: string | null;
  updatedAt: string;
};

export async function loadWorkoutCreatorSession(): Promise<WorkoutCreatorSession | null> {
  try {
    const raw = await AsyncStorage.getItem(getLocalOnlyStorageKey(WORKOUT_CREATOR_SESSION_STORAGE_BASE_KEY));
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<WorkoutCreatorSession>;
    if (!value.draft || typeof value.draft !== "object" || Array.isArray(value.draft)) return null;
    return {
      draft: cloneCreatorDraft(value.draft),
      phase: value.phase === "profilePrompt" ? "profilePrompt" : "form",
      profileName: typeof value.profileName === "string" ? value.profileName.slice(0, 120) : "",
      prompt: typeof value.prompt === "string" ? value.prompt.slice(0, 2_000_000) : "",
      response: typeof value.response === "string" ? value.response.slice(0, 1_000_000) : "",
      selectedProfileId: typeof value.selectedProfileId === "string" ? value.selectedProfileId : null,
      updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date(0).toISOString()
    };
  } catch {
    return null;
  }
}

export async function saveWorkoutCreatorSession(session: Omit<WorkoutCreatorSession, "updatedAt">) {
  await AsyncStorage.setItem(
    getLocalOnlyStorageKey(WORKOUT_CREATOR_SESSION_STORAGE_BASE_KEY),
    JSON.stringify({ ...session, draft: cloneCreatorDraft(session.draft), updatedAt: new Date().toISOString() })
  );
}

export async function clearWorkoutCreatorSession() {
  await AsyncStorage.removeItem(getLocalOnlyStorageKey(WORKOUT_CREATOR_SESSION_STORAGE_BASE_KEY));
}
