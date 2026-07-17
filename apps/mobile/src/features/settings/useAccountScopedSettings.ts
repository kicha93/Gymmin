import { useEffect, useRef, useState } from "react";

import type { LanguageCode } from "../../i18n/translations";
import type { ThemeName } from "../../theme/theme";
import type { WorkoutReminderSettings } from "../../domain/workoutReminders";
import type { StageType } from "../../domain/workouts";
import type { WorkoutExecutionMode } from "../../domain/workoutSessions";
import type {
  AppSettings,
  WorkoutTableOrientation
} from "../../domain/appSettings";
import {
  loadSettingsForOwner,
  saveSettingsForOwner
} from "../../storage/localDataRepositories";

export function useAccountScopedSettings(
  storageOwnerId: string,
  hasLoadedAccountStorageMigration: boolean,
  collapsedPanelDefaults: Record<string, boolean>
) {
  const [language, setLanguage] = useState<LanguageCode>("en");
  const [themeName, setThemeName] = useState<ThemeName>("light");
  const [defaultSetCount, setDefaultSetCount] = useState("");
  const [defaultWeight, setDefaultWeight] = useState("");
  const [defaultStageType, setDefaultStageType] = useState<StageType | "">("");
  const [defaultWorkoutExecutionMode, setDefaultWorkoutExecutionMode] =
    useState<WorkoutExecutionMode>("guided");
  const [defaultWorkoutTableOrientation, setDefaultWorkoutTableOrientation] =
    useState<WorkoutTableOrientation>("vertical");
  const [showRestTimer, setShowRestTimer] = useState(true);
  const [workoutReminders, setWorkoutReminders] = useState<WorkoutReminderSettings>({
    enabled: false,
    weeklySchedule: [],
    message: "",
    onlyIfNoWorkoutToday: true
  });
  const [collapsedPanels, setCollapsedPanels] =
    useState<Record<string, boolean>>(collapsedPanelDefaults);
  const [isAuthPanelDismissed, setIsAuthPanelDismissed] = useState(false);
  const [localSettingsUpdatedAt, setLocalSettingsUpdatedAt] =
    useState(() => new Date().toISOString());
  const [hasLoadedLocalSettings, setHasLoadedLocalSettings] = useState(false);
  const [loadedSettingsOwnerId, setLoadedSettingsOwnerId] = useState<string | null>(null);
  const isApplyingAccountSettingsRef = useRef(false);
  const hasPersistedLocalSettingsRef = useRef(false);

  function applySettings(settings: AppSettings, isRemote = false) {
    if (isRemote) {
      isApplyingAccountSettingsRef.current = true;
    }

    setLanguage(settings.language);
    setThemeName(settings.themeName);
    setDefaultSetCount(settings.defaultSetCount);
    setDefaultWeight(settings.defaultWeight);
    setDefaultStageType(settings.defaultStageType);
    setDefaultWorkoutExecutionMode(settings.defaultWorkoutExecutionMode);
    setDefaultWorkoutTableOrientation(settings.defaultWorkoutTableOrientation);
    setShowRestTimer(settings.showRestTimer);
    setWorkoutReminders(settings.workoutReminders);
    setCollapsedPanels(settings.collapsedPanels);
    setIsAuthPanelDismissed(settings.isAuthPanelDismissed);
    setLocalSettingsUpdatedAt(settings.updatedAt);

    if (isRemote) {
      setTimeout(() => {
        isApplyingAccountSettingsRef.current = false;
      }, 0);
    }
  }

  function buildSettings(updatedAt = localSettingsUpdatedAt): AppSettings {
    return {
      collapsedPanels,
      defaultSetCount,
      defaultStageType,
      defaultWorkoutExecutionMode,
      defaultWorkoutTableOrientation,
      defaultWeight,
      isAuthPanelDismissed,
      language,
      showRestTimer,
      themeName,
      updatedAt,
      workoutReminders
    };
  }

  useEffect(() => {
    let isMounted = true;

    async function loadSettings() {
      if (!hasLoadedAccountStorageMigration) {
        return;
      }

      const ownerId = storageOwnerId;
      setHasLoadedLocalSettings(false);
      setLoadedSettingsOwnerId(null);
      hasPersistedLocalSettingsRef.current = false;
      isApplyingAccountSettingsRef.current = false;
      const settings = await loadSettingsForOwner(ownerId, collapsedPanelDefaults);
      if (!isMounted) {
        return;
      }

      applySettings(settings);
      setLoadedSettingsOwnerId(ownerId);
      setHasLoadedLocalSettings(true);
    }

    void loadSettings();
    return () => {
      isMounted = false;
    };
  }, [hasLoadedAccountStorageMigration, storageOwnerId]);

  useEffect(() => {
    if (!hasLoadedLocalSettings || loadedSettingsOwnerId !== storageOwnerId) {
      return;
    }

    const shouldRefreshUpdatedAt =
      hasPersistedLocalSettingsRef.current && !isApplyingAccountSettingsRef.current;
    const updatedAt = shouldRefreshUpdatedAt
      ? new Date().toISOString()
      : localSettingsUpdatedAt;
    const settings = buildSettings(updatedAt);

    if (shouldRefreshUpdatedAt) {
      setLocalSettingsUpdatedAt(updatedAt);
    }
    hasPersistedLocalSettingsRef.current = true;

    saveSettingsForOwner(storageOwnerId, settings).catch((error) => {
      console.error("Failed to save local settings", error);
    });
  }, [
    collapsedPanels,
    defaultSetCount,
    defaultStageType,
    defaultWeight,
    defaultWorkoutExecutionMode,
    defaultWorkoutTableOrientation,
    hasLoadedLocalSettings,
    isAuthPanelDismissed,
    language,
    loadedSettingsOwnerId,
    showRestTimer,
    storageOwnerId,
    themeName,
    workoutReminders
  ]);

  return {
    applySettings,
    buildSettings,
    collapsedPanels,
    defaultSetCount,
    defaultStageType,
    defaultWeight,
    defaultWorkoutExecutionMode,
    defaultWorkoutTableOrientation,
    hasLoadedLocalSettings,
    isApplyingAccountSettingsRef,
    isAuthPanelDismissed,
    language,
    loadedSettingsOwnerId,
    localSettingsUpdatedAt,
    setCollapsedPanels,
    setDefaultSetCount,
    setDefaultStageType,
    setDefaultWeight,
    setDefaultWorkoutExecutionMode,
    setDefaultWorkoutTableOrientation,
    setIsAuthPanelDismissed,
    setLanguage,
    setLocalSettingsUpdatedAt,
    setShowRestTimer,
    setThemeName,
    setWorkoutReminders,
    showRestTimer,
    themeName,
    workoutReminders
  };
}
