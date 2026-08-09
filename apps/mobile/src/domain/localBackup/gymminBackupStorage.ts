import AsyncStorage from "@react-native-async-storage/async-storage";

import { ACHIEVEMENTS_STORAGE_BASE_KEY, APP_USAGE_STATS_STORAGE_BASE_KEY } from "../achievements";
import { FAVORITE_EXERCISES_STORAGE_BASE_KEY } from "../favoriteExercises";
import { getLocalOnlyStorageKey } from "../localOnlyStorageMigration";
import {
  ACTIVE_WORKOUT_SESSION_STORAGE_BASE_KEY,
  LOCAL_CREATOR_PROFILES_STORAGE_BASE_KEY,
  LOCAL_SETTINGS_STORAGE_BASE_KEY,
  LOCAL_WORKOUTS_STORAGE_BASE_KEY
} from "../../storage/localDataRepositories";
import { WEEKLY_PLAN_STORAGE_BASE_KEY } from "../weeklyPlan";
import { WORKOUT_SESSIONS_STORAGE_BASE_KEY } from "../workoutSessions";
import type { GymminBackupV1 } from "./gymminBackup";
import {
  commitLocalUserProfileBackupImport,
  LOCAL_USER_PROFILE_STORAGE_BASE_KEY,
  rollbackLocalUserProfileBackupImport,
  stageLocalUserProfileBackupImport
} from "../localUserProfile";

export const GYMMIN_BACKUP_IMPORT_JOURNAL_KEY = "gymmin.localImportTransaction.v1";
const GYMMIN_BACKUP_IMPORT_ROLLBACK_PREFIX = "gymmin.localImportRollback.v1";
const domainBaseKeys = [
  LOCAL_WORKOUTS_STORAGE_BASE_KEY,
  WORKOUT_SESSIONS_STORAGE_BASE_KEY,
  ACTIVE_WORKOUT_SESSION_STORAGE_BASE_KEY,
  LOCAL_SETTINGS_STORAGE_BASE_KEY,
  WEEKLY_PLAN_STORAGE_BASE_KEY,
  LOCAL_CREATOR_PROFILES_STORAGE_BASE_KEY,
  FAVORITE_EXERCISES_STORAGE_BASE_KEY,
  ACHIEVEMENTS_STORAGE_BASE_KEY,
  APP_USAGE_STATS_STORAGE_BASE_KEY,
  LOCAL_USER_PROFILE_STORAGE_BASE_KEY
] as const;

type ImportJournal = {
  entries: Array<{ key: string; rollbackKey: string | null }>;
  status: "applying";
  version: 1;
};

export async function importGymminBackupTransaction(backup: GymminBackupV1) {
  await recoverInterruptedGymminBackupImport();
  const stagedProfile = await stageLocalUserProfileBackupImport(backup.data.profile);
  const payloads = buildStoragePayloads(backup, stagedProfile.nextProfile);
  const writes = new Map<string, string>();
  for (const baseKey of domainBaseKeys) {
    const value = payloads.get(baseKey);
    if (value === undefined) throw new Error(`Missing import payload for ${baseKey}.`);
    writes.set(getLocalOnlyStorageKey(baseKey), value);
  }
  let journal: ImportJournal | null = null;
  try {
    journal = await createJournal([...writes.keys()]);
    for (const [key, value] of writes) await AsyncStorage.setItem(key, value);
    for (const [key, expected] of writes) {
      if (await AsyncStorage.getItem(key) !== expected) throw new Error(`Import integrity check failed for ${key}.`);
    }
    await cleanupJournal(journal);
    commitLocalUserProfileBackupImport(stagedProfile);
  } catch (error) {
    if (journal) await restoreJournal(journal);
    rollbackLocalUserProfileBackupImport(stagedProfile);
    throw error;
  }
}

export async function recoverInterruptedGymminBackupImport() {
  const raw = await AsyncStorage.getItem(GYMMIN_BACKUP_IMPORT_JOURNAL_KEY);
  if (!raw) return false;
  let journal: ImportJournal;
  try {
    journal = JSON.parse(raw) as ImportJournal;
    if (journal.version !== 1 || journal.status !== "applying" || !Array.isArray(journal.entries)) throw new Error();
  } catch {
    throw new Error("The local import recovery journal is damaged.");
  }
  await restoreJournal(journal);
  return true;
}

