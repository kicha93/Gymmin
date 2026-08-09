import type { TranslationKey } from "../i18n/translations";

export const navItems = [
  { key: "home", icon: "home-outline" },
  { key: "workouts", icon: "barbell-outline" },
  { key: "settings", icon: "settings-outline" }
] as const;

export type NavKey = (typeof navItems)[number]["key"];
export type ScreenKey =
  | NavKey
  | "articleDetail"
  | "builder"
  | "terms"
  | "privacy"
  | "contact"
  | "bugReport"
  | "favoriteExercises"
  | "achievements"
  | "profile"
  | "progress"
  | "exerciseDetail"
  | "exerciseProgress"
  | "workoutHistory"
  | "workoutSessionDetail"
  | "workoutCreator"
  | "workoutAiRewrite"
  | "workoutDetail"
  | "workoutSession"
  | "weeklyPlan";

export function getScreenTitle(
  activeScreen: ScreenKey,
  editingWorkoutId: string | null,
  t: (key: TranslationKey) => string
) {
  const titles: Record<ScreenKey, string> = {
    achievements: t("achievements"),
    articleDetail: t("articles"),
    bugReport: t("bugReport"),
    builder: editingWorkoutId ? t("editWorkout") : t("addNewWorkout"),
    contact: t("contact"),
    exerciseDetail: t("exerciseDetails"),
    exerciseProgress: t("exerciseProgress"),
    favoriteExercises: t("favoriteExercises"),
    home: t("home"),
    profile: t("profile"),
    progress: t("progress"),
    privacy: t("privacyPolicy"),
    settings: t("settings"),
    terms: t("terms"),
    weeklyPlan: t("weeklyPlan"),
    workoutAiRewrite: t("aiRewriteTitle"),
    workoutCreator: t("aiCreator"),
    workoutDetail: t("workout"),
    workoutHistory: t("workoutHistoryTitle"),
    workoutSession: t("workout"),
    workoutSessionDetail: t("workoutDetails"),
    workouts: t("workouts")
  };
  return titles[activeScreen];
}
