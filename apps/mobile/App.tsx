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
import { applyAvatarResponse, buildAvatarImageSource, type AvatarResponse } from "./src/domain/avatar";
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
  loadAchievementsSyncState,
  loadUserAchievements,
  mergeAppUsageStats,
  mergeUserAchievements,
  saveAppUsageStats,
  saveAchievementsSyncState,
  saveUserAchievements,
  type AchievementsSyncState,
  type AppUsageStats,
  type UserAchievement
} from "./src/domain/achievements";
import {
  GoalType,
  StageType,
  TargetComparator,
  WorkoutDraft,
  WorkoutStep,
  WorkoutStepKind,
  createDefaultWorkout,
  createStep,
  hasUserDefinedWorkouts,
  normalizeWorkoutDraftExerciseIds
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
  getClientSessionId,
  getDeletedWorkoutSessionIds,
  getExerciseProgressItems,
  getExerciseProgressSummary,
  getSessionDurationMs,
  getSessionStartedAtTime,
  getWorkoutSessionStatusLabel,
  getWorkoutSessionUpdatedAt,
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
  getDeletedFavoriteExerciseIds,
  getFavoriteCatalogExercises,
  getValidFavoriteExerciseIds,
  isExerciseFavorite,
  loadFavoriteExercises,
  loadFavoriteExercisesSyncMetadata,
  mergeFavoriteExercises,
  removeFavoriteExercise,
  saveFavoriteExercises,
  saveFavoriteExercisesSyncMetadata,
  toggleFavoriteExercise,
  FAVORITE_EXERCISES_LEGACY_STORAGE_KEY,
  FAVORITE_EXERCISES_LEGACY_SYNC_STORAGE_KEY,
  FAVORITE_EXERCISES_STORAGE_BASE_KEY,
  FAVORITE_EXERCISES_SYNC_STORAGE_BASE_KEY
} from "./src/domain/favoriteExercises";
import type { FavoriteExercise } from "./src/domain/favoriteExercises";
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
  getDiagnosticsSnapshot,
  recordApiError,
  recordCorrelationId
} from "./src/domain/appDiagnostics";
import {
  emptyAiCreditBalance,
  isInsufficientAiCreditsError,
  normalizeAiCreditPurchaseVerifyResponse,
  normalizeAiCreditBalance,
  normalizeAiCreditPacks,
  normalizeAiCreditTransactions
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
import {
  createOfflineSystemStatus,
  normalizeSystemStatusResponse,
  shouldFetchSystemStatus,
  type SystemStatusState
} from "./src/domain/systemStatus";
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
import { getScreenTitle, navItems, type ScreenKey } from "./src/navigation/appNavigation";
import { styles } from "./src/theme/appStyles";
import { themes, type Theme, type ThemeName } from "./src/theme/theme";

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
const workoutExecutionModeValues: WorkoutExecutionMode[] = ["guided", "readonly-post-workout", "inline-table"];

const localWorkoutsLegacyStorageKey = "gymmin.localWorkouts.v1";
const localWorkoutsStorageBaseKey = "localWorkouts.v1";
const workoutSessionsLegacyStorageKey = "gymmin.workoutSessions";
// TODO: per-user local storage for account-scoped workout sessions and richer conflict UX.
const activeWorkoutSessionStorageBaseKey = "activeWorkoutSession.v1";
const localSettingsLegacyStorageKey = "gymmin.localSettings.v1";
const localSettingsStorageBaseKey = "localSettings.v1";
const localCreatorProfilesLegacyStorageKey = "gymmin.localCreatorProfiles.v1";
const localCreatorProfilesStorageBaseKey = "localCreatorProfiles.v1";
const localCreatorJobLegacyStorageKey = "gymmin.localCreatorJob.v1";
const localCreatorJobStorageBaseKey = "localCreatorJob.v1";
const localWeeklyPlanStorageBaseKey = WEEKLY_PLAN_STORAGE_BASE_KEY;
const anonymousMergeHandledStorageBaseKey = "anonymousMergeHandled.v1";
const localAuthStorageKey = "gymmin.localAuth.v1";
const workoutSessionSyncActiveDebounceMs = 1600;
const workoutSessionSyncIdleDebounceMs = 250;

declare const process: { env?: Record<string, string | undefined> } | undefined;

function getDefaultApiBaseUrl() {
  if (BUILD_API_BASE_URL.trim()) {
    return BUILD_API_BASE_URL.trim().replace(/\/+$/, "");
  }

  const configuredApiBaseUrl = typeof process !== "undefined"
    ? process.env?.EXPO_PUBLIC_API_BASE_URL?.trim()
    : "";

  if (configuredApiBaseUrl) {
    return configuredApiBaseUrl.replace(/\/+$/, "");
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

function isLanguageCode(value: unknown): value is LanguageCode {
  return value === "pl" || value === "en";
}

function isThemeName(value: unknown): value is ThemeName {
  return value === "light" || value === "dark";
}

function isStageType(value: unknown): value is StageType {
  return typeof value === "string" && stageTypeValues.includes(value as StageType);
}

function isWorkoutExecutionMode(value: unknown): value is WorkoutExecutionMode {
  return typeof value === "string" && workoutExecutionModeValues.includes(value as WorkoutExecutionMode);
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

function normalizeCollapsedPanels(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return defaultCollapsedPanels;
  }

  const storedPanels = Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean")
  );

  return {
    ...defaultCollapsedPanels,
    ...storedPanels
  };
}

type WorkoutTableOrientation = "vertical" | "horizontal";

function isWorkoutTableOrientation(value: unknown): value is WorkoutTableOrientation {
  return value === "vertical" || value === "horizontal";
}

type ApiWorkoutStep = {
  clientStepId: string;
  exerciseId?: string;
  exerciseName?: string;
  goalType?: GoalType | null;
  kind: WorkoutStepKind;
  label?: string;
  loadKg?: string;
  notes?: string;
  parentSetClientId?: string;
  parentStageClientId?: string;
  setCount?: string;
  stageType?: StageType | null;
  targetComparator?: TargetComparator | null;
  targetValue?: string;
};

type ApiWorkout = {
  clientWorkoutId: string;
  createdAt?: string;
  name: string;
  notes?: string;
  sport: "strength";
  steps: ApiWorkoutStep[];
};

type ApiUserSettings = {
  collapsedPanels?: Record<string, boolean>;
  defaultSetCount?: string;
  defaultStageType?: StageType | "" | null;
  defaultWorkoutTableOrientation?: WorkoutTableOrientation | null;
  defaultWorkoutExecutionMode?: WorkoutExecutionMode | null;
  showRestTimer?: boolean;
  defaultWeight?: string;
  isAuthPanelDismissed?: boolean;
  language?: LanguageCode;
  themeName?: ThemeName;
  updatedAt?: string;
  workoutReminders?: WorkoutReminderSettings;
};

type ApiFavoriteExercisesResponse = {
  favorites?: FavoriteExercise[];
  serverTime?: string;
};

type ApiWorkoutSessionEnvelope = {
  clientSessionId: string;
  clientUpdatedAt?: string;
  deletedAt?: string | null;
  serverUpdatedAt?: string;
  session?: WorkoutSession;
};

type ApiWorkoutSessionsResponse = {
  sessions?: ApiWorkoutSessionEnvelope[];
  serverTime?: string;
};

type WorkoutSessionsSyncMetadata = {
  lastPulledAt?: string | null;
  lastPushedAt?: string | null;
  userId?: string | null;
};

type LocalWorkoutsStorage = {
  selectedWorkoutId: string;
  sort?: WorkoutSortSettings;
  updatedAt: string;
  version: 1;
  workouts: SavedWorkout[];
};

type LocalWorkoutSessionsStorage = {
  sessions: WorkoutSession[];
  updatedAt: string;
  version: 1;
};

type LocalActiveWorkoutSessionStorage = {
  entryIndex: number;
  sessionId: string | null;
  updatedAt: string;
  version: 1;
};

function clampWorkoutSessionEntryIndex(entryIndex: unknown, session?: WorkoutSession | null) {
  const parsed = typeof entryIndex === "number" ? entryIndex : Number.parseInt(String(entryIndex ?? ""), 10);
  const safeIndex = Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
  const maxIndex = Math.max(0, (session?.entries.length ?? 1) - 1);
  return Math.min(safeIndex, maxIndex);
}

function repairTextEncoding(value: string) {
  if (!/[\u00c2-\u00c5\u00e2]/.test(value)) {
    return value;
  }

  const replacements: Array<[string, string]> = [
    ["\u00c4\u2026", "\u0105"],
    ["\u00c4\u2021", "\u0107"],
    ["\u00c4\u2122", "\u0119"],
    ["\u00c5\u201a", "\u0142"],
    ["\u00c5\u201e", "\u0144"],
    ["\u00c3\u00b3", "\u00f3"],
    ["\u00c5\u203a", "\u015b"],
    ["\u00c5\u00ba", "\u017a"],
    ["\u00c5\u00bc", "\u017c"],
    ["\u00c4\u201e", "\u0104"],
    ["\u00c4\u2020", "\u0106"],
    ["\u00c4\u02dc", "\u0118"],
    ["\u00c5\u0081", "\u0141"],
    ["\u00c5\u0192", "\u0143"],
    ["\u00c3\u201c", "\u00d3"],
    ["\u00c5\u0160", "\u015a"],
    ["\u00c5\u00b9", "\u0179"],
    ["\u00c5\u00bb", "\u017b"],
    ["\u00e2\u20ac\u017e", "\u201e"],
    ["\u00e2\u20ac\u0153", "\u201c"],
    ["\u00e2\u20ac\u009d", "\u201d"],
    ["\u00e2\u20ac\u2122", "\u2019"],
    ["\u00e2\u20ac\u02dc", "\u2018"],
    ["\u00e2\u20ac\u201c", "-"],
    ["\u00e2\u20ac\u201d", "-"],
    ["\u00e2\u2020\u2019", "\u2192"],
    ["\u00c2\u00b7", "\u00b7"],
    ["\u00c2\u00ae", "\u00ae"],
    ["\u00c2\u00b0", "\u00b0"],
    ["\u00c2\u00a0", " "]
  ];

  return replacements.reduce((text, [from, to]) => text.split(from).join(to), value);
}

function normalizeWorkoutDraftTextFields(draft: WorkoutDraft): WorkoutDraft {
  const normalizedDraft = normalizeWorkoutDraftExerciseIds(draft);
  return {
    ...normalizedDraft,
    name: repairTextEncoding(draft.name),
    notes: repairTextEncoding(draft.notes),
    steps: normalizedDraft.steps.map((step) => ({
      ...step,
      exerciseName: repairTextEncoding(step.exerciseName),
      label: repairTextEncoding(step.label),
      loadKg: repairTextEncoding(step.loadKg),
      notes: repairTextEncoding(step.notes),
      setCount: repairTextEncoding(step.setCount),
      targetValue: repairTextEncoding(step.targetValue)
    }))
  };
}

function normalizeSavedWorkoutTextFields(workout: SavedWorkout): SavedWorkout {
  const draft = normalizeWorkoutDraftTextFields(workout.draft);

  return {
    ...workout,
    createdAt: normalizeDateString(workout.createdAt) ?? getFallbackWorkoutCreatedAt(workout),
    draft,
    name: repairTextEncoding(workout.name || draft.name)
  };
}

function normalizeDateString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

function getFallbackWorkoutCreatedAt(workout: Pick<SavedWorkout, "id">) {
  const timestampMatch = workout.id.match(/(\d{10,})/);
  if (timestampMatch) {
    const timestamp = Number(timestampMatch[1]);
    if (Number.isFinite(timestamp)) {
      return new Date(timestamp).toISOString();
    }
  }

  return new Date(0).toISOString();
}

const defaultWorkoutSort: WorkoutSortSettings = {
  direction: "desc",
  field: "createdAt"
};

function normalizeWorkoutSortSettings(value: unknown): WorkoutSortSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return defaultWorkoutSort;
  }

  const candidate = value as Partial<WorkoutSortSettings>;
  return {
    direction: candidate.direction === "asc" || candidate.direction === "desc"
      ? candidate.direction
      : defaultWorkoutSort.direction,
    field: candidate.field === "name" || candidate.field === "createdAt"
      ? candidate.field
      : defaultWorkoutSort.field
  };
}

function compareWorkouts(left: SavedWorkout, right: SavedWorkout, sort: WorkoutSortSettings) {
  const directionMultiplier = sort.direction === "asc" ? 1 : -1;
  const nameCompare = left.name.localeCompare(right.name, undefined, { sensitivity: "base" });

  if (sort.field === "name") {
    return (nameCompare || left.id.localeCompare(right.id)) * directionMultiplier;
  }

  const leftCreatedAt = Date.parse(left.createdAt ?? getFallbackWorkoutCreatedAt(left));
  const rightCreatedAt = Date.parse(right.createdAt ?? getFallbackWorkoutCreatedAt(right));
  const dateCompare = (leftCreatedAt || 0) - (rightCreatedAt || 0);
  return (dateCompare || nameCompare || left.id.localeCompare(right.id)) * directionMultiplier;
}

type LocalSettingsStorage = {
  collapsedPanels: Record<string, boolean>;
  defaultSetCount: string;
  defaultStageType: StageType | "";
  defaultWorkoutTableOrientation: WorkoutTableOrientation;
  defaultWorkoutExecutionMode: WorkoutExecutionMode;
  showRestTimer: boolean;
  defaultWeight: string;
  isAuthPanelDismissed: boolean;
  language: LanguageCode;
  themeName: ThemeName;
  updatedAt: string;
  version: 1;
  workoutReminders: WorkoutReminderSettings;
};

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

function mapSavedWorkoutToApiRequest(workout: SavedWorkout) {
  const normalizedWorkout = normalizeSavedWorkoutTextFields(workout);

  return {
    clientUpdatedAt: new Date().toISOString(),
    clientWorkoutId: normalizedWorkout.id,
    createdAt: normalizedWorkout.createdAt ?? getFallbackWorkoutCreatedAt(normalizedWorkout),
    name: normalizedWorkout.name || normalizedWorkout.draft.name || "Workout",
    notes: normalizedWorkout.draft.notes ?? "",
    sport: normalizedWorkout.draft.sport,
    steps: normalizedWorkout.draft.steps.map((step) => ({
      clientStepId: step.id,
      exerciseId: step.exerciseId ?? "",
      exerciseName: step.exerciseName,
      goalType: step.goalType || null,
      kind: step.kind,
      label: step.label,
      loadKg: step.loadKg,
      notes: step.notes,
      parentSetClientId: step.parentSetId ?? "",
      parentStageClientId: step.parentStageId ?? "",
      setCount: step.setCount,
      stageType: step.stageType || null,
      targetComparator: step.targetComparator || null,
      targetValue: step.targetValue
    }))
  };
}

function mapApiWorkoutToSavedWorkout(apiWorkout: ApiWorkout): SavedWorkout {
  const steps = Array.isArray(apiWorkout.steps) ? apiWorkout.steps : [];
  const name = repairTextEncoding(apiWorkout.name || "Workout");

  return normalizeSavedWorkoutTextFields({
    draft: {
      name,
      notes: repairTextEncoding(apiWorkout.notes ?? ""),
      sport: "strength",
      steps: steps.map((step) => ({
        exerciseId: step.exerciseId ?? findCatalogExerciseBestEffort(step.exerciseName ?? "")?.id ?? "",
        exerciseName: repairTextEncoding(step.exerciseName ?? ""),
        goalType: step.goalType ?? "",
        id: step.clientStepId,
        intensity: "moderate",
        kind: step.kind,
        label: repairTextEncoding(step.label ?? ""),
        loadKg: repairTextEncoding(step.loadKg ?? ""),
        notes: repairTextEncoding(step.notes ?? ""),
        parentSetId: step.parentSetClientId || undefined,
        parentStageId: step.parentStageClientId || undefined,
        setCount: repairTextEncoding(step.setCount ?? ""),
        stageType: step.stageType ?? "",
        targetComparator: step.targetComparator ?? "",
        targetValue: repairTextEncoding(step.targetValue ?? "")
      }))
    },
    createdAt: normalizeDateString(apiWorkout.createdAt) ?? getFallbackWorkoutCreatedAt({ id: apiWorkout.clientWorkoutId }),
    id: apiWorkout.clientWorkoutId,
    name
  });
}

