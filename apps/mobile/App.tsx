import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { config as gluestackConfig } from "@gluestack-ui/config";
import {
  GluestackUIProvider,
  Input,
  InputField
} from "@gluestack-ui/themed";
import { ErrorBoundary } from "react-error-boundary";
import type { FallbackProps } from "react-error-boundary";
import type { ReactNode } from "react";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";
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
  SectionList,
  ScrollView,
  StatusBar,
  Text,
  View,
  useWindowDimensions
} from "react-native";
import type { ImageSourcePropType, SectionListData, SectionListRenderItemInfo, StyleProp, TextInputProps, ViewStyle } from "react-native";

import { BUILD_API_BASE_URL } from "./src/config/buildConfig";
import { exerciseImageSources } from "./src/exerciseImageSources";
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
  type AchievementProgress,
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
  calculateEntryVolume,
  calculateSessionVolume,
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
import {
  formatRestDuration,
  formatWorkoutProgressPercent,
  getWorkoutProgress
} from "./src/domain/workoutSessionUi";
import type {
  ExerciseProgressItem,
  WorkoutExecutionMode,
  WorkoutSession,
  WorkoutSessionEntry,
  WorkoutSessionStatus
} from "./src/domain/workoutSessions";
import {
  buildExerciseSections,
  filterExerciseOptionsForPicker,
  findExerciseById,
  findExerciseByName,
  findCatalogExerciseBestEffort,
  getCachedExerciseOptions,
  getCachedExerciseOptionsForStageType,
  getExerciseDisplayName,
  getExerciseSectionsForStageType,
  getMuscleOptions,
  getPrimaryMuscles,
  getRequiredEquipment,
  muscleLabels,
  muscleKeys,
  getExerciseOptionTierBadge
} from "./src/domain/exercises";
import { activeExerciseLibraryTiers } from "./src/domain/exercises";
import type { Exercise, ExerciseLibraryTier, ExerciseOption, ExerciseSection, MuscleKey } from "./src/domain/exercises";
import {
  formatExerciseSetTarget,
  getExerciseDetails,
  getExerciseProgressKeyForDetails,
  isRestTargetStep,
  getWorkoutStepMuscleGroups,
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
  formatAiCreditPackName,
  getAiCreditPackDescription,
  getRecentAiCreditTransactions,
  isInsufficientAiCreditsError,
  normalizeAiCreditPurchaseVerifyResponse,
  normalizeAiCreditBalance,
  normalizeAiCreditPacks,
  normalizeAiCreditTransactions
} from "./src/domain/aiCredits";
import type { AiCreditBalance, AiCreditPack, AiCreditTransaction } from "./src/domain/aiCredits";
import {
  formatProgressDashboardVolume,
  getProgressDashboardStats,
  getProgressSparklineValues,
  getSortedProgressItems,
  getSparklinePolylinePoints,
  type ProgressDashboardFilter
} from "./src/domain/progressDashboard";
import {
  filterExerciseProgressHistoryGroups,
  formatExerciseProgressSeriesValue,
  formatExerciseProgressSetCount,
  getExerciseProgressHistoryGroups,
  type ExerciseProgressHistoryGroup,
  type ExerciseProgressHistoryRange
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
  getSystemStatusCopy,
  normalizeSystemStatusResponse,
  shouldFetchSystemStatus,
  type SystemStatusState
} from "./src/domain/systemStatus";
import {
  backBodyRegionMap,
  backBodySvg,
  frontBodyRegionMap,
  frontBodySvg
} from "./src/domain/bodyMaps";
import { articles, getArticleTranslation } from "./src/domain/articles";
import type { Article } from "./src/domain/articles";
import { GymminLogo, GymminMark } from "./src/components/GymminLogo";
import {
  AppButton,
  AppIconButton,
  AppInput,
  AppTextarea,
  InlineSheetSelectControl,
  PasswordInput,
  SelectControl
} from "./src/components/AppControls";
import {
  parseTimerSecondsValue,
  RestTimerControl,
  SessionValueInput,
  WorkoutHeaderElapsedTime
} from "./src/components/WorkoutSessionControls";
import { LegalPage } from "./src/components/LegalContent";
import { translate, type LanguageCode, type TranslationKey } from "./src/i18n/translations";
import { ContactScreen } from "./src/screens/ContactScreen";
import { BugReportScreen, BugReportSuccessScreen } from "./src/screens/BugReportScreen";
import { TermsScreen } from "./src/screens/TermsScreen";
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
const navItems = [
  { key: "home", icon: "home-outline" },
  { key: "workouts", icon: "barbell-outline" },
  { key: "settings", icon: "settings-outline" }
] as const;

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

const languageOptions: Array<{ label: string; value: LanguageCode }> = [
  { label: "Polski", value: "pl" },
  { label: "English", value: "en" }
];

type SettingsSheetKey =
  | "language"
  | "defaultSetCount"
  | "defaultWeight"
  | "defaultStageType"
  | "defaultWorkoutExecutionMode"
  | "showRestTimer"
  | "workoutReminderDay";


const stageTypeTranslationKeys: Record<StageType, TranslationKey> = {
  cooldown: "stageCooldown",
  exercise: "stageExercise",
  other: "stageOther",
  recovery: "stageRecovery",
  rest: "stageRest",
  warmup: "stageWarmup"
};

function getReminderDayOptions(t: (key: TranslationKey) => string) {
  return [
    { label: t("monday"), shortLabel: t("mondayShort"), value: 1 },
    { label: t("tuesday"), shortLabel: t("tuesdayShort"), value: 2 },
    { label: t("wednesday"), shortLabel: t("wednesdayShort"), value: 3 },
    { label: t("thursday"), shortLabel: t("thursdayShort"), value: 4 },
    { label: t("friday"), shortLabel: t("fridayShort"), value: 5 },
    { label: t("saturday"), shortLabel: t("saturdayShort"), value: 6 },
    { label: t("sunday"), shortLabel: t("sundayShort"), value: 7 }
  ];
}

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

type SavedWorkout = {
  createdAt?: string;
  draft: WorkoutDraft;
  id: string;
  name: string;
};

type WorkoutSortField = "createdAt" | "name";
type SortDirection = "asc" | "desc";

type WorkoutSortSettings = {
  direction: SortDirection;
  field: WorkoutSortField;
};
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

type NavKey = (typeof navItems)[number]["key"];
type ScreenKey =
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
type WorkoutHistoryStatusFilter = "all" | "completed" | "active";
type AchievementFilter = "all" | "unlocked" | "locked";

type AppDialogAction = {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "outline" | "destructive";
};

