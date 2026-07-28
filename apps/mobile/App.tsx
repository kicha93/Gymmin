import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts } from "expo-font";
import { config as gluestackConfig } from "@gluestack-ui/config";
import {
  GluestackUIProvider,
  Input,
  InputField
} from "@gluestack-ui/themed";
import { ErrorBoundary } from "react-error-boundary";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Animated,
  AppState,
  BackHandler,
  Image,
  InteractionManager,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  NativeModules,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  View,
  useWindowDimensions
} from "react-native";

import { BUILD_API_BASE_URL } from "./src/config/buildConfig";
import { getAuthDeviceName, getDeviceReportInfo } from "./src/platform/deviceInfo";
import {
  applyAvatarResponse,
  buildAvatarImageSource,
  resolveAvatarImageSource,
  type AvatarResponse
} from "./src/domain/avatar";
import {
  clearPreparedAvatar,
  prepareAvatarForUpload,
  type PreparedAvatar
} from "./src/domain/avatarCache";
import {
  achievementDefinitions,
  ACHIEVEMENTS_STORAGE_BASE_KEY,
  ACHIEVEMENTS_SYNC_STORAGE_BASE_KEY,
  addForegroundUsageSeconds,
  APP_USAGE_STATS_STORAGE_BASE_KEY,
  calculateAchievementMetrics,
  evaluateAchievements,
  getAchievementProgress,
  getDefaultAppUsageStats,
  getNewUserAchievementUnlocks,
  loadAppUsageStats,
  loadUserAchievements,
  mergeAppUsageStats,
  mergeUserAchievements,
  saveAppUsageStats,
  saveUserAchievements,
  type AppUsageStats,
  type UserAchievement
} from "./src/domain/achievements";
import { synchronizeAchievements } from "./src/domain/achievementSync";
import {
  GoalType,
  StageType,
  TargetComparator,
  WorkoutDraft,
  WorkoutStep,
  createDefaultWorkout,
  hasUserDefinedWorkouts
} from "./src/domain/workouts";
import {
  areCreatorDraftsEqual,
  cloneCreatorDraft,
  workoutCreatorSections,
  type LocalizedText,
  type WorkoutCreatorDraft,
  type WorkoutCreatorPhase,
  type WorkoutCreatorProfile
} from "./src/domain/workoutCreator";
import {
  getActiveWorkoutSessionsForUi,
  getExerciseProgressItems,
  getExerciseProgressSummary,
  getSessionDurationMs,
  getSessionStartedAtTime,
  getWorkoutSessionStatusLabel,
  getWorkoutHistorySummary,
  getWorkoutSessionDisplayName,
  markWorkoutSessionDeleted,
  mergeWorkoutSessions,
  normalizeWorkoutSessions,
  recoverWorkoutRestSecondsFromSessions,
  workoutHasHistory,
  WORKOUT_SESSIONS_STORAGE_BASE_KEY,
  WORKOUT_SESSIONS_SYNC_STORAGE_BASE_KEY
} from "./src/domain/workoutSessions";
import type {
  WorkoutExecutionMode,
  WorkoutSession,
  WorkoutSessionEntry,
  WorkoutSessionStatus
} from "./src/domain/workoutSessions";
import { clampWorkoutSessionEntryIndex } from "./src/domain/workoutSessionPresentation";
import {
  getWorkoutSessionSupersetCandidate,
  type WorkoutSessionSupersetSide,
  type WorkoutSessionSupersetValueField
} from "./src/domain/workoutSessionSupersets";
import {
  resolveInitialSettingsSyncAction
} from "./src/domain/appSettings";
import {
  buildSyncedAccountSettings,
  getSyncedAccountSettingsFieldPresence,
  normalizeSyncedAccountSettings,
  preserveLocalCreatorProfilesDuringInitialSync,
  resolveWeeklyPlanDuringInitialSync,
  type SyncedAccountSettings
} from "./src/domain/accountSettings";
import {
  synchronizeWorkoutSessions,
} from "./src/domain/workoutSessionSync";
import {
  activeExerciseLibraryTiers,
  findExerciseById,
  findCatalogExerciseBestEffort,
  getCachedExerciseOptions,
  getCachedExerciseOptionsForStageType,
  getExerciseDisplayName,
  getExerciseSectionsForStageType,
} from "./src/domain/exercises";
import {
  resolveWorkoutStartExecutionMode
} from "./src/domain/workoutExerciseSummary";
import {
  addFavoriteExercise,
  getFavoriteCatalogExercises,
  getValidFavoriteExerciseIds,
  isExerciseFavorite,
  loadFavoriteExercises,
  mergeFavoriteExercises,
  removeFavoriteExercise,
  saveFavoriteExercises,
  toggleFavoriteExercise,
  FAVORITE_EXERCISES_STORAGE_BASE_KEY,
  FAVORITE_EXERCISES_SYNC_STORAGE_BASE_KEY
} from "./src/domain/favoriteExercises";
import type { FavoriteExercise } from "./src/domain/favoriteExercises";
import {
  synchronizeFavoriteExercises,
} from "./src/domain/favoriteExerciseSync";
import {
  ANONYMOUS_LOCAL_OWNER,
  getAccountStorageKey,
  getAccountStorageOwnerId,
  removeAccountJson,
  removeAccountStorageKeys,
  setLastAccountUserId
} from "./src/domain/accountStorage";
import {
  WEEKLY_PLAN_STORAGE_BASE_KEY,
  formatWeekRange,
  getCurrentWeekRange,
  getActiveWeeklyPlanWorkouts,
  getWeeklyPlanDay,
  getWeeklyPlanSummary,
  loadWeeklyPlan,
  mergeWeeklyPlans,
  removeWeeklyPlanItem,
  saveWeeklyPlan,
  toggleWeeklyPlanItemDay,
  upsertWeeklyPlanItem
} from "./src/domain/weeklyPlan";
import {
  getDeleteAccountConfirmationPhrase,
  isDeleteAccountConfirmationValid
} from "./src/domain/accountDeletion";
import {
  WORKOUT_REMINDER_NOTIFICATION_IDS_BASE_KEY,
  cancelWorkoutReminders,
  formatReminderDayTime,
  getDefaultWorkoutReminderSettings,
  getReminderScheduleForDay,
  normalizeWorkoutReminderSettings,
  requestWorkoutReminderPermissions,
  updateReminderDaySchedule
} from "./src/domain/workoutReminders";
import type { ReminderDaySchedule, ReminderWeekday, WorkoutReminderSettings } from "./src/domain/workoutReminders";
import {
  addDiagnosticEvent,
  createCorrelationId,
  getDiagnosticsSnapshot
} from "./src/domain/appDiagnostics";
import { buildApiHeaders } from "./src/api/apiClient";
import { createMobileApiClients } from "./src/api/mobileApiClients";
import {
  getWorkoutCreatorJobId,
  isWorkoutCreatorJobResponse,
  type WorkoutCreatorQuestionAnswer
} from "./src/api/workoutCreatorApi";
import type { PendingWorkoutCreatorJob } from "./src/domain/workoutCreatorJob";
import { getErrorMessageOrFallback } from "./src/domain/apiErrors";
import { isInsufficientAiCreditsError } from "./src/domain/aiCredits";
import {
  getExerciseProgressHistoryGroups
} from "./src/domain/exerciseProgressHistory";
import { buildProfileAccountDetails, getProfileDisplayEmail, getProfileDisplayName } from "./src/domain/profile";
import { articles } from "./src/domain/articles";
import type { Article } from "./src/domain/articles";
import { GymminLogo, GymminMark } from "./src/components/GymminLogo";
import {
  AppButton,
  AppIconButton,
  AppInput,
  AppTextarea,
  InlineSheetSelectControl,
  SelectControl,
  SuffixedInput
} from "./src/components/AppControls";
import { WorkoutHeaderElapsedTime } from "./src/components/WorkoutSessionControls";
import { translate, type LanguageCode, type TranslationKey } from "./src/i18n/translations";
import { ContactScreen } from "./src/screens/ContactScreen";
import { BugReportScreen } from "./src/screens/BugReportScreen";
import { BugReportSuccessScreen } from "./src/screens/BugReportSuccessScreen";
import { AccountDetailsScreen } from "./src/screens/AccountDetailsScreen";
import { ActiveSessionsScreen } from "./src/screens/ActiveSessionsScreen";
import { DeleteAccountScreen } from "./src/screens/DeleteAccountScreen";
import { LoginPanel, type AuthMode } from "./src/components/LoginPanel";
import { ChangePasswordScreen } from "./src/screens/ChangePasswordScreen";
import { ForgotPasswordScreen } from "./src/screens/ForgotPasswordScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { AchievementsScreen } from "./src/screens/AchievementsScreen";
import { AiCreditsScreen } from "./src/screens/AiCreditsScreen";
import { ExerciseProgressScreen } from "./src/screens/ExerciseProgressScreen";
import { ProgressScreen } from "./src/screens/ProgressScreen";
import { TermsScreen } from "./src/screens/TermsScreen";
import { PrivacyScreen } from "./src/screens/PrivacyScreen";
import {
  WorkoutHistoryScreen,
  type WorkoutHistoryStatusFilter
} from "./src/screens/WorkoutHistoryScreen";
import { WorkoutSessionDetailScreen } from "./src/screens/WorkoutSessionDetailScreen";
import { WorkoutDetailScreen } from "./src/screens/WorkoutDetailScreen";
import { WorkoutCreatorScreen } from "./src/screens/WorkoutCreatorScreen";
import { WorkoutAiProposalScreen } from "./src/screens/WorkoutAiProposalScreen";
import { WorkoutAiRewriteScreen } from "./src/screens/WorkoutAiRewriteScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { SettingsSheetContent } from "./src/components/SettingsSheetContent";
import { ArticleDetailScreen } from "./src/screens/ArticleDetailScreen";
import { WorkoutBuilderWizardScreen } from "./src/screens/WorkoutBuilderWizardScreen";
import { ExerciseDetailScreen } from "./src/screens/ExerciseDetailScreen";
import { FavoriteExercisesScreen } from "./src/screens/FavoriteExercisesScreen";
import { WeeklyPlanScreen } from "./src/screens/WeeklyPlanScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { WorkoutsScreen } from "./src/screens/WorkoutsScreen";
import { WorkoutSessionScreen } from "./src/screens/WorkoutSessionScreen";
import { ExerciseMuscleModal } from "./src/components/ExerciseMuscleModal";
import {
  ActiveWorkoutSessionCard,
  SystemStatusCallout,
  TrainingFactPill,
  WeeklyPlanHomeCard,
  WorkoutCreatorButton
} from "./src/components/HomeWidgets";
import { WorkoutSortActions, WorkoutSortSheet } from "./src/components/WorkoutSortControls";
import { AppDialog, type AppDialogAction, type AppDialogState } from "./src/components/AppDialog";
import { GlobalErrorFallback } from "./src/components/GlobalErrorFallback";
import type { SettingsSheetKey } from "./src/domain/settings";
import {
  isWorkoutArchived,
  setWorkoutArchived,
  type SavedWorkout,
  type SortDirection,
  type WorkoutSortField,
  type WorkoutSortSettings
} from "./src/domain/savedWorkouts";
import {
  compareWorkouts,
  defaultWorkoutSort,
  normalizeSavedWorkoutTextFields,
  normalizeWorkoutDraftTextFields,
  normalizeWorkoutSortSettings
} from "./src/domain/savedWorkoutNormalization";
import {
  mapApiWorkoutToSavedWorkout,
  mapSavedWorkoutToApiRequest,
  mergeWorkoutsById
} from "./src/domain/accountWorkouts";
import {
  createSavedWorkoutsFromApiResponse,
  getWorkoutCreatorPlanText
} from "./src/domain/workoutCreatorImport";
import {
  ACTIVE_WORKOUT_SESSION_STORAGE_BASE_KEY as activeWorkoutSessionStorageBaseKey,
  LOCAL_CREATOR_JOB_STORAGE_BASE_KEY as localCreatorJobStorageBaseKey,
  LOCAL_CREATOR_PROFILES_STORAGE_BASE_KEY as localCreatorProfilesStorageBaseKey,
  LOCAL_SETTINGS_STORAGE_BASE_KEY as localSettingsStorageBaseKey,
  LOCAL_WORKOUTS_STORAGE_BASE_KEY as localWorkoutsStorageBaseKey,
  loadCreatorProfilesForOwner as loadCreatorProfilesForStorageOwner,
  loadWorkoutSessionsForOwner as loadWorkoutSessionsForStorageOwner,
  loadWorkoutsForOwner as loadWorkoutsForStorageOwner,
  markAnonymousMergeHandled,
  mergeCreatorProfilesById,
  saveCreatorProfilesForOwner as saveCreatorProfilesForStorageOwner,
  saveSettingsForOwner as saveSettingsForStorageOwner,
  saveWorkoutSessionsForOwner as saveWorkoutSessionsForStorageOwner,
  saveWorkoutsForOwner as saveWorkoutsForStorageOwner
} from "./src/storage/localDataRepositories";
import { useAccountScopedWorkouts } from "./src/features/workouts/useAccountScopedWorkouts";
import { useWorkoutEditorController } from "./src/features/workouts/useWorkoutEditorController";
import { useAccountScopedCreatorProfiles } from "./src/features/workoutCreator/useAccountScopedCreatorProfiles";
import { useAccountScopedCreatorJob } from "./src/features/workoutCreator/useAccountScopedCreatorJob";
import { pollWorkoutCreatorJob } from "./src/features/workoutCreator/workoutCreatorPolling";
import { useWorkoutCreatorJobPolling } from "./src/features/workoutCreator/useWorkoutCreatorJobPolling";
import { useAccountScopedWeeklyPlan } from "./src/features/weeklyPlan/useAccountScopedWeeklyPlan";
import { useAccountStorageMigration } from "./src/features/storage/useAccountStorageMigration";
import { useCachedAvatar } from "./src/features/profile/useCachedAvatar";
import { useAccountScopedWorkoutSessions } from "./src/features/workoutSessions/useAccountScopedWorkoutSessions";
import { useWorkoutSessionAutoSync } from "./src/features/workoutSessions/useWorkoutSessionAutoSync";
import { useActiveWorkoutController } from "./src/features/workoutSessions/useActiveWorkoutController";
import { useSystemStatusController } from "./src/features/systemStatus/useSystemStatusController";
import { useAccountScopedSettings } from "./src/features/settings/useAccountScopedSettings";
import { useAccountSettingsAutoSave } from "./src/features/settings/useAccountSettingsAutoSave";
import { useAccountScopedFavoriteExercises } from "./src/features/favorites/useAccountScopedFavoriteExercises";
import { useAccountScopedAchievements } from "./src/features/achievements/useAccountScopedAchievements";
import { useInitialAccountSync } from "./src/features/sync/useInitialAccountSync";
import {
  clearStoredAuthSession,
  persistStoredAuthSession,
  updateStoredAuthUser
} from "./src/features/auth/authSession";
import { useStoredAuthRestoration } from "./src/features/auth/useStoredAuthRestoration";
import { useEmailVerification } from "./src/features/auth/useEmailVerification";
import { useAuthSessionsController } from "./src/features/auth/useAuthSessionsController";
import { useAccountDataPolicy } from "./src/features/account/useAccountDataPolicy";
import { useWorkoutReminderScheduling } from "./src/features/reminders/useWorkoutReminderScheduling";
import { useAiCreditsController } from "./src/features/aiCredits/useAiCreditsController";
import {
  AuthPasswordPolicy,
  type AuthApiResponse,
  type UserSession
} from "./src/domain/auth";
import { getScreenTitle, navItems, type ScreenKey } from "./src/navigation/appNavigation";
import { styles } from "./src/theme/appStyles";
import { themes, type Theme } from "./src/theme/theme";

type ExpoNotificationsModule = typeof import("expo-notifications");

let notificationsModulePromise: Promise<ExpoNotificationsModule | null> | null = null;

function isAndroidExpoGo() {
  const expoConstants = (
    NativeModules.ExponentConstants ??
    NativeModules.ExpoConstants ??
    {}
  ) as Record<string, unknown>;

  return Platform.OS === "android" && expoConstants.appOwnership === "expo";
}

async function getNotificationsModule() {
  if (Platform.OS === "web" || isAndroidExpoGo()) {
    return null;
  }

  notificationsModulePromise ??= import("expo-notifications")
    .then((notifications) => {
      notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: false,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true
        })
      });

      return notifications;
    })
    .catch((error) => {
      console.warn("Could not load notifications module", error);
      return null;
    });

  return notificationsModulePromise;
}

const stageTypeValues: StageType[] = ["warmup", "exercise", "recovery", "rest", "cooldown", "other"];
const goalTypeValues: GoalType[] = ["repetitions", "time", "buttonPress", "calories", "heartRate"];
const targetComparatorValues: TargetComparator[] = ["below", "above"];

const localWeeklyPlanStorageBaseKey = WEEKLY_PLAN_STORAGE_BASE_KEY;
const anonymousAccountDataBaseKeys = [
  localWorkoutsStorageBaseKey,
  FAVORITE_EXERCISES_STORAGE_BASE_KEY,
  WORKOUT_SESSIONS_STORAGE_BASE_KEY,
  ACHIEVEMENTS_STORAGE_BASE_KEY,
  APP_USAGE_STATS_STORAGE_BASE_KEY,
  localCreatorProfilesStorageBaseKey,
  localCreatorJobStorageBaseKey,
  localWeeklyPlanStorageBaseKey
];

declare const process: { env?: Record<string, string | undefined> } | undefined;

function getDefaultApiBaseUrl() {
  const configuredApiBaseUrl = typeof process !== "undefined"
    ? process.env?.EXPO_PUBLIC_API_BASE_URL?.trim()
    : "";

  if (configuredApiBaseUrl) {
    return configuredApiBaseUrl.replace(/\/+$/, "");
  }

  if (BUILD_API_BASE_URL.trim()) {
    return BUILD_API_BASE_URL.trim().replace(/\/+$/, "");
  }

  const scriptUrl = typeof NativeModules.SourceCode?.scriptURL === "string"
    ? NativeModules.SourceCode.scriptURL
    : "";
  const host = scriptUrl.match(/https?:\/\/([^/:]+)/)?.[1];

  return host ? `http://${host}:5198` : "http://localhost:5198";
}

const apiBaseUrl = getDefaultApiBaseUrl();

const stageTypeTranslationKeys: Record<StageType, TranslationKey> = {
  cooldown: "stageCooldown",
  exercise: "stageExercise",
  other: "stageOther",
  recovery: "stageRecovery",
  rest: "stageRest",
  warmup: "stageWarmup"
};

const goalTypeTranslationKeys: Record<GoalType, TranslationKey> = {
  buttonPress: "goalButtonPress",
  calories: "goalCalories",
  heartRate: "goalHeartRate",
  repetitions: "goalRepetitions",
  time: "goalTime"
};

const targetComparatorTranslationKeys: Record<TargetComparator, TranslationKey> = {
  above: "targetAbove",
  below: "targetBelow"
};

function getStageTypeOptions(t: (key: TranslationKey) => string) {
  return stageTypeValues.map((value) => ({ label: t(stageTypeTranslationKeys[value]), value }));
}

function getGoalTypeOptions(t: (key: TranslationKey) => string) {
  return goalTypeValues.map((value) => ({ label: t(goalTypeTranslationKeys[value]), value }));
}

function getTargetComparatorOptions(t: (key: TranslationKey) => string) {
  return targetComparatorValues.map((value) => ({ label: t(targetComparatorTranslationKeys[value]), value }));
}

function getWorkoutExecutionModeOptions(t: (key: TranslationKey) => string) {
  return [
    { label: t("executionGuided"), value: "guided" as const },
    { label: t("executionReadonlyPostWorkout"), value: "readonly-post-workout" as const },
    { label: t("executionInlineTable"), value: "inline-table" as const }
  ];
}

function getWeeklyPlanDayOptions(t: (key: TranslationKey) => string) {
  return [
    { label: t("mondayShort"), value: "monday" as const },
    { label: t("tuesdayShort"), value: "tuesday" as const },
    { label: t("wednesdayShort"), value: "wednesday" as const },
    { label: t("thursdayShort"), value: "thursday" as const },
    { label: t("fridayShort"), value: "friday" as const },
    { label: t("saturdayShort"), value: "saturday" as const },
    { label: t("sundayShort"), value: "sunday" as const }
  ];
}

function getReminderWeekdayFromNumber(value: number): ReminderWeekday {
  switch (value) {
    case 2:
      return "tuesday";
    case 3:
      return "wednesday";
    case 4:
      return "thursday";
    case 5:
      return "friday";
    case 6:
      return "saturday";
    case 7:
      return "sunday";
    default:
      return "monday";
  }
}

type ApiUserSettings = SyncedAccountSettings;

