import type { LanguageCode } from "../i18n/translations";
import type { ThemeName } from "../theme/theme";
import {
  getDefaultWorkoutReminderSettings,
  normalizeWorkoutReminderSettings,
  type WorkoutReminderSettings
} from "./workoutReminders";
import type { StageType } from "./workouts";
import type { WorkoutExecutionMode } from "./workoutSessions";

export type WorkoutTableOrientation = "vertical" | "horizontal";

export type AppSettings = {
  collapsedPanels: Record<string, boolean>;
  defaultSetCount: string;
  defaultStageType: StageType | "";
  defaultWorkoutExecutionMode: WorkoutExecutionMode;
  defaultWorkoutTableOrientation: WorkoutTableOrientation;
  defaultWeight: string;
  language: LanguageCode;
  showRestTimer: boolean;
  themeName: ThemeName;
  updatedAt: string;
  workoutReminders: WorkoutReminderSettings;
};

export type LocalSettingsStorage = AppSettings & {
  version: 1;
};

const stageTypes: StageType[] = ["warmup", "exercise", "recovery", "rest", "cooldown", "other"];
const workoutExecutionModes: WorkoutExecutionMode[] = ["guided", "readonly-post-workout", "inline-table"];

export function isLanguageCode(value: unknown): value is LanguageCode {
  return value === "pl" || value === "en";
}

export function isThemeName(value: unknown): value is ThemeName {
  return value === "light" || value === "dark";
}

export function isStageType(value: unknown): value is StageType {
  return typeof value === "string" && stageTypes.includes(value as StageType);
}

export function isWorkoutExecutionMode(value: unknown): value is WorkoutExecutionMode {
  return typeof value === "string" && workoutExecutionModes.includes(value as WorkoutExecutionMode);
}

export function isWorkoutTableOrientation(value: unknown): value is WorkoutTableOrientation {
  return value === "vertical" || value === "horizontal";
}

export function normalizeCollapsedPanels(
  value: unknown,
  defaults: Record<string, boolean>
) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return defaults;
  }

  return {
    ...defaults,
    ...Object.fromEntries(
      Object.entries(value).filter(
        (entry): entry is [string, boolean] => typeof entry[1] === "boolean"
      )
    )
  };
}

export function createDefaultAppSettings(
  collapsedPanels: Record<string, boolean>,
  now = new Date().toISOString()
): AppSettings {
  return {
    collapsedPanels,
    defaultSetCount: "",
    defaultStageType: "",
    defaultWorkoutExecutionMode: "guided",
    defaultWorkoutTableOrientation: "vertical",
    defaultWeight: "",
    language: "en",
    showRestTimer: true,
    themeName: "light",
    updatedAt: now,
    workoutReminders: getDefaultWorkoutReminderSettings("en")
  };
}

export function normalizeAppSettings(
  value: unknown,
  collapsedPanelDefaults: Record<string, boolean>,
  now = new Date().toISOString()
): AppSettings {
  const record = isRecord(value) ? value : {};
  const language = isLanguageCode(record.language) ? record.language : "en";

  return {
    collapsedPanels: normalizeCollapsedPanels(record.collapsedPanels, collapsedPanelDefaults),
    defaultSetCount: typeof record.defaultSetCount === "string" ? record.defaultSetCount : "",
    defaultStageType: record.defaultStageType === "" || isStageType(record.defaultStageType)
      ? record.defaultStageType
      : "",
    defaultWorkoutExecutionMode: isWorkoutExecutionMode(record.defaultWorkoutExecutionMode)
      ? record.defaultWorkoutExecutionMode
      : "guided",
    defaultWorkoutTableOrientation: isWorkoutTableOrientation(record.defaultWorkoutTableOrientation)
      ? record.defaultWorkoutTableOrientation
      : "vertical",
    defaultWeight: typeof record.defaultWeight === "string" ? record.defaultWeight : "",
    language,
    showRestTimer: record.showRestTimer !== false,
    themeName: isThemeName(record.themeName) ? record.themeName : "light",
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : now,
    workoutReminders: normalizeWorkoutReminderSettings(record.workoutReminders, language)
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
