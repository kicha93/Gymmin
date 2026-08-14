import type { AppSettings } from "../appSettings";
import { normalizeAppSettings } from "../appSettings";
import type { AppUsageStats, UserAchievement } from "../achievements";
import { normalizeAppUsageStats, normalizeUserAchievements } from "../achievements";
import type { FavoriteExercise } from "../favoriteExercises";
import { getActiveFavoriteExercises, normalizeFavoriteExercises } from "../favoriteExercises";
import { normalizeSavedWorkoutTextFields, normalizeWorkoutSortSettings } from "../savedWorkoutNormalization";
import type { SavedWorkout, WorkoutSortSettings } from "../savedWorkouts";
import { normalizeWeeklyPlanSettings, type WeeklyPlanSettings } from "../weeklyPlan";
import { normalizeWorkoutCreatorProfiles, type WorkoutCreatorProfile } from "../workoutCreator";
import { normalizeWorkoutSessions, type WorkoutSession } from "../workoutSessions";
import { findExerciseById, resolveExerciseId } from "../exercises";
import {
  normalizeLocalUserProfileBackup,
  type LocalUserProfileBackup
} from "../localUserProfile";

export const GYMMIN_BACKUP_FORMAT = "gymmin-backup" as const;
export const GYMMIN_BACKUP_VERSION = 1 as const;

export type GymminBackupSnapshot = {
  profile?: LocalUserProfileBackup;
  workouts: { items: SavedWorkout[]; selectedWorkoutId: string | null; sort: WorkoutSortSettings };
  workoutSessions: {
    items: Array<Omit<WorkoutSession, "deletedAt" | "updatedAt">>;
    active: { entryIndex: number; sessionId: string } | null;
  };
  settings: Omit<AppSettings, "updatedAt">;
  weeklyPlan: Omit<WeeklyPlanSettings, "updatedAt">;
  creatorProfiles: { items: WorkoutCreatorProfile[]; selectedProfileId: string | null };
  favoriteExercises: Array<Pick<FavoriteExercise, "createdAt" | "exerciseId">>;
  achievements: {
    unlocked: Array<Omit<UserAchievement, "updatedAt">>;
    appUsage: Pick<AppUsageStats, "totalForegroundSeconds">;
  };
};

export type GymminBackupV1 = {
  appVersion: string;
  createdAt: string;
  data: GymminBackupSnapshot;
  format: typeof GYMMIN_BACKUP_FORMAT;
  version: typeof GYMMIN_BACKUP_VERSION;
};

export type GymminBackupSummary = {
  achievementCount: number;
  createdAt: string;
  creatorProfileCount: number;
  favoriteCount: number;
  sessionCount: number;
  weeklyPlanItemCount: number;
  workoutCount: number;
};

export class GymminBackupValidationError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "GymminBackupValidationError";
  }
}

export function createGymminBackup(
  snapshot: GymminBackupSnapshot,
  options: { appVersion: string; now?: Date }
): GymminBackupV1 {
  const createdAt = (options.now ?? new Date()).toISOString();
  return {
    appVersion: options.appVersion,
    createdAt,
    data: normalizeGymminBackupSnapshot(snapshot, createdAt),
    format: GYMMIN_BACKUP_FORMAT,
    version: GYMMIN_BACKUP_VERSION
  };
}

export function serializeGymminBackup(backup: GymminBackupV1) {
  return `${JSON.stringify(backup, null, 2)}\n`;
}

export function parseGymminBackup(raw: string, collapsedPanelDefaults: Record<string, boolean>): GymminBackupV1 {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new GymminBackupValidationError("malformed-json", "The selected file is not valid JSON.");
  }
  if (!isRecord(parsed)) throwInvalid("invalid-root", "The backup root must be an object.");
  if (parsed.format !== GYMMIN_BACKUP_FORMAT) throwInvalid("invalid-format", "This is not a Gymmin backup file.");
  if (parsed.version !== GYMMIN_BACKUP_VERSION) {
    throwInvalid("unsupported-version", `Unsupported Gymmin backup version: ${String(parsed.version)}.`);
  }
  if (!isIsoDate(parsed.createdAt) || typeof parsed.appVersion !== "string" || !isRecord(parsed.data)) {
    throwInvalid("missing-metadata", "The backup metadata is incomplete.");
  }
  validateSnapshotShape(parsed.data);
  validateRawReferences(parsed.data);
  const data = normalizeGymminBackupSnapshot(parsed.data as GymminBackupSnapshot, parsed.createdAt, collapsedPanelDefaults);
  validateReferences(data);
  return {
    appVersion: parsed.appVersion,
    createdAt: new Date(parsed.createdAt).toISOString(),
    data,
    format: GYMMIN_BACKUP_FORMAT,
    version: GYMMIN_BACKUP_VERSION
  };
}

