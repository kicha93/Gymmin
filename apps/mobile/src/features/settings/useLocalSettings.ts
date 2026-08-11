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
  loadLocalSettings,
  saveLocalSettings
} from "../../storage/localDataRepositories";

export function useLocalSettings(
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
  const [localSettingsUpdatedAt, setLocalSettingsUpdatedAt] =
    useState(() => new Date().toISOString());
  const [hasLoadedLocalSettings, setHasLoadedLocalSettings] = useState(false);
  const [hadPersistedLocalSettingsOnLoad, setHadPersistedLocalSettingsOnLoad] = useState(false);
  const hasPersistedLocalSettingsRef = useRef(false);

  function applySettings(settings: AppSettings) {
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
    setLocalSettingsUpdatedAt(settings.updatedAt);

  }

  function buildSettings(updatedAt = localSettingsUpdatedAt): AppSettings {
    return {
      collapsedPanels,
      defaultSetCount,
      defaultStageType,
      defaultWorkoutExecutionMode,
      defaultWorkoutTableOrientation,
      defaultWeight,
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

      setHasLoadedLocalSettings(false);
      setHadPersistedLocalSettingsOnLoad(false);
      hasPersistedLocalSettingsRef.current = false;
      const loadedSettings = await loadLocalSettings(collapsedPanelDefaults);
      if (!isMounted) {
        return;
      }

      applySettings(loadedSettings.settings);
      setHadPersistedLocalSettingsOnLoad(loadedSettings.exists);
      setHasLoadedLocalSettings(true);
    }

    void loadSettings();
    return () => {
      isMounted = false;
    };
  }, [hasLoadedAccountStorageMigration]);

  useEffect(() => {
    if (!hasLoadedLocalSettings) {
      return;
    }

    const shouldRefreshUpdatedAt =
      hasPersistedLocalSettingsRef.current;
    const updatedAt = shouldRefreshUpdatedAt
      ? new Date().toISOString()
      : localSettingsUpdatedAt;
    const settings = buildSettings(updatedAt);

    if (shouldRefreshUpdatedAt) {
      setLocalSettingsUpdatedAt(updatedAt);
    }
    hasPersistedLocalSettingsRef.current = true;

    saveLocalSettings(settings).catch((error) => {
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
    language,
    showRestTimer,
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
    hadPersistedLocalSettingsOnLoad,
    hasLoadedLocalSettings,
    language,
    localSettingsUpdatedAt,
    setCollapsedPanels,
    setDefaultSetCount,
    setDefaultStageType,
    setDefaultWeight,
    setDefaultWorkoutExecutionMode,
    setDefaultWorkoutTableOrientation,
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