const initialWorkouts = [
  {
    id: "sample-full-body",
    name: "Przykładowy trening",
    draft: {
      name: "Przykładowy trening",
      notes: "Prosty wzorzec treningu całego ciała dla początkującego: rozgrzewka, kilka ćwiczeń bazowych i spokojne schłodzenie.",
      sport: "strength",
      steps: [
        {
          exerciseName: "",
          goalType: "time",
          id: "sample-warmup",
          intensity: "moderate",
          kind: "stage",
          label: "Rozgrzewka",
          loadKg: "",
          notes: "Lekka mobilizacja i przygotowanie do pracy z obciążeniem.",
          setCount: "",
          stageType: "warmup",
          targetComparator: "",
          targetValue: "00:05:00"
        },
        {
          exerciseName: "",
          goalType: "",
          id: "sample-main",
          intensity: "moderate",
          kind: "stage",
          label: "Ćwiczenia główne",
          loadKg: "",
          notes: "Trening całego ciała. Dobierz ciężar tak, aby zostawić 1-2 powtórzenia w zapasie.",
          setCount: "",
          stageType: "exercise",
          targetComparator: "",
          targetValue: ""
        },
        {
          exerciseName: "Squat",
          goalType: "repetitions",
          id: "sample-set-squat",
          intensity: "moderate",
          kind: "set",
          label: "",
          loadKg: "",
          notes: "Kontrolowany ruch, pełny zakres bez utraty techniki.",
          parentStageId: "sample-main",
          setCount: "3",
          stageType: "exercise",
          targetComparator: "",
          targetValue: "10"
        },
        {
          exerciseName: "Squat",
          goalType: "repetitions",
          id: "sample-element-squat",
          intensity: "moderate",
          kind: "exercise",
          label: "",
          loadKg: "",
          notes: "Kontrolowany ruch, pełny zakres bez utraty techniki.",
          parentSetId: "sample-set-squat",
          setCount: "",
          stageType: "exercise",
          targetComparator: "",
          targetValue: "10"
        },
        {
          exerciseName: "Bench Press",
          goalType: "repetitions",
          id: "sample-set-bench",
          intensity: "moderate",
          kind: "set",
          label: "",
          loadKg: "",
          notes: "Łopatki stabilnie, tempo spokojne.",
          parentStageId: "sample-main",
          setCount: "3",
          stageType: "exercise",
          targetComparator: "",
          targetValue: "8"
        },
        {
          exerciseName: "Bench Press",
          goalType: "repetitions",
          id: "sample-element-bench",
          intensity: "moderate",
          kind: "exercise",
          label: "",
          loadKg: "",
          notes: "Łopatki stabilnie, tempo spokojne.",
          parentSetId: "sample-set-bench",
          setCount: "",
          stageType: "exercise",
          targetComparator: "",
          targetValue: "8"
        },
        {
          exerciseName: "Dumbbell Row",
          goalType: "repetitions",
          id: "sample-set-row",
          intensity: "moderate",
          kind: "set",
          label: "",
          loadKg: "",
          notes: "Przyciągaj łokieć w stronę biodra, bez szarpania.",
          parentStageId: "sample-main",
          setCount: "3",
          stageType: "exercise",
          targetComparator: "",
          targetValue: "10"
        },
        {
          exerciseName: "Dumbbell Row",
          goalType: "repetitions",
          id: "sample-element-row",
          intensity: "moderate",
          kind: "exercise",
          label: "",
          loadKg: "",
          notes: "Przyciągaj łokieć w stronę biodra, bez szarpania.",
          parentSetId: "sample-set-row",
          setCount: "",
          stageType: "exercise",
          targetComparator: "",
          targetValue: "10"
        },
        {
          exerciseName: "Romanian Deadlift",
          goalType: "repetitions",
          id: "sample-set-rdl",
          intensity: "moderate",
          kind: "set",
          label: "",
          loadKg: "",
          notes: "Ruch z biodra, plecy neutralnie.",
          parentStageId: "sample-main",
          setCount: "2",
          stageType: "exercise",
          targetComparator: "",
          targetValue: "10"
        },
        {
          exerciseName: "Romanian Deadlift",
          goalType: "repetitions",
          id: "sample-element-rdl",
          intensity: "moderate",
          kind: "exercise",
          label: "",
          loadKg: "",
          notes: "Ruch z biodra, plecy neutralnie.",
          parentSetId: "sample-set-rdl",
          setCount: "",
          stageType: "exercise",
          targetComparator: "",
          targetValue: "10"
        },
        {
          exerciseName: "Plank",
          goalType: "time",
          id: "sample-set-plank",
          intensity: "moderate",
          kind: "set",
          label: "",
          loadKg: "",
          notes: "Utrzymaj napięcie brzucha i pośladków.",
          parentStageId: "sample-main",
          setCount: "2",
          stageType: "exercise",
          targetComparator: "",
          targetValue: "00:00:30"
        },
        {
          exerciseName: "Plank",
          goalType: "time",
          id: "sample-element-plank",
          intensity: "moderate",
          kind: "exercise",
          label: "",
          loadKg: "",
          notes: "Utrzymaj napięcie brzucha i pośladków.",
          parentSetId: "sample-set-plank",
          setCount: "",
          stageType: "exercise",
          targetComparator: "",
          targetValue: "00:00:30"
        },
        {
          exerciseName: "",
          goalType: "time",
          id: "sample-cooldown",
          intensity: "light",
          kind: "stage",
          label: "Schłodzenie",
          loadKg: "",
          notes: "Spokojne rozciąganie i zejście z tętna.",
          setCount: "",
          stageType: "cooldown",
          targetComparator: "",
          targetValue: "00:05:00"
        }
      ]
    }
  }
] satisfies SavedWorkout[];

const trainingFacts: Record<LanguageCode, string[]> = {
  pl: [
    "Mięśnie zaczynają adaptować się już po pierwszym treningu.",
    "Regeneracja jest równie ważna jak sam trening.",
    "Największym mięśniem ciała jest mięsień pośladkowy wielki.",
    "Trening siłowy przyspiesza metabolizm nawet po zakończeniu ćwiczeń.",
    "Mięśnie rosną głównie podczas odpoczynku, nie na treningu.",
    "Przeciętny człowiek ma ponad 600 mięśni.",
    "Pierwsze efekty siłowe pojawiają się szybciej niż wizualne.",
    "Zakwaszenie mięśni nie jest spowodowane kwasem mlekowym.",
    "Sen ma ogromny wpływ na budowę masy mięśniowej.",
    "Ćwiczenia wielostawowe angażują więcej mięśni jednocześnie.",
    "Przysiady aktywują jedne z największych grup mięśniowych.",
    "Nawodnienie wpływa na wydolność i siłę mięśni.",
    "Regularny trening siłowy wzmacnia kości.",
    "Mięśnie spalają więcej kalorii niż tkanka tłuszczowa.",
    "Progresywne przeciążenie to podstawa rozwoju mięśni.",
    "Rozgrzewka zmniejsza ryzyko kontuzji.",
    "Technika ćwiczeń jest ważniejsza niż ciężar.",
    "Białko wspiera regenerację i odbudowę mięśni.",
    "Organizm adaptuje się do powtarzalnych bodźców treningowych.",
    "Przerwy między seriami wpływają na efekty treningu.",
    "Martwy ciąg angażuje niemal całe ciało.",
    "Trening nóg zwiększa ogólną sprawność organizmu.",
    "Tempo wykonywania powtórzeń ma znaczenie.",
    "Ćwiczenia z wolnymi ciężarami rozwijają stabilizację.",
    "Regularność daje lepsze efekty niż sporadyczne intensywne treningi.",
    "Mięśnie brzucha pracują podczas większości ćwiczeń.",
    "Cardio i trening siłowy mogą się skutecznie uzupełniać.",
    "Przetrenowanie może spowolnić postępy.",
    "Mobilność wpływa na zakres ruchu i technikę.",
    "Silny chwyt poprawia wyniki w wielu ćwiczeniach.",
    "Trening siłowy poprawia wrażliwość na insulinę.",
    "Ćwiczenia oporowe pomagają utrzymać sprawność z wiekiem.",
    "Rozciąganie po treningu nie zapobiega zakwasom.",
    "Dziennik treningowy pomaga śledzić postępy.",
    "Nawet krótki trening jest lepszy niż jego brak.",
    "Mięśnie adaptują się szybciej niż ścięgna i stawy.",
    "Zmiana planu treningowego może przełamać stagnację.",
    "Prawidłowy oddech zwiększa stabilizację podczas ćwiczeń.",
    "Trening siłowy może poprawiać jakość snu.",
    "Odpowiednia technika zmniejsza ryzyko przeciążeń.",
    "Mięśnie potrzebują czasu na pełną regenerację.",
    "Trening poprawia samopoczucie dzięki endorfinom.",
    "Regularne ćwiczenia mogą obniżać poziom stresu.",
    "Nie każdy trening musi kończyć się zmęczeniem do granic możliwości.",
    "Siła i masa mięśniowa to nie to samo.",
    "Genetyka wpływa na tempo budowy mięśni.",
    "Ćwiczenia unilateralne pomagają wyrównywać dysproporcje.",
    "Stabilny korpus poprawia efektywność ruchu.",
    "Systematyczność jest ważniejsza niż motywacja.",
    "Najlepszy plan treningowy to taki, którego się trzymasz."
  ],
  en: [
    "Muscles start adapting after the very first workout.",
    "Recovery is just as important as the workout itself.",
    "The largest muscle in the body is the gluteus maximus.",
    "Strength training can raise metabolism even after exercise ends.",
    "Muscles grow mainly during rest, not during the workout.",
    "The average person has more than 600 muscles.",
    "Strength gains usually appear faster than visual changes.",
    "Muscle soreness is not caused by lactic acid.",
    "Sleep has a major impact on building muscle mass.",
    "Compound exercises engage more muscles at the same time.",
    "Squats activate some of the largest muscle groups.",
    "Hydration affects performance and muscle strength.",
    "Regular strength training helps strengthen bones.",
    "Muscle tissue burns more calories than fat tissue.",
    "Progressive overload is the foundation of muscle growth.",
    "A warm-up reduces the risk of injury.",
    "Exercise technique matters more than the load.",
    "Protein supports muscle recovery and rebuilding.",
    "The body adapts to repeated training stimuli.",
    "Rest periods between sets influence training results.",
    "The deadlift engages almost the entire body.",
    "Leg training improves overall physical capacity.",
    "Rep tempo matters.",
    "Free-weight exercises develop stabilization.",
    "Consistency beats occasional very intense workouts.",
    "Abs work during most exercises.",
    "Cardio and strength training can complement each other well.",
    "Overtraining can slow progress.",
    "Mobility affects range of motion and technique.",
    "A strong grip improves performance in many exercises.",
    "Strength training can improve insulin sensitivity.",
    "Resistance exercise helps maintain fitness with age.",
    "Stretching after a workout does not prevent soreness.",
    "A training log helps track progress.",
    "Even a short workout is better than skipping it.",
    "Muscles adapt faster than tendons and joints.",
    "Changing a training plan can help break a plateau.",
    "Proper breathing improves stability during exercise.",
    "Strength training may improve sleep quality.",
    "Good technique reduces overload risk.",
    "Muscles need time for full recovery.",
    "Training improves mood through endorphins.",
    "Regular exercise can lower stress levels.",
    "Not every workout has to end in total exhaustion.",
    "Strength and muscle mass are not the same thing.",
    "Genetics affects the pace of muscle growth.",
    "Unilateral exercises help even out imbalances.",
    "A stable core improves movement efficiency.",
    "Consistency matters more than motivation.",
    "The best training plan is the one you stick to."
  ]
};

