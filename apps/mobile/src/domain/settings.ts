import type { ReminderWeekday } from "./workoutReminders";
import type { LanguageCode, TranslationKey } from "../i18n/translations";

export type SettingsSheetKey =
  | "language"
  | "defaultSetCount"
  | "defaultWeight"
  | "defaultStageType"
  | "defaultWorkoutExecutionMode"
  | "workoutReminderDay";

export type ReminderSchedulingStatus = "idle" | "scheduled" | "failed" | "permissionDenied";

export const settingsLanguageOptions: Array<{ label: string; value: LanguageCode }> = [
  { label: "Polski", value: "pl" },
  { label: "English", value: "en" }
];

export function getReminderDayOptions(t: (key: TranslationKey) => string) {
  return [
    { label: t("monday"), shortLabel: t("mondayShort"), value: 1, weekday: "monday" as ReminderWeekday },
    { label: t("tuesday"), shortLabel: t("tuesdayShort"), value: 2, weekday: "tuesday" as ReminderWeekday },
    { label: t("wednesday"), shortLabel: t("wednesdayShort"), value: 3, weekday: "wednesday" as ReminderWeekday },
    { label: t("thursday"), shortLabel: t("thursdayShort"), value: 4, weekday: "thursday" as ReminderWeekday },
    { label: t("friday"), shortLabel: t("fridayShort"), value: 5, weekday: "friday" as ReminderWeekday },
    { label: t("saturday"), shortLabel: t("saturdayShort"), value: 6, weekday: "saturday" as ReminderWeekday },
    { label: t("sunday"), shortLabel: t("sundayShort"), value: 7, weekday: "sunday" as ReminderWeekday }
  ];
}