function mergeWorkoutsById(primary: SavedWorkout[], fallback: SavedWorkout[]) {
  const seen = new Set<string>();
  const result: SavedWorkout[] = [];

  [...primary, ...fallback].forEach((workout) => {
    if (seen.has(workout.id)) {
      return;
    }

    seen.add(workout.id);
    result.push(normalizeSavedWorkoutTextFields(workout));
  });

  return result;
}

function normalizeApiUserSettings(value: unknown): ApiUserSettings | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    collapsedPanels: normalizeCollapsedPanels(value.collapsedPanels),
    defaultSetCount: typeof value.defaultSetCount === "string" ? value.defaultSetCount : "",
    defaultStageType:
      value.defaultStageType === null || value.defaultStageType === "" || value.defaultStageType === undefined
        ? ""
        : isStageType(value.defaultStageType)
          ? value.defaultStageType
          : "",
    defaultWorkoutExecutionMode: isWorkoutExecutionMode(value.defaultWorkoutExecutionMode)
      ? value.defaultWorkoutExecutionMode
      : "guided",
    defaultWorkoutTableOrientation: isWorkoutTableOrientation(value.defaultWorkoutTableOrientation)
      ? value.defaultWorkoutTableOrientation
      : "vertical",
    showRestTimer: value.showRestTimer !== false,
    defaultWeight: typeof value.defaultWeight === "string" ? value.defaultWeight : "",
    isAuthPanelDismissed: value.isAuthPanelDismissed === true,
    language: isLanguageCode(value.language) ? value.language : "en",
    themeName: isThemeName(value.themeName) ? value.themeName : "light",
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : new Date().toISOString(),
    workoutReminders: normalizeWorkoutReminderSettings(value.workoutReminders, isLanguageCode(value.language) ? value.language : "en")
  };
}

function normalizeApiFavoriteExercisesResponse(value: unknown): ApiFavoriteExercisesResponse {
  if (!isRecord(value)) {
    return { favorites: [] };
  }

  const favorites = Array.isArray(value.favorites)
    ? value.favorites
        .filter(isRecord)
        .map((favorite) => {
          const createdAt = typeof favorite.createdAt === "string" ? favorite.createdAt : new Date().toISOString();

          return {
            createdAt,
            deletedAt: typeof favorite.deletedAt === "string" ? favorite.deletedAt : null,
            exerciseId: typeof favorite.exerciseId === "string" ? favorite.exerciseId : "",
            updatedAt: typeof favorite.updatedAt === "string" ? favorite.updatedAt : createdAt
          };
        })
    : [];

  return {
    favorites,
    serverTime: typeof value.serverTime === "string" ? value.serverTime : undefined
  };
}

function normalizeApiWorkoutSessionsResponse(value: unknown): ApiWorkoutSessionsResponse {
  if (!isRecord(value)) {
    return { sessions: [] };
  }

  const sessions = Array.isArray(value.sessions)
    ? value.sessions
        .filter(isRecord)
        .map((envelope): ApiWorkoutSessionEnvelope | null => {
          const clientSessionId = normalizeApiString(envelope.clientSessionId);
          if (!clientSessionId) {
            return null;
          }

          const normalizedSession = normalizeWorkoutSessions([
            isRecord(envelope.session)
              ? {
                  ...envelope.session,
                  deletedAt: typeof envelope.deletedAt === "string" ? envelope.deletedAt : (envelope.session.deletedAt ?? null),
                  id: clientSessionId,
                  updatedAt: typeof envelope.clientUpdatedAt === "string"
                    ? envelope.clientUpdatedAt
                    : typeof envelope.session.updatedAt === "string"
                      ? envelope.session.updatedAt
                      : undefined
                }
              : null
          ])[0];

          if (!normalizedSession) {
            return null;
          }

          return {
            clientSessionId,
            clientUpdatedAt: typeof envelope.clientUpdatedAt === "string" ? envelope.clientUpdatedAt : normalizedSession.updatedAt,
            deletedAt: typeof envelope.deletedAt === "string" ? envelope.deletedAt : null,
            serverUpdatedAt: typeof envelope.serverUpdatedAt === "string" ? envelope.serverUpdatedAt : undefined,
            session: normalizedSession
          };
        })
        .filter((envelope): envelope is ApiWorkoutSessionEnvelope => envelope !== null)
    : [];

  return {
    sessions,
    serverTime: typeof value.serverTime === "string" ? value.serverTime : undefined
  };
}

function getSettingsTimestamp(value: string) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeApiString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeApiPositiveNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }

  if (typeof value === "string") {
    const match = value.replace(",", ".").match(/\d+(\.\d+)?/);
    const parsedValue = match ? Number(match[0]) : Number.NaN;

    return Number.isFinite(parsedValue) && parsedValue > 0 ? Math.round(parsedValue) : undefined;
  }

  return undefined;
}

function normalizeApiKey(key: string) {
  return key
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getApiValue(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (key in record) {
      return record[key];
    }
  }

  const normalizedKeys = new Set(keys.map(normalizeApiKey));
  const matchingKey = Object.keys(record).find((key) => normalizedKeys.has(normalizeApiKey(key)));

  return matchingKey ? record[matchingKey] : undefined;
}

function getApiString(record: Record<string, unknown>, keys: string[]) {
  return normalizeApiString(getApiValue(record, keys));
}

function getApiRecordArray(record: Record<string, unknown>, keys: string[]) {
  const value = getApiValue(record, keys);

  return Array.isArray(value) ? value.filter(isRecord) as Record<string, unknown>[] : [];
}

function parseLooseJsonText(text: string): unknown | null {
  const trimmedText = text.trim();

  if (!trimmedText) {
    return null;
  }

  const candidates = [trimmedText];
  const fencedMatch = trimmedText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);

  if (fencedMatch?.[1]) {
    candidates.push(fencedMatch[1].trim());
  }

  const firstArrayIndex = trimmedText.indexOf("[");
  const lastArrayIndex = trimmedText.lastIndexOf("]");
  if (firstArrayIndex >= 0 && lastArrayIndex > firstArrayIndex) {
    candidates.push(trimmedText.slice(firstArrayIndex, lastArrayIndex + 1));
  }

  const firstObjectIndex = trimmedText.indexOf("{");
  const lastObjectIndex = trimmedText.lastIndexOf("}");
  if (firstObjectIndex >= 0 && lastObjectIndex > firstObjectIndex) {
    candidates.push(trimmedText.slice(firstObjectIndex, lastObjectIndex + 1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as unknown;
    } catch {
      // Try next shape.
    }
  }

  return null;
}

function extractApiWorkoutList(responseBody: unknown): WorkoutCreatorApiWorkout[] {
  if (Array.isArray(responseBody)) {
    return responseBody.filter(isRecord) as WorkoutCreatorApiWorkout[];
  }

  if (!isRecord(responseBody)) {
    return [];
  }

  const directWorkoutKeys = ["workouts", "treningi", "plans", "plan", "items", "data", "dni"];
  for (const key of directWorkoutKeys) {
    const directWorkouts = getApiRecordArray(responseBody, [key]);

    if (directWorkouts.length) {
      return directWorkouts as WorkoutCreatorApiWorkout[];
    }
  }


  const wrappedResult = getApiValue(responseBody, ["result"]);
  if (isRecord(wrappedResult) || Array.isArray(wrappedResult)) {
    const wrappedWorkouts = extractApiWorkoutList(wrappedResult);
    if (wrappedWorkouts.length) {
      return wrappedWorkouts;
    }
  }
  if (getApiRecordArray(responseBody, ["cwiczenia", "ćwiczenia", "exercises"]).length) {
    return [responseBody as WorkoutCreatorApiWorkout];
  }

  const planText = getApiString(responseBody, ["planText", "outputText", "text", "content", "response"]);
  const parsedPlanText = parseLooseJsonText(planText);

  if (parsedPlanText !== null) {
    return extractApiWorkoutList(parsedPlanText);
  }

  return [];
}

function getApiPlanText(responseBody: unknown) {
  if (!isRecord(responseBody)) {
    return "";
  }

  const planText = getApiString(responseBody, ["planText", "outputText", "text", "content", "response"]);

  if (planText) {
    return planText;
  }

  try {
    return JSON.stringify(responseBody, null, 2);
  } catch {
    return "";
  }
}

function getWorkoutCreatorJobId(responseBody: unknown) {
  if (!isRecord(responseBody)) {
    return "";
  }

  return getApiString(responseBody, ["jobId", "id"]);
}