export function getGymminBackupSummary(backup: GymminBackupV1): GymminBackupSummary {
  return {
    achievementCount: backup.data.achievements.unlocked.length,
    createdAt: backup.createdAt,
    creatorProfileCount: backup.data.creatorProfiles.items.length,
    favoriteCount: backup.data.favoriteExercises.length,
    sessionCount: backup.data.workoutSessions.items.filter((session) => session.status === "completed").length,
    weeklyPlanItemCount: backup.data.weeklyPlan.items.length,
    workoutCount: backup.data.workouts.items.length
  };
}

export function createGymminBackupFilename(date = new Date()) {
  const stamp = date.toISOString().slice(0, 16).replace("T", "_").replace(":", "-");
  return `Gymmin_backup_${stamp}.gymmin.json`;
}

function normalizeGymminBackupSnapshot(
  value: GymminBackupSnapshot,
  now: string,
  collapsedPanelDefaults: Record<string, boolean> = value.settings?.collapsedPanels ?? {}
): GymminBackupSnapshot {
  const workouts = value.workouts.items.map(normalizeSavedWorkoutTextFields);
  const workoutIds = new Set(workouts.map((workout) => workout.id));
  const sessions = normalizeWorkoutSessions(value.workoutSessions.items).filter((session) => !session.deletedAt);
  const settings = normalizeAppSettings({ ...value.settings, updatedAt: now }, collapsedPanelDefaults, now);
  const normalizedWeeklyPlan = normalizeWeeklyPlanSettings({ ...value.weeklyPlan, updatedAt: now }, new Date(now));
  const weeklyPlanItems = normalizedWeeklyPlan.items
    .filter((item) => workoutIds.has(item.workoutId))
    .map((item, index) => ({ ...item, order: index }));
  const weeklyPlan = {
    ...normalizedWeeklyPlan,
    enabled: normalizedWeeklyPlan.enabled && weeklyPlanItems.length > 0,
    items: weeklyPlanItems
  };
  const profiles = normalizeWorkoutCreatorProfiles(value.creatorProfiles.items);
  const favorites = getActiveFavoriteExercises(normalizeFavoriteExercises(value.favoriteExercises));
  const achievements = normalizeUserAchievements(value.achievements.unlocked);
  const usage = normalizeAppUsageStats(value.achievements.appUsage, now);
  const { updatedAt: _settingsUpdatedAt, ...stableSettings } = settings;
  const { updatedAt: _weeklyUpdatedAt, ...stableWeeklyPlan } = weeklyPlan;
  return {
    achievements: {
      appUsage: { totalForegroundSeconds: usage.totalForegroundSeconds },
      unlocked: achievements.map(({ updatedAt: _updatedAt, ...achievement }) => achievement)
    },
    creatorProfiles: {
      items: profiles,
      selectedProfileId: profiles.some((profile) => profile.id === value.creatorProfiles.selectedProfileId)
        ? value.creatorProfiles.selectedProfileId
        : null
    },
    favoriteExercises: favorites.map(({ createdAt, exerciseId }) => ({ createdAt, exerciseId })),
    profile: normalizeLocalUserProfileBackup(value.profile),
    settings: stableSettings,
    weeklyPlan: stableWeeklyPlan,
    workoutSessions: {
      active: value.workoutSessions.active && sessions.some((session) => session.id === value.workoutSessions.active?.sessionId)
        ? { entryIndex: Math.max(0, Math.floor(value.workoutSessions.active.entryIndex)), sessionId: value.workoutSessions.active.sessionId }
        : null,
      items: sessions.map(({ deletedAt: _deletedAt, updatedAt: _updatedAt, ...session }) => session)
    },
    workouts: {
      items: workouts,
      selectedWorkoutId: workouts.some((workout) => workout.id === value.workouts.selectedWorkoutId)
        ? value.workouts.selectedWorkoutId
        : null,
      sort: normalizeWorkoutSortSettings(value.workouts.sort)
    }
  };
}