type AppDialogState = {
  actions: AppDialogAction[];
  message: string;
  title: string;
};

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
type AuthMode = "login" | "register";
type WorkoutCreatorPhase = "form" | "profilePrompt" | "submitted" | "waiting";
type LocalizedText = {
  en: string;
  pl: string;
};
type WorkoutCreatorFieldKind = "text" | "textarea" | "singleChoice" | "multiChoice";
type WorkoutCreatorValue = string | string[];
type WorkoutCreatorDraft = Record<string, WorkoutCreatorValue>;
type WorkoutCreatorField = {
  defaultValue?: LocalizedText;
  id: string;
  kind: WorkoutCreatorFieldKind;
  keyboardType?: TextInputProps["keyboardType"];
  label: LocalizedText;
  maxValue?: number;
  options?: LocalizedText[];
  placeholder?: LocalizedText;
};
type WorkoutCreatorSection = {
  id: string;
  title: LocalizedText;
  fields: WorkoutCreatorField[];
};
type WorkoutCreatorProfile = {
  draft: WorkoutCreatorDraft;
  id: string;
  name: string;
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

const yesNoOptions: LocalizedText[] = [
  { en: "Yes", pl: "Tak" },
  { en: "No", pl: "Nie" }
];

const workoutCreatorSections: WorkoutCreatorSection[] = [
  {
    id: "goals",
    title: { en: "Training goals", pl: "Cele treningowe" },
    fields: [
      {
        id: "primaryGoal",
        kind: "singleChoice",
        label: { en: "What is your main training goal?", pl: "Jaki jest Twój główny cel treningowy?" },
        options: [
          { en: "Muscle gain", pl: "Budowa masy mięśniowej" },
          { en: "Fat loss", pl: "Redukcja tkanki tłuszczowej" },
          { en: "Strength increase", pl: "Zwiększenie siły" },
          { en: "Conditioning", pl: "Poprawa kondycji" },
          { en: "Health improvement", pl: "Poprawa zdrowia" },
          { en: "Body recomposition", pl: "Sylwetka „rekompozycja”" }
        ]
      },
      {
        id: "secondaryGoals",
        kind: "textarea",
        label: { en: "What are your secondary goals?", pl: "Jakie są Twoje cele drugorzędne?" }
      },
      {
        id: "targetDate",
        kind: "text",
        label: { en: "Do you have a specific deadline for the result?", pl: "Czy masz konkretną datę, do której chcesz osiągnąć określony rezultat?" },
        placeholder: { en: "e.g. in 12 weeks, by September", pl: "np. za 12 tygodni, do września" }
      },
      {
        id: "bodyPartsToDevelop",
        kind: "text",
        label: { en: "Which body parts do you want to develop most?", pl: "Jakie partie ciała najbardziej chciałbyś rozwinąć?" }
      }
    ]
  },
  {
    id: "experience",
    title: { en: "Training experience", pl: "Doświadczenie treningowe" },
    fields: [
      {
        id: "age",
        kind: "text",
        keyboardType: "number-pad",
        label: { en: "How old are you?", pl: "Ile masz lat?" }
      },
      {
        id: "gender",
        kind: "singleChoice",
        label: { en: "What is your sex?", pl: "Płeć" },
        options: [
          { en: "Male", pl: "Mężczyzna" },
          { en: "Female", pl: "Kobieta" }
        ]
      },
      {
        id: "height",
        kind: "text",
        keyboardType: "number-pad",
        label: { en: "What is your height?", pl: "Jaki jest Twój wzrost?" },
        placeholder: { en: "cm", pl: "cm" }
      },
      {
        id: "bodyWeight",
        kind: "text",
        keyboardType: "decimal-pad",
        label: { en: "What is your current body weight?", pl: "Jaka jest Twoja aktualna masa ciała?" },
        placeholder: { en: "kg", pl: "kg" }
      },
      {
        id: "strengthTrainingExperience",
        kind: "text",
        keyboardType: "number-pad",
        label: { en: "How many years have you trained strength?", pl: "Jak długo trenujesz siłowo w latach?" },
        maxValue: 70
      },
      {
        id: "currentTrainingRegularity",
        kind: "text",
        keyboardType: "number-pad",
        label: { en: "How many days per week do you currently train regularly?", pl: "Ile dni w tygodniu obecnie trenujesz regularnie?" },
        maxValue: 7
      },
      {
        id: "likedExercises",
        kind: "textarea",
        label: { en: "Which exercises do you like?", pl: "Jakie ćwiczenia lubisz wykonywać?" }
      },
      {
        id: "dislikedExercises",
        kind: "textarea",
        label: { en: "Which exercises do you dislike or avoid?", pl: "Jakich ćwiczeń nie lubisz lub unikasz?" }
      },
      {
        id: "currentStrengthResults",
        kind: "textarea",
        label: { en: "What are your current strength results in basic lifts?", pl: "Jakie są Twoje obecne wyniki siłowe w podstawowych ćwiczeniach (przysiad, martwy ciąg, wyciskanie)?" },
        placeholder: { en: "Squat, deadlift, bench press", pl: "Przysiad, martwy ciąg, wyciskanie" }
      }
    ]
  },
  {
    id: "health",
    title: { en: "Health and limitations", pl: "Zdrowie i ograniczenia" },
    fields: [
      {
        id: "injuries",
        kind: "textarea",
        label: { en: "Do you have any injuries?", pl: "Czy masz jakiekolwiek kontuzje lub urazy?" }
      },
      {
        id: "jointPain",
        kind: "textarea",
        label: { en: "Do you feel joint, back, knee, shoulder or hip pain?", pl: "Czy odczuwasz bóle stawów, pleców, kolan, barków lub bioder?" }
      },
      {
        id: "surgeries",
        kind: "textarea",
        label: { en: "Have you had any surgeries?", pl: "Czy przeszedłeś jakieś operacje?" }
      },
      {
        id: "doctorLimitations",
        kind: "textarea",
        label: { en: "Has a doctor recommended limiting physical activity?", pl: "Czy lekarz zalecił Ci ograniczenie aktywności fizycznej?" }
      },
      {
        id: "chronicDiseases",
        kind: "singleChoice",
        label: { en: "Do you have any chronic diseases?", pl: "Czy cierpisz na choroby przewlekłe?" },
        options: [
          { en: "Hypertension", pl: "Nadciśnienie" },
          { en: "Diabetes", pl: "Cukrzyca" },
          { en: "Heart disease", pl: "Choroby serca" },
          { en: "Hormonal issues", pl: "Problemy hormonalne" }
        ]
      },
      {
        id: "medications",
        kind: "textarea",
        label: { en: "Do you take medications that may affect performance or recovery?", pl: "Czy przyjmujesz leki mogące wpływać na wydolność lub regenerację?" }
      }
    ]
  },
  {
    id: "lifestyle",
    title: { en: "Lifestyle", pl: "Styl życia" },
    fields: [
      {
        id: "workType",
        kind: "singleChoice",
        label: { en: "What type of work do you do?", pl: "Jaki rodzaj pracy wykonujesz?" },
        options: [
          { en: "Sedentary", pl: "Siedząca" },
          { en: "Physical", pl: "Fizyczna" },
          { en: "Mixed", pl: "Mieszana" }
        ]
      },
      {
        id: "sittingHours",
        kind: "text",
        keyboardType: "decimal-pad",
        label: { en: "How many hours per day do you spend sitting?", pl: "Ile godzin dziennie spędzasz siedząc?" }
      },
      {
        id: "sleepHours",
        kind: "text",
        keyboardType: "decimal-pad",
        label: { en: "How many hours do you sleep on average?", pl: "Ile średnio śpisz na dobę?" }
      },
      {
        id: "sleepQuality",
        kind: "text",
        keyboardType: "number-pad",
        label: { en: "How do you rate your sleep quality on a 1-10 scale?", pl: "Jak oceniasz jakość swojego snu w skali 1-10?" },
        placeholder: { en: "1-10", pl: "1-10" }
      },
      {
        id: "stressLevel",
        kind: "text",
        keyboardType: "number-pad",
        label: { en: "What is your stress level on a 1-10 scale?", pl: "Jak wygląda Twój poziom stresu w skali 1-10?" },
        placeholder: { en: "1-10", pl: "1-10" }
      },
      {
        id: "dailySteps",
        kind: "text",
        keyboardType: "number-pad",
        label: { en: "How many steps do you take on average per day?", pl: "Ile kroków wykonujesz przeciętnie dziennie?" }
      }
    ]
  },
  {
    id: "logistics",
    title: { en: "Training logistics", pl: "Logistyka treningów" },
    fields: [
      {
        id: "trainingDaysPerWeek",
        kind: "text",
        keyboardType: "number-pad",
        label: { en: "How many days per week can you realistically train?", pl: "Ile dni w tygodniu realnie możesz trenować?" }
      },
      {
        id: "sessionDuration",
        kind: "text",
        keyboardType: "number-pad",
        label: { en: "How much time can you spend on one workout in minutes?", pl: "Ile czasu możesz przeznaczyć na jeden trening w minutach?" },
        maxValue: 1000,
        placeholder: { en: "minutes", pl: "minuty" }
      },
      {
        id: "gymAccess",
        kind: "singleChoice",
        label: { en: "Do you have access to a full gym?", pl: "Czy masz dostęp do pełnowymiarowej siłowni?" },
        options: yesNoOptions
      },
      {
        id: "homeTraining",
        kind: "singleChoice",
        label: { en: "Will you sometimes train at home?", pl: "Czy czasami będziesz trenować w domu?" },
        options: yesNoOptions
      },
      {
        id: "splitPreference",
        kind: "singleChoice",
        label: { en: "Do you prefer full-body training or a split?", pl: "Czy preferujesz trening całego ciała (FBW) czy podział na partie (split)?" },
        options: [
          { en: "Full body", pl: "FBW" },
          { en: "Split", pl: "Split" },
          { en: "No preference", pl: "Bez preferencji" }
        ]
      },
      {
        id: "readyWarmupSet",
        kind: "singleChoice",
        defaultValue: { en: "No", pl: "Nie" },
        label: { en: "Do you want a ready warm-up set?", pl: "Czy chcesz gotowy zestaw rozgrzewki?" },
        options: yesNoOptions
      }
    ]
  }
];

const defaultCollapsedPanels: Record<string, boolean> = {
  "settings-account": true,
  "settings-info": true,
  "settings-integrations": true,
  "settings-notifications": true,
  "settings-preferences": true,
  "settings-training": true
};

const achievementImageSources: Record<string, ImageSourcePropType> = {
  "fifty-training-hours": require("./assets/achievements/fifty-training-hours.png"),
  "fifty-tons-volume": require("./assets/achievements/fifty-tons-volume.png"),
  "fifty-two-week-streak": require("./assets/achievements/fifty-two-week-streak.png"),
  "fifty-unique-exercises": require("./assets/achievements/fifty-unique-exercises.png"),
  "fifty-workouts": require("./assets/achievements/fifty-workouts.png"),
  "first-workout": require("./assets/achievements/first-workout.png"),
  "five-hundred-tons-volume": require("./assets/achievements/five-hundred-tons-volume.png"),
  "five-hundred-workouts": require("./assets/achievements/five-hundred-workouts.png"),
  "five-workouts": require("./assets/achievements/five-workouts.png"),
  "five-workouts-single-week": require("./assets/achievements/five-workouts-single-week.png"),
  "hundred-training-days": require("./assets/achievements/hundred-training-days.png"),
  "hundred-training-hours": require("./assets/achievements/hundred-training-hours.png"),
  "hundred-tons-volume": require("./assets/achievements/hundred-tons-volume.png"),
  "hundred-unique-exercises": require("./assets/achievements/hundred-unique-exercises.png"),
  "hundred-workouts": require("./assets/achievements/hundred-workouts.png"),
  "one-ton-volume": require("./assets/achievements/one-ton-volume.png"),
  "seven-training-days": require("./assets/achievements/seven-training-days.png"),
  "ten-app-hours": require("./assets/achievements/ten-app-hours.png"),
  "ten-training-hours": require("./assets/achievements/ten-training-hours.png"),
  "ten-tons-volume": require("./assets/achievements/ten-tons-volume.png"),
  "ten-unique-exercises": require("./assets/achievements/ten-unique-exercises.png"),
  "ten-workouts": require("./assets/achievements/ten-workouts.png"),
  "thirty-training-days": require("./assets/achievements/thirty-training-days.png"),
  "thirty-unique-exercises": require("./assets/achievements/thirty-unique-exercises.png"),
  "three-week-streak": require("./assets/achievements/three-week-streak.png"),
  "three-workouts-single-week": require("./assets/achievements/three-workouts-single-week.png"),
  "twelve-week-streak": require("./assets/achievements/twelve-week-streak.png"),
  "twenty-five-workouts": require("./assets/achievements/twenty-five-workouts.png"),
  "two-hundred-fifty-tons-volume": require("./assets/achievements/two-hundred-fifty-tons-volume.png"),
  "two-hundred-fifty-workouts": require("./assets/achievements/two-hundred-fifty-workouts.png")
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
  const [selectedArticleId, setSelectedArticleId] = useState(articles[0]?.id ?? "");
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
  const [reminderSchedulingStatus, setReminderSchedulingStatus] = useState<"idle" | "scheduled" | "failed" | "permissionDenied">("idle");
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
  const [progressSearch, setProgressSearch] = useState("");
  const [progressFilter, setProgressFilter] = useState<ProgressDashboardFilter>("all");
  const [selectedExerciseProgressKey, setSelectedExerciseProgressKey] = useState<string | null>(null);
  const [exerciseProgressHistoryRange, setExerciseProgressHistoryRange] = useState<ExerciseProgressHistoryRange>("all");
  const [exerciseProgressHistoryVisibleCount, setExerciseProgressHistoryVisibleCount] = useState(5);
  const [expandedExerciseProgressHistoryKeys, setExpandedExerciseProgressHistoryKeys] = useState<Record<string, boolean>>({});
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
  const [showAllAiCreditTransactions, setShowAllAiCreditTransactions] = useState(false);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [appUsageStats, setAppUsageStats] = useState<AppUsageStats>(() => getDefaultAppUsageStats());
  const [achievementsSyncState, setAchievementsSyncState] = useState<AchievementsSyncState>({});
  const [achievementToast, setAchievementToast] = useState<{ title: string; extraCount: number } | null>(null);
  const [achievementFilter, setAchievementFilter] = useState<AchievementFilter>("all");
  const [selectedAchievementPreview, setSelectedAchievementPreview] = useState<{
    imageSource: ImageSourcePropType;
    title: string;
  } | null>(null);
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

  const filteredExerciseProgressItems = useMemo(() => {
    const phrase = progressSearch.trim().toLowerCase();
    const searchedItems = phrase
      ? exerciseProgressItems.filter((item) => {
          return item.exerciseName.toLowerCase().includes(phrase) || item.exerciseKey.toLowerCase().includes(phrase);
        })
      : exerciseProgressItems;

    return getSortedProgressItems(searchedItems, progressFilter);
  }, [exerciseProgressItems, progressFilter, progressSearch]);

  const progressDashboardStats = useMemo(
    () => getProgressDashboardStats(exerciseProgressItems, visibleWorkoutSessions),
    [exerciseProgressItems, visibleWorkoutSessions]
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

  function cloneCreatorDraft(draft: WorkoutCreatorDraft): WorkoutCreatorDraft {
    return Object.fromEntries(
      Object.entries(draft).map(([key, value]) => [key, Array.isArray(value) ? [...value] : value])
    );
  }

  function areCreatorValuesEqual(left: WorkoutCreatorValue | undefined, right: WorkoutCreatorValue | undefined) {
    if (Array.isArray(left) || Array.isArray(right)) {
      if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
        return false;
      }

      return left.every((value, index) => value === right[index]);
    }

    return (left ?? "") === (right ?? "");
  }

  function areCreatorDraftsEqual(left: WorkoutCreatorDraft, right: WorkoutCreatorDraft) {
    const fieldIds = workoutCreatorSections.flatMap((section) => section.fields.map((field) => field.id));

    return fieldIds.every((fieldId) => areCreatorValuesEqual(left[fieldId], right[fieldId]));
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

  function getWorkoutCatalogMatchSummary(draft: WorkoutDraft) {
    const exerciseSteps = draft.steps.filter(
      (step) => step.kind === "exercise" && step.stageType !== "rest" && Boolean(step.exerciseName.trim())
    );
    const matched = exerciseSteps.filter((step) => Boolean(step.exerciseId?.trim())).length;

    return {
      matched,
      total: exerciseSteps.length,
      unmatched: Math.max(0, exerciseSteps.length - matched)
    };
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

  function getCreatorFieldTextValue(field: WorkoutCreatorField) {
    return getCreatorTextValue(field.id) || (field.defaultValue ? getCreatorLabel(field.defaultValue) : "");
  }

  function wantsReadyWarmupSet() {
    const answer = getCreatorTextValue("readyWarmupSet").trim().toLowerCase();
    return answer === "tak" || answer === "yes";
  }

  function getCreatorMultiValue(fieldId: string) {
    const value = creatorDraft[fieldId];
    return Array.isArray(value) ? value : [];
  }

  function updateCreatorField(fieldId: string, value: WorkoutCreatorValue) {
    setCreatorDraft((current) => ({ ...current, [fieldId]: value }));
  }

  function updateCreatorTextField(field: WorkoutCreatorField, value: string) {
    if (field.keyboardType === "number-pad" && typeof field.maxValue === "number") {
      const numericValue = value.replace(/\D/g, "");

      if (!numericValue) {
        updateCreatorField(field.id, "");
        return;
      }

      updateCreatorField(field.id, String(Math.min(Number(numericValue), field.maxValue)));
      return;
    }

    updateCreatorField(field.id, value);
  }

  function toggleCreatorMultiChoice(fieldId: string, option: string) {
    setCreatorDraft((current) => {
      const currentValues = Array.isArray(current[fieldId]) ? current[fieldId] : [];
      const nextValues = currentValues.includes(option)
        ? currentValues.filter((item) => item !== option)
        : [...currentValues, option];

      return { ...current, [fieldId]: nextValues };
    });
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
      <View style={styles.panelActions}>
        <AppIconButton
          icon="swap-vertical-outline"
          theme={theme}
          onPress={() => setIsWorkoutSortSheetOpen(true)}
        />
        <AppIconButton icon="add" theme={theme} onPress={openWorkoutBuilder} />
      </View>
    );
  }

  function renderWorkoutSortSheet() {
    const fieldOptions: Array<{ label: string; value: WorkoutSortField }> = [
      { label: t("workoutSortCreatedAt"), value: "createdAt" },
      { label: t("workoutSortAlphabetical"), value: "name" }
    ];
    const directionOptions: Array<{ label: string; value: SortDirection }> = [
      { label: t("descending"), value: "desc" },
      { label: t("ascending"), value: "asc" }
    ];

    return (
      <Modal
        animationType="fade"
        transparent
        visible={isWorkoutSortSheetOpen}
        onRequestClose={() => setIsWorkoutSortSheetOpen(false)}
      >
        <View style={styles.bottomSheetRoot}>
          <Pressable
            accessibilityRole="button"
            style={styles.bottomSheetBackdrop}
            onPress={() => setIsWorkoutSortSheetOpen(false)}
          />
          <View
            style={[
              styles.bottomSheetPanel,
              {
                backgroundColor: theme.card,
                paddingBottom: bottomSheetBottomPadding
              }
            ]}
          >
            <Text style={[styles.bottomSheetTitle, { color: theme.text }]}>{t("workoutSortTitle")}</Text>
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.muted }]}>{t("workoutSortField")}</Text>
              <View style={[styles.bottomSheetOptionGroup, { borderColor: theme.border }]}>
                {fieldOptions.map((option, index) => {
                  const selected = workoutSort.field === option.value;

                  return (
                    <Pressable
                      key={option.value}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      style={[
                        styles.bottomSheetOptionRow,
                        {
                          backgroundColor: selected ? theme.secondaryBand : theme.card,
                          borderBottomColor: theme.border,
                          borderBottomWidth: index === fieldOptions.length - 1 ? 0 : 1
                        }
                      ]}
                      onPress={() => setWorkoutSort((current) => ({ ...current, field: option.value }))}
                    >
                      <Text style={[styles.bottomSheetOptionText, { color: theme.text }]}>
                        {option.label}
                      </Text>
                      {selected ? (
                        <Ionicons name="checkmark-circle" size={22} color={theme.primary} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.muted }]}>{t("workoutSortDirection")}</Text>
              <View style={[styles.bottomSheetOptionGroup, { borderColor: theme.border }]}>
                {directionOptions.map((option, index) => {
                  const selected = workoutSort.direction === option.value;

                  return (
                    <Pressable
                      key={option.value}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      style={[
                        styles.bottomSheetOptionRow,
                        {
                          backgroundColor: selected ? theme.secondaryBand : theme.card,
                          borderBottomColor: theme.border,
                          borderBottomWidth: index === directionOptions.length - 1 ? 0 : 1
                        }
                      ]}
                      onPress={() => setWorkoutSort((current) => ({ ...current, direction: option.value }))}
                    >
                      <Text style={[styles.bottomSheetOptionText, { color: theme.text }]}>
                        {option.label}
                      </Text>
                      {selected ? (
                        <Ionicons name="checkmark-circle" size={22} color={theme.primary} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>
            <AppButton
              icon="save-outline"
              style={styles.bottomSheetButton}
              theme={theme}
              onPress={() => setIsWorkoutSortSheetOpen(false)}
            >
              {t("save")}
            </AppButton>
          </View>
        </View>
      </Modal>
    );
  }

  function renderWorkoutCreatorButton() {
    const needsLogin = !user;
    const label = isCreatorJobPending
      ? t("workoutCreatorPendingCta")
      : needsLogin
        ? t("workoutCreatorLoginCta")
        : t("workoutCreatorCta");
    const button = (
      <AppButton
        disabled={isCreatorJobPending || needsLogin}
        icon={isCreatorJobPending ? "hourglass-outline" : needsLogin ? "lock-closed-outline" : "sparkles-outline"}
        style={styles.workoutCreatorButton}
        theme={theme}
        onPress={openWorkoutCreator}
      >
        {label}
      </AppButton>
    );

    return (
      <View style={styles.workoutCreatorButtonWrap}>
        {needsLogin && !isCreatorJobPending ? (
          <Pressable accessibilityRole="button" onPress={openWorkoutCreator}>
            {button}
          </Pressable>
        ) : button}
        {needsLogin && showCreatorLoginTooltip ? (
          <View
            pointerEvents="none"
            style={styles.creatorLoginTooltip}
          >
            <View style={[styles.creatorLoginTooltipBubble, { backgroundColor: theme.primaryStrong }]}>
              <Text style={[styles.creatorLoginTooltipText, { color: theme.white }]}>
                {t("workoutCreatorLoginTooltip")}
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    );
  }

  function renderTrainingFactPill() {
    const facts = trainingFacts[language];
    const fact = facts[trainingFactIndex % facts.length];

    return (
      <View
        accessibilityLiveRegion="polite"
        style={[
          styles.trainingFactPill,
          {
            backgroundColor: theme.secondaryBand,
            borderColor: theme.border
          }
        ]}
      >
        <View style={[styles.trainingFactIcon, { backgroundColor: theme.primary }]}>
          <Ionicons name="bulb-outline" size={16} color={theme.white} />
        </View>
        <Text style={[styles.trainingFactText, { color: theme.text }]}>{fact}</Text>
      </View>
    );
  }

  function renderSystemStatusCallout() {
    const copy = getSystemStatusCopy(systemStatus, language);
    if (!copy) {
      return null;
    }

    if (activeScreen === "weeklyPlan") {
      setActiveScreen("home");
      return true;
    }

    const statusKind = systemStatus.kind === "ok" ? "degraded" : systemStatus.kind;
    const statusIcons: Record<Exclude<SystemStatusState["kind"], "ok">, keyof typeof Ionicons.glyphMap> = {
      degraded: "information-circle-outline",
      maintenance: "construct-outline",
      offline: "cloud-offline-outline",
      update: "refresh-circle-outline"
    };
    const iconName = statusIcons[statusKind];

    return (
      <View
        accessibilityLiveRegion="polite"
        style={[
          styles.systemStatusCallout,
          {
            backgroundColor: theme.card,
            borderColor: statusKind === "offline" ? theme.primary : theme.border
          }
        ]}
      >
        <View style={[styles.systemStatusIcon, { backgroundColor: theme.secondaryBand }]}>
          <Ionicons
            name={iconName}
            size={22}
            color={theme.primary}
          />
        </View>
        <View style={styles.systemStatusCopy}>
          <Text style={[styles.systemStatusTitle, { color: theme.text }]}>{copy.title}</Text>
          <Text style={[styles.systemStatusDescription, { color: theme.muted }]}>{copy.description}</Text>
          <Pressable
            accessibilityRole="button"
            disabled={isSystemStatusRefreshing}
            style={styles.systemStatusAction}
            onPress={() => refreshSystemStatus(true)}
          >
            <Ionicons name="refresh-outline" size={16} color={theme.primary} />
            <Text style={[styles.systemStatusActionText, { color: theme.primary }]}>
              {isSystemStatusRefreshing ? `${copy.cta}...` : copy.cta}
            </Text>
          </Pressable>
        </View>
      </View>
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

  function formatAiCreditTransactionDate(value: string) {
    const date = new Date(value);
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

  function formatAiCreditTransactionTitle(transaction: AiCreditTransaction) {
    const reason = (transaction.reason ?? "").toLowerCase();

    if (reason.includes("rewrite")) {
      return language === "pl" ? "Modyfikacja treningu" : "Workout modification";
    }

    if (reason.includes("plan")) {
      return language === "pl" ? "Wygenerowanie planu" : "Plan generation";
    }

    if (transaction.type.toLowerCase() === "purchase" || reason.includes("purchase")) {
      const credits = Math.abs(transaction.amount);
      return language === "pl" ? `Zakup pakietu ${credits} kredytów` : `${credits} credit package purchase`;
    }

    return transaction.amount < 0 ? t("aiCreditsUsed") : t("aiCreditsAdded");
  }

  function formatAiCreditAmount(amount: number) {
    const suffix = Math.abs(amount) === 1
      ? (language === "pl" ? "kredyt" : "credit")
      : (language === "pl" ? "kredytów" : "credits");

    return `${amount > 0 ? "+" : ""}${amount} ${suffix}`;
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

  function formatCodeLabel(value: string) {
    return value
      .toLowerCase()
      .split("_")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  function getExerciseName(exercise: Exercise) {
    return language === "pl" ? exercise.polishName : exercise.name;
  }

  function getExerciseMeta(exercise: Exercise) {
    const primaryMuscles = getPrimaryMuscles(exercise)
      .map((muscle) => muscleLabels[language][muscle])
      .slice(0, 3)
      .join(", ");
    const equipment = getRequiredEquipment(exercise)
      .map(formatCodeLabel)
      .slice(0, 2)
      .join(", ");

    return [
      primaryMuscles,
      equipment,
      formatCodeLabel(exercise.garminCategory)
    ].filter(Boolean).join(" · ");
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

  function getSessionCompletedCount(session: WorkoutSession) {
    return session.entries.filter((entry) => entry.isCompleted).length;
  }

  function getSessionExerciseCount(session: WorkoutSession) {
    return new Set(
      session.entries
        .filter((entry) => entry.exerciseName && entry.type !== "rest")
        .map((entry) => entry.exerciseName?.trim().toLowerCase())
    ).size;
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
    setExerciseProgressHistoryRange("all");
    setExerciseProgressHistoryVisibleCount(5);
    setExpandedExerciseProgressHistoryKeys({});
    setActiveScreen("exerciseProgress");
  }

  function getAchievementIconName(iconKey?: string): keyof typeof Ionicons.glyphMap {
    const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
      barbell: "barbell-outline",
      calendar: "calendar-outline",
      "calendar-number": "calendar-number-outline",
      compass: "compass-outline",
      construct: "construct-outline",
      cube: "cube-outline",
      fitness: "fitness-outline",
      flame: "flame-outline",
      hammer: "hammer-outline",
      hourglass: "hourglass-outline",
      layers: "layers-outline",
      library: "library-outline",
      medal: "medal-outline",
      "phone-portrait": "phone-portrait-outline",
      pulse: "pulse-outline",
      ribbon: "ribbon-outline",
      shield: "shield-checkmark-outline",
      trophy: "trophy-outline",
      "trending-up": "trending-up-outline"
    };

    return iconKey ? icons[iconKey] ?? "trophy-outline" : "trophy-outline";
  }

  function getAchievementImageSource(imageKey?: string) {
    return imageKey ? achievementImageSources[imageKey] : undefined;
  }

  function formatAchievementValue(value: number, unit: AchievementProgress["definition"]["unit"]) {
    const safeValue = Math.max(0, value);
    if (unit === "tons") {
      return safeValue >= 10 ? safeValue.toFixed(0) : safeValue.toFixed(1).replace(/\.0$/, "");
    }

    if (unit === "hours") {
      return safeValue >= 10 ? safeValue.toFixed(0) : safeValue.toFixed(1).replace(/\.0$/, "");
    }

    if (unit === "minutes") {
      return Math.floor(safeValue).toString();
    }

    return Math.floor(safeValue).toString();
  }

  function getAchievementTitle(progress: AchievementProgress) {
    return progress.definition.title[language];
  }

  function getAchievementDescription(progress: AchievementProgress) {
    return progress.definition.description[language];
  }

  function renderAchievementProgressBar(progress: AchievementProgress) {
    return (
      <View style={[styles.achievementProgressTrack, { backgroundColor: theme.secondaryBand }]}>
        <View
          style={[
            styles.achievementProgressFill,
            {
              backgroundColor: progress.unlocked ? theme.primary : theme.muted,
              width: `${Math.max(0, Math.min(100, progress.percent))}%`
            }
          ]}
        />
      </View>
    );
  }

  function renderAchievementCard(progress: AchievementProgress) {
    const title = getAchievementTitle(progress);
    const description = getAchievementDescription(progress);
    const current = formatAchievementValue(Math.min(progress.current, progress.target), progress.definition.unit);
    const target = formatAchievementValue(progress.target, progress.definition.unit);
    const imageSource = getAchievementImageSource(progress.definition.imageKey);

    return (
      <View
        key={progress.definition.id}
        style={[
          styles.achievementCard,
          {
            backgroundColor: theme.card,
            borderColor: progress.unlocked ? theme.primary : theme.border
          }
        ]}
      >
        <View style={imageSource ? styles.achievementImageSlot : [styles.achievementIcon, { backgroundColor: theme.secondaryBand }]}>
          {imageSource ? (
            <Pressable
              accessibilityLabel={title}
              accessibilityRole="imagebutton"
              hitSlop={8}
              onPress={() => setSelectedAchievementPreview({ imageSource, title })}
            >
              <Image
                accessibilityIgnoresInvertColors
                resizeMode="contain"
                source={imageSource}
                style={[
                  styles.achievementImage,
                  { opacity: progress.unlocked ? 1 : 0.48 }
                ]}
              />
            </Pressable>
          ) : (
            <Ionicons
              name={getAchievementIconName(progress.definition.iconKey)}
              size={24}
              color={progress.unlocked ? theme.primary : theme.muted}
            />
          )}
        </View>
        <View style={styles.achievementCopy}>
          <View style={styles.achievementTitleRow}>
            <Text style={[styles.workoutName, { color: theme.text }]}>{title}</Text>
            <Text style={[styles.achievementStatus, { color: progress.unlocked ? theme.primary : theme.muted }]}>
              {progress.unlocked ? t("achievementUnlockedStatus") : t("achievementLockedStatus")}
            </Text>
          </View>
          <Text style={[styles.workoutMeta, { color: theme.muted }]}>{description}</Text>
          <View style={styles.achievementProgressRow}>
            {progress.unlocked ? (
              <Text style={[styles.workoutMeta, { color: theme.primary }]}>
                {t("achievementUnlockedStatus")}
              </Text>
            ) : (
              <Text style={[styles.workoutMeta, { color: theme.text }]}>
                {current} / {target}
              </Text>
            )}
            {progress.unlockedAt ? (
              <Text style={[styles.workoutMeta, { color: theme.muted }]}>
                {t("unlockedAt")}: {formatDateTime(progress.unlockedAt)}
              </Text>
            ) : null}
          </View>
          {renderAchievementProgressBar(progress)}
        </View>
      </View>
    );
  }

  function openExerciseDetail(step: WorkoutStep) {
    setSelectedExerciseDetailStep(step);
    setExerciseDetailMuscleSide("front");
    setExerciseDetailCollapsedPanels({});
    setExerciseDetailReturnScreen(activeScreen);
    setActiveScreen("exerciseDetail");
  }

  function renderActiveWorkoutSessionCard() {
    if (!activeWorkoutSession) {
      return null;
    }

    return (
      <View style={[styles.activeSessionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.workoutInfo}>
          <Text style={[styles.workoutName, { color: theme.text }]}>{t("activeWorkoutNotice")}</Text>
          <Text style={[styles.workoutMeta, { color: theme.muted }]}>
            {activeWorkoutSession.sourceWorkoutName}
          </Text>
        </View>
        <View style={styles.activeSessionActions}>
          <AppButton
            icon="play-outline"
            style={styles.compactButton}
            textStyle={styles.compactButtonText}
            theme={theme}
            onPress={() => continueActiveWorkoutSession(activeWorkoutSession.id)}
          >
            {t("continueWorkout")}
          </AppButton>
          <AppButton
            icon="close-outline"
            style={styles.compactButton}
            textStyle={styles.compactButtonText}
            theme={theme}
            variant="outline"
            onPress={abandonActiveWorkoutSession}
          >
            {t("abandonWorkout")}
          </AppButton>
        </View>
      </View>
    );
  }

  function renderWeeklyPlanHomeCard() {
    if (!savedWorkouts.length) {
      return null;
    }

    if (!weeklyPlanSummary.total) {
      return (
        <View style={[styles.weeklyPlanEmptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.weeklyPlanCardIcon, { backgroundColor: theme.secondaryBand }]}>
            <Ionicons name="calendar-outline" size={22} color={theme.primary} />
          </View>
          <View style={styles.weeklyPlanEmptyCopy}>
            <Text style={[styles.weeklyPlanEmptyTitle, { color: theme.text }]}>{t("planYourWeek")}</Text>
            <Text style={[styles.weeklyPlanEmptyText, { color: theme.muted }]}>{t("weeklyPlanEmptyCopy")}</Text>
          </View>
          <Pressable accessibilityRole="button" style={[styles.weeklyPlanSetupButton, { borderColor: theme.primary }]} onPress={() => setActiveScreen("weeklyPlan")}>
            <Text style={[styles.weeklyPlanSetupButtonText, { color: theme.primary }]}>{t("setPlan")}</Text>
          </Pressable>
        </View>
      );
    }

    const range = formatWeekRange(getCurrentWeekRange(new Date()), language);
    const todayItem = weeklyPlanSummary.todayItems[0];
    const completion = t("weeklyPlanCompleted")
      .replace("{completed}", String(weeklyPlanSummary.completed))
      .replace("{total}", String(weeklyPlanSummary.total));

    return (
      <Pressable
        accessibilityRole="button"
        style={[styles.weeklyPlanHomeCard, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={() => setActiveScreen("weeklyPlan")}
      >
        <View style={styles.weeklyPlanHomeTop}>
          <View style={[styles.weeklyPlanCardIcon, { backgroundColor: theme.primary }]}>
            <Ionicons name="calendar-outline" size={22} color={theme.white} />
          </View>
          <View style={styles.weeklyPlanHomeCopy}>
            <Text style={[styles.weeklyPlanHomeTitle, { color: theme.text }]}>{`${t("week")}: ${range}`}</Text>
            <Text style={[styles.weeklyPlanHomeMeta, { color: theme.muted }]}>{completion}</Text>
          </View>
          <View style={styles.weeklyPlanProgressCopy}>
            <Text style={[styles.weeklyPlanProgressText, { color: theme.primary }]}>{`${weeklyPlanSummary.percent}%`}</Text>
            <View style={[styles.weeklyPlanProgressRing, { borderColor: theme.secondaryBand }]}>
              <View style={[styles.weeklyPlanProgressRingFill, { backgroundColor: theme.primary, height: `${Math.max(8, weeklyPlanSummary.percent)}%` }]} />
            </View>
          </View>
          <Ionicons name="chevron-forward" size={22} color={theme.muted} />
        </View>
        <View style={[styles.weeklyPlanHomeStats, { borderTopColor: theme.border }]}>
          <View style={styles.weeklyPlanHomeStat}>
            <Ionicons name="checkmark-circle" size={21} color={theme.primary} />
            <Text style={[styles.weeklyPlanStatNumber, { color: theme.text }]}>{weeklyPlanSummary.completed}</Text>
            <Text style={[styles.weeklyPlanStatLabel, { color: theme.muted }]}>{t("completed")}</Text>
          </View>
          <View style={[styles.weeklyPlanStatDivider, { backgroundColor: theme.border }]} />
          <View style={styles.weeklyPlanHomeStat}>
            <Ionicons name="ellipse-outline" size={21} color={theme.secondaryBand} />
            <Text style={[styles.weeklyPlanStatNumber, { color: theme.text }]}>{weeklyPlanSummary.remaining}</Text>
            <Text style={[styles.weeklyPlanStatLabel, { color: theme.muted }]}>{t("toDo")}</Text>
          </View>
          <View style={[styles.weeklyPlanStatDivider, { backgroundColor: theme.border }]} />
          <View style={styles.weeklyPlanToday}>
            <Text style={[styles.weeklyPlanTodayLabel, { color: theme.muted }]}>{`${t("today")}: ${getWeeklyPlanDayOptions(t).find((item) => item.value === getWeeklyPlanDay(new Date()))?.label ?? ""}`}</Text>
            {todayItem ? (
              <Pressable
                accessibilityLabel={`${t("showDetails")}: ${todayItem.workout.name}`}
                accessibilityRole="link"
                hitSlop={6}
                style={styles.weeklyPlanTodayLink}
                onPress={(event) => {
                  event.stopPropagation();
                  openWorkoutDetail(todayItem.workout.id);
                }}
              >
                <Text style={[styles.weeklyPlanTodayName, { color: theme.primary }]} numberOfLines={1}>
                  {todayItem.workout.name}
                </Text>
                <Ionicons name="chevron-forward" size={15} color={theme.primary} />
              </Pressable>
            ) : (
              <Text style={[styles.weeklyPlanTodayName, { color: theme.text }]} numberOfLines={1}>
                {t("todayNoWorkout")}
              </Text>
            )}
          </View>
        </View>
      </Pressable>
    );
  }

  function renderWeeklyPlan() {
    const dayOptions = getWeeklyPlanDayOptions(t);
    const plannedIds = new Set(weeklyPlanSummary.items.map((item) => item.workoutId));
    const availableWorkouts = savedWorkouts.filter((workout) => !plannedIds.has(workout.id));
    const range = formatWeekRange(getCurrentWeekRange(new Date()), language);
    const groupedItems = Array.from(
      weeklyPlanSummary.items.reduce((groups, item) => {
        const existing = groups.get(item.workoutId);
        if (existing) {
          existing.items.push(item);
        } else {
          groups.set(item.workoutId, { items: [item], workout: item.workout });
        }
        return groups;
      }, new Map<string, { items: typeof weeklyPlanSummary.items; workout: (typeof weeklyPlanSummary.items)[number]["workout"] }>()).values()
    );

    return (
      <View style={styles.weeklyPlanScreen}>
        <View style={[styles.weeklyPlanDetailHeader, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.weeklyPlanCardIcon, { backgroundColor: theme.secondaryBand }]}>
            <Ionicons name="calendar-outline" size={22} color={theme.primary} />
          </View>
          <View style={styles.workoutInfo}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t("weeklyPlan")}</Text>
            <Text style={[styles.workoutMeta, { color: theme.muted }]}>{`${t("week")}: ${range}`}</Text>
          </View>
        </View>

        {groupedItems.length ? (
          <View style={[styles.weeklyPlanListCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {groupedItems.map((group, index) => {
              const completedCount = group.items.filter((item) => item.completed).length;
              const isCompleted = completedCount === group.items.length;
              const selectedDays = new Set(group.items.map((item) => item.day));

              return (
              <View key={group.workout.id} style={[styles.weeklyPlanItem, { borderBottomColor: theme.border }, index === groupedItems.length - 1 ? styles.weeklyPlanItemLast : null]}>
                <View style={styles.weeklyPlanItemHeader}>
                  <View style={[styles.weeklyPlanStatusIcon, { backgroundColor: isCompleted ? theme.primary : theme.secondaryBand }]}>
                    <Ionicons name={isCompleted ? "checkmark" : "calendar-outline"} size={18} color={isCompleted ? theme.white : theme.primary} />
                  </View>
                  <View style={styles.workoutInfo}>
                    <Pressable
                      accessibilityLabel={`${t("showDetails")}: ${group.workout.name}`}
                      accessibilityRole="link"
                      hitSlop={6}
                      onPress={() => openWorkoutDetail(group.workout.id)}
                    >
                      <Text style={[styles.workoutName, { color: theme.primary }]}>{group.workout.name}</Text>
                    </Pressable>
                    <Text style={[styles.workoutMeta, { color: isCompleted ? theme.primary : theme.muted }]}>{isCompleted ? t("completed") : t("toDo")}</Text>
                  </View>
                  <Pressable accessibilityLabel={t("removeFromWeeklyPlan")} accessibilityRole="button" onPress={() => setWeeklyPlan((current) => removeWeeklyPlanItem(current, group.workout.id))}>
                    <Ionicons name="trash-outline" size={20} color={theme.danger} />
                  </Pressable>
                </View>
                <Text style={[styles.weeklyPlanChooseDayLabel, { color: theme.muted }]}>{t("chooseWeekday")}</Text>
                <View style={styles.weeklyPlanDayChips}>
                  {dayOptions.map((day) => {
                    const selected = selectedDays.has(day.value);
                    return (
                      <Pressable
                        key={day.value}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        style={[styles.weeklyPlanDayChip, { backgroundColor: selected ? theme.primary : theme.control, borderColor: selected ? theme.primary : theme.border }]}
                        onPress={() => setWeeklyPlan((current) => toggleWeeklyPlanItemDay(current, group.workout.id, day.value))}
                      >
                        <Text style={[styles.weeklyPlanDayChipText, { color: selected ? theme.white : theme.text }]}>{day.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              );
            })}
          </View>
        ) : (
          <View style={[styles.weeklyPlanNoItems, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.workoutMeta, { color: theme.muted }]}>{t("weeklyPlanNoItems")}</Text>
          </View>
        )}

        {availableWorkouts.length ? (
          <View style={[styles.weeklyPlanAddCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t("addToWeeklyPlan")}</Text>
            {availableWorkouts.map((workout) => (
              <View key={workout.id} style={[styles.weeklyPlanAddRow, { borderTopColor: theme.border }]}>
                <Text style={[styles.workoutName, styles.weeklyPlanAddName, { color: theme.text }]} numberOfLines={2}>{workout.name}</Text>
                <Pressable
                  accessibilityRole="button"
                  style={[styles.weeklyPlanAddButton, { backgroundColor: theme.primary }]}
                  onPress={() => setWeeklyPlan((current) => upsertWeeklyPlanItem(current, workout.id, getWeeklyPlanDay(new Date())))}
                >
                  <Ionicons name="add" size={18} color={theme.white} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    );
  }

  function renderHome() {
    const homeWorkouts = filteredWorkouts.slice(0, 5);
    const shouldShowWorkoutCreator = !hasUserDefinedWorkouts(savedWorkouts);

    return (
      <>
        {!isAuthPanelDismissed ? (
          <LoginPanel
            authError={authError}
            authMode={authMode}
            displayName={displayName}
            email={email}
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
            user={user}
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
        ) : null}

        {renderSystemStatusCallout()}

        {renderActiveWorkoutSessionCard()}

        {renderWeeklyPlanHomeCard()}

        {renderTrainingFactPill()}

        {shouldShowWorkoutCreator ? renderWorkoutCreatorButton() : null}

        <CollapsiblePanel
          actions={renderWorkoutSortActions()}
          isCollapsed={isPanelCollapsed("home-workouts")}
          theme={theme}
          title={t("workouts")}
          onToggle={() => togglePanel("home-workouts")}
        >
            {homeWorkouts.length ? (
              <View style={styles.workoutList}>
                {homeWorkouts.map((item, index) => (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    style={[
                      styles.workoutRow,
                      {
                        borderBottomWidth: index === homeWorkouts.length - 1 ? 0 : 1,
                        borderColor: theme.border
                      }
                    ]}
                    onPress={() => openWorkoutDetail(item.id)}
                  >
                    <View style={[styles.workoutIcon, { backgroundColor: theme.secondaryBand }]}>
                      <Ionicons name="barbell-outline" size={20} color={theme.primary} />
                    </View>
                    <View style={styles.workoutInfo}>
                      <Text style={[styles.workoutName, { color: theme.text }]}>{item.name}</Text>
                      {item.draft.notes ? (
                        <Text
                          numberOfLines={2}
                          style={[styles.workoutMeta, { color: theme.muted }]}
                        >
                          {getWorkoutNotesPreview(item.draft.notes)}
                        </Text>
                      ) : null}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.muted} />
                  </Pressable>
                ))}
              </View>
            ) : null}
            {filteredWorkouts.length > homeWorkouts.length ? (
              <AppButton
                icon="list-outline"
                style={styles.secondaryButton}
                textStyle={styles.secondaryButtonText}
                theme={theme}
                variant="outline"
                onPress={() => setActiveScreen("workouts")}
              >
                {t("viewAllWorkouts")}
              </AppButton>
            ) : null}
        </CollapsiblePanel>

        <CollapsiblePanel
          isCollapsed={isPanelCollapsed("home-articles")}
          theme={theme}
          title={t("articles")}
          onToggle={() => togglePanel("home-articles")}
        >
            {articles.map((article, index) => {
              const translation = getArticleTranslation(article, language);

              return (
                <Pressable
                  key={article.id}
                  accessibilityRole="button"
                  style={[
                    styles.articleRow,
                    {
                      borderBottomWidth: index === articles.length - 1 ? 0 : 1,
                      borderColor: theme.border
                    }
                  ]}
                  onPress={() => {
                    setSelectedArticleId(article.id);
                    setActiveScreen("articleDetail");
                  }}
                >
                  <View style={styles.articleContent}>
                    <Text style={[styles.articleCategory, { color: theme.primary }]}>
                      {translation.category}
                    </Text>
                    <Text style={[styles.articleTitle, { color: theme.text }]}>{translation.title}</Text>
                    {translation.summary ? (
                      <Text style={[styles.articleMeta, { color: theme.muted }]} numberOfLines={2}>
                        {translation.summary}
                      </Text>
                    ) : null}
                    <Text style={[styles.articleMeta, { color: theme.muted }]}>
                      {formatArticleDate(article.publishedAt, language)} · {article.readTime}
                    </Text>
                  </View>
                  <Ionicons name="reader-outline" size={22} color={theme.primary} />
                </Pressable>
              );
            })}
        </CollapsiblePanel>
      </>
    );
  }

  function renderBuilder() {
    return (
      <>
        <WorkoutBuilder
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

  function renderWorkoutCreator() {
    if (!user) {
      return renderProfile();
    }

    const isWaiting = creatorPhase === "waiting";
    const isSubmitted = creatorPhase === "submitted";
    const isProfilePrompt = creatorPhase === "profilePrompt";
    const selectedCreatorProfile = selectedCreatorProfileId
      ? creatorProfiles.find((profile) => profile.id === selectedCreatorProfileId)
      : null;

    function renderCreatorField(field: WorkoutCreatorField) {
      const label = getCreatorLabel(field.label);
      const placeholder = field.placeholder ? getCreatorLabel(field.placeholder) : undefined;

      if (field.kind === "textarea") {
        return (
          <View key={field.id} style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.muted }]}>{label}</Text>
            <AppTextarea
              placeholder={placeholder ?? t("aiCreatorQuestionPlaceholder")}
              style={styles.creatorTextarea}
              theme={theme}
              value={getCreatorTextValue(field.id)}
              onChangeText={(value) => updateCreatorField(field.id, value)}
            />
          </View>
        );
      }

      if (field.kind === "singleChoice") {
        const options = (field.options ?? []).map((option) => {
          const optionLabel = getCreatorLabel(option);
          return { label: optionLabel, value: optionLabel };
        });

        return (
          <View key={field.id} style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.muted }]}>{label}</Text>
            <SelectControl
              options={options}
              placeholder={t("select")}
              theme={theme}
              value={getCreatorFieldTextValue(field)}
              onChange={(value) => updateCreatorField(field.id, value)}
            />
          </View>
        );
      }

      if (field.kind === "multiChoice") {
        const selectedValues = getCreatorMultiValue(field.id);

        return (
          <View key={field.id} style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.muted }]}>{label}</Text>
            <View style={styles.creatorChoiceList}>
              {(field.options ?? []).map((option) => {
                const optionLabel = getCreatorLabel(option);
                const isSelected = selectedValues.includes(optionLabel);

                return (
                  <Pressable
                    key={optionLabel}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    style={[
                      styles.creatorChoiceChip,
                      {
                        backgroundColor: isSelected ? theme.primary : theme.control,
                        borderColor: isSelected ? theme.primary : theme.border
                      }
                    ]}
                    onPress={() => toggleCreatorMultiChoice(field.id, optionLabel)}
                  >
                    <Text
                      style={[
                        styles.creatorChoiceText,
                        { color: isSelected ? theme.white : theme.text }
                      ]}
                    >
                      {optionLabel}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      }

      return (
        <View key={field.id} style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.muted }]}>{label}</Text>
          <AppInput
            keyboardType={field.keyboardType}
            placeholder={placeholder ?? t("aiCreatorQuestionPlaceholder")}
            theme={theme}
            value={getCreatorTextValue(field.id)}
            onChangeText={(value) => updateCreatorTextField(field, value)}
          />
        </View>
      );
    }

    return (
      <>
        <View style={[styles.creatorPanel, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {!isProfilePrompt && !isSubmitted ? (
            <Text style={[styles.creatorDescription, { color: theme.muted }]}>
              {isWaiting ? t("aiCreatorDoneCopy") : t("aiCreatorIntro")}
            </Text>
          ) : null}

          {creatorPhase === "form" ? (
            <View style={styles.creatorForm}>
              {creatorProfiles.length ? (
                <View style={styles.creatorProfilesBlock}>
                  <Text style={[styles.creatorSectionTitle, { color: theme.text }]}>
                    {t("aiCreatorProfiles")}
                  </Text>
                  <View style={styles.creatorProfileGrid}>
                    {creatorProfiles.map((profile) => {
                      const isSelected = selectedCreatorProfileId === profile.id;
                      const goalValue = profile.draft.primaryGoal;
                      const meta = typeof goalValue === "string" && goalValue ? goalValue : t("aiCreatorMeta");

                      return (
                        <Pressable
                          key={profile.id}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isSelected }}
                          style={[
                            styles.creatorProfileCard,
                            {
                              backgroundColor: isSelected ? theme.secondaryBand : theme.control,
                              borderColor: isSelected ? theme.primary : theme.border
                            }
                          ]}
                          onPress={() => loadCreatorProfile(profile)}
                        >
                          <View style={[styles.infoLinkIcon, { backgroundColor: theme.secondaryBand }]}>
                            <Ionicons name="person-outline" size={21} color={theme.primary} />
                          </View>
                          <View style={styles.workoutInfo}>
                            <Text style={[styles.workoutName, { color: theme.text }]}>{profile.name}</Text>
                            <Text numberOfLines={1} style={[styles.workoutMeta, { color: theme.muted }]}>
                              {isSelected ? t("aiCreatorProfileLoaded") : meta}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              {workoutCreatorSections.map((section) => {
                const isSectionCollapsed = creatorCollapsedSections[section.id] ?? false;

                return (
                  <View key={section.id} style={[styles.creatorSection, { borderColor: theme.border }]}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ expanded: !isSectionCollapsed }}
                      style={styles.creatorSectionHeader}
                      onPress={() => toggleCreatorSection(section.id)}
                    >
                      <Text style={[styles.creatorSectionTitle, { color: theme.text }]}>
                        {getCreatorLabel(section.title)}
                      </Text>
                      <Ionicons
                        name={isSectionCollapsed ? "chevron-down" : "chevron-up"}
                        size={20}
                        color={theme.muted}
                      />
                    </Pressable>
                    {!isSectionCollapsed ? (
                      <View style={styles.creatorSectionFields}>
                        {section.fields.map((field) => renderCreatorField(field))}
                      </View>
                    ) : null}
                  </View>
                );
              })}
              <View style={[styles.creatorPlanBox, { backgroundColor: theme.control, borderColor: theme.border }]}>
                <Text style={[styles.workoutMeta, { color: theme.muted }]}>
                  {t("aiCreditsGenerateNeed")}
                </Text>
                <Text style={[styles.workoutName, { color: theme.text }]}>
                  {t("aiCreditsAvailable")}: {aiCreditBalance.balance}
                </Text>
                <Text style={[styles.workoutMeta, { color: theme.muted }]}>
                  {t("aiCreditsCharged")}
                </Text>
                {aiCreditBalance.balance < aiCreditBalance.planCost ? (
                  <AppButton
                    icon="sparkles-outline"
                    style={styles.secondaryButton}
                    textStyle={styles.secondaryButtonText}
                    theme={theme}
                    variant="outline"
                    onPress={() => {
                      if (!areOnlineFeaturesAvailable) {
                        showOnlineFeatureUnavailableDialog();
                        return;
                      }
                      setActiveScreen("aiCredits");
                    }}
                  >
                    {t("aiCreditsGoTo")}
                  </AppButton>
                ) : null}
              </View>
              <AppButton
                disabled={isCreatorSubmitting || isCreatorJobPending || !areOnlineFeaturesAvailable || aiCreditBalance.balance < aiCreditBalance.planCost}
                icon="sparkles-outline"
                theme={theme}
                onPress={submitWorkoutCreatorForm}
              >
                {t("aiCreatorSubmit")}
              </AppButton>
            </View>
          ) : null}

          {isProfilePrompt ? (
            <View style={styles.creatorForm}>
              <Text style={[styles.creatorPromptTitle, { color: theme.text }]}>
                {selectedCreatorProfile ? t("aiCreatorProfileUpdateTitle") : t("aiCreatorProfileSaveTitle")}
              </Text>
              <Text style={[styles.creatorDescription, { color: theme.muted }]}>
                {selectedCreatorProfile ? t("aiCreatorProfileUpdateCopy") : t("aiCreatorProfileSaveCopy")}
              </Text>
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: theme.muted }]}>{t("aiCreatorProfileName")}</Text>
                <AppInput
                  placeholder={t("aiCreatorProfileNamePlaceholder")}
                  theme={theme}
                  value={creatorProfileName}
                  onChangeText={setCreatorProfileName}
                />
              </View>
              <View style={styles.creatorPromptActions}>
                <AppButton
                  disabled={isCreatorSubmitting || isCreatorJobPending || !areOnlineFeaturesAvailable}
                  icon="save-outline"
                  theme={theme}
                  onPress={selectedCreatorProfile ? updateCreatorProfileAndSubmit : saveCreatorProfileAndSubmit}
                >
                  {isCreatorSubmitting
                    ? t("aiCreatorSubmitting")
                    : selectedCreatorProfile
                      ? t("aiCreatorUpdateAndSubmit")
                      : t("aiCreatorSaveAndSubmit")}
                </AppButton>
                <AppButton
                  disabled={isCreatorSubmitting || isCreatorJobPending || !areOnlineFeaturesAvailable}
                  icon="send-outline"
                  theme={theme}
                  variant="outline"
                  onPress={() => void finishWorkoutCreatorRequest()}
                >
                  {isCreatorSubmitting ? t("aiCreatorSubmitting") : t("aiCreatorSendWithoutSaving")}
                </AppButton>
              </View>
              {creatorSubmitError ? (
                <Text style={[styles.authError, { color: theme.danger }]}>{creatorSubmitError}</Text>
              ) : null}
            </View>
          ) : null}

          {isSubmitted ? (
            <View style={styles.creatorWaitingActions}>
              <View style={[styles.bugSuccessBox, { backgroundColor: theme.secondaryBand }]}>
                <Ionicons name="checkmark-circle-outline" size={22} color={theme.primary} />
                <View style={styles.workoutInfo}>
                  <Text style={[styles.creatorPromptTitle, { color: theme.text }]}>
                    {t("aiCreatorSentTitle")}
                  </Text>
                  <Text style={[styles.creatorDescription, { color: theme.muted }]}>
                    {isCreatorJobPending ? t("aiCreatorPendingCopy") : t("aiCreatorSentCopy")}
                  </Text>
                </View>
              </View>
              <AppButton
                icon="checkmark-outline"
                theme={theme}
                onPress={returnToHomeFromCreator}
              >
                {t("aiCreatorSentOk")}
              </AppButton>
            </View>
          ) : null}

          {isWaiting ? (
            <View style={styles.creatorWaitingActions}>
              <View style={[styles.bugSuccessBox, { backgroundColor: theme.secondaryBand }]}>
                <Ionicons name="checkmark-circle-outline" size={22} color={theme.primary} />
                <View style={styles.workoutInfo}>
                  <Text style={[styles.creatorPromptTitle, { color: theme.text }]}>
                    {creatorImportedWorkoutCount ? t("aiCreatorImportedTitle") : t("aiCreatorDoneTitle")}
                  </Text>
                  <Text style={[styles.creatorDescription, { color: theme.muted }]}>
                    {creatorImportedWorkoutCount
                      ? `${formatCreatorImportedWorkoutCount(creatorImportedWorkoutCount)} ${t("aiCreatorImportedCopy")}`
                      : t("aiCreatorDoneCopy")}
                  </Text>
                </View>
              </View>
              {creatorPlanText && !creatorImportedWorkoutCount ? (
                <View style={[styles.creatorPlanBox, { backgroundColor: theme.control, borderColor: theme.border }]}>
                  <Text style={[styles.creatorPromptTitle, { color: theme.text }]}>
                    {t("aiCreatorResultTitle")}
                  </Text>
                  <Text style={[styles.creatorPlanText, { color: theme.text }]}>
                    {creatorPlanText}
                  </Text>
                </View>
              ) : null}
              <AppButton
                icon="list-outline"
                theme={theme}
                onPress={() => setActiveScreen("workouts")}
              >
                {t("aiCreatorWaitingAction")}
              </AppButton>
            </View>
          ) : null}
        </View>
      </>
    );
  }

  function renderArticleDetail() {
    const article = articles.find((item) => item.id === selectedArticleId) ?? articles[0];

    if (!article) {
      return null;
    }

    return (
      <ArticleDetail
        article={article}
        language={language}
        theme={theme}
      />
    );
  }

  function renderWorkouts() {
    return (
      <>
        {renderActiveWorkoutSessionCard()}

        {renderWorkoutCreatorButton()}

        <View style={styles.historyEntryGrid}>
          <AppButton
            icon="time-outline"
            style={styles.historyEntryButton}
            theme={theme}
            variant="outline"
            onPress={() => openWorkoutHistory()}
          >
            {t("workoutHistoryTitle")}
          </AppButton>
          <AppButton
            icon="trending-up-outline"
            style={styles.historyEntryButton}
            theme={theme}
            variant="outline"
            onPress={() => setActiveScreen("progress")}
          >
            {t("progress")}
          </AppButton>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.muted }]}>{t("searchWorkout")}</Text>
          <Input
            style={[
              styles.searchBox,
              { backgroundColor: theme.control, borderColor: theme.border }
            ]}
          >
            <Ionicons name="search" size={20} color={theme.muted} />
            <InputField
              placeholder={t("searchWorkoutPlaceholder")}
              placeholderTextColor={theme.muted}
              style={[styles.searchInput, { color: theme.inputText }]}
              value={search}
              onChangeText={setSearch}
            />
          </Input>
        </View>

        <CollapsiblePanel
          actions={renderWorkoutSortActions()}
          isCollapsed={isPanelCollapsed("workouts-list")}
          theme={theme}
          title={t("workouts")}
          onToggle={() => togglePanel("workouts-list")}
        >
          {filteredWorkouts.length ? (
            <View style={styles.workoutList}>
              {filteredWorkouts.map((item, index) => (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  style={[
                    styles.workoutRow,
                    {
                      borderBottomWidth: index === filteredWorkouts.length - 1 ? 0 : 1,
                      borderColor: theme.border
                    }
                  ]}
                  onPress={() => openWorkoutDetail(item.id)}
                >
                  <View style={[styles.workoutIcon, { backgroundColor: theme.secondaryBand }]}>
                    <Ionicons name="barbell-outline" size={20} color={theme.primary} />
                  </View>
                  <View style={styles.workoutInfo}>
                    <Text style={[styles.workoutName, { color: theme.text }]}>{item.name}</Text>
                    {item.draft.notes ? (
                      <Text
                        numberOfLines={2}
                        style={[styles.workoutMeta, { color: theme.muted }]}
                      >
                        {getWorkoutNotesPreview(item.draft.notes)}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.muted} />
                </Pressable>
              ))}
            </View>
          ) : null}
        </CollapsiblePanel>
      </>
    );
  }

  function renderWorkoutHistoryStatusFilters() {
    const filters: Array<{ label: string; value: WorkoutHistoryStatusFilter }> = [
      { label: t("historyAll"), value: "all" },
      { label: t("completedStatus"), value: "completed" },
      { label: t("activeStatus"), value: "active" }
    ];

    return (
      <View style={styles.segmentedControl}>
        {filters.map((filter) => {
          const selected = workoutHistoryFilter === filter.value;

          return (
            <Pressable
              key={filter.value}
              accessibilityRole="button"
              style={[
                styles.segmentButton,
                { backgroundColor: selected ? theme.primary : theme.segment }
              ]}
              onPress={() => setWorkoutHistoryFilter(filter.value)}
            >
              <Text style={[styles.segmentButtonText, { color: selected ? theme.white : theme.text }]}>
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  function renderHistorySummaryPanel() {
    const metrics = [
      { label: t("workoutsThisWeek"), value: String(workoutHistorySummary.workoutsThisWeek) },
      { label: t("workoutsThisMonth"), value: String(workoutHistorySummary.workoutsThisMonth) },
      { label: t("totalTime"), value: formatDurationMs(workoutHistorySummary.totalDurationMs || null) },
      { label: t("completedWorkouts"), value: String(workoutHistorySummary.completedWorkouts) },
      { label: t("abandonedWorkouts"), value: String(workoutHistorySummary.abandonedWorkouts) }
    ];

    return (
      <View style={[styles.statsPanel, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {metrics.map((metric) => (
          <View key={metric.label} style={styles.statTile}>
            <Text style={[styles.statValue, { color: theme.text }]}>{metric.value}</Text>
            <Text style={[styles.statLabel, { color: theme.muted }]}>{metric.label}</Text>
          </View>
        ))}
      </View>
    );
  }

  function renderWorkoutHistoryScreen() {
    return (
      <View style={styles.historyScreen}>
        {renderHistorySummaryPanel()}
        {renderWorkoutHistoryStatusFilters()}

        <Input style={[styles.searchBox, { backgroundColor: theme.control, borderColor: theme.border }]}>
          <Ionicons name="search" size={20} color={theme.muted} />
          <InputField
            placeholder={t("searchWorkoutHistory")}
            placeholderTextColor={theme.muted}
            style={[styles.searchInput, { color: theme.inputText }]}
            value={workoutHistorySearch}
            onChangeText={setWorkoutHistorySearch}
          />
        </Input>

        {filteredWorkoutHistorySessions.length ? (
          <View style={styles.sessionList}>
            {filteredWorkoutHistorySessions.map((session) => {
              const completedCount = getSessionCompletedCount(session);
              const volume = calculateSessionVolume(session);

              return (
                <Pressable
                  key={session.id}
                  accessibilityRole="button"
                  style={[styles.sessionEntryCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => openWorkoutSessionDetail(session.id)}
                >
                  <View style={styles.sessionEntryHeader}>
                    <View style={styles.workoutInfo}>
                      <Text style={[styles.workoutName, { color: theme.text }]}>
                        {getWorkoutSessionDisplayName(session)}
                      </Text>
                      <Text style={[styles.workoutMeta, { color: theme.muted }]}>
                        {formatSessionDateTime(session)}
                      </Text>
                    </View>
                    <View style={styles.sessionEntryActions}>
                      <Pressable
                        accessibilityLabel={t("deleteHistoryEntryTitle")}
                        accessibilityRole="button"
                        style={[styles.sessionDeleteButton, { borderColor: theme.border }]}
                        onPress={(event) => {
                          event.stopPropagation();
                          deleteWorkoutHistoryEntry(session.id);
                        }}
                      >
                        <Ionicons name="trash-outline" size={18} color={theme.danger} />
                      </Pressable>
                      <Ionicons name="chevron-forward" size={20} color={theme.muted} />
                    </View>
                  </View>
                  <Text style={[styles.workoutMeta, { color: theme.muted }]}>
                    {getSessionStatusLabel(session.status)} · {getExecutionModeLabel(session.executionMode)}
                  </Text>
                  <Text style={[styles.workoutMeta, { color: theme.muted }]}>
                    {t("duration")}: {formatSessionDuration(session)}
                  </Text>
                  <Text style={[styles.workoutMeta, { color: theme.muted }]}>
                    {t("completedItems")}: {completedCount} / {session.entries.length} · {getSessionExerciseCount(session)} {t("exercise").toLowerCase()}
                  </Text>
                  {volume > 0 ? (
                    <Text style={[styles.workoutMeta, { color: theme.muted }]}>
                      {t("volume")}: {formatNumber(volume, "kg")}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={[styles.emptyBuilder, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="time-outline" size={26} color={theme.primary} />
            <Text style={[styles.emptyBuilderTitle, { color: theme.text }]}>{t("emptyWorkoutHistoryTitle")}</Text>
            <Text style={[styles.emptyBuilderCopy, { color: theme.muted }]}>{t("emptyWorkoutHistoryCopy")}</Text>
          </View>
        )}
      </View>
    );
  }

  function renderWorkoutSessionDetail() {
    const session = selectedWorkoutSession;

    if (!session) {
      return (
        <View style={[styles.emptyBuilder, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.emptyBuilderTitle, { color: theme.text }]}>{t("noData")}</Text>
        </View>
      );
    }

    const visibleSessionEntries = session.entries.filter((entry) => entry.type !== "rest" && entry.type !== "warmup");
    const historyTableMinWidth = isLandscape
      ? Math.max(windowSize.width - insets.left - insets.right - 44, 552)
      : undefined;
    const groupedSessionEntries = visibleSessionEntries.reduce<
      { key: string; title: string; entries: WorkoutSessionEntry[] }[]
    >((groups, entry) => {
      const title = formatSessionEntryTitle(entry);
      const normalizedTitle = title.trim().toLowerCase();
      const key = entry.exerciseId ? `id:${entry.exerciseId}` : `name:${normalizedTitle || entry.id}`;
      const existingGroup = groups.find((group) => group.key === key);

      if (existingGroup) {
        existingGroup.entries.push(entry);
        return groups;
      }

      groups.push({
        key,
        title,
        entries: [entry]
      });

      return groups;
    }, []);

    return (
      <View style={styles.historyScreen}>
        <View style={[styles.sessionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.sessionEntryHeader}>
            <View style={styles.workoutInfo}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{getWorkoutSessionDisplayName(session)}</Text>
            </View>
            <Pressable
              accessibilityLabel={t("deleteHistoryEntryTitle")}
              accessibilityRole="button"
              style={[styles.sessionDeleteButton, { borderColor: theme.border }]}
              onPress={() => deleteWorkoutHistoryEntry(session.id)}
            >
              <Ionicons name="trash-outline" size={18} color={theme.danger} />
            </Pressable>
          </View>
          <Text style={[styles.workoutMeta, { color: theme.muted }]}>{formatSessionDateTime(session)}</Text>
          <Text style={[styles.workoutMeta, { color: theme.muted }]}>
            {t("duration")}: {formatSessionDuration(session)}
          </Text>
          <Text style={[styles.workoutMeta, { color: theme.muted }]}>
            {t("sessionStartedAt")}: {formatSessionTime(session.startedAt)} · {t("sessionFinishedAt")}: {formatSessionTime(session.finishedAt)}
          </Text>
          {session.notes ? (
            <Text style={[styles.workoutDetailNotes, { color: theme.muted }]}>{session.notes}</Text>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          style={styles.workoutSessionDetailTableScroll}
          contentContainerStyle={styles.workoutSessionDetailTableScrollContent}
        >
          <View style={[styles.workoutSessionDetailTable, historyTableMinWidth ? { minWidth: historyTableMinWidth } : null, { borderColor: theme.border }]}>
            <View
              style={[
                styles.workoutSessionDetailTableHeader,
                { backgroundColor: theme.secondaryBand, borderBottomColor: theme.border }
              ]}
            >
              <View
                style={[
                  styles.workoutSessionDetailHeaderCell,
                  styles.workoutSessionDetailExerciseCell,
                  { borderRightColor: theme.border }
                ]}
              >
                <Text style={[styles.workoutSessionDetailHeaderText, { color: theme.primary }]}>{t("exercise")}</Text>
              </View>
              <View
                style={[
                  styles.workoutSessionDetailHeaderCell,
                  styles.workoutSessionDetailSetCell,
                  { borderRightColor: theme.border }
                ]}
              >
                <Text style={[styles.workoutSessionDetailHeaderText, { color: theme.primary }]}>{t("set")}</Text>
              </View>
              <View style={[styles.workoutSessionDetailRepsHeader, { borderRightColor: theme.border }]}>
                <Text style={[styles.workoutSessionDetailHeaderText, { color: theme.primary }]}>{t("actualReps")}</Text>
                <View style={[styles.workoutSessionDetailRepsSubHeader, { borderTopColor: theme.border }]}>
                  <Text
                    adjustsFontSizeToFit
                    minimumFontScale={0.88}
                    numberOfLines={1}
                    style={[
                      styles.workoutSessionDetailHeaderText,
                      styles.workoutSessionDetailRepsCell,
                      { color: theme.primary, borderRightColor: theme.border }
                    ]}
                  >
                    {t("repsDone")}
                  </Text>
                  <Text
                    adjustsFontSizeToFit
                    minimumFontScale={0.88}
                    numberOfLines={1}
                    style={[
                      styles.workoutSessionDetailHeaderText,
                      styles.workoutSessionDetailRepsCell,
                      { color: theme.primary, borderRightWidth: 0 }
                    ]}
                  >
                    {t("repsPlanned")}
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.workoutSessionDetailHeaderCell,
                  styles.workoutSessionDetailWeightCell,
                  { borderRightColor: theme.border }
                ]}
              >
                <Text style={[styles.workoutSessionDetailHeaderText, { color: theme.primary }]}>{t("weight")}</Text>
              </View>
              <View style={[styles.workoutSessionDetailHeaderCell, styles.workoutSessionDetailVolumeCell, styles.workoutSessionDetailLastHeaderCell]}>
                <Text style={[styles.workoutSessionDetailHeaderText, { color: theme.primary }]}>{t("volume")}</Text>
              </View>
            </View>
            {groupedSessionEntries.map((group, groupIndex) => (
              <View
                key={group.key}
                style={[
                  styles.workoutSessionDetailExerciseGroup,
                  { borderBottomColor: theme.border },
                  groupIndex === groupedSessionEntries.length - 1 ? styles.workoutSessionDetailExerciseGroupLast : null
                ]}
              >
                <View style={[styles.workoutSessionDetailExerciseCell, { borderRightColor: theme.border }]}>
                  <Text style={[styles.workoutDetailTableExerciseName, { color: theme.text }]} numberOfLines={3}>
                    {group.title}
                  </Text>
                </View>
                <View style={styles.workoutSessionDetailSetsCell}>
                  {group.entries.map((entry, entryIndex) => {
                    const volume = calculateEntryVolume(entry);
                    const plannedReps = entry.plannedTargetType === "repetitions" ? entry.plannedTarget : "";

                    return (
                      <View
                        key={entry.id}
                        style={[
                          styles.workoutSessionDetailSetRow,
                          { borderBottomColor: theme.border },
                          entryIndex === group.entries.length - 1 ? styles.workoutSessionDetailSetRowLast : null
                        ]}
                      >
                        <Text
                          style={[
                            styles.workoutDetailTableValue,
                            styles.workoutSessionDetailSetCell,
                            { color: theme.text, borderRightColor: theme.border }
                          ]}
                          numberOfLines={1}
                        >
                          {getSessionEntryIterationLabel(entry)}
                        </Text>
                        <Text
                          style={[
                            styles.workoutDetailTableValue,
                            styles.workoutSessionDetailRepsCell,
                            { color: theme.text, borderRightColor: theme.border }
                          ]}
                          numberOfLines={1}
                        >
                          {entry.actualReps?.trim() || "-"}
                        </Text>
                        <Text
                          style={[
                            styles.workoutDetailTableValue,
                            styles.workoutSessionDetailRepsCell,
                            { color: theme.text, borderRightColor: theme.border }
                          ]}
                          numberOfLines={1}
                        >
                          {plannedReps?.trim() || "-"}
                        </Text>
                        <Text
                          style={[
                            styles.workoutDetailTableValue,
                            styles.workoutSessionDetailWeightCell,
                            { color: theme.text, borderRightColor: theme.border }
                          ]}
                          numberOfLines={1}
                        >
                          {entry.actualWeight?.trim() ? `${entry.actualWeight.trim()} kg` : "-"}
                        </Text>
                        <Text style={[styles.workoutDetailTableValue, styles.workoutSessionDetailVolumeCell, { color: theme.text }]} numberOfLines={1}>
                          {volume ? formatNumber(volume, "kg") : "-"}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  function renderExerciseProgressHistoryGroup(group: ExerciseProgressHistoryGroup, index: number) {
    const isExpanded = expandedExerciseProgressHistoryKeys[group.key] ?? index === 0;
    const entryCount = group.entries.length;

    return (
      <View key={group.key} style={[styles.exerciseProgressHistoryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Pressable
          accessibilityRole="button"
          style={styles.exerciseProgressHistoryHeader}
          onPress={() => setExpandedExerciseProgressHistoryKeys((current) => ({ ...current, [group.key]: !isExpanded }))}
        >
          <View style={[styles.exerciseProgressHistoryCalendar, { backgroundColor: theme.secondaryBand }]}>
            <Ionicons name="calendar-outline" size={19} color={theme.primary} />
          </View>
          <View style={styles.exerciseProgressHistoryTitleBlock}>
            <Text style={[styles.exerciseProgressHistoryDate, { color: theme.text }]}>{formatSessionDateTime(group.session)}</Text>
            <Text style={[styles.exerciseProgressHistoryWorkout, { color: theme.muted }]} numberOfLines={2}>
              {getWorkoutSessionDisplayName(group.session)}
            </Text>
          </View>
          <View style={styles.exerciseProgressHistoryHeaderRight}>
            <View style={[styles.exerciseProgressHistoryBadge, { backgroundColor: isExpanded ? theme.primary : theme.secondaryBand }]}>
                <Text style={[styles.exerciseProgressHistoryBadgeText, { color: isExpanded ? theme.white : theme.primary }]}>
                {formatExerciseProgressSetCount(entryCount, language)}
              </Text>
            </View>
            <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={19} color={theme.primary} />
          </View>
        </Pressable>

        {isExpanded ? (
          <View style={[styles.exerciseProgressTable, { borderColor: theme.border }]}>
            {group.entries.map((result, entryIndex) => {
              const entry = result.entry;
              const setNumber = entry.setIteration > 0 ? entry.setIteration : entryIndex + 1;
              const values = formatExerciseProgressSeriesValue(entry.actualReps, entry.actualWeight, result.volume, language);
              return (
                <View key={entry.id} style={[styles.exerciseProgressSeriesRow, { borderBottomColor: theme.border }]}>
                  <View style={[styles.exerciseProgressSetBadge, { backgroundColor: theme.secondaryBand }]}>
                    <Text style={[styles.exerciseProgressSetBadgeText, { color: theme.primary }]}>{setNumber}</Text>
                  </View>
                  <Text style={[styles.exerciseProgressSeriesValue, { color: theme.text }]}>{values.repetitions}</Text>
                  <Text style={[styles.exerciseProgressSeriesValue, { color: theme.text }]}>{values.load}</Text>
                  <Text style={[styles.exerciseProgressSeriesVolume, { color: theme.muted }]}>{values.volume}</Text>
                </View>
              );
            })}
            <View style={[styles.exerciseProgressTotalRow, { backgroundColor: theme.control }]}>
              <View style={styles.exerciseProgressTotalLabel}>
                <Text style={[styles.exerciseProgressTotalText, { color: theme.text }]}>{t("totalVolume")}</Text>
              </View>
              <Text style={[styles.exerciseProgressTotalValue, { color: theme.primary }]}>{formatProgressNumber(group.totalVolume, "kg")}</Text>
            </View>
          </View>
        ) : (
          <View style={[styles.exerciseProgressHistorySummary, { borderTopColor: theme.border }]}>
            <View>
              <Text style={[styles.exerciseProgressHistorySummaryLabel, { color: theme.muted }]}>{t("bestWeight")}</Text>
              <Text style={[styles.exerciseProgressHistorySummaryValue, { color: theme.text }]}>{formatProgressNumber(group.bestWeight, "kg")}</Text>
            </View>
            <View>
              <Text style={[styles.exerciseProgressHistorySummaryLabel, { color: theme.muted }]}>{t("mostReps")}</Text>
              <Text style={[styles.exerciseProgressHistorySummaryValue, { color: theme.text }]}>{formatProgressNumber(group.bestReps)}</Text>
            </View>
            <View>
              <Text style={[styles.exerciseProgressHistorySummaryLabel, { color: theme.muted }]}>{t("volume")}</Text>
              <Text style={[styles.exerciseProgressHistorySummaryValue, { color: theme.text }]}>{formatProgressNumber(group.totalVolume, "kg")}</Text>
            </View>
          </View>
        )}
      </View>
    );
  }

  function formatProgressWorkoutCount(count: number) {
    if (language === "en") {
      return `${count} ${count === 1 ? "workout" : "workouts"}`;
    }

    if (count === 1) {
      return "1 trening";
    }

    const lastTwoDigits = count % 100;
    const lastDigit = count % 10;
    if (lastTwoDigits < 12 || lastTwoDigits > 14) {
      if (lastDigit >= 2 && lastDigit <= 4) {
        return `${count} treningi`;
      }
    }

    return `${count} treningów`;
  }

  function formatProgressNumber(value: number | null | undefined, suffix = "") {
    if (value === null || value === undefined || !Number.isFinite(value)) {
      return "—";
    }

    return formatNumber(value, suffix);
  }

  function formatProgressLatestResult(entry: WorkoutSessionEntry) {
    const reps = entry.actualReps ? `${entry.actualReps} ${language === "en" ? "reps" : "powt."}` : "";
    const weight = entry.actualWeight ? `${entry.actualWeight} kg` : "";
    const duration = entry.actualDuration ? entry.actualDuration : "";
    const calories = entry.actualCalories ? `${entry.actualCalories} ${t("caloriesSuffix")}` : "";
    const values = [reps, weight, duration, calories].filter(Boolean);

    return values.length ? values.join(", ") : "—";
  }

  function renderProgressSparkline(item: ExerciseProgressItem) {
    const values = getProgressSparklineValues(item);
    const points = getSparklinePolylinePoints(values, 112, 38, 4);

    if (!points) {
      return null;
    }

    const xml = `
      <svg width="112" height="38" viewBox="0 0 112 38" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 32 C28 24 54 32 108 6" stroke="${theme.secondaryBand}" stroke-width="8" fill="none" stroke-linecap="round" opacity="0.8"/>
        <polyline points="${points}" stroke="${theme.primary}" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        ${points.split(" ").map((point) => `<circle cx="${point.split(",")[0]}" cy="${point.split(",")[1]}" r="2.4" fill="${theme.primary}"/>`).join("")}
      </svg>
    `;

    return (
      <View style={styles.progressSparkline}>
        <SvgXml xml={xml} width={112} height={38} />
      </View>
    );
  }

  function renderProgressStatCard(
    icon: keyof typeof Ionicons.glyphMap,
    title: string,
    value: string,
    caption: string
  ) {
    return (
      <View style={[styles.progressStatCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={[styles.progressStatIcon, { backgroundColor: theme.secondaryBand }]}>
          <Ionicons name={icon} size={22} color={theme.primary} />
        </View>
        <View style={styles.progressStatCopy}>
          <Text style={[styles.progressStatTitle, { color: theme.muted }]}>{title}</Text>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.65}
            numberOfLines={1}
            style={[styles.progressStatValue, { color: theme.text }]}
          >
            {value}
          </Text>
          <Text style={[styles.progressStatCaption, { color: theme.muted }]}>{caption}</Text>
        </View>
      </View>
    );
  }

  function renderProgressMetric(
    icon: keyof typeof Ionicons.glyphMap,
    label: string,
    value: string
  ) {
    return (
      <View style={styles.progressMetric}>
        <View style={[styles.progressMetricIcon, { backgroundColor: theme.secondaryBand }]}>
          <Ionicons name={icon} size={20} color={theme.primary} />
        </View>
        <View style={styles.progressMetricCopy}>
          <Text style={[styles.progressMetricLabel, { color: theme.muted }]} numberOfLines={1}>{label}</Text>
          <Text style={[styles.progressMetricValue, { color: theme.text }]} numberOfLines={1}>{value}</Text>
        </View>
      </View>
    );
  }

  function renderProgressExerciseCard(item: ExerciseProgressItem) {
    return (
      <Pressable
        key={item.exerciseKey}
        accessibilityRole="button"
        style={[styles.progressExerciseCard, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={() => openExerciseProgress(item.exerciseKey)}
      >
        <View style={styles.progressExerciseHeader}>
          <View style={styles.progressExerciseTitleBlock}>
            <Text style={[styles.workoutName, { color: theme.text }]} numberOfLines={2}>
              {getExerciseDisplayName(item.exerciseName, language)}
            </Text>
            <Text style={[styles.workoutMeta, { color: theme.muted }]}>{formatProgressWorkoutCount(item.sessionCount)}</Text>
          </View>
          <View style={styles.progressExerciseHeaderRight}>
            {renderProgressSparkline(item)}
            <Ionicons name="chevron-forward" size={22} color={theme.muted} />
          </View>
        </View>

        <View style={[styles.progressMetricsRow, { borderTopColor: theme.border }]}>
          {renderProgressMetric("time-outline", t("last"), formatProgressLatestResult(item.lastResult.entry))}
          <View style={[styles.progressMetricDivider, { backgroundColor: theme.border }]} />
          {renderProgressMetric("radio-button-on-outline", t("bestWeight"), formatProgressNumber(item.bestWeight, "kg"))}
          <View style={[styles.progressMetricDivider, { backgroundColor: theme.border }]} />
          {renderProgressMetric("server-outline", t("bestVolume"), formatProgressNumber(item.bestVolumeSingleEntry, "kg"))}
        </View>
      </Pressable>
    );
  }

  function renderProgressScreen() {
    const progressFilterOptions: Array<{ label: string; value: ProgressDashboardFilter }> = [
      { label: t("progressFilterAll"), value: "all" },
      { label: t("progressFilterStrength"), value: "strength" },
      { label: t("progressFilterVolume"), value: "volume" }
    ];
    const hasAnyProgress = exerciseProgressItems.length > 0;

    return (
      <View style={styles.historyScreen}>
        <Input style={[styles.searchBox, { backgroundColor: theme.control, borderColor: theme.border }]}>
          <Ionicons name="search" size={20} color={theme.muted} />
          <InputField
            placeholder={t("searchExerciseProgress")}
            placeholderTextColor={theme.muted}
            style={[styles.searchInput, { color: theme.inputText }]}
            value={progressSearch}
            onChangeText={setProgressSearch}
          />
        </Input>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.progressStatsRow}
        >
          {renderProgressStatCard(
            "barbell-outline",
            t("progressExercises"),
            String(progressDashboardStats.trackedExercises),
            t("progressTracked")
          )}
          {renderProgressStatCard(
            "trophy-outline",
            t("progressRecords"),
            String(progressDashboardStats.beatenRecords),
            t("progressBeaten")
          )}
          {renderProgressStatCard(
            "server-outline",
            t("volume"),
            formatProgressDashboardVolume(progressDashboardStats.monthlyVolume, language),
            t("progressThisMonth")
          )}
        </ScrollView>

        <View style={styles.progressFilterRow}>
          {progressFilterOptions.map((option) => {
            const selected = progressFilter === option.value;

            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                style={[
                  styles.progressFilterChip,
                  {
                    backgroundColor: selected ? theme.primary : theme.card,
                    borderColor: selected ? theme.primary : theme.border
                  }
                ]}
                onPress={() => setProgressFilter(option.value)}
              >
                <Text style={[styles.progressFilterChipText, { color: selected ? theme.white : theme.text }]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {filteredExerciseProgressItems.length ? (
          <View style={styles.progressExerciseList}>
            {filteredExerciseProgressItems.map(renderProgressExerciseCard)}
          </View>
        ) : (
          <View style={[styles.emptyBuilder, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="trending-up-outline" size={26} color={theme.primary} />
            <Text style={[styles.emptyBuilderTitle, { color: theme.text }]}>
              {hasAnyProgress ? t("noProgressSearchResults") : t("emptyProgressTitle")}
            </Text>
            {!hasAnyProgress ? (
              <Text style={[styles.emptyBuilderCopy, { color: theme.muted }]}>{t("emptyProgressCopy")}</Text>
            ) : null}
          </View>
        )}
      </View>
    );
  }

  function renderExerciseProgressScreen() {
    const summary = selectedExerciseProgressSummary;

    if (!summary) {
      return (
        <View style={[styles.emptyBuilder, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.emptyBuilderTitle, { color: theme.text }]}>{t("emptyProgressTitle")}</Text>
        </View>
      );
    }

    const latestGroup = selectedExerciseProgressHistoryGroups[0];
    const filteredGroups = filterExerciseProgressHistoryGroups(selectedExerciseProgressHistoryGroups, exerciseProgressHistoryRange);
    const visibleGroups = filteredGroups.slice(0, exerciseProgressHistoryVisibleCount);
    const rangeOptions: Array<{ label: string; value: ExerciseProgressHistoryRange }> = [
      { label: t("progressHistoryAll"), value: "all" },
      { label: t("progressHistory3Months"), value: "3m" },
      { label: t("progressHistory6Months"), value: "6m" },
      { label: t("progressHistory1Year"), value: "1y" }
    ];

    return (
      <View style={styles.historyScreen}>
        <View style={[styles.exerciseProgressOverviewCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.exerciseProgressOverviewTop}>
            <View style={[styles.exerciseProgressOverviewIcon, { backgroundColor: theme.secondaryBand }]}>
              <Ionicons name="barbell-outline" size={26} color={theme.primary} />
            </View>
            <View style={styles.exerciseProgressOverviewTitleBlock}>
              <Text style={[styles.sectionTitle, { color: theme.text }]} numberOfLines={2}>{getExerciseDisplayName(summary.exerciseName, language)}</Text>
              <Text style={[styles.workoutMeta, { color: theme.muted }]} numberOfLines={2}>
                {latestGroup ? getWorkoutSessionDisplayName(latestGroup.session) : "—"}
              </Text>
            </View>
          </View>
          <View style={[styles.exerciseProgressOverviewMetrics, { borderTopColor: theme.border }]}>
            {[
              ["barbell-outline", t("bestWeight"), formatProgressNumber(summary.bestWeight, "kg")],
              ["repeat-outline", t("mostReps"), formatProgressNumber(summary.bestReps)],
              ["server-outline", t("bestVolume"), formatProgressNumber(summary.totalVolumeBySession[0]?.volume ?? summary.bestVolumeSingleEntry, "kg")],
              ["speedometer-outline", t("estimatedOneRepMax"), formatProgressNumber(summary.estimatedOneRepMax, "kg")]
            ].map(([icon, label, value]) => (
              <View key={String(label)} style={styles.exerciseProgressOverviewMetric}>
                <View style={[styles.exerciseProgressOverviewMetricIcon, { backgroundColor: theme.secondaryBand }]}>
                  <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={18} color={theme.primary} />
                </View>
                <View style={styles.exerciseProgressOverviewMetricCopy}>
                  <Text style={[styles.exerciseProgressOverviewMetricLabel, { color: theme.muted }]} numberOfLines={1}>{label}</Text>
                  <Text style={[styles.exerciseProgressOverviewMetricValue, { color: theme.text }]} numberOfLines={1}>{value}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.exerciseProgressHistoryPanel, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.exerciseProgressHistoryPanelHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t("resultHistory")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.exerciseProgressRangeChips}>
              {rangeOptions.map((option) => {
                const selected = exerciseProgressHistoryRange === option.value;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    style={[styles.exerciseProgressRangeChip, { backgroundColor: selected ? theme.primary : theme.control, borderColor: selected ? theme.primary : theme.border }]}
                    onPress={() => {
                      setExerciseProgressHistoryRange(option.value);
                      setExerciseProgressHistoryVisibleCount(5);
                    }}
                  >
                    <Text style={[styles.exerciseProgressRangeChipText, { color: selected ? theme.white : theme.text }]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
          <View style={styles.exerciseProgressHistoryList}>
            {visibleGroups.length ? visibleGroups.map(renderExerciseProgressHistoryGroup) : (
              <Text style={[styles.exerciseProgressHistoryEmpty, { color: theme.muted }]}>{t("exerciseHistoryEmpty")}</Text>
            )}
          </View>
          {visibleGroups.length < filteredGroups.length ? (
            <Pressable
              accessibilityRole="button"
              style={styles.exerciseProgressOlderButton}
              onPress={() => setExerciseProgressHistoryVisibleCount((count) => count + 5)}
            >
              <Text style={[styles.exerciseProgressOlderButtonText, { color: theme.primary }]}>{t("showOlderResults")}</Text>
              <Ionicons name="chevron-down" size={18} color={theme.primary} />
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  function renderExerciseDetailScreen() {
    const step = selectedExerciseDetailStep;
    const details = step ? getExerciseDetails(step, language) : null;
    const progressKey = getExerciseProgressKeyForDetails(details);
    const progressSummary = progressKey ? getExerciseProgressSummary(visibleWorkoutSessions, progressKey) : null;
    const fallbackName = step?.exerciseName ? getExerciseDisplayName(step.exerciseName, language) : t("exerciseDetails");
    const displayName = details?.displayName ?? fallbackName;
    const hasMuscleData = Boolean(details && (details.primary.length || details.secondary.length));
    const colors = {
      inactive: "#4a4d4c",
      primary: "#ff3347",
      secondary: "#ffc43d"
    };

    function fill(muscle: MuscleKey) {
      if (details?.primary.includes(muscle)) {
        return colors.primary;
      }

      if (details?.secondary.includes(muscle)) {
        return colors.secondary;
      }

      return colors.inactive;
    }

    function formatMuscleList(muscles: MuscleKey[]) {
      return muscles.length ? muscles.map((muscle) => muscleLabels[language][muscle]).join(", ") : t("noData");
    }

    function isExerciseDetailPanelCollapsed(panelId: string, defaultValue: boolean) {
      return exerciseDetailCollapsedPanels[panelId] ?? defaultValue;
    }

    function toggleExerciseDetailPanel(panelId: string, defaultValue: boolean) {
      setExerciseDetailCollapsedPanels((current) => ({
        ...current,
        [panelId]: !(current[panelId] ?? defaultValue)
      }));
    }

    function renderExerciseDetailBulletList(items: string[], fallback: string, markerColor = theme.primary) {
      if (!items.length) {
        return <Text style={[styles.workoutDetailNotes, { color: theme.muted }]}>{fallback}</Text>;
      }

      return (
        <View style={styles.exerciseDetailBulletList}>
          {items.map((item, index) => (
            <View key={`${index}-${item}`} style={styles.exerciseDetailBulletRow}>
              <Text style={[styles.exerciseDetailBulletMarker, { color: markerColor }]}>•</Text>
              <Text style={[styles.workoutDetailNotes, styles.exerciseDetailBulletText, { color: theme.muted }]}>
                {item}
              </Text>
            </View>
          ))}
        </View>
      );
    }

    function renderExerciseDetailSteps(items: string[], fallback: string) {
      if (!items.length) {
        return <Text style={[styles.workoutDetailNotes, { color: theme.muted }]}>{fallback}</Text>;
      }

      return (
        <View style={styles.exerciseDetailStepList}>
          {items.map((item, index) => (
            <View key={`${index}-${item}`} style={styles.exerciseDetailStepRow}>
              <View style={[styles.exerciseDetailStepBadge, { backgroundColor: theme.primary }]}>
                <Text style={styles.exerciseDetailStepBadgeText}>{index + 1}</Text>
              </View>
              <Text style={[styles.workoutDetailNotes, styles.exerciseDetailStepText, { color: theme.muted }]}>
                {item}
              </Text>
            </View>
          ))}
        </View>
      );
    }

    return (
      <View style={styles.historyScreen}>
        <View style={[styles.exerciseDetailCompactCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.exerciseDetailMusclesHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{displayName}</Text>
          </View>
          {hasMuscleData ? (
            <View style={styles.exerciseDetailSideToggle}>
              {([
                { label: t("bodyFront"), value: "front" as const },
                { label: t("bodyBack"), value: "back" as const }
              ]).map((option) => {
                const selected = exerciseDetailMuscleSide === option.value;

                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    style={[
                      styles.exerciseDetailSideButton,
                      {
                        backgroundColor: selected ? theme.primary : theme.card,
                        borderColor: selected ? theme.primary : theme.border
                      }
                    ]}
                    onPress={() => setExerciseDetailMuscleSide(option.value)}
                  >
                    <Text style={[styles.exerciseDetailSideButtonText, { color: selected ? theme.white : theme.text }]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          {hasMuscleData ? (
            <View style={styles.exerciseDetailMuscleContent}>
              <View style={styles.exerciseMuscleLists}>
                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: theme.muted }]}>{t("primaryMuscles")}</Text>
                  <Text style={[styles.workoutMeta, { color: theme.text }]}>{formatMuscleList(details?.primary ?? [])}</Text>
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: theme.muted }]}>{t("secondaryMuscles")}</Text>
                  <Text style={[styles.workoutMeta, { color: theme.text }]}>{formatMuscleList(details?.secondary ?? [])}</Text>
                </View>
              </View>
              <View style={styles.exerciseDetailSingleFigure}>
                <HumanMuscleFigure fill={fill} side={exerciseDetailMuscleSide} style={styles.exerciseDetailHumanFigure} />
              </View>
            </View>
          ) : (
            <Text style={[styles.emptyBuilderCopy, { color: theme.muted }]}>{t("noExerciseMuscleData")}</Text>
          )}
        </View>

        {details?.imageAssetKeys.length ? (
          <View style={[styles.exerciseDetailCompactCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.workoutName, { color: theme.text }]}>{t("exerciseAnimation")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.exerciseImageStrip}>
              {details.imageAssetKeys.map((imageKey) => {
                const imageSource = exerciseImageSources[imageKey];
                if (!imageSource) {
                  return null;
                }

                return (
                  <View
                    key={imageKey}
                    style={[styles.exerciseImageFrame, { backgroundColor: theme.secondaryBand, borderColor: theme.border }]}
                  >
                    <Image source={imageSource} style={styles.exerciseDetailImage} resizeMode="contain" />
                  </View>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        <CollapsiblePanel
          collapseLabel={t("collapse")}
          expandLabel={t("expand")}
          isCollapsed={isExerciseDetailPanelCollapsed("howTo", false)}
          theme={theme}
          title={t("howToPerform")}
          onToggle={() => toggleExerciseDetailPanel("howTo", false)}
        >
          {renderExerciseDetailSteps(
            details?.instructions ?? [],
            details?.exercise?.description || t("techniquePlaceholder")
          )}
        </CollapsiblePanel>

        <CollapsiblePanel
          collapseLabel={t("collapse")}
          expandLabel={t("expand")}
          isCollapsed={isExerciseDetailPanelCollapsed("tips", true)}
          theme={theme}
          title={t("tips")}
          onToggle={() => toggleExerciseDetailPanel("tips", true)}
        >
          {renderExerciseDetailBulletList(details?.techniqueTips ?? [], t("tipsPlaceholder"))}
        </CollapsiblePanel>

        <CollapsiblePanel
          collapseLabel={t("collapse")}
          expandLabel={t("expand")}
          isCollapsed={isExerciseDetailPanelCollapsed("mistakes", true)}
          theme={theme}
          title={t("commonMistakes")}
          onToggle={() => toggleExerciseDetailPanel("mistakes", true)}
        >
          {renderExerciseDetailBulletList(details?.commonMistakes ?? [], t("commonMistakesPlaceholder"), theme.danger)}
        </CollapsiblePanel>

        <CollapsiblePanel
          collapseLabel={t("collapse")}
          expandLabel={t("expand")}
          isCollapsed={isExerciseDetailPanelCollapsed("history", !progressSummary)}
          theme={theme}
          title={t("exerciseHistory")}
          onToggle={() => toggleExerciseDetailPanel("history", !progressSummary)}
        >
          {progressSummary ? (
            <View style={styles.exerciseDetailHistoryGrid}>
              <View style={[styles.exerciseDetailHistoryTile, { backgroundColor: theme.secondaryBand }]}>
                <Text style={[styles.label, { color: theme.muted }]}>{t("last")}</Text>
                <Text style={[styles.workoutMeta, { color: theme.text }]}>{formatEntryActual(progressSummary.lastResult.entry)}</Text>
              </View>
              <View style={[styles.exerciseDetailHistoryTile, { backgroundColor: theme.secondaryBand }]}>
                <Text style={[styles.label, { color: theme.muted }]}>{t("bestWeight")}</Text>
                <Text style={[styles.workoutMeta, { color: theme.text }]}>{formatNumber(progressSummary.bestWeight, "kg")}</Text>
              </View>
              <View style={[styles.exerciseDetailHistoryTile, { backgroundColor: theme.secondaryBand }]}>
                <Text style={[styles.label, { color: theme.muted }]}>{t("bestVolume")}</Text>
                <Text style={[styles.workoutMeta, { color: theme.text }]}>{formatNumber(progressSummary.bestVolumeSingleEntry, "kg")}</Text>
              </View>
              <View style={[styles.exerciseDetailHistoryTile, { backgroundColor: theme.secondaryBand }]}>
                <Text style={[styles.label, { color: theme.muted }]}>{t("sessions")}</Text>
                <Text style={[styles.workoutMeta, { color: theme.text }]}>{progressSummary.results.length}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.workoutInfo}>
              <Text style={[styles.workoutMeta, { color: theme.text }]}>{t("exerciseHistoryEmpty")}</Text>
              <Text style={[styles.emptyBuilderCopy, { color: theme.muted }]}>{t("exerciseHistoryPlaceholder")}</Text>
            </View>
          )}
        </CollapsiblePanel>
      </View>
    );
  }

  function renderWorkoutDetail() {
    const selectedWorkout =
      savedWorkouts.find((item) => item.id === selectedWorkoutId) ?? savedWorkouts[0];

    if (!selectedWorkout) {
      return (
        <View style={[styles.emptyBuilder, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="barbell-outline" size={26} color={theme.primary} />
          <Text style={[styles.emptyBuilderTitle, { color: theme.text }]}>
            {t("noWorkout")}
          </Text>
          <Text style={[styles.emptyBuilderCopy, { color: theme.muted }]}>
            {t("noWorkoutCopy")}
          </Text>
        </View>
      );
    }

    const stageGroups = selectedWorkout.draft.steps
      .filter((step) => step.kind === "stage" && step.stageType !== "warmup")
      .map((stage) => ({
        stage,
        series: selectedWorkout.draft.steps
          .filter((step) => step.kind === "set" && step.parentStageId === stage.id)
          .map((set) => ({
            set,
            elements: selectedWorkout.draft.steps.filter(
              (step) => step.kind === "exercise" && step.parentSetId === set.id
            )
          }))
      }));
    const isAiRewriteCreditBlocked = Boolean(user && aiCreditBalance.balance < aiCreditBalance.rewriteCost);
    const isAiRewriteOnlineBlocked = !areOnlineFeaturesAvailable;

    return (
      <>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderCopy}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{selectedWorkout.name}</Text>
          </View>
          <View style={styles.workoutDetailActions}>
            <AppButton
              icon="create-outline"
              style={styles.builderBackButton}
              textStyle={styles.builderBackButtonText}
              theme={theme}
              variant="outline"
              onPress={() => openWorkoutEditor(selectedWorkout.id)}
            >
                {t("edit")}
            </AppButton>
            <AppButton
              icon="trash-outline"
              style={[styles.builderBackButton, { borderColor: theme.danger }]}
              textStyle={[styles.builderBackButtonText, { color: theme.danger }]}
              theme={theme}
              variant="outline"
              onPress={() => deleteWorkout(selectedWorkout.id)}
            >
                {t("delete")}
            </AppButton>
          </View>
        </View>
        {selectedWorkout.draft.notes ? (
          <CollapsiblePanel
            collapseLabel={t("collapse")}
            expandLabel={t("expand")}
            isCollapsed={isReadOnlyWorkoutPanelCollapsed("workout-notes")}
            theme={theme}
            title={t("workoutNotes")}
            onToggle={() => toggleReadOnlyWorkoutPanel("workout-notes")}
          >
            <Text style={[styles.workoutDetailDescription, { color: theme.muted }]}>
              {selectedWorkout.draft.notes}
            </Text>
          </CollapsiblePanel>
        ) : null}

        <AppButton
          icon="play-outline"
          theme={theme}
          onPress={() => startSelectedWorkoutSession()}
        >
          {t("startWorkout")}
        </AppButton>
        {isAiRewriteCreditBlocked && showAiRewriteCreditTooltip ? (
          <View style={[styles.inlineTooltip, { backgroundColor: theme.secondaryBand, borderColor: theme.border }]}>
            <Text style={[styles.inlineTooltipText, { color: theme.text }]}>{t("aiCreditsInsufficient")}</Text>
          </View>
        ) : null}
        <AppButton
          icon="sparkles-outline"
          style={isAiRewriteCreditBlocked || isAiRewriteOnlineBlocked ? styles.disabledActionButton : undefined}
          textStyle={isAiRewriteCreditBlocked || isAiRewriteOnlineBlocked ? { color: theme.muted } : undefined}
          theme={theme}
          variant="outline"
          onPress={() => {
            if (isAiRewriteOnlineBlocked) {
              showOnlineFeatureUnavailableDialog();
              return;
            }

            if (isAiRewriteCreditBlocked) {
              setShowAiRewriteCreditTooltip(true);
              setTimeout(() => setShowAiRewriteCreditTooltip(false), 3000);
              return;
            }

            setShowAiRewriteCreditTooltip(false);
            openWorkoutAiRewrite(selectedWorkout.id);
          }}
        >
          {t("aiRewriteAction")}
        </AppButton>

        <CollapsiblePanel
          collapseLabel={t("collapse")}
          expandLabel={t("expand")}
          isCollapsed={isReadOnlyWorkoutPanelCollapsed("workout-overview")}
          theme={theme}
          title={t("overview")}
          onToggle={() => toggleReadOnlyWorkoutPanel("workout-overview")}
        >
          <WorkoutMuscleOverviewContent language={language} theme={theme} workout={selectedWorkout.draft} />
        </CollapsiblePanel>

        <View style={styles.workoutDetailStages}>
          {stageGroups.map(({ stage, series }, index) => {
            const exerciseCount = series.reduce(
              (total, item) => total + item.elements.filter((element) => !isRestTargetStep(element)).length,
              0
            );

            return (
              <CollapsiblePanel
                actions={
                  <View style={[styles.panelCountBadge, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[styles.panelCountBadgeText, { color: theme.primary }]}>{exerciseCount}</Text>
                  </View>
                }
                collapseLabel={t("collapse")}
                expandLabel={t("expand")}
                key={stage.id}
                isCollapsed={isReadOnlyWorkoutPanelCollapsed(`workout-stage-${stage.id}`)}
                theme={theme}
                title={stage.label || `${t("stage")} ${index + 1}`}
                onToggle={() => toggleReadOnlyWorkoutPanel(`workout-stage-${stage.id}`)}
              >
                {stage.notes ? (
                  <Text style={[styles.workoutDetailNotes, { color: theme.muted }]}>{stage.notes}</Text>
                ) : null}

                {series.length ? (
                  <View style={styles.workoutDetailSeriesList}>
                    {series.map(({ set, elements }, setIndex) => {
                      const headerElement = elements.find((element) => !isRestTargetStep(element)) ?? elements[0];

                      return (
                        <View
                          key={set.id}
                          style={[
                            styles.workoutDetailSeriesRow,
                            { borderColor: theme.border },
                            setIndex === series.length - 1 ? styles.workoutDetailSeriesRowLast : null
                          ]}
                        >
                          <View style={styles.workoutInfo}>
                            {elements.map((element) => (
                              <View key={element.id} style={styles.workoutDetailElementRow}>
                                <ExerciseSummaryRow
                                  language={language}
                                  pairedTargetText={
                                    isRestTargetStep(element)
                                      ? (() => {
                                        const elementIndex = elements.findIndex((item) => item.id === element.id);
                                        const previousExercise = [...elements]
                                          .slice(0, Math.max(0, elementIndex))
                                          .reverse()
                                          .find((item) => !isRestTargetStep(item));

                                        return previousExercise
                                          ? formatExerciseSetTarget({ ...previousExercise, setCount: set.setCount || "1" })
                                          : undefined;
                                      })()
                                      : undefined
                                  }
                                  seriesIndex={headerElement?.id === element.id ? setIndex + 1 : undefined}
                                  step={element}
                                  targetText={formatExerciseSetTarget({ ...element, setCount: set.setCount || "1" })}
                                  theme={theme}
                                  t={t}
                                  onPressDetails={() => openExerciseDetail(element)}
                                  onPressMuscles={() => openExerciseDetail(element)}
                                />
                                {element.notes ? (
                                  <Text style={[styles.workoutDetailNotes, { color: theme.muted }]}>
                                    {element.notes}
                                  </Text>
                                ) : null}
                              </View>
                            ))}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </CollapsiblePanel>
            );
          })}
        </View>

        <CollapsiblePanel
          collapseLabel={t("collapse")}
          expandLabel={t("expand")}
          isCollapsed={isReadOnlyWorkoutPanelCollapsed("workout-history")}
          theme={theme}
          title={t("workoutHistory")}
          onToggle={() => toggleReadOnlyWorkoutPanel("workout-history")}
        >
          {selectedWorkoutSessions.length ? (
            <View style={styles.sessionHistoryList}>
              {selectedWorkoutSessions.map((session) => {
                const completedCount = session.entries.filter((entry) => entry.isCompleted).length;
                const durationMs = session.finishedAt
                  ? Date.parse(session.finishedAt) - Date.parse(session.startedAt)
                  : 0;
                const durationMinutes = durationMs > 0 ? Math.round(durationMs / 60000) : 0;
                const modeLabel = getWorkoutExecutionModeOptions(t).find((item) => item.value === session.executionMode)?.label;

                return (
                  <Pressable key={session.id} accessibilityRole="button" style={[styles.sessionHistoryRow, { borderColor: theme.border }]} onPress={() => openWorkoutSessionDetail(session.id)}>
                    <Text style={[styles.workoutName, { color: theme.text }]}>
                      {new Date(session.startedAt).toLocaleDateString()}
                    </Text>
                    <Text style={[styles.workoutMeta, { color: theme.muted }]}>
                      {getSessionStatusLabel(session.status)} · {modeLabel} · {completedCount}/{session.entries.length}
                      {durationMinutes ? ` · ${durationMinutes} min` : ""}
                    </Text>
                  </Pressable>
                );
              })}
              <AppButton
                icon="time-outline"
                theme={theme}
                variant="outline"
                onPress={() => openWorkoutHistory(selectedWorkout.id)}
              >
                {t("viewFullHistory")}
              </AppButton>
            </View>
          ) : (
            <Text style={[styles.workoutMeta, { color: theme.muted }]}>{t("empty")}</Text>
          )}
        </CollapsiblePanel>
      </>
    );
  }

  function renderWorkoutAiRewrite() {
    const sourceWorkout = savedWorkouts.find((item) => item.id === (rewriteSourceWorkoutId ?? selectedWorkoutId));
    const suggestionKeys: TranslationKey[] = [
      "aiRewriteSuggestionShorten",
      "aiRewriteSuggestionBack",
      "aiRewriteSuggestionHome",
      "aiRewriteSuggestionLegs",
      "aiRewriteSuggestionSets",
      "aiRewriteSuggestionCatalog"
    ];
    const stageCount = sourceWorkout?.draft.steps.filter((step) => step.kind === "stage").length ?? 0;
    const setCount = sourceWorkout?.draft.steps.filter((step) => step.kind === "set").length ?? 0;
    const exerciseCount = sourceWorkout?.draft.steps.filter((step) => step.kind === "exercise").length ?? 0;

    return (
      <View style={styles.creatorForm}>
        <View style={[styles.creatorPanel, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.panelHeroHeader}>
            <View style={[styles.legalIcon, { backgroundColor: theme.secondaryBand }]}>
              <Ionicons name="sparkles-outline" size={26} color={theme.primary} />
            </View>
            <View style={styles.workoutInfo}>
              <Text style={[styles.creatorPromptTitle, { color: theme.text }]}>{t("aiRewriteTitle")}</Text>
              <Text style={[styles.creatorDescription, { color: theme.muted }]}>
                {sourceWorkout?.name ?? t("workout")}
              </Text>
            </View>
          </View>

          <View style={[styles.creatorPlanBox, { backgroundColor: theme.secondaryBand, borderColor: theme.border }]}>
            <Text style={[styles.creatorPlanText, { color: theme.text }]}>
              {stageCount} {t("stages").toLowerCase()} · {setCount} {t("setsPlural")} · {exerciseCount} {t("exercise").toLowerCase()}
            </Text>
          </View>

          <View style={styles.creatorChoiceList}>
            {suggestionKeys.map((key) => (
              <Pressable
                key={key}
                accessibilityRole="button"
                style={[styles.creatorChoiceChip, { backgroundColor: theme.secondaryBand, borderColor: theme.border }]}
                onPress={() => setRewriteInstruction(t(key))}
              >
                <Text style={[styles.creatorChoiceText, { color: theme.primary }]}>{t(key)}</Text>
              </Pressable>
            ))}
          </View>

          <AppTextarea
            maxLength={1000}
            placeholder={t("aiRewritePlaceholder")}
            style={styles.creatorTextarea}
            theme={theme}
            value={rewriteInstruction}
            onChangeText={(value) => {
              setRewriteInstruction(value.slice(0, 1000));
              if (rewriteError) {
                setRewriteError("");
              }
            }}
          />

          <View style={[styles.creatorPlanBox, { backgroundColor: theme.control, borderColor: theme.border }]}>
            <Text style={[styles.workoutMeta, { color: theme.muted }]}>
              {t("aiCreditsRewriteNeed")}
            </Text>
            <Text style={[styles.workoutName, { color: theme.text }]}>
              {t("aiCreditsAvailable")}: {aiCreditBalance.balance}
            </Text>
            <Text style={[styles.workoutMeta, { color: theme.muted }]}>
              {t("aiCreditsCharged")}
            </Text>
            {aiCreditBalance.balance < aiCreditBalance.rewriteCost ? (
              <AppButton
                icon="sparkles-outline"
                style={styles.secondaryButton}
                textStyle={styles.secondaryButtonText}
                theme={theme}
                variant="outline"
                onPress={() => {
                  if (!areOnlineFeaturesAvailable) {
                    showOnlineFeatureUnavailableDialog();
                    return;
                  }
                  setActiveScreen("aiCredits");
                }}
              >
                {t("aiCreditsGoTo")}
              </AppButton>
            ) : null}
          </View>

          {rewriteError ? <Text style={[styles.authError, { color: theme.danger }]}>{rewriteError}</Text> : null}

          <AppButton
            disabled={isRewriteSubmitting || isRewriteJobPending || !areOnlineFeaturesAvailable || !sourceWorkout || aiCreditBalance.balance < aiCreditBalance.rewriteCost}
            icon={isRewriteSubmitting || isRewriteJobPending ? "hourglass-outline" : "sparkles-outline"}
            theme={theme}
            onPress={() => void submitWorkoutRewrite()}
          >
            {isRewriteSubmitting || isRewriteJobPending ? t("aiRewriteProcessing") : t("aiRewriteAction")}
          </AppButton>
        </View>
      </View>
    );
  }

  function renderWorkoutAiProposal() {
    if (!rewriteProposedWorkout) {
      return (
        <View style={[styles.emptyBuilder, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="alert-circle-outline" size={26} color={theme.danger} />
          <Text style={[styles.emptyBuilderTitle, { color: theme.text }]}>{t("aiRewriteInvalidFormat")}</Text>
          <AppButton theme={theme} variant="outline" onPress={() => setActiveScreen("workoutDetail")}>
            {t("backToStart")}
          </AppButton>
        </View>
      );
    }

    const sourceWorkout = savedWorkouts.find((item) => item.id === rewriteSourceWorkoutId);
    const matchSummary = getWorkoutCatalogMatchSummary(rewriteProposedWorkout.draft);
    const stageGroups = rewriteProposedWorkout.draft.steps
      .filter((step) => step.kind === "stage")
      .map((stage) => ({
        stage,
        series: rewriteProposedWorkout.draft.steps
          .filter((step) => step.kind === "set" && step.parentStageId === stage.id)
          .map((set) => ({
            set,
            elements: rewriteProposedWorkout.draft.steps.filter(
              (step) => step.kind === "exercise" && step.parentSetId === set.id
            )
          }))
      }));

    return (
      <View style={styles.creatorForm}>
        <View style={[styles.creatorPanel, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.panelHeroHeader}>
            <View style={[styles.legalIcon, { backgroundColor: theme.secondaryBand }]}>
              <Ionicons name="sparkles-outline" size={26} color={theme.primary} />
            </View>
            <View style={styles.workoutInfo}>
              <Text style={[styles.creatorPromptTitle, { color: theme.text }]}>{t("aiRewriteProposal")}</Text>
              <Text style={[styles.creatorDescription, { color: theme.muted }]}>
                {sourceWorkout?.name ?? t("workout")} → {rewriteProposedWorkout.name}
              </Text>
            </View>
          </View>

          <View style={[styles.creatorPlanBox, { backgroundColor: theme.secondaryBand, borderColor: theme.border }]}>
            <Text style={[styles.creatorPlanText, { color: theme.text }]}>
              {matchSummary.unmatched
                ? t("aiRewriteUnmatchedTitle")
                : t("aiRewriteMatched")}
            </Text>
            {matchSummary.unmatched ? (
              <Text style={[styles.creatorDescription, { color: theme.muted }]}>
                {t("aiRewriteUnmatchedCopy")} {matchSummary.matched}/{matchSummary.total}
              </Text>
            ) : null}
          </View>

          {rewriteProposedWorkout.draft.notes ? (
            <Text style={[styles.workoutDetailDescription, { color: theme.muted }]}>
              {rewriteProposedWorkout.draft.notes}
            </Text>
          ) : null}

          <View style={styles.workoutDetailStages}>
            {stageGroups.map(({ stage, series }, stageIndex) => (
              <View
                key={stage.id}
                style={[styles.workoutDetailStage, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <Text style={[styles.workoutName, { color: theme.text }]}>
                  {stage.label || `${t("stage")} ${stageIndex + 1}`}
                </Text>
                {series.map(({ set, elements }, setIndex) => (
                  <View key={set.id} style={[styles.workoutDetailSeriesRow, { borderColor: theme.border }]}>
                    <Text style={[styles.workoutDetailExerciseName, { color: theme.text }]}>
                      {t("set")} {setIndex + 1}
                    </Text>
                    {elements.map((element) => (
                      <ExerciseSummaryRow
                        key={element.id}
                        language={language}
                        step={element}
                        targetText={formatExerciseSetTarget({ ...element, setCount: set.setCount || "1" })}
                        theme={theme}
                        t={t}
                        onPressDetails={() => openExerciseDetail(element)}
                        onPressMuscles={() => openExerciseDetail(element)}
                      />
                    ))}
                  </View>
                ))}
              </View>
            ))}
          </View>

          <AppButton icon="copy-outline" theme={theme} onPress={saveRewriteProposalAsNew}>
            {t("aiRewriteSaveAsNew")}
          </AppButton>
          <AppButton icon="swap-horizontal-outline" theme={theme} variant="outline" onPress={replaceWorkoutWithRewriteProposal}>
            {t("aiRewriteReplaceCurrent")}
          </AppButton>
          <AppButton
            icon="close-outline"
            theme={theme}
            variant="outline"
            onPress={() => {
              setRewriteProposedWorkout(null);
              setPendingCreatorJob(null);
              setActiveScreen("workoutDetail");
            }}
          >
            {t("aiRewriteDiscard")}
          </AppButton>
        </View>
      </View>
    );
  }
  function renderSettings() {
    const stageTypeOptions = getStageTypeOptions(t);
    const executionModeOptions = getWorkoutExecutionModeOptions(t);
    const selectedStageTypeLabel = stageTypeOptions.find((option) => option.value === defaultStageType)?.label;
    const selectedExecutionModeLabel = executionModeOptions.find((option) => option.value === defaultWorkoutExecutionMode)?.label;
    const reminderDayOptions = getReminderDayOptions(t);
    return (
      <>
        <SettingsSection
          isCollapsed={isPanelCollapsed("settings-preferences")}
          title={t("preferences")}
          theme={theme}
          onToggle={() => togglePanel("settings-preferences")}
        >
          <SettingsOption
            icon="language-outline"
            label={t("appLanguage")}
            value={languageOptions.find((option) => option.value === language)?.label ?? "Polski"}
            theme={theme}
            onPress={() => {
              setPendingLanguage(language);
              setActiveSettingsSheet("language");
            }}
          />
          <SettingsOption
            icon={isDarkMode ? "moon-outline" : "sunny-outline"}
            label={t("theme")}
            value={isDarkMode ? t("themeDark") : t("themeLight")}
            theme={theme}
            onPress={() => setThemeName(isDarkMode ? "light" : "dark")}
          />
        </SettingsSection>

        <SettingsSection
          isCollapsed={isPanelCollapsed("settings-training")}
          title={t("training")}
          theme={theme}
          onToggle={() => togglePanel("settings-training")}
        >
          <SettingsOption
            icon="repeat-outline"
            label={t("defaultSetCount")}
            value={defaultSetCount || t("setupRequired")}
            theme={theme}
            onPress={() => {
              setPendingDefaultSetCount(defaultSetCount);
              setActiveSettingsSheet("defaultSetCount");
            }}
          />
          <SettingsOption
            icon="barbell-outline"
            label={t("defaultWeight")}
            value={defaultWeight ? `${defaultWeight} kg` : t("empty")}
            theme={theme}
            onPress={() => {
              setPendingDefaultWeight(defaultWeight);
              setActiveSettingsSheet("defaultWeight");
            }}
          />
          <SettingsOption
            icon="layers-outline"
            label={t("defaultStageType")}
            value={selectedStageTypeLabel ?? t("toChoose")}
            theme={theme}
            onPress={() => {
              setPendingDefaultStageType(defaultStageType);
              setActiveSettingsSheet("defaultStageType");
            }}
          />
          <SettingsOption
            icon="walk-outline"
            label={t("defaultWorkoutExecutionMode")}
            value={selectedExecutionModeLabel ?? t("executionGuided")}
            theme={theme}
            onPress={() => {
              setPendingDefaultWorkoutExecutionMode(defaultWorkoutExecutionMode);
              setActiveSettingsSheet("defaultWorkoutExecutionMode");
            }}
          />
          <SettingsOption
            icon="time-outline"
            label={t("showRestTimer")}
            value={showRestTimer ? t("enabled") : t("disabled")}
            theme={theme}
            onPress={() => setShowRestTimer((current) => !current)}
          />
          <SettingsOption
            icon="star-outline"
            label={t("favoriteExercises")}
            value={String(getFavoriteCatalogExercises(favoriteExercises).length)}
            theme={theme}
            onPress={() => setActiveScreen("favoriteExercises")}
          />
          {/* Custom exercises are intentionally not supported; catalog-only choices keep Garmin mapping possible. */}
        </SettingsSection>

        <SettingsSection
          isCollapsed={isPanelCollapsed("settings-notifications")}
          title={t("notifications")}
          theme={theme}
          onToggle={() => togglePanel("settings-notifications")}
        >
          <SettingsOption
            icon="notifications-outline"
            label={t("enableReminders")}
            value={workoutReminders.enabled ? t("enabled") : t("disabled")}
            theme={theme}
            onPress={() => {
              void toggleWorkoutRemindersEnabled();
            }}
          />
          {workoutReminders.enabled ? (
            <>
              <SettingsOption
                icon="checkmark-done-outline"
                label={t("reminderOnlyIfNoWorkoutToday")}
                value={workoutReminders.onlyIfNoWorkoutToday ? t("enabled") : t("disabled")}
                theme={theme}
                onPress={() => updateWorkoutReminderSettings({
                  ...workoutReminders,
                  onlyIfNoWorkoutToday: !workoutReminders.onlyIfNoWorkoutToday
                })}
              />
              <View style={styles.reminderWeeklyBlock}>
                <Text style={[styles.settingsOptionLabel, { color: theme.text }]}>{t("reminderWeeklySchedule")}</Text>
                <View style={styles.reminderWeeklyRows}>
                  {reminderDayOptions.map((day) => {
                    const schedule = getReminderScheduleForDay(workoutReminders, day.value);
                    const enabled = schedule.enabled;

                    return (
                      <View key={day.value} style={styles.reminderWeeklyRow}>
                        <Pressable
                          accessibilityLabel={`${day.label}: ${enabled ? t("enabled") : t("disabled")}`}
                          accessibilityRole="switch"
                          accessibilityState={{ checked: enabled }}
                          onPress={() => {
                            void toggleWorkoutReminderDay(day.value);
                          }}
                          style={[
                            styles.reminderWeeklyDayBadge,
                            {
                              backgroundColor: enabled ? theme.primary : theme.secondaryBand,
                              borderColor: enabled ? theme.primary : theme.border
                            }
                          ]}
                        >
                          <Text style={[
                            styles.reminderWeeklyDayText,
                            { color: enabled ? theme.white : theme.text }
                          ]}>
                            {day.shortLabel}
                          </Text>
                        </Pressable>
                        <Pressable
                          accessibilityLabel={day.label}
                          accessibilityRole="button"
                          style={[
                            styles.reminderWeeklyDetail,
                            {
                              backgroundColor: theme.card,
                              borderColor: theme.border
                            }
                          ]}
                          onPress={() => openWorkoutReminderDayEditor(getReminderWeekdayFromNumber(day.value))}
                        >
                          <View
                            style={[
                              styles.reminderWeeklyStatusDot,
                              { backgroundColor: enabled ? theme.primary : theme.muted }
                            ]}
                          />
                          <Text style={[styles.reminderWeeklyStatus, { color: theme.text }]}>
                            {enabled ? t("enabled") : t("disabled")}
                          </Text>
                          <Text style={[styles.reminderWeeklyTime, { color: theme.text }]}>
                            {formatReminderDayTime(schedule)}
                          </Text>
                          <Ionicons name="chevron-forward" size={20} color={theme.muted} />
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              </View>
              <View style={styles.reminderMessageBlock}>
                <Text style={[styles.reminderFieldLabel, { color: theme.text }]}>{t("reminderMessage")}</Text>
                <AppInput
                  placeholder={getDefaultWorkoutReminderSettings(language).message}
                  theme={theme}
                  value={workoutReminders.message}
                  onChangeText={updateWorkoutReminderMessage}
                />
              </View>
              <View style={styles.reminderMessageBlock}>
                <Text style={[styles.reminderFieldLabel, { color: theme.text }]}>{t("reminderDescription")}</Text>
                <AppTextarea
                  inputStyle={styles.reminderDescriptionInput}
                  numberOfLines={2}
                  placeholder={getDefaultWorkoutReminderSettings(language).description}
                  style={styles.reminderDescriptionTextarea}
                  theme={theme}
                  value={workoutReminders.description ?? ""}
                  onChangeText={updateWorkoutReminderDescription}
                />
              </View>
            </>
          ) : null}
          {reminderSchedulingStatus === "permissionDenied" ? (
            <Text style={[styles.settingsHint, { color: theme.danger }]}>{t("remindersPermissionDenied")}</Text>
          ) : reminderSchedulingStatus === "failed" ? (
            <Text style={[styles.settingsHint, { color: theme.danger }]}>{t("remindersScheduleError")}</Text>
          ) : null}
        </SettingsSection>

        <SettingsSection
          isCollapsed={isPanelCollapsed("settings-integrations")}
          title={t("integrations")}
          theme={theme}
          onToggle={() => togglePanel("settings-integrations")}
        >
          <SettingsPlaceholder
            disabled
            icon="sync-outline"
            label="Garmin Connect"
            meta={t("integrationPlaceholder")}
            theme={theme}
          />
        </SettingsSection>

        {false ? (
        <SettingsSection
          isCollapsed={isPanelCollapsed("settings-data")}
          title="Dane i prywatność"
          theme={theme}
          onToggle={() => togglePanel("settings-data")}
        >
          <SettingsOption icon="download-outline" label="Eksport danych" value="Wkrótce" theme={theme} />
          <SettingsOption icon="trash-outline" label="Czyszczenie lokalnych danych" value="Wkrótce" theme={theme} />
          <InfoLinkRow
            icon="document-text-outline"
            label="Regulamin"
            meta="Zasady korzystania z aplikacji"
            theme={theme}
            onPress={() => setActiveScreen("terms")}
          />
          <SettingsOption icon="shield-checkmark-outline" label="Polityka prywatności" value="Wkrótce" theme={theme} />
        </SettingsSection>
        ) : null}

        {false ? (
        <SettingsSection
          isCollapsed={isPanelCollapsed("settings-help")}
          title="Pomoc"
          theme={theme}
          onToggle={() => togglePanel("settings-help")}
        >
          <InfoLinkRow
            icon="mail-outline"
            label="Kontakt"
            meta="Dane kontaktowe i pomoc"
            theme={theme}
            onPress={() => setActiveScreen("contact")}
          />
          <SettingsOption icon="bug-outline" label="Zgłoś problem" value="Wkrótce" theme={theme} />
          <SettingsOption icon="help-circle-outline" label="FAQ" value="Wkrótce" theme={theme} />
        </SettingsSection>
        ) : null}

        <SettingsSection
          isCollapsed={isPanelCollapsed("settings-info")}
          title={t("information")}
          theme={theme}
          onToggle={() => togglePanel("settings-info")}
        >
          <InfoLinkRow
            icon="document-text-outline"
            label={t("terms")}
            meta={t("termsMeta")}
            theme={theme}
            onPress={() => setActiveScreen("terms")}
          />
          <InfoLinkRow
            icon="mail-outline"
            label={t("contact")}
            meta={t("contactMeta")}
            theme={theme}
            onPress={() => setActiveScreen("contact")}
          />
          <InfoLinkRow
            icon="bug-outline"
            label={t("bugReport")}
            meta={t("bugReportMeta")}
            theme={theme}
            onPress={() => setActiveScreen("bugReport")}
          />
        </SettingsSection>
      </>
    );
  }

  function renderAiCredits() {
    if (!user) {
      return renderProfile();
    }

    const isDevBuild = typeof __DEV__ !== "undefined" && __DEV__;
    const recentTransactions = showAllAiCreditTransactions
      ? aiCreditTransactions
      : getRecentAiCreditTransactions(aiCreditTransactions, 3);

    return (
      <View style={styles.aiCreditsScreen}>
        <View style={[styles.aiCreditsBalanceCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.panelHeroHeader}>
            <View style={[styles.aiCreditsHeroIcon, { backgroundColor: theme.secondaryBand }]}>
              <Ionicons name="sparkles-outline" size={26} color={theme.primary} />
            </View>
            <View style={styles.workoutInfo}>
              <Text style={[styles.creatorPromptTitle, { color: theme.text }]}>{t("aiCredits")}</Text>
              <Text style={[styles.creatorDescription, { color: theme.muted }]}>
                {t("aiCreditsDescription")}
              </Text>
            </View>
          </View>

          <Text style={[styles.workoutMeta, { color: theme.muted }]}>{t("aiCreditsAvailable")}</Text>
          <Text style={[styles.aiCreditsBalanceValue, { color: theme.primary }]}>{aiCreditBalance.balance}</Text>
          <View style={[styles.aiCreditsDivider, { backgroundColor: theme.border }]} />
          <Text style={[styles.workoutMeta, { color: theme.muted }]}>
            {t("aiCreditsPlanCost")}: {aiCreditBalance.planCost} · {t("aiCreditsRewriteCost")}: {aiCreditBalance.rewriteCost}
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={isAiCreditsLoading || isAiCreditPurchaseLoading}
            style={styles.aiCreditsRefreshFooterButton}
            onPress={() => void fetchAiCredits(user)}
          >
            <Ionicons name="refresh-outline" size={18} color={theme.primary} />
            <Text style={[styles.aiCreditsRefreshText, { color: theme.primary }]}>
              {isAiCreditsLoading ? t("aiCreatorSubmitting") : t("refresh")}
            </Text>
          </Pressable>
        </View>

        {aiCreditsError ? (
          <Text style={[styles.authError, { color: theme.danger }]}>{aiCreditsError}</Text>
        ) : null}
        {aiCreditsPurchaseMessage ? (
          <Text style={[styles.workoutMeta, { color: theme.primary }]}>{aiCreditsPurchaseMessage}</Text>
        ) : null}

        {isDevBuild ? (
          <AppButton
            disabled={isAiCreditsLoading || isAiCreditPurchaseLoading}
            icon="add-circle-outline"
            theme={theme}
            variant="outline"
            onPress={() => void grantDevAiCredits()}
          >
            {t("aiCreditsDevGrant")}
          </AppButton>
        ) : null}

        <View style={styles.fieldGroup}>
          <Text style={[styles.creatorSectionTitle, { color: theme.text }]}>{t("aiCreditsPackages")}</Text>
          {aiCreditPacks.length ? (
            <View style={styles.aiCreditsPackageList}>
              {aiCreditPacks.slice(0, 3).map((pack) => (
                <View key={pack.productId} style={[styles.aiCreditsPackageCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={[styles.aiCreditsPackageBadge, { backgroundColor: theme.secondaryBand }]}>
                    <Text style={[styles.aiCreditsPackageBadgeText, { color: theme.primary }]}>{pack.credits}</Text>
                  </View>
                  <View style={styles.workoutInfo}>
                    <Text style={[styles.aiCreditsPackageTitle, { color: theme.text }]}>{formatAiCreditPackName(pack.credits, language)}</Text>
                    <Text style={[styles.aiCreditsPackageDescription, { color: theme.muted }]}>
                      {getAiCreditPackDescription(pack.credits, language)}
                    </Text>
                  </View>
                  <View style={styles.aiCreditsPackageAction}>
                    {pack.localizedPrice ? (
                      <Text style={[styles.aiCreditsPackagePrice, { color: theme.text }]}>{pack.localizedPrice}</Text>
                    ) : null}
                  <Pressable
                    accessibilityRole="button"
                    disabled={isAiCreditPurchaseLoading || !pack.active}
                    style={({ pressed }) => [
                      styles.aiCreditsPackageButton,
                      { backgroundColor: theme.primary, opacity: pressed || isAiCreditPurchaseLoading || !pack.active ? 0.72 : 1 }
                    ]}
                    onPress={() => void buyAiCreditPack(pack)}
                  >
                    <Text style={[styles.aiCreditsPackageButtonText, { color: theme.white }]}>
                      {isAiCreditPurchaseLoading ? t("aiCreditsProcessingPurchase") : t("aiCreditsBuyNow")}
                    </Text>
                  </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.workoutMeta, { color: theme.muted }]}>{t("aiCreditsPurchaseSoon")}</Text>
          )}
        </View>

        <View style={styles.fieldGroup}>
          <View style={styles.aiCreditsSectionHeader}>
            <Text style={[styles.creatorSectionTitle, { color: theme.text }]}>{t("aiCreditsRecentTransactions")}</Text>
            {aiCreditTransactions.length > 3 && !showAllAiCreditTransactions ? (
              <Pressable accessibilityRole="button" onPress={() => setShowAllAiCreditTransactions(true)}>
                <Text style={[styles.aiCreditsViewAllText, { color: theme.primary }]}>{t("aiCreditsViewAll")}</Text>
              </Pressable>
            ) : null}
          </View>
          {recentTransactions.length ? (
            <View style={[styles.aiCreditsTransactionsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              {recentTransactions.map((transaction, index) => (
                <View
                  key={transaction.id}
                  style={[
                    styles.aiCreditsTransactionRow,
                    { borderBottomColor: theme.border },
                    index === recentTransactions.length - 1 ? styles.aiCreditsTransactionRowLast : null
                  ]}
                >
                  <View style={[styles.aiCreditsTransactionIcon, { backgroundColor: theme.primary }]}>
                    <Ionicons name="sparkles-outline" size={17} color={theme.white} />
                  </View>
                  <View style={styles.workoutInfo}>
                    <Text style={[styles.workoutName, { color: theme.text }]}>
                      {formatAiCreditTransactionTitle(transaction)}
                    </Text>
                    <Text style={[styles.workoutMeta, { color: theme.muted }]}>
                      {formatAiCreditTransactionDate(transaction.createdAt)}
                    </Text>
                  </View>
                  <Text style={[styles.workoutName, { color: transaction.amount < 0 ? theme.danger : theme.primary }]}>
                    {formatAiCreditAmount(transaction.amount)}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.aiCreditsTransactionsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.workoutMeta, { color: theme.muted }]}>{t("aiCreditsNoTransactions")}</Text>
            </View>
          )}
        </View>

        <View style={[styles.aiCreditsInfoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.creatorSectionTitle, { color: theme.text }]}>{t("aiCreditsInfo")}</Text>
          {[t("aiCreditsInfoAccount"), t("aiCreditsInfoUsage"), t("aiCreditsInfoRefund")].map((item) => (
            <View key={item} style={styles.aiCreditsInfoRow}>
              <View style={[styles.aiCreditsInfoBullet, { backgroundColor: theme.primary }]} />
              <Text style={[styles.workoutMeta, styles.aiCreditsInfoText, { color: theme.muted }]}>{item}</Text>
            </View>
          ))}
          {canRestoreAiCreditPurchases ? (
            <Pressable
              accessibilityRole="button"
              disabled={isAiCreditPurchaseLoading || !aiCreditPacks.length}
              style={styles.aiCreditsRestoreLink}
              onPress={() => void restorePendingAiCreditPurchases()}
            >
              <Ionicons name="reload-outline" size={16} color={theme.primary} />
              <Text style={[styles.aiCreditsViewAllText, { color: theme.primary }]}>{t("aiCreditsRestorePurchases")}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  function renderFavoriteExercises() {
    const favoriteCatalogExercises = getFavoriteCatalogExercises(favoriteExercises);
    const searchPhrase = favoriteExercisesSearch.trim().toLowerCase();
    const filteredFavorites = favoriteCatalogExercises
      .filter((exercise) => {
        if (!searchPhrase) {
          return true;
        }

        return (
          exercise.name.toLowerCase().includes(searchPhrase) ||
          exercise.polishName.toLowerCase().includes(searchPhrase) ||
          exercise.garminName.toLowerCase().includes(searchPhrase)
        );
      })
      .sort((first, second) => getExerciseName(first).localeCompare(getExerciseName(second), language));

    return (
      <LegalPage
        icon="star-outline"
        title={t("favoriteExercises")}
        theme={theme}
        backLabel={t("backToSettings")}
        onBack={() => setActiveScreen("settings")}
      >
        <View style={styles.fieldGroup}>
          <Text style={[styles.workoutMeta, { color: theme.muted }]}>
            {favoriteExercisesSyncStatus === "synced"
              ? t("favoriteExercisesSynced")
              : favoriteExercisesSyncStatus === "failed"
                ? t("favoriteExercisesSyncFailed")
                : t("favoriteExercisesSavedLocally")}
          </Text>
          <Input
            style={[
              styles.exercisePickerSearchInput,
              { backgroundColor: theme.control, borderColor: theme.border }
            ]}
          >
            <InputField
              placeholder={t("searchExercise")}
              placeholderTextColor={theme.muted}
              style={[styles.exercisePickerSearchText, { color: theme.inputText }]}
              value={favoriteExercisesSearch}
              onChangeText={setFavoriteExercisesSearch}
            />
          </Input>
        </View>

        {filteredFavorites.length ? (
          <View style={styles.favoriteExerciseList}>
            {filteredFavorites.map((exercise) => (
              <View
                key={exercise.id}
                style={[styles.favoriteExerciseRow, { borderColor: theme.border }]}
              >
                <View style={styles.favoriteExerciseInfo}>
                  <Text style={[styles.workoutName, { color: theme.text }]} numberOfLines={2}>
                    {getExerciseName(exercise)}
                  </Text>
                  <Text style={[styles.workoutMeta, { color: theme.muted }]} numberOfLines={3}>
                    {getExerciseMeta(exercise)}
                  </Text>
                  <Text style={[styles.workoutMeta, { color: theme.muted }]} numberOfLines={1}>
                    {exercise.garminName}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  style={styles.favoriteExerciseRemoveButton}
                  onPress={() => setExerciseFavorite(exercise.id, false)}
                >
                  <Ionicons name="star" size={25} color={theme.primary} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <View style={[styles.emptyStatePanel, { backgroundColor: theme.secondaryBand }]}>
            <Ionicons name="star-outline" size={28} color={theme.primary} />
            <Text style={[styles.emptyStateTitle, { color: theme.text }]}>
              {t("favoriteExercisesEmptyTitle")}
            </Text>
            <Text style={[styles.emptyStateCopy, { color: theme.muted }]}>
              {t("favoriteExercisesEmptyCopy")}
            </Text>
          </View>
        )}
      </LegalPage>
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
            user={user}
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
    const achievementPercent = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;
    const displayNameValue = getProfileDisplayName(user, t("profileUser"));
    const emailValue = getProfileDisplayEmail(user);

    const openChangePassword = () => {
      setAuthError("");
      setAuthMessage("");
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
      setIsCurrentPasswordVisible(false);
      setIsNewPasswordVisible(false);
      setIsRepeatPasswordVisible(false);
      setActiveScreen("changePassword");
    };

    const openActiveSessions = () => {
      setAuthError("");
      setAuthMessage("");
      setActiveScreen("activeSessions");
    };

    const quickActions: Array<{ icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }> = [
      {
        icon: "server-outline",
        label: t("aiCredits"),
        onPress: () => {
          if (!areOnlineFeaturesAvailable) {
            showOnlineFeatureUnavailableDialog();
            return;
          }

          setActiveScreen("aiCredits");
          void fetchAiCredits(user);
        }
      },
      {
        icon: "lock-closed-outline",
        label: t("changePassword"),
        onPress: openChangePassword
      },
      {
        icon: "calendar-outline",
        label: t("profileSessions"),
        onPress: openActiveSessions
      },
      {
        icon: "warning-outline",
        label: t("bugReport"),
        onPress: () => setActiveScreen("bugReport")
      }
    ];

    return (
      <View style={styles.profileScreen}>
        <View style={[styles.profileDashboardCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.profileDashboardAvatarFrame, { backgroundColor: theme.secondaryBand }]}>
            {userAvatarSource ? (
              <Image
                resizeMode="cover"
                source={userAvatarSource}
                style={styles.profileDashboardAvatarImage}
              />
            ) : (
              <Ionicons name="person" size={52} color={theme.primary} />
            )}
          </View>
          <View style={styles.profileDashboardInfo}>
            <Text style={[styles.profileDashboardName, { color: theme.text }]} numberOfLines={2}>
              {displayNameValue}
            </Text>
            <Text style={[styles.profileDashboardEmail, { color: theme.muted }]} numberOfLines={2}>
              {emailValue}
            </Text>
            <View style={styles.profileDashboardAvatarActions}>
              <AppButton
                disabled={isAvatarSubmitting}
                icon="image-outline"
                style={styles.profileDashboardAvatarButton}
                textStyle={styles.profileDashboardAvatarButtonText}
                theme={theme}
                variant="outline"
                onPress={changeUserAvatar}
              >
                {t("changeAvatar")}
              </AppButton>
              {user.avatarUrl ? (
                <AppButton
                  disabled={isAvatarSubmitting}
                  icon="trash-outline"
                  style={styles.profileDashboardAvatarButton}
                  textStyle={styles.profileDashboardAvatarButtonText}
                  theme={theme}
                  variant="outline"
                  onPress={removeUserAvatar}
                >
                  {t("removeAvatar")}
                </AppButton>
              ) : null}
            </View>
            {avatarMessage ? (
              <Text style={[styles.workoutMeta, { color: avatarMessage === t("avatarUpdated") || avatarMessage === t("avatarRemoved") ? theme.primary : theme.danger }]}>
                {avatarMessage}
              </Text>
            ) : null}
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          style={[styles.achievementSummaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={() => setActiveScreen("achievements")}
        >
          <View style={[styles.achievementIcon, { backgroundColor: theme.secondaryBand }]}>
            <Ionicons name="trophy-outline" size={24} color={theme.primary} />
          </View>
          <View style={styles.achievementCopy}>
            <View style={styles.achievementTitleRow}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{t("achievements")}</Text>
              <Text style={[styles.achievementCount, { color: theme.primary }]}>
                {unlockedCount}/{totalCount}
              </Text>
            </View>
            {renderAchievementProgressBar({
              current: unlockedCount,
              definition: achievementDefinitions[0],
              percent: achievementPercent,
              target: totalCount,
              unlocked: false
            })}
            <Text style={[styles.workoutMeta, { color: theme.muted }]}>
              {latestUnlockedAchievement
                ? `${t("achievementsLast")}: ${getAchievementTitle(latestUnlockedAchievement)}`
                : t("achievementsNothingUnlocked")}
            </Text>
            <View style={styles.profileAchievementLinkRow}>
              <Text style={[styles.achievementLink, { color: theme.primary }]}>{t("achievementsViewAll")}</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.primary} />
            </View>
          </View>
        </Pressable>

        <View style={styles.profileQuickActionsSection}>
          <Text style={[styles.profileSectionHeading, { color: theme.text }]}>{t("quickActions")}</Text>
          <View style={styles.profileQuickActionsGrid}>
            {quickActions.map((action) => (
              <Pressable
                key={action.label}
                accessibilityRole="button"
                style={[styles.profileQuickActionCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={action.onPress}
              >
                <View style={[styles.profileQuickActionIcon, { backgroundColor: theme.secondaryBand }]}>
                  <Ionicons name={action.icon} size={22} color={theme.primary} />
                </View>
                <Text style={[styles.profileQuickActionLabel, { color: theme.text }]} numberOfLines={2}>
                  {action.label}
                </Text>
                <Ionicons name="chevron-forward" size={20} color={theme.text} />
              </Pressable>
            ))}
          </View>
        </View>

        <View style={[styles.profileAccountCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.profileSectionHeading, { color: theme.text }]}>{t("account")}</Text>
          <Pressable
            accessibilityRole="button"
            style={[styles.profileAccountRow, { borderBottomColor: theme.border }]}
            onPress={() => setActiveScreen("accountDetails")}
          >
            <Ionicons name="person-circle-outline" size={24} color={theme.muted} />
            <Text style={[styles.profileAccountRowText, { color: theme.text }]}>{t("accountDetails")}</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.text} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={[styles.profileAccountRow, { borderBottomColor: theme.border }]}
            onPress={() => setActiveScreen("activeSessions")}
          >
            <Ionicons name="phone-portrait-outline" size={24} color={theme.muted} />
            <Text style={[styles.profileAccountRowText, { color: theme.text }]}>{t("activeSessions")}</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.text} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={[styles.profileAccountRow, { borderBottomColor: theme.border }]}
            onPress={() => {
              if (!user) {
                showInfoDialog(t("profile"), t("deleteAccountLoginRequired"));
                return;
              }

              setDeleteAccountConfirmation("");
              setDeleteAccountError("");
              setActiveScreen("deleteAccount");
            }}
          >
            <Ionicons name="trash-outline" size={24} color={theme.danger} />
            <Text style={[styles.profileAccountRowText, { color: theme.danger }]}>{t("deleteAccount")}</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.danger} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={[styles.profileAccountRow, styles.profileLogoutRow]}
            onPress={logOut}
          >
            <Ionicons name="log-out-outline" size={24} color={theme.danger} />
            <Text style={[styles.profileAccountRowText, { color: theme.danger }]}>{t("logout")}</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.danger} />
          </Pressable>
        </View>
      </View>
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
    const accountRowIcons: Record<(typeof accountRows)[number]["key"], keyof typeof Ionicons.glyphMap> = {
      accountId: "finger-print-outline",
      createdOn: "calendar-outline",
      email: "mail-outline",
      name: "person-outline"
    };

    return (
      <View style={styles.profileScreen}>
        <View style={[styles.profileAccountCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.accountDetailsHeader}>
            <View style={[styles.profileQuickActionIcon, { backgroundColor: theme.secondaryBand }]}>
              <Ionicons name="person-circle-outline" size={24} color={theme.primary} />
            </View>
            <View style={styles.workoutInfo}>
              <Text style={[styles.profileSectionHeading, { color: theme.text }]}>{t("accountDetails")}</Text>
              <Text style={[styles.workoutMeta, { color: theme.muted }]}>{t("accountDetailsIntro")}</Text>
            </View>
          </View>

          <View style={styles.accountDetailsList}>
            {accountRows.map((row, index) => (
              <View
                key={row.label}
                style={[
                  styles.accountDetailsRow,
                  { borderBottomColor: theme.border },
                  index === accountRows.length - 1 ? styles.accountDetailsRowLast : null
                ]}
              >
                <View style={[styles.accountDetailsIcon, { backgroundColor: theme.secondaryBand }]}>
                  <Ionicons name={accountRowIcons[row.key]} size={19} color={theme.primary} />
                </View>
                <View style={styles.workoutInfo}>
                  <Text style={[styles.accountDetailsLabel, { color: theme.muted }]}>{row.label}</Text>
                  <Text style={[styles.accountDetailsValue, { color: theme.text }]} selectable>
                    {row.value}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  }

  function renderDeleteAccount() {
    if (!user) {
      return renderProfile();
    }

    const confirmationPhrase = getDeleteAccountConfirmationPhrase(language);
    const canDelete = isDeleteAccountConfirmationValid(deleteAccountConfirmation, language);

    return (
      <View style={styles.profileScreen}>
        <View style={[styles.profileAccountCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.accountDetailsHeader}>
            <View style={[styles.profileQuickActionIcon, { backgroundColor: theme.secondaryBand }]}>
              <Ionicons name="trash-outline" size={24} color={theme.danger} />
            </View>
            <View style={styles.workoutInfo}>
              <Text style={[styles.profileSectionHeading, { color: theme.text }]}>{t("deleteAccount")}</Text>
              <Text style={[styles.workoutMeta, { color: theme.danger }]}>{t("deleteAccountIrreversible")}</Text>
            </View>
          </View>

          <Text style={[styles.workoutMeta, styles.deleteAccountCopy, { color: theme.muted }]}>
            {t("deleteAccountCopy")}
          </Text>
          <Text style={[styles.workoutMeta, styles.deleteAccountCopy, { color: theme.text }]}>
            {t("deleteAccountTypeToConfirm")}
          </Text>
          <AppInput
            autoCapitalize="characters"
            editable={!isDeletingAccount}
            placeholder={t("deleteAccountInputPlaceholder")}
            style={[
              {
                borderColor: canDelete || !deleteAccountConfirmation ? theme.border : theme.danger
              }
            ]}
            theme={theme}
            value={deleteAccountConfirmation}
            onChangeText={setDeleteAccountConfirmation}
          />
          {deleteAccountError ? (
            <Text style={[styles.authError, { color: theme.danger }]}>{deleteAccountError}</Text>
          ) : null}
          <View style={styles.deleteAccountActions}>
            <AppButton
              disabled={isDeletingAccount}
              icon="close-outline"
              style={styles.deleteAccountActionButton}
              theme={theme}
              variant="outline"
              onPress={() => {
                setDeleteAccountConfirmation("");
                setDeleteAccountError("");
                setActiveScreen("profile");
              }}
            >
              {t("cancel")}
            </AppButton>
            <AppButton
              disabled={!canDelete || isDeletingAccount}
              icon="trash-outline"
              style={[styles.deleteAccountActionButton, { backgroundColor: theme.danger }]}
              textStyle={{ color: theme.white }}
              theme={theme}
              onPress={deleteAccountPermanently}
            >
              {isDeletingAccount ? `${t("deleteAccount")}...` : t("deleteAccountPermanent")}
            </AppButton>
          </View>
          <Text style={[styles.workoutMeta, { color: theme.muted }]}>
            {language === "pl" ? `Wymagana fraza: ${confirmationPhrase}` : `Required phrase: ${confirmationPhrase}`}
          </Text>
        </View>
      </View>
    );
  }

  function renderAchievements() {
    const filters: Array<{ label: string; value: AchievementFilter }> = [
      { label: t("achievementsAll"), value: "all" },
      { label: t("achievementsUnlocked"), value: "unlocked" },
      { label: t("achievementsLocked"), value: "locked" }
    ];
    const filteredAchievements = achievementProgress.filter((item) => {
      if (achievementFilter === "unlocked") {
        return item.unlocked;
      }

      if (achievementFilter === "locked") {
        return !item.unlocked;
      }

      return true;
    }).sort((left, right) => {
      if (achievementFilter === "all" && left.unlocked !== right.unlocked) {
        return left.unlocked ? -1 : 1;
      }

      if (left.unlocked && right.unlocked) {
        return Date.parse(right.unlockedAt ?? "") - Date.parse(left.unlockedAt ?? "");
      }

      return left.definition.sortOrder - right.definition.sortOrder;
    });

    return (
      <View style={styles.profileScreen}>
        <View style={[styles.legalPanel, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.legalContent}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {unlockedAchievementProgress.length}/{achievementProgress.length} {t("achievementsUnlocked").toLowerCase()}
            </Text>
            {renderAchievementProgressBar({
              current: unlockedAchievementProgress.length,
              definition: achievementDefinitions[0],
              percent: achievementProgress.length ? (unlockedAchievementProgress.length / achievementProgress.length) * 100 : 0,
              target: achievementProgress.length,
              unlocked: false
            })}
          </View>
        </View>

        <View style={styles.segmentedControl}>
          {filters.map((filter) => {
            const selected = achievementFilter === filter.value;
            return (
              <Pressable
                key={filter.value}
                accessibilityRole="button"
                style={[
                  styles.segmentButton,
                  { backgroundColor: selected ? theme.primary : theme.segment }
                ]}
                onPress={() => setAchievementFilter(filter.value)}
              >
                <Text style={[styles.segmentButtonText, { color: selected ? theme.white : theme.text }]}>
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.achievementList}>
          {filteredAchievements.map(renderAchievementCard)}
        </View>
      </View>
    );
  }

  function renderForgotPassword() {
    return (
      <LegalPage
        icon="key-outline"
        title={t("resetPassword")}
        theme={theme}
        backLabel={t("backToStart")}
        onBack={() => setActiveScreen("profile")}
      >
        <Text style={[styles.legalText, { color: theme.muted }]}>{t("resetPasswordRequestIntro")}</Text>
        <View style={styles.bugReportForm}>
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Email</Text>
            <AppInput
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="email"
              theme={theme}
              value={resetEmail}
              onChangeText={setResetEmail}
            />
          </View>
          <AppButton disabled={isAuthActionSubmitting} icon="mail-outline" theme={theme} onPress={() => void requestPasswordReset()}>
            {t("sendResetInstructions")}
          </AppButton>
          <View style={[styles.legalDivider, { backgroundColor: theme.border }]} />
          <Text style={[styles.legalText, { color: theme.muted }]}>{t("resetPasswordConfirmIntro")}</Text>
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.text }]}>{t("resetToken")}</Text>
            <AppInput theme={theme} value={resetToken} onChangeText={setResetToken} />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.text }]}>{t("newPassword")}</Text>
            <PasswordInput
              isVisible={isNewPasswordVisible}
              placeholder={t("newPassword")}
              setIsVisible={setIsNewPasswordVisible}
              theme={theme}
              value={newPassword}
              onChangeText={setNewPassword}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.text }]}>{t("repeatNewPassword")}</Text>
            <PasswordInput
              isVisible={isRepeatPasswordVisible}
              placeholder={t("repeatNewPassword")}
              setIsVisible={setIsRepeatPasswordVisible}
              theme={theme}
              value={newPasswordConfirm}
              onChangeText={setNewPasswordConfirm}
            />
          </View>
          {authError ? <Text style={[styles.authError, { color: theme.danger }]}>{authError}</Text> : null}
          {authMessage ? <Text style={[styles.legalText, { color: theme.primary }]}>{authMessage}</Text> : null}
          <AppButton disabled={isAuthActionSubmitting} icon="checkmark-outline" theme={theme} onPress={() => void confirmPasswordReset()}>
            {t("setNewPassword")}
          </AppButton>
        </View>
      </LegalPage>
    );
  }

  function renderChangePassword() {
    return (
      <LegalPage
        icon="key-outline"
        title={t("changePassword")}
        theme={theme}
        backLabel={t("profile")}
        onBack={() => setActiveScreen("profile")}
      >
        <View style={styles.bugReportForm}>
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.text }]}>{t("currentPassword")}</Text>
            <PasswordInput
              isVisible={isCurrentPasswordVisible}
              placeholder={t("currentPassword")}
              setIsVisible={setIsCurrentPasswordVisible}
              theme={theme}
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.text }]}>{t("newPassword")}</Text>
            <PasswordInput
              isVisible={isNewPasswordVisible}
              placeholder={t("newPassword")}
              setIsVisible={setIsNewPasswordVisible}
              theme={theme}
              value={newPassword}
              onChangeText={setNewPassword}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.text }]}>{t("repeatNewPassword")}</Text>
            <PasswordInput
              isVisible={isRepeatPasswordVisible}
              placeholder={t("repeatNewPassword")}
              setIsVisible={setIsRepeatPasswordVisible}
              theme={theme}
              value={newPasswordConfirm}
              onChangeText={setNewPasswordConfirm}
            />
          </View>
          {authError ? <Text style={[styles.authError, { color: theme.danger }]}>{authError}</Text> : null}
          {authMessage ? <Text style={[styles.legalText, { color: theme.primary }]}>{authMessage}</Text> : null}
          <AppButton disabled={isAuthActionSubmitting} icon="save-outline" theme={theme} onPress={() => void changePassword()}>
            {t("save")}
          </AppButton>
        </View>
      </LegalPage>
    );
  }

  function renderActiveSessions() {
    return (
      <LegalPage
        icon="phone-portrait-outline"
        title={t("activeSessions")}
        theme={theme}
        backLabel={t("profile")}
        onBack={() => setActiveScreen("profile")}
      >
        <View style={styles.sessionHistoryList}>
          {activeAuthSessions.length === 0 ? (
            <Text style={[styles.emptyBuilderCopy, { color: theme.muted }]}>{t("noActiveSessions")}</Text>
          ) : null}
          {activeAuthSessions.map((session) => (
            <View key={session.id} style={[styles.sessionEntryCard, { backgroundColor: theme.control, borderColor: theme.border }]}>
              <Text style={[styles.workoutName, { color: theme.text }]}>
                {session.deviceName && session.deviceName.toLowerCase() !== "unknown device"
                  ? session.deviceName
                  : session.isCurrent
                    ? getAuthDeviceName()
                    : t("unknownDevice")} {session.isCurrent ? `· ${t("thisSession")}` : ""}
              </Text>
              <Text style={[styles.workoutMeta, { color: theme.muted }]}>
                {t("lastActivity")}: {formatDateTime(session.lastSeenAt)}
              </Text>
              <Text style={[styles.workoutMeta, { color: theme.muted }]}>
                {t("expires")}: {formatDateTime(session.expiresAt)}
              </Text>
              <AppButton icon="log-out-outline" theme={theme} variant="outline" onPress={() => void revokeAuthSession(session.id)}>
                {t("signOutThisSession")}
              </AppButton>
            </View>
          ))}
        </View>
        {authError ? <Text style={[styles.authError, { color: theme.danger }]}>{authError}</Text> : null}
        {authMessage ? <Text style={[styles.legalText, { color: theme.primary }]}>{authMessage}</Text> : null}
        <AppButton icon="log-out-outline" theme={theme} onPress={logoutAllAuthSessions}>
          {t("signOutAllSessions")}
        </AppButton>
      </LegalPage>
    );
  }

  function closeSettingsSheet() {
    setActiveSettingsSheet(null);
  }

  function renderSettingsSheetContent() {
    if (activeSettingsSheet === "language") {
      return (
        <>
          <Text style={[styles.bottomSheetTitle, { color: theme.text }]}>{t("appLanguage")}</Text>
          <View style={[styles.bottomSheetOptionGroup, { borderColor: theme.border }]}>
            {languageOptions.map((option, index) => {
              const selected = pendingLanguage === option.value;

              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[
                    styles.bottomSheetOptionRow,
                    {
                      backgroundColor: selected ? theme.secondaryBand : theme.card,
                      borderBottomColor: theme.border,
                      borderBottomWidth: index === languageOptions.length - 1 ? 0 : 1
                    }
                  ]}
                  onPress={() => setPendingLanguage(option.value)}
                >
                  <Text style={[styles.bottomSheetOptionText, { color: theme.text }]}>
                    {option.label}
                  </Text>
                  {selected ? (
                    <Ionicons name="checkmark-circle" size={22} color={theme.primary} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
          <AppButton
            icon="save-outline"
            style={styles.bottomSheetButton}
            theme={theme}
            onPress={() => {
              setLanguage(pendingLanguage);
              closeSettingsSheet();
            }}
          >
            {t("save")}
          </AppButton>
        </>
      );
    }

    if (activeSettingsSheet === "defaultSetCount") {
      return (
        <>
          <Text style={[styles.bottomSheetTitle, { color: theme.text }]}>{t("defaultSetCount")}</Text>
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.muted }]}>
              {t("defaultSetCountHelp")}
            </Text>
            <AppInput
              keyboardType="number-pad"
              placeholder="np. 3"
              theme={theme}
              value={pendingDefaultSetCount}
              onChangeText={(value) => setPendingDefaultSetCount(value.replace(/\D/g, "").slice(0, 2))}
            />
          </View>
          <AppButton
            icon="save-outline"
            style={styles.bottomSheetButton}
            theme={theme}
            onPress={() => {
              setDefaultSetCount(pendingDefaultSetCount);
              closeSettingsSheet();
            }}
          >
            {t("save")}
          </AppButton>
        </>
      );
    }

    if (activeSettingsSheet === "defaultWeight") {
      return (
        <>
          <Text style={[styles.bottomSheetTitle, { color: theme.text }]}>{t("defaultWeight")}</Text>
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.muted }]}>
              {t("defaultWeightHelp")}
            </Text>
            <SuffixedInput
              keyboardType="decimal-pad"
              placeholder="0"
              suffix="kg"
              theme={theme}
              value={pendingDefaultWeight}
              onChangeText={(value) => {
                const normalized = value.replace(",", ".").replace(/[^0-9.]/g, "");
                const parts = normalized.split(".");
                setPendingDefaultWeight(parts.length > 1 ? `${parts[0]}.${parts.slice(1).join("")}` : normalized);
              }}
            />
          </View>
          <AppButton
            icon="save-outline"
            style={styles.bottomSheetButton}
            theme={theme}
            onPress={() => {
              setDefaultWeight(pendingDefaultWeight);
              closeSettingsSheet();
            }}
          >
            {t("save")}
          </AppButton>
        </>
      );
    }

    if (activeSettingsSheet === "defaultStageType") {
      const options: Array<{ label: string; value: StageType | "" }> = [
        { label: t("toChoose"), value: "" },
        ...getStageTypeOptions(t)
      ];

      return (
        <>
          <Text style={[styles.bottomSheetTitle, { color: theme.text }]}>{t("defaultStageType")}</Text>
          <View style={[styles.bottomSheetOptionGroup, { borderColor: theme.border }]}>
            {options.map((option, index) => {
              const selected = pendingDefaultStageType === option.value;

              return (
                <Pressable
                  key={option.value || "empty"}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[
                    styles.bottomSheetOptionRow,
                    {
                      backgroundColor: selected ? theme.secondaryBand : theme.card,
                      borderBottomColor: theme.border,
                      borderBottomWidth: index === options.length - 1 ? 0 : 1
                    }
                  ]}
                  onPress={() => setPendingDefaultStageType(option.value)}
                >
                  <Text style={[styles.bottomSheetOptionText, { color: theme.text }]}>
                    {option.label}
                  </Text>
                  {selected ? (
                    <Ionicons name="checkmark-circle" size={22} color={theme.primary} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
          <AppButton
            icon="save-outline"
            style={styles.bottomSheetButton}
            theme={theme}
            onPress={() => {
              setDefaultStageType(pendingDefaultStageType);
              closeSettingsSheet();
            }}
          >
            {t("save")}
          </AppButton>
        </>
      );
    }

    if (activeSettingsSheet === "defaultWorkoutExecutionMode") {
      const options = getWorkoutExecutionModeOptions(t);

      return (
        <>
          <Text style={[styles.bottomSheetTitle, { color: theme.text }]}>{t("defaultWorkoutExecutionMode")}</Text>
          <View style={[styles.bottomSheetOptionGroup, { borderColor: theme.border }]}>
            {options.map((option, index) => {
              const selected = pendingDefaultWorkoutExecutionMode === option.value;

              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[
                    styles.bottomSheetOptionRow,
                    {
                      backgroundColor: selected ? theme.secondaryBand : theme.card,
                      borderBottomColor: theme.border,
                      borderBottomWidth: index === options.length - 1 ? 0 : 1
                    }
                  ]}
                  onPress={() => setPendingDefaultWorkoutExecutionMode(option.value)}
                >
                  <Text style={[styles.bottomSheetOptionText, { color: theme.text }]}>
                    {option.label}
                  </Text>
                  {selected ? (
                    <Ionicons name="checkmark-circle" size={22} color={theme.primary} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
          <AppButton
            icon="save-outline"
            style={styles.bottomSheetButton}
            theme={theme}
            onPress={() => {
              setDefaultWorkoutExecutionMode(pendingDefaultWorkoutExecutionMode);
              closeSettingsSheet();
            }}
          >
            {t("save")}
          </AppButton>
        </>
      );
    }

    if (activeSettingsSheet === "workoutReminderDay" && pendingWorkoutReminderDay) {
      const [selectedHour = "18", selectedMinute = "00"] = pendingWorkoutReminderDay.time.split(":");
      const hourOptions = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
      const minuteOptions = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, "0"));
      const dayLabel = getReminderDayOptions(t)
        .find((day) => getReminderWeekdayFromNumber(day.value) === pendingWorkoutReminderDay.day)?.label ?? t("monday");

      return (
        <>
          <Text style={[styles.bottomSheetTitle, { color: theme.text }]}>
            {t("reminderSingular")} — {dayLabel}
          </Text>
          <Text style={[styles.settingsOptionLabel, { color: theme.text }]}>{t("reminderTime")}</Text>
          <View style={styles.timePickerRow}>
            <View style={[styles.timePickerColumn, { borderColor: theme.border }]}>
              <ScrollView style={styles.timePickerScroll} nestedScrollEnabled>
                {hourOptions.map((hour) => {
                  const selected = selectedHour === hour;

                  return (
                    <Pressable
                      key={hour}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      style={[
                        styles.timePickerOption,
                        { backgroundColor: selected ? theme.secondaryBand : theme.card }
                      ]}
                      onPress={() => updatePendingWorkoutReminderDay({ time: `${hour}:${selectedMinute}` })}
                    >
                      <Text style={[styles.bottomSheetOptionText, { color: theme.text }]}>{hour}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
            <View style={[styles.timePickerColumn, { borderColor: theme.border }]}>
              <ScrollView style={styles.timePickerScroll} nestedScrollEnabled>
                {minuteOptions.map((minute) => {
                  const selected = selectedMinute === minute;

                  return (
                    <Pressable
                      key={minute}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      style={[
                        styles.timePickerOption,
                        { backgroundColor: selected ? theme.secondaryBand : theme.card }
                      ]}
                      onPress={() => updatePendingWorkoutReminderDay({ time: `${selectedHour}:${minute}` })}
                    >
                      <Text style={[styles.bottomSheetOptionText, { color: theme.text }]}>{minute}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </View>
          <AppButton
            icon="save-outline"
            style={styles.bottomSheetButton}
            theme={theme}
            onPress={() => {
              updateWorkoutReminderSettings({
                ...updateReminderDaySchedule(workoutReminders, pendingWorkoutReminderDay.day, {
                  enabled: pendingWorkoutReminderDay.enabled,
                  time: pendingWorkoutReminderDay.time
                })
              });
              setPendingWorkoutReminderDay(null);
              closeSettingsSheet();
            }}
          >
            {t("save")}
          </AppButton>
          <AppButton
            icon="close-outline"
            style={styles.bottomSheetButton}
            theme={theme}
            variant="outline"
            onPress={() => {
              setPendingWorkoutReminderDay(null);
              closeSettingsSheet();
            }}
          >
            {t("cancel")}
          </AppButton>
        </>
      );
    }

    return null;
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

  function getSessionEntryPreviewStep(session: WorkoutSession, entry: WorkoutSessionEntry): WorkoutStep {
    const sourceStep = session.planSnapshot.steps.find(
      (step) => step.kind === "exercise" && step.id === entry.sourceElementId
    );

    if (sourceStep) {
      return sourceStep;
    }

    return createStep({
      exerciseId: entry.exerciseId ?? "",
      exerciseName: entry.exerciseName ?? "",
      goalType: (entry.plannedTargetType as GoalType | "") || "",
      id: entry.sourceElementId ?? entry.id,
      kind: "exercise",
      loadKg: entry.plannedWeight ?? "",
      stageType: (entry.type as StageType | "") || "",
      targetValue: entry.plannedTarget ?? ""
    });
  }

  function getSessionEntrySetTarget(entry: WorkoutSessionEntry, setCount = "1") {
    const previewStep = createStep({
      exerciseName: entry.exerciseName ?? "",
      goalType: (entry.plannedTargetType as GoalType | "") || "",
      kind: "exercise",
      loadKg: entry.plannedWeight ?? "",
      stageType: (entry.type as StageType | "") || "",
      targetValue: entry.plannedTarget ?? "",
      setCount
    });

    return formatExerciseSetTarget(previewStep);
  }

  function getGuidedEntryGroups(session: WorkoutSession) {
    const exerciseEntries = session.entries.filter((entry) => entry.type !== "rest");
    const sourceEntries = exerciseEntries.length ? exerciseEntries : session.entries;
    const groups: Array<{
      entries: WorkoutSessionEntry[];
      firstIndex: number;
      key: string;
      restEntry?: WorkoutSessionEntry;
    }> = [];
    const grouped = new Map<string, { entries: WorkoutSessionEntry[]; firstIndex: number; key: string }>();

    sourceEntries.forEach((entry) => {
      const key = [entry.sourceStageId, entry.sourceSeriesId, entry.sourceElementId ?? entry.id].filter(Boolean).join(":");
      const firstIndex = session.entries.findIndex((item) => item.id === entry.id);
      const existing = grouped.get(key);

      if (existing) {
        existing.entries.push(entry);
        return;
      }

      const group = { entries: [entry], firstIndex, key };
      grouped.set(key, group);
      groups.push(group);
    });

    return groups.map((group) => {
      const referenceEntry = group.entries[0];
      const restEntry = session.entries.find(
        (entry) =>
          entry.type === "rest" &&
          entry.sourceSeriesId === referenceEntry.sourceSeriesId &&
          entry.elementIndex > referenceEntry.elementIndex
      );

      return {
        ...group,
        restEntry
      };
    });
  }

  function getGuidedGroupIndex(
    groups: Array<{ entries: WorkoutSessionEntry[]; firstIndex: number }>,
    entryIndex: number,
    currentEntry?: WorkoutSessionEntry
  ) {
    const directIndex = groups.findIndex((group) => group.entries.some((entry) => entry.id === currentEntry?.id));

    if (directIndex >= 0) {
      return directIndex;
    }

    const nextIndex = groups.findIndex((group) => group.firstIndex >= entryIndex);
    return nextIndex >= 0 ? nextIndex : Math.max(0, groups.length - 1);
  }

  function toggleWorkoutSessionEntryCompleted(entry: WorkoutSessionEntry) {
    if (entry.isCompleted) {
      updateWorkoutSessionEntry(entry.id, {
        actualCalories: undefined,
        actualDuration: undefined,
        actualHeartRate: undefined,
        actualReps: undefined,
        actualTarget: undefined,
        actualWeight: undefined,
        completedAt: undefined,
        isCompleted: false,
        notes: undefined
      });
      return;
    }

    updateWorkoutSessionEntry(entry.id, {
      completedAt: new Date().toISOString(),
      isCompleted: true
    });
  }

  function updateWorkoutSessionEntryTableValue(entry: WorkoutSessionEntry, patch: Pick<Partial<WorkoutSessionEntry>, "actualReps" | "actualWeight">) {
    const actualReps = patch.actualReps ?? entry.actualReps ?? "";
    const actualWeight = patch.actualWeight ?? entry.actualWeight ?? "";
    const hasAnyValue = Boolean(actualReps.trim() || actualWeight.trim());

    updateWorkoutSessionEntry(entry.id, {
      ...patch,
      completedAt: hasAnyValue ? entry.completedAt ?? new Date().toISOString() : undefined,
      isCompleted: hasAnyValue
    });
  }

  function getWorkoutSessionEntryProgressKey(entry?: WorkoutSessionEntry) {
    if (!entry) {
      return null;
    }

    if (entry.exerciseId?.trim()) {
      return `id:${entry.exerciseId.trim().toLowerCase()}`;
    }

    if (entry.exerciseName?.trim()) {
      return `name:${entry.exerciseName.trim().toLowerCase()}`;
    }

    return null;
  }

  function getPreviousExerciseValues(entries: WorkoutSessionEntry[]) {
    const referenceEntry = entries.find((entry) => entry.exerciseId?.trim() || entry.exerciseName?.trim());
    const progressKey = getWorkoutSessionEntryProgressKey(referenceEntry);
    const summary = progressKey ? getExerciseProgressSummary(visibleWorkoutSessions, progressKey) : null;
    const previousEntry = summary?.lastResult.entry;

    return {
      reps: previousEntry?.actualReps?.trim() || "",
      weight: previousEntry?.actualWeight?.trim() || ""
    };
  }

  function applyPreviousExerciseValue(
    entries: WorkoutSessionEntry[],
    field: "actualReps" | "actualWeight",
    value: string
  ) {
    if (!activeWorkoutSessionId || !value.trim()) {
      return;
    }

    const entryIds = new Set(entries.map((entry) => entry.id));
    const updatedAt = new Date().toISOString();

    setWorkoutSessions((current) =>
      current.map((session) => {
        if (session.id !== activeWorkoutSessionId) {
          return session;
        }

        let hasChanged = false;
        const nextEntries = session.entries.map((entry) => {
          if (!entryIds.has(entry.id) || entry[field]?.trim()) {
            return entry;
          }

          hasChanged = true;
          const nextEntry = { ...entry, [field]: value } as WorkoutSessionEntry;
          const hasAnyValue = Boolean(nextEntry.actualReps?.trim() || nextEntry.actualWeight?.trim());

          return {
            ...nextEntry,
            completedAt: hasAnyValue ? nextEntry.completedAt ?? updatedAt : undefined,
            isCompleted: hasAnyValue
          };
        });

        return hasChanged
          ? {
              ...session,
              entries: nextEntries,
              updatedAt
            }
          : session;
      })
    );
  }

  function renderPreviousExerciseValueButtons(entries: WorkoutSessionEntry[], compact = false) {
    const previousValues = getPreviousExerciseValues(entries);

    if (!previousValues.reps && !previousValues.weight) {
      return null;
    }

    return (
      <View style={[styles.sessionQuickFillRow, compact ? styles.sessionQuickFillRowCompact : null]}>
        <View style={styles.sessionQuickFillSlot}>
          {previousValues.weight ? (
            <Pressable
              accessibilityRole="button"
              style={[styles.sessionQuickFillButton, { backgroundColor: theme.control, borderColor: theme.border }]}
              onPress={() => applyPreviousExerciseValue(entries, "actualWeight", previousValues.weight)}
            >
              <Text style={[styles.sessionQuickFillButtonText, { color: theme.primary }]}>
                {t("previousWeight")}: {previousValues.weight} kg
              </Text>
            </Pressable>
          ) : null}
        </View>
        <View style={styles.sessionQuickFillSlot}>
          {previousValues.reps ? (
            <Pressable
              accessibilityRole="button"
              style={[styles.sessionQuickFillButton, { backgroundColor: theme.control, borderColor: theme.border }]}
              onPress={() => applyPreviousExerciseValue(entries, "actualReps", previousValues.reps)}
            >
              <Text style={[styles.sessionQuickFillButtonText, { color: theme.primary }]}>
                {t("previousReps")}: {previousValues.reps}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  function renderGuidedEntryTable(entries: WorkoutSessionEntry[]) {
    return (
      <View style={[styles.guidedEntryTable, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {renderPreviousExerciseValueButtons(entries)}
        {entries.map((entry) => (
          <View key={entry.id} style={styles.guidedEntryRow}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: entry.isCompleted }}
              style={styles.guidedEntryDone}
              onPress={() => toggleWorkoutSessionEntryCompleted(entry)}
            >
              <View
                style={[
                  styles.sessionCheckbox,
                  {
                    backgroundColor: entry.isCompleted ? theme.primary : theme.control,
                    borderColor: entry.isCompleted ? theme.primary : theme.border
                  }
                ]}
              >
                {entry.isCompleted ? <Ionicons name="checkmark" size={16} color={theme.white} /> : null}
              </View>
            </Pressable>
            {entry.isCompleted ? (
              <View style={styles.guidedEntryFields}>
                <View style={styles.guidedEntryInput}>
                  <SessionValueInput
                    keyboardType="decimal-pad"
                    placeholder={t("actualWeight")}
                    suffix="kg"
                    theme={theme}
                    value={entry.actualWeight ?? ""}
                    onChangeText={(actualWeight) => updateWorkoutSessionEntry(entry.id, { actualWeight })}
                  />
                </View>
                <View style={styles.guidedEntryInput}>
                  <SessionValueInput
                    keyboardType="number-pad"
                    placeholder={t("actualReps")}
                    theme={theme}
                    value={entry.actualReps ?? ""}
                    onChangeText={(actualReps) => updateWorkoutSessionEntry(entry.id, { actualReps })}
                  />
                </View>
              </View>
            ) : null}
          </View>
        ))}
      </View>
    );
  }

  function renderInlineWorkoutTable(session: WorkoutSession) {
    const visibleSessionEntries = session.entries.filter(isWorkoutSessionEntryFillRequired);
    const groupedSessionEntries = visibleSessionEntries.reduce<
      { entries: WorkoutSessionEntry[]; key: string; previewStep: WorkoutStep; title: string }[]
    >((groups, entry) => {
      const previewStep = getSessionEntryPreviewStep(session, entry);
      const title = previewStep.exerciseName
        ? getExerciseDisplayName(previewStep.exerciseName, language)
        : formatSessionEntryTitle(entry);
      const normalizedTitle = title.trim().toLowerCase();
      const key = entry.exerciseId
        ? `id:${entry.exerciseId}`
        : entry.sourceElementId
          ? `step:${entry.sourceElementId}`
          : `name:${normalizedTitle || entry.id}`;
      const existingGroup = groups.find((group) => group.key === key);

      if (existingGroup) {
        existingGroup.entries.push(entry);
        return groups;
      }

      groups.push({
        entries: [entry],
        key,
        previewStep,
        title
      });

      return groups;
    }, []);

    if (!groupedSessionEntries.length) {
      return (
        <View style={[styles.emptyBuilder, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.emptyBuilderTitle, { color: theme.text }]}>{t("noData")}</Text>
        </View>
      );
    }

    const responsiveTableMinWidth = isLandscape
      ? Math.max(windowSize.width - insets.left - insets.right - 44, 688)
      : undefined;

    return (
      <View style={styles.inlineWorkoutTableFrame}>
        <ScrollView
          horizontal
          keyboardShouldPersistTaps="handled"
          showsHorizontalScrollIndicator
          style={styles.workoutSessionDetailTableScroll}
          contentContainerStyle={styles.workoutSessionDetailTableScrollContent}
        >
        <View
          style={[
            styles.workoutSessionDetailTable,
            styles.inlineWorkoutTable,
            responsiveTableMinWidth ? { minWidth: responsiveTableMinWidth } : null,
            { borderColor: theme.border }
          ]}
        >
          <View
            style={[
              styles.workoutSessionDetailTableHeader,
              { backgroundColor: theme.secondaryBand, borderBottomColor: theme.border }
            ]}
          >
            <View
              style={[
                styles.workoutSessionDetailHeaderCell,
                styles.inlineWorkoutExerciseCell,
                isLandscape ? styles.inlineWorkoutExerciseCellHorizontal : null,
                { borderRightColor: theme.border }
              ]}
            >
              <Text style={[styles.workoutSessionDetailHeaderText, { color: theme.primary }]}>{t("exercise")}</Text>
            </View>
            <View
              style={[
                styles.workoutSessionDetailHeaderCell,
                styles.workoutSessionDetailSetCell,
                { borderRightColor: theme.border }
              ]}
            >
              <Text style={[styles.workoutSessionDetailHeaderText, { color: theme.primary }]}>{t("set")}</Text>
            </View>
            <View style={[styles.workoutSessionDetailRepsHeader, styles.inlineWorkoutRepsHeader, { borderRightColor: theme.border }]}>
              <Text style={[styles.workoutSessionDetailHeaderText, { color: theme.primary }]}>{t("actualReps")}</Text>
              <View style={[styles.workoutSessionDetailRepsSubHeader, { borderTopColor: theme.border }]}>
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.88}
                  numberOfLines={1}
                  style={[
                    styles.workoutSessionDetailHeaderText,
                    styles.workoutSessionDetailRepsCell,
                    styles.inlineWorkoutRepsCell,
                    { color: theme.primary, borderRightColor: theme.border }
                  ]}
                >
                  {t("repsDone")}
                </Text>
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.88}
                  numberOfLines={1}
                  style={[
                    styles.workoutSessionDetailHeaderText,
                    styles.workoutSessionDetailRepsCell,
                    styles.inlineWorkoutRepsCell,
                    { color: theme.primary, borderRightWidth: 0 }
                  ]}
                >
                  {t("repsPlanned")}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.workoutSessionDetailHeaderCell,
                styles.inlineWorkoutWeightCell,
                { borderRightColor: theme.border }
              ]}
            >
              <Text style={[styles.workoutSessionDetailHeaderText, { color: theme.primary }]}>{t("weight")}</Text>
            </View>
            <View style={[styles.workoutSessionDetailHeaderCell, styles.workoutSessionDetailVolumeCell, styles.inlineWorkoutLastHeaderCell]}>
              <Text style={[styles.workoutSessionDetailHeaderText, { color: theme.primary }]}>{t("volume")}</Text>
            </View>
          </View>
          {groupedSessionEntries.map((group, groupIndex) => (
            <View
              key={group.key}
              style={[
                styles.workoutSessionDetailExerciseGroup,
                { borderBottomColor: theme.border },
                groupIndex === groupedSessionEntries.length - 1 ? styles.workoutSessionDetailExerciseGroupLast : null
              ]}
            >
              <View
                style={[
                  styles.inlineWorkoutExerciseCell,
                  isLandscape ? styles.inlineWorkoutExerciseCellHorizontal : null,
                  { borderRightColor: theme.border }
                ]}
              >
                <Pressable
                  accessibilityRole="button"
                  style={styles.inlineWorkoutExerciseCopy}
                  onPress={() => openExerciseDetail(group.previewStep)}
                >
                  <View style={styles.inlineWorkoutExerciseTitleRow}>
                    <Text style={[styles.workoutDetailTableExerciseName, styles.inlineWorkoutExerciseName, { color: theme.text }]} numberOfLines={3}>
                      {group.title}
                    </Text>
                    <Pressable
                      accessibilityLabel={t("showDetails")}
                      accessibilityRole="button"
                      hitSlop={8}
                      style={[styles.exerciseMuscleButton, { backgroundColor: theme.control, borderColor: theme.border }]}
                      onPress={(event) => {
                        event.stopPropagation();
                        setSelectedExerciseMuscleStep(group.previewStep);
                      }}
                    >
                      <Ionicons name="body-outline" size={20} color={theme.primary} />
                    </Pressable>
                  </View>
                  {group.previewStep.notes ? (
                    <Text style={[styles.workoutDetailNotes, styles.inlineWorkoutExerciseNotes, { color: theme.muted }]} numberOfLines={4}>
                      {group.previewStep.notes}
                    </Text>
                  ) : null}
                </Pressable>
                {renderPreviousExerciseValueButtons(group.entries, true)}
              </View>
              <View style={styles.workoutSessionDetailSetsCell}>
                {group.entries.map((entry, entryIndex) => {
                  const volume = calculateEntryVolume(entry);
                  const plannedReps = entry.plannedTargetType === "repetitions" ? entry.plannedTarget : "";

                  return (
                    <View
                      key={entry.id}
                      style={[
                        styles.workoutSessionDetailSetRow,
                        styles.inlineWorkoutSetRow,
                        { borderBottomColor: theme.border },
                        entryIndex === group.entries.length - 1 ? styles.workoutSessionDetailSetRowLast : null
                      ]}
                    >
                      <Text
                        style={[
                          styles.workoutDetailTableValue,
                          styles.workoutSessionDetailSetCell,
                          { color: theme.text, borderRightColor: theme.border }
                        ]}
                        numberOfLines={1}
                      >
                        {getSessionEntryIterationLabel(entry)}
                      </Text>
                      <View style={[styles.inlineWorkoutInputCell, styles.workoutSessionDetailRepsCell, styles.inlineWorkoutRepsCell, { borderRightColor: theme.border }]}>
                        <SessionValueInput
                          keyboardType="number-pad"
                          placeholder="-"
                          theme={theme}
                          value={entry.actualReps ?? ""}
                          onChangeText={(actualReps) => updateWorkoutSessionEntryTableValue(entry, { actualReps })}
                        />
                      </View>
                      <Text
                        style={[
                          styles.workoutDetailTableValue,
                          styles.workoutSessionDetailRepsCell,
                          styles.inlineWorkoutRepsCell,
                          { color: theme.text, borderRightColor: theme.border }
                        ]}
                        numberOfLines={1}
                      >
                        {plannedReps?.trim() || "-"}
                      </Text>
                      <View style={[styles.inlineWorkoutInputCell, styles.inlineWorkoutWeightCell, { borderRightColor: theme.border }]}>
                        <SessionValueInput
                          keyboardType="decimal-pad"
                          placeholder="-"
                          suffix="kg"
                          theme={theme}
                          value={entry.actualWeight ?? ""}
                          onChangeText={(actualWeight) => updateWorkoutSessionEntryTableValue(entry, { actualWeight })}
                        />
                      </View>
                      <Text style={[styles.workoutDetailTableValue, styles.workoutSessionDetailVolumeCell, { color: theme.text }]} numberOfLines={1}>
                        {volume ? formatNumber(volume, "kg") : "-"}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
        </ScrollView>
      </View>
    );
  }

  function renderRestTimer(entry?: WorkoutSessionEntry) {
    if (!showRestTimer || !entry?.plannedTarget) {
      return null;
    }

    const plannedSeconds = parseTimerSecondsValue(entry.plannedTarget);
    if (plannedSeconds <= 0) {
      return null;
    }

    return (
      <RestTimerControl
        key={entry.id}
        labels={{
          pause: t("pauseTimer"),
          reset: t("resetTimer"),
          restTimer: t("restTimer"),
          start: t("startTimer")
        }}
        plannedSeconds={plannedSeconds}
        theme={theme}
      />
    );
  }

  function renderWorkoutSessionProgressCard(current: number, total: number) {
    const progress = getWorkoutProgress(current, total);

    return (
      <View style={[styles.sessionProgressCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={[styles.sessionProgressIcon, { backgroundColor: theme.secondaryBand }]}>
          <Ionicons name="barbell-outline" size={20} color={theme.primary} />
        </View>
        <Text style={[styles.sessionProgressCardText, { color: theme.text }]} numberOfLines={1}>
          {t("exercisePlural")} {progress.current}/{progress.total}
        </Text>
        <View style={[styles.sessionProgressTrack, { backgroundColor: theme.secondaryBand }]}>
          <View style={[styles.sessionProgressFill, { backgroundColor: theme.primary, width: `${progress.percent}%` }]} />
        </View>
        <Text style={[styles.sessionProgressPercent, { color: theme.primary }]} numberOfLines={1}>
          {formatWorkoutProgressPercent(progress.current, progress.total)}
        </Text>
      </View>
    );
  }

  function renderGuidedPlanPreview(
    session: WorkoutSession,
    group: { entries: WorkoutSessionEntry[]; restEntry?: WorkoutSessionEntry },
    exerciseNumber: number
  ) {
    const entry = group.entries[0];
    const setCount = String(group.entries.length || 1);
    const previewStep = getSessionEntryPreviewStep(session, entry);
    const isUntimedWarmup = entry.type === "warmup" && !entry.plannedTarget?.trim();
    const title = entry.type === "warmup"
      ? entry.sourceStageName?.trim() || t("stageWarmup")
      : getExerciseDisplayName(previewStep.exerciseName, language);
    const plannedTarget = entry.plannedTargetType === "repetitions"
      ? entry.plannedTarget?.trim()
      : entry.plannedTarget?.trim() || getSessionEntrySetTarget(entry);
    const restSeconds = group.restEntry?.plannedTarget ? parseTimerSecondsValue(group.restEntry.plannedTarget) : 0;
    const restText = formatRestDuration(restSeconds);

    return (
      <View style={[styles.guidedPlanPreview, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.guidedExerciseHeader}>
          <View style={[styles.guidedExerciseNumber, { backgroundColor: theme.secondaryBand }]}>
            <Text style={[styles.guidedExerciseNumberText, { color: theme.primary }]}>{exerciseNumber}</Text>
          </View>
          <Text style={[styles.guidedExerciseTitle, { color: theme.text }]} numberOfLines={3}>
            {title}
          </Text>
          {!isUntimedWarmup ? (
            <Pressable
              accessibilityLabel={t("showDetails")}
              accessibilityRole="button"
              hitSlop={8}
              style={[styles.exerciseMuscleButton, { backgroundColor: theme.control, borderColor: theme.border }]}
              onPress={() => openExerciseDetail(previewStep)}
            >
              <Ionicons name="body-outline" size={20} color={theme.primary} />
            </Pressable>
          ) : null}
        </View>
        {entry.notes || previewStep.notes ? (
          <Text style={[styles.guidedExerciseNotes, { color: theme.muted }]} numberOfLines={5}>
            {entry.notes || previewStep.notes}
          </Text>
        ) : null}
        {!isUntimedWarmup ? (
          <View style={styles.guidedExerciseMetaRow}>
            <View style={styles.guidedRestGroup}>
              <Text style={[styles.guidedRestLabel, { color: theme.text }]}>{t("stageRest")}</Text>
              <View style={[styles.guidedRestPill, { backgroundColor: theme.secondaryBand }]}>
                <Ionicons name="time-outline" size={16} color={theme.text} />
                <Text style={[styles.guidedRestPillText, { color: theme.primary }]}>{restText}</Text>
              </View>
            </View>
            <View style={styles.guidedTargetGroup}>
              <View style={[styles.guidedTargetPill, { backgroundColor: theme.secondaryBand }]}>
                <Text style={[styles.guidedTargetText, { color: theme.primary }]}>{setCount}</Text>
              </View>
              <Text style={[styles.guidedTargetSeparator, { color: theme.text }]}>x</Text>
              <View style={[styles.guidedTargetPill, { backgroundColor: theme.secondaryBand }]}>
                <Text style={[styles.guidedTargetText, { color: theme.primary }]}>{plannedTarget || "-"}</Text>
              </View>
            </View>
          </View>
        ) : null}
        {renderRestTimer(group.restEntry)}
      </View>
    );
  }

  function renderReadOnlyWorkoutPlan(workout: WorkoutDraft, panelPrefix: string) {
    const stageGroups = workout.steps
      .filter((step) => step.kind === "stage" && step.stageType !== "warmup")
      .map((stage) => ({
        stage,
        series: workout.steps
          .filter((step) => step.kind === "set" && step.parentStageId === stage.id)
          .map((set) => ({
            set,
            elements: workout.steps.filter(
              (step) => step.kind === "exercise" && step.parentSetId === set.id
            )
          }))
      }));

    return (
      <>
        {workout.notes ? (
          <CollapsiblePanel
            collapseLabel={t("collapse")}
            expandLabel={t("expand")}
            isCollapsed={isReadOnlyWorkoutPanelCollapsed(`${panelPrefix}-notes`)}
            theme={theme}
            title={t("workoutNotes")}
            onToggle={() => toggleReadOnlyWorkoutPanel(`${panelPrefix}-notes`)}
          >
            <Text style={[styles.workoutDetailDescription, { color: theme.muted }]}>
              {workout.notes}
            </Text>
          </CollapsiblePanel>
        ) : null}

        <CollapsiblePanel
          collapseLabel={t("collapse")}
          expandLabel={t("expand")}
          isCollapsed={isReadOnlyWorkoutPanelCollapsed(`${panelPrefix}-overview`)}
          theme={theme}
          title={t("overview")}
          onToggle={() => toggleReadOnlyWorkoutPanel(`${panelPrefix}-overview`)}
        >
          <WorkoutMuscleOverviewContent language={language} theme={theme} workout={workout} />
        </CollapsiblePanel>

        <View style={styles.workoutDetailStages}>
          {stageGroups.map(({ stage, series }, index) => {
            const exerciseCount = series.reduce(
              (total, item) => total + item.elements.filter((element) => !isRestTargetStep(element)).length,
              0
            );

            return (
              <CollapsiblePanel
                actions={
                  <View style={[styles.panelCountBadge, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[styles.panelCountBadgeText, { color: theme.primary }]}>{exerciseCount}</Text>
                  </View>
                }
                collapseLabel={t("collapse")}
                expandLabel={t("expand")}
                key={stage.id}
                isCollapsed={isReadOnlyWorkoutPanelCollapsed(`${panelPrefix}-stage-${stage.id}`)}
                theme={theme}
                title={stage.label || `${t("stage")} ${index + 1}`}
                onToggle={() => toggleReadOnlyWorkoutPanel(`${panelPrefix}-stage-${stage.id}`)}
              >
                {stage.notes ? (
                  <Text style={[styles.workoutDetailNotes, { color: theme.muted }]}>{stage.notes}</Text>
                ) : null}

                {series.length ? (
                  <View style={styles.workoutDetailSeriesList}>
                    {series.map(({ set, elements }, setIndex) => {
                      const headerElement = elements.find((element) => !isRestTargetStep(element)) ?? elements[0];

                      return (
                        <View
                          key={set.id}
                          style={[
                            styles.workoutDetailSeriesRow,
                            { borderColor: theme.border },
                            setIndex === series.length - 1 ? styles.workoutDetailSeriesRowLast : null
                          ]}
                        >
                          <View style={styles.workoutInfo}>
                            {elements.map((element) => (
                              <View key={element.id} style={styles.workoutDetailElementRow}>
                                <ExerciseSummaryRow
                                  language={language}
                                  pairedTargetText={
                                    isRestTargetStep(element)
                                      ? (() => {
                                        const elementIndex = elements.findIndex((item) => item.id === element.id);
                                        const previousExercise = [...elements]
                                          .slice(0, Math.max(0, elementIndex))
                                          .reverse()
                                          .find((item) => !isRestTargetStep(item));

                                        return previousExercise
                                          ? formatExerciseSetTarget({ ...previousExercise, setCount: set.setCount || "1" })
                                          : undefined;
                                      })()
                                      : undefined
                                  }
                                  seriesIndex={headerElement?.id === element.id ? setIndex + 1 : undefined}
                                  step={element}
                                  targetText={formatExerciseSetTarget({ ...element, setCount: set.setCount || "1" })}
                                  theme={theme}
                                  t={t}
                                  onPressDetails={() => openExerciseDetail(element)}
                                  onPressMuscles={() => openExerciseDetail(element)}
                                />
                                {element.notes ? (
                                  <Text style={[styles.workoutDetailNotes, { color: theme.muted }]}>
                                    {element.notes}
                                  </Text>
                                ) : null}
                              </View>
                            ))}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </CollapsiblePanel>
            );
          })}
        </View>
      </>
    );
  }

  function renderWorkoutSession() {
    const session = activeWorkoutSession;

    if (!session) {
      return (
        <View style={[styles.emptyBuilder, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.emptyBuilderTitle, { color: theme.text }]}>{t("noWorkout")}</Text>
        </View>
      );
    }

    if (!session.entries.length) {
      return (
        <View style={[styles.emptyBuilder, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.emptyBuilderTitle, { color: theme.text }]}>{t("emptyWorkoutSession")}</Text>
          <AppButton icon="close-outline" theme={theme} onPress={abandonActiveWorkoutSession}>
            {t("abandonWorkout")}
          </AppButton>
        </View>
      );
    }

    const currentEntry = session.entries[Math.min(sessionEntryIndex, session.entries.length - 1)];

    if (session.executionMode === "guided") {
      const guidedGroups = getGuidedEntryGroups(session);
      const guidedGroupIndex = getGuidedGroupIndex(guidedGroups, sessionEntryIndex, currentEntry);
      const currentGroup = guidedGroups[guidedGroupIndex] ?? {
        entries: [currentEntry],
        firstIndex: Math.min(sessionEntryIndex, session.entries.length - 1),
        key: currentEntry.id
      };
      const canGoBack = guidedGroupIndex > 0;
      const canGoNext = guidedGroupIndex < guidedGroups.length - 1;
      const shouldShowGuidedEntryTable = currentGroup.entries.some(isWorkoutSessionEntryFillRequired);

      return (
        <View style={styles.sessionScreen}>
          {renderWorkoutSessionProgressCard(guidedGroupIndex + 1, guidedGroups.length)}
          {renderGuidedPlanPreview(session, currentGroup, guidedGroupIndex + 1)}
          {shouldShowGuidedEntryTable ? renderGuidedEntryTable(currentGroup.entries.filter(isWorkoutSessionEntryFillRequired)) : null}
          <View style={styles.sessionActions}>
            <AppButton
              disabled={!canGoBack}
              icon="chevron-back-outline"
              style={styles.sessionNavButton}
              theme={theme}
              variant="outline"
              onPress={() => {
                const previousGroup = guidedGroups[Math.max(0, guidedGroupIndex - 1)];
                setSessionEntryIndex(previousGroup?.firstIndex ?? 0);
              }}
            >
              {t("back")}
            </AppButton>
            <AppButton
              disabled={!canGoNext}
              icon="chevron-forward-outline"
              style={styles.sessionNavButton}
              theme={theme}
              variant="outline"
              onPress={() => {
                const nextGroup = guidedGroups[Math.min(guidedGroups.length - 1, guidedGroupIndex + 1)];
                setSessionEntryIndex(nextGroup?.firstIndex ?? sessionEntryIndex);
              }}
            >
              {t("next")}
            </AppButton>
          </View>
          <View style={styles.sessionActions}>
            <AppButton icon="flag-outline" style={styles.sessionNavButton} theme={theme} onPress={requestFinishActiveWorkoutSession}>
              {t("finish")}
            </AppButton>
            <AppButton icon="close-outline" style={styles.sessionNavButton} theme={theme} variant="outline" onPress={abandonActiveWorkoutSession}>
              {t("cancel")}
            </AppButton>
          </View>
        </View>
      );
    }

    if (session.executionMode === "readonly-post-workout" && !isPostWorkoutFillMode) {
      return (
        <View style={styles.sessionScreen}>
          {renderReadOnlyWorkoutPlan(session.planSnapshot, `active-session-${session.id}`)}
          <AppButton icon="create-outline" theme={theme} onPress={() => setIsPostWorkoutFillMode(true)}>
            {t("finishAndFill")}
          </AppButton>
          <AppButton icon="close-outline" theme={theme} variant="outline" onPress={abandonActiveWorkoutSession}>
            {t("cancelWorkout")}
          </AppButton>
        </View>
      );
    }

    return (
      <View style={styles.sessionScreen}>
        {renderInlineWorkoutTable(session)}
        <View style={styles.sessionActions}>
          <AppButton icon="flag-outline" style={styles.sessionNavButton} theme={theme} onPress={requestFinishActiveWorkoutSession}>
            {t("finish")}
          </AppButton>
          <AppButton icon="close-outline" style={styles.sessionNavButton} theme={theme} variant="outline" onPress={abandonActiveWorkoutSession}>
            {t("cancel")}
          </AppButton>
        </View>
      </View>
    );
  }

  function renderAppDialog() {
    if (!appDialog) {
      return null;
    }

    function closeDialog(action?: AppDialogAction) {
      setAppDialog(null);
      action?.onPress?.();
    }

    return (
      <Modal
        animationType="fade"
        transparent
        visible={Boolean(appDialog)}
        onRequestClose={() => setAppDialog(null)}
      >
        <View style={styles.appDialogBackdrop}>
          <View style={[styles.appDialogPanel, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.appDialogBody}>
              <Text style={[styles.appDialogTitle, { color: theme.text }]}>{appDialog.title}</Text>
              <Text style={[styles.appDialogMessage, { color: theme.muted }]}>{appDialog.message}</Text>
            </View>
            <View style={[styles.appDialogFooter, { borderTopColor: theme.border }]}>
              {appDialog.actions.map((action, index) => {
                const isDestructive = action.variant === "destructive";
                const isLast = index === appDialog.actions.length - 1;

                return (
                  <Pressable
                    key={`${action.label}-${index}`}
                    accessibilityRole="button"
                    style={[
                      styles.appDialogFooterButton,
                      !isLast ? { borderRightColor: theme.border, borderRightWidth: 1 } : null
                    ]}
                    onPress={() => closeDialog(action)}
                  >
                    <Text
                      style={[
                        styles.appDialogFooterButtonText,
                        { color: isDestructive ? theme.danger : theme.primary }
                      ]}
                    >
                      {action.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  function renderAchievementPreviewModal() {
    if (!selectedAchievementPreview) {
      return null;
    }

    return (
      <Modal
        animationType="fade"
        transparent
        visible={Boolean(selectedAchievementPreview)}
        onRequestClose={() => setSelectedAchievementPreview(null)}
      >
        <Pressable
          accessibilityLabel={t("close")}
          accessibilityRole="button"
          style={styles.achievementPreviewBackdrop}
          onPress={() => setSelectedAchievementPreview(null)}
        >
          <Image
            accessibilityIgnoresInvertColors
            resizeMode="contain"
            source={selectedAchievementPreview.imageSource}
            style={styles.achievementPreviewImage}
          />
        </Pressable>
      </Modal>
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
            {activeScreen === "settings" && renderSettings()}
            {activeScreen === "articleDetail" && renderArticleDetail()}
            {activeScreen === "builder" && renderBuilder()}
            {activeScreen === "workoutCreator" && renderWorkoutCreator()}
            {activeScreen === "workoutAiRewrite" && renderWorkoutAiRewrite()}
            {activeScreen === "workoutAiProposal" && renderWorkoutAiProposal()}
            {activeScreen === "workoutDetail" && renderWorkoutDetail()}
            {activeScreen === "workoutSession" && renderWorkoutSession()}
            {activeScreen === "weeklyPlan" && renderWeeklyPlan()}
            {activeScreen === "workoutHistory" && renderWorkoutHistoryScreen()}
            {activeScreen === "workoutSessionDetail" && renderWorkoutSessionDetail()}
            {activeScreen === "progress" && renderProgressScreen()}
            {activeScreen === "exerciseDetail" && renderExerciseDetailScreen()}
            {activeScreen === "exerciseProgress" && renderExerciseProgressScreen()}
            {activeScreen === "favoriteExercises" && renderFavoriteExercises()}
            {activeScreen === "aiCredits" && renderAiCredits()}
            {activeScreen === "achievements" && renderAchievements()}
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
              {renderSettingsSheetContent()}
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
        {renderAchievementPreviewModal()}
        {renderAppDialog()}
    </SafeAreaView>
  );

}

function getScreenTitle(
  activeScreen: ScreenKey,
  editingWorkoutId: string | null,
  t: (key: TranslationKey) => string
) {
  const titles: Record<ScreenKey, string> = {
    accountDetails: t("accountDetails"),
    articleDetail: t("articles"),
    bugReport: t("bugReport"),
    bugReportSuccess: t("bugReport"),
    builder: editingWorkoutId ? t("editWorkout") : t("addNewWorkout"),
    contact: t("contact"),
    deleteAccount: t("deleteAccount"),
    exerciseDetail: t("exerciseDetails"),
    exerciseProgress: t("exerciseProgress"),
    achievements: t("achievements"),
    aiCredits: t("aiCredits"),
    favoriteExercises: t("favoriteExercises"),
    forgotPassword: t("resetPassword"),
    home: t("home"),
    progress: t("progress"),
    profile: t("profile"),
    resetPassword: t("resetPassword"),
    changePassword: t("changePassword"),
    activeSessions: t("activeSessions"),
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

function GlobalErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const theme = themes.light;
  const errorMessage = error instanceof Error ? error.message : "Nieznany błąd aplikacji";
  const userFacingErrorMessage = "Szczegóły błędu zostały zapisane diagnostycznie.";
  addDiagnosticEvent({
    area: "ui",
    level: "error",
    message: errorMessage,
    screen: "error-boundary"
  });

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.statusBar === "dark" ? "dark-content" : "light-content"} />
      <View style={styles.errorScreen}>
        <View style={[styles.errorPanel, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.legalIcon, { backgroundColor: theme.secondaryBand }]}>
            <Ionicons name="alert-circle-outline" size={28} color={theme.danger} />
          </View>
          <Text style={[styles.errorTitle, { color: theme.text }]}>Coś poszło nie tak</Text>
          <Text style={[styles.errorCopy, { color: theme.muted }]}>
            Widok nie mogl zostac wyswietlony. Mozesz sprobowac odswiezyc aplikacje albo
            skontaktować się z nami, jeśli problem będzie wracał.
          </Text>
          <View style={[styles.errorDetails, { backgroundColor: theme.secondaryBand }]}>
            <Text style={[styles.errorDetailsText, { color: theme.muted }]} numberOfLines={3}>
              {userFacingErrorMessage}
            </Text>
          </View>
          <View style={styles.errorActions}>
            <AppButton
              icon="refresh-outline"
              style={styles.errorActionButton}
              theme={theme}
              onPress={resetErrorBoundary}
            >
              Spróbuj ponownie
            </AppButton>
            <AppButton
              icon="mail-outline"
              style={styles.errorActionButton}
              theme={theme}
              variant="outline"
            >
              Kontakt
            </AppButton>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

type MuscleUsage = Record<MuscleKey, 0 | 1 | 2>;

function getWorkoutMuscleUsage(workout: WorkoutDraft): MuscleUsage {
  const usage = Object.fromEntries(muscleKeys.map((muscle) => [muscle, 0])) as MuscleUsage;

  workout.steps.forEach((step) => {
    if (step.kind !== "exercise" || !step.exerciseName) {
      return;
    }

    const exercise = findExerciseByName(step.exerciseName);

    if (!exercise) {
      return;
    }

    muscleKeys.forEach((muscle) => {
      usage[muscle] = Math.max(usage[muscle], exercise.muscleImpact[muscle]) as 0 | 1 | 2;
    });
  });

  return usage;
}

type WorkoutMuscleOverviewProps = {
  language: LanguageCode;
  theme: Theme;
  workout: WorkoutDraft;
};

function WorkoutMuscleOverviewContent({ language, theme, workout }: WorkoutMuscleOverviewProps) {
  const usage = useMemo(() => getWorkoutMuscleUsage(workout), [workout]);
  const primaryCount = muscleKeys.filter((muscle) => usage[muscle] === 2).length;
  const secondaryCount = muscleKeys.filter((muscle) => usage[muscle] === 1).length;
  const colors = {
    inactive: "#4a4d4c",
    primary: "#ff3347",
    secondary: "#ffc43d"
  };

  function fill(muscle: MuscleKey) {
    if (usage[muscle] === 2) {
      return colors.primary;
    }

    if (usage[muscle] === 1) {
      return colors.secondary;
    }

    return colors.inactive;
  }

  return (
    <>
      <View style={styles.muscleOverviewFigures}>
        <HumanMuscleFigure fill={fill} side="front" />
        <HumanMuscleFigure fill={fill} side="back" />
      </View>
      <View style={styles.muscleOverviewLegend}>
        <LegendItem color={colors.primary} label={`${translate(language, "primaryMuscles")} (${primaryCount})`} theme={theme} />
        <LegendItem color={colors.secondary} label={`${translate(language, "secondaryMuscles")} (${secondaryCount})`} theme={theme} />
        <LegendItem color={colors.inactive} label={translate(language, "inactiveMuscleGroups")} theme={theme} />
      </View>
    </>
  );
}

type ExerciseMuscleModalProps = {
  language: LanguageCode;
  onClose: () => void;
  onShowDetails?: (step: WorkoutStep) => void;
  step: WorkoutStep | null;
  t: (key: TranslationKey) => string;
  theme: Theme;
};

function ExerciseMuscleModal({ language, onClose, onShowDetails, step, t, theme }: ExerciseMuscleModalProps) {
  const muscleGroups = useMemo(() => step ? getWorkoutStepMuscleGroups(step) : { primary: [], secondary: [] }, [step]);
  const usage = useMemo(() => {
    const nextUsage = Object.fromEntries(muscleKeys.map((muscle) => [muscle, 0])) as MuscleUsage;
    muscleGroups.primary.forEach((muscle) => {
      nextUsage[muscle] = 2;
    });
    muscleGroups.secondary.forEach((muscle) => {
      nextUsage[muscle] = Math.max(nextUsage[muscle], 1) as 0 | 1 | 2;
    });
    return nextUsage;
  }, [muscleGroups.primary, muscleGroups.secondary]);
  const hasMuscleData = muscleGroups.primary.length > 0 || muscleGroups.secondary.length > 0;
  const exerciseName = step?.exerciseName
    ? getExerciseDisplayName(step.exerciseName, language)
    : t("exercise");
  const colors = {
    inactive: "#4a4d4c",
    primary: "#ff3347",
    secondary: "#ffc43d"
  };

  function fill(muscle: MuscleKey) {
    if (usage[muscle] === 2) {
      return colors.primary;
    }

    if (usage[muscle] === 1) {
      return colors.secondary;
    }

    return colors.inactive;
  }

  function formatMuscleList(muscles: MuscleKey[]) {
    return muscles.length ? muscles.map((muscle) => muscleLabels[language][muscle]).join(", ") : t("noData");
  }

  return (
    <Modal animationType="fade" transparent visible={Boolean(step)} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.exerciseMuscleModal, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.panelHeroHeader}>
            <View style={[styles.legalIcon, { backgroundColor: theme.secondaryBand }]}>
              <Ionicons name="body-outline" size={26} color={theme.primary} />
            </View>
            <View style={styles.workoutInfo}>
              <Text style={[styles.creatorPromptTitle, { color: theme.text }]}>{t("workedMuscles")}</Text>
              <Text style={[styles.creatorDescription, { color: theme.muted }]}>{exerciseName}</Text>
            </View>
          </View>

          {hasMuscleData ? (
            <>
              <View style={styles.exerciseMuscleLists}>
                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: theme.muted }]}>{t("primaryMuscles")}</Text>
                  <Text style={[styles.workoutName, { color: theme.text }]}>{formatMuscleList(muscleGroups.primary)}</Text>
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: theme.muted }]}>{t("secondaryMuscles")}</Text>
                  <Text style={[styles.workoutName, { color: theme.text }]}>{formatMuscleList(muscleGroups.secondary)}</Text>
                </View>
              </View>
              <View style={styles.muscleOverviewFigures}>
                <HumanMuscleFigure fill={fill} side="front" />
                <HumanMuscleFigure fill={fill} side="back" />
              </View>
            </>
          ) : (
            <Text style={[styles.emptyBuilderCopy, { color: theme.muted }]}>
              {t("noExerciseMuscleData")}
            </Text>
          )}

          {step && onShowDetails ? (
            <AppButton icon="information-circle-outline" theme={theme} onPress={() => onShowDetails(step)}>
              {t("showDetails")}
            </AppButton>
          ) : null}
          <AppButton icon="close-outline" theme={theme} variant="outline" onPress={onClose}>
            {t("close")}
          </AppButton>
        </View>
      </View>
    </Modal>
  );
}

type ExerciseSummaryRowProps = {
  hideTitle?: boolean;
  language: LanguageCode;
  onPressDetails: () => void;
  onPressMuscles: () => void;
  pairedTargetText?: string;
  seriesIndex?: number;
  step: WorkoutStep;
  t: (key: TranslationKey) => string;
  targetText: string;
  theme: Theme;
};

function ExerciseSummaryRow({ hideTitle = false, language, onPressDetails, onPressMuscles, pairedTargetText, seriesIndex, step, t, targetText, theme }: ExerciseSummaryRowProps) {
  const isRestTarget = isRestTargetStep(step);
  const target = isRestTarget ? targetText : "";
  const [pairedSets, pairedTarget] = pairedTargetText ? pairedTargetText.split(" x ") : ["", ""];
  const rawExerciseName = typeof step.exerciseName === "string" ? step.exerciseName : "";
  const rawExerciseId = typeof step.exerciseId === "string" ? step.exerciseId : "";
  const exerciseName = rawExerciseName
    ? getExerciseDisplayName(rawExerciseName, language)
    : step.stageType
      ? t(stageTypeTranslationKeys[step.stageType])
      : t("elementWithoutExercise");
  const meta = step.loadKg ? `${step.loadKg} kg` : "";
  const canShowMuscleButton = Boolean(rawExerciseId.trim() || rawExerciseName.trim());

  if (isRestTarget) {
    return (
      <Pressable accessibilityRole="button" style={styles.exerciseSummaryRow} onPress={onPressDetails}>
        <View style={styles.exerciseSummaryRestCopy}>
          <Text style={[styles.workoutDetailExerciseName, { color: theme.text }]} numberOfLines={2}>
            {exerciseName}
          </Text>
          <View style={[styles.exerciseSummaryTile, styles.exerciseSummarySingleTile, { backgroundColor: theme.secondaryBand }]}>
            <Text style={[styles.exerciseSummaryTileText, { color: theme.primary }]}>{target || "-"}</Text>
          </View>
        </View>
        {pairedTargetText ? (
          <View
            style={styles.exerciseSummaryTiles}
            accessibilityLabel={`${pairedSets || "-"} x ${pairedTarget || "-"}`}
          >
            <View style={[styles.exerciseSummaryTile, { backgroundColor: theme.secondaryBand }]}>
              <Text style={[styles.exerciseSummaryTileText, { color: theme.primary }]}>{pairedSets || "-"}</Text>
            </View>
            <Text style={[styles.exerciseSummaryTimes, { color: theme.muted }]}>x</Text>
            <View style={[styles.exerciseSummaryTile, { backgroundColor: theme.secondaryBand }]}>
              <Text style={[styles.exerciseSummaryTileText, { color: theme.primary }]}>{pairedTarget || "-"}</Text>
            </View>
          </View>
        ) : null}
      </Pressable>
    );
  }

  return (
    <Pressable accessibilityRole="button" style={styles.exerciseSummaryRow} onPress={onPressDetails}>
      <View style={styles.exerciseSummaryCopy}>
        {hideTitle ? null : (
          <View style={styles.exerciseSummaryTitleRow}>
            {typeof seriesIndex === "number" ? (
              <View style={[styles.workoutDetailSeriesBadge, { backgroundColor: theme.secondaryBand }]}>
                <Text style={[styles.workoutDetailStageBadgeText, { color: theme.primary }]}>
                  {seriesIndex}
                </Text>
              </View>
            ) : null}
            <Text style={[styles.workoutDetailExerciseName, styles.workoutDetailSeriesTitle, { color: theme.text }]} numberOfLines={2}>
              {exerciseName}
            </Text>
          </View>
        )}
        {meta ? (
          <Text style={[styles.workoutMeta, { color: theme.muted }]} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      {canShowMuscleButton ? (
        <View style={styles.exerciseSummaryRight}>
          <Pressable
            accessibilityLabel={t("showDetails")}
            accessibilityRole="button"
            hitSlop={8}
            style={[styles.exerciseMuscleButton, { backgroundColor: theme.control, borderColor: theme.border }]}
            onPress={(event) => {
              event.stopPropagation();
              onPressMuscles();
            }}
          >
            <Ionicons name="body-outline" size={20} color={theme.primary} />
          </Pressable>
        </View>
      ) : null}
    </Pressable>
  );
}

type LegendItemProps = {
  color: string;
  label: string;
  theme: Theme;
};

function LegendItem({ color, label, theme }: LegendItemProps) {
  return (
    <View style={styles.muscleLegendItem}>
      <View style={[styles.muscleLegendDot, { backgroundColor: color }]} />
      <Text style={[styles.muscleLegendText, { color: theme.muted }]}>{label}</Text>
    </View>
  );
}

type HumanMuscleFigureProps = {
  fill: (muscle: MuscleKey) => string;
  side: "front" | "back";
  style?: StyleProp<ViewStyle>;
};

function HumanMuscleFigure({ fill, side, style }: HumanMuscleFigureProps) {
  const svgSource = side === "front" ? frontBodySvg : backBodySvg;
  const regionMap = side === "front" ? frontBodyRegionMap : backBodyRegionMap;
  const xml = useMemo(() => colorizeBodySvg(svgSource, regionMap, fill), [fill, regionMap, svgSource]);

  return (
    <View style={[styles.humanMuscleFigure, style]}>
      <SvgXml height="100%" width="100%" xml={xml} />
    </View>
  );
}

function colorizeBodySvg(
  svg: string,
  regionMap: Record<string, MuscleKey>,
  fill: (muscle: MuscleKey) => string
) {
  return Object.entries(regionMap).reduce((currentSvg, [regionId, muscle]) => {
    const escapedId = regionId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regionPattern = new RegExp(`(<[^>]+\\bid="${escapedId}"[^>]*>)`, "g");

    return currentSvg.replace(regionPattern, (tag) =>
      tag.replace(/\bfill="[^"]*"/, `fill="${fill(muscle)}"`)
    );
  }, svg);
}

type ExercisePickerProps = {
  disabled?: boolean;
  emptyText: string;
  favoriteExerciseIds: ReadonlySet<string>;
  favoriteFilterAllLabel: string;
  favoriteFilterOnlyLabel: string;
  hideAdditionalExercisesLabel: string;
  showMoreExercisesLabel: string;
  tierLabels: Readonly<Record<Exclude<ExerciseLibraryTier, "main" | "deprecated" | "progression">, string>>;
  language: LanguageCode;
  loadingText: string;
  muscleFilterAllLabel: string;
  muscleFilterLabel: string;
  onChange: (value: string) => void;
  onToggleFavorite: (exerciseId: string) => void;
  optionByValue: ReadonlyMap<string, ExerciseOption>;
  options: readonly ExerciseOption[];
  placeholder: string;
  searchPlaceholder: string;
  stageType: StageType | "";
  theme: Theme;
  title: string;
  value: string;
};

function ExercisePicker({
  disabled = false,
  emptyText,
  favoriteExerciseIds,
  favoriteFilterAllLabel,
  favoriteFilterOnlyLabel,
  hideAdditionalExercisesLabel,
  showMoreExercisesLabel,
  tierLabels,
  language,
  loadingText,
  muscleFilterAllLabel,
  muscleFilterLabel,
  onChange,
  onToggleFavorite,
  optionByValue,
  options,
  placeholder,
  searchPlaceholder,
  stageType,
  theme,
  title,
  value
}: ExercisePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleKey | "all">("all");
  const [favoriteFilter, setFavoriteFilter] = useState<"all" | "favorites">("all");
  const [showAdditionalExercises, setShowAdditionalExercises] = useState(false);
  const [enabledAdditionalTiers, setEnabledAdditionalTiers] = useState<Set<Exclude<ExerciseLibraryTier, "main" | "deprecated" | "progression">>>(new Set());
  const pickerInsets = useSafeAreaInsets();
  const pickerHeaderTopPadding = Math.max(pickerInsets.top, 20) + 6;
  const selectedOption = value ? optionByValue.get(value) : undefined;
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const defaultGroupedOptions = useMemo(
    () => getExerciseSectionsForStageType(language, stageType, "all"),
    [language, stageType]
  );
  const visibleOptions = useMemo(() => {
    return favoriteFilter === "favorites"
      ? filterExerciseOptionsForPicker(options, normalizedQuery, enabledAdditionalTiers).filter((option) => favoriteExerciseIds.has(option.exerciseId))
      : filterExerciseOptionsForPicker(options, normalizedQuery, enabledAdditionalTiers);
  }, [enabledAdditionalTiers, favoriteExerciseIds, favoriteFilter, normalizedQuery, options]);
  const muscleOptions = useMemo(
    () => [
      { label: muscleFilterAllLabel, value: "all" as const },
      ...getMuscleOptions(language)
    ],
    [language, muscleFilterAllLabel]
  );
  const groupedOptions = useMemo<ExerciseSection[]>(() => {
    if (!isOpen) {
      return [];
    }

    if (
      !normalizedQuery &&
      favoriteFilter === "all" &&
      enabledAdditionalTiers.size === 0 &&
      selectedMuscle === "all"
    ) {
      return defaultGroupedOptions;
    }

    const nextOptions = visibleOptions;

    return buildExerciseSections(nextOptions, language, selectedMuscle);
  }, [defaultGroupedOptions, enabledAdditionalTiers, favoriteFilter, isOpen, language, normalizedQuery, selectedMuscle, visibleOptions]);
  const exerciseListEmptyText = isOpen ? emptyText : loadingText;
  const exerciseListExtraData = useMemo(
    () => ({ favoriteExerciseIds, value }),
    [favoriteExerciseIds, value]
  );

  const selectExercise = useCallback((nextValue: string) => {
    onChange(nextValue);
    setIsOpen(false);
    setQuery("");
    setIsSearchOpen(false);
    setSelectedMuscle("all");
    setFavoriteFilter("all");
    setShowAdditionalExercises(false);
    setEnabledAdditionalTiers(new Set());
  }, [onChange]);

  const toggleAdditionalTier = useCallback((tier: Exclude<ExerciseLibraryTier, "main" | "deprecated" | "progression">) => {
    setEnabledAdditionalTiers((current) => {
      const next = new Set(current);
      if (next.has(tier)) next.delete(tier);
      else next.add(tier);
      return next;
    });
  }, []);

  function openPicker() {
    if (disabled) {
      return;
    }

    setIsOpen(true);
  }

  const getExerciseItemKey = useCallback((item: ExerciseSection["data"][number]) => item.sectionKey, []);
  const renderExerciseListEmpty = useCallback(
    () => (
      <Text style={[styles.exercisePickerEmpty, { color: theme.text }]}>
        {exerciseListEmptyText}
      </Text>
    ),
    [exerciseListEmptyText, theme.text]
  );
  const renderExerciseSectionHeader = useCallback(
    ({ section }: { section: SectionListData<ExerciseSection["data"][number], ExerciseSection> }) => (
      <Text
        style={[
          styles.exercisePickerLetter,
          { backgroundColor: theme.secondaryBand, color: theme.muted }
        ]}
      >
        {section.title}
      </Text>
    ),
    [theme.muted, theme.secondaryBand]
  );
  const renderExerciseItem = useCallback(
    ({ item }: SectionListRenderItemInfo<ExerciseSection["data"][number], ExerciseSection>) => {
      const isFavorite = favoriteExerciseIds.has(item.exerciseId);
      const tierBadge = getExerciseOptionTierBadge(item);

      return (
        <Pressable
          accessibilityRole="button"
          style={[
            styles.exercisePickerRow,
            {
              backgroundColor: item.value === value ? theme.secondaryBand : theme.card,
              borderBottomColor: theme.border
            }
          ]}
          onPress={() => selectExercise(item.value)}
        >
          <Text style={[styles.exercisePickerRowText, { color: theme.text }]}>
            {item.label}
          </Text>
          {tierBadge ? (
            <Text style={[styles.exercisePickerTierBadge, { color: theme.primary, backgroundColor: theme.secondaryBand }]}>
              {tierLabels[tierBadge]}
            </Text>
          ) : null}
          <Pressable
            accessibilityLabel={isFavorite ? favoriteFilterOnlyLabel : favoriteFilterAllLabel}
            accessibilityRole="button"
            style={styles.exercisePickerFavoriteButton}
            onPress={(event) => {
              event.stopPropagation();
              onToggleFavorite(item.exerciseId);
            }}
          >
            <Ionicons
              name={isFavorite ? "star" : "star-outline"}
              size={24}
              color={isFavorite ? theme.primary : theme.muted}
            />
          </Pressable>
        </Pressable>
      );
    },
    [
      favoriteExerciseIds,
      favoriteFilterAllLabel,
      favoriteFilterOnlyLabel,
      onToggleFavorite,
      selectExercise,
      tierLabels,
      theme.border,
      theme.card,
      theme.muted,
      theme.primary,
      theme.secondaryBand,
      theme.text,
      value
    ]
  );

  return (
    <>
      <Pressable
        accessibilityRole="button"
        style={[
          styles.exercisePickerTrigger,
          {
            backgroundColor: disabled ? theme.secondaryBand : theme.control,
            borderColor: theme.border,
            opacity: disabled ? 0.72 : 1
          }
        ]}
        onPress={openPicker}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.exercisePickerTriggerText,
            { color: selectedOption ? theme.inputText : theme.muted }
          ]}
        >
          {selectedOption?.label ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={19} color={theme.muted} />
      </Pressable>

      <Modal animationType="slide" visible={isOpen} onRequestClose={() => setIsOpen(false)}>
        <SafeAreaView style={[styles.exercisePickerScreen, { backgroundColor: theme.background }]}>
          <StatusBar
            backgroundColor={theme.card}
            barStyle={theme.statusBar === "dark" ? "dark-content" : "light-content"}
            translucent={false}
          />
          <View style={styles.exercisePickerContent}>
            <View
              style={[
                styles.exercisePickerHeader,
                {
                  backgroundColor: theme.card,
                  borderBottomColor: theme.border,
                  paddingTop: pickerHeaderTopPadding
                }
              ]}
            >
              <Pressable
                accessibilityRole="button"
                style={styles.exercisePickerHeaderButton}
                onPress={() => setIsOpen(false)}
              >
                <Ionicons name="arrow-back" size={28} color={theme.text} />
              </Pressable>
              <Text style={[styles.exercisePickerTitle, { color: theme.text }]}>{title}</Text>
              <View style={styles.exercisePickerHeaderActions}>
                <Pressable
                  accessibilityRole="button"
                  style={styles.exercisePickerHeaderButton}
                  onPress={() => setIsSearchOpen((current) => !current)}
                >
                  <Ionicons name="search" size={27} color={theme.text} />
                </Pressable>
              </View>
            </View>

            {isSearchOpen ? (
              <View style={styles.exercisePickerFilters}>
                <Input
                  style={[
                    styles.exercisePickerSearchInput,
                    { backgroundColor: theme.control, borderColor: theme.border }
                  ]}
                >
                  <InputField
                    autoFocus
                    placeholder={searchPlaceholder}
                    placeholderTextColor={theme.muted}
                    style={[styles.exercisePickerSearchText, { color: theme.inputText }]}
                    value={query}
                    onChangeText={setQuery}
                  />
                </Input>
                <View style={styles.exercisePickerMuscleFilter}>
                  <Text style={[styles.label, { color: theme.muted }]}>{muscleFilterLabel}</Text>
                  <InlineSheetSelectControl
                    options={muscleOptions}
                    placeholder={muscleFilterAllLabel}
                    theme={theme}
                    value={selectedMuscle}
                    onChange={setSelectedMuscle}
                  />
                </View>
              </View>
            ) : null}

            <View style={styles.exerciseFavoriteFilterRow}>
              {([
                { label: favoriteFilterAllLabel, value: "all" as const },
                { label: favoriteFilterOnlyLabel, value: "favorites" as const }
              ]).map((option) => {
                const selected = favoriteFilter === option.value;

                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    style={[
                      styles.exerciseFavoriteFilterButton,
                      {
                        backgroundColor: selected ? theme.primary : theme.secondaryBand
                      }
                    ]}
                    onPress={() => setFavoriteFilter(option.value)}
                  >
                    <Text
                      style={[
                        styles.exerciseFavoriteFilterText,
                        { color: selected ? theme.white : theme.text }
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.exerciseTierFilterPanel}>
              <Pressable
                accessibilityRole="button"
                style={[styles.exerciseTierFilterToggle, { borderColor: theme.border, backgroundColor: theme.control }]}
                onPress={() => setShowAdditionalExercises((current) => !current)}
              >
                <Text style={[styles.exerciseTierFilterToggleText, { color: theme.text }]}>
                  {showAdditionalExercises ? hideAdditionalExercisesLabel : showMoreExercisesLabel}
                </Text>
                <Ionicons name={showAdditionalExercises ? "chevron-up" : "chevron-down"} size={18} color={theme.primary} />
              </Pressable>
              {showAdditionalExercises ? (
                <View style={styles.exerciseTierFilterOptions}>
                  {(["variation", "advanced", "sportSpecific", "rehab"] as const).map((tier) => {
                    const enabled = enabledAdditionalTiers.has(tier);
                    return (
                      <Pressable
                        key={tier}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: enabled }}
                        style={[styles.exerciseTierFilterChip, { borderColor: theme.border, backgroundColor: enabled ? theme.primary : theme.secondaryBand }]}
                        onPress={() => toggleAdditionalTier(tier)}
                      >
                        <Ionicons name={enabled ? "checkmark-circle" : "ellipse-outline"} size={18} color={enabled ? theme.white : theme.muted} />
                        <Text style={[styles.exerciseTierFilterChipText, { color: enabled ? theme.white : theme.text }]}>{tierLabels[tier]}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>

            <SectionList
              initialNumToRender={14}
              extraData={exerciseListExtraData}
              keyboardShouldPersistTaps="handled"
              maxToRenderPerBatch={16}
              sections={groupedOptions}
              style={[styles.exercisePickerList, { backgroundColor: theme.background }]}
              contentContainerStyle={styles.exercisePickerListContent}
              keyExtractor={getExerciseItemKey}
              ListEmptyComponent={renderExerciseListEmpty}
              renderSectionHeader={renderExerciseSectionHeader}
              renderItem={renderExerciseItem}
              removeClippedSubviews={Platform.OS === "android"}
              stickySectionHeadersEnabled={false}
              updateCellsBatchingPeriod={50}
              windowSize={7}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

type InfoLinkRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  meta: string;
  onPress: () => void;
  theme: Theme;
};

type SettingsSectionProps = {
  children: ReactNode;
  isCollapsed: boolean;
  onToggle: () => void;
  theme: Theme;
  title: string;
};

type CollapsiblePanelProps = {
  actions?: ReactNode;
  children: ReactNode;
  collapseLabel?: string;
  expandLabel?: string;
  isCollapsed: boolean;
  leadingAccessory?: ReactNode;
  onToggle: () => void;
  theme: Theme;
  title: string;
};

function CollapsiblePanel({
  actions,
  children,
  collapseLabel = "Collapse",
  expandLabel = "Expand",
  isCollapsed,
  leadingAccessory,
  onToggle,
  theme,
  title
}: CollapsiblePanelProps) {
  return (
    <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Pressable
        accessibilityLabel={`${isCollapsed ? expandLabel : collapseLabel}: ${title}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: !isCollapsed }}
        style={[styles.panelHeader, { borderBottomColor: theme.border }]}
        onPress={onToggle}
      >
        <View style={styles.panelTitleBlock}>
          {leadingAccessory}
          <Text style={[styles.panelTitle, { color: theme.text }]}>{title}</Text>
        </View>
        <View
          style={styles.panelHeaderActions}
          onStartShouldSetResponder={() => true}
        >
          {actions}
          <Pressable
            accessibilityLabel={`${isCollapsed ? expandLabel : collapseLabel}: ${title}`}
            accessibilityRole="button"
            accessibilityState={{ expanded: !isCollapsed }}
            hitSlop={8}
            style={[styles.panelToggleButton, { borderColor: theme.border, backgroundColor: theme.card }]}
            onPress={onToggle}
          >
            <Ionicons
              name={isCollapsed ? "chevron-forward" : "chevron-down"}
              size={20}
              color={theme.primary}
            />
          </Pressable>
        </View>
      </Pressable>
      {!isCollapsed && <View style={styles.panelBody}>{children}</View>}
    </View>
  );
}

type ArticleBlock =
  | { kind: "lead"; text: string }
  | { kind: "section"; paragraphs: string[]; title: string }
  | { headers: string[]; kind: "table"; rows: string[][] };

function parseArticleMarkdown(content: string) {
  const blocks: ArticleBlock[] = [];
  const lines = content.split(/\r?\n/);
  let paragraph: string[] = [];
  let currentSection: { paragraphs: string[]; title: string } | null = null;
  let index = 0;

  function flushParagraph() {
    if (!paragraph.length) {
      return;
    }

    const text = paragraph.join(" ");
    if (currentSection) {
      currentSection.paragraphs.push(text);
    } else {
      blocks.push({ kind: "lead", text });
    }
    paragraph = [];
  }

  function flushSection() {
    if (!currentSection) {
      return;
    }

    blocks.push({ kind: "section", paragraphs: currentSection.paragraphs, title: currentSection.title });
    currentSection = null;
  }

  while (index < lines.length) {
    const line = lines[index].trim();

    if (!line) {
      flushParagraph();
      index += 1;
      continue;
    }

    if (line.startsWith("## ")) {
      flushParagraph();
      flushSection();
      currentSection = { paragraphs: [], title: line.replace(/^##\s+/, "") };
      index += 1;
      continue;
    }

    if (line.startsWith("|")) {
      flushParagraph();
      const tableLines: string[] = [];

      while (index < lines.length && lines[index].trim().startsWith("|")) {
        tableLines.push(lines[index].trim());
        index += 1;
      }

      const rows = tableLines
        .filter((tableLine) => !/^\|\s*-+/.test(tableLine))
        .map((tableLine) =>
          tableLine
            .replace(/^\|/, "")
            .replace(/\|$/, "")
            .split("|")
            .map((cell) => cell.trim())
        );

      if (rows.length) {
        flushSection();
        blocks.push({ headers: rows[0], kind: "table", rows: rows.slice(1) });
      }

      continue;
    }

    paragraph.push(line);
    flushParagraph();
    index += 1;
  }

  flushParagraph();
  flushSection();
  return blocks;
}

function formatArticleDate(value: string, language: LanguageCode) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat(language === "pl" ? "pl-PL" : "en-US", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

function splitTrainingPlanItems(value: string) {
  const sentenceParts = value.split(/\. (?=[A-ZŁŚŻŹĆŃÓĄĘ])/).map((part, index, parts) => {
    const trimmed = part.trim();
    return index < parts.length - 1 && !trimmed.endsWith(".") ? `${trimmed}.` : trimmed;
  });

  return sentenceParts
    .flatMap((part) => (part.includes("×") ? part.split(/,\s+(?=[^,]*\d+×)/) : [part]))
    .map((item) => capitalizeFirstLetter(item.trim()))
    .filter(Boolean);
}

function capitalizeFirstLetter(value: string) {
  if (!value) {
    return value;
  }

  return `${value.charAt(0).toLocaleUpperCase("pl-PL")}${value.slice(1)}`;
}

type ArticleDetailProps = {
  article: Article;
  language: LanguageCode;
  theme: Theme;
};

function ArticleDetail({ article, language, theme }: ArticleDetailProps) {
  const translation = getArticleTranslation(article, language);
  const blocks = useMemo(() => parseArticleMarkdown(translation.content), [translation.content]);

  return (
    <View style={styles.articleDetail}>
      <View style={[styles.articleDetailPanel, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.articleCategory, { color: theme.primary }]}>{translation.category}</Text>
        <Text style={[styles.articleDetailTitle, { color: theme.text }]}>{translation.title}</Text>
        <Text style={[styles.articleMeta, { color: theme.muted }]}>
          {formatArticleDate(article.publishedAt, language)} · {article.readTime}
        </Text>
        {translation.summary ? (
          <Text style={[styles.articleParagraph, { color: theme.muted }]}>
            {translation.summary}
          </Text>
        ) : null}

        <View style={[styles.legalDivider, { backgroundColor: theme.border }]} />

        {blocks.map((block, blockIndex) => {
          if (block.kind === "lead") {
            return (
              <View
                key={`${block.kind}-${blockIndex}`}
                style={[styles.articleLead, { backgroundColor: theme.secondaryBand }]}
              >
                <Text style={[styles.articleLeadText, { color: theme.text }]}>
                  {block.text}
                </Text>
              </View>
            );
          }

          if (block.kind === "section") {
            return (
              <View key={`${block.kind}-${blockIndex}`} style={styles.articleSectionBlock}>
                <Text style={[styles.articleBlockHeading, { color: theme.text }]}>
                  {block.title}
                </Text>
                {block.paragraphs.map((paragraph, paragraphIndex) => (
                  <Text
                    key={`${block.title}-${paragraphIndex}`}
                    style={[styles.articleParagraph, { color: theme.muted }]}
                  >
                    {paragraph}
                  </Text>
                ))}
              </View>
            );
          }

          if (block.kind === "table") {
            return (
              <View key={`${block.kind}-${blockIndex}`} style={styles.articlePlanList}>
                <Text style={[styles.articlePlanTitle, { color: theme.text }]}>
                  {block.headers.join(" / ")}
                </Text>
                {block.rows.map((row, rowIndex) => (
                  <View
                    key={`${row.join("-")}-${rowIndex}`}
                    style={[styles.articlePlanCard, { backgroundColor: theme.control, borderColor: theme.border }]}
                  >
                    <View style={[styles.articlePlanDayBadge, { backgroundColor: theme.secondaryBand }]}>
                      <Text style={[styles.articlePlanDayBadgeText, { color: theme.primary }]}>
                        {row[0]}
                      </Text>
                    </View>
                    <View style={styles.articlePlanItems}>
                      {splitTrainingPlanItems(row[1]).map((item, itemIndex) => (
                        <View key={`${item}-${itemIndex}`} style={styles.articlePlanItemRow}>
                          <View style={[styles.articlePlanBullet, { backgroundColor: theme.primary }]} />
                          <Text style={[styles.articlePlanDescription, { color: theme.text }]}>
                            {item}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            );
          }

          return null;
        })}
      </View>
    </View>
  );
}

function SettingsSection({ children, isCollapsed, onToggle, theme, title }: SettingsSectionProps) {
  return (
    <CollapsiblePanel isCollapsed={isCollapsed} theme={theme} title={title} onToggle={onToggle}>
      {children}
    </CollapsiblePanel>
  );
}

type SettingsOptionProps = {
  disabled?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  theme: Theme;
  value: string;
};

function SettingsOption({ disabled = false, icon, label, onPress, theme, value }: SettingsOptionProps) {
  const Container = onPress && !disabled ? Pressable : View;

  return (
    <Container
      accessibilityRole={onPress && !disabled ? "button" : undefined}
      accessibilityState={disabled ? { disabled: true } : undefined}
      onPress={disabled ? undefined : onPress}
      style={[styles.settingsOptionRow, { borderColor: theme.border, opacity: disabled ? 0.48 : 1 }]}
    >
      <View style={[styles.infoLinkIcon, { backgroundColor: disabled ? theme.segment : theme.secondaryBand }]}>
        <Ionicons name={icon} size={21} color={disabled ? theme.muted : theme.primary} />
      </View>
      <Text style={[styles.settingsOptionLabel, { color: disabled ? theme.muted : theme.text }]}>{label}</Text>
      <Text style={[styles.settingsOptionValue, { color: theme.muted }]}>{value}</Text>
    </Container>
  );
}

type SettingsPlaceholderProps = {
  disabled?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  meta: string;
  theme: Theme;
};

function SettingsPlaceholder({ disabled = false, icon, label, meta, theme }: SettingsPlaceholderProps) {
  return (
    <View style={[styles.settingsPlaceholder, { opacity: disabled ? 0.48 : 1 }]}>
      <View style={[styles.infoLinkIcon, { backgroundColor: disabled ? theme.segment : theme.secondaryBand }]}>
        <Ionicons name={icon} size={22} color={disabled ? theme.muted : theme.primary} />
      </View>
      <View style={styles.workoutInfo}>
        <Text style={[styles.workoutName, { color: disabled ? theme.muted : theme.text }]}>{label}</Text>
        <Text style={[styles.workoutMeta, { color: theme.muted }]}>{meta}</Text>
      </View>
    </View>
  );
}

function InfoLinkRow({ icon, label, meta, onPress, theme }: InfoLinkRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      style={[styles.infoLinkRow, { borderColor: theme.border }]}
      onPress={onPress}
    >
      <View style={[styles.infoLinkIcon, { backgroundColor: theme.secondaryBand }]}>
        <Ionicons name={icon} size={22} color={theme.primary} />
      </View>
      <View style={styles.workoutInfo}>
        <Text style={[styles.workoutName, { color: theme.text }]}>{label}</Text>
        <Text style={[styles.workoutMeta, { color: theme.muted }]}>{meta}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.muted} />
    </Pressable>
  );
}

type LoginPanelProps = {
  authError: string;
  authMode: AuthMode;
  displayName: string;
  email: string;
  isAuthSubmitting: boolean;
  logIn: () => void;
  password: string;
  passwordConfirm: string;
  register: () => void;
  setAuthError: React.Dispatch<React.SetStateAction<string>>;
  setAuthMode: React.Dispatch<React.SetStateAction<AuthMode>>;
  setDisplayName: React.Dispatch<React.SetStateAction<string>>;
  setEmail: React.Dispatch<React.SetStateAction<string>>;
  setPassword: React.Dispatch<React.SetStateAction<string>>;
  setPasswordConfirm: React.Dispatch<React.SetStateAction<string>>;
  setShowLoginForm: React.Dispatch<React.SetStateAction<boolean>>;
  showLoginForm: boolean;
  t: (key: TranslationKey) => string;
  theme: Theme;
  user: UserSession | null;
  onDismiss?: () => void;
  onForgotPassword?: () => void;
};

function LoginPanel({
  authError,
  authMode,
  displayName,
  email,
  isAuthSubmitting,
  logIn,
  password,
  passwordConfirm,
  register,
  setAuthError,
  setAuthMode,
  setDisplayName,
  setEmail,
  setPassword,
  setPasswordConfirm,
  setShowLoginForm,
  showLoginForm,
  t,
  theme,
  user,
  onDismiss,
  onForgotPassword
}: LoginPanelProps) {
  const isRegisterMode = authMode === "register";
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  function switchAuthMode(nextMode: AuthMode) {
    setAuthMode(nextMode);
    setAuthError("");
    setPasswordConfirm("");
  }

  if (user) {
    return null;
  }

  if (!showLoginForm) {
    return (
      <View style={[styles.loginPanel, { backgroundColor: theme.primaryStrong }]}>
        <View style={styles.loginPanelHeader}>
          <View style={styles.loginCopy}>
            <Text style={styles.loginEyebrow}>{t("userAccount")}</Text>
            <Text style={styles.loginTitle}>{t("loginIntro")}</Text>
          </View>
          {onDismiss ? (
            <Pressable
              accessibilityLabel={t("loginPanelDismiss")}
              accessibilityRole="button"
              style={styles.loginDismissButton}
              onPress={onDismiss}
            >
              <Ionicons name="close" size={22} color="#ffffff" />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.loginActions}>
          <AppButton
            icon="person-outline"
            style={styles.loginButton}
            textStyle={styles.loginButtonText}
            theme={theme}
            variant="light"
            onPress={() => {
              setAuthMode("login");
              setAuthError("");
              setShowLoginForm(true);
            }}
          >
            {t("loginCta")}
          </AppButton>
          <AppButton
            icon="person-add-outline"
            style={styles.loginButton}
            textStyle={styles.loginButtonText}
            theme={theme}
            variant="light"
            onPress={() => {
              setAuthMode("register");
              setAuthError("");
              setShowLoginForm(true);
            }}
          >
            {t("register")}
          </AppButton>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.authPanel, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.authHeader}>
        <View style={styles.loginCopy}>
        <Text style={[styles.authEyebrow, { color: theme.primary }]}>
          {isRegisterMode ? t("register") : t("login")}
        </Text>
        {isRegisterMode ? (
          <Text style={[styles.authTitle, { color: theme.text }]}>
            {t("createAccount")}
          </Text>
        ) : null}
      </View>
        <Pressable
          accessibilityRole="button"
          style={styles.closeButton}
          onPress={onDismiss ?? (() => setShowLoginForm(false))}
        >
          <Ionicons name="close" size={22} color={theme.muted} />
        </Pressable>
      </View>

      <View style={styles.authFields}>
        <View style={[styles.authModeSwitch, { backgroundColor: theme.secondaryBand }]}>
          <Pressable
            accessibilityRole="button"
            style={[
              styles.authModeButton,
              authMode === "login" && { backgroundColor: theme.card }
            ]}
            onPress={() => switchAuthMode("login")}
          >
            <Text
              style={[
                styles.authModeButtonText,
                { color: authMode === "login" ? theme.primary : theme.muted }
              ]}
            >
              {t("login")}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={[
              styles.authModeButton,
              authMode === "register" && { backgroundColor: theme.card }
            ]}
            onPress={() => switchAuthMode("register")}
          >
            <Text
              style={[
                styles.authModeButtonText,
                { color: authMode === "register" ? theme.primary : theme.muted }
              ]}
            >
              {t("register")}
            </Text>
          </Pressable>
        </View>

        <View style={styles.authInputStack}>
          {isRegisterMode ? (
            <AppInput
              placeholder={t("username")}
              theme={theme}
              value={displayName}
              onChangeText={setDisplayName}
            />
          ) : null}

          <AppInput
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="email"
            theme={theme}
            value={email}
            onChangeText={setEmail}
          />
          <PasswordInput
            isVisible={isPasswordVisible}
            placeholder={t("password")}
            setIsVisible={setIsPasswordVisible}
            theme={theme}
            value={password}
            onChangeText={setPassword}
          />
          {isRegisterMode ? (
            <PasswordInput
              isVisible={isPasswordVisible}
              placeholder={t("passwordConfirm")}
              setIsVisible={setIsPasswordVisible}
              theme={theme}
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
            />
          ) : null}
        </View>

        {authError ? <Text style={[styles.authError, { color: theme.danger }]}>{authError}</Text> : null}

        {!isRegisterMode && onForgotPassword ? (
          <Pressable accessibilityRole="button" onPress={onForgotPassword}>
            <Text style={[styles.authForgotPassword, { color: theme.primary }]}>
              {t("forgotPassword")}
            </Text>
          </Pressable>
        ) : null}

        <View
          style={[
            styles.authButtonSpacer,
            isRegisterMode && styles.authRegisterButtonSpacer
          ]}
        />

        <View style={styles.authButtonWrap}>
          <AppButton
            disabled={isAuthSubmitting}
            icon="log-in-outline"
            style={styles.authButton}
            textStyle={styles.authButtonText}
            theme={theme}
            onPress={isRegisterMode ? register : logIn}
          >
            {isAuthSubmitting
              ? isRegisterMode
                ? t("authRegisterSubmitting")
                : t("authLoginSubmitting")
              : isRegisterMode
                ? t("registerAction")
                : t("loginAction")}
          </AppButton>
        </View>
      </View>
    </View>
  );
}

type WorkoutBuilderProps = {
  defaultSetCount: string;
  defaultStageType: StageType | "";
  defaultWeight: string;
  favoriteExerciseIds: ReadonlySet<string>;
  isEditing: boolean;
  language: LanguageCode;
  moveStep: (stepId: string, direction: -1 | 1) => void;
  onToggleFavoriteExercise: (exerciseId: string) => void;
  removeStep: (stepId: string) => void;
  setWorkout: React.Dispatch<React.SetStateAction<WorkoutDraft>>;
  t: (key: TranslationKey) => string;
  theme: Theme;
  updateStep: (stepId: string, nextStep: WorkoutStep) => void;
  workout: WorkoutDraft;
};

type StepConfigurationProps = {
  favoriteExerciseIds: ReadonlySet<string>;
  language: LanguageCode;
  onToggleFavoriteExercise: (exerciseId: string) => void;
  parentStageType?: StageType | "";
  step: WorkoutStep;
  t: (key: TranslationKey) => string;
  theme: Theme;
  typeLabel: string;
  updateStep: (stepId: string, nextStep: WorkoutStep) => void;
};

type StageConfigurationProps = {
  stage: WorkoutStep;
  t: (key: TranslationKey) => string;
  theme: Theme;
  updateStep: (stepId: string, nextStep: WorkoutStep) => void;
};

type SuffixedInputProps = {
  editable?: boolean;
  keyboardType?: TextInputProps["keyboardType"];
  onChangeText: (value: string) => void;
  placeholder?: string;
  suffix: string;
  theme: Theme;
  value: string;
};

function SuffixedInput({
  editable = true,
  keyboardType = "number-pad",
  onChangeText,
  placeholder = "0",
  suffix,
  theme,
  value
}: SuffixedInputProps) {
  return (
    <Input
      style={[
        styles.suffixedInput,
        {
          backgroundColor: editable ? theme.control : theme.secondaryBand,
          borderColor: theme.border,
          opacity: editable ? 1 : 0.72
        }
      ]}
    >
      <InputField
        editable={editable}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={theme.muted}
        style={[styles.suffixedTextInput, { color: theme.inputText }]}
        value={value}
        onChangeText={onChangeText}
      />
      <Text style={[styles.inputSuffix, { color: theme.muted }]}>{suffix}</Text>
    </Input>
  );
}

type TimeTargetInputProps = {
  onChange: (value: string) => void;
  t: (key: TranslationKey) => string;
  theme: Theme;
  value: string;
};

function TimeTargetInput({ onChange, t, theme, value }: TimeTargetInputProps) {
  const [hours = "", minutes = "", seconds = ""] = value.split(":");

  function updatePart(partIndex: number, partValue: string) {
    const numericValue = partValue.replace(/\D/g, "").slice(0, 2);
    const nextParts = [hours, minutes, seconds];
    nextParts[partIndex] = numericValue;
    onChange(nextParts.join(":"));
  }

  return (
    <View style={styles.timeTargetRow}>
      {[
        { label: t("timeHours"), value: hours },
        { label: t("timeMinutes"), value: minutes },
        { label: t("timeSeconds"), value: seconds }
      ].map((part, index) => (
        <View key={part.label} style={styles.timeTargetPart}>
          <Input
            style={[
              styles.suffixedInput,
              { backgroundColor: theme.control, borderColor: theme.border }
            ]}
          >
            <InputField
              keyboardType="number-pad"
              maxLength={2}
              placeholder="00"
              placeholderTextColor={theme.muted}
              style={[
                styles.timeTargetTextInput,
                { color: theme.inputText }
              ]}
              value={part.value}
              onChangeText={(nextValue) => updatePart(index, nextValue)}
            />
          </Input>
          <Text style={[styles.timeTargetLabel, { color: theme.muted }]}>{part.label}</Text>
        </View>
      ))}
    </View>
  );
}

type GoalTargetControlProps = {
  step: WorkoutStep;
  t: (key: TranslationKey) => string;
  theme: Theme;
  updateStep: (stepId: string, nextStep: WorkoutStep) => void;
};

function GoalTargetControl({ step, t, theme, updateStep }: GoalTargetControlProps) {
  if (!step.goalType || step.goalType === "buttonPress") {
    return null;
  }

  if (step.goalType === "time") {
    return (
      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: theme.muted }]}>{t("goal")}</Text>
        <TimeTargetInput
          t={t}
          theme={theme}
          value={step.targetValue}
          onChange={(targetValue) => updateStep(step.id, { ...step, targetValue })}
        />
      </View>
    );
  }

  if (step.goalType === "heartRate") {
    return (
      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: theme.muted }]}>{t("goal")}</Text>
        <View style={styles.heartRateTargetRow}>
          <View style={styles.heartRateComparatorField}>
            <SelectControl
              onChange={(targetComparator) =>
                updateStep(step.id, { ...step, targetComparator })
              }
              options={getTargetComparatorOptions(t)}
              placeholder={t("select")}
              theme={theme}
              value={step.targetComparator}
            />
          </View>
          <View style={styles.heartRateValueField}>
            <SuffixedInput
              suffix="bpm"
              theme={theme}
              value={step.targetValue}
              onChangeText={(targetValue) => updateStep(step.id, { ...step, targetValue })}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.label, { color: theme.muted }]}>{t("goal")}</Text>
      <SuffixedInput
        suffix={step.goalType === "calories" ? t("caloriesSuffix") : t("repetitionsSuffix")}
        theme={theme}
        value={step.targetValue}
        onChangeText={(targetValue) => updateStep(step.id, { ...step, targetValue })}
      />
    </View>
  );
}

function StageConfiguration({ stage, t, theme, updateStep }: StageConfigurationProps) {
  return (
    <>
      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: theme.muted }]}>{t("stageType")}</Text>
        <SelectControl
          onChange={(stageType) => updateStep(stage.id, { ...stage, stageType })}
          options={getStageTypeOptions(t)}
          placeholder={t("select")}
          theme={theme}
          value={stage.stageType}
        />
      </View>

      <View style={[styles.fieldGroup, styles.stepParagraph]}>
        <Text style={[styles.label, { color: theme.muted }]}>{t("workoutNotes")}</Text>
        <AppTextarea
          placeholder={t("addNotes")}
          theme={theme}
          value={stage.notes}
          onChangeText={(notes) => updateStep(stage.id, { ...stage, notes })}
        />
      </View>
    </>
  );
}

function normalizeSetCountInput(value: string) {
  const numericValue = value.replace(/\D/g, "").slice(0, 2);

  if (!numericValue) {
    return "";
  }

  return String(Math.min(Number(numericValue), 20));
}

function StepConfiguration({
  favoriteExerciseIds,
  language,
  onToggleFavoriteExercise,
  parentStageType,
  step,
  t,
  theme,
  typeLabel,
  updateStep
}: StepConfigurationProps) {
  const includeSetCount = false;
  const shouldShowExerciseFields = step.stageType !== "rest" && step.stageType !== "warmup";
  const exerciseCatalogStageType =
    step.stageType === "exercise" &&
    (parentStageType === "warmup" || parentStageType === "recovery" || parentStageType === "cooldown")
      ? parentStageType
      : step.stageType;
  const filteredExerciseOptions = useMemo(
    () => shouldShowExerciseFields ? getCachedExerciseOptionsForStageType(language, exerciseCatalogStageType, activeExerciseLibraryTiers) : [],
    [exerciseCatalogStageType, language, shouldShowExerciseFields]
  );
  const filteredExerciseOptionByValue = useMemo(
    () => new Map(filteredExerciseOptions.map((option) => [option.value, option])),
    [filteredExerciseOptions]
  );
  const canSelectExercise = filteredExerciseOptions.length > 0;
  const hasSelectedType = Boolean(step.stageType);

  useEffect(() => {
    if (!shouldShowExerciseFields && (step.exerciseId || step.exerciseName || step.loadKg)) {
      updateStep(step.id, {
        ...step,
        exerciseId: "",
        exerciseName: "",
        loadKg: ""
      });
      return;
    }

    if (step.exerciseName && filteredExerciseOptionByValue.has(step.exerciseName)) {
      const catalogExercise = findCatalogExerciseBestEffort(step.exerciseName);

      if (catalogExercise && step.exerciseId !== catalogExercise.id) {
        updateStep(step.id, {
          ...step,
          exerciseId: catalogExercise.id,
          exerciseName: catalogExercise.name
        });
      }
      return;
    }

    if (step.exerciseName && !filteredExerciseOptionByValue.has(step.exerciseName)) {
      const canonicalExercise = findCatalogExerciseBestEffort(step.exerciseName);
      const canonicalExerciseName = canonicalExercise?.name;

      if (canonicalExerciseName && filteredExerciseOptionByValue.has(canonicalExerciseName)) {
        updateStep(step.id, {
          ...step,
          exerciseId: canonicalExercise?.id ?? "",
          exerciseName: canonicalExerciseName
        });
        return;
      }

      updateStep(step.id, {
        ...step,
        exerciseId: "",
        exerciseName: "",
        loadKg: ""
      });
    }
  }, [filteredExerciseOptionByValue, shouldShowExerciseFields, step, updateStep]);

  function updateStageType(stageType: StageType | "") {
    if (stageType === "rest" || stageType === "warmup") {
      updateStep(step.id, {
        ...step,
        exerciseId: "",
        exerciseName: "",
        loadKg: "",
        stageType
      });
      return;
    }

    const nextExerciseCatalogStageType =
      stageType === "exercise" &&
      (parentStageType === "warmup" || parentStageType === "recovery" || parentStageType === "cooldown")
        ? parentStageType
        : stageType;
    const nextOptions = getCachedExerciseOptionsForStageType(language, nextExerciseCatalogStageType, activeExerciseLibraryTiers);
    const hasCurrentExercise = nextOptions.some((option) => option.value === step.exerciseName);

    updateStep(step.id, {
      ...step,
      exerciseId: hasCurrentExercise ? step.exerciseId : "",
      exerciseName: hasCurrentExercise ? step.exerciseName : "",
      loadKg: hasCurrentExercise ? step.loadKg : "",
      stageType
    });
  }

  return (
    <>
      {includeSetCount && (
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.muted }]}>{t("setCount")}</Text>
          <AppInput
            keyboardType="number-pad"
            maxLength={2}
            placeholder="0"
            theme={theme}
            value={step.setCount}
            onChangeText={(setCount) => updateStep(step.id, { ...step, setCount: normalizeSetCountInput(setCount) })}
          />
        </View>
      )}

      <View style={styles.stepParagraph}>
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.muted }]}>{typeLabel}</Text>
          <SelectControl
            onChange={updateStageType}
            options={getStageTypeOptions(t)}
            placeholder={t("select")}
            theme={theme}
            value={step.stageType}
          />
        </View>

        {shouldShowExerciseFields ? (
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.muted }]}>{t("exercise")}</Text>
            <ExercisePicker
              disabled={!hasSelectedType || !canSelectExercise}
              emptyText={t("exercisePickerEmpty")}
              favoriteExerciseIds={favoriteExerciseIds}
              favoriteFilterAllLabel={t("favoriteExercisesAllFilter")}
              favoriteFilterOnlyLabel={t("favoriteExercisesOnlyFilter")}
              hideAdditionalExercisesLabel={t("exercisePickerHideMore")}
              showMoreExercisesLabel={t("exercisePickerShowMore")}
              tierLabels={{
                variation: t("exercisePickerTierVariation"),
                advanced: t("exercisePickerTierAdvanced"),
                sportSpecific: t("exercisePickerTierSportSpecific"),
                rehab: t("exercisePickerTierRehab")
              }}
              language={language}
              loadingText={t("exercisePickerLoading")}
              muscleFilterAllLabel={t("exerciseMuscleFilterAll")}
              muscleFilterLabel={t("exerciseMuscleFilter")}
              onChange={(exerciseName) => {
                const catalogExercise = findCatalogExerciseBestEffort(exerciseName);
                updateStep(step.id, {
                  ...step,
                  exerciseId: catalogExercise?.id ?? "",
                  exerciseName: catalogExercise?.name ?? exerciseName,
                  loadKg: step.loadKg
                });
              }}
              onToggleFavorite={onToggleFavoriteExercise}
              optionByValue={filteredExerciseOptionByValue}
              options={filteredExerciseOptions}
              placeholder={t("select")}
              searchPlaceholder={t("searchExercise")}
              stageType={exerciseCatalogStageType}
              theme={theme}
              title={t("exercisePickerTitle")}
              value={step.exerciseName}
            />
          </View>
        ) : null}
      </View>

      <View style={shouldShowExerciseFields ? [styles.row, styles.stepParagraph] : [styles.fieldGroup, styles.stepParagraph]}>
        <View style={shouldShowExerciseFields ? styles.goalField : undefined}>
          <Text style={[styles.label, { color: theme.muted }]}>{t("goalType")}</Text>
          <SelectControl
            disabled={!hasSelectedType}
            onChange={(goalType) =>
              updateStep(step.id, {
                ...step,
                goalType,
                targetComparator: "",
                targetValue: ""
              })
            }
            options={getGoalTypeOptions(t)}
            placeholder={t("select")}
            theme={theme}
            value={step.goalType}
          />
        </View>
        {shouldShowExerciseFields ? (
          <View style={styles.weightField}>
            <Text style={[styles.label, { color: theme.muted }]}>{t("weight")}</Text>
            <SuffixedInput
              editable={canSelectExercise && Boolean(step.exerciseName)}
              keyboardType="decimal-pad"
              suffix="kg"
              theme={theme}
              value={step.loadKg}
              onChangeText={(loadKg) => updateStep(step.id, { ...step, loadKg })}
            />
          </View>
        ) : null}
      </View>

      <GoalTargetControl step={step} t={t} theme={theme} updateStep={updateStep} />

      <View style={[styles.fieldGroup, styles.stepParagraph]}>
        <Text style={[styles.label, { color: theme.muted }]}>{t("workoutNotes")}</Text>
        <AppTextarea
          placeholder={t("addNotes")}
          theme={theme}
          value={step.notes}
          onChangeText={(notes) => updateStep(step.id, { ...step, notes })}
        />
      </View>
    </>
  );
}

function WorkoutBuilder({
  defaultSetCount,
  defaultStageType,
  defaultWeight,
  favoriteExerciseIds,
  isEditing,
  language,
  moveStep,
  onToggleFavoriteExercise,
  removeStep,
  setWorkout,
  t,
  theme,
  updateStep,
  workout
}: WorkoutBuilderProps) {
  const [collapsedPanels, setCollapsedPanels] = useState<Record<string, boolean>>({});
  const hasConfiguredExercises = workout.steps.some(
    (step) => step.kind === "exercise" && Boolean(step.exerciseName)
  );
  const overviewCollapsed = collapsedPanels["builder-overview"] ?? true;
  const stageGroups = workout.steps
    .filter((step) => step.kind === "stage")
    .map((stage) => ({
      stage,
      series: workout.steps
        .filter((step) => step.kind === "set" && step.parentStageId === stage.id)
        .map((set) => ({
          set,
          elements: workout.steps.filter((step) => step.kind === "exercise" && step.parentSetId === set.id)
        }))
    }));

  function addSeriesToStage(stageId: string) {
    setWorkout((current) => {
      const stageIndex = current.steps.findIndex((step) => step.id === stageId);

      if (stageIndex < 0) {
        return current;
      }

      const nextStageIndex = current.steps.findIndex(
        (step, index) => index > stageIndex && step.kind === "stage"
      );
      const insertIndex = nextStageIndex === -1 ? current.steps.length : nextStageIndex;
      const nextSteps = [...current.steps];
      nextSteps.splice(insertIndex, 0, createStep({ kind: "set", parentStageId: stageId, setCount: defaultSetCount }));

      return {
        ...current,
        steps: nextSteps
      };
    });
  }

  function addElementToSet(setId: string) {
    setWorkout((current) => {
      const setIndex = current.steps.findIndex((step) => step.id === setId);

      if (setIndex < 0) {
        return current;
      }

      const nextSetIndex = current.steps.findIndex(
        (step, index) => index > setIndex && (step.kind === "set" || step.kind === "stage")
      );
      const insertIndex = nextSetIndex === -1 ? current.steps.length : nextSetIndex;
      const nextSteps = [...current.steps];
      nextSteps.splice(insertIndex, 0, createStep({
        kind: "exercise",
        loadKg: defaultWeight,
        parentSetId: setId,
        stageType: defaultStageType
      }));

      return {
        ...current,
        steps: nextSteps
      };
    });
  }

  function isCollapsed(panelId: string) {
    return collapsedPanels[panelId] ?? false;
  }

  function togglePanel(panelId: string) {
    setCollapsedPanels((current) => ({
      ...current,
      [panelId]: !isCollapsed(panelId)
    }));
  }

  return (
    <View style={styles.builderBlock}>
      <View style={styles.sectionHeader}>
        {!isEditing ? (
          <View>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {t("addNewWorkout")}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: theme.muted }]}>{t("workoutName")}</Text>
        <AppInput
          placeholder={t("workoutNamePlaceholder")}
          theme={theme}
          value={workout.name}
          onChangeText={(name) => setWorkout((current) => ({ ...current, name }))}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: theme.muted }]}>{t("workoutNotes")}</Text>
        <AppTextarea
          placeholder={t("workoutNotesPlaceholder")}
          theme={theme}
          value={workout.notes}
          onChangeText={(notes) => setWorkout((current) => ({ ...current, notes }))}
        />
      </View>

      {hasConfiguredExercises && (
        <CollapsiblePanel
          isCollapsed={overviewCollapsed}
          title={t("overview")}
          theme={theme}
          onToggle={() => togglePanel("builder-overview")}
        >
          <WorkoutMuscleOverviewContent language={language} theme={theme} workout={workout} />
        </CollapsiblePanel>
      )}

      {workout.steps.length === 0 && (
        <View style={[styles.emptyBuilder, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="list-outline" size={26} color={theme.primary} />
          <Text style={[styles.emptyBuilderTitle, { color: theme.text }]}>
            {t("emptyWorkoutBuilderTitle")}
          </Text>
          <Text style={[styles.emptyBuilderCopy, { color: theme.muted }]}>
            {t("emptyWorkoutBuilderCopy")}
          </Text>
        </View>
      )}

      {stageGroups.map(({ stage, series }, index) => {
        const stageCollapsed = isCollapsed(stage.id);
        const stageConfigCollapsed = isCollapsed(`stage-config-${stage.id}`);
        const stageTitle = stage.label.trim() || `${t("stage")} ${index + 1}`;

        return (
          <View
            key={stage.id}
            style={[styles.stepCard, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <View style={styles.stepTopRow}>
              <Pressable
                accessibilityLabel={stageCollapsed ? "Rozwin etap" : "Zwin etap"}
                accessibilityRole="button"
                accessibilityState={{ expanded: !stageCollapsed }}
                style={styles.stepTitleButton}
                onPress={() => togglePanel(stage.id)}
              >
                <Ionicons
                  name={stageCollapsed ? "chevron-forward" : "chevron-down"}
                  size={20}
                  color={theme.primary}
                />
                <View style={styles.stepTitleCopy}>
                  <Text style={[styles.stepTitle, { color: theme.text }]}>{stageTitle}</Text>
                  <Text style={[styles.stepKind, { color: theme.muted }]}>
                    {series.length} {series.length === 1 ? t("set").toLowerCase() : t("setsPlural")}
                  </Text>
                </View>
              </Pressable>
              <View style={styles.stepActions}>
                <Pressable
                  accessibilityLabel="Przenies wyzej"
                  accessibilityRole="button"
                  disabled={index === 0}
                  style={[
                    styles.stepActionButton,
                    {
                      opacity: index === 0 ? 0.35 : 1
                    }
                  ]}
                  onPress={() => moveStep(stage.id, -1)}
                >
                  <Ionicons name="arrow-up" size={19} color={theme.primary} />
                </Pressable>
                <Pressable
                  accessibilityLabel="Przenies nizej"
                  accessibilityRole="button"
                  disabled={index === workout.steps.length - 1}
                  style={[
                    styles.stepActionButton,
                    {
                      opacity: index === stageGroups.length - 1 ? 0.35 : 1
                    }
                  ]}
                  onPress={() => moveStep(stage.id, 1)}
                >
                  <Ionicons name="arrow-down" size={19} color={theme.primary} />
                </Pressable>
                <Pressable
                  accessibilityLabel="Usun element"
                  accessibilityRole="button"
                  style={styles.stepActionButton}
                  onPress={() => removeStep(stage.id)}
                >
                  <Ionicons name="trash-outline" size={20} color={theme.danger} />
                </Pressable>
              </View>
            </View>

            {!stageCollapsed && (
              <>
                <View style={styles.stageNameRow}>
                  <AppInput
                    placeholder={`${t("stage")} ${index + 1}`}
                    style={styles.stageNameInput}
                    theme={theme}
                    value={stage.label}
                    onChangeText={(label) => updateStep(stage.id, { ...stage, label })}
                  />
                  <Pressable
                    accessibilityLabel={
                      stageConfigCollapsed
                        ? "Pokaż konfigurację etapu"
                        : "Ukryj konfigurację etapu"
                    }
                    accessibilityRole="button"
                    accessibilityState={{ expanded: !stageConfigCollapsed }}
                    style={[
                      styles.stageConfigToggle,
                      { backgroundColor: theme.secondaryBand, borderColor: theme.border }
                    ]}
                    onPress={() => togglePanel(`stage-config-${stage.id}`)}
                  >
                    <Ionicons
                      name={stageConfigCollapsed ? "chevron-down" : "chevron-up"}
                      size={22}
                      color={theme.primary}
                    />
                  </Pressable>
                </View>

                {!stageConfigCollapsed && (
                  <StageConfiguration
                    stage={stage}
                    t={t}
                    theme={theme}
                    updateStep={updateStep}
                  />
                )}

                <View style={[styles.seriesBlock, { borderColor: theme.border }]}>
                  <View style={styles.seriesHeader}>
                    <Text style={[styles.seriesTitle, { color: theme.text }]}>{t("setsInStage")}</Text>
                    <AppButton
                      icon="add"
                      style={styles.seriesAddButton}
                      textStyle={styles.seriesAddButtonText}
                      theme={theme}
                      onPress={() => addSeriesToStage(stage.id)}
                    >
                      {t("set")}
                    </AppButton>
                  </View>

                  {series.length === 0 ? (
                    <View style={[styles.emptySeries, { backgroundColor: theme.secondaryBand }]}>
                      <Text style={[styles.emptySeriesText, { color: theme.muted }]}>
                        {t("stageWithoutSeries")}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.seriesList}>
                      {series.map(({ set, elements }, setIndex) => {
                        const seriesCollapsed = isCollapsed(set.id);

                        return (
                          <View
                            key={set.id}
                            style={[
                              styles.seriesCard,
                              { backgroundColor: theme.background, borderColor: theme.border }
                            ]}
                          >
                            <View style={styles.stepTopRow}>
                              <Pressable
                                accessibilityLabel={seriesCollapsed ? "Rozwin serie" : "Zwin serie"}
                                accessibilityRole="button"
                                accessibilityState={{ expanded: !seriesCollapsed }}
                                style={styles.stepTitleButton}
                                onPress={() => togglePanel(set.id)}
                              >
                                <Ionicons
                                  name={seriesCollapsed ? "chevron-forward" : "chevron-down"}
                                  size={20}
                                  color={theme.primary}
                                />
                                <View style={styles.stepTitleCopy}>
                                  <Text style={[styles.stepTitle, { color: theme.text }]}>
                                    {t("set")} {setIndex + 1}
                                  </Text>
                                </View>
                              </Pressable>
                              <View style={styles.stepActions}>
                                <Pressable
                                  accessibilityLabel="Przenies serie wyzej"
                                  accessibilityRole="button"
                                  disabled={setIndex === 0}
                                  style={[
                                    styles.stepActionButton,
                                    { opacity: setIndex === 0 ? 0.35 : 1 }
                                  ]}
                                  onPress={() => moveStep(set.id, -1)}
                                >
                                  <Ionicons name="arrow-up" size={19} color={theme.primary} />
                                </Pressable>
                                <Pressable
                                  accessibilityLabel="Przenies serie nizej"
                                  accessibilityRole="button"
                                  disabled={setIndex === series.length - 1}
                                  style={[
                                    styles.stepActionButton,
                                    { opacity: setIndex === series.length - 1 ? 0.35 : 1 }
                                  ]}
                                  onPress={() => moveStep(set.id, 1)}
                                >
                                  <Ionicons name="arrow-down" size={19} color={theme.primary} />
                                </Pressable>
                                <Pressable
                                  accessibilityLabel="Usun serie"
                                  accessibilityRole="button"
                                  style={styles.stepActionButton}
                                  onPress={() => removeStep(set.id)}
                                >
                                  <Ionicons name="trash-outline" size={20} color={theme.danger} />
                                </Pressable>
                              </View>
                            </View>

                            {!seriesCollapsed && (
                              <View style={styles.seriesContent}>
                                <View style={styles.fieldGroup}>
                                  <Text style={[styles.label, { color: theme.muted }]}>{t("setCount")}</Text>
                                  <AppInput
                                    keyboardType="number-pad"
                                    maxLength={2}
                                    placeholder="0"
                                    theme={theme}
                                    value={set.setCount}
                                    onChangeText={(setCount) => updateStep(set.id, { ...set, setCount: normalizeSetCountInput(setCount) })}
                                  />
                                </View>

                                <View style={[styles.seriesBlock, { borderColor: theme.border }]}>
                                  <View style={styles.seriesHeader}>
                                    <Text style={[styles.seriesTitle, { color: theme.text }]}>
                                    {t("setElements")}
                                    </Text>
                                    <AppButton
                                      icon="add"
                                      style={styles.seriesAddButton}
                                      textStyle={styles.seriesAddButtonText}
                                      theme={theme}
                                      onPress={() => addElementToSet(set.id)}
                                    >
                                      {t("addElement")}
                                    </AppButton>
                                  </View>

                                  {elements.length === 0 ? (
                                    <View style={[styles.emptySeries, { backgroundColor: theme.secondaryBand }]}>
                                      <Text style={[styles.emptySeriesText, { color: theme.muted }]}>
                                        {t("setWithoutElements")}
                                      </Text>
                                    </View>
                                  ) : (
                                    <View style={styles.seriesList}>
                                      {elements.map((element, elementIndex) => {
                                        const elementCollapsed = isCollapsed(element.id);

                                        return (
                                          <View
                                            key={element.id}
                                            style={[
                                              styles.seriesCard,
                                              { backgroundColor: theme.card, borderColor: theme.border }
                                            ]}
                                          >
                                            <View style={styles.stepTopRow}>
                                              <Pressable
                                                accessibilityLabel={elementCollapsed ? "Rozwiń element" : "Zwiń element"}
                                                accessibilityRole="button"
                                                accessibilityState={{ expanded: !elementCollapsed }}
                                                style={styles.stepTitleButton}
                                                onPress={() => togglePanel(element.id)}
                                              >
                                                <Ionicons
                                                  name={elementCollapsed ? "chevron-forward" : "chevron-down"}
                                                  size={20}
                                                  color={theme.primary}
                                                />
                                                <View style={styles.stepTitleCopy}>
                                                  <Text style={[styles.stepTitle, { color: theme.text }]}>
                                                    {element.exerciseName
                                                      ? getExerciseDisplayName(element.exerciseName, language)
                                                      : element.stageType
                                                        ? t(stageTypeTranslationKeys[element.stageType])
                                                      : `${t("addElement")} ${elementIndex + 1}`}
                                                  </Text>
                                                </View>
                                              </Pressable>
                                              <View style={styles.stepActions}>
                                                <Pressable
                                                  accessibilityLabel="Przenieś element wyżej"
                                                  accessibilityRole="button"
                                                  disabled={elementIndex === 0}
                                                  style={[
                                                    styles.stepActionButton,
                                                    { opacity: elementIndex === 0 ? 0.35 : 1 }
                                                  ]}
                                                  onPress={() => moveStep(element.id, -1)}
                                                >
                                                  <Ionicons name="arrow-up" size={19} color={theme.primary} />
                                                </Pressable>
                                                <Pressable
                                                  accessibilityLabel="Przenieś element niżej"
                                                  accessibilityRole="button"
                                                  disabled={elementIndex === elements.length - 1}
                                                  style={[
                                                    styles.stepActionButton,
                                                    { opacity: elementIndex === elements.length - 1 ? 0.35 : 1 }
                                                  ]}
                                                  onPress={() => moveStep(element.id, 1)}
                                                >
                                                  <Ionicons name="arrow-down" size={19} color={theme.primary} />
                                                </Pressable>
                                                <Pressable
                                                  accessibilityLabel="Usuń element"
                                                  accessibilityRole="button"
                                                  style={styles.stepActionButton}
                                                  onPress={() => removeStep(element.id)}
                                                >
                                                  <Ionicons name="trash-outline" size={20} color={theme.danger} />
                                                </Pressable>
                                              </View>
                                            </View>

                                            {!elementCollapsed && (
                                          <StepConfiguration
                                            favoriteExerciseIds={favoriteExerciseIds}
                                            language={language}
                                            onToggleFavoriteExercise={onToggleFavoriteExercise}
                                            parentStageType={stage.stageType}
                                            step={element}
                                            t={t}
                                            theme={theme}
                                            typeLabel={t("type")}
                                            updateStep={updateStep}
                                          />
                                            )}
                                          </View>
                                        );
                                      })}
                                    </View>
                                  )}
                                </View>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              </>
            )}
          </View>
        );
      })}

    </View>
  );
}
