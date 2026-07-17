import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  Dimensions,
  Image,
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
import {
  applyAvatarResponse,
  buildAvatarImageSource,
  type AvatarResponse
} from "./src/domain/avatar";
import {
  clearCachedAvatar,
  clearPreparedAvatar,
  getCachedAvatarUri,
  prepareAvatarForUpload,
  refreshCachedAvatar,
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
  WorkoutStepKind,
  createDefaultWorkout,
  createStep,
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
  completeWorkoutSession,
  createWorkoutSessionFromWorkout,
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
  workoutHasHistory,
  WORKOUT_SESSIONS_LEGACY_SYNC_STORAGE_KEY,
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
  getSettingsTimestamp,
  normalizeAppSettings,
  type AppSettings
} from "./src/domain/appSettings";
import {
  synchronizeWorkoutSessions,
} from "./src/domain/workoutSessionSync";
import {
  findExerciseById,
  findCatalogExerciseBestEffort,
  getCachedExerciseOptions,
  getExerciseDisplayName,
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
  FAVORITE_EXERCISES_LEGACY_STORAGE_KEY,
  FAVORITE_EXERCISES_LEGACY_SYNC_STORAGE_KEY,
  FAVORITE_EXERCISES_STORAGE_BASE_KEY,
  FAVORITE_EXERCISES_SYNC_STORAGE_BASE_KEY
} from "./src/domain/favoriteExercises";
import type { FavoriteExercise } from "./src/domain/favoriteExercises";
import {
  synchronizeFavoriteExercises,
} from "./src/domain/favoriteExerciseSync";
import {
  ANONYMOUS_LOCAL_OWNER,
  detectAccountSwitch,
  getAccountStorageKey,
  getAccountStorageOwnerId,
  getLastAccountUserId,
  migrateLegacyAccountStorage,
  removeAccountJson,
  removeAccountStorageKeys,
  setLastAccountUserId
} from "./src/domain/accountStorage";
import {
  WEEKLY_PLAN_STORAGE_BASE_KEY,
  formatWeekRange,
  getCurrentWeekRange,
  getWeeklyPlanDay,
  getWeeklyPlanSummary,
  loadWeeklyPlan,
  removeWeeklyPlanItem,
  saveWeeklyPlan,
  toggleWeeklyPlanItemDay,
  upsertWeeklyPlanItem,
  type WeeklyPlanSettings
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
  rescheduleWorkoutReminders,
  updateReminderDaySchedule
} from "./src/domain/workoutReminders";
import type { ReminderDaySchedule, ReminderWeekday, WorkoutReminderSettings } from "./src/domain/workoutReminders";
import {
  addDiagnosticEvent,
  createCorrelationId,
  getDiagnosticsSnapshot
} from "./src/domain/appDiagnostics";
import {
  buildApiHeaders,
  createApiError as createHttpApiError,
  requestApi
} from "./src/api/apiClient";
import { createAuthApiClient } from "./src/api/authApi";
import { createAiCreditsApiClient } from "./src/api/aiCreditsApi";
import { createBugReportsApiClient } from "./src/api/bugReportsApi";
import {
  createAccountDataApiClient
} from "./src/api/accountDataApi";
import { createProfileApiClient } from "./src/api/profileApi";
import {
  createWorkoutCreatorApiClient,
  getWorkoutCreatorJobId,
  isWorkoutCreatorJobResponse,
  type WorkoutCreatorQuestionAnswer
} from "./src/api/workoutCreatorApi";
import type { PendingWorkoutCreatorJob } from "./src/domain/workoutCreatorJob";
import { getErrorMessageOrFallback } from "./src/domain/apiErrors";
import {
  emptyAiCreditBalance,
  isInsufficientAiCreditsError
} from "./src/domain/aiCredits";
import type { AiCreditBalance, AiCreditPack, AiCreditTransaction } from "./src/domain/aiCredits";
import {
  getExerciseProgressHistoryGroups
} from "./src/domain/exerciseProgressHistory";
import { buildProfileAccountDetails, getProfileDisplayEmail, getProfileDisplayName } from "./src/domain/profile";
import {
  getAiCreditProducts,
  getPendingAiCreditPurchases,
  initBilling,
  mapBillingError,
  purchaseAiCreditPack
} from "./src/domain/googlePlayBilling";
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
import { WorkoutBuilderScreen } from "./src/screens/WorkoutBuilderScreen";
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
import type { ReminderSchedulingStatus, SettingsSheetKey } from "./src/domain/settings";
import type { SavedWorkout, SortDirection, WorkoutSortField, WorkoutSortSettings } from "./src/domain/savedWorkouts";
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
  hasAnonymousAccountData as hasStoredAnonymousAccountData,
  hasAnonymousMergeHandled,
  loadCreatorProfilesForOwner as loadCreatorProfilesForStorageOwner,
  loadWorkoutSessionsForOwner as loadWorkoutSessionsForStorageOwner,
  loadWorkoutsForOwner as loadWorkoutsForStorageOwner,
  markAnonymousMergeHandled,
  mergeCreatorProfilesById,
  saveCreatorProfilesForOwner as saveCreatorProfilesForStorageOwner,
  saveWorkoutSessionsForOwner as saveWorkoutSessionsForStorageOwner,
  saveWorkoutsForOwner as saveWorkoutsForStorageOwner
} from "./src/storage/localDataRepositories";
import { useAccountScopedWorkouts } from "./src/features/workouts/useAccountScopedWorkouts";
import { useAccountScopedCreatorProfiles } from "./src/features/workoutCreator/useAccountScopedCreatorProfiles";
import { useAccountScopedCreatorJob } from "./src/features/workoutCreator/useAccountScopedCreatorJob";
import { useAccountScopedWorkoutSessions } from "./src/features/workoutSessions/useAccountScopedWorkoutSessions";
import { useWorkoutSessionAutoSync } from "./src/features/workoutSessions/useWorkoutSessionAutoSync";
import { useSystemStatusController } from "./src/features/systemStatus/useSystemStatusController";
import { useAccountScopedSettings } from "./src/features/settings/useAccountScopedSettings";
import { useAccountSettingsAutoSave } from "./src/features/settings/useAccountSettingsAutoSave";
import { useAccountScopedFavoriteExercises } from "./src/features/favorites/useAccountScopedFavoriteExercises";
import { useAccountScopedAchievements } from "./src/features/achievements/useAccountScopedAchievements";
import { useInitialAccountSync } from "./src/features/sync/useInitialAccountSync";
import {
  LOCAL_AUTH_STORAGE_KEY as localAuthStorageKey,
  deleteSecureAuthToken,
  getSecureAuthToken,
  setSecureAuthToken
} from "./src/features/auth/authSession";
import {
  AuthPasswordPolicy,
  createUserSession,
  type AuthApiResponse,
  type AuthSessionResponse,
  type AuthUserResponse,
  type LegacyLocalAuthStorage,
  type LocalAuthStorage,
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

const localWorkoutsLegacyStorageKey = "gymmin.localWorkouts.v1";
const workoutSessionsLegacyStorageKey = "gymmin.workoutSessions";
// TODO: per-user local storage for account-scoped workout sessions and richer conflict UX.
const localSettingsLegacyStorageKey = "gymmin.localSettings.v1";
const localCreatorProfilesLegacyStorageKey = "gymmin.localCreatorProfiles.v1";
const localCreatorJobLegacyStorageKey = "gymmin.localCreatorJob.v1";
const localWeeklyPlanStorageBaseKey = WEEKLY_PLAN_STORAGE_BASE_KEY;
const anonymousAccountDataBaseKeys = [
  localWorkoutsStorageBaseKey,
  FAVORITE_EXERCISES_STORAGE_BASE_KEY,
  WORKOUT_SESSIONS_STORAGE_BASE_KEY,
  ACHIEVEMENTS_STORAGE_BASE_KEY,
  APP_USAGE_STATS_STORAGE_BASE_KEY,
  localCreatorProfilesStorageBaseKey,
  localCreatorJobStorageBaseKey
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

type ApiUserSettings = AppSettings;

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
  if (!isRecord(value)) {
    return null;
  }

  return normalizeAppSettings(value, defaultCollapsedPanels);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function stringifyDeviceValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function appendDeviceField(fields: string[], label: string, value: unknown) {
  const normalizedValue = stringifyDeviceValue(value);

  if (normalizedValue) {
    fields.push(`${label}: ${normalizedValue}`);
  }
}

function getDeviceReportInfo() {
  const platformConstants = {
    ...((NativeModules.PlatformConstants ?? {}) as Record<string, unknown>),
    ...(Platform.constants as unknown as Record<string, unknown>)
  };
  const expoConstants = (
    NativeModules.ExponentConstants ??
    NativeModules.ExpoConstants ??
    {}
  ) as Record<string, unknown>;
  const screen = Dimensions.get("screen");
  const window = Dimensions.get("window");
  const fields: string[] = [];

  appendDeviceField(fields, "platform", Platform.OS);
  appendDeviceField(fields, "osVersion", Platform.Version);
  appendDeviceField(fields, "isPad", Platform.OS === "ios" ? Platform.isPad : undefined);
  appendDeviceField(fields, "brand", platformConstants.Brand);
  appendDeviceField(fields, "manufacturer", platformConstants.Manufacturer);
  appendDeviceField(fields, "model", platformConstants.Model);
  appendDeviceField(fields, "release", platformConstants.Release);
  appendDeviceField(fields, "serial", platformConstants.Serial);
  appendDeviceField(fields, "fingerprint", platformConstants.Fingerprint);
  appendDeviceField(fields, "systemName", platformConstants.systemName);
  appendDeviceField(fields, "systemVersion", platformConstants.osVersion);
  appendDeviceField(fields, "interfaceIdiom", platformConstants.interfaceIdiom);
  appendDeviceField(fields, "reactNativeVersion", platformConstants.reactNativeVersion);
  appendDeviceField(fields, "expoAppOwnership", expoConstants.appOwnership);
  appendDeviceField(fields, "expoExecutionEnvironment", expoConstants.executionEnvironment);
  appendDeviceField(fields, "expoSessionId", expoConstants.sessionId);
  appendDeviceField(
    fields,
    "screen",
    `${screen.width}x${screen.height}, scale ${screen.scale}, fontScale ${screen.fontScale}`
  );
  appendDeviceField(
    fields,
    "window",
    `${window.width}x${window.height}, scale ${window.scale}, fontScale ${window.fontScale}`
  );

  return fields.join("\n");
}

function getAuthDeviceName() {
  const platformConstants = {
    ...((NativeModules.PlatformConstants ?? {}) as Record<string, unknown>),
    ...(Platform.constants as unknown as Record<string, unknown>)
  };
  const brand = stringifyDeviceValue(platformConstants.Brand);
  const manufacturer = stringifyDeviceValue(platformConstants.Manufacturer);
  const model = stringifyDeviceValue(platformConstants.Model);
  const systemName = stringifyDeviceValue(platformConstants.systemName);
  const systemVersion = stringifyDeviceValue(platformConstants.osVersion ?? Platform.Version);
  const deviceParts = [brand || manufacturer, model].filter(Boolean);
  const systemParts = [systemName || Platform.OS, systemVersion].filter(Boolean);
  const label = [deviceParts.join(" "), systemParts.join(" ")].filter(Boolean).join(" · ").trim();

  return label.slice(0, 120) || (Platform.OS === "ios" ? "iOS device" : "Android device");
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
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const languageSheetTranslateY = useRef(new Animated.Value(360)).current;
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [activeScreen, setActiveScreen] = useState<ScreenKey>("home");
  const {
    isSystemStatusRefreshing,
    refreshSystemStatus,
    systemStatus
  } = useSystemStatusController(apiBaseUrl, activeScreen === "home");
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlanSettings>({ enabled: false, items: [], updatedAt: new Date().toISOString() });
  const [hasLoadedWeeklyPlan, setHasLoadedWeeklyPlan] = useState(false);
  const [weeklyPlanOwnerId, setWeeklyPlanOwnerId] = useState<string | null>(null);
  const [isWorkoutSortSheetOpen, setIsWorkoutSortSheetOpen] = useState(false);
  const [hasLoadedLocalAuth, setHasLoadedLocalAuth] = useState(false);
  const [selectedArticleId, setSelectedArticleId] = useState<string>(articles[0]?.id ?? "");
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [workout, setWorkout] = useState<WorkoutDraft>(() => createDefaultWorkout());
  const [pendingLanguage, setPendingLanguage] = useState<LanguageCode>("en");
  const [pendingDefaultSetCount, setPendingDefaultSetCount] = useState("");
  const [pendingDefaultWeight, setPendingDefaultWeight] = useState("");
  const [pendingDefaultStageType, setPendingDefaultStageType] = useState<StageType | "">("");
  const [pendingDefaultWorkoutExecutionMode, setPendingDefaultWorkoutExecutionMode] = useState<WorkoutExecutionMode>("guided");
  const [pendingWorkoutReminderDay, setPendingWorkoutReminderDay] = useState<ReminderDaySchedule | null>(null);
  const [reminderSchedulingStatus, setReminderSchedulingStatus] = useState<ReminderSchedulingStatus>("idle");
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
  const [activeAuthSessions, setActiveAuthSessions] = useState<AuthSessionResponse[]>([]);
  const [aiCreditBalance, setAiCreditBalance] = useState<AiCreditBalance>(emptyAiCreditBalance);
  const [aiCreditTransactions, setAiCreditTransactions] = useState<AiCreditTransaction[]>([]);
  const [aiCreditPacks, setAiCreditPacks] = useState<AiCreditPack[]>([]);
  const [aiCreditsError, setAiCreditsError] = useState("");
  const [aiCreditsPurchaseMessage, setAiCreditsPurchaseMessage] = useState("");
  const [canRestoreAiCreditPurchases, setCanRestoreAiCreditPurchases] = useState(false);
  const [isAiCreditsLoading, setIsAiCreditsLoading] = useState(false);
  const [isAiCreditPurchaseLoading, setIsAiCreditPurchaseLoading] = useState(false);
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
  const [showAiRewriteCreditTooltip, setShowAiRewriteCreditTooltip] = useState(false);
  const [creatorCollapsedSections, setCreatorCollapsedSections] = useState<Record<string, boolean>>({});
  const [creatorProfileName, setCreatorProfileName] = useState("");
  const [showCreatorLoginTooltip, setShowCreatorLoginTooltip] = useState(false);
  const [trainingFactIndex, setTrainingFactIndex] = useState(0);
  const [readOnlyWorkoutCollapsedPanels, setReadOnlyWorkoutCollapsedPanels] = useState<Record<string, boolean>>({});
  const [user, setUser] = useState<UserSession | null>(null);
  const [isEmailVerificationOpen, setIsEmailVerificationOpen] = useState(false);
  const [emailVerificationCode, setEmailVerificationCode] = useState("");
  const [emailVerificationMessage, setEmailVerificationMessage] = useState("");
  const [isEmailVerificationSubmitting, setIsEmailVerificationSubmitting] = useState(false);
  const [cachedAvatarUri, setCachedAvatarUri] = useState<string | null>(null);
  const [hasAvatarImageLoadFailed, setHasAvatarImageLoadFailed] = useState(false);
  const storageOwnerId = getAccountStorageOwnerId(user?.id);
  const syncedFavoriteExercisesUserIdRef = useRef<string | null>(null);
  const syncedAchievementsUserIdRef = useRef<string | null>(null);
  const [hasLoadedAccountStorageMigration, setHasLoadedAccountStorageMigration] = useState(false);
  const {
    applySettings: applyAccountSettingsState,
    buildSettings: buildCurrentSettingsPayload,
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
  const authApi = createAuthApiClient({
    createError: (response, endpoint, method, fallbackMessage) =>
      createHttpApiError(response, endpoint, method, fallbackMessage, t("rateLimitError")),
    request: (endpoint, init) => requestApi(apiBaseUrl, endpoint, init)
  });
  const accountDataApi = createAccountDataApiClient({
    createError: (response, endpoint, method, fallbackMessage) =>
      createHttpApiError(response, endpoint, method, fallbackMessage, t("rateLimitError")),
    request: (endpoint, init) => requestApi(apiBaseUrl, endpoint, init)
  });
  const aiCreditsApi = createAiCreditsApiClient({
    createError: (response, endpoint, method, fallbackMessage) =>
      createHttpApiError(response, endpoint, method, fallbackMessage, t("rateLimitError")),
    request: (endpoint, init) => requestApi(apiBaseUrl, endpoint, init)
  });
  const bugReportsApi = createBugReportsApiClient({
    createError: (response, endpoint, method, fallbackMessage) =>
      createHttpApiError(response, endpoint, method, fallbackMessage, t("rateLimitError")),
    request: (endpoint, init) => requestApi(apiBaseUrl, endpoint, init)
  });
  const profileApi = createProfileApiClient({
    createError: (response, endpoint, method, fallbackMessage) =>
      createHttpApiError(response, endpoint, method, fallbackMessage, t("rateLimitError")),
    request: (endpoint, init) => requestApi(apiBaseUrl, endpoint, init)
  });
  const workoutCreatorApi = createWorkoutCreatorApiClient({
    createError: (response, endpoint, method, fallbackMessage) =>
      createHttpApiError(response, endpoint, method, fallbackMessage, t("rateLimitError")),
    request: (endpoint, init) => requestApi(apiBaseUrl, endpoint, init)
  });
  const remoteUserAvatarSource = buildAvatarImageSource(apiBaseUrl, user);
  const userAvatarSource = hasAvatarImageLoadFailed
    ? null
    : Platform.OS === "web"
      ? remoteUserAvatarSource
      : cachedAvatarUri
        ? { uri: cachedAvatarUri }
        : null;
  const isCreatorJobPending = pendingCreatorJob?.type === "plan";
  const isRewriteJobPending = pendingCreatorJob?.type === "rewrite";
  const pollingCreatorJobIdRef = useRef<string | null>(null);
  const syncedWorkoutSessionsUserIdRef = useRef<string | null>(null);
  const mainScrollRef = useRef<ScrollView | null>(null);
  const bugReportSubmissionRef = useRef<{ key: string; signature: string } | null>(null);
  const appUsageStartedAtRef = useRef<number | null>(Date.now());
  const isApplyingAccountWorkoutSessionsRef = useRef(false);
  const handledAccountPolicyUserIdRef = useRef<string | null>(null);
  const reminderStorageOwnerIdRef = useRef(storageOwnerId);
  const previousReminderLanguageRef = useRef<LanguageCode>(language);
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
      loadedSettingsOwnerId === storageOwnerId &&
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
  const settingsAutoSaveChangeKey = JSON.stringify(buildCurrentSettingsPayload(""));
  useAccountSettingsAutoSave({
    buildSettings: buildCurrentSettingsPayload,
    changeKey: settingsAutoSaveChangeKey,
    enabled: Boolean(
      hasLoadedLocalSettings &&
      loadedSettingsOwnerId === storageOwnerId &&
      user &&
      settingsInitialSync.isSynced
    ),
    isApplyingRemoteSettingsRef: isApplyingAccountSettingsRef,
    onError: (error) => {
      console.error("Failed to save account settings", error);
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

  useEffect(() => {
    let isActive = true;
    setHasAvatarImageLoadFailed(false);

    if (!user?.id || !user.avatarUrl) {
      setCachedAvatarUri(null);
      if (user?.id && Platform.OS !== "web") {
        clearCachedAvatar(user.id);
      }
      return () => {
        isActive = false;
      };
    }

    if (Platform.OS === "web") {
      setCachedAvatarUri(null);
      return () => {
        isActive = false;
      };
    }

    setCachedAvatarUri(getCachedAvatarUri(user.id));

    void refreshCachedAvatar(apiBaseUrl, user)
      .then((uri) => {
        if (isActive) {
          setCachedAvatarUri(uri);
          setHasAvatarImageLoadFailed(false);
        }
      })
      .catch((error) => {
        if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
          console.warn("Could not refresh cached avatar", error);
        }
      });

    return () => {
      isActive = false;
    };
  }, [user?.avatarUpdatedAt, user?.avatarUrl, user?.id, user?.token]);

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
      setUserAchievements(mergedAchievements);
      setAppUsageStats(mergedUsageStats);
      setAchievementsSyncState({});
    }

    workoutsInitialSync.markSyncing();
    favoritesInitialSync.markSyncing();
    workoutSessionsInitialSync.markSyncing();
    achievementsInitialSync.markSyncing();
    setFavoriteExercisesSyncStatus("local");

    try {
      await synchronizeAccountWorkouts(session, mergedWorkouts);
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
      favoritesInitialSync.markSynced();
      workoutSessionsInitialSync.markSynced();
      achievementsInitialSync.markSynced();
    } catch (error) {
      console.error("Failed to sync merged anonymous data", error);
      workoutsInitialSync.markFailed();
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
    const timeoutId = setTimeout(() => {
      Animated.timing(splashOpacity, {
        duration: 320,
        toValue: 0,
        useNativeDriver: true
      }).start(() => setIsAppLoading(false));
    }, 850);

    return () => clearTimeout(timeoutId);
  }, [splashOpacity]);

  useEffect(() => {
    if (isAppLoading) {
      return;
    }

    const timeoutId = setTimeout(() => {
      getCachedExerciseOptions(language);
    }, 1200);

    return () => clearTimeout(timeoutId);
  }, [isAppLoading, language]);

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
    if (!user) {
      setAiCreditBalance(emptyAiCreditBalance);
      setAiCreditTransactions([]);
      setAiCreditPacks([]);
      setAiCreditsError("");
      return;
    }

    void fetchAiCredits(user);
  }, [user?.id, user?.token]);

  useEffect(() => {
    let isMounted = true;

    async function runAccountStorageMigration() {
      await migrateLegacyAccountStorage([
        { baseKey: localWorkoutsStorageBaseKey, legacyKey: localWorkoutsLegacyStorageKey },
        { baseKey: localWorkoutsStorageBaseKey, legacyKey: "gymmin.workouts" },
        { baseKey: localSettingsStorageBaseKey, legacyKey: localSettingsLegacyStorageKey },
        { baseKey: localSettingsStorageBaseKey, legacyKey: "gymmin.settings" },
        { baseKey: localCreatorProfilesStorageBaseKey, legacyKey: localCreatorProfilesLegacyStorageKey },
        { baseKey: localCreatorJobStorageBaseKey, legacyKey: localCreatorJobLegacyStorageKey },
        { baseKey: WORKOUT_SESSIONS_STORAGE_BASE_KEY, legacyKey: workoutSessionsLegacyStorageKey },
        { baseKey: WORKOUT_SESSIONS_SYNC_STORAGE_BASE_KEY, legacyKey: WORKOUT_SESSIONS_LEGACY_SYNC_STORAGE_KEY },
        { baseKey: FAVORITE_EXERCISES_STORAGE_BASE_KEY, legacyKey: FAVORITE_EXERCISES_LEGACY_STORAGE_KEY },
        { baseKey: FAVORITE_EXERCISES_SYNC_STORAGE_BASE_KEY, legacyKey: FAVORITE_EXERCISES_LEGACY_SYNC_STORAGE_KEY }
      ]);

      if (isMounted) {
        setHasLoadedAccountStorageMigration(true);
      }
    }

    void runAccountStorageMigration();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadLocalAuth() {
      try {
        const rawData = await AsyncStorage.getItem(localAuthStorageKey);
        const storedData = rawData ? JSON.parse(rawData) as LegacyLocalAuthStorage : null;
        let token = await getSecureAuthToken();

        if (!isMounted || !storedData || !isRecord(storedData.user)) {
          await deleteSecureAuthToken();
          if (rawData) await AsyncStorage.removeItem(localAuthStorageKey);
          return;
        }

        if (!token && typeof storedData.token === "string" && storedData.token.trim()) {
          token = storedData.token.trim();
          await setSecureAuthToken(token);
          await AsyncStorage.setItem(localAuthStorageKey, JSON.stringify({
            updatedAt: new Date().toISOString(),
            user: storedData.user,
            version: 2
          } satisfies LocalAuthStorage));
        }

        if (!token) {
          await AsyncStorage.removeItem(localAuthStorageKey);
          return;
        }

        const cachedSession: UserSession = {
          avatarUpdatedAt: typeof storedData.user.avatarUpdatedAt === "string" ? storedData.user.avatarUpdatedAt : null,
          avatarUrl: typeof storedData.user.avatarUrl === "string" ? storedData.user.avatarUrl : null,
          createdOn: typeof storedData.user.createdOn === "string" ? storedData.user.createdOn : null,
          email: String(storedData.user.email),
          emailVerified: storedData.user.emailVerified === true,
          id: String(storedData.user.id),
          modifiedOn: typeof storedData.user.modifiedOn === "string" ? storedData.user.modifiedOn : null,
          name: String(storedData.user.name || storedData.user.email.split("@")[0] || t("defaultUserName")),
          token
        };

        let responseBody: AuthUserResponse | null;
        try {
          responseBody = await authApi.getCurrentUser(
            getApiHeaders(cachedSession),
            t("authRequestError")
          );
        } catch (error) {
          const status = (error as { status?: number }).status;
          if (status === 401 || status === 403) {
            await Promise.all([
              AsyncStorage.removeItem(localAuthStorageKey),
              deleteSecureAuthToken()
            ]);
          } else {
            setUser(cachedSession);
          }
          return;
        }

        if (!responseBody) {
          await Promise.all([
            AsyncStorage.removeItem(localAuthStorageKey),
            deleteSecureAuthToken()
          ]);
          return;
        }

        setUser({
          avatarUpdatedAt: responseBody.avatarUpdatedAt ?? null,
          avatarUrl: responseBody.avatarUrl ?? null,
          createdOn: responseBody.createdOn ?? null,
          email: responseBody.email,
          emailVerified: responseBody.emailVerified === true,
          id: responseBody.id,
          modifiedOn: responseBody.modifiedOn ?? null,
          name: responseBody.name || responseBody.email.split("@")[0] || t("defaultUserName"),
          token
        });
      } catch (error) {
        console.error("Failed to load local auth", error);
        try {
          const rawData = await AsyncStorage.getItem(localAuthStorageKey);
          const token = await getSecureAuthToken();
          const storedData = rawData ? JSON.parse(rawData) as LegacyLocalAuthStorage : null;
          if (
            isMounted &&
            typeof token === "string" &&
            token.trim() &&
            storedData !== null &&
            isRecord(storedData.user) &&
            typeof storedData.user.id === "string" &&
            typeof storedData.user.email === "string"
          ) {
            setUser({
              avatarUpdatedAt: typeof storedData.user.avatarUpdatedAt === "string" ? storedData.user.avatarUpdatedAt : null,
              avatarUrl: typeof storedData.user.avatarUrl === "string" ? storedData.user.avatarUrl : null,
              createdOn: typeof storedData.user.createdOn === "string" ? storedData.user.createdOn : null,
              email: storedData.user.email,
              emailVerified: storedData.user.emailVerified === true,
              id: storedData.user.id,
              modifiedOn: typeof storedData.user.modifiedOn === "string" ? storedData.user.modifiedOn : null,
              name: typeof storedData.user.name === "string" && storedData.user.name
                ? storedData.user.name
                : storedData.user.email.split("@")[0] || t("defaultUserName"),
              token
            });
          }
        } catch (fallbackError) {
          console.error("Failed to restore cached auth after auth check error", fallbackError);
        }
      } finally {
        if (isMounted) {
          setHasLoadedLocalAuth(true);
        }
      }
    }

    void loadLocalAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (
      !hasLoadedLocalAuth ||
      !hasLoadedLocalWorkouts ||
      !hasLoadedFavoriteExercises ||
      !hasLoadedWorkoutSessions ||
      !hasLoadedLocalCreatorProfiles ||
      loadedWorkoutsOwnerId !== storageOwnerId ||
      loadedFavoriteExercisesOwnerId !== storageOwnerId ||
      loadedWorkoutSessionsOwnerId !== storageOwnerId ||
      loadedCreatorProfilesOwnerId !== storageOwnerId ||
      !user
    ) {
      return;
    }

    if (handledAccountPolicyUserIdRef.current === user.id) {
      return;
    }

    const currentUser = user;
    handledAccountPolicyUserIdRef.current = currentUser.id;
    let isMounted = true;

    async function applyAccountStoragePolicy() {
      try {
        const previousUserId = await getLastAccountUserId();

        if (!isMounted) {
          return;
        }

        if (detectAccountSwitch(previousUserId, currentUser.id)) {
          showInfoDialog(t("accountSwitchDetected"), t("accountSwitchCopy"));
        } else if (
          !(await hasAnonymousMergeHandled(currentUser.id))
          && await hasStoredAnonymousAccountData(anonymousAccountDataBaseKeys)
        ) {
          showAnonymousAccountDataDialog(currentUser);
        }

        await setLastAccountUserId(currentUser.id);
      } catch (error) {
        console.error("Failed to apply account storage policy", error);
      }
    }

    void applyAccountStoragePolicy();

    return () => {
      isMounted = false;
    };
  }, [
    hasLoadedFavoriteExercises,
    hasLoadedLocalAuth,
    hasLoadedLocalCreatorProfiles,
    hasLoadedLocalWorkouts,
    hasLoadedWorkoutSessions,
    language,
    loadedCreatorProfilesOwnerId,
    loadedFavoriteExercisesOwnerId,
    loadedWorkoutSessionsOwnerId,
    loadedWorkoutsOwnerId,
    storageOwnerId,
    user?.id
  ]);

  useEffect(() => {
    let isMounted = true;
    const ownerId = storageOwnerId;
    setHasLoadedWeeklyPlan(false);
    setWeeklyPlanOwnerId(null);

    void loadWeeklyPlan(ownerId).then((plan) => {
      if (!isMounted) {
        return;
      }
      setWeeklyPlan(plan);
      setWeeklyPlanOwnerId(ownerId);
      setHasLoadedWeeklyPlan(true);
    });

    return () => {
      isMounted = false;
    };
  }, [storageOwnerId]);

  useEffect(() => {
    if (!hasLoadedWeeklyPlan || weeklyPlanOwnerId !== storageOwnerId) {
      return;
    }

    saveWeeklyPlan(weeklyPlan, storageOwnerId).catch((error) => {
      console.error("Failed to save weekly plan", error);
    });
  }, [hasLoadedWeeklyPlan, storageOwnerId, weeklyPlan, weeklyPlanOwnerId]);

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
    if (user && !user.emailVerified) setIsEmailVerificationOpen(true);
  }, [user?.id, user?.emailVerified]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", () => setIsKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => setIsKeyboardVisible(false));

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    const previousLanguage = previousReminderLanguageRef.current;
    if (previousLanguage === language) {
      return;
    }

    previousReminderLanguageRef.current = language;
    const previousDefaults = getDefaultWorkoutReminderSettings(previousLanguage);
    const nextDefaults = getDefaultWorkoutReminderSettings(language);
    const shouldUpdateMessage = workoutReminders.message === previousDefaults.message;
    const shouldUpdateDescription = (workoutReminders.description ?? "") === (previousDefaults.description ?? "");
    if (!shouldUpdateMessage && !shouldUpdateDescription) {
      return;
    }

    updateWorkoutReminderSettings({
      ...workoutReminders,
      description: shouldUpdateDescription ? nextDefaults.description : workoutReminders.description,
      message: shouldUpdateMessage ? nextDefaults.message : workoutReminders.message
    });
  }, [language, workoutReminders]);

  useEffect(() => {
    const previousOwnerId = reminderStorageOwnerIdRef.current;
    if (previousOwnerId === storageOwnerId) {
      return;
    }

    reminderStorageOwnerIdRef.current = storageOwnerId;
    void cancelWorkoutReminders(previousOwnerId);
  }, [storageOwnerId]);

  useEffect(() => {
    if (
      !hasLoadedLocalSettings ||
      !hasLoadedWorkoutSessions ||
      loadedSettingsOwnerId !== storageOwnerId ||
      loadedWorkoutSessionsOwnerId !== storageOwnerId
    ) {
      return;
    }

    let isActive = true;

    rescheduleWorkoutReminders(workoutReminders, workoutSessions, storageOwnerId).then((result) => {
      if (!isActive) {
        return;
      }

      if (result.permissionDenied) {
        setReminderSchedulingStatus("permissionDenied");
      } else if (workoutReminders.enabled) {
        setReminderSchedulingStatus("scheduled");
      } else {
        setReminderSchedulingStatus("idle");
      }
    }).catch((error) => {
      console.error("Failed to reschedule workout reminders", error);
      if (isActive) {
        setReminderSchedulingStatus("failed");
      }
    });

    return () => {
      isActive = false;
    };
  }, [
    hasLoadedLocalSettings,
    hasLoadedWorkoutSessions,
    loadedSettingsOwnerId,
    loadedWorkoutSessionsOwnerId,
    storageOwnerId,
    workoutReminders,
    workoutSessions
  ]);

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

  useEffect(() => {
    if (!hasLoadedLocalCreatorJob || loadedCreatorJobOwnerId !== storageOwnerId || !pendingCreatorJob || !user) {
      return undefined;
    }

    let isActive = true;
    void resumePendingWorkoutCreatorJob(pendingCreatorJob, () => isActive);

    return () => {
      isActive = false;
    };
  }, [hasLoadedLocalCreatorJob, loadedCreatorJobOwnerId, pendingCreatorJob?.jobId, savedWorkouts, storageOwnerId, user?.token]);

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

  useEffect(() => {
    if (activeScreen !== "activeSessions" || !user) {
      return;
    }

    void fetchAuthSessions();
  }, [activeScreen, user?.id]);

  const filteredWorkouts = useMemo(() => {
    const phrase = search.trim().toLowerCase();
    const visibleWorkouts = !phrase
      ? savedWorkouts
      : savedWorkouts.filter((item) => item.name.toLowerCase().includes(phrase));

    return [...visibleWorkouts].sort((left, right) => compareWorkouts(left, right, workoutSort));
  }, [savedWorkouts, search, workoutSort]);

  const visibleWorkoutSessions = useMemo(
    () => getActiveWorkoutSessionsForUi(workoutSessions),
    [workoutSessions]
  );

  const activeWorkoutSession = useMemo(
    () => visibleWorkoutSessions.find((session) => session.id === activeWorkoutSessionId) ?? null,
    [activeWorkoutSessionId, visibleWorkoutSessions]
  );
  const weeklyPlanSummary = useMemo(
    () => getWeeklyPlanSummary(weeklyPlan, savedWorkouts, visibleWorkoutSessions, new Date()),
    [savedWorkouts, visibleWorkoutSessions, weeklyPlan]
  );
  const shouldShowWorkoutHeaderTime = activeScreen === "workoutSession" && Boolean(activeWorkoutSession);

  const selectedWorkout = useMemo(
    () => savedWorkouts.find((item) => item.id === selectedWorkoutId) ?? savedWorkouts[0] ?? null,
    [savedWorkouts, selectedWorkoutId]
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
  const stickyActionBottom = bottomNavHeight - 4;
  const scrollViewportBottomMargin = isLandscape ? 0 : bottomNavHeight;

  function getAuthHeaders(session = user): Record<string, string> {
    return getApiHeaders(session);
  }

  function getApiHeaders(session: UserSession | null = user): Record<string, string> {
    return buildApiHeaders(session);
  }

  async function fetchAiCredits(session = user) {
    if (!session) {
      return;
    }

    setIsAiCreditsLoading(true);
    setAiCreditsError("");
    try {
      const overview = await aiCreditsApi.loadOverview(getAuthHeaders(session), t("aiCreditsLoadError"));
      setAiCreditBalance(overview.balance);
      if (overview.transactions) {
        setAiCreditTransactions(overview.transactions);
      }
      if (overview.packs) {
        const products = await getAiCreditProducts(overview.packs.map((pack) => pack.productId)).catch(() => []);
        setAiCreditPacks(overview.packs.map((pack) => {
          const product = products.find((item) => item.productId === pack.productId);
          return product?.localizedPrice ? { ...pack, localizedPrice: product.localizedPrice } : pack;
        }));
      }
    } catch (error) {
      if ((error as { status?: number }).status === 401) {
        handleUnauthorizedSession();
        return;
      }
      console.error("Failed to load AI credits", error);
      setAiCreditsError(getErrorMessageOrFallback(error, t("aiCreditsLoadError"), t("serverProblemMessage")));
    } finally {
      setIsAiCreditsLoading(false);
    }
  }

  async function verifyGooglePlayAiCreditPurchase(
    purchase: { productId: string; purchaseToken: string; orderId?: string | null },
    session = user
  ) {
    if (!session) {
      return null;
    }

    let result;
    try {
      result = await aiCreditsApi.verifyGooglePlayPurchase(
        purchase,
        getAuthHeaders(session),
        t("aiCreditsPurchaseVerifyError")
      );
    } catch (error) {
      if ((error as { status?: number }).status === 401) {
        handleUnauthorizedSession();
        return null;
      }
      throw error;
    }

    setAiCreditBalance((current) => ({ ...current, balance: result.balance }));
    setAiCreditsPurchaseMessage(result.status === "already_processed" ? t("aiCreditsPurchaseCompleted") : t("aiCreditsPurchaseAdded"));
    setCanRestoreAiCreditPurchases(false);
    await fetchAiCredits(session);
    return result;
  }

  async function buyAiCreditPack(pack: AiCreditPack) {
    if (!user || isAiCreditPurchaseLoading || !pack.active) {
      return;
    }

    setIsAiCreditPurchaseLoading(true);
    setAiCreditsError("");
    setAiCreditsPurchaseMessage(t("aiCreditsPreparingPurchase"));
    setCanRestoreAiCreditPurchases(false);
    try {
      const initialized = await initBilling();
      if (!initialized) {
        throw new Error(t("aiCreditsBillingUnavailable"));
      }

      setAiCreditsPurchaseMessage(t("aiCreditsProcessingPurchase"));
      const purchase = await purchaseAiCreditPack(pack.productId, user.id);
      addDiagnosticEvent({
        area: "ai",
        extra: {
          orderId: purchase.orderId ?? null,
          productId: purchase.productId
        },
        level: "info",
        message: "Google Play purchase returned for verification",
        screen: "aiCredits"
      });
      await verifyGooglePlayAiCreditPurchase(purchase, user);
    } catch (error) {
      const billingError = mapBillingError(error);
      if (billingError.isCancelled) {
        setAiCreditsPurchaseMessage(t("aiCreditsPurchaseCancelled"));
      } else {
        console.error("Failed to buy AI credits", error);
        setAiCreditsError(getErrorMessageOrFallback(error, t("aiCreditsPurchaseVerifyError"), t("serverProblemMessage")));
        setAiCreditsPurchaseMessage("");
        setCanRestoreAiCreditPurchases(true);
      }
    } finally {
      setIsAiCreditPurchaseLoading(false);
    }
  }

  async function restorePendingAiCreditPurchases() {
    if (!user || isAiCreditPurchaseLoading) {
      return;
    }

    setIsAiCreditPurchaseLoading(true);
    setAiCreditsError("");
    setAiCreditsPurchaseMessage(t("aiCreditsProcessingPurchase"));
    try {
      const pendingPurchases = await getPendingAiCreditPurchases(aiCreditPacks.map((pack) => pack.productId));
      if (!pendingPurchases.length) {
        setAiCreditsPurchaseMessage("");
        setCanRestoreAiCreditPurchases(false);
        return;
      }

      setCanRestoreAiCreditPurchases(true);

      for (const purchase of pendingPurchases) {
        await verifyGooglePlayAiCreditPurchase(purchase, user);
      }
    } catch (error) {
      console.error("Failed to restore AI credit purchases", error);
      setAiCreditsError(getErrorMessageOrFallback(error, t("aiCreditsPurchaseVerifyError"), t("serverProblemMessage")));
      setAiCreditsPurchaseMessage("");
      setCanRestoreAiCreditPurchases(true);
    } finally {
      setIsAiCreditPurchaseLoading(false);
    }
  }

  async function grantDevAiCredits() {
    if (!user || isAiCreditsLoading) {
      return;
    }

    setIsAiCreditsLoading(true);
    setAiCreditsError("");
    try {
      const balance = await aiCreditsApi.grantDevelopmentCredits(
        10,
        "Mobile dev top-up",
        getAuthHeaders(user),
        t("aiCreditsLoadError")
      );
      setAiCreditBalance(balance);
      await fetchAiCredits(user);
    } catch (error) {
      if ((error as { status?: number }).status === 401) {
        handleUnauthorizedSession();
        return;
      }
      console.error("Failed to grant development AI credits", error);
      setAiCreditsError(getErrorMessageOrFallback(error, t("aiCreditsLoadError"), t("serverProblemMessage")));
    } finally {
      setIsAiCreditsLoading(false);
    }
  }

  async function fetchAccountWorkouts(session: UserSession) {
    const workouts = await accountDataApi.getWorkouts(
      getAuthHeaders(session),
      "Workout fetch failed"
    );
    return workouts.map(mapApiWorkoutToSavedWorkout);
  }

  async function synchronizeAccountWorkouts(session: UserSession, localWorkouts: SavedWorkout[]) {
    await accountDataApi.syncWorkouts(
      {
        deletedClientWorkoutIds: [],
        lastPulledAt: null,
        workouts: localWorkouts.map(mapSavedWorkoutToApiRequest)
      },
      getAuthHeaders(session),
      "Workout sync failed"
    );

    const accountWorkouts = await fetchAccountWorkouts(session);
    const mergedWorkouts = mergeWorkoutsById(accountWorkouts, localWorkouts);

    setSavedWorkouts(mergedWorkouts);
    setSelectedWorkoutId((current) =>
      current && mergedWorkouts.some((workout) => workout.id === current)
        ? current
        : mergedWorkouts[0]?.id ?? ""
    );
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
    return normalizeApiUserSettings(responseBody);
  }

  async function saveAccountSettings(payload = buildCurrentSettingsPayload(), session = user) {
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
    const accountSettings = await fetchAccountSettings(session);

    if (!accountSettings) {
      await saveAccountSettings(buildCurrentSettingsPayload(), session);
      return;
    }

    if (getSettingsTimestamp(accountSettings.updatedAt ?? "") > getSettingsTimestamp(localSettingsUpdatedAt)) {
      applyAccountSettings(accountSettings);
      return;
    }

    await saveAccountSettings(buildCurrentSettingsPayload(), session);
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

  function updateStep(stepId: string, nextStep: WorkoutStep) {
    setWorkout((current) => ({
      ...current,
      steps: current.steps.map((step) => (step.id === stepId ? nextStep : step))
    }));
  }

  function removeStep(stepId: string) {
    setWorkout((current) => ({
      ...current,
      steps: current.steps.filter((step) => {
        if (step.id === stepId || step.parentStageId === stepId || step.parentSetId === stepId) {
          return false;
        }

        const parentSet = current.steps.find((item) => item.id === step.parentSetId);

        return parentSet?.parentStageId !== stepId;
      })
    }));
  }

  function moveStep(stepId: string, direction: -1 | 1) {
    setWorkout((current) => {
      const movedStep = current.steps.find((step) => step.id === stepId);

      if (!movedStep) {
        return current;
      }

      if (movedStep.kind === "exercise") {
        const elements = current.steps.filter(
          (step) => step.kind === "exercise" && step.parentSetId === movedStep.parentSetId
        );
        const currentIndex = elements.findIndex((step) => step.id === stepId);
        const nextIndex = currentIndex + direction;

        if (currentIndex < 0 || nextIndex < 0 || nextIndex >= elements.length) {
          return current;
        }

        const reorderedElements = [...elements];
        const [element] = reorderedElements.splice(currentIndex, 1);
        reorderedElements.splice(nextIndex, 0, element);

        return {
          ...current,
          steps: current.steps.map((step) => {
            if (step.kind !== "exercise" || step.parentSetId !== movedStep.parentSetId) {
              return step;
            }

            return reorderedElements.shift() ?? step;
          })
        };
      }

      if (movedStep.kind === "set") {
        const seriesGroups = current.steps
          .filter((step) => step.kind === "set" && step.parentStageId === movedStep.parentStageId)
          .map((set) => ({
            set,
            elements: current.steps.filter((step) => step.kind === "exercise" && step.parentSetId === set.id)
          }));
        const currentIndex = seriesGroups.findIndex((group) => group.set.id === stepId);
        const nextIndex = currentIndex + direction;

        if (currentIndex < 0 || nextIndex < 0 || nextIndex >= seriesGroups.length) {
          return current;
        }

        const reorderedGroups = [...seriesGroups];
        const [group] = reorderedGroups.splice(currentIndex, 1);
        reorderedGroups.splice(nextIndex, 0, group);
        const reorderedSetIds = new Set(seriesGroups.map((item) => item.set.id));

        return {
          ...current,
          steps: current.steps.flatMap((step) => {
            if (step.kind !== "set" || step.parentStageId !== movedStep.parentStageId) {
              return step.kind === "exercise" && step.parentSetId && reorderedSetIds.has(step.parentSetId)
                ? []
                : [step];
            }

            const nextGroup = reorderedGroups.shift();
            return nextGroup ? [nextGroup.set, ...nextGroup.elements] : [step];
          })
        };
      }

      const stageGroups = current.steps
        .filter((step) => step.kind === "stage")
        .map((stage) => ({
          stage,
          series: current.steps
            .filter((step) => step.kind === "set" && step.parentStageId === stage.id)
            .flatMap((set) => [
              set,
              ...current.steps.filter((step) => step.kind === "exercise" && step.parentSetId === set.id)
            ])
        }));
      const currentIndex = stageGroups.findIndex((group) => group.stage.id === stepId);
      const nextIndex = currentIndex + direction;

      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= stageGroups.length) {
        return current;
      }

      const reorderedGroups = [...stageGroups];
      const [group] = reorderedGroups.splice(currentIndex, 1);
      reorderedGroups.splice(nextIndex, 0, group);

      return {
        ...current,
        steps: reorderedGroups.flatMap((item) => [item.stage, ...item.series])
      };
    });
  }

  function openWorkoutBuilder() {
    setEditingWorkoutId(null);
    setWorkout(createDefaultWorkout());
    setActiveScreen("builder");
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

  function openWorkoutAiRewrite(workoutId = selectedWorkoutId) {
    if (!areOnlineFeaturesAvailable) {
      showOnlineFeatureUnavailableDialog();
      return;
    }

    if (!user) {
      setActiveScreen("profile");
      return;
    }

    setRewriteSourceWorkoutId(workoutId);
    setRewriteInstruction("");
    setRewriteError("");
    setRewriteProposedWorkout(null);
    setActiveScreen("workoutAiRewrite");
  }

  function handleWorkoutDetailAiRewrite(workoutId: string) {
    if (!areOnlineFeaturesAvailable) {
      showOnlineFeatureUnavailableDialog();
      return;
    }

    if (user && aiCreditBalance.balance < aiCreditBalance.rewriteCost) {
      setShowAiRewriteCreditTooltip(true);
      setTimeout(() => setShowAiRewriteCreditTooltip(false), 3000);
      return;
    }

    setShowAiRewriteCreditTooltip(false);
    openWorkoutAiRewrite(workoutId);
  }

  function startSelectedWorkoutSession(executionMode = resolveWorkoutStartExecutionMode(defaultWorkoutExecutionMode)) {
    const savedWorkout = savedWorkouts.find((item) => item.id === selectedWorkoutId);

    if (!savedWorkout) {
      return;
    }

    const session = createWorkoutSessionFromWorkout(savedWorkout.draft, savedWorkout.id, executionMode);

    if (!session.entries.length) {
      showInfoDialog(t("emptyWorkoutSession"));
      return;
    }

    setWorkoutSessions((current) => [session, ...current]);
    setActiveWorkoutSessionId(session.id);
    activeWorkoutSessionEntryIndexRef.current[session.id] = 0;
    setSessionEntryIndex(0);
    setIsPostWorkoutFillMode(false);
    setActiveScreen("workoutSession");
  }

  function continueActiveWorkoutSession(sessionId = activeWorkoutSessionId) {
    if (!sessionId) {
      return;
    }

    const session = visibleWorkoutSessions.find((item) => item.id === sessionId);

    if (session) {
      setSelectedWorkoutId(session.sourceWorkoutId);
    }

    setActiveWorkoutSessionId(sessionId);
    setSessionEntryIndex(clampWorkoutSessionEntryIndex(activeWorkoutSessionEntryIndexRef.current[sessionId] ?? sessionEntryIndex, session));
    setIsPostWorkoutFillMode(false);
    setActiveScreen("workoutSession");
  }

  function updateWorkoutSessionEntry(entryId: string, patch: Partial<WorkoutSessionEntry>) {
    if (!activeWorkoutSessionId) {
      return;
    }

    setWorkoutSessions((current) =>
      current.map((session) =>
        session.id === activeWorkoutSessionId
          ? {
              ...session,
              updatedAt: new Date().toISOString(),
              entries: session.entries.map((entry) => entry.id === entryId ? { ...entry, ...patch } : entry)
            }
          : session
      )
    );
  }

  function finishActiveWorkoutSession() {
    if (!activeWorkoutSession) {
      return;
    }

    const completed = completeWorkoutSession(activeWorkoutSession);
    setWorkoutSessions((current) => current.map((session) => session.id === completed.id ? completed : session));
    setSelectedWorkoutId(activeWorkoutSession.sourceWorkoutId);
    delete activeWorkoutSessionEntryIndexRef.current[activeWorkoutSession.id];
    setActiveWorkoutSessionId(null);
    setSessionEntryIndex(0);
    setIsPostWorkoutFillMode(false);
    setActiveScreen("workoutDetail");
    showInfoDialog(t("workoutSaved"));
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
          const deleted = markWorkoutSessionDeleted(activeWorkoutSession);
          setWorkoutSessions((current) => current.map((session) => session.id === deleted.id ? deleted : session));
          delete activeWorkoutSessionEntryIndexRef.current[activeWorkoutSession.id];
          setActiveWorkoutSessionId(null);
          setSessionEntryIndex(0);
          setIsPostWorkoutFillMode(false);
          setActiveScreen("home");
        }
      }
      ]
    });
  }

  function openWorkoutEditor(workoutId: string) {
    const savedWorkout = savedWorkouts.find((item) => item.id === workoutId);

    if (!savedWorkout) {
      return;
    }

    setSelectedWorkoutId(workoutId);
    setEditingWorkoutId(workoutId);
    setWorkout({
      ...savedWorkout.draft,
      steps: savedWorkout.draft.steps.map((step) => ({ ...step }))
    });
    setActiveScreen("builder");
  }

  function saveWorkout() {
    const normalizedName = workout.name.trim() || "Nowy trening";
    const existingWorkout = editingWorkoutId ? savedWorkouts.find((item) => item.id === editingWorkoutId) : null;
    const nextWorkout: SavedWorkout = {
      createdAt: existingWorkout?.createdAt ?? new Date().toISOString(),
      draft: {
        ...workout,
        name: normalizedName,
        steps: workout.steps.map((step) => ({ ...step }))
      },
      id: editingWorkoutId ?? `workout-${Date.now()}`,
      name: normalizedName
    };

    setSavedWorkouts((current) => {
      if (!editingWorkoutId) {
        return [nextWorkout, ...current];
      }

      return current.map((item) => (item.id === editingWorkoutId ? nextWorkout : item));
    });
    setSelectedWorkoutId(nextWorkout.id);
    setEditingWorkoutId(null);
    setActiveScreen("workoutDetail");

    upsertAccountWorkout(nextWorkout).catch((error) => {
      console.error("Failed to save workout to account", error);
    });
  }

  function submitWorkoutCreatorForm() {
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

    for (let attempt = 0; attempt < 360; attempt += 1) {
      if (!shouldContinue()) {
        return null;
      }

      let jobStatus;
      try {
        jobStatus = await workoutCreatorApi.getJob(jobId, {
          ...getAuthHeaders(user),
          "ngrok-skip-browser-warning": "true"
        }, t("aiCreatorSubmitError"));
      } catch (error) {
        if ((error as { status?: number }).status === 401) {
          throw new Error(t("aiRewriteSessionExpired"));
        }
        throw error;
      }

      if (jobStatus.status === "completed") {
        return jobStatus.result;
      }

      if (jobStatus.status === "failed") {
        throw new Error(jobStatus.error || t("aiCreatorSubmitError"));
      }

      await delay(5000);
    }

    throw new Error(t("aiCreatorSubmitError"));
  }

  async function resumePendingWorkoutCreatorJob(job: PendingWorkoutCreatorJob, shouldContinue: () => boolean = () => true) {
    if (pollingCreatorJobIdRef.current === job.jobId) {
      return;
    }

    pollingCreatorJobIdRef.current = job.jobId;
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
    } finally {
      if (pollingCreatorJobIdRef.current === job.jobId) {
        pollingCreatorJobIdRef.current = null;
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
          questionsAndAnswers
        }, {
          ...getAuthHeaders(user),
          "Content-Type": "application/json",
          "X-Idempotency-Key": `plan-${profileId ?? "profile"}-${Date.now()}`,
          "ngrok-skip-browser-warning": "true"
        }, t("aiCreatorSubmitError"));

      void fetchAiCredits(user);

      if (isWorkoutCreatorJobResponse(responseBody)) {
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

  function addStep(kind: WorkoutStepKind) {
    setWorkout((current) => {
      if (kind === "stage") {
        return {
          ...current,
          steps: [...current.steps, createStep({ kind, stageType: defaultStageType })]
        };
      }

      const lastStage = [...current.steps].reverse().find((step) => step.kind === "stage");

      if (lastStage) {
        return {
          ...current,
          steps: [...current.steps, createStep({ kind, parentStageId: lastStage.id, setCount: defaultSetCount })]
        };
      }

      const stage = createStep({ kind: "stage", stageType: defaultStageType });

      return {
        ...current,
        steps: [stage, createStep({ kind, parentStageId: stage.id, setCount: defaultSetCount })]
      };
    });
  }

  async function persistAuthSession(authResponse: AuthApiResponse) {
    const session = createUserSession(
      authResponse,
      authResponse.user.email.split("@")[0] || t("defaultUserName")
    );

    const payload: LocalAuthStorage = {
      updatedAt: new Date().toISOString(),
      user: authResponse.user,
      version: 2
    };

    await setSecureAuthToken(authResponse.token);
    await AsyncStorage.setItem(localAuthStorageKey, JSON.stringify(payload));
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
    try {
      const rawData = await AsyncStorage.getItem(localAuthStorageKey);
      const storedData = rawData ? JSON.parse(rawData) as LegacyLocalAuthStorage : null;
      if (storedData) {
        await AsyncStorage.setItem(localAuthStorageKey, JSON.stringify({
          updatedAt: new Date().toISOString(),
          user: {
            ...(isRecord(storedData.user) ? storedData.user : {}),
            avatarUpdatedAt: nextUser.avatarUpdatedAt ?? null,
            avatarUrl: nextUser.avatarUrl ?? null,
            createdOn: nextUser.createdOn ?? null,
            email: nextUser.email,
            emailVerified: nextUser.emailVerified,
            id: nextUser.id,
            modifiedOn: nextUser.modifiedOn ?? null,
            name: nextUser.name
          },
          version: 2
        } satisfies LocalAuthStorage));
      }
    } catch (error) {
      console.error("Failed to update cached auth user", error);
    }
  }

  async function requestEmailVerificationCode() {
    if (!user || user.emailVerified || isEmailVerificationSubmitting) return;
    setIsEmailVerificationSubmitting(true);
    setEmailVerificationMessage("");
    try {
      const fallbackMessage = language === "pl" ? "Nie udało się wysłać kodu." : "Could not send the code.";
      await authApi.requestEmailVerification(getAuthHeaders(user), fallbackMessage);
      setEmailVerificationMessage(language === "pl" ? "Nowy kod został wysłany." : "A new code has been sent.");
    } catch (error) {
      if ((error as { status?: number }).status === 401) {
        handleUnauthorizedSession();
        return;
      }
      setEmailVerificationMessage(getErrorMessageOrFallback(error, language === "pl" ? "Nie udało się wysłać kodu." : "Could not send the code.", t("serverProblemMessage")));
    } finally {
      setIsEmailVerificationSubmitting(false);
    }
  }

  async function confirmEmailVerificationCode() {
    if (!user || user.emailVerified || isEmailVerificationSubmitting) return;
    const code = emailVerificationCode.trim();
    if (!/^\d{6}$/.test(code)) {
      setEmailVerificationMessage(language === "pl" ? "Wpisz sześciocyfrowy kod." : "Enter the six-digit code.");
      return;
    }
    setIsEmailVerificationSubmitting(true);
    setEmailVerificationMessage("");
    try {
      const fallbackMessage = language === "pl" ? "Kod jest nieprawidłowy lub wygasł." : "The code is invalid or expired.";
      await authApi.confirmEmailVerification(code, getAuthHeaders(user), fallbackMessage);
      await updateStoredUserSession({ ...user, emailVerified: true });
      setEmailVerificationCode("");
      setEmailVerificationMessage("");
      setIsEmailVerificationOpen(false);
    } catch (error) {
      const status = (error as { status?: number }).status;
      if (status === 401) {
        handleUnauthorizedSession();
        return;
      }
      const fallbackMessage = language === "pl" ? "Nie udało się potwierdzić emaila." : "Could not verify email.";
      setEmailVerificationMessage(status === 400
        ? (language === "pl" ? "Kod jest nieprawidłowy lub wygasł." : "The code is invalid or expired.")
        : getErrorMessageOrFallback(error, fallbackMessage, t("serverProblemMessage")));
    } finally {
      setIsEmailVerificationSubmitting(false);
    }
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
      clearCachedAvatar(user.id);
      setCachedAvatarUri(null);
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

  async function fetchAuthSessions() {
    if (!user) {
      return;
    }

    setIsAuthActionSubmitting(true);
    setAuthError("");
    try {
      const sessions = await authApi.getSessions({
          ...getAuthHeaders(user),
          "X-Gymmin-Device-Name": getAuthDeviceName()
        }, t("authRequestError"));
      setActiveAuthSessions(sessions);
    } catch (error) {
      if ((error as { status?: number }).status === 401) {
        handleUnauthorizedSession();
        return;
      }
      setAuthError(getErrorMessageOrFallback(error, t("authRequestError"), t("serverProblemMessage")));
    } finally {
      setIsAuthActionSubmitting(false);
    }
  }

  async function revokeAuthSession(sessionId: string) {
    if (!user) {
      return;
    }

    try {
      await authApi.revokeSession(sessionId, getAuthHeaders(user), t("authRequestError"));
      setAuthMessage(t("sessionSignedOut"));
      if (activeAuthSessions.find((session) => session.id === sessionId)?.isCurrent) {
        logOut();
        return;
      }
      await fetchAuthSessions();
    } catch (error) {
      if ((error as { status?: number }).status === 401) {
        handleUnauthorizedSession();
        return;
      }
      setAuthError(getErrorMessageOrFallback(error, t("authRequestError"), t("serverProblemMessage")));
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

    Promise.all([
      AsyncStorage.removeItem(localAuthStorageKey),
      deleteSecureAuthToken()
    ]).catch((error) => {
      console.error("Failed to clear local auth", error);
    });
    workoutsInitialSync.reset();
    settingsInitialSync.reset();
    favoritesInitialSync.reset();
    workoutSessionsInitialSync.reset();
    achievementsInitialSync.reset();
    handledAccountPolicyUserIdRef.current = null;
    setFavoriteExercisesSyncStatus("local");
    setPendingCreatorJob(null);
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
        await Promise.all([
          AsyncStorage.removeItem(localAuthStorageKey),
          deleteSecureAuthToken()
        ]);
      } catch (authCleanupError) {
        console.error("Failed to clear auth after account deletion", authCleanupError);
      }

      workoutsInitialSync.reset();
      settingsInitialSync.reset();
      favoritesInitialSync.reset();
      workoutSessionsInitialSync.reset();
      achievementsInitialSync.reset();
      handledAccountPolicyUserIdRef.current = null;
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
      setAiCreditBalance(emptyAiCreditBalance);
      setAiCreditTransactions([]);
      setAiCreditsError("");
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

  function renderWorkoutSortActions() {
    return (
      <WorkoutSortActions
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
        savedWorkoutCount={savedWorkouts.length}
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
        savedWorkouts={savedWorkouts}
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
        activeSessionCard={renderActiveWorkoutSessionCard()}
        authPanel={authPanel}
        collapsedPanels={collapsedPanels}
        filteredWorkouts={filteredWorkouts}
        language={language}
        savedWorkouts={savedWorkouts}
        systemStatusCallout={renderSystemStatusCallout()}
        t={t}
        theme={theme}
        trainingFactPill={renderTrainingFactPill()}
        weeklyPlanCard={renderWeeklyPlanHomeCard()}
        workoutCreatorButton={renderWorkoutCreatorButton()}
        workoutSortActions={renderWorkoutSortActions()}
        onOpenAllWorkouts={() => setActiveScreen("workouts")}
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
      <WorkoutBuilderScreen
          defaultSetCount={defaultSetCount}
          defaultStageType={defaultStageType}
          defaultWeight={defaultWeight}
          isEditing={Boolean(editingWorkoutId)}
          favoriteExerciseIds={getValidFavoriteExerciseIds(favoriteExercises)}
          language={language}
          moveStep={moveStep}
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
        search={search}
        sortActions={renderWorkoutSortActions()}
        t={t}
        theme={theme}
        onChangeSearch={setSearch}
        onOpenHistory={() => openWorkoutHistory()}
        onOpenProgress={() => setActiveScreen("progress")}
        onOpenWorkout={openWorkoutDetail}
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
        onAvatarLoadError={() => setHasAvatarImageLoadFailed(true)}
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
        requestFinishActiveWorkoutSession={requestFinishActiveWorkoutSession}
        sessionEntryIndex={sessionEntryIndex}
        setIsPostWorkoutFillMode={setIsPostWorkoutFillMode}
        setSelectedExerciseMuscleStep={setSelectedExerciseMuscleStep}
        setSessionEntryIndex={setSessionEntryIndex}
        setWorkoutSessions={setWorkoutSessions}
        showRestTimer={showRestTimer}
        t={t}
        theme={theme}
        toggleReadOnlyWorkoutPanel={toggleReadOnlyWorkoutPanel}
        updateWorkoutSessionEntry={updateWorkoutSessionEntry}
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
                  onError={() => setHasAvatarImageLoadFailed(true)}
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
                  activeScreen === "builder"
                    ? stickyActionBottom + 118 - scrollViewportBottomMargin
                    : activeScreen === "workoutSession"
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
                  onOpenCredits={() => setActiveScreen("aiCredits")}
                  onOpenWorkouts={() => setActiveScreen("workouts")}
                  onProfileNameChange={setCreatorProfileName}
                  onReturnHome={returnToHomeFromCreator}
                  onSaveProfileAndSubmit={saveCreatorProfileAndSubmit}
                  onSendWithoutSaving={() => void finishWorkoutCreatorRequest()}
                  onShowOnlineUnavailable={showOnlineFeatureUnavailableDialog}
                  onSubmit={submitWorkoutCreatorForm}
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
                isAiRewriteCreditBlocked={Boolean(user && aiCreditBalance.balance < aiCreditBalance.rewriteCost)}
                isAiRewriteOnlineBlocked={!areOnlineFeaturesAvailable}
                isPanelCollapsed={isReadOnlyWorkoutPanelCollapsed}
                language={language}
                sessions={selectedWorkoutSessions}
                showAiRewriteCreditTooltip={showAiRewriteCreditTooltip}
                t={t}
                theme={theme}
                workout={selectedWorkout}
                onAiRewrite={handleWorkoutDetailAiRewrite}
                onDeleteWorkout={deleteWorkout}
                onEditWorkout={openWorkoutEditor}
                onOpenExercise={openExerciseDetail}
                onOpenHistory={openWorkoutHistory}
                onOpenSession={openWorkoutSessionDetail}
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

        {activeScreen === "builder" && (
          <View
            style={[
              styles.stickyActionBar,
              {
                backgroundColor: theme.background,
                borderTopColor: theme.border,
                bottom: stickyActionBottom
              }
            ]}
          >
            <View style={styles.stickyActionRow}>
              <AppButton
                icon="add"
                style={styles.stickySmallButton}
                theme={theme}
                onPress={() => addStep("stage")}
              >
                {t("stage")}
              </AppButton>
              <AppButton
                icon="add"
                style={styles.stickySmallButton}
                theme={theme}
                onPress={() => addStep("set")}
              >
                {t("set")}
              </AppButton>
              <AppButton
                icon="save-outline"
                style={styles.stickySaveButton}
                theme={theme}
                onPress={saveWorkout}
              >
                {t("saveWorkout")}
              </AppButton>
            </View>
          </View>
        )}

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