function validateSnapshotShape(data: Record<string, unknown>) {
  for (const key of ["workouts", "workoutSessions", "settings", "weeklyPlan", "creatorProfiles", "favoriteExercises", "achievements"]) {
    if (!(key in data)) throwInvalid("missing-section", `Missing required backup section: ${key}.`);
  }
  const workouts = requireRecord(data.workouts, "workouts");
  const sessions = requireRecord(data.workoutSessions, "workoutSessions");
  const profiles = requireRecord(data.creatorProfiles, "creatorProfiles");
  const achievements = requireRecord(data.achievements, "achievements");
  if (!Array.isArray(workouts.items) || !Array.isArray(sessions.items) || !Array.isArray(profiles.items)
    || !Array.isArray(data.favoriteExercises) || !Array.isArray(achievements.unlocked)
    || !isRecord(data.settings) || !isRecord(data.weeklyPlan) || !isRecord(achievements.appUsage)) {
    throwInvalid("invalid-section", "A required backup section has an invalid shape.");
  }
  const workoutIds = new Set<string>();
  for (const item of workouts.items) {
    if (!isRecord(item) || !nonEmpty(item.id) || !nonEmpty(item.name) || !isValidDraft(item.draft)) {
      throwInvalid("invalid-workout", "The backup contains an invalid workout.");
    }
    if (workoutIds.has(item.id)) throwInvalid("duplicate-workout", `Duplicate workout id: ${item.id}.`);
    workoutIds.add(item.id);
  }
  const sessionIds = new Set<string>();
  for (const item of sessions.items) {
    if (!isRecord(item) || !nonEmpty(item.id) || !nonEmpty(item.sourceWorkoutId) || !isValidDraft(item.planSnapshot)
      || !Array.isArray(item.entries) || item.entries.some((entry: unknown) => !isRecord(entry) || !nonEmpty(entry.id))) {
      throwInvalid("invalid-session", "The backup contains an invalid workout session.");
    }
    if (sessionIds.has(item.id)) throwInvalid("duplicate-session", `Duplicate session id: ${item.id}.`);
    const entryIds = new Set<string>();
    for (const entry of item.entries) {
      if (entryIds.has(entry.id)) throwInvalid("invalid-session", `Duplicate session entry id: ${entry.id}.`);
      entryIds.add(entry.id);
      if (nonEmpty(entry.exerciseId) && !findExerciseById(resolveExerciseId(entry.exerciseId))) {
        throwInvalid("unknown-exercise", `Unknown exercise id: ${entry.exerciseId}.`);
      }
    }
    if (Array.isArray(item.supersets)) {
      for (const superset of item.supersets) {
        if (!isRecord(superset) || !Array.isArray(superset.entryIds) || superset.entryIds.length !== 2
          || superset.entryIds.some((entryId: unknown) => !nonEmpty(entryId) || !entryIds.has(entryId))) {
          throwInvalid("invalid-session-reference", "A session superset references a missing entry.");
        }
      }
    }
    sessionIds.add(item.id);
  }
  const profileIds = new Set<string>();
  for (const profile of profiles.items) {
    if (!isRecord(profile) || !nonEmpty(profile.id) || !nonEmpty(profile.name) || !isRecord(profile.draft)
      || profileIds.has(profile.id)) throwInvalid("invalid-profile", "The backup contains an invalid creator profile.");
    profileIds.add(profile.id);
  }
  for (const favorite of data.favoriteExercises) {
    if (!isRecord(favorite) || !nonEmpty(favorite.exerciseId) || !isIsoDate(favorite.createdAt)
      || !findExerciseById(resolveExerciseId(favorite.exerciseId))) {
      throwInvalid("invalid-favorite", "The backup contains an invalid favorite exercise.");
    }
  }
  for (const achievement of achievements.unlocked) {
    if (!isRecord(achievement) || !nonEmpty(achievement.achievementId) || !isIsoDate(achievement.unlockedAt)) {
      throwInvalid("invalid-achievement", "The backup contains an invalid achievement.");
    }
  }
  if (typeof achievements.appUsage.totalForegroundSeconds !== "number"
    || !Number.isFinite(achievements.appUsage.totalForegroundSeconds)
    || achievements.appUsage.totalForegroundSeconds < 0) {
    throwInvalid("invalid-app-usage", "The backup contains invalid app usage data.");
  }
  validateSettings(data.settings as Record<string, unknown>);
  if ("profile" in data && normalizeLocalUserProfileBackup(data.profile) === undefined) {
    throwInvalid("invalid-profile", "The backup contains an invalid local profile.");
  }
  if (typeof (data.weeklyPlan as Record<string, unknown>).enabled !== "boolean"
    || !Array.isArray((data.weeklyPlan as Record<string, unknown>).items)) {
    throwInvalid("invalid-weekly-plan", "The backup contains an invalid weekly plan.");
  }
}

function validateSettings(settings: Record<string, unknown>) {
  const strings = ["defaultSetCount", "defaultStageType", "defaultWorkoutExecutionMode", "defaultWorkoutTableOrientation", "defaultWeight", "language", "themeName"];
  if (strings.some((key) => typeof settings[key] !== "string")
    || !isRecord(settings.collapsedPanels) || !isRecord(settings.workoutReminders)
    || typeof settings.showRestTimer !== "boolean"
    || ("advancedMuscleMode" in settings && typeof settings.advancedMuscleMode !== "boolean")) {
    throwInvalid("invalid-settings", "The backup contains invalid application settings.");
  }
}