function buildStoragePayloads(backup: GymminBackupV1, profile: unknown) {
  const { data } = backup;
  const updatedAt = backup.createdAt;
  return new Map<string, string>([
    [LOCAL_WORKOUTS_STORAGE_BASE_KEY, JSON.stringify({ selectedWorkoutId: data.workouts.selectedWorkoutId ?? "", sort: data.workouts.sort, updatedAt, version: 1, workouts: data.workouts.items })],
    [WORKOUT_SESSIONS_STORAGE_BASE_KEY, JSON.stringify({ sessions: data.workoutSessions.items, updatedAt, version: 1 })],
    [ACTIVE_WORKOUT_SESSION_STORAGE_BASE_KEY, JSON.stringify({ entryIndex: data.workoutSessions.active?.entryIndex ?? 0, sessionId: data.workoutSessions.active?.sessionId ?? null, updatedAt, version: 1 })],
    [LOCAL_SETTINGS_STORAGE_BASE_KEY, JSON.stringify({ ...data.settings, updatedAt, version: 1 })],
    [WEEKLY_PLAN_STORAGE_BASE_KEY, JSON.stringify({ ...data.weeklyPlan, updatedAt })],
    [LOCAL_CREATOR_PROFILES_STORAGE_BASE_KEY, JSON.stringify({ profiles: data.creatorProfiles.items, selectedProfileId: data.creatorProfiles.selectedProfileId, updatedAt, version: 1 })],
    [FAVORITE_EXERCISES_STORAGE_BASE_KEY, JSON.stringify({ favorites: data.favoriteExercises, updatedAt, version: 1 })],
    [ACHIEVEMENTS_STORAGE_BASE_KEY, JSON.stringify({ achievements: data.achievements.unlocked, version: 1 })],
    [APP_USAGE_STATS_STORAGE_BASE_KEY, JSON.stringify({ ...data.achievements.appUsage, updatedAt, version: 1 })],
    [LOCAL_USER_PROFILE_STORAGE_BASE_KEY, JSON.stringify(profile)]
  ]);
}

async function restoreJournal(journal: ImportJournal) {
  const before: Record<string, string | null> = {};
  for (const entry of journal.entries) {
    if (!entry || typeof entry.key !== "string" || (entry.rollbackKey !== null && typeof entry.rollbackKey !== "string")) {
      throw new Error("The local import recovery journal is damaged.");
    }
    before[entry.key] = entry.rollbackKey === null ? null : await AsyncStorage.getItem(entry.rollbackKey);
    if (entry.rollbackKey !== null && before[entry.key] === null) {
      throw new Error("The local import rollback snapshot is incomplete.");
    }
  }
  await restoreValues(before);
  await cleanupJournal(journal);
}

async function createJournal(keys: string[]): Promise<ImportJournal> {
  const entries: ImportJournal["entries"] = [];
  try {
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index];
      const value = await AsyncStorage.getItem(key);
      const rollbackKey = value === null ? null : `${GYMMIN_BACKUP_IMPORT_ROLLBACK_PREFIX}.${index}`;
      if (rollbackKey && value !== null) await AsyncStorage.setItem(rollbackKey, value);
      entries.push({ key, rollbackKey });
    }
    const journal: ImportJournal = { entries, status: "applying", version: 1 };
    await AsyncStorage.setItem(GYMMIN_BACKUP_IMPORT_JOURNAL_KEY, JSON.stringify(journal));
    return journal;
  } catch (error) {
    for (const entry of entries) if (entry.rollbackKey) await AsyncStorage.removeItem(entry.rollbackKey);
    throw error;
  }
}

async function cleanupJournal(journal: ImportJournal) {
  await AsyncStorage.removeItem(GYMMIN_BACKUP_IMPORT_JOURNAL_KEY);
  for (const entry of journal.entries) if (entry.rollbackKey) await AsyncStorage.removeItem(entry.rollbackKey);
}

async function restoreValues(before: Record<string, string | null>) {
  const set: Array<[string, string]> = [];
  const remove: string[] = [];
  for (const [key, value] of Object.entries(before)) value === null ? remove.push(key) : set.push([key, value]);
  for (const [key, value] of set) await AsyncStorage.setItem(key, value);
  for (const key of remove) await AsyncStorage.removeItem(key);
  for (const [key, expected] of Object.entries(before)) {
    if (await AsyncStorage.getItem(key) !== expected) throw new Error(`Import rollback failed for ${key}.`);
  }
}
