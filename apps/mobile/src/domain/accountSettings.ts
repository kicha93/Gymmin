import type { AppSettings } from "./appSettings";
import { normalizeAppSettings } from "./appSettings";
import {
  normalizeWorkoutCreatorProfiles,
  type WorkoutCreatorProfile
} from "./workoutCreator";
import {
  normalizeWeeklyPlanSettings,
  type WeeklyPlanSettings
} from "./weeklyPlan";

export type SyncedAccountSettings = AppSettings & {
  creatorProfiles: WorkoutCreatorProfile[];
  selectedCreatorProfileId: string | null;
  weeklyPlan: WeeklyPlanSettings;
};

export function getSyncedAccountSettingsFieldPresence(value: unknown) {
  const record = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  return {
    creatorProfiles: Array.isArray(record.creatorProfiles),
    weeklyPlan: Boolean(
      record.weeklyPlan
      && typeof record.weeklyPlan === "object"
      && !Array.isArray(record.weeklyPlan)
    )
  };
}

export function buildSyncedAccountSettings(
  settings: AppSettings,
  creatorProfiles: WorkoutCreatorProfile[],
  selectedCreatorProfileId: string | null,
  weeklyPlan: WeeklyPlanSettings
): SyncedAccountSettings {
  const profiles = normalizeWorkoutCreatorProfiles(creatorProfiles);
  return {
    ...settings,
    creatorProfiles: profiles,
    selectedCreatorProfileId: selectedCreatorProfileId
      && profiles.some((profile) => profile.id === selectedCreatorProfileId)
      ? selectedCreatorProfileId
      : null,
    weeklyPlan: normalizeWeeklyPlanSettings(weeklyPlan)
  };
}

export function normalizeSyncedAccountSettings(
  value: unknown,
  collapsedPanelDefaults: Record<string, boolean>,
  now = new Date().toISOString()
): SyncedAccountSettings | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const profiles = normalizeWorkoutCreatorProfiles(record.creatorProfiles);
  const selectedProfileId = typeof record.selectedCreatorProfileId === "string"
    && profiles.some((profile) => profile.id === record.selectedCreatorProfileId)
    ? record.selectedCreatorProfileId
    : null;
  const normalizationDate = Number.isFinite(Date.parse(now)) ? new Date(now) : new Date();

  return {
    ...normalizeAppSettings(record, collapsedPanelDefaults, now),
    creatorProfiles: profiles,
    selectedCreatorProfileId: selectedProfileId,
    weeklyPlan: normalizeWeeklyPlanSettings(record.weeklyPlan, normalizationDate)
  };
}

export function preserveLocalCreatorProfilesDuringInitialSync(
  remoteSettings: SyncedAccountSettings,
  localProfiles: WorkoutCreatorProfile[],
  localSelectedProfileId: string | null,
  remotePayloadIncludedCreatorProfiles: boolean
): SyncedAccountSettings {
  if (remotePayloadIncludedCreatorProfiles || localProfiles.length === 0) {
    return remoteSettings;
  }

  return buildSyncedAccountSettings(
    remoteSettings,
    localProfiles,
    localSelectedProfileId,
    remoteSettings.weeklyPlan
  );
}

export function resolveWeeklyPlanDuringInitialSync(
  remoteSettings: SyncedAccountSettings,
  localWeeklyPlan: WeeklyPlanSettings,
  remotePayloadIncludedWeeklyPlan: boolean,
  hadPersistedLocalWeeklyPlan: boolean
): SyncedAccountSettings {
  if (remotePayloadIncludedWeeklyPlan &&
      (!hadPersistedLocalWeeklyPlan ||
       Date.parse(remoteSettings.weeklyPlan.updatedAt) > Date.parse(localWeeklyPlan.updatedAt))) {
    return remoteSettings;
  }

  return buildSyncedAccountSettings(
    remoteSettings,
    remoteSettings.creatorProfiles,
    remoteSettings.selectedCreatorProfileId,
    localWeeklyPlan
  );
}