function isWorkoutCreatorJobResponse(responseBody: unknown) {
  if (!isRecord(responseBody)) {
    return false;
  }

  const status = getApiString(responseBody, ["status"]).toLowerCase();

  return Boolean(getWorkoutCreatorJobId(responseBody)) && (status === "processing" || status === "queued");
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

function formatSecondsAsTimeTarget(totalSeconds: number) {
  const normalizedSeconds = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(normalizedSeconds / 3600);
  const minutes = Math.floor((normalizedSeconds % 3600) / 60);
  const seconds = normalizedSeconds % 60;

  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

function getCanonicalExerciseName(name: string) {
  return findCatalogExerciseBestEffort(name)?.name ?? name;
}

function getCanonicalExerciseId(name: string) {
  return findCatalogExerciseBestEffort(name)?.id ?? "";
}

function createAiWarmupSteps(workoutId: string): WorkoutStep[] {
  const warmupStageId = `${workoutId}-stage-warmup`;
  const warmupSetId = `${workoutId}-set-warmup`;

  return [
    createStep({
      goalType: "",
      id: warmupStageId,
      kind: "stage",
      label: "Rozgrzewka",
      notes: "",
      stageType: "warmup",
      targetValue: ""
    }),
    createStep({
      goalType: "",
      id: warmupSetId,
      kind: "set",
      notes: "",
      parentStageId: warmupStageId,
      setCount: "1",
      stageType: "warmup",
      targetValue: ""
    }),
    createStep({
      exerciseId: getCanonicalExerciseId("Trucht"),
      exerciseName: getCanonicalExerciseName("Trucht"),
      goalType: "time",
      id: `${workoutId}-warmup-jog`,
      kind: "exercise",
      notes: "",
      parentSetId: warmupSetId,
      stageType: "exercise",
      targetValue: "00:05:00"
    }),
    createStep({
      exerciseId: getCanonicalExerciseId("Krążenie ramionami"),
      exerciseName: getCanonicalExerciseName("Krążenie ramionami"),
      goalType: "repetitions",
      id: `${workoutId}-warmup-arm-circles`,
      kind: "exercise",
      notes: "",
      parentSetId: warmupSetId,
      stageType: "exercise",
      targetValue: "10"
    }),
    createStep({
      exerciseId: getCanonicalExerciseId("Rotacja klatki piersiowej"),
      exerciseName: getCanonicalExerciseName("Rotacja klatki piersiowej"),
      goalType: "repetitions",
      id: `${workoutId}-warmup-thoracic-rotation`,
      kind: "exercise",
      notes: "Na stronę",
      parentSetId: warmupSetId,
      stageType: "exercise",
      targetValue: "10"
    }),
    createStep({
      exerciseId: getCanonicalExerciseId("Krążenie biodrami"),
      exerciseName: getCanonicalExerciseName("Krążenie biodrami"),
      goalType: "repetitions",
      id: `${workoutId}-warmup-hip-circles`,
      kind: "exercise",
      notes: "Na stronę",
      parentSetId: warmupSetId,
      stageType: "exercise",
      targetValue: "10"
    }),
    createStep({
      exerciseId: getCanonicalExerciseId("Wykroki z rozciąganiem skrętnym kręgosłupa"),
      exerciseName: getCanonicalExerciseName("Wykroki z rozciąganiem skrętnym kręgosłupa"),
      goalType: "repetitions",
      id: `${workoutId}-warmup-lunge-twist`,
      kind: "exercise",
      notes: "Na stronę",
      parentSetId: warmupSetId,
      stageType: "exercise",
      targetValue: "7"
    })
  ];
}

function createAiButtonPressWarmupSteps(workoutId: string): WorkoutStep[] {
  const warmupStageId = `${workoutId}-stage-warmup`;
  const warmupSetId = `${workoutId}-set-warmup`;

  return [
    createStep({
      goalType: "",
      id: warmupStageId,
      kind: "stage",
      label: "Rozgrzewka",
      notes: "",
      stageType: "warmup",
      targetValue: ""
    }),
    createStep({
      goalType: "",
      id: warmupSetId,
      kind: "set",
      notes: "",
      parentStageId: warmupStageId,
      setCount: "1",
      stageType: "warmup",
      targetValue: ""
    }),
    createStep({
      goalType: "buttonPress",
      id: `${workoutId}-warmup-button-press`,
      kind: "exercise",
      notes: "",
      parentSetId: warmupSetId,
      stageType: "warmup",
      targetValue: ""
    })
  ];
}

type AiWarmupImportMode = "ready" | "button" | "none";

function createSavedWorkoutsFromApiResponse(responseBody: unknown, warmupMode: AiWarmupImportMode): SavedWorkout[] {
  const apiWorkouts = extractApiWorkoutList(responseBody);
  const now = Date.now();

  return apiWorkouts.flatMap((apiWorkout, workoutIndex) => {
    const name = getApiString(apiWorkout, ["nazwa", "name", "title", "tytul", "tytuł"]) || `Trening ${workoutIndex + 1}`;
    const exercises = getApiRecordArray(apiWorkout, [
      "cwiczenia",
      "ćwiczenia",
      "exercises",
      "items",
      "elementy"
    ]) as WorkoutCreatorApiExercise[];

    if (!exercises.length) {
      return [];
    }

    const workoutId = `ai-workout-${now}-${workoutIndex}`;
    const stageId = `${workoutId}-stage-main`;
    const steps: WorkoutStep[] = [
      ...(warmupMode === "ready"
        ? createAiWarmupSteps(workoutId)
        : warmupMode === "button"
          ? createAiButtonPressWarmupSteps(workoutId)
          : []),
      createStep({
        goalType: "",
        id: stageId,
        kind: "stage",
        label: "Ćwiczenia",
        notes: "",
        stageType: "exercise",
        targetValue: ""
      })
    ];

    exercises.forEach((apiExercise, exerciseIndex) => {
      const apiExerciseName = getApiString(apiExercise, [
        "nazwaCwiczenia",
        "nazwaĆwiczenia",
        "exerciseName",
        "name",
        "nazwa"
      ]);
      // TODO: improve Garmin-compatible mapping for AI exercise names that do not match catalog ids/names.
      const catalogExercise = findCatalogExerciseBestEffort(apiExerciseName);
      const exerciseName = catalogExercise?.name ?? apiExerciseName;
      const setCount = String(
        normalizeApiPositiveNumber(getApiValue(apiExercise, ["liczbaSerii", "sets", "setCount"])) ?? 1
      );
      const repetitions = normalizeApiPositiveNumber(
        getApiValue(apiExercise, ["liczbaPowtorzen", "liczbaPowtórzeń", "reps", "repetitions"])
      );
      const restSeconds = normalizeApiPositiveNumber(
        getApiValue(apiExercise, [
          "odpoczynekMiedzySeriamiWSekundach",
          "odpoczynekMiędzySeriamiWSekundach",
          "restSeconds",
          "restBetweenSetsSeconds"
        ])
      );
      const notes = getApiString(apiExercise, ["uwagi", "notes", "opis", "description"]);
      const setId = `${workoutId}-set-${exerciseIndex}`;
      const elementId = `${workoutId}-element-${exerciseIndex}`;
      const restElementId = `${workoutId}-rest-${exerciseIndex}`;

      steps.push(
        createStep({
          exerciseId: catalogExercise?.id ?? "",
          exerciseName,
          goalType: repetitions ? "repetitions" : "",
          id: setId,
          kind: "set",
          notes,
          parentStageId: stageId,
          setCount,
          stageType: "exercise",
          targetValue: repetitions ? String(repetitions) : ""
        }),
        createStep({
          exerciseId: catalogExercise?.id ?? "",
          exerciseName,
          goalType: repetitions ? "repetitions" : "",
          id: elementId,
          kind: "exercise",
          notes,
          parentSetId: setId,
          stageType: "exercise",
          targetValue: repetitions ? String(repetitions) : ""
        })
      );

      if (restSeconds) {
        steps.push(
          createStep({
            goalType: "time",
            id: restElementId,
            kind: "exercise",
            parentSetId: setId,
            stageType: "rest",
            targetValue: formatSecondsAsTimeTarget(restSeconds)
          })
        );
      }
    });

    const draft: WorkoutDraft = {
      name,
      notes: getApiString(apiWorkout, ["uwagi", "notes", "opis", "description"]),
      sport: "strength",
      steps
    };

    return [{
      createdAt: new Date(now + workoutIndex).toISOString(),
      draft,
      id: workoutId,
      name
    }];
  });
}

function isNetworkRequestFailure(error: unknown) {
  return error instanceof Error && /network request failed/i.test(error.message);
}

function getErrorMessageOrFallback(error: unknown, fallback: string, networkFallback: string) {
  if (isNetworkRequestFailure(error)) {
    return networkFallback;
  }

  return error instanceof Error ? error.message : fallback;
}
type UserSession = {
  avatarUpdatedAt?: string | null;
  avatarUrl?: string | null;
  createdOn?: string | null;
  email: string;
  id: string;
  modifiedOn?: string | null;
  name: string;
  token: string;
};
type WorkoutCreatorQuestionAnswer = {
  Question: string;
  Answer: string;
};
type WorkoutCreatorPlanResponse = {
  model: string;
  planText?: string;
  prompt: string;
  reasoningEffort: string;
  status: string;
};
type WorkoutCreatorApiExercise = Record<string, unknown> & {
  liczbaPowtorzen?: unknown;
  liczbaSerii?: unknown;
  nazwaCwiczenia?: unknown;
  odpoczynekMiedzySeriamiWSekundach?: unknown;
  uwagi?: unknown;
};
type WorkoutCreatorApiWorkout = Record<string, unknown> & {
  cwiczenia?: unknown;
  nazwa?: unknown;
  uwagi?: unknown;
};

type LocalCreatorProfilesStorage = {
  profiles: WorkoutCreatorProfile[];
  selectedProfileId: string | null;
  updatedAt: string;
  version: 1;
};

type ActiveWorkoutCreatorJob =
  | {
      createdAt: string;
      jobId: string;
      profileId: string | null;
      type: "plan";
      version: 1;
    }
  | {
      createdAt: string;
      jobId: string;
      sourceWorkoutId: string;
      type: "rewrite";
      version: 1;
    };

type PendingCreatorJob = ActiveWorkoutCreatorJob;

type StoredWorkoutCreatorJob = Partial<ActiveWorkoutCreatorJob> & {
  createdAt: string;
  jobId: string;
  profileId: string | null;
  sourceWorkoutId?: string;
  type?: "plan" | "rewrite";
  version?: 1;
};

type AuthUserResponse = {
  avatarUpdatedAt?: string | null;
  avatarUrl?: string | null;
  createdOn?: string | null;
  email: string;
  id: string;
  modifiedOn?: string | null;
  name: string;
};

type AuthApiResponse = {
  token: string;
  user: AuthUserResponse;
};

type AuthSessionResponse = {
  createdAt: string;
  deviceName?: string | null;
  expiresAt: string;
  id: string;
  isCurrent: boolean;
  lastSeenAt: string;
};

type AuthSessionsResponse = {
  sessions: AuthSessionResponse[];
};

const AuthPasswordPolicy = {
  isValid(password: string) {
    return password.trim().length >= 8 && password.length <= 200;
  }
};

type LocalAuthStorage = {
  token: string;
  updatedAt: string;
  user: AuthUserResponse;
  version: 1;
};

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
  const [savedWorkouts, setSavedWorkouts] = useState<SavedWorkout[]>(() => [...initialWorkouts]);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlanSettings>({ enabled: false, items: [], updatedAt: new Date().toISOString() });
  const [hasLoadedWeeklyPlan, setHasLoadedWeeklyPlan] = useState(false);
  const [weeklyPlanOwnerId, setWeeklyPlanOwnerId] = useState<string | null>(null);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState(initialWorkouts[0]?.id ?? "");
  const [workoutSort, setWorkoutSort] = useState<WorkoutSortSettings>(defaultWorkoutSort);
  const [isWorkoutSortSheetOpen, setIsWorkoutSortSheetOpen] = useState(false);
  const [hasLoadedLocalWorkouts, setHasLoadedLocalWorkouts] = useState(false);
  const [hasLoadedLocalSettings, setHasLoadedLocalSettings] = useState(false);
  const [hasLoadedLocalCreatorProfiles, setHasLoadedLocalCreatorProfiles] = useState(false);
  const [hasLoadedLocalCreatorJob, setHasLoadedLocalCreatorJob] = useState(false);
  const [hasLoadedLocalAuth, setHasLoadedLocalAuth] = useState(false);
  const [selectedArticleId, setSelectedArticleId] = useState<string>(articles[0]?.id ?? "");
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [workout, setWorkout] = useState<WorkoutDraft>(() => createDefaultWorkout());
  const [themeName, setThemeName] = useState<ThemeName>("light");
  const [language, setLanguage] = useState<LanguageCode>("en");
  const [pendingLanguage, setPendingLanguage] = useState<LanguageCode>("en");
  const [defaultSetCount, setDefaultSetCount] = useState("");
  const [pendingDefaultSetCount, setPendingDefaultSetCount] = useState("");
  const [defaultWeight, setDefaultWeight] = useState("");
  const [pendingDefaultWeight, setPendingDefaultWeight] = useState("");
  const [defaultStageType, setDefaultStageType] = useState<StageType | "">("");
  const [pendingDefaultStageType, setPendingDefaultStageType] = useState<StageType | "">("");
  const [defaultWorkoutExecutionMode, setDefaultWorkoutExecutionMode] = useState<WorkoutExecutionMode>("guided");
  const [pendingDefaultWorkoutExecutionMode, setPendingDefaultWorkoutExecutionMode] = useState<WorkoutExecutionMode>("guided");
  const [defaultWorkoutTableOrientation, setDefaultWorkoutTableOrientation] = useState<WorkoutTableOrientation>("vertical");
  const [showRestTimer, setShowRestTimer] = useState(true);
  const [workoutReminders, setWorkoutReminders] = useState<WorkoutReminderSettings>(
    getDefaultWorkoutReminderSettings("en")
  );
  const [pendingWorkoutReminderDay, setPendingWorkoutReminderDay] = useState<ReminderDaySchedule | null>(null);
  const [reminderSchedulingStatus, setReminderSchedulingStatus] = useState<ReminderSchedulingStatus>("idle");
  const [localSettingsUpdatedAt, setLocalSettingsUpdatedAt] = useState(() => new Date().toISOString());
  const [workoutSessions, setWorkoutSessions] = useState<WorkoutSession[]>([]);
  const [hasLoadedWorkoutSessions, setHasLoadedWorkoutSessions] = useState(false);
  const [favoriteExercises, setFavoriteExercises] = useState<FavoriteExercise[]>([]);
  const [hasLoadedFavoriteExercises, setHasLoadedFavoriteExercises] = useState(false);
  const [favoriteExercisesSearch, setFavoriteExercisesSearch] = useState("");
  const [favoriteExercisesSyncStatus, setFavoriteExercisesSyncStatus] = useState<"local" | "synced" | "failed">("local");
  const [activeWorkoutSessionId, setActiveWorkoutSessionId] = useState<string | null>(null);
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
  const [sessionEntryIndex, setSessionEntryIndex] = useState(0);
  const [isPostWorkoutFillMode, setIsPostWorkoutFillMode] = useState(false);
  const [appDialog, setAppDialog] = useState<AppDialogState | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatusState>({ kind: "ok", message: null, updatedAt: null });
  const [isSystemStatusRefreshing, setIsSystemStatusRefreshing] = useState(false);
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
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [appUsageStats, setAppUsageStats] = useState<AppUsageStats>(() => getDefaultAppUsageStats());
  const [achievementsSyncState, setAchievementsSyncState] = useState<AchievementsSyncState>({});
  const [achievementToast, setAchievementToast] = useState<{ title: string; extraCount: number } | null>(null);
  const [hasLoadedAchievements, setHasLoadedAchievements] = useState(false);
  const [loadedAchievementsOwnerId, setLoadedAchievementsOwnerId] = useState<string | null>(null);
  const [isAuthActionSubmitting, setIsAuthActionSubmitting] = useState(false);
  const [isAvatarSubmitting, setIsAvatarSubmitting] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState("");
  const [isCurrentPasswordVisible, setIsCurrentPasswordVisible] = useState(false);
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
  const [isRepeatPasswordVisible, setIsRepeatPasswordVisible] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [isAuthPanelDismissed, setIsAuthPanelDismissed] = useState(false);
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
  const [creatorProfiles, setCreatorProfiles] = useState<WorkoutCreatorProfile[]>([]);
  const [creatorProfileName, setCreatorProfileName] = useState("");
  const [showCreatorLoginTooltip, setShowCreatorLoginTooltip] = useState(false);
  const [trainingFactIndex, setTrainingFactIndex] = useState(0);
  const [selectedCreatorProfileId, setSelectedCreatorProfileId] = useState<string | null>(null);
  const [pendingCreatorJob, setPendingCreatorJob] = useState<PendingCreatorJob | null>(null);
  const [readOnlyWorkoutCollapsedPanels, setReadOnlyWorkoutCollapsedPanels] = useState<Record<string, boolean>>({});
  const [collapsedPanels, setCollapsedPanels] = useState<Record<string, boolean>>(
    defaultCollapsedPanels
  );
  const [user, setUser] = useState<UserSession | null>(null);
  const storageOwnerId = getAccountStorageOwnerId(user?.id);
  const [hasLoadedAccountStorageMigration, setHasLoadedAccountStorageMigration] = useState(false);
  const [loadedWorkoutsOwnerId, setLoadedWorkoutsOwnerId] = useState<string | null>(null);
  const [loadedSettingsOwnerId, setLoadedSettingsOwnerId] = useState<string | null>(null);
  const [loadedCreatorProfilesOwnerId, setLoadedCreatorProfilesOwnerId] = useState<string | null>(null);
  const [loadedCreatorJobOwnerId, setLoadedCreatorJobOwnerId] = useState<string | null>(null);
  const [loadedWorkoutSessionsOwnerId, setLoadedWorkoutSessionsOwnerId] = useState<string | null>(null);
  const [loadedFavoriteExercisesOwnerId, setLoadedFavoriteExercisesOwnerId] = useState<string | null>(null);
  const theme = themes[themeName];
  const isDarkMode = themeName === "dark";
  const t = (key: TranslationKey) => translate(language, key);
  const userAvatarSource = buildAvatarImageSource(apiBaseUrl, user);
  const isCreatorJobPending = pendingCreatorJob?.type === "plan";
  const isRewriteJobPending = pendingCreatorJob?.type === "rewrite";
  const pollingCreatorJobIdRef = useRef<string | null>(null);
  const syncedWorkoutUserIdRef = useRef<string | null>(null);
  const syncedSettingsUserIdRef = useRef<string | null>(null);
  const syncedFavoriteExercisesUserIdRef = useRef<string | null>(null);
  const syncedWorkoutSessionsUserIdRef = useRef<string | null>(null);
  const syncedAchievementsUserIdRef = useRef<string | null>(null);
  const workoutSessionsSyncRequestIdRef = useRef(0);
  const workoutSessionsSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const achievementsSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const systemStatusFetchedAtRef = useRef<number | null>(null);
  const mainScrollRef = useRef<ScrollView | null>(null);
  const activeWorkoutSessionEntryIndexRef = useRef<Record<string, number>>({});
  const appUsageStartedAtRef = useRef<number | null>(Date.now());
  const isApplyingAccountFavoriteExercisesRef = useRef(false);
  const isApplyingAccountWorkoutSessionsRef = useRef(false);
  const isApplyingAccountAchievementsRef = useRef(false);
  const hasPersistedLocalAchievementsRef = useRef(false);
  const hasPersistedLocalFavoriteExercisesRef = useRef(false);
  const hasPersistedLocalWorkoutSessionsRef = useRef(false);
  const isApplyingAccountSettingsRef = useRef(false);
  const hasPersistedLocalSettingsRef = useRef(false);
  const handledAccountPolicyUserIdRef = useRef<string | null>(null);
  const reminderStorageOwnerIdRef = useRef(storageOwnerId);
  const previousReminderLanguageRef = useRef<LanguageCode>(language);
  const screenTitle = activeScreen === "profile" && !user
    ? t("login")
    : getScreenTitle(activeScreen, editingWorkoutId, t);
  const shouldShowHeaderBackButton = activeScreen !== "home";
  const shouldShowProfileHeaderButton =
    Boolean(user) || activeScreen !== "home" || isAuthPanelDismissed;
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

  async function hasAnonymousAccountData() {
    const accountDataKeys = [
      localWorkoutsStorageBaseKey,
      FAVORITE_EXERCISES_STORAGE_BASE_KEY,
      WORKOUT_SESSIONS_STORAGE_BASE_KEY,
      ACHIEVEMENTS_STORAGE_BASE_KEY,
      APP_USAGE_STATS_STORAGE_BASE_KEY,
      localCreatorProfilesStorageBaseKey,
      localCreatorJobStorageBaseKey
    ];

    for (const baseKey of accountDataKeys) {
      const rawData = await AsyncStorage.getItem(getAccountStorageKey(baseKey, ANONYMOUS_LOCAL_OWNER));
      if (!rawData) {
        continue;
      }

      try {
        const parsed = JSON.parse(rawData) as unknown;
        if (isRecord(parsed)) {
          if (Array.isArray(parsed.workouts) && parsed.workouts.length > 0) {
            return true;
          }

          if (Array.isArray(parsed.sessions) && parsed.sessions.length > 0) {
            return true;
          }

          if (Array.isArray(parsed.profiles) && parsed.profiles.length > 0) {
            return true;
          }

          if (Array.isArray(parsed.favorites) && parsed.favorites.length > 0) {
            return true;
          }

          if (Array.isArray(parsed.achievements) && parsed.achievements.length > 0) {
            return true;
          }

          if (typeof parsed.totalForegroundSeconds === "number" && parsed.totalForegroundSeconds > 0) {
            return true;
          }

          if (typeof parsed.jobId === "string" && parsed.jobId.trim()) {
            return true;
          }
        }
      } catch {
        return true;
      }
    }

    return false;
  }

  async function hasAnonymousMergeHandled(userId: string) {
    const rawData = await AsyncStorage.getItem(getAccountStorageKey(anonymousMergeHandledStorageBaseKey, userId));
    if (!rawData) {
      return false;
    }

    try {
      const parsed = JSON.parse(rawData) as unknown;
      return isRecord(parsed) && parsed.version === 1 && typeof parsed.handledAt === "string";
    } catch {
      return false;
    }
  }

  async function markAnonymousMergeHandled(userId: string, action: "merged" | "deleted" | "skipped") {
    await AsyncStorage.setItem(getAccountStorageKey(anonymousMergeHandledStorageBaseKey, userId), JSON.stringify({
      action,
      handledAt: new Date().toISOString(),
      version: 1
    }));
  }

  async function loadWorkoutsForStorageOwner(ownerId: string) {
    try {
      const rawData = await AsyncStorage.getItem(getAccountStorageKey(localWorkoutsStorageBaseKey, ownerId));
      if (!rawData) {
          return { selectedWorkoutId: "", sort: defaultWorkoutSort, workouts: [] };
      }

      const storedData = JSON.parse(rawData) as Partial<LocalWorkoutsStorage>;
      return {
        selectedWorkoutId: typeof storedData.selectedWorkoutId === "string" ? storedData.selectedWorkoutId : "",
        sort: normalizeWorkoutSortSettings(storedData.sort),
        workouts: Array.isArray(storedData.workouts)
          ? storedData.workouts.map((workout) => normalizeSavedWorkoutTextFields(workout))
          : []
      };
    } catch (error) {
      console.error("Failed to load account-scoped workouts", error);
      return { selectedWorkoutId: "", sort: defaultWorkoutSort, workouts: [] };
    }
  }

  async function saveWorkoutsForStorageOwner(
    ownerId: string,
    workouts: SavedWorkout[],
    selectedWorkoutId = "",
    sortSettings = workoutSort
  ) {
    const selectedId = selectedWorkoutId && workouts.some((workout) => workout.id === selectedWorkoutId)
      ? selectedWorkoutId
      : workouts[0]?.id ?? "";
    const payload: LocalWorkoutsStorage = {
      selectedWorkoutId: selectedId,
      sort: normalizeWorkoutSortSettings(sortSettings),
      updatedAt: new Date().toISOString(),
      version: 1,
      workouts: workouts.map((workout) => normalizeSavedWorkoutTextFields(workout))
    };

    await AsyncStorage.setItem(getAccountStorageKey(localWorkoutsStorageBaseKey, ownerId), JSON.stringify(payload));
  }

  async function loadWorkoutSessionsForStorageOwner(ownerId: string) {
    try {
      const rawData = await AsyncStorage.getItem(getAccountStorageKey(WORKOUT_SESSIONS_STORAGE_BASE_KEY, ownerId));
      if (!rawData) {
        return [];
      }

      const storedData = JSON.parse(rawData) as Partial<LocalWorkoutSessionsStorage>;
      return normalizeWorkoutSessions(Array.isArray(storedData.sessions) ? storedData.sessions : []);
    } catch (error) {
      console.error("Failed to load account-scoped workout sessions", error);
      return [];
    }
  }

  async function saveWorkoutSessionsForStorageOwner(ownerId: string, sessions: WorkoutSession[]) {
    const payload: LocalWorkoutSessionsStorage = {
      sessions: normalizeWorkoutSessions(sessions),
      updatedAt: new Date().toISOString(),
      version: 1
    };

    await AsyncStorage.setItem(getAccountStorageKey(WORKOUT_SESSIONS_STORAGE_BASE_KEY, ownerId), JSON.stringify(payload));
  }

  async function loadCreatorProfilesForStorageOwner(ownerId: string) {
    try {
      const rawData = await AsyncStorage.getItem(getAccountStorageKey(localCreatorProfilesStorageBaseKey, ownerId));
      if (!rawData) {
        return { profiles: [] as WorkoutCreatorProfile[], selectedProfileId: null as string | null };
      }

      const storedData = JSON.parse(rawData) as Partial<LocalCreatorProfilesStorage>;
      return {
        profiles: Array.isArray(storedData.profiles) ? storedData.profiles : [],
        selectedProfileId: typeof storedData.selectedProfileId === "string" ? storedData.selectedProfileId : null
      };
    } catch (error) {
      console.error("Failed to load account-scoped creator profiles", error);
      return { profiles: [] as WorkoutCreatorProfile[], selectedProfileId: null as string | null };
    }
  }

  async function saveCreatorProfilesForStorageOwner(
    ownerId: string,
    profiles: WorkoutCreatorProfile[],
    selectedProfileId: string | null
  ) {
    const selectedId = selectedProfileId && profiles.some((profile) => profile.id === selectedProfileId)
      ? selectedProfileId
      : null;
    const payload: LocalCreatorProfilesStorage = {
      profiles,
      selectedProfileId: selectedId,
      updatedAt: new Date().toISOString(),
      version: 1
    };

    await AsyncStorage.setItem(getAccountStorageKey(localCreatorProfilesStorageBaseKey, ownerId), JSON.stringify(payload));
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

  function mergeCreatorProfilesById(accountProfiles: WorkoutCreatorProfile[], anonymousProfiles: WorkoutCreatorProfile[]) {
    const seen = new Set<string>();
    const mergedProfiles: WorkoutCreatorProfile[] = [];

    [...accountProfiles, ...anonymousProfiles].forEach((profile) => {
      if (!profile.id || seen.has(profile.id)) {
        return;
      }

      seen.add(profile.id);
      mergedProfiles.push(profile);
    });

    return mergedProfiles;
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

    syncedWorkoutUserIdRef.current = null;
    syncedFavoriteExercisesUserIdRef.current = null;
    syncedWorkoutSessionsUserIdRef.current = null;
    syncedAchievementsUserIdRef.current = null;
    setFavoriteExercisesSyncStatus("local");

    try {
      await synchronizeAccountWorkouts(session, mergedWorkouts);
      const syncedFavorites = await syncAccountFavoriteExercises(session, mergedFavorites, true);
      const syncedSessions = await syncAccountWorkoutSessions(session, mergedSessions, true);
      const syncedAchievements = await syncAccountAchievements(session, mergedAchievements, mergedUsageStats, true);

      if (storageOwnerId === accountOwnerId) {
        isApplyingAccountFavoriteExercisesRef.current = true;
        isApplyingAccountWorkoutSessionsRef.current = true;
        isApplyingAccountAchievementsRef.current = true;
        setFavoriteExercises(syncedFavorites);
        setWorkoutSessions(syncedSessions);
        setUserAchievements(syncedAchievements.unlocked);
        setAppUsageStats(syncedAchievements.appUsageStats);
        setFavoriteExercisesSyncStatus("synced");
        setTimeout(() => {
          isApplyingAccountFavoriteExercisesRef.current = false;
          isApplyingAccountWorkoutSessionsRef.current = false;
          isApplyingAccountAchievementsRef.current = false;
        }, 0);
      }
    } catch (error) {
      console.error("Failed to sync merged anonymous data", error);
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
    if (activeScreen !== "home") {
      return;
    }

    void refreshSystemStatus(false);
  }, [activeScreen, apiBaseUrl]);

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

        if (!isMounted || !rawData) {
          return;
        }

        const storedData = JSON.parse(rawData) as Partial<LocalAuthStorage>;

        if (
          typeof storedData.token !== "string" ||
          !storedData.token.trim() ||
          !isRecord(storedData.user)
        ) {
          await AsyncStorage.removeItem(localAuthStorageKey);
          return;
        }

        const cachedSession: UserSession = {
          avatarUpdatedAt: typeof storedData.user.avatarUpdatedAt === "string" ? storedData.user.avatarUpdatedAt : null,
          avatarUrl: typeof storedData.user.avatarUrl === "string" ? storedData.user.avatarUrl : null,
          createdOn: typeof storedData.user.createdOn === "string" ? storedData.user.createdOn : null,
          email: String(storedData.user.email),
          id: String(storedData.user.id),
          modifiedOn: typeof storedData.user.modifiedOn === "string" ? storedData.user.modifiedOn : null,
          name: String(storedData.user.name || storedData.user.email.split("@")[0] || t("defaultUserName")),
          token: storedData.token
        };

        const response = await fetch(`${apiBaseUrl}/api/auth/me`, {
          headers: getApiHeaders({ ...cachedSession, token: storedData.token })
        });
        recordCorrelationId(response.headers.get("X-Correlation-Id"));

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            await AsyncStorage.removeItem(localAuthStorageKey);
          } else {
            setUser(cachedSession);
          }
          return;
        }

        const responseBody = await response.json().catch(() => null) as AuthUserResponse | null;

        if (!responseBody?.id || !responseBody.email) {
          await AsyncStorage.removeItem(localAuthStorageKey);
          return;
        }

        setUser({
          avatarUpdatedAt: responseBody.avatarUpdatedAt ?? null,
          avatarUrl: responseBody.avatarUrl ?? null,
          createdOn: responseBody.createdOn ?? null,
          email: responseBody.email,
          id: responseBody.id,
          modifiedOn: responseBody.modifiedOn ?? null,
          name: responseBody.name || responseBody.email.split("@")[0] || t("defaultUserName"),
          token: storedData.token
        });
      } catch (error) {
        console.error("Failed to load local auth", error);
        try {
          const rawData = await AsyncStorage.getItem(localAuthStorageKey);
          const storedData = rawData ? JSON.parse(rawData) as Partial<LocalAuthStorage> : null;
          if (
            isMounted &&
            typeof storedData?.token === "string" &&
            storedData.token.trim() &&
            isRecord(storedData.user) &&
            typeof storedData.user.id === "string" &&
            typeof storedData.user.email === "string"
          ) {
            setUser({
              avatarUpdatedAt: typeof storedData.user.avatarUpdatedAt === "string" ? storedData.user.avatarUpdatedAt : null,
              avatarUrl: typeof storedData.user.avatarUrl === "string" ? storedData.user.avatarUrl : null,
              createdOn: typeof storedData.user.createdOn === "string" ? storedData.user.createdOn : null,
              email: storedData.user.email,
              id: storedData.user.id,
              modifiedOn: typeof storedData.user.modifiedOn === "string" ? storedData.user.modifiedOn : null,
              name: typeof storedData.user.name === "string" && storedData.user.name
                ? storedData.user.name
                : storedData.user.email.split("@")[0] || t("defaultUserName"),
              token: storedData.token
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
        } else if (!(await hasAnonymousMergeHandled(currentUser.id)) && await hasAnonymousAccountData()) {
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

    async function loadLocalWorkouts() {
      if (!hasLoadedAccountStorageMigration) {
        return;
      }

      const ownerId = storageOwnerId;
      setHasLoadedLocalWorkouts(false);
      setLoadedWorkoutsOwnerId(null);

      try {
        const rawData = await AsyncStorage.getItem(getAccountStorageKey(localWorkoutsStorageBaseKey, ownerId));

        if (!isMounted) {
          return;
        }

        if (!rawData) {
          setSavedWorkouts(initialWorkouts.map((workout) => normalizeSavedWorkoutTextFields(workout)));
          setSelectedWorkoutId(initialWorkouts[0]?.id ?? "");
          setWorkoutSort(defaultWorkoutSort);
          return;
        }

        const storedData = JSON.parse(rawData) as Partial<LocalWorkoutsStorage>;

        if (!Array.isArray(storedData.workouts)) {
          return;
        }

        const normalizedWorkouts = storedData.workouts.map((workout) => normalizeSavedWorkoutTextFields(workout));
        const selectedId =
          storedData.selectedWorkoutId &&
          normalizedWorkouts.some((item) => item.id === storedData.selectedWorkoutId)
            ? storedData.selectedWorkoutId
            : normalizedWorkouts[0]?.id ?? "";

        setSavedWorkouts(normalizedWorkouts);
        setSelectedWorkoutId(selectedId);
        setWorkoutSort(normalizeWorkoutSortSettings(storedData.sort));
      } catch (error) {
        console.error("Failed to load local workouts", error);
      } finally {
        if (isMounted) {
          setLoadedWorkoutsOwnerId(ownerId);
          setHasLoadedLocalWorkouts(true);
        }
      }
    }

    void loadLocalWorkouts();

    return () => {
      isMounted = false;
    };
  }, [hasLoadedAccountStorageMigration, storageOwnerId]);

  useEffect(() => {
    let isMounted = true;

    async function loadLocalSettings() {
      if (!hasLoadedAccountStorageMigration) {
        return;
      }

      const ownerId = storageOwnerId;
      setHasLoadedLocalSettings(false);
      setLoadedSettingsOwnerId(null);
      hasPersistedLocalSettingsRef.current = false;
      isApplyingAccountSettingsRef.current = false;

      try {
        const rawData = await AsyncStorage.getItem(getAccountStorageKey(localSettingsStorageBaseKey, ownerId));

        if (!isMounted) {
          return;
        }

        if (!rawData) {
          setLanguage("en");
          setPendingLanguage("en");
          setThemeName("light");
          setDefaultSetCount("");
          setPendingDefaultSetCount("");
          setDefaultWeight("");
          setPendingDefaultWeight("");
          setDefaultStageType("");
          setPendingDefaultStageType("");
          setDefaultWorkoutExecutionMode("guided");
          setPendingDefaultWorkoutExecutionMode("guided");
          setDefaultWorkoutTableOrientation("vertical");
          setShowRestTimer(true);
          setWorkoutReminders(getDefaultWorkoutReminderSettings("en"));
          setPendingWorkoutReminderDay(null);
          setCollapsedPanels(defaultCollapsedPanels);
          setIsAuthPanelDismissed(false);
          setLocalSettingsUpdatedAt(new Date().toISOString());
          return;
        }

        const storedData = JSON.parse(rawData) as Partial<LocalSettingsStorage>;
        const nextLanguage = isLanguageCode(storedData.language) ? storedData.language : "en";
        const nextThemeName = isThemeName(storedData.themeName) ? storedData.themeName : "light";
        const nextDefaultSetCount =
          typeof storedData.defaultSetCount === "string" ? storedData.defaultSetCount : "";
        const nextDefaultWeight =
          typeof storedData.defaultWeight === "string" ? storedData.defaultWeight : "";
        const nextDefaultStageType =
          storedData.defaultStageType === "" || isStageType(storedData.defaultStageType)
            ? storedData.defaultStageType
            : "";
        const nextDefaultWorkoutExecutionMode = isWorkoutExecutionMode(storedData.defaultWorkoutExecutionMode)
          ? storedData.defaultWorkoutExecutionMode
          : "guided";
        const nextDefaultWorkoutTableOrientation = isWorkoutTableOrientation(storedData.defaultWorkoutTableOrientation)
          ? storedData.defaultWorkoutTableOrientation
          : "vertical";
        const nextShowRestTimer = storedData.showRestTimer !== false;
        const nextCollapsedPanels = normalizeCollapsedPanels(storedData.collapsedPanels);
        const nextWorkoutReminders = normalizeWorkoutReminderSettings(storedData.workoutReminders, nextLanguage);
        const nextIsAuthPanelDismissed = storedData.isAuthPanelDismissed === true;
        const nextUpdatedAt = typeof storedData.updatedAt === "string" ? storedData.updatedAt : new Date().toISOString();

        setLanguage(nextLanguage);
        setPendingLanguage(nextLanguage);
        setThemeName(nextThemeName);
        setDefaultSetCount(nextDefaultSetCount);
        setPendingDefaultSetCount(nextDefaultSetCount);
        setDefaultWeight(nextDefaultWeight);
        setPendingDefaultWeight(nextDefaultWeight);
        setDefaultStageType(nextDefaultStageType);
        setPendingDefaultStageType(nextDefaultStageType);
        setDefaultWorkoutExecutionMode(nextDefaultWorkoutExecutionMode);
        setPendingDefaultWorkoutExecutionMode(nextDefaultWorkoutExecutionMode);
        setDefaultWorkoutTableOrientation(nextDefaultWorkoutTableOrientation);
        setShowRestTimer(nextShowRestTimer);
        setWorkoutReminders(nextWorkoutReminders);
        setPendingWorkoutReminderDay(null);
        setCollapsedPanels(nextCollapsedPanels);
        setIsAuthPanelDismissed(nextIsAuthPanelDismissed);
        setLocalSettingsUpdatedAt(nextUpdatedAt);
      } catch (error) {
        console.error("Failed to load local settings", error);
      } finally {
        if (isMounted) {
          setLoadedSettingsOwnerId(ownerId);
          setHasLoadedLocalSettings(true);
        }
      }
    }

    void loadLocalSettings();

    return () => {
      isMounted = false;
    };
  }, [hasLoadedAccountStorageMigration, storageOwnerId]);

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
    let isMounted = true;

    async function loadLocalCreatorProfiles() {
      if (!hasLoadedAccountStorageMigration) {
        return;
      }

      const ownerId = storageOwnerId;
      setHasLoadedLocalCreatorProfiles(false);
      setLoadedCreatorProfilesOwnerId(null);

      try {
        const rawData = await AsyncStorage.getItem(getAccountStorageKey(localCreatorProfilesStorageBaseKey, ownerId));

        if (!isMounted) {
          return;
        }

        if (!rawData) {
          setCreatorProfiles([]);
          setSelectedCreatorProfileId(null);
          return;
        }

        const storedData = JSON.parse(rawData) as Partial<LocalCreatorProfilesStorage>;

        if (!Array.isArray(storedData.profiles)) {
          return;
        }

        const selectedProfileId =
          storedData.selectedProfileId &&
          storedData.profiles.some((profile) => profile.id === storedData.selectedProfileId)
            ? storedData.selectedProfileId
            : null;

        setCreatorProfiles(storedData.profiles);
        setSelectedCreatorProfileId(selectedProfileId);
      } catch (error) {
        console.error("Failed to load local creator profiles", error);
      } finally {
        if (isMounted) {
          setLoadedCreatorProfilesOwnerId(ownerId);
          setHasLoadedLocalCreatorProfiles(true);
        }
      }
    }

    void loadLocalCreatorProfiles();

    return () => {
      isMounted = false;
    };
  }, [hasLoadedAccountStorageMigration, storageOwnerId]);

  useEffect(() => {
    let isMounted = true;

    async function loadWorkoutSessions() {
      if (!hasLoadedAccountStorageMigration) {
        return;
      }

      const ownerId = storageOwnerId;
      setHasLoadedWorkoutSessions(false);
      setLoadedWorkoutSessionsOwnerId(null);
      hasPersistedLocalWorkoutSessionsRef.current = false;
      isApplyingAccountWorkoutSessionsRef.current = false;

      try {
        const [rawData, rawActiveSessionData] = await Promise.all([
          AsyncStorage.getItem(getAccountStorageKey(WORKOUT_SESSIONS_STORAGE_BASE_KEY, ownerId)),
          AsyncStorage.getItem(getAccountStorageKey(activeWorkoutSessionStorageBaseKey, ownerId))
        ]);

        if (!isMounted) {
          return;
        }

        if (!rawData) {
          setWorkoutSessions([]);
          setActiveWorkoutSessionId(null);
          setSessionEntryIndex(0);
          return;
        }

        const storedData = JSON.parse(rawData) as Partial<LocalWorkoutSessionsStorage>;

        if (!Array.isArray(storedData.sessions)) {
          return;
        }

        const normalizedSessions = normalizeWorkoutSessions(storedData.sessions);
        setWorkoutSessions(normalizedSessions);
        const activeSession = normalizedSessions.find((session) => session.status === "active" && !session.deletedAt);
        setActiveWorkoutSessionId(activeSession?.id ?? null);
        if (activeSession) {
          let restoredEntryIndex = 0;
          if (rawActiveSessionData) {
            try {
              const activeSessionData = JSON.parse(rawActiveSessionData) as Partial<LocalActiveWorkoutSessionStorage>;
              if (activeSessionData.sessionId === activeSession.id) {
                restoredEntryIndex = clampWorkoutSessionEntryIndex(activeSessionData.entryIndex, activeSession);
              }
            } catch (error) {
              console.error("Failed to load active workout session progress", error);
            }
          }

          activeWorkoutSessionEntryIndexRef.current[activeSession.id] = restoredEntryIndex;
          setSessionEntryIndex(restoredEntryIndex);
        } else {
          setSessionEntryIndex(0);
        }
      } catch (error) {
        console.error("Failed to load workout sessions", error);
      } finally {
        if (isMounted) {
          setLoadedWorkoutSessionsOwnerId(ownerId);
          setHasLoadedWorkoutSessions(true);
        }
      }
    }

    void loadWorkoutSessions();

    return () => {
      isMounted = false;
    };
  }, [hasLoadedAccountStorageMigration, storageOwnerId]);

  useEffect(() => {
    let isMounted = true;

    async function loadLocalFavoriteExercises() {
      if (!hasLoadedAccountStorageMigration) {
        return;
      }

      const ownerId = storageOwnerId;
      setHasLoadedFavoriteExercises(false);
      setLoadedFavoriteExercisesOwnerId(null);
      hasPersistedLocalFavoriteExercisesRef.current = false;
      isApplyingAccountFavoriteExercisesRef.current = false;

      try {
        const favorites = await loadFavoriteExercises(ownerId);

        if (!isMounted) {
          return;
        }

        setFavoriteExercises(favorites);
      } finally {
        if (isMounted) {
          setLoadedFavoriteExercisesOwnerId(ownerId);
          setHasLoadedFavoriteExercises(true);
        }
      }
    }

    void loadLocalFavoriteExercises();

    return () => {
      isMounted = false;
    };
  }, [hasLoadedAccountStorageMigration, storageOwnerId]);

  useEffect(() => {
    let isMounted = true;

    async function loadLocalCreatorJob() {
      if (!hasLoadedAccountStorageMigration) {
        return;
      }

      const ownerId = storageOwnerId;
      setHasLoadedLocalCreatorJob(false);
      setLoadedCreatorJobOwnerId(null);

      try {
        const rawData = await AsyncStorage.getItem(getAccountStorageKey(localCreatorJobStorageBaseKey, ownerId));

        if (!isMounted) {
          return;
        }

        if (!rawData) {
          setPendingCreatorJob(null);
          setCreatorPhase("form");
          setRewriteSourceWorkoutId(null);
          return;
        }

        const storedData = JSON.parse(rawData) as Partial<StoredWorkoutCreatorJob>;

        if (typeof storedData.jobId !== "string" || !storedData.jobId.trim()) {
          return;
        }

        const createdAt = typeof storedData.createdAt === "string" ? storedData.createdAt : new Date().toISOString();

        if (storedData.type === "rewrite") {
          if (typeof storedData.sourceWorkoutId !== "string" || !storedData.sourceWorkoutId.trim()) {
            return;
          }

          setPendingCreatorJob({
            createdAt,
            jobId: storedData.jobId,
            sourceWorkoutId: storedData.sourceWorkoutId,
            type: "rewrite",
            version: 1
          });
          setRewriteSourceWorkoutId(storedData.sourceWorkoutId);
          setActiveScreen("workoutAiRewrite");
          return;
        }

        setPendingCreatorJob({
          createdAt,
          jobId: storedData.jobId,
          profileId: typeof storedData.profileId === "string" ? storedData.profileId : null,
          type: "plan",
          version: 1
        });
        setCreatorPhase("submitted");
      } catch (error) {
        console.error("Failed to load pending creator job", error);
      } finally {
        if (isMounted) {
          setLoadedCreatorJobOwnerId(ownerId);
          setHasLoadedLocalCreatorJob(true);
        }
      }
    }

    void loadLocalCreatorJob();

    return () => {
      isMounted = false;
    };
  }, [hasLoadedAccountStorageMigration, storageOwnerId]);

  useEffect(() => {
    if (!hasLoadedFavoriteExercises || loadedFavoriteExercisesOwnerId !== storageOwnerId) {
      return;
    }

    saveFavoriteExercises(favoriteExercises, storageOwnerId).catch((error) => {
      console.error("Failed to save favorite exercises", error);
    });

    if (isApplyingAccountFavoriteExercisesRef.current) {
      hasPersistedLocalFavoriteExercisesRef.current = true;
      return;
    }

    if (!user || syncedFavoriteExercisesUserIdRef.current !== user.id) {
      setFavoriteExercisesSyncStatus("local");
      hasPersistedLocalFavoriteExercisesRef.current = true;
      return;
    }

    if (!hasPersistedLocalFavoriteExercisesRef.current) {
      hasPersistedLocalFavoriteExercisesRef.current = true;
      return;
    }

    syncAccountFavoriteExercises(user, favoriteExercises).then((mergedFavorites) => {
      isApplyingAccountFavoriteExercisesRef.current = true;
      setFavoriteExercises(mergedFavorites);
      setFavoriteExercisesSyncStatus("synced");
      setTimeout(() => {
        isApplyingAccountFavoriteExercisesRef.current = false;
      }, 0);
    }).catch((error) => {
      console.error("Failed to sync favorite exercises", error);
      setFavoriteExercisesSyncStatus("failed");
    });
  }, [favoriteExercises, hasLoadedFavoriteExercises, loadedFavoriteExercisesOwnerId, storageOwnerId]);

  useEffect(() => {
    if (!hasLoadedLocalWorkouts || loadedWorkoutsOwnerId !== storageOwnerId) {
      return;
    }

    const payload: LocalWorkoutsStorage = {
      selectedWorkoutId,
      sort: normalizeWorkoutSortSettings(workoutSort),
      updatedAt: new Date().toISOString(),
      version: 1,
      workouts: savedWorkouts.map((workout) => normalizeSavedWorkoutTextFields(workout))
    };

    AsyncStorage.setItem(getAccountStorageKey(localWorkoutsStorageBaseKey, storageOwnerId), JSON.stringify(payload)).catch((error) => {
      console.error("Failed to save local workouts", error);
    });
  }, [hasLoadedLocalWorkouts, loadedWorkoutsOwnerId, savedWorkouts, selectedWorkoutId, storageOwnerId, workoutSort]);

  useEffect(() => {
    if (!hasLoadedLocalAuth || !hasLoadedLocalWorkouts || loadedWorkoutsOwnerId !== storageOwnerId || !user) {
      return;
    }

    if (syncedWorkoutUserIdRef.current === user.id) {
      return;
    }

    syncedWorkoutUserIdRef.current = user.id;

    synchronizeAccountWorkouts(user, savedWorkouts).catch((error) => {
      console.error("Failed to synchronize account workouts", error);
      syncedWorkoutUserIdRef.current = null;
    });
  }, [hasLoadedLocalAuth, hasLoadedLocalWorkouts, loadedWorkoutsOwnerId, savedWorkouts, storageOwnerId, user]);

  useEffect(() => {
    if (!hasLoadedLocalAuth || !hasLoadedLocalSettings || loadedSettingsOwnerId !== storageOwnerId || !user) {
      return;
    }

    if (syncedSettingsUserIdRef.current === user.id) {
      return;
    }

    syncedSettingsUserIdRef.current = `syncing:${user.id}`;

    synchronizeAccountSettings(user).then(() => {
      syncedSettingsUserIdRef.current = user.id;
    }).catch((error) => {
      console.error("Failed to synchronize account settings", error);
      syncedSettingsUserIdRef.current = null;
    });
  }, [hasLoadedLocalAuth, hasLoadedLocalSettings, loadedSettingsOwnerId, storageOwnerId, user]);

  useEffect(() => {
    if (!hasLoadedLocalAuth || !hasLoadedFavoriteExercises || loadedFavoriteExercisesOwnerId !== storageOwnerId || !user) {
      return;
    }

    if (
      syncedFavoriteExercisesUserIdRef.current === user.id ||
      syncedFavoriteExercisesUserIdRef.current === `syncing:${user.id}`
    ) {
      return;
    }

    syncedFavoriteExercisesUserIdRef.current = `syncing:${user.id}`;

    synchronizeAccountFavoriteExercises(user, favoriteExercises).then(() => {
      syncedFavoriteExercisesUserIdRef.current = user.id;
    }).catch((error) => {
      console.error("Failed to synchronize account favorite exercises", error);
      syncedFavoriteExercisesUserIdRef.current = null;
      setFavoriteExercisesSyncStatus("failed");
    });
  }, [favoriteExercises, hasLoadedFavoriteExercises, hasLoadedLocalAuth, loadedFavoriteExercisesOwnerId, storageOwnerId, user]);

  useEffect(() => {
    if (!hasLoadedLocalAuth || !hasLoadedWorkoutSessions || loadedWorkoutSessionsOwnerId !== storageOwnerId || !user) {
      return;
    }

    if (
      syncedWorkoutSessionsUserIdRef.current === user.id ||
      syncedWorkoutSessionsUserIdRef.current === `syncing:${user.id}`
    ) {
      return;
    }

    syncedWorkoutSessionsUserIdRef.current = `syncing:${user.id}`;

    synchronizeAccountWorkoutSessions(user, workoutSessions).then(() => {
      syncedWorkoutSessionsUserIdRef.current = user.id;
    }).catch((error) => {
      console.error("Failed to synchronize account workout sessions", error);
      syncedWorkoutSessionsUserIdRef.current = null;
    });
  }, [hasLoadedLocalAuth, hasLoadedWorkoutSessions, loadedWorkoutSessionsOwnerId, storageOwnerId, user]);

  useEffect(() => {
    if (!hasLoadedLocalAuth || !hasLoadedAchievements || loadedAchievementsOwnerId !== storageOwnerId || !user) {
      return;
    }

    if (
      syncedAchievementsUserIdRef.current === user.id ||
      syncedAchievementsUserIdRef.current === `syncing:${user.id}`
    ) {
      return;
    }

    syncedAchievementsUserIdRef.current = `syncing:${user.id}`;

    synchronizeAccountAchievements(user, userAchievements, appUsageStats).then(() => {
      syncedAchievementsUserIdRef.current = user.id;
    }).catch((error) => {
      console.error("Failed to synchronize account achievements", error);
      syncedAchievementsUserIdRef.current = null;
    });
  }, [appUsageStats, hasLoadedAchievements, hasLoadedLocalAuth, loadedAchievementsOwnerId, storageOwnerId, user, userAchievements]);

  useEffect(() => {
    if (!hasLoadedLocalSettings || loadedSettingsOwnerId !== storageOwnerId || !user || syncedSettingsUserIdRef.current !== user.id) {
      return;
    }

    if (isApplyingAccountSettingsRef.current) {
      return;
    }

    const payload = buildCurrentSettingsPayload(new Date().toISOString());
    saveAccountSettings(payload).then((savedSettings) => {
      if (savedSettings?.updatedAt) {
        setLocalSettingsUpdatedAt(savedSettings.updatedAt);
      }
    }).catch((error) => {
      console.error("Failed to save account settings", error);
    });
  }, [collapsedPanels, defaultSetCount, defaultStageType, defaultWeight, defaultWorkoutExecutionMode, defaultWorkoutTableOrientation, hasLoadedLocalSettings, isAuthPanelDismissed, language, loadedSettingsOwnerId, showRestTimer, storageOwnerId, themeName, user, workoutReminders]);

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
    if (!hasLoadedLocalSettings || loadedSettingsOwnerId !== storageOwnerId) {
      return;
    }

    const shouldRefreshUpdatedAt =
      hasPersistedLocalSettingsRef.current && !isApplyingAccountSettingsRef.current;
    const updatedAt = shouldRefreshUpdatedAt ? new Date().toISOString() : localSettingsUpdatedAt;
    const payload: LocalSettingsStorage = {
      collapsedPanels,
      defaultSetCount,
      defaultStageType,
      defaultWorkoutExecutionMode,
      defaultWorkoutTableOrientation,
      showRestTimer,
      defaultWeight,
      isAuthPanelDismissed,
      language,
      themeName,
      updatedAt,
      version: 1,
      workoutReminders
    };

    if (shouldRefreshUpdatedAt) {
      setLocalSettingsUpdatedAt(updatedAt);
    }

    hasPersistedLocalSettingsRef.current = true;

    AsyncStorage.setItem(getAccountStorageKey(localSettingsStorageBaseKey, storageOwnerId), JSON.stringify(payload)).catch((error) => {
      console.error("Failed to save local settings", error);
    });
  }, [collapsedPanels, defaultSetCount, defaultStageType, defaultWeight, defaultWorkoutExecutionMode, defaultWorkoutTableOrientation, hasLoadedLocalSettings, isAuthPanelDismissed, language, loadedSettingsOwnerId, showRestTimer, storageOwnerId, themeName, workoutReminders]);

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
    if (!hasLoadedLocalCreatorProfiles || loadedCreatorProfilesOwnerId !== storageOwnerId) {
      return;
    }

    const payload: LocalCreatorProfilesStorage = {
      profiles: creatorProfiles,
      selectedProfileId: selectedCreatorProfileId,
      updatedAt: new Date().toISOString(),
      version: 1
    };

    AsyncStorage.setItem(getAccountStorageKey(localCreatorProfilesStorageBaseKey, storageOwnerId), JSON.stringify(payload)).catch((error) => {
      console.error("Failed to save local creator profiles", error);
    });
  }, [creatorProfiles, hasLoadedLocalCreatorProfiles, loadedCreatorProfilesOwnerId, selectedCreatorProfileId, storageOwnerId]);

  useEffect(() => {
    if (!hasLoadedLocalCreatorJob || loadedCreatorJobOwnerId !== storageOwnerId) {
      return;
    }

    if (!pendingCreatorJob) {
      AsyncStorage.removeItem(getAccountStorageKey(localCreatorJobStorageBaseKey, storageOwnerId)).catch((error) => {
        console.error("Failed to clear pending creator job", error);
      });
      return;
    }

    AsyncStorage.setItem(getAccountStorageKey(localCreatorJobStorageBaseKey, storageOwnerId), JSON.stringify(pendingCreatorJob)).catch((error) => {
      console.error("Failed to save pending creator job", error);
    });
  }, [hasLoadedLocalCreatorJob, loadedCreatorJobOwnerId, pendingCreatorJob, storageOwnerId]);

  useEffect(() => {
    if (!hasLoadedWorkoutSessions || loadedWorkoutSessionsOwnerId !== storageOwnerId) {
      return;
    }

    const normalizedSessions = normalizeWorkoutSessions(workoutSessions);
    const payload: LocalWorkoutSessionsStorage = {
      sessions: normalizedSessions,
      updatedAt: new Date().toISOString(),
      version: 1
    };

    AsyncStorage.setItem(getAccountStorageKey(WORKOUT_SESSIONS_STORAGE_BASE_KEY, storageOwnerId), JSON.stringify(payload)).catch((error) => {
      console.error("Failed to save workout sessions", error);
    });

    const clearPendingWorkoutSessionSync = () => {
      if (workoutSessionsSyncTimeoutRef.current) {
        clearTimeout(workoutSessionsSyncTimeoutRef.current);
        workoutSessionsSyncTimeoutRef.current = null;
      }
    };

    if (isApplyingAccountWorkoutSessionsRef.current) {
      hasPersistedLocalWorkoutSessionsRef.current = true;
      clearPendingWorkoutSessionSync();
      return;
    }

    if (!user || syncedWorkoutSessionsUserIdRef.current !== user.id) {
      hasPersistedLocalWorkoutSessionsRef.current = true;
      clearPendingWorkoutSessionSync();
      return;
    }

    if (!hasPersistedLocalWorkoutSessionsRef.current) {
      hasPersistedLocalWorkoutSessionsRef.current = true;
      return;
    }

    const requestId = workoutSessionsSyncRequestIdRef.current + 1;
    workoutSessionsSyncRequestIdRef.current = requestId;

    clearPendingWorkoutSessionSync();
    const syncDelay = activeScreen === "workoutSession" && activeWorkoutSessionId
      ? workoutSessionSyncActiveDebounceMs
      : workoutSessionSyncIdleDebounceMs;

    workoutSessionsSyncTimeoutRef.current = setTimeout(() => {
      workoutSessionsSyncTimeoutRef.current = null;
      syncAccountWorkoutSessions(user, normalizedSessions).then((mergedSessions) => {
        if (workoutSessionsSyncRequestIdRef.current !== requestId) {
          return;
        }

        isApplyingAccountWorkoutSessionsRef.current = true;
        setWorkoutSessions(mergedSessions);
        setTimeout(() => {
          isApplyingAccountWorkoutSessionsRef.current = false;
        }, 0);
      }).catch((error) => {
        if (workoutSessionsSyncRequestIdRef.current !== requestId) {
          return;
        }

        console.error("Failed to sync workout sessions", error);
      });
    }, syncDelay);

    return clearPendingWorkoutSessionSync;
  }, [activeScreen, activeWorkoutSessionId, hasLoadedWorkoutSessions, loadedWorkoutSessionsOwnerId, storageOwnerId, workoutSessions]);

  useEffect(() => {
    if (!hasLoadedWorkoutSessions || loadedWorkoutSessionsOwnerId !== storageOwnerId) {
      return;
    }

    const storageKey = getAccountStorageKey(activeWorkoutSessionStorageBaseKey, storageOwnerId);
    const session = activeWorkoutSessionId
      ? workoutSessions.find((item) => item.id === activeWorkoutSessionId && item.status === "active" && !item.deletedAt)
      : null;

    if (!session) {
      AsyncStorage.removeItem(storageKey).catch((error) => {
        console.error("Failed to clear active workout session progress", error);
      });
      return;
    }

    const entryIndex = clampWorkoutSessionEntryIndex(sessionEntryIndex, session);
    activeWorkoutSessionEntryIndexRef.current[session.id] = entryIndex;

    const payload: LocalActiveWorkoutSessionStorage = {
      entryIndex,
      sessionId: session.id,
      updatedAt: new Date().toISOString(),
      version: 1
    };

    AsyncStorage.setItem(storageKey, JSON.stringify(payload)).catch((error) => {
      console.error("Failed to save active workout session progress", error);
    });
  }, [activeWorkoutSessionId, hasLoadedWorkoutSessions, loadedWorkoutSessionsOwnerId, sessionEntryIndex, storageOwnerId, workoutSessions]);

  useEffect(() => {
    let isMounted = true;
    setHasLoadedAchievements(false);
    setLoadedAchievementsOwnerId(null);

    Promise.all([
      loadUserAchievements(storageOwnerId),
      loadAppUsageStats(storageOwnerId),
      loadAchievementsSyncState(storageOwnerId)
    ]).then(([loadedAchievements, loadedUsageStats, loadedSyncState]) => {
      if (!isMounted) {
        return;
      }

      setUserAchievements(loadedAchievements);
      setAppUsageStats(loadedUsageStats);
      setAchievementsSyncState(loadedSyncState);
      setLoadedAchievementsOwnerId(storageOwnerId);
      setHasLoadedAchievements(true);
      hasPersistedLocalAchievementsRef.current = false;
      syncedAchievementsUserIdRef.current = null;
    }).catch((error) => {
      console.error("Failed to load achievements", error);
      if (isMounted) {
        setUserAchievements([]);
        setAppUsageStats(getDefaultAppUsageStats());
        setAchievementsSyncState({});
        setLoadedAchievementsOwnerId(storageOwnerId);
        setHasLoadedAchievements(true);
        hasPersistedLocalAchievementsRef.current = false;
        syncedAchievementsUserIdRef.current = null;
      }
    });

    return () => {
      isMounted = false;
    };
  }, [storageOwnerId]);

  useEffect(() => {
    if (!hasLoadedAchievements || loadedAchievementsOwnerId !== storageOwnerId) {
      return;
    }

    saveUserAchievements(storageOwnerId, userAchievements).catch((error) => {
      console.error("Failed to save achievements", error);
    });

    if (isApplyingAccountAchievementsRef.current) {
      hasPersistedLocalAchievementsRef.current = true;
      return;
    }

    if (!user || syncedAchievementsUserIdRef.current !== user.id) {
      hasPersistedLocalAchievementsRef.current = true;
      return;
    }

    if (!hasPersistedLocalAchievementsRef.current) {
      hasPersistedLocalAchievementsRef.current = true;
      return;
    }

    if (achievementsSyncTimeoutRef.current) {
      clearTimeout(achievementsSyncTimeoutRef.current);
    }

    achievementsSyncTimeoutRef.current = setTimeout(() => {
      syncAccountAchievements(user, userAchievements, appUsageStats).then((merged) => {
        isApplyingAccountAchievementsRef.current = true;
        setUserAchievements(merged.unlocked);
        setAppUsageStats(merged.appUsageStats);
        setTimeout(() => {
          isApplyingAccountAchievementsRef.current = false;
        }, 0);
      }).catch((error) => {
        console.error("Failed to sync achievements", error);
      });
    }, 1200);
  }, [hasLoadedAchievements, loadedAchievementsOwnerId, storageOwnerId, userAchievements]);

  useEffect(() => {
    if (!hasLoadedAchievements || loadedAchievementsOwnerId !== storageOwnerId) {
      return;
    }

    saveAppUsageStats(storageOwnerId, appUsageStats).catch((error) => {
      console.error("Failed to save app usage stats", error);
    });

    if (isApplyingAccountAchievementsRef.current || !user || syncedAchievementsUserIdRef.current !== user.id) {
      return;
    }

    if (!hasPersistedLocalAchievementsRef.current) {
      return;
    }

    if (achievementsSyncTimeoutRef.current) {
      clearTimeout(achievementsSyncTimeoutRef.current);
    }

    achievementsSyncTimeoutRef.current = setTimeout(() => {
      syncAccountAchievements(user, userAchievements, appUsageStats).then((merged) => {
        isApplyingAccountAchievementsRef.current = true;
        setUserAchievements(merged.unlocked);
        setAppUsageStats(merged.appUsageStats);
        setTimeout(() => {
          isApplyingAccountAchievementsRef.current = false;
        }, 0);
      }).catch((error) => {
        console.error("Failed to sync app usage stats", error);
      });
    }, 1800);
  }, [appUsageStats, hasLoadedAchievements, loadedAchievementsOwnerId, storageOwnerId, user, userAchievements]);

  useEffect(() => {
    if (!hasLoadedAchievements || loadedAchievementsOwnerId !== storageOwnerId) {
      return;
    }

    saveAchievementsSyncState(storageOwnerId, achievementsSyncState).catch((error) => {
      console.error("Failed to save achievements sync state", error);
    });
  }, [achievementsSyncState, hasLoadedAchievements, loadedAchievementsOwnerId, storageOwnerId]);

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

  const bottomInset = Math.max(insets.bottom, 18);
  const bottomSheetBottomPadding = Math.max(insets.bottom, 72) + 24;
  const bottomNavHeight = 58 + bottomInset;
  const stickyActionBottom = bottomNavHeight - 4;

  function getAuthHeaders(session = user): Record<string, string> {
    return getApiHeaders(session);
  }

  function getApiHeaders(session: UserSession | null = user): Record<string, string> {
    const correlationId = createCorrelationId();
    const headers: Record<string, string> = {
      "ngrok-skip-browser-warning": "true",
      "X-Correlation-Id": correlationId
    };

    if (session?.token) {
      headers.Authorization = `Bearer ${session.token}`;
    }

    return headers;
  }

  async function createApiError(response: Response, endpoint: string, method: string, fallbackMessage: string) {
    const correlationId = response.headers.get("X-Correlation-Id") ?? undefined;
    recordCorrelationId(correlationId);
    const body = await response.json().catch(() => null) as
      | { error?: string | { code?: string; message?: string; correlationId?: string }; detail?: string; message?: string }
      | null;
    const errorObject = typeof body?.error === "object" ? body.error : null;
    const code = errorObject?.code ?? (response.status === 429 ? "rate_limited" : undefined);
    const message = response.status === 429
      ? t("rateLimitError")
      : errorObject?.message ?? (typeof body?.error === "string" ? body.error : body?.detail ?? body?.message ?? fallbackMessage);
    const apiError = {
      code,
      correlationId: errorObject?.correlationId ?? correlationId,
      endpoint,
      message,
      method,
      status: response.status
    };
    recordApiError(apiError);
    const error = new Error(message) as Error & { code?: string; correlationId?: string; status?: number };
    error.code = code;
    error.correlationId = apiError.correlationId;
    error.status = response.status;
    return error;
  }

  async function fetchAiCredits(session = user) {
    if (!session) {
      return;
    }

    setIsAiCreditsLoading(true);
    setAiCreditsError("");
    try {
      const headers = getAuthHeaders(session);
      const [balanceResponse, transactionsResponse, packsResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/api/ai-credits/balance`, { headers }),
        fetch(`${apiBaseUrl}/api/ai-credits/transactions?limit=50`, { headers }),
        fetch(`${apiBaseUrl}/api/ai-credits/packs`, { headers })
      ]);

      if (balanceResponse.status === 401 || transactionsResponse.status === 401 || packsResponse.status === 401) {
        handleUnauthorizedSession();
        return;
      }

      if (!balanceResponse.ok) {
        throw await createApiError(balanceResponse, "/api/ai-credits/balance", "GET", t("aiCreditsLoadError"));
      }

      const balanceBody = await balanceResponse.json().catch(() => null) as unknown;
      setAiCreditBalance(normalizeAiCreditBalance(balanceBody));

      if (transactionsResponse.ok) {
        setAiCreditTransactions(normalizeAiCreditTransactions(await transactionsResponse.json().catch(() => null)));
      }

      if (packsResponse.ok) {
        const packs = normalizeAiCreditPacks(await packsResponse.json().catch(() => null));
        const products = await getAiCreditProducts(packs.map((pack) => pack.productId)).catch(() => []);
        setAiCreditPacks(packs.map((pack) => {
          const product = products.find((item) => item.productId === pack.productId);
          return product?.localizedPrice ? { ...pack, localizedPrice: product.localizedPrice } : pack;
        }));
      }
    } catch (error) {
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

    const response = await fetch(`${apiBaseUrl}/api/ai-credits/purchases/google-play/verify`, {
      body: JSON.stringify({
        orderId: purchase.orderId ?? null,
        productId: purchase.productId,
        purchaseToken: purchase.purchaseToken
      }),
      headers: {
        ...getAuthHeaders(session),
        "Content-Type": "application/json"
      },
      method: "POST"
    });

    if (response.status === 401) {
      handleUnauthorizedSession();
      return null;
    }

    if (!response.ok) {
      throw await createApiError(
        response,
        "/api/ai-credits/purchases/google-play/verify",
        "POST",
        t("aiCreditsPurchaseVerifyError")
      );
    }

    const result = normalizeAiCreditPurchaseVerifyResponse(await response.json().catch(() => null));
    if (!result) {
      throw new Error(t("aiCreditsPurchaseVerifyError"));
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
      const purchase = await purchaseAiCreditPack(pack.productId);
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
      const response = await fetch(`${apiBaseUrl}/api/ai-credits/dev/grant`, {
        body: JSON.stringify({
          amount: 10,
          reason: "Mobile dev top-up"
        }),
        headers: {
          ...getAuthHeaders(user),
          "Content-Type": "application/json"
        },
        method: "POST"
      });

      if (response.status === 401) {
        handleUnauthorizedSession();
        return;
      }

      if (!response.ok) {
        throw await createApiError(response, "/api/ai-credits/dev/grant", "POST", t("aiCreditsLoadError"));
      }

      setAiCreditBalance(normalizeAiCreditBalance(await response.json().catch(() => null)));
      await fetchAiCredits(user);
    } catch (error) {
      console.error("Failed to grant development AI credits", error);
      setAiCreditsError(getErrorMessageOrFallback(error, t("aiCreditsLoadError"), t("serverProblemMessage")));
    } finally {
      setIsAiCreditsLoading(false);
    }
  }

  async function fetchAccountWorkouts(session: UserSession) {
    const response = await fetch(`${apiBaseUrl}/api/workouts/`, {
      headers: getAuthHeaders(session)
    });

    if (!response.ok) {
      throw new Error(`Workout fetch failed with status ${response.status}`);
    }

    const responseBody = await response.json().catch(() => []) as ApiWorkout[];
    return Array.isArray(responseBody) ? responseBody.map(mapApiWorkoutToSavedWorkout) : [];
  }

  async function synchronizeAccountWorkouts(session: UserSession, localWorkouts: SavedWorkout[]) {
    const response = await fetch(`${apiBaseUrl}/api/sync/workouts`, {
      body: JSON.stringify({
        deletedClientWorkoutIds: [],
        lastPulledAt: null,
        workouts: localWorkouts.map(mapSavedWorkoutToApiRequest)
      }),
      headers: {
        ...getAuthHeaders(session),
        "Content-Type": "application/json"
      },
      method: "POST"
    });

    if (!response.ok) {
      throw new Error(`Workout sync failed with status ${response.status}`);
    }

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

    const response = await fetch(`${apiBaseUrl}/api/workouts/`, {
      body: JSON.stringify(mapSavedWorkoutToApiRequest(nextWorkout)),
      headers: {
        ...getAuthHeaders(session),
        "Content-Type": "application/json"
      },
      method: "POST"
    });

    if (!response.ok) {
      throw new Error(`Workout upsert failed with status ${response.status}`);
    }
  }

  async function deleteAccountWorkout(workoutId: string, session = user) {
    if (!session) {
      return;
    }

    const response = await fetch(`${apiBaseUrl}/api/workouts/${encodeURIComponent(workoutId)}`, {
      headers: getAuthHeaders(session),
      method: "DELETE"
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Workout delete failed with status ${response.status}`);
    }
  }

  function buildCurrentSettingsPayload(updatedAt = localSettingsUpdatedAt) {
    return {
      collapsedPanels,
      defaultSetCount,
      defaultStageType: defaultStageType || null,
      defaultWorkoutExecutionMode,
      defaultWorkoutTableOrientation,
      showRestTimer,
      defaultWeight,
      isAuthPanelDismissed,
      language,
      themeName,
      workoutReminders,
      updatedAt
    };
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
    isApplyingAccountSettingsRef.current = true;

    const nextLanguage = isLanguageCode(settings.language) ? settings.language : "en";
    const nextThemeName = isThemeName(settings.themeName) ? settings.themeName : "light";
    const nextDefaultSetCount = typeof settings.defaultSetCount === "string" ? settings.defaultSetCount : "";
    const nextDefaultWeight = typeof settings.defaultWeight === "string" ? settings.defaultWeight : "";
    const nextDefaultStageType = settings.defaultStageType && isStageType(settings.defaultStageType)
      ? settings.defaultStageType
      : "";
    const nextDefaultWorkoutExecutionMode = isWorkoutExecutionMode(settings.defaultWorkoutExecutionMode)
      ? settings.defaultWorkoutExecutionMode
      : "guided";
    const nextDefaultWorkoutTableOrientation = isWorkoutTableOrientation(settings.defaultWorkoutTableOrientation)
      ? settings.defaultWorkoutTableOrientation
      : "vertical";
    const nextShowRestTimer = settings.showRestTimer !== false;
    const nextCollapsedPanels = normalizeCollapsedPanels(settings.collapsedPanels);
    const nextWorkoutReminders = normalizeWorkoutReminderSettings(settings.workoutReminders, nextLanguage);
    const nextUpdatedAt = typeof settings.updatedAt === "string" ? settings.updatedAt : new Date().toISOString();

    setLanguage(nextLanguage);
    setPendingLanguage(nextLanguage);
    setThemeName(nextThemeName);
    setDefaultSetCount(nextDefaultSetCount);
    setPendingDefaultSetCount(nextDefaultSetCount);
    setDefaultWeight(nextDefaultWeight);
    setPendingDefaultWeight(nextDefaultWeight);
    setDefaultStageType(nextDefaultStageType);
    setPendingDefaultStageType(nextDefaultStageType);
    setDefaultWorkoutExecutionMode(nextDefaultWorkoutExecutionMode);
    setPendingDefaultWorkoutExecutionMode(nextDefaultWorkoutExecutionMode);
    setDefaultWorkoutTableOrientation(nextDefaultWorkoutTableOrientation);
    setShowRestTimer(nextShowRestTimer);
    setWorkoutReminders(nextWorkoutReminders);
    setPendingWorkoutReminderDay(null);
    setCollapsedPanels(nextCollapsedPanels);
    setIsAuthPanelDismissed(settings.isAuthPanelDismissed === true);
    setLocalSettingsUpdatedAt(nextUpdatedAt);

    setTimeout(() => {
      isApplyingAccountSettingsRef.current = false;
    }, 0);
  }

  async function fetchAccountSettings(session: UserSession) {
    const response = await fetch(`${apiBaseUrl}/api/settings`, {
      headers: getAuthHeaders(session)
    });

    if (response.status === 204 || response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Settings fetch failed with status ${response.status}`);
    }

    const responseBody = await response.json().catch(() => null) as unknown;
    return normalizeApiUserSettings(responseBody);
  }

  async function saveAccountSettings(payload = buildCurrentSettingsPayload(), session = user) {
    if (!session) {
      return null;
    }

    const response = await fetch(`${apiBaseUrl}/api/settings`, {
      body: JSON.stringify(payload),
      headers: {
        ...getAuthHeaders(session),
        "Content-Type": "application/json"
      },
      method: "PUT"
    });

    if (!response.ok) {
      throw new Error(`Settings save failed with status ${response.status}`);
    }

    const responseBody = await response.json().catch(() => null) as unknown;
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
    const metadata = await loadFavoriteExercisesSyncMetadata(session.id);
    const lastPulledAt = forceFullPull || metadata.userId !== session.id ? null : metadata.lastPulledAt ?? null;
    const response = await fetch(`${apiBaseUrl}/api/sync/favorite-exercises`, {
      body: JSON.stringify({
        deletedExerciseIds: getDeletedFavoriteExerciseIds(localFavorites),
        favorites: localFavorites,
        lastPulledAt
      }),
      headers: {
        ...getAuthHeaders(session),
        "Content-Type": "application/json"
      },
      method: "POST"
    });

    if (response.status === 401) {
      throw new Error("Favorite exercises sync unauthorized");
    }

    if (!response.ok) {
      throw new Error(`Favorite exercises sync failed with status ${response.status}`);
    }

    const responseBody = normalizeApiFavoriteExercisesResponse(await response.json().catch(() => null));
    const remoteFavorites = responseBody.favorites ?? [];
    const mergedFavorites = mergeFavoriteExercises(localFavorites, remoteFavorites);

    await saveFavoriteExercisesSyncMetadata({
      lastPulledAt: responseBody.serverTime ?? new Date().toISOString(),
      lastPushedAt: new Date().toISOString(),
      userId: session.id
    }, session.id);

    return mergedFavorites;
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

  async function loadWorkoutSessionsSyncMetadata(userId?: string | null): Promise<WorkoutSessionsSyncMetadata> {
    try {
      const rawData = await AsyncStorage.getItem(getAccountStorageKey(WORKOUT_SESSIONS_SYNC_STORAGE_BASE_KEY, userId));
      if (!rawData) {
        return {};
      }

      const parsed = JSON.parse(rawData) as Partial<WorkoutSessionsSyncMetadata>;
      return {
        lastPulledAt: typeof parsed.lastPulledAt === "string" ? parsed.lastPulledAt : null,
        lastPushedAt: typeof parsed.lastPushedAt === "string" ? parsed.lastPushedAt : null,
        userId: typeof parsed.userId === "string" ? parsed.userId : null
      };
    } catch (error) {
      console.error("Failed to load workout sessions sync metadata", error);
      return {};
    }
  }

  async function saveWorkoutSessionsSyncMetadata(metadata: WorkoutSessionsSyncMetadata, userId?: string | null) {
    await AsyncStorage.setItem(getAccountStorageKey(WORKOUT_SESSIONS_SYNC_STORAGE_BASE_KEY, userId), JSON.stringify(metadata));
  }

  async function syncAccountWorkoutSessions(
    session: UserSession,
    localSessions: WorkoutSession[],
    forceFullPull = false
  ) {
    const normalizedLocalSessions = normalizeWorkoutSessions(localSessions);
    const metadata = await loadWorkoutSessionsSyncMetadata(session.id);
    const lastPulledAt = forceFullPull || metadata.userId !== session.id ? null : metadata.lastPulledAt ?? null;
    const response = await fetch(`${apiBaseUrl}/api/sync/workout-sessions`, {
      body: JSON.stringify({
        deletedClientSessionIds: getDeletedWorkoutSessionIds(normalizedLocalSessions),
        lastPulledAt,
        sessions: normalizedLocalSessions.map((workoutSession) => ({
          clientSessionId: getClientSessionId(workoutSession),
          clientUpdatedAt: getWorkoutSessionUpdatedAt(workoutSession),
          deletedAt: workoutSession.deletedAt ?? null,
          session: workoutSession
        }))
      }),
      headers: {
        ...getAuthHeaders(session),
        "Content-Type": "application/json"
      },
      method: "POST"
    });

    if (response.status === 401) {
      throw new Error("Workout sessions sync unauthorized");
    }

    if (!response.ok) {
      throw new Error(`Workout sessions sync failed with status ${response.status}`);
    }

    const responseBody = normalizeApiWorkoutSessionsResponse(await response.json().catch(() => null));
    const remoteSessions = normalizeWorkoutSessions(
      responseBody.sessions?.map((envelope) => envelope.session).filter(Boolean) ?? []
    );
    const mergedSessions = mergeWorkoutSessions(normalizedLocalSessions, remoteSessions);

    await saveWorkoutSessionsSyncMetadata({
      lastPulledAt: responseBody.serverTime ?? new Date().toISOString(),
      lastPushedAt: new Date().toISOString(),
      userId: session.id
    }, session.id);

    return mergedSessions;
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

  function normalizeApiAchievementsResponse(value: unknown) {
    const fallbackNow = new Date().toISOString();
    if (!isRecord(value)) {
      return {
        appUsageStats: getDefaultAppUsageStats(fallbackNow),
        serverTime: fallbackNow,
        unlocked: []
      };
    }

    const serverTime = typeof value.serverTime === "string" ? value.serverTime : fallbackNow;
    return {
      appUsageStats: isRecord(value.appUsageStats)
        ? {
            totalForegroundSeconds: typeof value.appUsageStats.totalForegroundSeconds === "number"
              ? value.appUsageStats.totalForegroundSeconds
              : 0,
            updatedAt: typeof value.appUsageStats.updatedAt === "string" ? value.appUsageStats.updatedAt : serverTime
          }
        : getDefaultAppUsageStats(serverTime),
      serverTime,
      unlocked: Array.isArray(value.unlocked)
        ? value.unlocked
          .filter(isRecord)
          .map((achievement) => ({
            achievementId: typeof achievement.achievementId === "string" ? achievement.achievementId : "",
            progressAtUnlock: typeof achievement.progressAtUnlock === "number" ? achievement.progressAtUnlock : undefined,
            unlockedAt: typeof achievement.unlockedAt === "string" ? achievement.unlockedAt : "",
            updatedAt: typeof achievement.updatedAt === "string" ? achievement.updatedAt : undefined
          }))
        : []
    };
  }

  async function syncAccountAchievements(
    session: UserSession,
    localAchievements: UserAchievement[],
    localUsageStats: AppUsageStats,
    forceFullPull = false
  ) {
    const metadata = await loadAchievementsSyncState(session.id);
    const lastPulledAt = forceFullPull ? null : metadata.lastPulledAt ?? null;
    const response = await fetch(`${apiBaseUrl}/api/sync/achievements`, {
      body: JSON.stringify({
        appUsageStats: localUsageStats,
        lastPulledAt,
        unlocked: localAchievements
      }),
      headers: {
        ...getAuthHeaders(session),
        "Content-Type": "application/json"
      },
      method: "POST"
    });

    if (response.status === 401) {
      handleUnauthorizedSession();
      throw new Error("Achievements sync unauthorized");
    }

    if (!response.ok) {
      throw await createApiError(response, "/api/sync/achievements", "POST", "Achievements sync failed");
    }

    const responseBody = normalizeApiAchievementsResponse(await response.json().catch(() => null));
    const mergedAchievements = mergeUserAchievements(localAchievements, responseBody.unlocked);
    const mergedUsageStats = mergeAppUsageStats(localUsageStats, responseBody.appUsageStats);
    const nextSyncState = {
      lastPulledAt: responseBody.serverTime,
      lastSyncedAt: new Date().toISOString()
    };

    await saveAchievementsSyncState(session.id, nextSyncState);
    setAchievementsSyncState(nextSyncState);

    return {
      appUsageStats: mergedUsageStats,
      unlocked: mergedAchievements
    };
  }

  async function synchronizeAccountAchievements(
    session: UserSession,
    localAchievements: UserAchievement[],
    localUsageStats: AppUsageStats
  ) {
    const merged = await syncAccountAchievements(session, localAchievements, localUsageStats, true);
    isApplyingAccountAchievementsRef.current = true;
    setUserAchievements(merged.unlocked);
    setAppUsageStats(merged.appUsageStats);
    setTimeout(() => {
      isApplyingAccountAchievementsRef.current = false;
    }, 0);
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
      setCreatorPlanText(getApiPlanText(completedResponseBody));
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

      const response = await fetch(`${apiBaseUrl}/api/workout-creator/plan/${encodeURIComponent(jobId)}`, {
        headers: {
          ...getAuthHeaders(user),
          "ngrok-skip-browser-warning": "true"
        }
      });
      const responseBody = await response.json().catch(() => null) as unknown;

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(t("aiRewriteSessionExpired"));
        }

        const message =
          isRecord(responseBody) && getApiString(responseBody, ["detail", "error", "title"])
            ? getApiString(responseBody, ["detail", "error", "title"])
            : t("aiCreatorSubmitError");
        throw new Error(message);
      }

      if (!isRecord(responseBody)) {
        continue;
      }

      const status = getApiString(responseBody, ["status"]).toLowerCase();

      if (status === "completed") {
        return getApiValue(responseBody, ["result", "response", "data"]) ??
          getApiValue(responseBody, ["result", "data"]) ??
          getApiValue(responseBody, ["result"]) ??
          responseBody;
      }

      if (status === "failed") {
        throw new Error(getApiString(responseBody, ["error", "detail", "title"]) || t("aiCreatorSubmitError"));
      }

      await delay(5000);
    }

    throw new Error(t("aiCreatorSubmitError"));
  }

  async function resumePendingWorkoutCreatorJob(job: PendingCreatorJob, shouldContinue: () => boolean = () => true) {
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

    if (aiCreditBalance.balance < aiCreditBalance.planCost) {
      setCreatorSubmitError(t("aiCreditsInsufficient"));
      return;
    }

    setIsCreatorSubmitting(true);
    setCreatorSubmitError("");
    setCreatorImportedWorkoutCount(0);
    setCreatorPhase("submitted");

    try {
      const response = await fetch(`${apiBaseUrl}/api/workout-creator/plan`, {
        body: JSON.stringify({
          language,
          profileId,
          questionsAndAnswers
        }),
        headers: {
          ...getAuthHeaders(user),
          "Content-Type": "application/json",
          "X-Idempotency-Key": `plan-${profileId ?? "profile"}-${Date.now()}`,
          "ngrok-skip-browser-warning": "true"
        },
        method: "POST"
      });
      const responseBody = await response.json().catch(() => null) as
        | WorkoutCreatorPlanResponse
        | WorkoutCreatorApiWorkout[]
        | { jobId?: string; status?: string }
        | { detail?: string; error?: string; title?: string }
        | null;

      if (!response.ok) {
        const apiError = isRecord(responseBody) ? (responseBody as Record<string, unknown>)["error"] : null;
        if (
          isRecord(apiError) &&
          apiError.code === "insufficient_ai_credits"
        ) {
          const error = new Error(t("aiCreditsInsufficient")) as Error & { code?: string; status?: number };
          error.code = "insufficient_ai_credits";
          error.status = response.status;
          throw error;
        }

        const message =
          isRecord(responseBody) && getApiString(responseBody, ["detail", "error", "title"])
            ? getApiString(responseBody, ["detail", "error", "title"])
            : t("aiCreatorSubmitError");
        throw new Error(message);
      }

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
      const response = await fetch(`${apiBaseUrl}/api/workout-creator/rewrite`, {
        body: JSON.stringify({
          language,
          workout: mapSavedWorkoutToApiRequest(sourceWorkout),
          instruction,
          preferences: {
            catalogOnly: true
          }
        }),
        headers: {
          ...getAuthHeaders(user),
          "Content-Type": "application/json",
          "X-Idempotency-Key": `rewrite-${sourceWorkout.id}-${Date.now()}`,
          "ngrok-skip-browser-warning": "true"
        },
        method: "POST"
      });
      const responseBody = await response.json().catch(() => null) as unknown;

      if (response.status === 401) {
        throw new Error(t("aiRewriteSessionExpired"));
      }

      if (!response.ok) {
        const apiError = isRecord(responseBody) ? responseBody["error"] : null;
        if (
          isRecord(apiError) &&
          apiError.code === "insufficient_ai_credits"
        ) {
          const error = new Error(t("aiCreditsInsufficient")) as Error & { code?: string; status?: number };
          error.code = "insufficient_ai_credits";
          error.status = response.status;
          throw error;
        }

        const message =
          isRecord(responseBody) && getApiString(responseBody, ["detail", "error", "title"])
            ? getApiString(responseBody, ["detail", "error", "title"])
            : t("aiRewriteStartError");
        throw new Error(message);
      }

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
      setRewriteError(isInsufficientAiCreditsError(error)
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
    const session: UserSession = {
      avatarUpdatedAt: authResponse.user.avatarUpdatedAt ?? null,
      avatarUrl: authResponse.user.avatarUrl ?? null,
      createdOn: authResponse.user.createdOn ?? null,
      email: authResponse.user.email,
      id: authResponse.user.id,
      modifiedOn: authResponse.user.modifiedOn ?? null,
      name: authResponse.user.name || authResponse.user.email.split("@")[0] || t("defaultUserName"),
      token: authResponse.token
    };

    const payload: LocalAuthStorage = {
      token: authResponse.token,
      updatedAt: new Date().toISOString(),
      user: authResponse.user,
      version: 1
    };

    await AsyncStorage.setItem(localAuthStorageKey, JSON.stringify(payload));
    setUser(session);
    setPassword("");
    setShowLoginForm(false);
    setAuthError("");
    setActiveScreen("home");
  }

  async function submitAuthRequest(endpoint: "login" | "register", body: Record<string, string>) {
    setIsAuthSubmitting(true);
    setAuthError("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/${endpoint}`, {
        body: JSON.stringify(body),
        headers: {
          "Content-Type": "application/json",
          "X-Gymmin-Device-Name": getAuthDeviceName(),
          ...getApiHeaders(null)
        },
        method: "POST"
      });
      recordCorrelationId(response.headers.get("X-Correlation-Id"));
      const responseBody = await response.json().catch(() => null) as
        | AuthApiResponse
        | { error?: string; detail?: string; title?: string }
        | null;

      if (!response.ok) {
        if (response.status === 429) {
          throw await createApiError(response, `/api/auth/${endpoint}`, "POST", t("authRequestError"));
        }

        const message =
          responseBody && "error" in responseBody
            ? responseBody.error
            : responseBody && "detail" in responseBody
              ? responseBody.detail
              : t("authRequestError");
        throw new Error(message ?? t("authRequestError"));
      }

      if (!responseBody || !("token" in responseBody) || !responseBody.user) {
        throw new Error(t("authRequestError"));
      }

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
      const storedData = rawData ? JSON.parse(rawData) as Partial<LocalAuthStorage> : null;
      if (storedData?.token) {
        await AsyncStorage.setItem(localAuthStorageKey, JSON.stringify({
          ...storedData,
          token: storedData.token,
          updatedAt: new Date().toISOString(),
          user: {
            ...(isRecord(storedData.user) ? storedData.user : {}),
            avatarUpdatedAt: nextUser.avatarUpdatedAt ?? null,
            avatarUrl: nextUser.avatarUrl ?? null,
            createdOn: nextUser.createdOn ?? null,
            email: nextUser.email,
            id: nextUser.id,
            modifiedOn: nextUser.modifiedOn ?? null,
            name: nextUser.name
          },
          version: 1
        } satisfies LocalAuthStorage));
      }
    } catch (error) {
      console.error("Failed to update cached auth user", error);
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
      const mimeType = asset.mimeType && ["image/jpeg", "image/png", "image/webp"].includes(asset.mimeType)
        ? asset.mimeType
        : "image/jpeg";
      const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
      const formData = new FormData();
      formData.append("avatar", {
        name: `avatar.${extension}`,
        type: mimeType,
        uri: asset.uri
      } as unknown as Blob);

      const response = await fetch(`${apiBaseUrl}/api/profile/avatar`, {
        body: formData,
        headers: getAuthHeaders(user),
        method: "POST"
      });
      recordCorrelationId(response.headers.get("X-Correlation-Id"));

      if (response.status === 401) {
        handleUnauthorizedSession();
        return;
      }

      if (!response.ok) {
        throw await createApiError(response, "/api/profile/avatar", "POST", t("avatarUploadError"));
      }

      const responseBody = await response.json().catch(() => null) as AvatarResponse | null;
      await applyAvatarUpdate(responseBody ?? {});
      setAvatarMessage(t("avatarUpdated"));
    } catch (error) {
      setAvatarMessage(getErrorMessageOrFallback(error, t("avatarUploadError"), t("avatarNetworkError")));
    } finally {
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
      const response = await fetch(`${apiBaseUrl}/api/profile/avatar`, {
        headers: getAuthHeaders(user),
        method: "DELETE"
      });
      recordCorrelationId(response.headers.get("X-Correlation-Id"));

      if (response.status === 401) {
        handleUnauthorizedSession();
        return;
      }

      if (!response.ok) {
        throw await createApiError(response, "/api/profile/avatar", "DELETE", t("avatarRemoveError"));
      }

      const responseBody = await response.json().catch(() => null) as AvatarResponse | null;
      await applyAvatarUpdate(responseBody ?? { avatarUrl: null, avatarUpdatedAt: null });
      setAvatarMessage(t("avatarRemoved"));
    } catch (error) {
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
      const response = await fetch(`${apiBaseUrl}/api/auth/password-reset/request`, {
        body: JSON.stringify({ email: normalizedEmail }),
        headers: {
          "Content-Type": "application/json",
          ...getApiHeaders(null)
        },
        method: "POST"
      });
      recordCorrelationId(response.headers.get("X-Correlation-Id"));

      if (!response.ok) {
        throw await createApiError(response, "/api/auth/password-reset/request", "POST", t("authRequestError"));
      }

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
      const response = await fetch(`${apiBaseUrl}/api/auth/password-reset/confirm`, {
        body: JSON.stringify({ token: resetToken.trim(), newPassword }),
        headers: {
          "Content-Type": "application/json",
          ...getApiHeaders(null)
        },
        method: "POST"
      });
      recordCorrelationId(response.headers.get("X-Correlation-Id"));

      if (!response.ok) {
        throw await createApiError(response, "/api/auth/password-reset/confirm", "POST", t("authRequestError"));
      }

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
      const response = await fetch(`${apiBaseUrl}/api/auth/change-password`, {
        body: JSON.stringify({ currentPassword, newPassword }),
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(user)
        },
        method: "POST"
      });

      if (response.status === 401) {
        handleUnauthorizedSession();
        return;
      }

      if (!response.ok) {
        throw new Error(response.status === 400 ? t("currentPasswordInvalid") : t("changePasswordFailed"));
      }

      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
      setIsCurrentPasswordVisible(false);
      setIsNewPasswordVisible(false);
      setIsRepeatPasswordVisible(false);
      setAuthMessage(t("passwordChanged"));
    } catch (error) {
      setAuthError(getErrorMessageOrFallback(error, t("changePasswordFailed"), t("serverProblemMessage")));
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
      const response = await fetch(`${apiBaseUrl}/api/auth/sessions`, {
        headers: {
          ...getAuthHeaders(user),
          "X-Gymmin-Device-Name": getAuthDeviceName()
        }
      });

      if (response.status === 401) {
        handleUnauthorizedSession();
        return;
      }

      if (!response.ok) {
        throw new Error(t("authRequestError"));
      }

      const body = await response.json() as AuthSessionsResponse;
      setActiveAuthSessions(Array.isArray(body.sessions) ? body.sessions : []);
    } catch (error) {
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
      const response = await fetch(`${apiBaseUrl}/api/auth/sessions/${encodeURIComponent(sessionId)}`, {
        headers: getAuthHeaders(user),
        method: "DELETE"
      });
      if (response.status === 401) {
        handleUnauthorizedSession();
        return;
      }
      if (!response.ok) {
        throw new Error(t("authRequestError"));
      }
      setAuthMessage(t("sessionSignedOut"));
      if (activeAuthSessions.find((session) => session.id === sessionId)?.isCurrent) {
        logOut();
        return;
      }
      await fetchAuthSessions();
    } catch (error) {
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
          fetch(`${apiBaseUrl}/api/auth/logout-all`, {
            body: JSON.stringify({ exceptCurrent: false }),
            headers: {
              "Content-Type": "application/json",
              ...getAuthHeaders(user)
            },
            method: "POST"
          })
            .then(() => logOut())
            .catch((error) => setAuthError(getErrorMessageOrFallback(error, t("authRequestError"), t("serverProblemMessage"))));
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
        screen: activeScreen,
        storageOwner: storageOwnerId,
        userId: user?.id ?? null
      },
      language,
      screen: getScreenTitle(activeScreen, editingWorkoutId, t),
      title: normalizedTitle
    };

    try {
      const response = await fetch(`${apiBaseUrl}/api/bug-reports`, {
        body: JSON.stringify(bugReportPayload),
        headers: {
          "Content-Type": "application/json",
          ...getApiHeaders(null)
        },
        method: "POST"
      });
      recordCorrelationId(response.headers.get("X-Correlation-Id"));
      const responseBody = await response.json().catch(() => null) as
        | { id?: string; error?: string; detail?: string }
        | null;

      if (!response.ok) {
        throw await createApiError(response, "/api/bug-reports", "POST", responseBody?.detail ?? responseBody?.error ?? t("bugSubmitError"));
      }

      setBugSubmittedId(responseBody?.id ?? "");
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
      fetch(`${apiBaseUrl}/api/auth/logout`, {
        headers: getApiHeaders(user),
        method: "POST"
      }).catch((error) => {
        console.error("Logout request failed", error);
      });
    }

    AsyncStorage.removeItem(localAuthStorageKey).catch((error) => {
      console.error("Failed to clear local auth", error);
    });
    syncedWorkoutUserIdRef.current = null;
    syncedSettingsUserIdRef.current = null;
    syncedFavoriteExercisesUserIdRef.current = null;
    syncedWorkoutSessionsUserIdRef.current = null;
    handledAccountPolicyUserIdRef.current = null;
    setFavoriteExercisesSyncStatus("local");
    setPendingCreatorJob(null);
    setCreatorPhase("form");
    setRewriteSourceWorkoutId(null);
    setRewriteProposedWorkout(null);
    setRewriteError("");
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
      const response = await fetch(`${apiBaseUrl}/api/account`, {
        headers: getAuthHeaders(accountToDelete),
        method: "DELETE"
      });
      recordCorrelationId(response.headers.get("X-Correlation-Id"));

      if (response.status === 401) {
        setDeleteAccountError(t("sessionExpired"));
        handleUnauthorizedSession();
        return;
      }

      if (!response.ok) {
        throw await createApiError(response, "/api/account", "DELETE", t("deleteAccountError"));
      }

      try {
        await removeAccountDataForOwner(accountOwnerId);
      } catch (cleanupError) {
        console.error("Failed to remove deleted account local data", cleanupError);
      }

      try {
        await AsyncStorage.removeItem(localAuthStorageKey);
      } catch (authCleanupError) {
        console.error("Failed to clear auth after account deletion", authCleanupError);
      }

      syncedWorkoutUserIdRef.current = null;
      syncedSettingsUserIdRef.current = null;
      syncedFavoriteExercisesUserIdRef.current = null;
      syncedWorkoutSessionsUserIdRef.current = null;
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
      setDeleteAccountError("");
      setAuthError("");
      setAuthMessage(t("deleteAccountSuccess"));
      setActiveScreen("home");
      showInfoDialog(t("profile"), t("deleteAccountSuccess"));
    } catch (error) {
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

  async function refreshSystemStatus(force = false) {
    const now = Date.now();
    if (!force && !shouldFetchSystemStatus(systemStatusFetchedAtRef.current, now)) {
      return;
    }

    setIsSystemStatusRefreshing(true);

    try {
      const response = await fetch(`${apiBaseUrl}/api/system/status`, {
        headers: getApiHeaders(null),
        method: "GET"
      });
      recordCorrelationId(response.headers.get("X-Correlation-Id"));

      if (!response.ok) {
        throw new Error("System status request failed");
      }

      const responseBody = await response.json().catch(() => null);
      setSystemStatus(normalizeSystemStatusResponse(responseBody));
    } catch {
      setSystemStatus(createOfflineSystemStatus());
    } finally {
      systemStatusFetchedAtRef.current = Date.now();
      setIsSystemStatusRefreshing(false);
    }
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
    const canDelete = isDeleteAccountConfirmationValid(deleteAccountConfirmation, language);

    return (
      <DeleteAccountScreen
        canDelete={canDelete}
        confirmation={deleteAccountConfirmation}
        confirmationPhrase={confirmationPhrase}
        error={deleteAccountError}
        isDeleting={isDeletingAccount}
        t={t}
        theme={theme}
        onCancel={() => {
          setDeleteAccountConfirmation("");
          setDeleteAccountError("");
          setActiveScreen("profile");
        }}
        onChangeConfirmation={setDeleteAccountConfirmation}
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
          style={styles.keyboardAvoidingContent}
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
                    ? stickyActionBottom + 118
                    : activeScreen === "workoutSession"
                      ? bottomNavHeight + (isKeyboardVisible ? 260 : 28)
                      : bottomNavHeight + 28
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
              left: insets.left,
              paddingBottom: bottomInset,
              right: insets.right
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
                style={styles.navButton}
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
