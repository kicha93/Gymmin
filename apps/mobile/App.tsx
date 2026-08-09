import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts } from "expo-font";
import * as Clipboard from "expo-clipboard";
import { config as gluestackConfig } from "@gluestack-ui/config";
import {
  GluestackUIProvider
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
  Linking,
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

import { GYMMIN_SUPPORT_URL } from "./src/domain/appAttribution";
import { getSafeDeviceReportInfo } from "./src/platform/deviceInfo";
import { BUG_REPORT_EMAIL, prepareBugReportEmail } from "./src/domain/bugReportEmail";
import { cleanupLegacyAuthCredentials } from "./src/domain/legacyAuthCleanup";
import { createLocalUserProfileBackup, emptyLocalUserProfile } from "./src/domain/localUserProfile";
import { createDefaultAppSettings } from "./src/domain/appSettings";
import { assertLocalDataDeletionAllowed, deleteAllGymminUserData } from "./src/domain/localDataDeletion";
import {
  achievementDefinitions,
  ACHIEVEMENTS_STORAGE_BASE_KEY,
  addForegroundUsageSeconds,
  APP_USAGE_STATS_STORAGE_BASE_KEY,
  calculateAchievementMetrics,
  evaluateAchievements,
  getAchievementProgress,
  getDefaultAppUsageStats,
  getNewUserAchievementUnlocks,
  loadAppUsageStats,
  loadUserAchievements,
  saveAppUsageStats,
  saveUserAchievements,
  type AppUsageStats,
  type UserAchievement
} from "./src/domain/achievements";
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
  normalizeWorkoutSessions,
  recoverWorkoutRestSecondsFromSessions,
  workoutHasHistory,
  WORKOUT_SESSIONS_STORAGE_BASE_KEY,
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
  removeFavoriteExercise,
  saveFavoriteExercises,
  toggleFavoriteExercise,
  FAVORITE_EXERCISES_STORAGE_BASE_KEY,
} from "./src/domain/favoriteExercises";
import type { FavoriteExercise } from "./src/domain/favoriteExercises";
import {
  WEEKLY_PLAN_STORAGE_BASE_KEY,
  formatWeekRange,
  getCurrentWeekRange,
  getActiveWeeklyPlanWorkouts,
  getDefaultWeeklyPlanSettings,
  getWeeklyPlanDay,
  getWeeklyPlanSummary,
  loadWeeklyPlan,
  removeWeeklyPlanItem,
  saveWeeklyPlan,
  toggleWeeklyPlanItemDay,
  upsertWeeklyPlanItem
} from "./src/domain/weeklyPlan";
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
  getDiagnosticsSnapshot
} from "./src/domain/appDiagnostics";
import {
  getExerciseProgressHistoryGroups
} from "./src/domain/exerciseProgressHistory";
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
import { AiCopyPasteFlow } from "./src/components/AiCopyPasteFlow";
import {
  applyAiRewrite,
  buildAiWorkoutPrompt,
  canApplyAiWorkoutResult,
  parseAiWorkoutResponse,
  replaceUnknownExercise,
  type AiWorkoutImportResult
} from "./src/domain/aiCopyPaste";
import { translate, type LanguageCode, type TranslationKey } from "./src/i18n/translations";
import { ContactScreen } from "./src/screens/ContactScreen";
import { BugReportScreen } from "./src/screens/BugReportScreen";
import { ProfileScreen } from "./src/screens/ProfileScreen";
import { AchievementsScreen } from "./src/screens/AchievementsScreen";
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
import { useLocalWorkouts } from "./src/features/workouts/useLocalWorkouts";
import { useWorkoutEditorController } from "./src/features/workouts/useWorkoutEditorController";
import { useLocalCreatorProfiles } from "./src/features/workoutCreator/useLocalCreatorProfiles";
import { useLocalWeeklyPlan } from "./src/features/weeklyPlan/useLocalWeeklyPlan";
import { useAccountStorageMigration } from "./src/features/storage/useAccountStorageMigration";
import { LocalOnlyStorageMigrationScreen } from "./src/features/storage/LocalOnlyStorageMigrationScreen";
import {
  createGymminBackup,
  getGymminBackupSummary,
  parseGymminBackup,
  type GymminBackupV1
} from "./src/domain/localBackup/gymminBackup";
import {
  exportGymminBackupFile,
  GymminBackupCancelledError,
  pickGymminBackupFile
} from "./src/domain/localBackup/gymminBackupFileService";
import {
  importGymminBackupTransaction
} from "./src/domain/localBackup/gymminBackupStorage";
import { useLocalUserProfile } from "./src/features/profile/useLocalUserProfile";
import { useLocalWorkoutSessions } from "./src/features/workoutSessions/useLocalWorkoutSessions";
import { useActiveWorkoutController } from "./src/features/workoutSessions/useActiveWorkoutController";
import { useLocalSettings } from "./src/features/settings/useLocalSettings";
import { useLocalFavoriteExercises } from "./src/features/favorites/useLocalFavoriteExercises";
import { useLocalAchievements } from "./src/features/achievements/useLocalAchievements";
import { useWorkoutReminderScheduling } from "./src/features/reminders/useWorkoutReminderScheduling";
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