function normalizeApiUserSettings(value: unknown): ApiUserSettings | null {
  return normalizeSyncedAccountSettings(value, defaultCollapsedPanels);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

const defaultCollapsedPanels: Record<string, boolean> = {
  "settings-account": true,
  "settings-info": true,
  "settings-integrations": true,
  "settings-notifications": true,
  "settings-preferences": true,
  "settings-training": true
};

export default function App() {
  return (
    <GluestackUIProvider config={gluestackConfig}>
      <SafeAreaProvider>
        <ErrorBoundary
          FallbackComponent={GlobalErrorFallback}
          onError={(error, info) => {
            console.error("Global app error", error, info.componentStack);
          }}
        >
          <GymminApp />
        </ErrorBoundary>
      </SafeAreaProvider>
    </GluestackUIProvider>
  );
}

function GymminApp() {
  const insets = useSafeAreaInsets();
  const windowSize = useWindowDimensions();
  const isLandscape = windowSize.width > windowSize.height;
  const splashStartedAt = useRef(Date.now()).current;
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const [areIconFontsLoaded, iconFontError] = useFonts(Ionicons.font);
  const languageSheetTranslateY = useRef(new Animated.Value(360)).current;
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [activeScreen, setActiveScreen] = useState<ScreenKey>("home");
  const [privacyReturnScreen, setPrivacyReturnScreen] = useState<ScreenKey>("settings");
  const {
    isSystemStatusRefreshing,
    refreshSystemStatus,
    systemStatus
  } = useSystemStatusController(apiBaseUrl, activeScreen === "home");
  const [isWorkoutSortSheetOpen, setIsWorkoutSortSheetOpen] = useState(false);
  const [selectedArticleId, setSelectedArticleId] = useState<string>(articles[0]?.id ?? "");
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [includeArchivedWorkouts, setIncludeArchivedWorkouts] = useState(false);
  const [workout, setWorkout] = useState<WorkoutDraft>(() => createDefaultWorkout());
  const [pendingLanguage, setPendingLanguage] = useState<LanguageCode>("en");
  const [pendingDefaultSetCount, setPendingDefaultSetCount] = useState("");
  const [pendingDefaultWeight, setPendingDefaultWeight] = useState("");
  const [pendingDefaultStageType, setPendingDefaultStageType] = useState<StageType | "">("");
  const [pendingDefaultWorkoutExecutionMode, setPendingDefaultWorkoutExecutionMode] = useState<WorkoutExecutionMode>("guided");
  const [pendingWorkoutReminderDay, setPendingWorkoutReminderDay] = useState<ReminderDaySchedule | null>(null);
  const [favoriteExercisesSearch, setFavoriteExercisesSearch] = useState("");
  const [selectedWorkoutSessionId, setSelectedWorkoutSessionId] = useState<string | null>(null);
  const [selectedExerciseMuscleStep, setSelectedExerciseMuscleStep] = useState<WorkoutStep | null>(null);
  const [selectedExerciseDetailStep, setSelectedExerciseDetailStep] = useState<WorkoutStep | null>(null);
  const [exerciseDetailReturnScreen, setExerciseDetailReturnScreen] = useState<ScreenKey>("workoutDetail");
  const [exerciseDetailMuscleSide, setExerciseDetailMuscleSide] = useState<"front" | "back">("front");
  const [exerciseDetailCollapsedPanels, setExerciseDetailCollapsedPanels] = useState<Record<string, boolean>>({});
  const [workoutHistoryFilter, setWorkoutHistoryFilter] = useState<WorkoutHistoryStatusFilter>("all");
  const [workoutHistorySearch, setWorkoutHistorySearch] = useState("");
  const [workoutHistoryWorkoutIdFilter, setWorkoutHistoryWorkoutIdFilter] = useState<string | null>(null);
  const [selectedExerciseProgressKey, setSelectedExerciseProgressKey] = useState<string | null>(null);
  const [isPostWorkoutFillMode, setIsPostWorkoutFillMode] = useState(false);
  const [appDialog, setAppDialog] = useState<AppDialogState | null>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [activeSettingsSheet, setActiveSettingsSheet] = useState<SettingsSheetKey | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [deleteAccountConfirmation, setDeleteAccountConfirmation] = useState("");
  const [deleteAccountPassword, setDeleteAccountPassword] = useState("");
  const [deleteAccountError, setDeleteAccountError] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [achievementToast, setAchievementToast] = useState<{ title: string; extraCount: number } | null>(null);
  const [isAuthActionSubmitting, setIsAuthActionSubmitting] = useState(false);
  const [isAvatarSubmitting, setIsAvatarSubmitting] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState("");
  const [isCurrentPasswordVisible, setIsCurrentPasswordVisible] = useState(false);
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
  const [isRepeatPasswordVisible, setIsRepeatPasswordVisible] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [bugTitle, setBugTitle] = useState("");
  const [bugDescription, setBugDescription] = useState("");
  const [bugFormError, setBugFormError] = useState("");
  const [bugSubmittedId, setBugSubmittedId] = useState("");
  const [isBugSubmitting, setIsBugSubmitting] = useState(false);
  const [creatorDraft, setCreatorDraft] = useState<WorkoutCreatorDraft>({});
  const [creatorSensitiveDataConsent, setCreatorSensitiveDataConsent] = useState(false);
  const [creatorPhase, setCreatorPhase] = useState<WorkoutCreatorPhase>("form");
  const [isCreatorSubmitting, setIsCreatorSubmitting] = useState(false);
  const [creatorSubmitError, setCreatorSubmitError] = useState("");
  const [creatorPlanText, setCreatorPlanText] = useState("");
  const [creatorImportedWorkoutCount, setCreatorImportedWorkoutCount] = useState(0);
  const [rewriteInstruction, setRewriteInstruction] = useState("");
  const [rewriteError, setRewriteError] = useState("");
  const [isRewriteSubmitting, setIsRewriteSubmitting] = useState(false);
  const [rewriteSourceWorkoutId, setRewriteSourceWorkoutId] = useState<string | null>(null);
  const [rewriteProposedWorkout, setRewriteProposedWorkout] = useState<SavedWorkout | null>(null);
  const [creatorCollapsedSections, setCreatorCollapsedSections] = useState<Record<string, boolean>>({});
  const [creatorProfileName, setCreatorProfileName] = useState("");
  const [showCreatorLoginTooltip, setShowCreatorLoginTooltip] = useState(false);
  const [trainingFactIndex, setTrainingFactIndex] = useState(0);
  const [readOnlyWorkoutCollapsedPanels, setReadOnlyWorkoutCollapsedPanels] = useState<Record<string, boolean>>({});
  const [user, setUser] = useState<UserSession | null>(null);
  const {
    cachedAvatarUri,
    clearAvatarCache,
    hasAvatarImageLoadFailed,
    handleAvatarImageLoadError
  } = useCachedAvatar({ apiBaseUrl, user });
  const storageOwnerId = getAccountStorageOwnerId(user?.id);
  const syncedFavoriteExercisesUserIdRef = useRef<string | null>(null);
  const syncedAchievementsUserIdRef = useRef<string | null>(null);
  const hasLoadedAccountStorageMigration = useAccountStorageMigration();
  const {
    hasLoadedWeeklyPlan,
    hadPersistedWeeklyPlanOnLoad,
    loadedWeeklyPlanOwnerId,
    weeklyPlan,
    setWeeklyPlan
  } = useAccountScopedWeeklyPlan(
    storageOwnerId,
    hasLoadedAccountStorageMigration
  );
  const {
    applySettings: applyAccountSettingsState,
    buildSettings: buildCurrentSettingsPayload,
    collapsedPanels,
    defaultSetCount,
    defaultStageType,
    defaultWeight,
    defaultWorkoutExecutionMode,
    defaultWorkoutTableOrientation,
    hadPersistedLocalSettingsOnLoad,
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
    setIsAuthPanelDismissed,
    setLanguage,
    setLocalSettingsUpdatedAt,
    setShowRestTimer,
    setThemeName,
    setWorkoutReminders,
    showRestTimer,
    themeName,
    workoutReminders
  } = useAccountScopedSettings(
    storageOwnerId,
    hasLoadedAccountStorageMigration,
    defaultCollapsedPanels
  );
  const {
    activeWorkoutSessionEntryIndexRef,
    activeWorkoutSessionId,
    hasLoadedWorkoutSessions,
    loadedWorkoutSessionsOwnerId,
    sessionEntryIndex,
    setActiveWorkoutSessionId,
    setSessionEntryIndex,
    setWorkoutSessions,
    workoutSessions
  } = useAccountScopedWorkoutSessions(
    storageOwnerId,
    hasLoadedAccountStorageMigration
  );
  const {
    hasLoadedLocalWorkouts,
    loadedWorkoutsOwnerId,
    savedWorkouts,
    selectedWorkoutId,
    setSavedWorkouts,
    setSelectedWorkoutId,
    setWorkoutSort,
    workoutSort
  } = useAccountScopedWorkouts(
    storageOwnerId,
    hasLoadedAccountStorageMigration,
    initialWorkouts as SavedWorkout[]
  );
  const {
    creatorProfiles,
    hasLoadedLocalCreatorProfiles,
    loadedCreatorProfilesOwnerId,
    selectedCreatorProfileId,
    setCreatorProfiles,
    setSelectedCreatorProfileId
  } = useAccountScopedCreatorProfiles(
    storageOwnerId,
    hasLoadedAccountStorageMigration
  );
  const {
    hasLoadedLocalCreatorJob,
    loadedCreatorJobOwnerId,
    pendingCreatorJob,
    setPendingCreatorJob
  } = useAccountScopedCreatorJob(
    storageOwnerId,
    hasLoadedAccountStorageMigration
  );
  const {
    favoriteExercises,
    favoriteExercisesSyncStatus,
    hasLoadedFavoriteExercises,
    isApplyingRemoteFavoritesRef: isApplyingAccountFavoriteExercisesRef,
    loadedFavoriteExercisesOwnerId,
    setFavoriteExercises,
    setFavoriteExercisesSyncStatus
  } = useAccountScopedFavoriteExercises({
    hasLoadedAccountStorageMigration,
    isRemoteSyncReady: Boolean(user && syncedFavoriteExercisesUserIdRef.current === user.id),
    ownerId: storageOwnerId,
    syncFavorites: user
      ? (favorites) => syncAccountFavoriteExercises(user, favorites)
      : null
  });
  const validFavoriteExerciseIds = useMemo(
    () => getValidFavoriteExerciseIds(favoriteExercises),
    [favoriteExercises]
  );
  const {
    achievementsSyncState,
    appUsageStats,
    applyRemoteState: applyRemoteAchievementState,
    hasLoadedAchievements,
    loadedAchievementsOwnerId,
    setAchievementsSyncState,
    setAppUsageStats,
    setUserAchievements,
    userAchievements
  } = useAccountScopedAchievements({
    isRemoteSyncReady: Boolean(user && syncedAchievementsUserIdRef.current === user.id),
    ownerId: storageOwnerId,
    syncAchievements: user
      ? (unlocked, usageStats) => syncAccountAchievements(user, unlocked, usageStats)
      : null
  });
  const theme = themes[themeName];
  const isDarkMode = themeName === "dark";
  const t = (key: TranslationKey) => translate(language, key);
  const rateLimitMessage = t("rateLimitError");
  const {
    accountDataApi,
    aiCreditsApi,
    authApi,
    bugReportsApi,
    profileApi,
    workoutCreatorApi
  } = useMemo(() => createMobileApiClients({ apiBaseUrl, rateLimitMessage }), [rateLimitMessage]);
  const hasLoadedLocalAuth = useStoredAuthRestoration({
    fallbackName: t("defaultUserName"),
    getCurrentUser: (cachedSession) => authApi.getCurrentUser(
      getApiHeaders(cachedSession),
      t("authRequestError")
    ),
    onRestored: setUser
  });
  const {
    balance: aiCreditBalance,
    buyPack: buyAiCreditPack,
    canRestorePurchases: canRestoreAiCreditPurchases,
    error: aiCreditsError,
    grantDevelopmentCredits: grantDevAiCredits,
    isLoading: isAiCreditsLoading,
    isPurchaseLoading: isAiCreditPurchaseLoading,
    packs: aiCreditPacks,
    purchaseMessage: aiCreditsPurchaseMessage,
    refresh: fetchAiCredits,
    restorePurchases: restorePendingAiCreditPurchases,
    transactions: aiCreditTransactions
  } = useAiCreditsController({
    api: aiCreditsApi,
    getHeaders: getAuthHeaders,
    onUnauthorized: handleUnauthorizedSession,
    t,
    user
  });
  const {
    code: emailVerificationCode,
    confirmCode: confirmEmailVerificationCode,
    isOpen: isEmailVerificationOpen,
    isSubmitting: isEmailVerificationSubmitting,
    message: emailVerificationMessage,
    requestCode: requestEmailVerificationCode,
    setCode: setEmailVerificationCode,
    setIsOpen: setIsEmailVerificationOpen,
    setMessage: setEmailVerificationMessage
  } = useEmailVerification({
    api: authApi,
    getHeaders: getAuthHeaders,
    language,
    onUnauthorized: handleUnauthorizedSession,
    t,
    updateUser: updateStoredUserSession,
    user
  });
  const {
    revoke: revokeAuthSession,
    sessions: activeAuthSessions
  } = useAuthSessionsController({
    active: activeScreen === "activeSessions",
    api: authApi,
    deviceName: getAuthDeviceName(),
    getHeaders: getAuthHeaders,
    onCurrentRevoked: logOut,
    onMessage: setAuthMessage,
    onUnauthorized: handleUnauthorizedSession,
    setError: setAuthError,
    setSubmitting: setIsAuthActionSubmitting,
    t,
    user
  });
  const remoteUserAvatarSource = buildAvatarImageSource(apiBaseUrl, user);
  const userAvatarSource = resolveAvatarImageSource({
    cachedUri: cachedAvatarUri,
    hasLoadFailed: hasAvatarImageLoadFailed,
    isWeb: Platform.OS === "web",
    remoteSource: remoteUserAvatarSource
  });
  const isCreatorJobPending = pendingCreatorJob?.type === "plan";
  const isRewriteJobPending = pendingCreatorJob?.type === "rewrite";
  const syncedWorkoutSessionsUserIdRef = useRef<string | null>(null);
  const mainScrollRef = useRef<ScrollView | null>(null);
  const bugReportSubmissionRef = useRef<{ key: string; signature: string } | null>(null);
  const appUsageStartedAtRef = useRef<number | null>(Date.now());
  const isApplyingAccountWorkoutSessionsRef = useRef(false);
  useEffect(() => {
    if (
      !hasLoadedLocalWorkouts
      || loadedWorkoutsOwnerId !== storageOwnerId
      || !hasLoadedWorkoutSessions
      || loadedWorkoutSessionsOwnerId !== storageOwnerId
    ) {
      return;
    }

    setSavedWorkouts((current) => {
      let changed = false;
      const recovered = current.map((savedWorkout) => {
        const draft = recoverWorkoutRestSecondsFromSessions(
          savedWorkout.draft,
          savedWorkout.id,
          workoutSessions
        );
        if (draft !== savedWorkout.draft) {
          changed = true;
          return { ...savedWorkout, draft };
        }
        return savedWorkout;
      });
      return changed ? recovered : current;
    });
  }, [
    hasLoadedLocalWorkouts,
    hasLoadedWorkoutSessions,
    loadedWorkoutSessionsOwnerId,
    loadedWorkoutsOwnerId,
    storageOwnerId,
    workoutSessions
  ]);
  const workoutsInitialSync = useInitialAccountSync({
    enabled: Boolean(
      hasLoadedLocalAuth &&
      hasLoadedLocalWorkouts &&
      loadedWorkoutsOwnerId === storageOwnerId &&
      user
    ),
    onError: (error) => {
      console.error("Failed to synchronize account workouts", error);
    },
    ownerId: storageOwnerId,
    synchronize: async () => {
      if (user) {
        await synchronizeAccountWorkouts(user, savedWorkouts);
      }
    },
    userId: user?.id ?? null
  });
  const settingsInitialSync = useInitialAccountSync({
    enabled: Boolean(
      hasLoadedLocalAuth &&
      hasLoadedLocalSettings &&
      hasLoadedLocalCreatorProfiles &&
      hasLoadedWeeklyPlan &&
      loadedSettingsOwnerId === storageOwnerId &&
      loadedCreatorProfilesOwnerId === storageOwnerId &&
      loadedWeeklyPlanOwnerId === storageOwnerId &&
      user
    ),
    onError: (error) => {
      console.error("Failed to synchronize account settings", error);
    },
    ownerId: storageOwnerId,
    synchronize: async () => {
      if (user) {
        await synchronizeAccountSettings(user);
      }
    },
    userId: user?.id ?? null
  });
  const favoritesInitialSync = useInitialAccountSync({
    enabled: Boolean(
      hasLoadedLocalAuth &&
      hasLoadedFavoriteExercises &&
      loadedFavoriteExercisesOwnerId === storageOwnerId &&
      user
    ),
    onError: (error) => {
      console.error("Failed to synchronize account favorite exercises", error);
      setFavoriteExercisesSyncStatus("failed");
    },
    ownerId: storageOwnerId,
    syncedUserIdRef: syncedFavoriteExercisesUserIdRef,
    synchronize: async () => {
      if (user) {
        await synchronizeAccountFavoriteExercises(user, favoriteExercises);
      }
    },
    userId: user?.id ?? null
  });
  const workoutSessionsInitialSync = useInitialAccountSync({
    enabled: Boolean(
      hasLoadedLocalAuth &&
      hasLoadedWorkoutSessions &&
      loadedWorkoutSessionsOwnerId === storageOwnerId &&
      user
    ),
    onError: (error) => {
      console.error("Failed to synchronize account workout sessions", error);
    },
    ownerId: storageOwnerId,
    syncedUserIdRef: syncedWorkoutSessionsUserIdRef,
    synchronize: async () => {
      if (user) {
        await synchronizeAccountWorkoutSessions(user, workoutSessions);
      }
    },
    userId: user?.id ?? null
  });
  const achievementsInitialSync = useInitialAccountSync({
    enabled: Boolean(
      hasLoadedLocalAuth &&
      hasLoadedAchievements &&
      loadedAchievementsOwnerId === storageOwnerId &&
      user
    ),
    onError: (error) => {
      console.error("Failed to synchronize account achievements", error);
    },
    ownerId: storageOwnerId,
    syncedUserIdRef: syncedAchievementsUserIdRef,
    synchronize: async () => {
      if (user) {
        await synchronizeAccountAchievements(user, userAchievements, appUsageStats);
      }
    },
    userId: user?.id ?? null
  });
  const accountDataPolicy = useAccountDataPolicy({
    anonymousDataBaseKeys: anonymousAccountDataBaseKeys,
    enabled: Boolean(
      hasLoadedLocalAuth
      && hasLoadedLocalWorkouts
      && hasLoadedFavoriteExercises
      && hasLoadedWorkoutSessions
      && hasLoadedLocalCreatorProfiles
      && hasLoadedWeeklyPlan
      && loadedWorkoutsOwnerId === storageOwnerId
      && loadedFavoriteExercisesOwnerId === storageOwnerId
      && loadedWorkoutSessionsOwnerId === storageOwnerId
      && loadedCreatorProfilesOwnerId === storageOwnerId
      && loadedWeeklyPlanOwnerId === storageOwnerId
      && user
    ),
    onAccountSwitch: () => showInfoDialog(t("accountSwitchDetected"), t("accountSwitchCopy")),
    onAnonymousData: showAnonymousAccountDataDialog,
    user
  });
  const {
    setStatus: setReminderSchedulingStatus,
    status: reminderSchedulingStatus
  } = useWorkoutReminderScheduling({
    enabled: hasLoadedLocalSettings
      && hasLoadedWorkoutSessions
      && loadedSettingsOwnerId === storageOwnerId
      && loadedWorkoutSessionsOwnerId === storageOwnerId,
    language,
    ownerId: storageOwnerId,
    sessions: workoutSessions,
    settings: workoutReminders,
    updateSettings: updateWorkoutReminderSettings
  });
  function buildAccountSettingsPayload(updatedAt = localSettingsUpdatedAt): ApiUserSettings {
    return buildSyncedAccountSettings(
      buildCurrentSettingsPayload(updatedAt),
      creatorProfiles,
      selectedCreatorProfileId,
      weeklyPlan
    );
  }

  const settingsAutoSaveChangeKey = useMemo(
    () => JSON.stringify(buildAccountSettingsPayload("")),
    [
      collapsedPanels,
      creatorProfiles,
      defaultSetCount,
      defaultStageType,
      defaultWeight,
      defaultWorkoutExecutionMode,
      defaultWorkoutTableOrientation,
      isAuthPanelDismissed,
      language,
      selectedCreatorProfileId,
      showRestTimer,
      themeName,
      weeklyPlan,
      workoutReminders
    ]
  );
  useAccountSettingsAutoSave({
    buildSettings: buildAccountSettingsPayload,
    changeKey: settingsAutoSaveChangeKey,
    enabled: Boolean(
      hasLoadedLocalSettings &&
      hasLoadedLocalCreatorProfiles &&
      hasLoadedWeeklyPlan &&
      loadedSettingsOwnerId === storageOwnerId &&
      loadedCreatorProfilesOwnerId === storageOwnerId &&
      loadedWeeklyPlanOwnerId === storageOwnerId &&
      user &&
      settingsInitialSync.isSynced
    ),
    isApplyingRemoteSettingsRef: isApplyingAccountSettingsRef,
    onError: (error) => {
      console.error("Failed to save account settings", error);
    },
    onSaving: (settings) => {
      setLocalSettingsUpdatedAt(settings.updatedAt);
      saveSettingsForStorageOwner(
        storageOwnerId,
        buildCurrentSettingsPayload(settings.updatedAt)
      ).catch((error) => {
        console.error("Failed to persist pending account settings", error);
      });
    },
    onSaved: (savedSettings) => {
      setLocalSettingsUpdatedAt(savedSettings.updatedAt);
    },
    ownerId: storageOwnerId,
    saveSettings: (settings) => saveAccountSettings(settings, user),
    userId: user?.id ?? null
  });
  const screenTitle = activeScreen === "profile" && !user
    ? t("login")
    : getScreenTitle(activeScreen, editingWorkoutId, t);
  const shouldShowHeaderBackButton = activeScreen !== "home";
  const shouldShowProfileHeaderButton =
    Boolean(user) || activeScreen !== "home" || isAuthPanelDismissed;

  useWorkoutSessionAutoSync({
    hasActiveWorkoutSession: activeScreen === "workoutSession" && Boolean(activeWorkoutSessionId),
    isApplyingRemoteSessionsRef: isApplyingAccountWorkoutSessionsRef,
    isLoadedForOwner: hasLoadedWorkoutSessions && loadedWorkoutSessionsOwnerId === storageOwnerId,
    isRemoteSyncReady: workoutSessionsInitialSync.isSynced,
    ownerId: storageOwnerId,
    sessions: workoutSessions,
    setSessions: setWorkoutSessions,
    syncSessions: user
      ? (sessions) => syncAccountWorkoutSessions(user, sessions)
      : null
  });

  const formatCreatorImportedWorkoutCount = (count: number) => {
    if (language === "pl") {
      const suffix = count === 1 ? "trening" : count >= 2 && count <= 4 ? "treningi" : "treningów";
      return `Dodano ${count} ${suffix}.`;
    }

    return `Added ${count} ${count === 1 ? "workout" : "workouts"}.`;
  };

  async function notifyCreatorWorkoutsImported(count: number) {
    const showFallbackAlert = () => {
      showInfoDialog(
        t("aiCreatorImportedTitle"),
        `${formatCreatorImportedWorkoutCount(count)} ${t("aiCreatorImportedCopy")}`
      );
    };
    const notifications = await getNotificationsModule();

    if (!notifications) {
      showFallbackAlert();
      return;
    }

    try {
      if (Platform.OS === "android") {
        await notifications.setNotificationChannelAsync("workout-creator", {
          importance: notifications.AndroidImportance.DEFAULT,
          name: t("notifications")
        });
      }

      const permissions = await notifications.getPermissionsAsync();
      const finalStatus = permissions.granted
        ? permissions.status
        : (await notifications.requestPermissionsAsync()).status;

      if (finalStatus !== "granted") {
        showFallbackAlert();
        return;
      }

      await notifications.scheduleNotificationAsync({
        content: {
          body: `${formatCreatorImportedWorkoutCount(count)} ${t("aiCreatorImportedCopy")}`,
          title: t("aiCreatorImportedTitle")
        },
        trigger: null
      });
    } catch (error) {
      console.warn("Could not show creator import notification", error);
      showFallbackAlert();
    }
  }

  async function removeAccountDataForOwner(ownerId: string) {
    await cancelWorkoutReminders(ownerId);
    await removeAccountStorageKeys([
      localWorkoutsStorageBaseKey,
      localSettingsStorageBaseKey,
      FAVORITE_EXERCISES_STORAGE_BASE_KEY,
      FAVORITE_EXERCISES_SYNC_STORAGE_BASE_KEY,
      WORKOUT_SESSIONS_STORAGE_BASE_KEY,
      WORKOUT_SESSIONS_SYNC_STORAGE_BASE_KEY,
      ACHIEVEMENTS_STORAGE_BASE_KEY,
      APP_USAGE_STATS_STORAGE_BASE_KEY,
      ACHIEVEMENTS_SYNC_STORAGE_BASE_KEY,
      WORKOUT_REMINDER_NOTIFICATION_IDS_BASE_KEY,
      localCreatorProfilesStorageBaseKey,
      localCreatorJobStorageBaseKey,
      localWeeklyPlanStorageBaseKey,
      activeWorkoutSessionStorageBaseKey
    ], ownerId);
  }

  async function removeAnonymousAccountData() {
    await removeAccountDataForOwner(ANONYMOUS_LOCAL_OWNER);
  }

  async function mergeAnonymousDataIntoAccount(session: UserSession) {
    const accountOwnerId = getAccountStorageOwnerId(session.id);
    const [anonymousWorkouts, accountWorkouts] = await Promise.all([
      loadWorkoutsForStorageOwner(ANONYMOUS_LOCAL_OWNER),
      loadWorkoutsForStorageOwner(accountOwnerId)
    ]);
    const mergedWorkouts = mergeWorkoutsById(accountWorkouts.workouts, anonymousWorkouts.workouts);
    const selectedWorkoutAfterMerge =
      accountWorkouts.selectedWorkoutId ||
      anonymousWorkouts.selectedWorkoutId ||
      mergedWorkouts[0]?.id ||
      "";

    const [anonymousFavorites, accountFavorites] = await Promise.all([
      loadFavoriteExercises(ANONYMOUS_LOCAL_OWNER),
      loadFavoriteExercises(accountOwnerId)
    ]);
    const mergedFavorites = mergeFavoriteExercises(accountFavorites, anonymousFavorites);

    const [anonymousSessions, accountSessions] = await Promise.all([
      loadWorkoutSessionsForStorageOwner(ANONYMOUS_LOCAL_OWNER),
      loadWorkoutSessionsForStorageOwner(accountOwnerId)
    ]);
    const mergedSessions = mergeWorkoutSessions(accountSessions, anonymousSessions);

    const [anonymousProfiles, accountProfiles] = await Promise.all([
      loadCreatorProfilesForStorageOwner(ANONYMOUS_LOCAL_OWNER),
      loadCreatorProfilesForStorageOwner(accountOwnerId)
    ]);
    const mergedProfiles = mergeCreatorProfilesById(accountProfiles.profiles, anonymousProfiles.profiles);
    const selectedProfileAfterMerge =
      accountProfiles.selectedProfileId ||
      anonymousProfiles.selectedProfileId ||
      null;

    const [anonymousWeeklyPlan, accountWeeklyPlan] = await Promise.all([
      loadWeeklyPlan(ANONYMOUS_LOCAL_OWNER),
      loadWeeklyPlan(accountOwnerId)
    ]);
    const mergedWeeklyPlan = mergeWeeklyPlans(accountWeeklyPlan, anonymousWeeklyPlan);

    const [anonymousAchievements, accountAchievements] = await Promise.all([
      loadUserAchievements(ANONYMOUS_LOCAL_OWNER),
      loadUserAchievements(accountOwnerId)
    ]);
    const mergedAchievements = mergeUserAchievements(accountAchievements, anonymousAchievements);
    const [anonymousUsageStats, accountUsageStats] = await Promise.all([
      loadAppUsageStats(ANONYMOUS_LOCAL_OWNER),
      loadAppUsageStats(accountOwnerId)
    ]);
    const mergedUsageStats = mergeAppUsageStats(accountUsageStats, anonymousUsageStats);

    const mergedWorkoutSort = accountWorkouts.sort ?? anonymousWorkouts.sort ?? defaultWorkoutSort;

    await Promise.all([
      saveWorkoutsForStorageOwner(accountOwnerId, mergedWorkouts, selectedWorkoutAfterMerge, mergedWorkoutSort),
      saveFavoriteExercises(mergedFavorites, accountOwnerId),
      saveWorkoutSessionsForStorageOwner(accountOwnerId, mergedSessions),
      saveCreatorProfilesForStorageOwner(accountOwnerId, mergedProfiles, selectedProfileAfterMerge),
      saveWeeklyPlan(mergedWeeklyPlan, accountOwnerId),
      saveUserAchievements(accountOwnerId, mergedAchievements),
      saveAppUsageStats(accountOwnerId, mergedUsageStats),
      removeAccountJson(FAVORITE_EXERCISES_SYNC_STORAGE_BASE_KEY, accountOwnerId),
      removeAccountJson(WORKOUT_SESSIONS_SYNC_STORAGE_BASE_KEY, accountOwnerId),
      removeAccountJson(ACHIEVEMENTS_SYNC_STORAGE_BASE_KEY, accountOwnerId)
    ]);

    await markAnonymousMergeHandled(session.id, "merged");
    await removeAnonymousAccountData();

    if (storageOwnerId === accountOwnerId) {
      setSavedWorkouts(mergedWorkouts);
      setSelectedWorkoutId(selectedWorkoutAfterMerge);
      setWorkoutSort(mergedWorkoutSort);
      setFavoriteExercises(mergedFavorites);
      setWorkoutSessions(mergedSessions);
      setActiveWorkoutSessionId(mergedSessions.find((item) => item.status === "active" && !item.deletedAt)?.id ?? null);
      setCreatorProfiles(mergedProfiles);
      setSelectedCreatorProfileId(selectedProfileAfterMerge);
      setWeeklyPlan(mergedWeeklyPlan);
      setUserAchievements(mergedAchievements);
      setAppUsageStats(mergedUsageStats);
      setAchievementsSyncState({});
    }

    workoutsInitialSync.markSyncing();
    settingsInitialSync.markSyncing();
    favoritesInitialSync.markSyncing();
    workoutSessionsInitialSync.markSyncing();
    achievementsInitialSync.markSyncing();
    setFavoriteExercisesSyncStatus("local");

    try {
      await synchronizeAccountWorkouts(session, mergedWorkouts);
      await saveAccountSettings(buildSyncedAccountSettings(
        buildCurrentSettingsPayload(),
        mergedProfiles,
        selectedProfileAfterMerge,
        mergedWeeklyPlan
      ), session);
      const syncedFavorites = await syncAccountFavoriteExercises(session, mergedFavorites, true);
      const syncedSessions = await syncAccountWorkoutSessions(session, mergedSessions, true);
      const syncedAchievements = await syncAccountAchievements(session, mergedAchievements, mergedUsageStats, true);

      if (storageOwnerId === accountOwnerId) {
        isApplyingAccountFavoriteExercisesRef.current = true;
        isApplyingAccountWorkoutSessionsRef.current = true;
        setFavoriteExercises(syncedFavorites);
        setWorkoutSessions(syncedSessions);
        applyRemoteAchievementState(syncedAchievements);
        setFavoriteExercisesSyncStatus("synced");
        setTimeout(() => {
          isApplyingAccountFavoriteExercisesRef.current = false;
          isApplyingAccountWorkoutSessionsRef.current = false;
        }, 0);
      }
      workoutsInitialSync.markSynced();
      settingsInitialSync.markSynced();
      favoritesInitialSync.markSynced();
      workoutSessionsInitialSync.markSynced();
      achievementsInitialSync.markSynced();
    } catch (error) {
      console.error("Failed to sync merged anonymous data", error);
      workoutsInitialSync.markFailed();
      settingsInitialSync.markFailed();
      favoritesInitialSync.markFailed();
      workoutSessionsInitialSync.markFailed();
      achievementsInitialSync.markFailed();
      setFavoriteExercisesSyncStatus("failed");
    }
  }

  async function deleteAnonymousAccountDataForUser(session: UserSession) {
    await removeAnonymousAccountData();
    await markAnonymousMergeHandled(session.id, "deleted");
  }

  async function skipAnonymousAccountDataForUser(session: UserSession) {
    await markAnonymousMergeHandled(session.id, "skipped");
  }

  function showAnonymousAccountDataDialog(session: UserSession) {
    setAppDialog({
      actions: [
        {
          label: t("mergeLocalData"),
          onPress: () => void mergeAnonymousDataIntoAccount(session),
          variant: "primary"
        },
        {
          label: t("notNow"),
          onPress: () => void skipAnonymousAccountDataForUser(session),
          variant: "outline"
        },
        {
          label: t("deleteLocalData"),
          onPress: () => {
            showConfirmDialog({
              confirmLabel: t("deleteLocalData"),
              message: t("deleteAnonymousDataCopy"),
              onConfirm: () => void deleteAnonymousAccountDataForUser(session),
              title: t("deleteAnonymousDataTitle"),
              variant: "destructive"
            });
          },
          variant: "destructive"
        }
      ],
      message: t("anonymousDataCopy"),
      title: t("anonymousDataTitle")
    });
  }

  useEffect(() => {
    if (!areIconFontsLoaded && !iconFontError) {
      return;
    }

    if (iconFontError) {
      console.error("Failed to preload Ionicons font", iconFontError);
    }

    const remainingSplashMs = Math.max(0, 850 - (Date.now() - splashStartedAt));
    const timeoutId = setTimeout(() => {
      Animated.timing(splashOpacity, {
        duration: 320,
        toValue: 0,
        useNativeDriver: true
      }).start(() => setIsAppLoading(false));
    }, remainingSplashMs);

    return () => clearTimeout(timeoutId);
  }, [areIconFontsLoaded, iconFontError, splashOpacity, splashStartedAt]);

  useEffect(() => {
    if (isAppLoading || activeScreen !== "home") {
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const task = InteractionManager.runAfterInteractions(() => {
      timeoutId = setTimeout(() => {
        getCachedExerciseOptions(language);
        getCachedExerciseOptionsForStageType(language, "exercise", activeExerciseLibraryTiers);
        getExerciseSectionsForStageType(language, "exercise", "all");
      }, 600);
    });

    return () => {
      task.cancel();
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, [activeScreen, isAppLoading, language]);

  useEffect(() => {
    if (activeScreen !== "bugReportSuccess") {
      return;
    }

    const timeoutId = setTimeout(() => {
      setActiveScreen("home");
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, [activeScreen]);

  useEffect(() => {
    requestAnimationFrame(() => {
      mainScrollRef.current?.scrollTo({ animated: false, y: 0 });
    });
  }, [activeScreen, selectedExerciseDetailStep?.exerciseName, selectedExerciseDetailStep?.exerciseId]);

  useEffect(() => {
    if (!showCreatorLoginTooltip) {
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      setShowCreatorLoginTooltip(false);
    }, 2200);

    return () => clearTimeout(timeoutId);
  }, [showCreatorLoginTooltip]);

  useEffect(() => {
    if (user && showCreatorLoginTooltip) {
      setShowCreatorLoginTooltip(false);
    }
  }, [showCreatorLoginTooltip, user]);

  useEffect(() => {
    if (!hasLoadedLocalCreatorJob || loadedCreatorJobOwnerId !== storageOwnerId) {
      return;
    }

    if (!pendingCreatorJob) {
      setCreatorPhase("form");
      setRewriteSourceWorkoutId(null);
      return;
    }

    if (pendingCreatorJob.type === "rewrite") {
      setRewriteSourceWorkoutId(pendingCreatorJob.sourceWorkoutId);
      setActiveScreen("workoutAiRewrite");
      return;
    }

    setCreatorPhase("submitted");
  }, [hasLoadedLocalCreatorJob, loadedCreatorJobOwnerId, storageOwnerId]);

  useEffect(() => {
    if (!hasLoadedLocalSettings || loadedSettingsOwnerId !== storageOwnerId) {
      return;
    }

    setPendingLanguage(language);
    setPendingDefaultSetCount(defaultSetCount);
    setPendingDefaultWeight(defaultWeight);
    setPendingDefaultStageType(defaultStageType);
    setPendingDefaultWorkoutExecutionMode(defaultWorkoutExecutionMode);
    setPendingWorkoutReminderDay(null);
  }, [hasLoadedLocalSettings, loadedSettingsOwnerId, storageOwnerId]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTrainingFactIndex((current) => current + 1);
    }, 30000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", () => setIsKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => setIsKeyboardVisible(false));

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    const finalizeForegroundUsage = () => {
      const startedAt = appUsageStartedAtRef.current;
      if (startedAt === null) {
        return;
      }

      appUsageStartedAtRef.current = null;
      setAppUsageStats((current) => addForegroundUsageSeconds(current, startedAt, Date.now()));
    };

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        appUsageStartedAtRef.current = Date.now();
        return;
      }

      finalizeForegroundUsage();
    });

    return () => {
      finalizeForegroundUsage();
      subscription.remove();
    };
  }, []);

  useWorkoutCreatorJobPolling({
    enabled: hasLoadedLocalCreatorJob
      && loadedCreatorJobOwnerId === storageOwnerId
      && Boolean(user),
    job: pendingCreatorJob,
    resume: resumePendingWorkoutCreatorJob,
    scopeKey: `${storageOwnerId}:${user?.token ?? ""}`
  });

  useEffect(() => {
    if (activeSettingsSheet) {
      languageSheetTranslateY.setValue(360);
      Animated.timing(languageSheetTranslateY, {
        duration: 240,
        toValue: 0,
        useNativeDriver: true
      }).start();
    }
  }, [activeSettingsSheet, languageSheetTranslateY]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (activeSettingsSheet) {
        closeSettingsSheet();
        return true;
      }

      return handleBackNavigation();
    });

    return () => subscription.remove();
  }, [activeScreen, activeSettingsSheet, creatorPhase, editingWorkoutId, exerciseDetailReturnScreen, selectedWorkoutId]);

  useEffect(() => {
    if (creatorPhase !== "submitted") {
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      setActiveScreen("home");
      setCreatorPhase("form");
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, [creatorPhase]);

  const filteredWorkouts = useMemo(() => {
    const phrase = search.trim().toLowerCase();
    const visibleWorkouts = savedWorkouts.filter((item) =>
      (includeArchivedWorkouts || !isWorkoutArchived(item))
      && (!phrase || item.name.toLowerCase().includes(phrase))
    );

    return [...visibleWorkouts].sort((left, right) => compareWorkouts(left, right, workoutSort));
  }, [includeArchivedWorkouts, savedWorkouts, search, workoutSort]);
  const activeWorkouts = useMemo(
    () => savedWorkouts.filter((workout) => !isWorkoutArchived(workout)),
    [savedWorkouts]
  );
  const activeWeeklyWorkouts = useMemo(
    () => [...getActiveWeeklyPlanWorkouts(weeklyPlan, savedWorkouts)]
      .sort((left, right) => compareWorkouts(left, right, workoutSort)),
    [savedWorkouts, weeklyPlan, workoutSort]
  );

  const visibleWorkoutSessions = useMemo(
    () => getActiveWorkoutSessionsForUi(workoutSessions),
    [workoutSessions]
  );

  const activeWorkoutSession = useMemo(
    () => visibleWorkoutSessions.find((session) => session.id === activeWorkoutSessionId) ?? null,
    [activeWorkoutSessionId, visibleWorkoutSessions]
  );
  const weeklyPlanSummary = useMemo(
    () => getWeeklyPlanSummary(weeklyPlan, activeWorkouts, visibleWorkoutSessions, new Date()),
    [activeWorkouts, visibleWorkoutSessions, weeklyPlan]
  );
  const shouldShowWorkoutHeaderTime = activeScreen === "workoutSession" && Boolean(activeWorkoutSession);
  const activeWorkoutController = useActiveWorkoutController({
    activeSession: activeWorkoutSession,
    activeSessionId: activeWorkoutSessionId,
    entryIndex: sessionEntryIndex,
    entryIndexBySessionRef: activeWorkoutSessionEntryIndexRef,
    onEmptyWorkout: () => showInfoDialog(t("emptyWorkoutSession")),
    onFinished: () => showInfoDialog(t("workoutSaved")),
    onNavigate: setActiveScreen,
    savedWorkouts,
    selectedWorkoutId,
    sessions: visibleWorkoutSessions,
    setActiveSessionId: setActiveWorkoutSessionId,
    setEntryIndex: setSessionEntryIndex,
    setIsPostWorkoutFillMode,
    setSelectedWorkoutId,
    setSessions: setWorkoutSessions
  });
  const {
    moveStep,
    openExisting: openWorkoutEditor,
    openNew: openWorkoutBuilder,
    removeStep,
    save: saveWorkout,
    updateStep
  } = useWorkoutEditorController({
    defaultSetCount,
    defaultStageType: defaultStageType || "exercise",
    editingWorkoutId,
    onNavigate: setActiveScreen,
    onSave: (nextWorkout) => {
      upsertAccountWorkout(nextWorkout).catch((error) => {
        console.error("Failed to save workout to account", error);
      });
    },
    savedWorkouts,
    setEditingWorkoutId,
    setSavedWorkouts,
    setSelectedWorkoutId,
    setWorkout,
    workout
  });

  const selectedWorkout = useMemo(
    () => savedWorkouts.find((item) => item.id === selectedWorkoutId) ?? activeWorkouts[0] ?? savedWorkouts[0] ?? null,
    [activeWorkouts, savedWorkouts, selectedWorkoutId]
  );

  const rewriteSourceWorkout = useMemo(
    () => savedWorkouts.find((item) => item.id === (rewriteSourceWorkoutId ?? selectedWorkoutId)) ?? null,
    [rewriteSourceWorkoutId, savedWorkouts, selectedWorkoutId]
  );

  const selectedWorkoutSessions = useMemo(
    () => visibleWorkoutSessions
      .filter((session) => session.sourceWorkoutId === selectedWorkoutId && session.status !== "active")
      .sort((left, right) => Date.parse(right.startedAt) - Date.parse(left.startedAt))
      .slice(0, 5),
    [selectedWorkoutId, visibleWorkoutSessions]
  );

  const sortedWorkoutSessions = useMemo(
    () => [...visibleWorkoutSessions].sort((left, right) => getSessionStartedAtTime(right) - getSessionStartedAtTime(left)),
    [visibleWorkoutSessions]
  );

  const achievementMetrics = useMemo(
    () => calculateAchievementMetrics(workoutSessions, appUsageStats),
    [appUsageStats, workoutSessions]
  );

  const achievementProgress = useMemo(
    () => getAchievementProgress(achievementDefinitions, achievementMetrics, userAchievements),
    [achievementMetrics, userAchievements]
  );

  const unlockedAchievementProgress = useMemo(
    () => achievementProgress.filter((item) => item.unlocked),
    [achievementProgress]
  );

  const latestUnlockedAchievement = useMemo(
    () => [...unlockedAchievementProgress]
      .filter((item) => item.unlockedAt)
      .sort((left, right) => Date.parse(right.unlockedAt ?? "") - Date.parse(left.unlockedAt ?? ""))[0] ?? null,
    [unlockedAchievementProgress]
  );

  useEffect(() => {
    if (!hasLoadedAchievements || loadedAchievementsOwnerId !== storageOwnerId) {
      return;
    }

    const evaluation = evaluateAchievements(
      achievementDefinitions,
      achievementMetrics,
      userAchievements,
      new Date().toISOString()
    );

    if (evaluation.newUnlocks.length > 0) {
      const newUnlocks = getNewUserAchievementUnlocks(userAchievements, evaluation.unlockedAchievements);
      const firstDefinition = achievementDefinitions.find((definition) => definition.id === newUnlocks[0]?.achievementId);
      if (firstDefinition) {
        setAchievementToast({
          extraCount: Math.max(0, newUnlocks.length - 1),
          title: firstDefinition.title[language]
        });
      }
      setUserAchievements(evaluation.unlockedAchievements);
    }
  }, [achievementMetrics, hasLoadedAchievements, language, loadedAchievementsOwnerId, storageOwnerId, userAchievements]);

  useEffect(() => {
    if (!achievementToast) {
      return undefined;
    }

    const timeoutId = setTimeout(() => setAchievementToast(null), 4200);
    return () => clearTimeout(timeoutId);
  }, [achievementToast]);

  const filteredWorkoutHistorySessions = useMemo(() => {
    const phrase = workoutHistorySearch.trim().toLowerCase();

    return sortedWorkoutSessions.filter((session) => {
      const matchesStatus = workoutHistoryFilter === "all" || session.status === workoutHistoryFilter;
      const matchesWorkout = !workoutHistoryWorkoutIdFilter || session.sourceWorkoutId === workoutHistoryWorkoutIdFilter;
      const displayName = getWorkoutSessionDisplayName(session).toLowerCase();
      const matchesSearch = !phrase || displayName.includes(phrase);

      return matchesStatus && matchesWorkout && matchesSearch;
    });
  }, [sortedWorkoutSessions, workoutHistoryFilter, workoutHistorySearch, workoutHistoryWorkoutIdFilter]);

  const workoutHistorySummary = useMemo(
    () => getWorkoutHistorySummary(visibleWorkoutSessions),
    [visibleWorkoutSessions]
  );

  const exerciseProgressItems = useMemo(
    () => getExerciseProgressItems(visibleWorkoutSessions),
    [visibleWorkoutSessions]
  );

  const selectedWorkoutSession = useMemo(
    () => visibleWorkoutSessions.find((session) => session.id === selectedWorkoutSessionId) ?? null,
    [selectedWorkoutSessionId, visibleWorkoutSessions]
  );

  const selectedExerciseProgressSummary = useMemo(
    () => selectedExerciseProgressKey ? getExerciseProgressSummary(visibleWorkoutSessions, selectedExerciseProgressKey) : null,
    [selectedExerciseProgressKey, visibleWorkoutSessions]
  );
  const selectedExerciseProgressHistoryGroups = useMemo(
    () => selectedExerciseProgressKey
      ? getExerciseProgressHistoryGroups(visibleWorkoutSessions, selectedExerciseProgressKey)
      : [],
    [selectedExerciseProgressKey, visibleWorkoutSessions]
  );

  const bottomInset = Math.max(insets.bottom, isLandscape ? 4 : 18);
  const bottomSheetBottomPadding = Math.max(insets.bottom, 72) + 24;
  const bottomNavHeight = (isLandscape ? 48 : 58) + bottomInset;
  const scrollViewportBottomMargin = isLandscape ? 0 : bottomNavHeight;

  function getAuthHeaders(session = user): Record<string, string> {
    return getApiHeaders(session);
  }

  function getApiHeaders(session: UserSession | null = user): Record<string, string> {
    return buildApiHeaders(session);
  }

  async function fetchAccountWorkouts(session: UserSession) {
    const apiWorkouts = await accountDataApi.getWorkouts(
      getAuthHeaders(session),
      "Workout fetch failed"
    );
    const workouts = apiWorkouts.map(mapApiWorkoutToSavedWorkout);
    const migratedWorkoutIds = new Set(
      apiWorkouts
        .filter((apiWorkout, index) => workouts[index].draft.steps.length < apiWorkout.steps.length)
        .map((apiWorkout) => apiWorkout.clientWorkoutId)
    );
    return { migratedWorkoutIds, workouts };
  }

  async function synchronizeAccountWorkouts(session: UserSession, localWorkouts: SavedWorkout[]) {
    const recoveredLocalWorkouts = localWorkouts.map((savedWorkout) => ({
      ...savedWorkout,
      draft: recoverWorkoutRestSecondsFromSessions(
        savedWorkout.draft,
        savedWorkout.id,
        workoutSessions
      )
    }));
    await accountDataApi.syncWorkouts(
      {
        deletedClientWorkoutIds: [],
        lastPulledAt: null,
        workouts: recoveredLocalWorkouts.map(mapSavedWorkoutToApiRequest)
      },
      getAuthHeaders(session),
      "Workout sync failed"
    );

    const { migratedWorkoutIds, workouts: accountWorkouts } = await fetchAccountWorkouts(session);
    const mergedWorkouts = mergeWorkoutsById(accountWorkouts, recoveredLocalWorkouts);

    setSavedWorkouts(mergedWorkouts);
    setSelectedWorkoutId((current) =>
      current && mergedWorkouts.some((workout) => workout.id === current)
        ? current
        : mergedWorkouts[0]?.id ?? ""
    );

    const migratedAccountWorkouts = mergedWorkouts.filter((workout) => migratedWorkoutIds.has(workout.id));
    if (migratedAccountWorkouts.length > 0) {
      await accountDataApi.syncWorkouts(
        {
          deletedClientWorkoutIds: [],
          lastPulledAt: null,
          workouts: migratedAccountWorkouts.map(mapSavedWorkoutToApiRequest)
        },
        getAuthHeaders(session),
        "Workout rest migration sync failed"
      );
    }
  }

  async function upsertAccountWorkout(nextWorkout: SavedWorkout, session = user) {
    if (!session) {
      return;
    }

    await accountDataApi.upsertWorkout(
      mapSavedWorkoutToApiRequest(nextWorkout),
      getAuthHeaders(session),
      "Workout upsert failed"
    );
  }

  async function deleteAccountWorkout(workoutId: string, session = user) {
    if (!session) {
      return;
    }

    await accountDataApi.deleteWorkout(
      workoutId,
      getAuthHeaders(session),
      "Workout delete failed"
    );
  }

  function updateWorkoutReminderSettings(nextSettings: WorkoutReminderSettings) {
    setWorkoutReminders({
      ...normalizeWorkoutReminderSettings(nextSettings, language),
      updatedAt: new Date().toISOString()
    });
  }

  async function toggleWorkoutRemindersEnabled() {
    if (workoutReminders.enabled) {
      updateWorkoutReminderSettings({
        ...workoutReminders,
        enabled: false
      });
      await cancelWorkoutReminders(storageOwnerId);
      return;
    }

    const hasPermission = await requestWorkoutReminderPermissions();
    if (!hasPermission) {
      setReminderSchedulingStatus("permissionDenied");
      showInfoDialog(t("workoutReminders"), t("remindersPermissionDenied"));
      updateWorkoutReminderSettings({
        ...workoutReminders,
        enabled: false
      });
      return;
    }

    updateWorkoutReminderSettings({
      ...workoutReminders,
      enabled: true
    });
  }

  function openWorkoutReminderDayEditor(day: ReminderWeekday) {
    const existing = workoutReminders.weeklySchedule.find((schedule) => schedule.day === day) ?? {
      day,
      enabled: false,
      time: "18:00"
    };
    setPendingWorkoutReminderDay(existing);
    setActiveSettingsSheet("workoutReminderDay");
  }

  async function toggleWorkoutReminderDay(dayNumber: number) {
    const day = getReminderWeekdayFromNumber(dayNumber);
    const current = getReminderScheduleForDay(workoutReminders, dayNumber);
    const nextEnabled = !current.enabled;

    if (nextEnabled && workoutReminders.enabled) {
      const hasPermission = await requestWorkoutReminderPermissions();
      if (!hasPermission) {
        setReminderSchedulingStatus("permissionDenied");
        showInfoDialog(t("workoutReminders"), t("remindersPermissionDenied"));
        return;
      }
    }

    updateWorkoutReminderSettings({
      ...updateReminderDaySchedule(workoutReminders, day, {
        enabled: nextEnabled,
        time: current.time
      })
    });
  }

  function updatePendingWorkoutReminderDay(patch: Partial<Omit<ReminderDaySchedule, "day">>) {
    setPendingWorkoutReminderDay((current) => current ? {
      ...current,
      ...patch
    } : current);
  }

  function updateWorkoutReminderMessage(message: string) {
    updateWorkoutReminderSettings({
      ...workoutReminders,
      message
    });
  }

  function updateWorkoutReminderDescription(description: string) {
    updateWorkoutReminderSettings({
      ...workoutReminders,
      description
    });
  }

  function applyAccountSettings(settings: ApiUserSettings) {
    applyAccountSettingsState(settings, true);
    setCreatorProfiles(settings.creatorProfiles);
    setSelectedCreatorProfileId(settings.selectedCreatorProfileId);
    setWeeklyPlan(settings.weeklyPlan);
    setPendingLanguage(settings.language);
    setPendingDefaultSetCount(settings.defaultSetCount);
    setPendingDefaultWeight(settings.defaultWeight);
    setPendingDefaultStageType(settings.defaultStageType);
    setPendingDefaultWorkoutExecutionMode(settings.defaultWorkoutExecutionMode);
    setPendingWorkoutReminderDay(null);
  }

  async function fetchAccountSettings(session: UserSession) {
    const responseBody = await accountDataApi.getSettings(
      getAuthHeaders(session),
      "Settings fetch failed"
    );
    const fieldPresence = getSyncedAccountSettingsFieldPresence(responseBody);
    return {
      includedCreatorProfiles: fieldPresence.creatorProfiles,
      includedWeeklyPlan: fieldPresence.weeklyPlan,
      settings: normalizeApiUserSettings(responseBody)
    };
  }

  async function saveAccountSettings(payload = buildAccountSettingsPayload(), session = user) {
    if (!session) {
      return null;
    }

    const responseBody = await accountDataApi.saveSettings(
      {
        ...payload,
        defaultStageType: payload.defaultStageType || null
      },
      getAuthHeaders(session),
      "Settings save failed"
    );
    return normalizeApiUserSettings(responseBody);
  }

  async function synchronizeAccountSettings(session: UserSession) {
    const fetchedSettings = await fetchAccountSettings(session);
    const accountSettings = fetchedSettings.settings;
    const settingsWithResolvedWeeklyPlan = accountSettings
      ? resolveWeeklyPlanDuringInitialSync(
          accountSettings,
          weeklyPlan,
          fetchedSettings.includedWeeklyPlan,
          hadPersistedWeeklyPlanOnLoad
        )
      : null;

    const action = resolveInitialSettingsSyncAction({
      hasPersistedLocalSettings: hadPersistedLocalSettingsOnLoad,
      localUpdatedAt: localSettingsUpdatedAt,
      remoteUpdatedAt: accountSettings?.updatedAt ?? null
    });

    if (action === "apply-remote" && settingsWithResolvedWeeklyPlan) {
      let settingsWithMigratedLocalData = preserveLocalCreatorProfilesDuringInitialSync(
        settingsWithResolvedWeeklyPlan,
        creatorProfiles,
        selectedCreatorProfileId,
        fetchedSettings.includedCreatorProfiles
      );
      applyAccountSettings(settingsWithMigratedLocalData);
      if (settingsWithMigratedLocalData !== accountSettings) {
        await saveAccountSettings(settingsWithMigratedLocalData, session);
      }
      return;
    }

    const weeklyPlanForPush = settingsWithResolvedWeeklyPlan?.weeklyPlan ?? weeklyPlan;
    if (weeklyPlanForPush !== weeklyPlan) {
      setWeeklyPlan(weeklyPlanForPush);
    }
    await saveAccountSettings({
      ...buildAccountSettingsPayload(),
      weeklyPlan: weeklyPlanForPush
    }, session);
  }

  async function syncAccountFavoriteExercises(
    session: UserSession,
    localFavorites: FavoriteExercise[],
    forceFullPull = false
  ) {
    return synchronizeFavoriteExercises({
      favorites: localFavorites,
      forceFullPull,
      userId: session.id,
      request: (body) => accountDataApi.syncFavoriteExercises(
        body,
        getAuthHeaders(session),
        "Favorite exercises sync failed"
      )
    });
  }

  async function synchronizeAccountFavoriteExercises(session: UserSession, localFavorites: FavoriteExercise[]) {
    const mergedFavorites = await syncAccountFavoriteExercises(session, localFavorites, true);
    isApplyingAccountFavoriteExercisesRef.current = true;
    setFavoriteExercises(mergedFavorites);
    setFavoriteExercisesSyncStatus("synced");
    setTimeout(() => {
      isApplyingAccountFavoriteExercisesRef.current = false;
    }, 0);
  }

  async function syncAccountWorkoutSessions(
    session: UserSession,
    localSessions: WorkoutSession[],
    forceFullPull = false
  ) {
    return synchronizeWorkoutSessions({
      forceFullPull,
      localSessions,
      userId: session.id,
      request: (body) => accountDataApi.syncWorkoutSessions(
        body,
        getAuthHeaders(session),
        "Workout sessions sync failed"
      )
    });
  }

  async function synchronizeAccountWorkoutSessions(session: UserSession, localSessions: WorkoutSession[]) {
    const mergedSessions = await syncAccountWorkoutSessions(session, localSessions, true);
    isApplyingAccountWorkoutSessionsRef.current = true;
    setWorkoutSessions(mergedSessions);
    const activeSession = mergedSessions.find((item) => item.status === "active" && !item.deletedAt);
    setActiveWorkoutSessionId((current) => current ?? activeSession?.id ?? null);
    if (activeSession) {
      setSessionEntryIndex((current) => clampWorkoutSessionEntryIndex(
        activeWorkoutSessionEntryIndexRef.current[activeSession.id] ?? current,
        activeSession
      ));
    }
    setTimeout(() => {
      isApplyingAccountWorkoutSessionsRef.current = false;
    }, 0);
  }

  async function syncAccountAchievements(
    session: UserSession,
    localAchievements: UserAchievement[],
    localUsageStats: AppUsageStats,
    forceFullPull = false
  ) {
    return synchronizeAchievements({
      appUsageStats: localUsageStats,
      forceFullPull,
      unlocked: localAchievements,
      userId: session.id,
      request: async (body) => {
        try {
          return await accountDataApi.syncAchievements(
            body,
            getAuthHeaders(session),
            "Achievements sync failed"
          );
        } catch (error) {
          if ((error as { status?: number }).status === 401) {
            handleUnauthorizedSession();
          }
          throw error;
        }
      }
    });
  }

  async function synchronizeAccountAchievements(
    session: UserSession,
    localAchievements: UserAchievement[],
    localUsageStats: AppUsageStats
  ) {
    const merged = await syncAccountAchievements(session, localAchievements, localUsageStats, true);
    applyRemoteAchievementState(merged);
  }

  function openWorkoutCreator() {
    if (!areOnlineFeaturesAvailable) {
      showOnlineFeatureUnavailableDialog();
      return;
    }

    if (!user) {
      setShowCreatorLoginTooltip(true);
      return;
    }

    if (pendingCreatorJob?.type === "plan") {
      setCreatorPhase("submitted");
      return;
    }

    setCreatorDraft({});
    setCreatorSensitiveDataConsent(false);
    setCreatorProfileName("");
    setSelectedCreatorProfileId(null);
    setCreatorCollapsedSections({});
    setCreatorPlanText("");
    setCreatorSubmitError("");
    setIsCreatorSubmitting(false);
    setCreatorPhase("form");
    setActiveScreen("workoutCreator");
  }

  function openWorkoutDetail(workoutId: string) {
    setSelectedWorkoutId(workoutId);
    setActiveScreen("workoutDetail");
  }

  function startSelectedWorkoutSession(executionMode = resolveWorkoutStartExecutionMode(defaultWorkoutExecutionMode)) {
    activeWorkoutController.start(executionMode);
  }

  function continueActiveWorkoutSession(sessionId = activeWorkoutSessionId) {
    activeWorkoutController.continueSession(sessionId);
  }

  function updateWorkoutSessionEntry(entryId: string, patch: Partial<WorkoutSessionEntry>) {
    activeWorkoutController.updateEntry(entryId, patch);
  }

  function requestCreateWorkoutSessionSuperset(currentEntryId: string) {
    if (!activeWorkoutSession || activeWorkoutSession.executionMode !== "guided") {
      showInfoDialog(t("superset"), t("supersetUnsupported"));
      return;
    }

    const candidate = getWorkoutSessionSupersetCandidate(activeWorkoutSession, currentEntryId);
    if (candidate.status === "no-next") {
      showInfoDialog(t("superset"), t("supersetNoNext"));
      return;
    }
    if (candidate.status === "overlap") {
      showInfoDialog(t("superset"), t("supersetOverlap"));
      return;
    }
    if (candidate.status !== "ready") {
      showInfoDialog(t("superset"), t("supersetInvalid"));
      return;
    }

    const nextEntry = activeWorkoutSession.entries.find(
      (entry) => entry.id === candidate.entryIds[1]
    );
    const nextExerciseName = nextEntry
      ? formatSessionEntryTitle(nextEntry)
      : t("elementWithoutExercise");

    showConfirmDialog({
      confirmLabel: t("supersetCreateConfirm"),
      message: `${t("supersetNextExercise")}: ${nextExerciseName}\n\n${t("supersetCreateCopy")}`,
      onConfirm: () => activeWorkoutController.createSuperset(currentEntryId),
      title: t("supersetCreateTitle")
    });
  }

  function requestRemoveWorkoutSessionSuperset(supersetId: string) {
    showConfirmDialog({
      confirmLabel: t("supersetSplitConfirm"),
      message: t("supersetSplitCopy"),
      onConfirm: () => activeWorkoutController.removeSuperset(supersetId),
      title: t("supersetSplitTitle")
    });
  }

  function updateWorkoutSessionSupersetRound(
    supersetId: string,
    roundIndex: number,
    exerciseSide: WorkoutSessionSupersetSide,
    field: WorkoutSessionSupersetValueField,
    value: string
  ) {
    activeWorkoutController.updateSupersetRound(supersetId, roundIndex, exerciseSide, field, value);
  }

  function finishActiveWorkoutSession() {
    activeWorkoutController.finish();
  }

  function isWorkoutSessionEntryFillRequired(entry: WorkoutSessionEntry) {
    return entry.type !== "rest" && entry.type !== "warmup" && entry.plannedTargetType !== "buttonPress";
  }

  function hasIncompleteWorkoutSessionEntries(session: WorkoutSession) {
    return session.entries.some((entry) => {
      if (!isWorkoutSessionEntryFillRequired(entry)) {
        return false;
      }

      return !entry.isCompleted || !entry.actualWeight?.trim() || !entry.actualReps?.trim();
    });
  }

  function requestFinishActiveWorkoutSession() {
    if (!activeWorkoutSession) {
      return;
    }

    if (!hasIncompleteWorkoutSessionEntries(activeWorkoutSession)) {
      finishActiveWorkoutSession();
      return;
    }

    showConfirmDialog({
      confirmLabel: t("finish"),
      message: t("finishIncompleteWorkoutCopy"),
      onConfirm: finishActiveWorkoutSession,
      title: t("finishIncompleteWorkoutTitle"),
      variant: "destructive"
    });
  }

  function abandonActiveWorkoutSession() {
    if (!activeWorkoutSession) {
      return;
    }

    setAppDialog({
      title: t("abandonWorkout"),
      message: t("abandonWorkoutConfirmMessage"),
      actions: [
        {
          label: t("cancel"),
          variant: "outline"
        },
        {
          label: t("confirm"),
          variant: "destructive",
          onPress: () => {
          activeWorkoutController.abandon();
        }
      }
      ]
    });
  }

  function submitWorkoutCreatorForm() {
    if (!creatorSensitiveDataConsent) {
      setCreatorSubmitError(t("aiCreatorSensitiveConsentRequired"));
      return;
    }

    if (selectedCreatorProfileId) {
      const selectedProfile = creatorProfiles.find((profile) => profile.id === selectedCreatorProfileId);
      setCreatorProfileName(selectedProfile?.name ?? "");

      if (selectedProfile && areCreatorDraftsEqual(selectedProfile.draft, creatorDraft)) {
        void finishWorkoutCreatorRequest(selectedCreatorProfileId);
        return;
      }
    }

    setCreatorSubmitError("");
    setCreatorPhase("profilePrompt");
  }

  function loadCreatorProfile(profile: WorkoutCreatorProfile) {
    setCreatorDraft(cloneCreatorDraft(profile.draft));
    setCreatorProfileName(profile.name);
    setSelectedCreatorProfileId(profile.id);
    setCreatorPhase("form");
  }

  function buildWorkoutCreatorQuestionsAndAnswers(): WorkoutCreatorQuestionAnswer[] {
    return workoutCreatorSections.flatMap((section) =>
      section.fields.flatMap((field) => {
        const value = creatorDraft[field.id];
        const defaultValue = field.defaultValue ? getCreatorLabel(field.defaultValue) : "";
        const answer = Array.isArray(value)
          ? value.join(", ")
          : typeof value === "string"
            ? value.trim()
            : defaultValue;

        if (!answer.trim()) {
          return [];
        }

        return {
          Question: getCreatorLabel(field.label),
          Answer: answer
        };
      })
    );
  }

  function handleWorkoutCreatorCompletedResponse(completedResponseBody: unknown) {
    const createdWorkouts = createSavedWorkoutsFromApiResponse(
      completedResponseBody,
      wantsReadyWarmupSet() ? "ready" : "button"
    );

    if (createdWorkouts.length) {
      setSavedWorkouts((current) => [...createdWorkouts, ...current]);
      setSelectedWorkoutId(createdWorkouts[0].id);
      setCreatorImportedWorkoutCount(createdWorkouts.length);
      setCreatorPlanText("");
      void notifyCreatorWorkoutsImported(createdWorkouts.length);
      createdWorkouts.forEach((createdWorkout) => {
        upsertAccountWorkout(createdWorkout).catch((error) => {
          console.error("Failed to save creator workout to account", error);
        });
      });
    } else {
      console.warn("Workout creator response did not contain importable workouts", completedResponseBody);
      setCreatorImportedWorkoutCount(0);
      setCreatorPlanText(getWorkoutCreatorPlanText(completedResponseBody));
    }

    setCreatorPhase("waiting");
  }

  async function waitForWorkoutCreatorJob(jobId: string, shouldContinue: () => boolean = () => true) {
    if (!user) {
      throw new Error(t("aiRewriteSessionExpired"));
    }

    return pollWorkoutCreatorJob({
      cancelled: () => !shouldContinue(),
      failedMessage: t("aiCreatorSubmitError"),
      getJob: () => workoutCreatorApi.getJob(jobId, {
          ...getAuthHeaders(user),
          "ngrok-skip-browser-warning": "true"
        }, t("aiCreatorSubmitError")),
      sessionExpiredMessage: t("aiRewriteSessionExpired")
    });
  }

  async function resumePendingWorkoutCreatorJob(job: PendingWorkoutCreatorJob, shouldContinue: () => boolean = () => true) {
    setCreatorSubmitError("");
    setRewriteError("");

    try {
      if (job.type === "rewrite") {
        const sourceWorkout = savedWorkouts.find((item) => item.id === job.sourceWorkoutId);

        if (!sourceWorkout) {
          setRewriteSourceWorkoutId(job.sourceWorkoutId);
          setRewriteError(t("noWorkout"));
          setPendingCreatorJob(null);
          setActiveScreen("workoutAiRewrite");
          return;
        }

        setRewriteSourceWorkoutId(job.sourceWorkoutId);
        setActiveScreen("workoutAiRewrite");

        const completedResponseBody = await waitForWorkoutCreatorJob(job.jobId, shouldContinue);

        if (!completedResponseBody || !shouldContinue()) {
          return;
        }

        const proposedWorkouts = createSavedWorkoutsFromApiResponse(completedResponseBody, "none");
        const proposedWorkout = proposedWorkouts[0];

        if (!proposedWorkout) {
          throw new Error(t("aiRewriteInvalidFormat"));
        }

        setRewriteProposedWorkout({
          ...proposedWorkout,
          id: `rewrite-${Date.now()}`,
          name: proposedWorkout.name || sourceWorkout.name
        });
        setPendingCreatorJob(null);
        setActiveScreen("workoutAiProposal");
        showInfoDialog(t("aiRewriteReady"));
        return;
      }

      const completedResponseBody = await waitForWorkoutCreatorJob(job.jobId, shouldContinue);

      if (!completedResponseBody || !shouldContinue()) {
        return;
      }

      handleWorkoutCreatorCompletedResponse(completedResponseBody);
      setPendingCreatorJob(null);
    } catch (error) {
      if (!shouldContinue()) {
        return;
      }

      console.error("Workout creator polling failed", error);
      setPendingCreatorJob(null);
      if (job.type === "rewrite") {
        setRewriteError(getErrorMessageOrFallback(error, t("aiRewriteStartError"), t("serverProblemMessage")));
        setActiveScreen("workoutAiRewrite");
      } else {
        setCreatorSubmitError(getErrorMessageOrFallback(error, t("aiCreatorSubmitError"), t("serverProblemMessage")));
        setCreatorPhase("profilePrompt");
      }
    }
  }

  async function finishWorkoutCreatorRequest(profileId = selectedCreatorProfileId) {
    if (pendingCreatorJob?.type === "plan" || isCreatorSubmitting) {
      setCreatorPhase("submitted");
      setActiveScreen("home");
      return;
    }

    const questionsAndAnswers = buildWorkoutCreatorQuestionsAndAnswers();
    const hasAnyAnswer = questionsAndAnswers.some((item) => item.Answer.trim());

    if (!creatorSensitiveDataConsent) {
      setCreatorSubmitError(t("aiCreatorSensitiveConsentRequired"));
      setCreatorPhase("form");
      return;
    }

    if (!hasAnyAnswer) {
      setCreatorSubmitError(t("aiCreatorSubmitError"));
      return;
    }

    if (!user) {
      setCreatorSubmitError(t("aiRewriteSessionExpired"));
      return;
    }

    if (!user.emailVerified) {
      setEmailVerificationMessage("");
      setIsEmailVerificationOpen(true);
      setCreatorSubmitError(language === "pl" ? "Potwierdź adres email przed użyciem funkcji AI." : "Verify your email before using AI features.");
      return;
    }

    if (aiCreditBalance.balance < aiCreditBalance.planCost) {
      setCreatorSubmitError(t("aiCreditsInsufficient"));
      return;
    }

    setIsCreatorSubmitting(true);
    setCreatorSubmitError("");
    setCreatorImportedWorkoutCount(0);
    setCreatorPhase("submitted");

    try {
      const responseBody = await workoutCreatorApi.startPlan({
          language,
          profileId,
          questionsAndAnswers,
          sensitiveDataConsent: true
        }, {
          ...getAuthHeaders(user),
          "Content-Type": "application/json",
          "X-Idempotency-Key": `plan-${profileId ?? "profile"}-${Date.now()}`,
          "ngrok-skip-browser-warning": "true"
        }, t("aiCreatorSubmitError"));

      void fetchAiCredits(user);

      if (isWorkoutCreatorJobResponse(responseBody)) {
        setCreatorSensitiveDataConsent(false);
        setPendingCreatorJob({
          createdAt: new Date().toISOString(),
          jobId: getWorkoutCreatorJobId(responseBody),
          profileId,
          type: "plan",
          version: 1
        });
        return;
      }

      handleWorkoutCreatorCompletedResponse(responseBody);
      setCreatorSensitiveDataConsent(false);
    } catch (error) {
      console.error("Workout creator request failed", error);
      setCreatorSubmitError(isInsufficientAiCreditsError(error)
        ? t("aiCreditsInsufficient")
        : getErrorMessageOrFallback(error, t("aiCreatorSubmitError"), t("serverProblemMessage")));
      setCreatorPhase("profilePrompt");
    } finally {
      setIsCreatorSubmitting(false);
    }
  }

  async function submitWorkoutRewrite() {
    const sourceWorkout = savedWorkouts.find((item) => item.id === (rewriteSourceWorkoutId ?? selectedWorkoutId));
    const instruction = rewriteInstruction.trim();

    if (pendingCreatorJob?.type === "rewrite" || isRewriteSubmitting) {
      return;
    }

    if (!sourceWorkout) {
      setRewriteError(t("noWorkout"));
      return;
    }

    if (!user) {
      setRewriteError(t("aiRewriteSessionExpired"));
      return;
    }

    if (!user.emailVerified) {
      setEmailVerificationMessage("");
      setIsEmailVerificationOpen(true);
      setRewriteError(language === "pl" ? "Potwierdź adres email przed użyciem funkcji AI." : "Verify your email before using AI features.");
      return;
    }

    if (!instruction) {
      setRewriteError(t("aiRewriteRequired"));
      return;
    }

    if (aiCreditBalance.balance < aiCreditBalance.rewriteCost) {
      setRewriteError(t("aiCreditsInsufficient"));
      return;
    }

    setRewriteError("");
    setIsRewriteSubmitting(true);

    try {
      const responseBody = await workoutCreatorApi.startRewrite({
          language,
          workout: mapSavedWorkoutToApiRequest(sourceWorkout),
          instruction,
          preferences: {
            catalogOnly: true
          }
        }, {
          ...getAuthHeaders(user),
          "Content-Type": "application/json",
          "X-Idempotency-Key": `rewrite-${sourceWorkout.id}-${Date.now()}`,
          "ngrok-skip-browser-warning": "true"
        }, t("aiRewriteStartError"));

      const jobId = getWorkoutCreatorJobId(responseBody);
      let completedResponseBody = responseBody;
      void fetchAiCredits(user);

      if (isWorkoutCreatorJobResponse(responseBody)) {
        setPendingCreatorJob({
          createdAt: new Date().toISOString(),
          jobId,
          sourceWorkoutId: sourceWorkout.id,
          type: "rewrite",
          version: 1
        });
        completedResponseBody = await waitForWorkoutCreatorJob(jobId);
      }

      if (!completedResponseBody) {
        return;
      }

      const proposedWorkouts = createSavedWorkoutsFromApiResponse(completedResponseBody, "none");
      const proposedWorkout = proposedWorkouts[0];

      if (!proposedWorkout) {
        throw new Error(t("aiRewriteInvalidFormat"));
      }

      setRewriteProposedWorkout({
        ...proposedWorkout,
        id: `rewrite-${Date.now()}`,
        name: proposedWorkout.name || sourceWorkout.name
      });
      setPendingCreatorJob(null);
      setActiveScreen("workoutAiProposal");
      showInfoDialog(t("aiRewriteReady"));
    } catch (error) {
      console.error("Workout rewrite failed", error);
      const status = (error as { status?: number }).status;
      setRewriteError(status === 401
        ? t("aiRewriteSessionExpired")
        : isInsufficientAiCreditsError(error)
          ? t("aiCreditsInsufficient")
          : getErrorMessageOrFallback(error, t("aiRewriteStartError"), t("serverProblemMessage")));
    } finally {
      setIsRewriteSubmitting(false);
    }
  }

  function saveRewriteProposalAsNew() {
    if (!rewriteProposedWorkout) {
      return;
    }

    const nextWorkout = {
      ...rewriteProposedWorkout,
      createdAt: new Date().toISOString(),
      id: `workout-${Date.now()}`,
      draft: {
        ...rewriteProposedWorkout.draft,
        steps: rewriteProposedWorkout.draft.steps.map((step) => ({ ...step }))
      }
    };

    setSavedWorkouts((current) => [nextWorkout, ...current]);
    setSelectedWorkoutId(nextWorkout.id);
    setRewriteProposedWorkout(null);
    setPendingCreatorJob(null);
    setActiveScreen("workoutDetail");

    upsertAccountWorkout(nextWorkout).catch((error) => {
      console.error("Failed to save AI rewrite as new workout", error);
    });
  }

  function replaceWorkoutWithRewriteProposal() {
    if (!rewriteProposedWorkout || !rewriteSourceWorkoutId) {
      return;
    }

    showConfirmDialog({
      confirmLabel: t("aiRewriteReplaceConfirmAction"),
      message: t("aiRewriteReplaceConfirmCopy"),
      title: t("aiRewriteReplaceConfirmTitle"),
      variant: "destructive",
      onConfirm: () => {
          const nextWorkout: SavedWorkout = {
            ...rewriteProposedWorkout,
            createdAt: savedWorkouts.find((item) => item.id === rewriteSourceWorkoutId)?.createdAt ?? rewriteProposedWorkout.createdAt,
            id: rewriteSourceWorkoutId,
            draft: {
              ...rewriteProposedWorkout.draft,
              steps: rewriteProposedWorkout.draft.steps.map((step) => ({ ...step }))
            }
          };

          setSavedWorkouts((current) => current.map((item) => item.id === rewriteSourceWorkoutId ? nextWorkout : item));
          setSelectedWorkoutId(rewriteSourceWorkoutId);
          setRewriteProposedWorkout(null);
          setPendingCreatorJob(null);
          setActiveScreen("workoutDetail");

          upsertAccountWorkout(nextWorkout).catch((error) => {
            console.error("Failed to replace workout with AI rewrite", error);
          });
        }
    });
  }

  function saveCreatorProfileAndSubmit() {
    const normalizedName = creatorProfileName.trim();

    if (!normalizedName) {
      void finishWorkoutCreatorRequest();
      return;
    }

    const nextProfile: WorkoutCreatorProfile = {
      draft: cloneCreatorDraft(creatorDraft),
      id: `creator-profile-${Date.now()}`,
      name: normalizedName
    };

    setCreatorProfiles((current) => [nextProfile, ...current]);
    setSelectedCreatorProfileId(nextProfile.id);
    void finishWorkoutCreatorRequest(nextProfile.id);
  }

  function returnToHomeFromCreator() {
    setActiveScreen("home");
    setCreatorPhase("form");
    setCreatorSensitiveDataConsent(false);
  }

  function updateCreatorProfileAndSubmit() {
    if (!selectedCreatorProfileId) {
      saveCreatorProfileAndSubmit();
      return;
    }

    const normalizedName = creatorProfileName.trim();

    setCreatorProfiles((current) =>
      current.map((profile) =>
        profile.id === selectedCreatorProfileId
          ? {
              ...profile,
              draft: cloneCreatorDraft(creatorDraft),
              name: normalizedName || profile.name
            }
          : profile
      )
    );
    void finishWorkoutCreatorRequest(selectedCreatorProfileId);
  }

  function getCreatorLabel(text: LocalizedText) {
    return text[language];
  }

  function getCreatorTextValue(fieldId: string) {
    const value = creatorDraft[fieldId];
    return typeof value === "string" ? value : "";
  }

  function wantsReadyWarmupSet() {
    const answer = getCreatorTextValue("readyWarmupSet").trim().toLowerCase();
    return answer === "tak" || answer === "yes";
  }

  function toggleCreatorSection(sectionId: string) {
    setCreatorCollapsedSections((current) => ({
      ...current,
      [sectionId]: !(current[sectionId] ?? false)
    }));
  }

  function performDeleteWorkout(workoutId: string) {
    setSavedWorkouts((current) => current.filter((item) => item.id !== workoutId));
    setSelectedWorkoutId("");
    setEditingWorkoutId(null);
    setActiveScreen("workouts");

    deleteAccountWorkout(workoutId).catch((error) => {
      console.error("Failed to delete workout from account", error);
    });
  }

  function deleteWorkout(workoutId: string) {
    if (workoutHasHistory(workoutId, workoutSessions)) {
      showConfirmDialog({
        confirmLabel: t("deleteWorkoutAction"),
        message: t("deleteWorkoutWithHistoryCopy"),
        onConfirm: () => performDeleteWorkout(workoutId),
        title: t("deleteWorkoutWithHistoryTitle"),
        variant: "destructive"
      });
      return;
    }

    performDeleteWorkout(workoutId);
  }

  function updateWorkoutArchiveState(workoutId: string, archived: boolean) {
    const currentWorkout = savedWorkouts.find((item) => item.id === workoutId);
    if (!currentWorkout) {
      return;
    }

    const nextWorkout = setWorkoutArchived(currentWorkout, archived);
    setSavedWorkouts((current) =>
      current.map((item) => item.id === workoutId ? nextWorkout : item)
    );

    upsertAccountWorkout(nextWorkout).catch((error) => {
      console.error("Failed to update workout archive state", error);
    });
  }

  function deleteWorkoutHistoryEntry(sessionId: string) {
    const session = workoutSessions.find((item) => item.id === sessionId);
    if (!session || session.deletedAt) {
      return;
    }

    showConfirmDialog({
      confirmLabel: t("delete"),
      message: t("deleteHistoryEntryCopy"),
      title: t("deleteHistoryEntryTitle"),
      variant: "destructive",
      onConfirm: () => {
          const deletedSession = markWorkoutSessionDeleted(session);
          setWorkoutSessions((current) => current.map((item) => item.id === sessionId ? deletedSession : item));
          if (activeWorkoutSessionId === sessionId) {
            delete activeWorkoutSessionEntryIndexRef.current[sessionId];
            setActiveWorkoutSessionId(null);
            setSessionEntryIndex(0);
          }
          if (selectedWorkoutSessionId === sessionId) {
            setSelectedWorkoutSessionId(null);
            setActiveScreen("workoutHistory");
          }
        }
    });
  }

  function isReadOnlyWorkoutPanelCollapsed(panelId: string) {
    return readOnlyWorkoutCollapsedPanels[panelId] ?? false;
  }

  function toggleReadOnlyWorkoutPanel(panelId: string) {
    setReadOnlyWorkoutCollapsedPanels((current) => ({
      ...current,
      [panelId]: !(current[panelId] ?? false)
    }));
  }

  async function persistAuthSession(authResponse: AuthApiResponse) {
    const session = await persistStoredAuthSession(
      authResponse,
      authResponse.user.email.split("@")[0] || t("defaultUserName")
    );
    setUser(session);
    setIsEmailVerificationOpen(!session.emailVerified);
    setPassword("");
    setShowLoginForm(false);
    setAuthError("");
    setActiveScreen("home");
  }

  async function submitAuthRequest(endpoint: "login" | "register", body: Record<string, string>) {
    setIsAuthSubmitting(true);
    setAuthError("");

    try {
      const responseBody = await authApi.authenticate(
        endpoint,
        body,
        {
          "Content-Type": "application/json",
          "X-Gymmin-Device-Name": getAuthDeviceName(),
          ...getApiHeaders(null)
        },
        t("authRequestError")
      );

      await persistAuthSession(responseBody);
    } catch (error) {
      if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
        console.warn("Auth request failed", error);
      }
      setAuthError(getErrorMessageOrFallback(error, t("authRequestError"), t("serverProblemMessage")));
    } finally {
      setIsAuthSubmitting(false);
    }
  }

  function logIn() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || password.length < 4) {
      setAuthError(t("authLoginValidation"));
      return;
    }

    void submitAuthRequest("login", {
      email: normalizedEmail,
      password
    });
  }

  function register() {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = displayName.trim();

    if (!normalizedName) {
      setAuthError(t("authUsernameValidation"));
      return;
    }

    if (!normalizedEmail || password.length < 4) {
      setAuthError(t("authLoginValidation"));
      return;
    }

    if (password !== passwordConfirm) {
      setAuthError(t("authPasswordMismatch"));
      return;
    }

    void submitAuthRequest("register", {
      email: normalizedEmail,
      name: normalizedName,
      password
    });
  }

  function handleUnauthorizedSession() {
    setAuthError(t("sessionExpired"));
    logOut();
  }

  async function updateStoredUserSession(nextUser: UserSession) {
    setUser(nextUser);
    await updateStoredAuthUser(nextUser);
  }

  async function applyAvatarUpdate(response: AvatarResponse) {
    if (!user) {
      return;
    }

    await updateStoredUserSession(applyAvatarResponse(user, response));
  }

  async function changeUserAvatar() {
    if (!user) {
      showInfoDialog(t("profile"), t("loginToSetAvatar"));
      return;
    }

    setIsAvatarSubmitting(true);
    setAvatarMessage("");
    let preparedAvatar: PreparedAvatar | null = null;

    try {
      const ImagePicker = await import("expo-image-picker");
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setAvatarMessage(t("avatarPermissionDenied"));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85
      });

      if (result.canceled || !result.assets[0]?.uri) {
        return;
      }

      const asset = result.assets[0];
      preparedAvatar = await prepareAvatarForUpload(asset.uri, asset.mimeType);
      const formData = new FormData();
      formData.append("avatar", {
        name: `avatar.${preparedAvatar.extension}`,
        type: preparedAvatar.mimeType,
        uri: preparedAvatar.uri
      } as unknown as Blob);

      const responseBody = await profileApi.uploadAvatar(
        formData,
        getAuthHeaders(user),
        t("avatarUploadError")
      );
      await applyAvatarUpdate(responseBody);
      setAvatarMessage(t("avatarUpdated"));
    } catch (error) {
      if ((error as { status?: number }).status === 401) {
        handleUnauthorizedSession();
        return;
      }
      setAvatarMessage(getErrorMessageOrFallback(error, t("avatarUploadError"), t("avatarNetworkError")));
    } finally {
      clearPreparedAvatar(preparedAvatar);
      setIsAvatarSubmitting(false);
    }
  }

  async function removeUserAvatar() {
    if (!user) {
      showInfoDialog(t("profile"), t("loginToSetAvatar"));
      return;
    }

    setIsAvatarSubmitting(true);
    setAvatarMessage("");

    try {
      const responseBody = await profileApi.removeAvatar(
        getAuthHeaders(user),
        t("avatarRemoveError")
      );
      await applyAvatarUpdate(responseBody);
      clearAvatarCache();
      setAvatarMessage(t("avatarRemoved"));
    } catch (error) {
      if ((error as { status?: number }).status === 401) {
        handleUnauthorizedSession();
        return;
      }
      setAvatarMessage(getErrorMessageOrFallback(error, t("avatarRemoveError"), t("avatarNetworkError")));
    } finally {
      setIsAvatarSubmitting(false);
    }
  }

  async function requestPasswordReset() {
    const normalizedEmail = resetEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      setAuthError(t("authLoginValidation"));
      return;
    }

    setIsAuthActionSubmitting(true);
    setAuthError("");
    setAuthMessage("");

    try {
      await authApi.requestPasswordReset(normalizedEmail, getApiHeaders(null), t("authRequestError"));

      setAuthMessage(t("resetPasswordRequestSuccess"));
    } catch (error) {
      setAuthError(getErrorMessageOrFallback(error, t("authRequestError"), t("serverProblemMessage")));
    } finally {
      setIsAuthActionSubmitting(false);
    }
  }

  async function confirmPasswordReset() {
    if (!AuthPasswordPolicy.isValid(newPassword)) {
      setAuthError(t("newPasswordTooShort"));
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      setAuthError(t("authPasswordMismatch"));
      return;
    }

    setIsAuthActionSubmitting(true);
    setAuthError("");
    setAuthMessage("");

    try {
      await authApi.confirmPasswordReset(
        resetToken.trim(),
        newPassword,
        getApiHeaders(null),
        t("authRequestError")
      );

      setAuthMessage(t("resetPasswordSuccess"));
      setResetToken("");
      setNewPassword("");
      setNewPasswordConfirm("");
      setIsNewPasswordVisible(false);
      setIsRepeatPasswordVisible(false);
    } catch (error) {
      setAuthError(getErrorMessageOrFallback(error, t("authRequestError"), t("serverProblemMessage")));
    } finally {
      setIsAuthActionSubmitting(false);
    }
  }

  async function changePassword() {
    if (!user) {
      return;
    }

    if (!AuthPasswordPolicy.isValid(newPassword)) {
      setAuthError(t("newPasswordTooShort"));
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      setAuthError(t("authPasswordMismatch"));
      return;
    }

    setIsAuthActionSubmitting(true);
    setAuthError("");
    setAuthMessage("");

    try {
      await authApi.changePassword(
        currentPassword,
        newPassword,
        getAuthHeaders(user),
        t("changePasswordFailed")
      );

      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
      setIsCurrentPasswordVisible(false);
      setIsNewPasswordVisible(false);
      setIsRepeatPasswordVisible(false);
      setAuthMessage(t("passwordChanged"));
    } catch (error) {
      const status = (error as { status?: number }).status;
      if (status === 401) {
        handleUnauthorizedSession();
        return;
      }
      setAuthError(status === 400
        ? t("currentPasswordInvalid")
        : getErrorMessageOrFallback(error, t("changePasswordFailed"), t("serverProblemMessage")));
    } finally {
      setIsAuthActionSubmitting(false);
    }
  }

  async function logoutAllAuthSessions() {
    if (!user) {
      return;
    }

    showConfirmDialog({
      confirmLabel: t("signOutAllSessions"),
      message: t("confirmSignOutAllSessions"),
      title: t("signOutAllSessions"),
      variant: "destructive",
      onConfirm: () => {
        void authApi.logoutAll(getAuthHeaders(user), t("authRequestError"))
          .then(() => logOut())
          .catch((error) => {
            if ((error as { status?: number }).status === 401) {
              handleUnauthorizedSession();
              return;
            }
            setAuthError(getErrorMessageOrFallback(error, t("authRequestError"), t("serverProblemMessage")));
          });
      }
    });
  }

  async function submitBugReport() {
    const normalizedTitle = bugTitle.trim();
    const normalizedDescription = bugDescription.trim();

    if (!normalizedDescription) {
      setBugFormError(t("bugValidation"));
      return;
    }

    setBugFormError("");
    setIsBugSubmitting(true);

    const bugReportPayload = {
      appVersion: "dev",
      description: normalizedDescription,
      device: getDeviceReportInfo(),
      diagnostics: {
        ...getDiagnosticsSnapshot(),
        apiBaseUrl,
        isLoggedIn: Boolean(user),
        language,
        screen: activeScreen
      },
      language,
      screen: getScreenTitle(activeScreen, editingWorkoutId, t),
      title: normalizedTitle
    };

    const submissionSignature = `${normalizedTitle}\u0000${normalizedDescription}`;
    const idempotencyKey = bugReportSubmissionRef.current?.signature === submissionSignature
      ? bugReportSubmissionRef.current.key
      : `bug-${createCorrelationId()}`;
    bugReportSubmissionRef.current = { key: idempotencyKey, signature: submissionSignature };

    try {
      const result = await bugReportsApi.submit(
        bugReportPayload,
        idempotencyKey,
        getApiHeaders(user),
        t("bugSubmitError")
      );
      setBugSubmittedId(result.id);
      bugReportSubmissionRef.current = null;
      setBugTitle("");
      setBugDescription("");
      setActiveScreen("bugReportSuccess");
    } catch (error) {
      console.error("Bug report submission failed", error);
      addDiagnosticEvent({
        area: "api",
        level: "error",
        message: "Bug report submission failed",
        screen: activeScreen
      });
      setBugFormError(getErrorMessageOrFallback(error, t("bugSubmitError"), t("serverProblemMessage")));
    } finally {
      setIsBugSubmitting(false);
    }
  }

  function logOut() {
    const token = user?.token;

    if (token) {
      authApi.logout(getApiHeaders(user), t("authRequestError")).catch((error) => {
        console.error("Logout request failed", error);
      });
    }

    clearStoredAuthSession().catch((error) => {
      console.error("Failed to clear local auth", error);
    });
    workoutsInitialSync.reset();
    settingsInitialSync.reset();
    favoritesInitialSync.reset();
    workoutSessionsInitialSync.reset();
    achievementsInitialSync.reset();
    accountDataPolicy.reset();
    setFavoriteExercisesSyncStatus("local");
    setPendingCreatorJob(null);
    setCreatorSensitiveDataConsent(false);
    setCreatorPhase("form");
    setRewriteSourceWorkoutId(null);
    setRewriteProposedWorkout(null);
    setRewriteError("");
    setDeleteAccountConfirmation("");
    setDeleteAccountPassword("");
    setDeleteAccountError("");
    setUser(null);
    setAuthError("");
    setAuthMode("login");
    setShowLoginForm(false);
  }

  async function deleteAccountPermanently() {
    if (!user) {
      showInfoDialog(t("profile"), t("deleteAccountLoginRequired"));
      return;
    }

    const accountToDelete = user;
    const accountOwnerId = getAccountStorageOwnerId(accountToDelete.id);

    setIsDeletingAccount(true);
    setDeleteAccountError("");

    try {
      await profileApi.deleteAccount(
        deleteAccountPassword,
        getAuthHeaders(accountToDelete),
        t("deleteAccountError")
      );

      try {
        await removeAccountDataForOwner(accountOwnerId);
      } catch (cleanupError) {
        console.error("Failed to remove deleted account local data", cleanupError);
      }

      try {
        await clearStoredAuthSession();
      } catch (authCleanupError) {
        console.error("Failed to clear auth after account deletion", authCleanupError);
      }

      workoutsInitialSync.reset();
      settingsInitialSync.reset();
      favoritesInitialSync.reset();
      workoutSessionsInitialSync.reset();
      achievementsInitialSync.reset();
      accountDataPolicy.reset();
      setLastAccountUserId(null).catch((error) => {
        console.error("Failed to clear last account after deletion", error);
      });
      setSavedWorkouts(initialWorkouts.map((item) => normalizeSavedWorkoutTextFields(item)));
      setSelectedWorkoutId(initialWorkouts[0]?.id ?? "");
      setWorkoutSort(defaultWorkoutSort);
      setWorkout(createDefaultWorkout());
      setWorkoutSessions([]);
      setActiveWorkoutSessionId(null);
      setFavoriteExercises([]);
      setFavoriteExercisesSyncStatus("local");
      setPendingCreatorJob(null);
      setCreatorProfiles([]);
      setSelectedCreatorProfileId(null);
      setCreatorPhase("form");
      setRewriteSourceWorkoutId(null);
      setRewriteProposedWorkout(null);
      setRewriteError("");
      setUserAchievements([]);
      setAppUsageStats(getDefaultAppUsageStats());
      setAchievementsSyncState({});
      setAvatarMessage("");
      setUser(null);
      setDeleteAccountConfirmation("");
      setDeleteAccountPassword("");
      setDeleteAccountError("");
      setAuthError("");
      setAuthMessage(t("deleteAccountSuccess"));
      setActiveScreen("home");
      showInfoDialog(t("profile"), t("deleteAccountSuccess"));
    } catch (error) {
      const status = (error as { status?: number }).status;
      if (status === 401) {
        setDeleteAccountError(t("sessionExpired"));
        handleUnauthorizedSession();
        return;
      }
      if (status === 403) {
        setDeleteAccountError(t("deleteAccountPasswordInvalid"));
        return;
      }
      setDeleteAccountError(getErrorMessageOrFallback(error, t("deleteAccountError"), t("deleteAccountNetworkError")));
    } finally {
      setIsDeletingAccount(false);
    }
  }

  function openProfile() {
    if (!user) {
      setAuthMode("login");
      setAuthError("");
      setShowLoginForm(true);
    }

    setActiveScreen("profile");
  }

  const areOnlineFeaturesAvailable = systemStatus.kind === "ok";

  function showOnlineFeatureUnavailableDialog() {
    setAppDialog({
      actions: [{ label: t("bugSuccessOk"), variant: "primary" }],
      message: t("onlineFeatureUnavailableCopy"),
      title: t("onlineFeatureUnavailableTitle")
    });
  }

  function showInfoDialog(title: string, message?: string) {
    setAppDialog({
      actions: [{ label: t("bugSuccessOk"), variant: "primary" }],
      message: message || title,
      title
    });
  }

  function showConfirmDialog(options: {
    cancelLabel?: string;
    confirmLabel: string;
    message: string;
    onConfirm: () => void;
    title: string;
    variant?: AppDialogAction["variant"];
  }) {
    setAppDialog({
      actions: [
        { label: options.cancelLabel ?? t("cancel"), variant: "outline" },
        { label: options.confirmLabel, onPress: options.onConfirm, variant: options.variant ?? "primary" }
      ],
      message: options.message,
      title: options.title
    });
  }

  function formatDateTime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return t("empty");
    }

    return date.toLocaleString(language === "pl" ? "pl-PL" : "en-US", {
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  }

  function formatAccountDateTime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return t("empty");
    }

    const pad = (part: number) => String(part).padStart(2, "0");
    return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  function handleBackNavigation() {
    if (activeScreen === "home") {
      return false;
    }

    if (activeScreen === "workoutSession") {
      abandonActiveWorkoutSession();
      return true;
    }

    if (activeScreen === "builder") {
      setActiveScreen(editingWorkoutId ? "workoutDetail" : "home");
      return true;
    }

    if (activeScreen === "workoutDetail") {
      setActiveScreen("workouts");
      return true;
    }

    if (activeScreen === "workoutAiRewrite" || activeScreen === "workoutAiProposal") {
      setActiveScreen("workoutDetail");
      return true;
    }

    if (activeScreen === "forgotPassword" || activeScreen === "resetPassword") {
      setActiveScreen("profile");
      return true;
    }

    if (activeScreen === "achievements") {
      setActiveScreen("profile");
      return true;
    }

    if (activeScreen === "deleteAccount") {
      setDeleteAccountConfirmation("");
      setDeleteAccountPassword("");
      setDeleteAccountError("");
      setActiveScreen("profile");
      return true;
    }

    if (activeScreen === "changePassword" || activeScreen === "activeSessions" || activeScreen === "accountDetails") {
      setActiveScreen("profile");
      return true;
    }

    if (activeScreen === "workoutHistory") {
      setWorkoutHistoryWorkoutIdFilter(null);
      setActiveScreen("workouts");
      return true;
    }

    if (activeScreen === "workoutSessionDetail") {
      setActiveScreen("workoutHistory");
      return true;
    }

    if (activeScreen === "progress") {
      setActiveScreen("workouts");
      return true;
    }

    if (activeScreen === "favoriteExercises" || activeScreen === "aiCredits") {
      setActiveScreen("settings");
      return true;
    }

    if (activeScreen === "exerciseProgress") {
      setActiveScreen("progress");
      return true;
    }

    if (activeScreen === "exerciseDetail") {
      setActiveScreen(exerciseDetailReturnScreen);
      return true;
    }

    if (activeScreen === "workoutCreator") {
      if (creatorPhase !== "form") {
        setCreatorPhase("form");
      } else {
        setActiveScreen("workouts");
      }
      return true;
    }

    if (activeScreen === "workouts" || activeScreen === "settings" || activeScreen === "articleDetail") {
      setActiveScreen("home");
      return true;
    }

    if (activeScreen === "privacy") {
      setActiveScreen(privacyReturnScreen);
      return true;
    }

    if (activeScreen === "terms" || activeScreen === "contact" || activeScreen === "bugReport") {
      setActiveScreen("settings");
      return true;
    }

    if (activeScreen === "bugReportSuccess" || activeScreen === "profile") {
      setActiveScreen("home");
      return true;
    }

    setActiveScreen("home");
    return true;
  }

  function isPanelCollapsed(panelId: string) {
    return collapsedPanels[panelId] ?? false;
  }

  function togglePanel(panelId: string) {
    setCollapsedPanels((current) => ({
      ...current,
      [panelId]: !(current[panelId] ?? false)
    }));
  }

  function getWorkoutNotesPreview(notes: string, maxLength = 86) {
    const normalizedNotes = notes.trim().replace(/\s+/g, " ");

    if (normalizedNotes.length <= maxLength) {
      return normalizedNotes;
    }

    return `${normalizedNotes.slice(0, maxLength).trim()}...`;
  }

  function renderWorkoutSortActions(showAdd = true) {
    return (
      <WorkoutSortActions
        showAdd={showAdd}
        theme={theme}
        onAdd={openWorkoutBuilder}
        onOpenSort={() => setIsWorkoutSortSheetOpen(true)}
      />
    );
  }

  function renderWorkoutSortSheet() {
    return (
      <WorkoutSortSheet
        bottomPadding={bottomSheetBottomPadding}
        isOpen={isWorkoutSortSheetOpen}
        sort={workoutSort}
        t={t}
        theme={theme}
        onChange={setWorkoutSort}
        onClose={() => setIsWorkoutSortSheetOpen(false)}
      />
    );
  }

  function renderWorkoutCreatorButton() {
    return (
      <WorkoutCreatorButton
        isPending={isCreatorJobPending}
        isUserAuthenticated={Boolean(user)}
        showLoginTooltip={showCreatorLoginTooltip}
        t={t}
        theme={theme}
        onOpen={openWorkoutCreator}
      />
    );
  }

  function renderTrainingFactPill() {
    const facts = trainingFacts[language];
    return <TrainingFactPill fact={facts[trainingFactIndex % facts.length]} theme={theme} />;
  }

  function renderSystemStatusCallout() {
    if (activeScreen === "weeklyPlan") {
      setActiveScreen("home");
      return true;
    }
    return (
      <SystemStatusCallout
        isRefreshing={isSystemStatusRefreshing}
        language={language}
        status={systemStatus}
        theme={theme}
        onRefresh={() => refreshSystemStatus(true)}
      />
    );
  }

  function formatSessionDateTime(session: WorkoutSession) {
    const date = new Date(session.startedAt);
    if (!Number.isFinite(date.getTime())) {
      return t("noData");
    }

    return date.toLocaleString(language === "pl" ? "pl-PL" : "en-US", {
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      month: "short",
      year: "numeric"
    });
  }

  function formatSessionTime(value?: string) {
    if (!value) {
      return t("noData");
    }

    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) {
      return t("noData");
    }

    return date.toLocaleTimeString(language === "pl" ? "pl-PL" : "en-US", {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function formatDurationMs(durationMs: number | null) {
    if (!durationMs || durationMs <= 0) {
      return t("noData");
    }

    const totalMinutes = Math.max(1, Math.round(durationMs / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (!hours) {
      return `${totalMinutes} min`;
    }

    return minutes ? `${hours} h ${minutes} min` : `${hours} h`;
  }

  function formatSessionDuration(session: WorkoutSession) {
    return formatDurationMs(getSessionDurationMs(session));
  }

  function formatNumber(value: number | null | undefined, suffix = "") {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      return t("noData");
    }

    const formatted = Number.isInteger(value) ? String(value) : value.toFixed(1).replace(".", ",");
    return suffix ? `${formatted} ${suffix}` : formatted;
  }

  function getSessionStatusLabel(status: WorkoutSessionStatus) {
    return getWorkoutSessionStatusLabel(status, {
      abandoned: t("abandonedStatusLabel"),
      active: t("activeStatusLabel"),
      completed: t("completedStatusLabel"),
      unknown: t("noData")
    });
  }

  function getExecutionModeLabel(mode: WorkoutExecutionMode) {
    return getWorkoutExecutionModeOptions(t).find((item) => item.value === mode)?.label ?? mode;
  }


  function setExerciseFavorite(exerciseId: string, shouldBeFavorite: boolean) {
    if (!findExerciseById(exerciseId)) {
      return;
    }

    setFavoriteExercises((current) =>
      shouldBeFavorite
        ? addFavoriteExercise(current, exerciseId)
        : removeFavoriteExercise(current, exerciseId)
    );
    showInfoDialog(shouldBeFavorite ? t("favoriteExerciseAdded") : t("favoriteExerciseRemoved"));
  }

  function toggleCatalogExerciseFavorite(exerciseId: string) {
    if (!findExerciseById(exerciseId)) {
      return;
    }

    const wasFavorite = isExerciseFavorite(favoriteExercises, exerciseId);
    setFavoriteExercises((current) => toggleFavoriteExercise(current, exerciseId));
    showInfoDialog(wasFavorite ? t("favoriteExerciseRemoved") : t("favoriteExerciseAdded"));
  }

  function formatEntryActual(entry: WorkoutSessionEntry) {
    const values = [
      entry.actualReps ? `${entry.actualReps} ${t("repetitionsSuffix")}` : "",
      entry.actualWeight ? `${entry.actualWeight} kg` : "",
      entry.actualDuration ? entry.actualDuration : "",
      entry.actualCalories ? `${entry.actualCalories} ${t("caloriesSuffix")}` : "",
      entry.actualHeartRate ? `${entry.actualHeartRate} bpm` : ""
    ].filter(Boolean);

    return values.length ? values.join(", ") : t("noData");
  }

  function openWorkoutHistory(workoutId?: string) {
    setWorkoutHistoryWorkoutIdFilter(workoutId ?? null);
    setWorkoutHistoryFilter("all");
    setWorkoutHistorySearch("");
    setActiveScreen("workoutHistory");
  }

  function openWorkoutSessionDetail(sessionId: string) {
    setSelectedWorkoutSessionId(sessionId);
    setActiveScreen("workoutSessionDetail");
  }

  function openExerciseProgress(exerciseKey: string) {
    setSelectedExerciseProgressKey(exerciseKey);
    setActiveScreen("exerciseProgress");
  }

  function openExerciseDetail(step: WorkoutStep) {
    setSelectedExerciseDetailStep(step);
    setExerciseDetailMuscleSide("front");
    setExerciseDetailCollapsedPanels({});
    setExerciseDetailReturnScreen(activeScreen);
    setActiveScreen("exerciseDetail");
  }

  function renderActiveWorkoutSessionCard() {
    return (
      <ActiveWorkoutSessionCard
        session={activeWorkoutSession}
        t={t}
        theme={theme}
        onAbandon={abandonActiveWorkoutSession}
        onContinue={continueActiveWorkoutSession}
      />
    );
  }

  function renderWeeklyPlanHomeCard() {
    return (
      <WeeklyPlanHomeCard
        language={language}
        savedWorkoutCount={activeWorkouts.length}
        summary={weeklyPlanSummary}
        t={t}
        theme={theme}
        onOpenPlan={() => setActiveScreen("weeklyPlan")}
        onOpenWorkout={openWorkoutDetail}
      />
    );
  }

  function renderWeeklyPlan() {
    return (
      <WeeklyPlanScreen
        language={language}
        savedWorkouts={activeWorkouts}
        summary={weeklyPlanSummary}
        t={t}
        theme={theme}
        onChangePlan={setWeeklyPlan}
        onOpenWorkout={openWorkoutDetail}
      />
    );
  }

  function renderHome() {
    const authPanel = !isAuthPanelDismissed ? (
      <LoginPanel
        authError={authError}
        authMode={authMode}
        displayName={displayName}
        email={email}
        isAuthenticated={Boolean(user)}
        isAuthSubmitting={isAuthSubmitting}
        logIn={logIn}
        password={password}
        passwordConfirm={passwordConfirm}
        register={register}
        setAuthError={setAuthError}
        setAuthMode={setAuthMode}
        setDisplayName={setDisplayName}
        setEmail={setEmail}
        setPassword={setPassword}
        setPasswordConfirm={setPasswordConfirm}
        setShowLoginForm={setShowLoginForm}
        showLoginForm={showLoginForm}
        t={t}
        theme={theme}
        onDismiss={() => {
          setIsAuthPanelDismissed(true);
          setShowLoginForm(false);
        }}
        onForgotPassword={() => {
          setAuthError("");
          setAuthMessage("");
          setResetEmail(email);
          setActiveScreen("forgotPassword");
        }}
      />
    ) : null;

    return (
      <HomeScreen
        activeWeeklyWorkouts={activeWeeklyWorkouts}
        activeSessionCard={renderActiveWorkoutSessionCard()}
        authPanel={authPanel}
        collapsedPanels={collapsedPanels}
        language={language}
        savedWorkouts={savedWorkouts}
        systemStatusCallout={renderSystemStatusCallout()}
        t={t}
        theme={theme}
        trainingFactPill={renderTrainingFactPill()}
        weeklyPlanCard={renderWeeklyPlanHomeCard()}
        workoutCreatorButton={renderWorkoutCreatorButton()}
        workoutSortActions={renderWorkoutSortActions(false)}
        onOpenArticle={(articleId) => {
          setSelectedArticleId(articleId);
          setActiveScreen("articleDetail");
        }}
        onOpenWorkout={openWorkoutDetail}
        onTogglePanel={togglePanel}
      />
    );
  }

  function renderBuilder() {
    return (
      <>
      <WorkoutBuilderWizardScreen
          confirmDelete={(title, message, onConfirm) => showConfirmDialog({
            confirmLabel: t("delete"),
            message,
            onConfirm,
            title
          })}
          defaultSetCount={defaultSetCount}
          defaultStageType={defaultStageType}
          defaultWeight={defaultWeight}
          favoriteExerciseIds={validFavoriteExerciseIds}
          language={language}
          moveStep={moveStep}
          onSaveWorkout={saveWorkout}
          onToggleFavoriteExercise={toggleCatalogExerciseFavorite}
          removeStep={removeStep}
          t={t}
          theme={theme}
          updateStep={updateStep}
          workout={workout}
          setWorkout={setWorkout}
        />
      </>
    );
  }

  function renderArticleDetail() {
    const article = articles.find((item) => item.id === selectedArticleId) ?? articles[0];

    if (!article) {
      return null;
    }

    return (
      <ArticleDetailScreen
        article={article}
        language={language}
        theme={theme}
      />
    );
  }

  function renderWorkouts() {
    return (
      <WorkoutsScreen
        activeSessionCard={renderActiveWorkoutSessionCard()}
        collapsed={isPanelCollapsed("workouts-list")}
        creatorButton={renderWorkoutCreatorButton()}
        filteredWorkouts={filteredWorkouts}
        includeArchived={includeArchivedWorkouts}
        search={search}
        sortActions={renderWorkoutSortActions()}
        t={t}
        theme={theme}
        onChangeSearch={setSearch}
        onOpenHistory={() => openWorkoutHistory()}
        onOpenProgress={() => setActiveScreen("progress")}
        onOpenWorkout={openWorkoutDetail}
        onToggleArchived={() => setIncludeArchivedWorkouts((current) => !current)}
        onToggleList={() => togglePanel("workouts-list")}
      />
    );
  }

  function renderWorkoutSessionDetail() {
    const historyTableMinWidth = isLandscape
      ? Math.max(windowSize.width - insets.left - insets.right - 44, 552)
      : undefined;

    return (
      <WorkoutSessionDetailScreen
        formatNumber={formatNumber}
        formatSessionDateTime={formatSessionDateTime}
        formatSessionDuration={formatSessionDuration}
        formatSessionEntryTitle={formatSessionEntryTitle}
        formatSessionTime={formatSessionTime}
        getSessionEntryIterationLabel={getSessionEntryIterationLabel}
        historyTableMinWidth={historyTableMinWidth}
        session={selectedWorkoutSession}
        t={t}
        theme={theme}
        onDeleteSession={deleteWorkoutHistoryEntry}
      />
    );
  }

  function renderExerciseDetailScreen() {
    return (
      <ExerciseDetailScreen
        collapsedPanels={exerciseDetailCollapsedPanels}
        formatEntryActual={formatEntryActual}
        formatNumber={formatNumber}
        language={language}
        muscleSide={exerciseDetailMuscleSide}
        step={selectedExerciseDetailStep}
        t={t}
        theme={theme}
        visibleWorkoutSessions={visibleWorkoutSessions}
        onChangeCollapsedPanels={setExerciseDetailCollapsedPanels}
        onChangeMuscleSide={setExerciseDetailMuscleSide}
      />
    );
  }


  function renderFavoriteExercises() {
    return (
      <FavoriteExercisesScreen
        favoriteExercises={favoriteExercises}
        language={language}
        search={favoriteExercisesSearch}
        syncStatus={favoriteExercisesSyncStatus}
        t={t}
        theme={theme}
        onBack={() => setActiveScreen("settings")}
        onChangeSearch={setFavoriteExercisesSearch}
        onSetFavorite={setExerciseFavorite}
      />
    );
  }

  function renderTerms() {
    return (
      <TermsScreen
        t={t}
        theme={theme}
        onOpenInfo={() => {
          setActiveScreen("settings");
          setTimeout(() => mainScrollRef.current?.scrollToEnd({ animated: true }), 150);
        }}
      />
    );
  }

  function renderPrivacy() {
    return (
      <PrivacyScreen
        apiBaseUrl={apiBaseUrl}
        language={language}
        theme={theme}
      />
    );
  }

  function renderContact() {
    return (
      <ContactScreen
        t={t}
        theme={theme}
        onBack={() => setActiveScreen("settings")}
        onOpenBugReport={() => setActiveScreen("bugReport")}
        onShowInfo={showInfoDialog}
      />
    );
  }

  function renderBugReport() {
    return (
      <BugReportScreen
        description={bugDescription}
        error={bugFormError}
        isSubmitting={isBugSubmitting}
        t={t}
        theme={theme}
        title={bugTitle}
        onBack={() => setActiveScreen("settings")}
        onChangeDescription={setBugDescription}
        onChangeTitle={setBugTitle}
        onSubmit={() => void submitBugReport()}
      />
    );
  }

  function renderBugReportSuccess() {
    return (
      <BugReportSuccessScreen
        reportId={bugSubmittedId}
        t={t}
        theme={theme}
        onDone={() => setActiveScreen("home")}
      />
    );
  }

  function renderProfile() {
    if (!user) {
      return (
        <View style={styles.loginScreenContent}>
          <LoginPanel
            authError={authError}
            authMode={authMode}
            displayName={displayName}
            email={email}
            isAuthenticated={Boolean(user)}
            isAuthSubmitting={isAuthSubmitting}
            logIn={logIn}
            password={password}
            passwordConfirm={passwordConfirm}
            register={register}
            setAuthError={setAuthError}
            setAuthMode={setAuthMode}
            setDisplayName={setDisplayName}
            setEmail={setEmail}
            setPassword={setPassword}
            setPasswordConfirm={setPasswordConfirm}
            setShowLoginForm={setShowLoginForm}
            showLoginForm={showLoginForm}
            t={t}
            theme={theme}
            onDismiss={() => setActiveScreen("home")}
            onForgotPassword={() => {
              setAuthError("");
              setAuthMessage("");
              setResetEmail(email);
              setActiveScreen("forgotPassword");
            }}
          />
        </View>
      );
    }

    const unlockedCount = unlockedAchievementProgress.length;
    const totalCount = achievementProgress.length;

    return (
      <ProfileScreen
        achievementPercent={totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0}
        avatarMessage={avatarMessage}
        avatarMessageIsSuccess={avatarMessage === t("avatarUpdated") || avatarMessage === t("avatarRemoved")}
        avatarSource={userAvatarSource}
        canRemoveAvatar={Boolean(user.avatarUrl)}
        displayEmail={getProfileDisplayEmail(user)}
        displayName={getProfileDisplayName(user, t("profileUser"))}
        isAvatarSubmitting={isAvatarSubmitting}
        latestAchievementTitle={latestUnlockedAchievement?.definition.title[language]}
        onAvatarLoadError={handleAvatarImageLoadError}
        t={t}
        theme={theme}
        totalAchievements={totalCount}
        unlockedAchievements={unlockedCount}
        onChangeAvatar={changeUserAvatar}
        onRemoveAvatar={removeUserAvatar}
        onOpenAchievements={() => setActiveScreen("achievements")}
        onOpenCredits={() => {
          if (!areOnlineFeaturesAvailable) {
            showOnlineFeatureUnavailableDialog();
            return;
          }

          setActiveScreen("aiCredits");
          void fetchAiCredits(user);
        }}
        onOpenChangePassword={() => {
          setAuthError("");
          setAuthMessage("");
          setCurrentPassword("");
          setNewPassword("");
          setNewPasswordConfirm("");
          setIsCurrentPasswordVisible(false);
          setIsNewPasswordVisible(false);
          setIsRepeatPasswordVisible(false);
          setActiveScreen("changePassword");
        }}
        onOpenActiveSessions={() => {
          setAuthError("");
          setAuthMessage("");
          setActiveScreen("activeSessions");
        }}
        onOpenBugReport={() => setActiveScreen("bugReport")}
        onOpenAccountDetails={() => setActiveScreen("accountDetails")}
        onDeleteAccount={() => {
          setDeleteAccountConfirmation("");
          setDeleteAccountPassword("");
          setDeleteAccountError("");
          setActiveScreen("deleteAccount");
        }}
        onLogout={logOut}
      />
    );
  }

  function renderAccountDetails() {
    if (!user) {
      return renderProfile();
    }

    const accountRows = buildProfileAccountDetails(user, {
      accountCreatedOn: t("accountCreatedOn"),
      accountEmail: t("accountEmail"),
      accountId: t("accountId"),
      accountName: t("accountName"),
      defaultUserName: t("defaultUserName")
    }, formatAccountDateTime);

    return <AccountDetailsScreen rows={accountRows} t={t} theme={theme} />;
  }

  function renderDeleteAccount() {
    if (!user) {
      return renderProfile();
    }

    const confirmationPhrase = getDeleteAccountConfirmationPhrase(language);
    const canDelete = isDeleteAccountConfirmationValid(deleteAccountConfirmation, language) && deleteAccountPassword.length > 0;

    return (
      <DeleteAccountScreen
        canDelete={canDelete}
        confirmation={deleteAccountConfirmation}
        confirmationPhrase={confirmationPhrase}
        password={deleteAccountPassword}
        error={deleteAccountError}
        isDeleting={isDeletingAccount}
        t={t}
        theme={theme}
        onCancel={() => {
          setDeleteAccountConfirmation("");
          setDeleteAccountPassword("");
          setDeleteAccountError("");
          setActiveScreen("profile");
        }}
        onChangeConfirmation={setDeleteAccountConfirmation}
        onChangePassword={setDeleteAccountPassword}
        onDelete={deleteAccountPermanently}
      />
    );
  }

  function renderForgotPassword() {
    return (
      <ForgotPasswordScreen
        authError={authError}
        authMessage={authMessage}
        isNewPasswordVisible={isNewPasswordVisible}
        isRepeatPasswordVisible={isRepeatPasswordVisible}
        isSubmitting={isAuthActionSubmitting}
        newPassword={newPassword}
        newPasswordConfirm={newPasswordConfirm}
        resetEmail={resetEmail}
        resetToken={resetToken}
        setIsNewPasswordVisible={setIsNewPasswordVisible}
        setIsRepeatPasswordVisible={setIsRepeatPasswordVisible}
        setNewPassword={setNewPassword}
        setNewPasswordConfirm={setNewPasswordConfirm}
        setResetEmail={setResetEmail}
        setResetToken={setResetToken}
        t={t}
        theme={theme}
        onBack={() => setActiveScreen("profile")}
        onConfirm={() => void confirmPasswordReset()}
        onRequest={() => void requestPasswordReset()}
      />
    );
  }

  function renderChangePassword() {
    return (
      <ChangePasswordScreen
        authError={authError}
        authMessage={authMessage}
        currentPassword={currentPassword}
        isCurrentPasswordVisible={isCurrentPasswordVisible}
        isNewPasswordVisible={isNewPasswordVisible}
        isRepeatPasswordVisible={isRepeatPasswordVisible}
        isSubmitting={isAuthActionSubmitting}
        newPassword={newPassword}
        newPasswordConfirm={newPasswordConfirm}
        setCurrentPassword={setCurrentPassword}
        setIsCurrentPasswordVisible={setIsCurrentPasswordVisible}
        setIsNewPasswordVisible={setIsNewPasswordVisible}
        setIsRepeatPasswordVisible={setIsRepeatPasswordVisible}
        setNewPassword={setNewPassword}
        setNewPasswordConfirm={setNewPasswordConfirm}
        t={t}
        theme={theme}
        onBack={() => setActiveScreen("profile")}
        onSave={() => void changePassword()}
      />
    );
  }

  function renderActiveSessions() {
    return (
      <ActiveSessionsScreen
        error={authError}
        fallbackDeviceName={getAuthDeviceName()}
        formatDateTime={formatDateTime}
        message={authMessage}
        sessions={activeAuthSessions}
        t={t}
        theme={theme}
        onBack={() => setActiveScreen("profile")}
        onLogoutAll={logoutAllAuthSessions}
        onRevoke={(sessionId) => void revokeAuthSession(sessionId)}
      />
    );
  }

  function closeSettingsSheet() {
    setActiveSettingsSheet(null);
  }


  function formatSessionEntryTitle(entry: WorkoutSessionEntry) {
    if (entry.exerciseName) {
      return getExerciseDisplayName(entry.exerciseName, language);
    }

    return entry.type === "rest" ? t("stageRest") : t("elementWithoutExercise");
  }

  function getSessionEntryIterationLabel(entry: WorkoutSessionEntry) {
    const iteration = Number.isFinite(entry.setIteration) && entry.setIteration > 0
      ? entry.setIteration
      : entry.seriesIndex + 1;
    return String(iteration || 1);
  }

  function renderWorkoutSession() {
    return (
      <WorkoutSessionScreen
        abandonActiveWorkoutSession={abandonActiveWorkoutSession}
        activeWorkoutSession={activeWorkoutSession}
        activeWorkoutSessionId={activeWorkoutSessionId}
        formatNumber={formatNumber}
        formatSessionEntryTitle={formatSessionEntryTitle}
        getSessionEntryIterationLabel={getSessionEntryIterationLabel}
        insets={insets}
        isLandscape={isLandscape}
        isPostWorkoutFillMode={isPostWorkoutFillMode}
        isReadOnlyWorkoutPanelCollapsed={isReadOnlyWorkoutPanelCollapsed}
        isWorkoutSessionEntryFillRequired={isWorkoutSessionEntryFillRequired}
        language={language}
        openExerciseDetail={openExerciseDetail}
        requestCreateWorkoutSessionSuperset={requestCreateWorkoutSessionSuperset}
        requestFinishActiveWorkoutSession={requestFinishActiveWorkoutSession}
        requestRemoveWorkoutSessionSuperset={requestRemoveWorkoutSessionSuperset}
        sessionEntryIndex={sessionEntryIndex}
        setIsPostWorkoutFillMode={setIsPostWorkoutFillMode}
        setSelectedExerciseMuscleStep={setSelectedExerciseMuscleStep}
        setSessionEntryIndex={setSessionEntryIndex}
        setWorkoutSessions={setWorkoutSessions}
        showRestTimer={showRestTimer}
        t={t}
        theme={theme}
        toggleReadOnlyWorkoutPanel={toggleReadOnlyWorkoutPanel}
        toggleWorkoutSessionSupersetRound={activeWorkoutController.toggleSupersetRound}
        updateWorkoutSessionEntry={updateWorkoutSessionEntry}
        updateWorkoutSessionSupersetRound={updateWorkoutSessionSupersetRound}
        visibleWorkoutSessions={visibleWorkoutSessions}
        windowSize={windowSize}
      />
    );
  }

  function renderAppDialog() {
    return (
      <AppDialog
        dialog={appDialog}
        theme={theme}
        onClose={(action) => {
          setAppDialog(null);
          action?.onPress?.();
        }}
      />
    );
  }

  if (isAppLoading) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
        <StatusBar
          backgroundColor={theme.background}
          barStyle={theme.statusBar === "dark" ? "dark-content" : "light-content"}
          translucent={false}
        />
        <Animated.View style={[styles.splashScreen, { opacity: splashOpacity }]}>
          <GymminLogo color={theme.primary} height={68} width={304} />
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
        <StatusBar
          backgroundColor={theme.card}
          barStyle={theme.statusBar === "dark" ? "dark-content" : "light-content"}
          translucent={false}
        />
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.card,
              borderBottomColor: theme.border,
              paddingLeft: 20 + insets.left,
              paddingRight: 20 + insets.right,
              paddingTop: Math.max(insets.top, 20) + 6
            }
          ]}
        >
          <View style={styles.headerTitleBlock}>
            {shouldShowHeaderBackButton ? (
              <Pressable
                accessibilityLabel={t("back")}
                accessibilityRole="button"
                hitSlop={8}
                style={[styles.headerBackButton, { borderColor: theme.border, backgroundColor: theme.card }]}
                onPress={() => {
                  handleBackNavigation();
                }}
              >
                <Ionicons name="return-up-back-outline" size={23} color={theme.primary} />
              </Pressable>
            ) : (
              <GymminMark color={theme.primary} height={34} width={40} />
            )}
            {shouldShowWorkoutHeaderTime && activeWorkoutSession ? (
              <View style={styles.headerWorkoutTitleRow}>
                <Text numberOfLines={1} style={[styles.headerTitle, styles.headerWorkoutTitle, { color: theme.text }]}>
                  {screenTitle}
                </Text>
                <View style={[styles.headerWorkoutTitleSeparator, { backgroundColor: theme.border }]} />
                <WorkoutHeaderElapsedTime startedAt={activeWorkoutSession.startedAt} theme={theme} />
              </View>
            ) : (
              <Text numberOfLines={1} style={[styles.headerTitle, { color: theme.text }]}>
                {screenTitle}
              </Text>
            )}
          </View>
          {shouldShowProfileHeaderButton ? (
            <Pressable
              accessibilityLabel="Przejdź do profilu"
              accessibilityRole="button"
              style={[styles.profileHeaderButton, { backgroundColor: theme.secondaryBand }]}
              onPress={openProfile}
            >
              {userAvatarSource ? (
                <Image
                  resizeMode="cover"
                  source={userAvatarSource}
                  style={styles.profileHeaderAvatarImage}
                  onError={handleAvatarImageLoadError}
                />
              ) : (
                <Ionicons name={user ? "person" : "person-outline"} size={24} color={theme.primary} />
              )}
            </Pressable>
          ) : null}
        </View>

        {achievementToast ? (
          <View
            accessibilityLiveRegion="polite"
            style={[
              styles.achievementToast,
              {
                backgroundColor: theme.card,
                borderColor: theme.primary,
                shadowColor: "#000000"
              }
            ]}
          >
            <View style={[styles.achievementToastIcon, { backgroundColor: theme.secondaryBand }]}>
              <Ionicons name="trophy-outline" size={18} color={theme.primary} />
            </View>
            <View style={styles.achievementToastCopy}>
              <Text style={[styles.achievementToastTitle, { color: theme.primary }]}>
                {t("achievementUnlockedToast")}
              </Text>
              <Text style={[styles.achievementToastText, { color: theme.text }]} numberOfLines={2}>
                {achievementToast.title}
                {achievementToast.extraCount > 0
                  ? ` ${t("achievementMoreUnlocked").replace("{count}", String(achievementToast.extraCount))}`
                  : ""}
              </Text>
            </View>
          </View>
        ) : null}

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? Math.max(insets.top, 20) + 64 : 0}
          style={[styles.keyboardAvoidingContent, { marginBottom: scrollViewportBottomMargin }]}
        >
          <ScrollView
            ref={mainScrollRef}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "none"}
            contentContainerStyle={[
              styles.content,
              {
                paddingLeft: 20 + insets.left,
                paddingRight: 20 + insets.right,
                paddingBottom:
                  activeScreen === "workoutSession"
                      ? bottomNavHeight + (isKeyboardVisible ? 260 : 28) - scrollViewportBottomMargin
                      : bottomNavHeight + 28 - scrollViewportBottomMargin
              }
            ]}
          >
            {activeScreen === "home" && renderHome()}
            {activeScreen === "workouts" && renderWorkouts()}
            {activeScreen === "settings" && (
              <SettingsScreen
                defaultSetCount={defaultSetCount}
                defaultStageTypeLabel={
                  getStageTypeOptions(t).find((option) => option.value === defaultStageType)?.label ?? t("toChoose")
                }
                defaultWeight={defaultWeight}
                defaultWorkoutExecutionModeLabel={
                  getWorkoutExecutionModeOptions(t).find((option) => option.value === defaultWorkoutExecutionMode)?.label
                    ?? t("executionGuided")
                }
                favoriteExerciseCount={getFavoriteCatalogExercises(favoriteExercises).length}
                isDarkMode={isDarkMode}
                isPanelCollapsed={isPanelCollapsed}
                language={language}
                reminderDescriptionPlaceholder={getDefaultWorkoutReminderSettings(language).description ?? ""}
                reminderMessagePlaceholder={getDefaultWorkoutReminderSettings(language).message}
                reminderSchedulingStatus={reminderSchedulingStatus}
                showRestTimer={showRestTimer}
                t={t}
                theme={theme}
                workoutReminders={workoutReminders}
                onOpenContact={() => setActiveScreen("contact")}
                onOpenFavoriteExercises={() => setActiveScreen("favoriteExercises")}
                onOpenReminderDay={openWorkoutReminderDayEditor}
                onOpenReportBug={() => setActiveScreen("bugReport")}
                onOpenPrivacy={() => {
                  setPrivacyReturnScreen("settings");
                  setActiveScreen("privacy");
                }}
                onOpenSettingsSheet={(sheet) => {
                  if (sheet === "language") {
                    setPendingLanguage(language);
                  } else if (sheet === "defaultSetCount") {
                    setPendingDefaultSetCount(defaultSetCount);
                  } else if (sheet === "defaultWeight") {
                    setPendingDefaultWeight(defaultWeight);
                  } else if (sheet === "defaultStageType") {
                    setPendingDefaultStageType(defaultStageType);
                  } else if (sheet === "defaultWorkoutExecutionMode") {
                    setPendingDefaultWorkoutExecutionMode(defaultWorkoutExecutionMode);
                  }
                  setActiveSettingsSheet(sheet);
                }}
                onOpenTerms={() => setActiveScreen("terms")}
                onReminderDescriptionChange={updateWorkoutReminderDescription}
                onReminderMessageChange={updateWorkoutReminderMessage}
                onTogglePanel={togglePanel}
                onToggleReminderDay={(dayNumber) => {
                  void toggleWorkoutReminderDay(dayNumber);
                }}
                onToggleReminderOnlyIfNoWorkoutToday={() => updateWorkoutReminderSettings({
                  ...workoutReminders,
                  onlyIfNoWorkoutToday: !workoutReminders.onlyIfNoWorkoutToday
                })}
                onToggleReminders={() => {
                  void toggleWorkoutRemindersEnabled();
                }}
                onToggleRestTimer={() => setShowRestTimer((current) => !current)}
                onToggleTheme={() => setThemeName(isDarkMode ? "light" : "dark")}
              />
            )}
            {activeScreen === "articleDetail" && renderArticleDetail()}
            {activeScreen === "builder" && renderBuilder()}
            {activeScreen === "workoutCreator" && (
              user ? (
                <WorkoutCreatorScreen
                  areOnlineFeaturesAvailable={areOnlineFeaturesAvailable}
                  collapsedSections={creatorCollapsedSections}
                  creditBalance={aiCreditBalance}
                  draft={creatorDraft}
                  hasSensitiveDataConsent={creatorSensitiveDataConsent}
                  formatImportedWorkoutCount={formatCreatorImportedWorkoutCount}
                  importedWorkoutCount={creatorImportedWorkoutCount}
                  isJobPending={isCreatorJobPending}
                  isSubmitting={isCreatorSubmitting}
                  language={language}
                  phase={creatorPhase}
                  planText={creatorPlanText}
                  profileName={creatorProfileName}
                  profiles={creatorProfiles}
                  selectedProfileId={selectedCreatorProfileId}
                  submitError={creatorSubmitError}
                  t={t}
                  theme={theme}
                  onDraftFieldChange={(fieldId, value) => {
                    setCreatorDraft((current) => ({ ...current, [fieldId]: value }));
                  }}
                  onLoadProfile={loadCreatorProfile}
                  onOpenPrivacy={() => {
                    setPrivacyReturnScreen("workoutCreator");
                    setActiveScreen("privacy");
                  }}
                  onOpenCredits={() => setActiveScreen("aiCredits")}
                  onOpenWorkouts={() => setActiveScreen("workouts")}
                  onProfileNameChange={setCreatorProfileName}
                  onReturnHome={returnToHomeFromCreator}
                  onSaveProfileAndSubmit={saveCreatorProfileAndSubmit}
                  onSendWithoutSaving={() => void finishWorkoutCreatorRequest()}
                  onShowOnlineUnavailable={showOnlineFeatureUnavailableDialog}
                  onSubmit={submitWorkoutCreatorForm}
                  onToggleSensitiveDataConsent={() => {
                    setCreatorSensitiveDataConsent((current) => !current);
                    setCreatorSubmitError("");
                  }}
                  onToggleSection={toggleCreatorSection}
                  onUpdateProfileAndSubmit={updateCreatorProfileAndSubmit}
                />
              ) : renderProfile()
            )}
            {activeScreen === "workoutAiRewrite" && (
              <WorkoutAiRewriteScreen
                areOnlineFeaturesAvailable={areOnlineFeaturesAvailable}
                balance={aiCreditBalance.balance}
                error={rewriteError}
                instruction={rewriteInstruction}
                isJobPending={isRewriteJobPending}
                isSubmitting={isRewriteSubmitting}
                rewriteCost={aiCreditBalance.rewriteCost}
                sourceWorkout={rewriteSourceWorkout}
                t={t}
                theme={theme}
                onInstructionChange={(value) => {
                  setRewriteInstruction(value);
                  if (rewriteError) {
                    setRewriteError("");
                  }
                }}
                onOpenCredits={() => setActiveScreen("aiCredits")}
                onShowOnlineUnavailable={showOnlineFeatureUnavailableDialog}
                onSubmit={() => void submitWorkoutRewrite()}
              />
            )}
            {activeScreen === "workoutAiProposal" && (
              <WorkoutAiProposalScreen
                language={language}
                proposedWorkout={rewriteProposedWorkout}
                sourceWorkout={rewriteSourceWorkout}
                t={t}
                theme={theme}
                onBackToWorkout={() => setActiveScreen("workoutDetail")}
                onDiscard={() => {
                  setRewriteProposedWorkout(null);
                  setPendingCreatorJob(null);
                  setActiveScreen("workoutDetail");
                }}
                onOpenExercise={openExerciseDetail}
                onReplaceCurrent={replaceWorkoutWithRewriteProposal}
                onSaveAsNew={saveRewriteProposalAsNew}
              />
            )}
            {activeScreen === "workoutDetail" && (
              <WorkoutDetailScreen
                getExecutionModeLabel={getExecutionModeLabel}
                getSessionStatusLabel={getSessionStatusLabel}
                isPanelCollapsed={isReadOnlyWorkoutPanelCollapsed}
                language={language}
                sessions={selectedWorkoutSessions}
                t={t}
                theme={theme}
                workout={selectedWorkout}
                onDeleteWorkout={deleteWorkout}
                onEditWorkout={openWorkoutEditor}
                onOpenExercise={openExerciseDetail}
                onOpenHistory={openWorkoutHistory}
                onOpenSession={openWorkoutSessionDetail}
                onSetArchived={updateWorkoutArchiveState}
                onStartWorkout={() => startSelectedWorkoutSession()}
                onTogglePanel={toggleReadOnlyWorkoutPanel}
              />
            )}
            {activeScreen === "workoutSession" && renderWorkoutSession()}
            {activeScreen === "weeklyPlan" && renderWeeklyPlan()}
            {activeScreen === "workoutHistory" && (
              <WorkoutHistoryScreen
                filter={workoutHistoryFilter}
                formatDurationMs={formatDurationMs}
                formatNumber={formatNumber}
                formatSessionDateTime={formatSessionDateTime}
                formatSessionDuration={formatSessionDuration}
                getExecutionModeLabel={getExecutionModeLabel}
                getSessionStatusLabel={getSessionStatusLabel}
                search={workoutHistorySearch}
                sessions={filteredWorkoutHistorySessions}
                summary={workoutHistorySummary}
                t={t}
                theme={theme}
                onDeleteSession={deleteWorkoutHistoryEntry}
                onFilterChange={setWorkoutHistoryFilter}
                onOpenSession={openWorkoutSessionDetail}
                onSearchChange={setWorkoutHistorySearch}
              />
            )}
            {activeScreen === "workoutSessionDetail" && renderWorkoutSessionDetail()}
            {activeScreen === "progress" && (
              <ProgressScreen
                language={language}
                progressItems={exerciseProgressItems}
                sessions={visibleWorkoutSessions}
                t={t}
                theme={theme}
                onOpenExercise={openExerciseProgress}
              />
            )}
            {activeScreen === "exerciseDetail" && renderExerciseDetailScreen()}
            {activeScreen === "exerciseProgress" && (
              <ExerciseProgressScreen
                formatSessionDateTime={formatSessionDateTime}
                groups={selectedExerciseProgressHistoryGroups}
                language={language}
                summary={selectedExerciseProgressSummary}
                t={t}
                theme={theme}
              />
            )}
            {activeScreen === "favoriteExercises" && renderFavoriteExercises()}
            {activeScreen === "aiCredits" && (
              user ? (
                <AiCreditsScreen
                  balance={aiCreditBalance}
                  canRestorePurchases={canRestoreAiCreditPurchases}
                  error={aiCreditsError}
                  isDevBuild={typeof __DEV__ !== "undefined" && __DEV__}
                  isLoading={isAiCreditsLoading}
                  isPurchaseLoading={isAiCreditPurchaseLoading}
                  language={language}
                  packs={aiCreditPacks}
                  purchaseMessage={aiCreditsPurchaseMessage}
                  t={t}
                  theme={theme}
                  transactions={aiCreditTransactions}
                  onBuyPack={(pack) => {
                    void buyAiCreditPack(pack);
                  }}
                  onGrantDevCredits={() => {
                    void grantDevAiCredits();
                  }}
                  onRefresh={() => {
                    void fetchAiCredits(user);
                  }}
                  onRestorePurchases={() => {
                    void restorePendingAiCreditPurchases();
                  }}
                />
              ) : renderProfile()
            )}
            {activeScreen === "achievements" && (
              <AchievementsScreen
                formatDateTime={formatDateTime}
                language={language}
                progress={achievementProgress}
                t={t}
                theme={theme}
              />
            )}
            {activeScreen === "terms" && renderTerms()}
            {activeScreen === "privacy" && renderPrivacy()}
            {activeScreen === "contact" && renderContact()}
            {activeScreen === "bugReport" && renderBugReport()}
            {activeScreen === "bugReportSuccess" && renderBugReportSuccess()}
            {activeScreen === "profile" && renderProfile()}
            {activeScreen === "accountDetails" && renderAccountDetails()}
            {activeScreen === "deleteAccount" && renderDeleteAccount()}
            {activeScreen === "forgotPassword" && renderForgotPassword()}
            {activeScreen === "changePassword" && renderChangePassword()}
            {activeScreen === "activeSessions" && renderActiveSessions()}
          </ScrollView>
        </KeyboardAvoidingView>

        <View
          style={[
            styles.bottomNav,
            {
              backgroundColor: theme.card,
              borderTopColor: theme.border,
              paddingBottom: bottomInset,
              paddingLeft: 10 + insets.left,
              paddingRight: 10 + insets.right,
              paddingTop: isLandscape ? 4 : 7
            }
          ]}
        >
          {navItems.map((item) => {
            const selected =
              activeScreen === item.key ||
              (item.key === "home" && activeScreen === "articleDetail") ||
              (item.key === "home" && activeScreen === "weeklyPlan") ||
              (item.key === "workouts" &&
                (activeScreen === "workoutDetail" ||
                  activeScreen === "workoutCreator" ||
                  activeScreen === "workoutAiRewrite" ||
                  activeScreen === "workoutAiProposal" ||
                  activeScreen === "workoutHistory" ||
                  activeScreen === "workoutSessionDetail" ||
                  activeScreen === "progress" ||
                  activeScreen === "exerciseDetail" ||
                  activeScreen === "exerciseProgress")) ||
              (item.key === "settings" &&
                (activeScreen === "terms" ||
                  activeScreen === "privacy" ||
                  activeScreen === "contact" ||
                  activeScreen === "bugReport" ||
                  activeScreen === "favoriteExercises"));

            return (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                style={[styles.navButton, isLandscape ? { minHeight: 44 } : null]}
                onPress={() => setActiveScreen(item.key)}
              >
                <Ionicons
                  name={item.icon}
                  size={22}
                  color={selected ? theme.primary : theme.muted}
                />
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.78}
                  numberOfLines={1}
                  style={[styles.navLabel, { color: selected ? theme.primary : theme.muted }]}
                >
                  {item.key === "home"
                    ? t("home")
                    : item.key === "workouts"
                      ? t("workouts")
                      : t("settings")}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Modal
          animationType="fade"
          transparent
          visible={Boolean(user && !user.emailVerified && isEmailVerificationOpen)}
          onRequestClose={() => setIsEmailVerificationOpen(false)}
        >
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 }}>
            <View style={{ backgroundColor: theme.card, borderColor: theme.border, borderRadius: 20, borderWidth: 1, padding: 22, gap: 14 }}>
              <Text style={{ color: theme.text, fontSize: 22, fontWeight: "800" }}>
                {language === "pl" ? "Potwierdź adres email" : "Verify your email"}
              </Text>
              <Text style={{ color: theme.muted, fontSize: 15, lineHeight: 21 }}>
                {language === "pl"
                  ? `Wpisz sześciocyfrowy kod wysłany na ${user?.email ?? ""}. Weryfikacja jest wymagana przed użyciem funkcji AI.`
                  : `Enter the six-digit code sent to ${user?.email ?? ""}. Verification is required before using AI features.`}
              </Text>
              <Input style={{ borderColor: theme.border }}>
                <InputField
                  accessibilityLabel={language === "pl" ? "Kod weryfikacyjny" : "Verification code"}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="000000"
                  value={emailVerificationCode}
                  onChangeText={(value) => setEmailVerificationCode(value.replace(/\D/g, "").slice(0, 6))}
                />
              </Input>
              {emailVerificationMessage ? <Text style={{ color: theme.muted }}>{emailVerificationMessage}</Text> : null}
              <Pressable
                accessibilityRole="button"
                disabled={isEmailVerificationSubmitting}
                style={{ backgroundColor: theme.primary, borderRadius: 12, minHeight: 48, alignItems: "center", justifyContent: "center", opacity: isEmailVerificationSubmitting ? 0.6 : 1 }}
                onPress={() => void confirmEmailVerificationCode()}
              >
                <Text style={{ color: theme.card, fontSize: 16, fontWeight: "800" }}>
                  {language === "pl" ? "Potwierdź" : "Verify"}
                </Text>
              </Pressable>
              <Pressable accessibilityRole="button" disabled={isEmailVerificationSubmitting} onPress={() => void requestEmailVerificationCode()}>
                <Text style={{ color: theme.primary, textAlign: "center", fontWeight: "700" }}>
                  {language === "pl" ? "Wyślij kod ponownie" : "Send code again"}
                </Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => setIsEmailVerificationOpen(false)}>
                <Text style={{ color: theme.muted, textAlign: "center" }}>{language === "pl" ? "Później" : "Later"}</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
        <Modal
          animationType="none"
          transparent
          visible={Boolean(activeSettingsSheet)}
          onRequestClose={closeSettingsSheet}
        >
          <View style={styles.bottomSheetRoot}>
            <Pressable
              accessibilityRole="button"
              style={styles.bottomSheetBackdrop}
              onPress={closeSettingsSheet}
            />
            <Animated.View
              style={[
                styles.bottomSheetPanel,
                {
                  backgroundColor: theme.card,
                  paddingBottom: bottomSheetBottomPadding,
                  transform: [{ translateY: languageSheetTranslateY }]
                }
              ]}
            >
              <SettingsSheetContent
                activeSheet={activeSettingsSheet}
                pendingDefaultSetCount={pendingDefaultSetCount}
                pendingDefaultStageType={pendingDefaultStageType}
                pendingDefaultWeight={pendingDefaultWeight}
                pendingDefaultWorkoutExecutionMode={pendingDefaultWorkoutExecutionMode}
                pendingLanguage={pendingLanguage}
                pendingWorkoutReminderDay={pendingWorkoutReminderDay}
                stageTypeOptions={getStageTypeOptions(t)}
                t={t}
                theme={theme}
                workoutExecutionModeOptions={getWorkoutExecutionModeOptions(t)}
                onCancelReminderDay={() => {
                  setPendingWorkoutReminderDay(null);
                  closeSettingsSheet();
                }}
                onPendingDefaultSetCountChange={setPendingDefaultSetCount}
                onPendingDefaultStageTypeChange={setPendingDefaultStageType}
                onPendingDefaultWeightChange={setPendingDefaultWeight}
                onPendingDefaultWorkoutExecutionModeChange={setPendingDefaultWorkoutExecutionMode}
                onPendingLanguageChange={setPendingLanguage}
                onPendingWorkoutReminderDayChange={updatePendingWorkoutReminderDay}
                onSaveDefaultSetCount={() => {
                  setDefaultSetCount(pendingDefaultSetCount);
                  closeSettingsSheet();
                }}
                onSaveDefaultStageType={() => {
                  setDefaultStageType(pendingDefaultStageType);
                  closeSettingsSheet();
                }}
                onSaveDefaultWeight={() => {
                  setDefaultWeight(pendingDefaultWeight);
                  closeSettingsSheet();
                }}
                onSaveDefaultWorkoutExecutionMode={() => {
                  setDefaultWorkoutExecutionMode(pendingDefaultWorkoutExecutionMode);
                  closeSettingsSheet();
                }}
                onSaveLanguage={() => {
                  setLanguage(pendingLanguage);
                  closeSettingsSheet();
                }}
                onSaveReminderDay={() => {
                  if (!pendingWorkoutReminderDay) {
                    return;
                  }
                  updateWorkoutReminderSettings({
                    ...updateReminderDaySchedule(workoutReminders, pendingWorkoutReminderDay.day, {
                      enabled: pendingWorkoutReminderDay.enabled,
                      time: pendingWorkoutReminderDay.time
                    })
                  });
                  setPendingWorkoutReminderDay(null);
                  closeSettingsSheet();
                }}
              />
            </Animated.View>
          </View>
        </Modal>
        <ExerciseMuscleModal
          language={language}
          step={selectedExerciseMuscleStep}
          t={t}
          theme={theme}
          onClose={() => setSelectedExerciseMuscleStep(null)}
          onShowDetails={(step) => {
            setSelectedExerciseMuscleStep(null);
            openExerciseDetail(step);
          }}
        />
        {renderWorkoutSortSheet()}
        {renderAppDialog()}
    </SafeAreaView>
  );
}
