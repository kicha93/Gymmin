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
  | "contact"
  | "bugReport"
  | "bugReportSuccess"
  | "favoriteExercises"
  | "forgotPassword"
  | "resetPassword"
  | "changePassword"
  | "activeSessions"
  | "achievements"
  | "aiCredits"
  | "profile"
  | "accountDetails"
  | "deleteAccount"
  | "progress"
  | "exerciseDetail"
  | "exerciseProgress"
  | "workoutHistory"
  | "workoutSessionDetail"
  | "workoutCreator"
  | "workoutAiRewrite"
  | "workoutAiProposal"
  | "workoutDetail"
  | "workoutSession"
  | "weeklyPlan";

export function getScreenTitle(
  activeScreen: ScreenKey,
  editingWorkoutId: string | null,
  t: (key: TranslationKey) => string
) {
  const titles: Record<ScreenKey, string> = {
    accountDetails: t("accountDetails"),
    activeSessions: t("activeSessions"),
    achievements: t("achievements"),
    aiCredits: t("aiCredits"),
    articleDetail: t("articles"),
    bugReport: t("bugReport"),
    bugReportSuccess: t("bugReport"),
    builder: editingWorkoutId ? t("editWorkout") : t("addNewWorkout"),
    changePassword: t("changePassword"),
    contact: t("contact"),
    deleteAccount: t("deleteAccount"),
    exerciseDetail: t("exerciseDetails"),
    exerciseProgress: t("exerciseProgress"),
    favoriteExercises: t("favoriteExercises"),
    forgotPassword: t("resetPassword"),
    home: t("home"),
    profile: t("profile"),
    progress: t("progress"),
    resetPassword: t("resetPassword"),
    settings: t("settings"),
    terms: t("terms"),
    weeklyPlan: t("weeklyPlan"),
    workoutAiProposal: t("aiRewriteProposal"),
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