const defaultCollapsedPanels: Record<string, boolean> = {
  "settings-data": true,
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
  const [isWorkoutSortSheetOpen, setIsWorkoutSortSheetOpen] = useState(false);
  const [isLocalDataOperationRunning, setIsLocalDataOperationRunning] = useState(false);
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
  const [achievementToast, setAchievementToast] = useState<{ title: string; extraCount: number } | null>(null);
  const [isAvatarSubmitting, setIsAvatarSubmitting] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState("");
  const [hasLocalAvatarLoadFailed, setHasLocalAvatarLoadFailed] = useState(false);
  const [bugTitle, setBugTitle] = useState("");
  const [bugDescription, setBugDescription] = useState("");
  const [bugFormError, setBugFormError] = useState("");
  const [bugFallbackReport, setBugFallbackReport] = useState("");
  const [isBugSubmitting, setIsBugSubmitting] = useState(false);
  const [creatorDraft, setCreatorDraft] = useState<WorkoutCreatorDraft>({});
  const [creatorPhase, setCreatorPhase] = useState<WorkoutCreatorPhase>("form");
  const [creatorSubmitError, setCreatorSubmitError] = useState("");
  const [creatorAiPrompt, setCreatorAiPrompt] = useState("");
  const [creatorAiResponse, setCreatorAiResponse] = useState("");
  const [creatorAiResult, setCreatorAiResult] = useState<AiWorkoutImportResult | null>(null);
  const [rewriteInstruction, setRewriteInstruction] = useState("");
  const [rewriteError, setRewriteError] = useState("");
  const [isRewriteSubmitting, setIsRewriteSubmitting] = useState(false);
  const [rewriteSourceWorkoutId, setRewriteSourceWorkoutId] = useState<string | null>(null);
  const [rewriteAiPrompt, setRewriteAiPrompt] = useState("");
  const [rewriteAiResponse, setRewriteAiResponse] = useState("");
  const [rewriteAiResult, setRewriteAiResult] = useState<AiWorkoutImportResult | null>(null);
  const [creatorCollapsedSections, setCreatorCollapsedSections] = useState<Record<string, boolean>>({});
  const [creatorProfileName, setCreatorProfileName] = useState("");
  const [trainingFactIndex, setTrainingFactIndex] = useState(0);
  const [readOnlyWorkoutCollapsedPanels, setReadOnlyWorkoutCollapsedPanels] = useState<Record<string, boolean>>({});
  const {
    error: accountStorageMigrationError,
    hasLoaded: hasLoadedAccountStorageMigration,
    isSelecting: isSelectingAccountStorageSource,
    retry: retryAccountStorageMigration,
    selectSource: selectAccountStorageSource,
    sources: accountStorageMigrationSources
  } = useAccountStorageMigration();
  const {
    avatarUri: localAvatarUri,
    clearAvatar: clearLocalAvatar,
    profile: localUserProfile,
    setAvatar: setLocalAvatar,
    setDisplayName: setLocalProfileDisplayName,
    setProfile: setLocalUserProfile
  } = useLocalUserProfile(hasLoadedAccountStorageMigration);
  const {
    hasLoadedWeeklyPlan,
    hadPersistedWeeklyPlanOnLoad,
    weeklyPlan,
    setWeeklyPlan
  } = useLocalWeeklyPlan(hasLoadedAccountStorageMigration);
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
    isApplyingSettingsRef,
    language,
    localSettingsUpdatedAt,
    setCollapsedPanels,
    setDefaultSetCount,
    setDefaultStageType,
    setDefaultWeight,
    setDefaultWorkoutExecutionMode,
    setLanguage,
    setLocalSettingsUpdatedAt,
    setShowRestTimer,
    setThemeName,
    setWorkoutReminders,
    showRestTimer,
    themeName,
    workoutReminders
  } = useLocalSettings(hasLoadedAccountStorageMigration, defaultCollapsedPanels);
  const {
    activeWorkoutSessionEntryIndexRef,
    activeWorkoutSessionId,
    hasLoadedWorkoutSessions,
    sessionEntryIndex,
    setActiveWorkoutSessionId,
    setSessionEntryIndex,
    setWorkoutSessions,
    workoutSessions
  } = useLocalWorkoutSessions(hasLoadedAccountStorageMigration);
  const {
    hasLoadedLocalWorkouts,
    savedWorkouts,
    selectedWorkoutId,
    setSavedWorkouts,
    setSelectedWorkoutId,
    setWorkoutSort,
    workoutSort
  } = useLocalWorkouts(hasLoadedAccountStorageMigration, initialWorkouts as SavedWorkout[]);
  const {
    creatorProfiles,
    hasLoadedLocalCreatorProfiles,
    selectedCreatorProfileId,
    setCreatorProfiles,
    setSelectedCreatorProfileId
  } = useLocalCreatorProfiles(hasLoadedAccountStorageMigration);
  const {
    favoriteExercises,
    hasLoadedFavoriteExercises,
    setFavoriteExercises
  } = useLocalFavoriteExercises(hasLoadedAccountStorageMigration);
  const validFavoriteExerciseIds = useMemo(
    () => getValidFavoriteExerciseIds(favoriteExercises),
    [favoriteExercises]
  );
  const {
    appUsageStats,
    hasLoadedAchievements,
    setAppUsageStats,
    setUserAchievements,
    userAchievements
  } = useLocalAchievements();
  const theme = themes[themeName];
  const isDarkMode = themeName === "dark";
  const t = (key: TranslationKey) => translate(language, key);
  const userAvatarSource = localAvatarUri && !hasLocalAvatarLoadFailed ? { uri: localAvatarUri } : null;
  const mainScrollRef = useRef<ScrollView | null>(null);
  const appUsageStartedAtRef = useRef<number | null>(Date.now());
  useEffect(() => {
    if (
      !hasLoadedLocalWorkouts
      || !hasLoadedWorkoutSessions
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
    workoutSessions
  ]);
  const {
    setStatus: setReminderSchedulingStatus,
    status: reminderSchedulingStatus
  } = useWorkoutReminderScheduling({
    enabled: hasLoadedLocalSettings && hasLoadedWorkoutSessions,
    language,
    sessions: workoutSessions,
    settings: workoutReminders,
    updateSettings: updateWorkoutReminderSettings
  });
  const screenTitle = getScreenTitle(activeScreen, editingWorkoutId, t);
  const shouldShowHeaderBackButton = activeScreen !== "home";
  const shouldShowProfileHeaderButton = true;

  useEffect(() => {
    void cleanupLegacyAuthCredentials().catch((error) => {
      console.warn("Could not clean up legacy auth credentials", error);
    });
  }, []);

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
    requestAnimationFrame(() => {
      mainScrollRef.current?.scrollTo({ animated: false, y: 0 });
    });
  }, [activeScreen, selectedExerciseDetailStep?.exerciseName, selectedExerciseDetailStep?.exerciseId]);

  useEffect(() => {
    if (!hasLoadedLocalSettings) {
      return;
    }

    setPendingLanguage(language);
    setPendingDefaultSetCount(defaultSetCount);
    setPendingDefaultWeight(defaultWeight);
    setPendingDefaultStageType(defaultStageType);
    setPendingDefaultWorkoutExecutionMode(defaultWorkoutExecutionMode);
    setPendingWorkoutReminderDay(null);
  }, [hasLoadedLocalSettings]);

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
    if (!hasLoadedAchievements) {
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
  }, [achievementMetrics, hasLoadedAchievements, language, userAchievements]);

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
      await cancelWorkoutReminders();
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

  function openWorkoutCreator() {
    setCreatorDraft({});
    setCreatorProfileName("");
    setSelectedCreatorProfileId(null);
    setCreatorCollapsedSections({});
    setCreatorSubmitError("");
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

  function buildWorkoutCreatorQuestionsAndAnswers(): Array<{ Answer: string; Question: string }> {
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

  async function finishWorkoutCreatorRequest(_profileId = selectedCreatorProfileId) {
    const questionsAndAnswers = buildWorkoutCreatorQuestionsAndAnswers();
    const hasAnyAnswer = questionsAndAnswers.some((item) => item.Answer.trim());
    if (!hasAnyAnswer) {
      setCreatorSubmitError(t("aiCreatorSubmitError"));
      return;
    }
    setCreatorSubmitError("");
    setCreatorAiPrompt(buildAiWorkoutPrompt({ creatorDraft, language, mode: "create" }));
    setCreatorAiResponse("");
    setCreatorAiResult(null);
    setCreatorPhase("form");
  }

  async function submitWorkoutRewrite() {
    const sourceWorkout = savedWorkouts.find((item) => item.id === (rewriteSourceWorkoutId ?? selectedWorkoutId));
    const instruction = rewriteInstruction.trim();

    if (isRewriteSubmitting) {
      return;
    }

    if (!sourceWorkout) {
      setRewriteError(t("noWorkout"));
      return;
    }

    if (!instruction) {
      setRewriteError(t("aiRewriteRequired"));
      return;
    }

    setRewriteError("");
    setRewriteAiPrompt(buildAiWorkoutPrompt({ instruction, language, mode: "rewrite", sourceWorkout }));
    setRewriteAiResponse("");
    setRewriteAiResult(null);
  }

  function applyCreatedAiWorkouts() {
    if (!canApplyAiWorkoutResult(creatorAiResult)) return;
    const imported = creatorAiResult!.workouts.map((item, index) => ({
      ...item,
      createdAt: new Date(Date.now() + index).toISOString(),
      id: `workout-${Date.now()}-${index}`
    }));
    setSavedWorkouts((current) => [...imported, ...current]);
    setSelectedWorkoutId(imported[0]?.id ?? "");
    setCreatorAiPrompt("");
    setCreatorAiResponse("");
    setCreatorAiResult(null);
    setActiveScreen("workouts");
  }

  function applyLocalAiRewrite() {
    if (!canApplyAiWorkoutResult(rewriteAiResult) || !rewriteSourceWorkout) return;
    const nextWorkout = applyAiRewrite(rewriteSourceWorkout, rewriteAiResult!.workouts[0]);
    setSavedWorkouts((current) => current.map((item) => item.id === nextWorkout.id ? nextWorkout : item));
    setSelectedWorkoutId(nextWorkout.id);
    setRewriteAiPrompt("");
    setRewriteAiResponse("");
    setRewriteAiResult(null);
    setActiveScreen("workoutDetail");
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
          setWorkoutSessions((current) => current.filter((item) => item.id !== sessionId));
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

  async function changeUserAvatar() {
    setIsAvatarSubmitting(true);
    setAvatarMessage("");

    try {
      const ImagePicker = await import("expo-image-picker");
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
      await setLocalAvatar(asset.uri, asset.mimeType);
      setHasLocalAvatarLoadFailed(false);
      setAvatarMessage(t("avatarUpdated"));
    } catch (error) {
      console.error("Failed to store local avatar", error instanceof Error ? error.message : "unknown error");
      setAvatarMessage(t("avatarUploadError"));
    } finally {
      setIsAvatarSubmitting(false);
    }
  }

  async function removeUserAvatar() {
    setIsAvatarSubmitting(true);
    setAvatarMessage("");

    try {
      await clearLocalAvatar();
      setHasLocalAvatarLoadFailed(false);
      setAvatarMessage(t("avatarRemoved"));
    } catch (error) {
      console.error("Failed to remove local avatar", error instanceof Error ? error.message : "unknown error");
      setAvatarMessage(t("avatarRemoveError"));
    } finally {
      setIsAvatarSubmitting(false);
    }
  }

  async function submitBugReport() {
    const normalizedDescription = bugDescription.trim();
    if (!normalizedDescription) {
      setBugFormError(t("bugValidation"));
      return;
    }

    setBugFormError("");
    setBugFallbackReport("");
    setIsBugSubmitting(true);
    const prepared = prepareBugReportEmail({
      currentScreen: getScreenTitle(activeScreen, editingWorkoutId, t),
      description: normalizedDescription,
      device: getSafeDeviceReportInfo(),
      language,
      recentEvents: getDiagnosticsSnapshot().recentEvents,
      title: bugTitle.trim()
    });

    try {
      const canOpenEmail = await Linking.canOpenURL(prepared.mailtoUrl);
      if (!canOpenEmail) {
        setBugFallbackReport(prepared.body);
        setBugFormError(t("bugSubmitError"));
        return;
      }
      await Linking.openURL(prepared.mailtoUrl);
    } catch (error) {
      console.warn("Could not open bug report email", error instanceof Error ? error.message : "unknown error");
      addDiagnosticEvent({
        area: "ui",
        level: "warn",
        message: "Could not open the system email client",
        screen: activeScreen
      });
      setBugFallbackReport(prepared.body);
      setBugFormError(t("bugSubmitError"));
    } finally {
      setIsBugSubmitting(false);
    }
  }

  async function copyBugReportEmail() {
    await Clipboard.setStringAsync(BUG_REPORT_EMAIL);
  }

  async function copyPreparedBugReport() {
    if (bugFallbackReport) await Clipboard.setStringAsync(bugFallbackReport);
  }

  function openProfile() {
    setActiveScreen("profile");
  }

  function showInfoDialog(title: string, message?: string) {
    setAppDialog({
      actions: [{ label: t("bugSuccessOk"), variant: "primary" }],
      message: message || title,
      title
    });
  }

  async function openGymminSupportPage() {
    try {
      await Linking.openURL(GYMMIN_SUPPORT_URL);
    } catch (error) {
      console.error("Failed to open the Gymmin support page", error instanceof Error ? error.message : "unknown error");
      showInfoDialog(t("supportLinkErrorTitle"), t("supportLinkErrorCopy"));
    }
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

  function buildLocalBackup(profile: Awaited<ReturnType<typeof createLocalUserProfileBackup>>) {
    const settings = buildCurrentSettingsPayload();
    const { updatedAt: _settingsUpdatedAt, ...stableSettings } = settings;
    const { updatedAt: _weeklyUpdatedAt, ...stableWeeklyPlan } = weeklyPlan;
    return createGymminBackup({
      profile,
      achievements: {
        appUsage: { totalForegroundSeconds: appUsageStats.totalForegroundSeconds },
        unlocked: userAchievements.map(({ updatedAt: _updatedAt, ...achievement }) => achievement)
      },
      creatorProfiles: { items: creatorProfiles, selectedProfileId: selectedCreatorProfileId },
      favoriteExercises,
      settings: stableSettings,
      weeklyPlan: stableWeeklyPlan,
      workoutSessions: {
        active: activeWorkoutSessionId
          ? { entryIndex: sessionEntryIndex, sessionId: activeWorkoutSessionId }
          : null,
        items: workoutSessions
      },
      workouts: { items: savedWorkouts, selectedWorkoutId, sort: workoutSort }
    }, { appVersion: "1.0.0" });
  }

  function requestCreateLocalBackup() {
    showConfirmDialog({
      confirmLabel: t("createBackup"),
      message: t("backupPrivacyWarning"),
      onConfirm: () => { void createLocalBackup(); },
      title: t("createBackup")
    });
  }

  async function createLocalBackup() {
    setIsLocalDataOperationRunning(true);
    try {
      const profile = await createLocalUserProfileBackup(localUserProfile);
      const backup = buildLocalBackup(profile);
      await exportGymminBackupFile(backup, language);
      showInfoDialog(t("backupCreated"), t("backupCreatedDescription"));
    } catch (error) {
      if (!(error instanceof GymminBackupCancelledError)) {
        console.error("Failed to create local backup", error instanceof Error ? error.message : "unknown error");
        showInfoDialog(t("backupFailed"), t("backupFailedDescription"));
      }
    } finally {
      setIsLocalDataOperationRunning(false);
    }
  }

  async function selectLocalBackupForRestore() {
    setIsLocalDataOperationRunning(true);
    try {
      const raw = await pickGymminBackupFile();
      const backup = parseGymminBackup(raw, defaultCollapsedPanels);
      const summary = getGymminBackupSummary(backup);
      showConfirmDialog({
        confirmLabel: t("restoreBackup"),
        message: [
          `${t("backupCreatedAt")}: ${formatDateTime(summary.createdAt)}`,
          `${t("workouts")}: ${summary.workoutCount}`,
          `${t("completedSessions")}: ${summary.sessionCount}`,
          `${t("achievements")}: ${summary.achievementCount}`,
          `${t("favoriteExercises")}: ${summary.favoriteCount}`,
          `${t("weeklyPlan")}: ${summary.weeklyPlanItemCount}`,
          `${t("creatorProfiles")}: ${summary.creatorProfileCount}`,
          "",
          t("restoreReplacementWarning")
        ].join("\n"),
        onConfirm: () => { void restoreLocalBackup(backup); },
        title: t("restoreBackup")
      });
    } catch (error) {
      if (!(error instanceof GymminBackupCancelledError)) {
        console.error("Failed to inspect local backup", error instanceof Error ? error.message : "unknown error");
        showInfoDialog(t("restoreFailed"), t("restoreInvalidDescription"));
      }
    } finally {
      setIsLocalDataOperationRunning(false);
    }
  }

  async function restoreLocalBackup(backup: GymminBackupV1) {
    setIsLocalDataOperationRunning(true);
    try {
      await importGymminBackupTransaction(backup);
      const { data } = backup;
      const restoredProfile = await import("./src/domain/localUserProfile").then(({ loadLocalUserProfile }) => loadLocalUserProfile());
      setLocalUserProfile(restoredProfile);
      setHasLocalAvatarLoadFailed(false);
      setSavedWorkouts(data.workouts.items);
      setSelectedWorkoutId(data.workouts.selectedWorkoutId ?? "");
      setWorkoutSort(data.workouts.sort);
      setWorkoutSessions(data.workoutSessions.items);
      setActiveWorkoutSessionId(data.workoutSessions.active?.sessionId ?? null);
      setSessionEntryIndex(data.workoutSessions.active?.entryIndex ?? 0);
      applyAccountSettingsState({ ...data.settings, updatedAt: backup.createdAt });
      setWeeklyPlan({ ...data.weeklyPlan, updatedAt: backup.createdAt });
      setCreatorProfiles(data.creatorProfiles.items);
      setSelectedCreatorProfileId(data.creatorProfiles.selectedProfileId);
      setFavoriteExercises(data.favoriteExercises);
      setUserAchievements(data.achievements.unlocked.map((achievement) => ({ ...achievement, updatedAt: achievement.unlockedAt })));
      setAppUsageStats({ ...data.achievements.appUsage, updatedAt: backup.createdAt });
      showInfoDialog(t("backupRestored"), t("backupRestoredDescription"));
    } catch (error) {
      console.error("Failed to restore local backup", error instanceof Error ? error.message : "unknown error");
      showInfoDialog(t("restoreFailed"), t("restoreFailedDescription"));
    } finally {
      setIsLocalDataOperationRunning(false);
    }
  }

  function requestDeleteAllLocalData() {
    showConfirmDialog({
      confirmLabel: t("next"),
      message: t("deleteAllLocalDataWarning"),
      title: t("deleteAllLocalDataTitle"),
      variant: "destructive",
      onConfirm: () => showConfirmDialog({
        confirmLabel: t("deleteAllLocalData"),
        message: t("deleteAllLocalDataConfirm"),
        title: t("deleteAllLocalDataConfirmTitle"),
        variant: "destructive",
        onConfirm: () => { void performDeleteAllLocalData(); }
      })
    });
  }

  async function performDeleteAllLocalData() {
    setIsLocalDataOperationRunning(true);
    try {
      // Refuse before any destructive side effect when a legacy import is still recoverable.
      await assertLocalDataDeletionAllowed();
      await cancelWorkoutReminders();
      await clearLocalAvatar();
      await deleteAllGymminUserData();

      activeWorkoutSessionEntryIndexRef.current = {};
      setSavedWorkouts(initialWorkouts as SavedWorkout[]);
      setSelectedWorkoutId((initialWorkouts as SavedWorkout[])[0]?.id ?? "");
      setWorkoutSort(defaultWorkoutSort);
      setWorkoutSessions([]);
      setActiveWorkoutSessionId(null);
      setSessionEntryIndex(0);
      applyAccountSettingsState(createDefaultAppSettings(defaultCollapsedPanels));
      setWeeklyPlan(getDefaultWeeklyPlanSettings());
      setCreatorProfiles([]);
      setSelectedCreatorProfileId(null);
      setFavoriteExercises([]);
      setUserAchievements([]);
      setAppUsageStats(getDefaultAppUsageStats());
      setLocalUserProfile(emptyLocalUserProfile);
      setCreatorDraft({});
      setCreatorProfileName("");
      setCreatorAiPrompt("");
      setCreatorAiResponse("");
      setCreatorAiResult(null);
      setCreatorSubmitError("");
      setCreatorPhase("form");
      setActiveScreen("home");
      showInfoDialog(t("deleteAllLocalData"), t("deleteAllLocalDataDone"));
    } catch (error) {
      console.error("Failed to delete all local data", error instanceof Error ? error.message : "unknown error");
      showInfoDialog(t("deleteAllLocalData"), t("deleteAllLocalDataFailed"));
    } finally {
      setIsLocalDataOperationRunning(false);
    }
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

    if (activeScreen === "workoutAiRewrite") {
      setActiveScreen("workoutDetail");
      return true;
    }

    if (activeScreen === "achievements") {
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

    if (activeScreen === "favoriteExercises") {
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

    if (activeScreen === "profile") {
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
    return (
      <HomeScreen
        activeWeeklyWorkouts={activeWeeklyWorkouts}
        activeSessionCard={renderActiveWorkoutSessionCard()}
        collapsedPanels={collapsedPanels}
        language={language}
        savedWorkouts={savedWorkouts}
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
        fallbackReport={bugFallbackReport}
        isSubmitting={isBugSubmitting}
        t={t}
        theme={theme}
        title={bugTitle}
        onBack={() => setActiveScreen("settings")}
        onChangeDescription={setBugDescription}
        onChangeTitle={setBugTitle}
        onCopyEmail={() => void copyBugReportEmail()}
        onCopyReport={() => void copyPreparedBugReport()}
        onSubmit={() => void submitBugReport()}
      />
    );
  }

  function renderProfile() {
    const unlockedCount = unlockedAchievementProgress.length;
    const totalCount = achievementProgress.length;

    return (
      <ProfileScreen
        achievementPercent={totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0}
        avatarMessage={avatarMessage}
        avatarMessageIsSuccess={avatarMessage === t("avatarUpdated") || avatarMessage === t("avatarRemoved")}
        avatarSource={userAvatarSource}
        displayName={localUserProfile.displayName ?? ""}
        isAvatarSubmitting={isAvatarSubmitting}
        latestAchievementTitle={latestUnlockedAchievement?.definition.title[language]}
        onAvatarLoadError={() => setHasLocalAvatarLoadFailed(true)}
        t={t}
        theme={theme}
        totalAchievements={totalCount}
        unlockedAchievements={unlockedCount}
        onChangeAvatar={changeUserAvatar}
        onDisplayNameChange={setLocalProfileDisplayName}
        onRemoveAvatar={removeUserAvatar}
        onOpenAchievements={() => setActiveScreen("achievements")}
        onOpenSessions={() => setActiveScreen("workoutHistory")}
        onOpenBugReport={() => setActiveScreen("bugReport")}
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

  if (
    isAppLoading
    || (!hasLoadedAccountStorageMigration
      && accountStorageMigrationSources.length === 0
      && !accountStorageMigrationError)
  ) {
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

  if (!hasLoadedAccountStorageMigration) {
    return (
      <LocalOnlyStorageMigrationScreen
        error={accountStorageMigrationError}
        isSelecting={isSelectingAccountStorageSource}
        language={language}
        sources={accountStorageMigrationSources}
        theme={theme}
        onRetry={() => {
          void retryAccountStorageMigration();
        }}
        onSelect={(sourceId) => {
          void selectAccountStorageSource(sourceId);
        }}
      />
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
                  onError={() => setHasLocalAvatarLoadFailed(true)}
                />
              ) : (
                <Ionicons name="person-outline" size={24} color={theme.primary} />
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
                isLocalDataOperationRunning={isLocalDataOperationRunning}
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
                onOpenSupport={() => { void openGymminSupportPage(); }}
                onCreateBackup={requestCreateLocalBackup}
                onDeleteAllData={requestDeleteAllLocalData}
                onOpenFavoriteExercises={() => setActiveScreen("favoriteExercises")}
                onOpenReminderDay={openWorkoutReminderDayEditor}
                onOpenReportBug={() => setActiveScreen("bugReport")}
                onOpenPrivacy={() => {
                  setPrivacyReturnScreen("settings");
                  setActiveScreen("privacy");
                }}
                onRestoreBackup={() => { void selectLocalBackupForRestore(); }}
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
              creatorAiPrompt ? (
                <AiCopyPasteFlow
                  canApply={canApplyAiWorkoutResult(creatorAiResult)}
                  language={language}
                  prompt={creatorAiPrompt}
                  response={creatorAiResponse}
                  result={creatorAiResult}
                  t={t}
                  theme={theme}
                  onApply={applyCreatedAiWorkouts}
                  onParse={() => setCreatorAiResult(parseAiWorkoutResponse(creatorAiResponse))}
                  onReplaceExercise={(stepId, exerciseId) => setCreatorAiResult((current) => current
                    ? replaceUnknownExercise(current, stepId, exerciseId)
                    : current)}
                  onResponseChange={(value) => {
                    setCreatorAiResponse(value);
                    setCreatorAiResult(null);
                  }}
                />
              ) : (
                <WorkoutCreatorScreen
                  collapsedSections={creatorCollapsedSections}
                  draft={creatorDraft}
                  language={language}
                  phase={creatorPhase}
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
                  onProfileNameChange={setCreatorProfileName}
                  onSaveProfileAndSubmit={saveCreatorProfileAndSubmit}
                  onSendWithoutSaving={() => void finishWorkoutCreatorRequest()}
                  onSubmit={submitWorkoutCreatorForm}
                  onToggleSection={toggleCreatorSection}
                  onUpdateProfileAndSubmit={updateCreatorProfileAndSubmit}
                />
              )
            )}
            {activeScreen === "workoutAiRewrite" && (
              rewriteAiPrompt ? (
                <AiCopyPasteFlow
                  canApply={canApplyAiWorkoutResult(rewriteAiResult)}
                  language={language}
                  prompt={rewriteAiPrompt}
                  response={rewriteAiResponse}
                  result={rewriteAiResult}
                  t={t}
                  theme={theme}
                  onApply={applyLocalAiRewrite}
                  onParse={() => setRewriteAiResult(parseAiWorkoutResponse(rewriteAiResponse))}
                  onReplaceExercise={(stepId, exerciseId) => setRewriteAiResult((current) => current
                    ? replaceUnknownExercise(current, stepId, exerciseId)
                    : current)}
                  onResponseChange={(value) => {
                    setRewriteAiResponse(value);
                    setRewriteAiResult(null);
                  }}
                />
              ) : (
                <WorkoutAiRewriteScreen
                  error={rewriteError}
                  instruction={rewriteInstruction}
                  sourceWorkout={rewriteSourceWorkout}
                  t={t}
                  theme={theme}
                  onInstructionChange={(value) => {
                    setRewriteInstruction(value);
                    if (rewriteError) setRewriteError("");
                  }}
                  onSubmit={() => void submitWorkoutRewrite()}
                />
              )
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
                onModifyWithAi={(workoutId) => {
                  setRewriteSourceWorkoutId(workoutId);
                  setRewriteInstruction("");
                  setRewriteError("");
                  setRewriteAiPrompt("");
                  setRewriteAiResponse("");
                  setRewriteAiResult(null);
                  setActiveScreen("workoutAiRewrite");
                }}
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
            {activeScreen === "profile" && renderProfile()}
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