function validateRawReferences(data: Record<string, unknown>) {
  const workouts = requireRecord(data.workouts, "workouts");
  const sessions = requireRecord(data.workoutSessions, "workoutSessions");
  const workoutIds = new Set((workouts.items as Array<Record<string, unknown>>).map((item) => String(item.id)));
  const sessionIds = new Set((sessions.items as Array<Record<string, unknown>>).map((item) => String(item.id)));
  const weeklyPlan = requireRecord(data.weeklyPlan, "weeklyPlan");
  if (!Array.isArray(weeklyPlan.items)) throwInvalid("invalid-section", "Invalid weeklyPlan section.");
  for (const item of weeklyPlan.items) {
    if (!isRecord(item) || !nonEmpty(item.workoutId)) {
      throwInvalid("invalid-weekly-plan", "Weekly plan contains an invalid item.");
    }
  }
  if (workouts.selectedWorkoutId !== null && (!nonEmpty(workouts.selectedWorkoutId) || !workoutIds.has(workouts.selectedWorkoutId))) {
    throwInvalid("invalid-selected-workout-reference", "The selected workout does not exist in the backup.");
  }
  const profiles = requireRecord(data.creatorProfiles, "creatorProfiles");
  if (!Array.isArray(profiles.items)) throwInvalid("invalid-section", "Invalid creatorProfiles section.");
  const profileIds = new Set(profiles.items.flatMap((item) => isRecord(item) && nonEmpty(item.id) ? [item.id] : []));
  if (profiles.selectedProfileId !== null && (!nonEmpty(profiles.selectedProfileId) || !profileIds.has(profiles.selectedProfileId))) {
    throwInvalid("invalid-selected-profile-reference", "The selected creator profile does not exist in the backup.");
  }
  if (sessions.active !== null) {
    if (!isRecord(sessions.active) || !nonEmpty(sessions.active.sessionId) || !sessionIds.has(sessions.active.sessionId)) {
      throwInvalid("invalid-active-session-reference", "The active session does not exist in the backup.");
    }
  }
}

function validateReferences(data: GymminBackupSnapshot) {
  const workoutIds = new Set(data.workouts.items.map((item) => item.id));
  for (const item of data.weeklyPlan.items) {
    if (!workoutIds.has(item.workoutId)) throwInvalid("invalid-weekly-plan-reference", `Weekly plan references missing workout: ${item.workoutId}.`);
  }
  if (data.workoutSessions.active && !data.workoutSessions.items.some((item) => item.id === data.workoutSessions.active?.sessionId)) {
    throwInvalid("invalid-active-session-reference", "The active session does not exist in the backup.");
  }
}

function isValidDraft(value: unknown) {
  if (!isRecord(value) || typeof value.name !== "string" || typeof value.notes !== "string"
    || value.sport !== "strength" || !Array.isArray(value.steps)) return false;
  const ids = new Set<string>();
  const stages = new Set<string>();
  const sets = new Map<string, string>();
  for (const step of value.steps) {
    if (!isRecord(step) || !nonEmpty(step.id) || !["stage", "set", "exercise"].includes(String(step.kind))) return false;
    if (ids.has(step.id)) return false;
    ids.add(step.id);
    for (const key of ["exerciseName", "goalType", "label", "loadKg", "intensity", "notes", "setCount", "stageType", "targetValue"]) {
      if (typeof step[key] !== "string") return false;
    }
    if (step.kind === "stage") stages.add(step.id);
    if (step.kind === "set") {
      if (!nonEmpty(step.parentStageId) || !stages.has(step.parentStageId)) return false;
      sets.set(step.id, step.parentStageId);
    }
    if (step.kind === "exercise") {
      if (!nonEmpty(step.parentStageId) || !nonEmpty(step.parentSetId)
        || sets.get(step.parentSetId) !== step.parentStageId) return false;
      if (nonEmpty(step.exerciseId) && !findExerciseById(resolveExerciseId(step.exerciseId))) return false;
    }
  }
  return true;
}

function requireRecord(value: unknown, label: string) {
  if (!isRecord(value)) throwInvalid("invalid-section", `Invalid ${label} section.`);
  return value;
}
function throwInvalid(code: string, message: string): never { throw new GymminBackupValidationError(code, message); }
function nonEmpty(value: unknown): value is string { return typeof value === "string" && value.trim().length > 0; }
function isIsoDate(value: unknown): value is string { return typeof value === "string" && Number.isFinite(Date.parse(value)); }
function isRecord(value: unknown): value is Record<string, any> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
