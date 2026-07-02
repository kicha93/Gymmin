import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { config as gluestackConfig } from "@gluestack-ui/config";
import {
  Button,
  ButtonText,
  ChevronDownIcon,
  GluestackUIProvider,
  Input,
  InputField,
  Select,
  SelectBackdrop,
  SelectContent,
  SelectIcon,
  SelectInput,
  SelectItem,
  SelectPortal,
  SelectScrollView,
  SelectTrigger,
  Textarea,
  TextareaInput
} from "@gluestack-ui/themed";
import { ErrorBoundary } from "react-error-boundary";
import type { FallbackProps } from "react-error-boundary";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgXml } from "react-native-svg";
import {
  Alert,
  Animated,
  BackHandler,
  Dimensions,
  Linking,
  Modal,
  NativeModules,
  Platform,
  Pressable,
  SafeAreaView,
  SectionList,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import type { TextInputProps } from "react-native";

import { BUILD_API_BASE_URL } from "./src/config/buildConfig";
import {
  GoalType,
  StageType,
  TargetComparator,
  WorkoutDraft,
  WorkoutStep,
  WorkoutStepKind,
  createDefaultWorkout,
  createStep
} from "./src/domain/workouts";
import {
  abandonWorkoutSession,
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
import type {
  ExerciseProgressItem,
  ExerciseProgressResult,
  WorkoutExecutionMode,
  WorkoutSession,
  WorkoutSessionEntry,
  WorkoutSessionStatus
} from "./src/domain/workoutSessions";
import {
  buildExerciseSections,
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
  muscleKeys
} from "./src/domain/exercises";
import type { Exercise, ExerciseOption, ExerciseSection, MuscleKey } from "./src/domain/exercises";
import {
  formatExerciseSetTarget,
  getExerciseDetails,
  getExerciseProgressKeyForDetails,
  getExerciseTargetDisplay,
  isRestTargetStep,
  getWorkoutStepMuscleGroups,
  resolveWorkoutStartExecutionMode
} from "./src/domain/workoutExerciseSummary";
import {
  addFavoriteExercise,
  getActiveFavoriteExercises,
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
  setLastAccountUserId
} from "./src/domain/accountStorage";
import {
  WORKOUT_REMINDER_NOTIFICATION_IDS_BASE_KEY,
  cancelWorkoutReminders,
  getDefaultWorkoutReminderSettings,
  normalizeWorkoutReminderSettings,
  requestWorkoutReminderPermissions,
  rescheduleWorkoutReminders
} from "./src/domain/workoutReminders";
import type { WorkoutReminderSettings } from "./src/domain/workoutReminders";
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
  getAiCreditProducts,
  getPendingAiCreditPurchases,
  initBilling,
  mapBillingError,
  purchaseAiCreditPack
} from "./src/domain/googlePlayBilling";
import {
  backBodyRegionMap,
  backBodySvg,
  frontBodyRegionMap,
  frontBodySvg
} from "./src/domain/bodyMaps";
import { articles, getArticleTranslation } from "./src/domain/articles";
import type { Article } from "./src/domain/articles";
import { GymminLogo, GymminMark } from "./src/components/GymminLogo";

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
const localSettingsLegacyStorageKey = "gymmin.localSettings.v1";
const localSettingsStorageBaseKey = "localSettings.v1";
const localCreatorProfilesLegacyStorageKey = "gymmin.localCreatorProfiles.v1";
const localCreatorProfilesStorageBaseKey = "localCreatorProfiles.v1";
const localCreatorJobLegacyStorageKey = "gymmin.localCreatorJob.v1";
const localCreatorJobStorageBaseKey = "localCreatorJob.v1";
const anonymousMergeHandledStorageBaseKey = "anonymousMergeHandled.v1";
const localAuthStorageKey = "gymmin.localAuth.v1";

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

type LanguageCode = "pl" | "en";

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
  | "workoutReminderTime";

const translations = {
  pl: {
    addElement: "Element",
    addNewWorkout: "Dodaj nowy trening",
    workoutCreatorCta: "Kreator treningu",
    workoutCreatorLoginCta: "Kreator treningu",
    workoutCreatorLoginTooltip: "Tylko dla zalogowanych użytkowników",
    workoutCreatorPendingCta: "Trwa tworzenie planu...",
    addNotes: "Dodaj uwagi",
    addWorkoutSubtitle: "Otwórz kreator ćwiczeń, serii i obciążeń.",
    aiCreator: "Kreator",
    aiCreatorBack: "Wróć do treningów",
    aiCreatorDays: "Dni treningowe",
    aiCreatorDaysPlaceholder: "np. 3 dni w tygodniu",
    aiCreatorDoneCopy: "Plan został przygotowany przez kreatora.",
    aiCreatorDoneTitle: "Trening jest przygotowywany",
    aiCreatorGoal: "Cel treningowy",
    aiCreatorGoalPlaceholder: "np. masa mięśniowa, redukcja, siła",
    aiCreatorIntro: "Uzupełnij podstawowe informacje. Na ich podstawie AI przygotuje plan albo zada dodatkowe pytania.",
    aiCreatorMeta: "Plan z pomocą AI",
    aiCreatorNotes: "Dodatkowe informacje",
    aiCreatorNotesPlaceholder: "Sprzęt, kontuzje, ograniczenia, preferencje",
    aiCreatorProfileLoaded: "Załadowano profil",
    aiCreatorProfileName: "Nazwa profilu",
    aiCreatorProfileNamePlaceholder: "np. Jan, Kasia - redukcja",
    aiCreatorProfiles: "Profile kreatora",
    aiCreatorProfileSaveCopy: "Możesz zapisać te dane jako profil, żeby szybciej układać kolejne plany dla tej osoby.",
    aiCreatorProfileSaveTitle: "Zapisać dane jako profil?",
    aiCreatorProfileUpdateCopy: "Formularz został uzupełniony profilem. Możesz zaktualizować zapisane dane przed wysłaniem zlecenia.",
    aiCreatorProfileUpdateTitle: "Zaktualizować profil?",
    aiCreatorQuestionPlaceholder: "Odpowiedź",
    aiCreatorSaveAndSubmit: "Zapisz profil i wyślij",
    aiCreatorSendWithoutSaving: "Wyślij bez zapisywania",
    aiCreatorSentCopy: "Formularz został wysłany. Wrócisz zaraz na stronę główną.",
    aiCreatorSentOk: "OK",
    aiCreatorSentTitle: "Formularz wysłany",
    aiCreatorSubmit: "Wyślij do kreatora",
    aiCreatorSubmitting: "Kreator przygotowuje plan...",
    aiCreatorSubmitError: "Nie udało się wysłać danych do kreatora. Sprawdź backend i konfigurację OpenAI.",
    aiCreatorPendingCopy: "Plan jest już tworzony. Możesz wrócić do aplikacji później, a kreator zostanie odblokowany po odebraniu wyniku.",
    aiCreatorImportedTitle: "Treningi dodane",
    aiCreatorImportedCopy: "Nowe treningi pojawiły się na liście treningów.",
    aiCreatorResultTitle: "Wynik kreatora",
    aiCreatorUpdateAndSubmit: "Zaktualizuj i wyślij",
    aiCreatorWaitingAction: "Wróć do listy",
    aiRewriteAction: "Modyfikuj z AI",
    aiRewriteTitle: "Modyfikuj trening z AI",
    aiRewritePlaceholder: "Opisz, co chcesz zmienić w tym treningu...",
    aiRewriteRequired: "Opis zmian jest wymagany",
    aiRewriteStartError: "Nie udało się rozpocząć modyfikacji treningu",
    aiRewriteProcessing: "Trwa modyfikowanie treningu...",
    aiRewriteReady: "Modyfikacja gotowa",
    aiRewriteProposal: "Propozycja AI",
    aiRewriteSaveAsNew: "Zapisz jako nowy trening",
    aiRewriteReplaceCurrent: "Zastąp obecny trening",
    aiRewriteDiscard: "Odrzuć",
    aiRewriteReplaceConfirmTitle: "Zastąpić obecny trening?",
    aiRewriteReplaceConfirmCopy: "Ta akcja zmieni zapisany plan treningowy. Historia wykonanych treningów pozostanie bez zmian.",
    aiRewriteReplaceConfirmAction: "Zastąp",
    aiRewriteUnmatchedTitle: "Nie wszystkie ćwiczenia udało się dopasować do katalogu.",
    aiRewriteUnmatchedCopy: "Sprawdź ćwiczenia bez dopasowania przed zapisaniem treningu.",
    aiRewriteMatched: "Wszystkie ćwiczenia są dopasowane do katalogu.",
    aiRewriteSessionExpired: "Sesja wygasła. Zaloguj się ponownie.",
    aiRewriteInvalidFormat: "AI zwróciło niepoprawny format treningu",
    aiRewriteSuggestionShorten: "Skróć trening do 45 minut",
    aiRewriteSuggestionBack: "Dodaj więcej ćwiczeń na plecy",
    aiRewriteSuggestionHome: "Zamień ćwiczenia na domowe",
    aiRewriteSuggestionLegs: "Zmniejsz objętość nóg",
    aiRewriteSuggestionSets: "Zostaw ćwiczenia, ale zmniejsz liczbę serii",
    aiRewriteSuggestionCatalog: "Zamień ćwiczenia na inne z katalogu",
    aiCredits: "Tokeny AI",
    aiCreditsAvailable: "Dostępne tokeny",
    aiCreditsHistory: "Historia tokenów",
    aiCreditsUsed: "Wykorzystano token",
    aiCreditsAdded: "Dodano tokeny",
    aiCreditsEmpty: "Brak tokenów",
    aiCreditsBuy: "Kup tokeny",
    aiCreditsPurchaseSoon: "Zakup tokenów będzie dostępny wkrótce",
    aiCreditsLoadError: "Nie udało się pobrać salda tokenów",
    aiCreditsPreparingPurchase: "Trwa przygotowanie zakupu...",
    aiCreditsProcessingPurchase: "Przetwarzanie zakupu...",
    aiCreditsPurchaseCancelled: "Zakup anulowany",
    aiCreditsPurchaseCompleted: "Zakup zakończony",
    aiCreditsPurchaseAdded: "Tokeny zostały dodane",
    aiCreditsPurchaseVerifyError: "Nie udało się potwierdzić zakupu",
    aiCreditsPurchasePending: "Zakup oczekuje na płatność",
    aiCreditsPurchaseRetry: "Spróbuj ponownie",
    aiCreditsRestorePurchases: "Przywróć oczekujące zakupy",
    aiCreditsBillingUnavailable: "Zakupy Google Play są niedostępne w tym buildzie lub na tym urządzeniu.",
    aiCreditsDescription: "1 token AI = 1 wygenerowanie albo modyfikacja treningu przez AI.",
    aiCreditsPlanCost: "Koszt stworzenia planu",
    aiCreditsRewriteCost: "Koszt modyfikacji treningu",
    aiCreditsGenerateNeed: "Do wygenerowania planu potrzebujesz 1 tokenu AI.",
    aiCreditsRewriteNeed: "Do modyfikacji treningu potrzebujesz 1 tokenu AI.",
    aiCreditsInsufficient: "Nie masz wystarczającej liczby tokenów AI.",
    aiCreditsGoTo: "Przejdź do tokenów AI",
    aiCreditsCharged: "Token został pobrany po rozpoczęciu generowania.",
    aiCreditsDevGrant: "Dodaj testowe tokeny",
    appLanguage: "Język aplikacji",
    ascending: "Rosnąco",
    articles: "Artykuły",
    backToSettings: "Wróć do ustawień",
    backToStart: "Wróć do startu",
    bugAccepted: "Zgłoszenie zostało przyjęte. Dziękujemy za pomoc w ulepszaniu aplikacji.",
    bugIntro: "Opisz problem, a zgłoszenie zostanie przekazane do zespołu Gymmin.",
    bugReport: "Zgłoś błąd",
    bugReportMeta: "Formularz zgłoszenia problemu",
    bugTitle: "Tytuł problemu",
    bugTitlePlaceholder: "np. Nie mogę zapisać treningu",
    bugDescription: "Opis",
    bugDescriptionPlaceholder: "Co się stało i na którym ekranie?",
    bugSubmitError: "Nie udało się wysłać zgłoszenia. Sprawdź połączenie i konfigurację backendu.",
    bugSubmitting: "Wysyłanie zgłoszenia...",
    bugSuccessOk: "OK",
    bugValidation: "Podaj opis problemu.",
    contact: "Kontakt",
    contactIntro: "Masz pytanie albo sugestię? Skontaktuj się z nami mailowo. Błędy w aplikacji najlepiej zgłaszać przez formularz „Zgłoś błąd” w sekcji Informacje.",
    contactResponseTime: "Odpowiadamy na wiadomości tak szybko, jak to możliwe - zwykle w ciągu kilku dni roboczych.",
    contactBugInfo: "Jeśli chcesz zgłosić błąd, użyj formularza „Zgłoś błąd”. Formularz przekaże zgłoszenie z opisem problemu oraz informacją o urządzeniu i systemie.",
    contactFaqBugQuestion: "Jak zgłosić błąd w aplikacji?",
    contactFaqBugAnswer: "Wejdź w Ustawienia, otwórz sekcję Informacje i wybierz „Zgłoś błąd”. Wypełnij formularz, a zgłoszenie zostanie przekazane do zespołu Gymmin.",
    contactFaqIdeaQuestion: "Czy mogę zgłosić pomysł na nową funkcję?",
    contactFaqIdeaAnswer: "Tak. Chętnie przyjmujemy sugestie dotyczące rozwoju aplikacji. Opisz swój pomysł i wyślij go na adres kontakt@gymmin.app.",
    contactFaqWorkoutQuestion: "Jak zgłosić problem z treningiem?",
    contactFaqWorkoutAnswer: "Użyj formularza „Zgłoś błąd” i opisz, którego treningu dotyczy problem, co działa nieprawidłowo oraz kiedy zauważyłeś błąd.",
    contactFaqPrivacyQuestion: "Gdzie znajdę informacje o prywatności?",
    contactFaqPrivacyAnswer: "Informacje dotyczące danych i prywatności znajdziesz w Regulaminie oraz w polityce prywatności aplikacji, gdy będzie dostępna.",
    createAccount: "Utwórz konto",
    defaultStageType: "Domyślny typ etapu",
    defaultSetCount: "Domyślna liczba serii",
    defaultWeight: "Domyślny ciężar",
    defaultWorkoutExecutionMode: "Tryb wykonywania treningu",
    descending: "Malejąco",
    executionGuided: "Krok po kroku",
    executionReadonlyPostWorkout: "Tylko podgląd, uzupełnię po treningu",
    executionInlineTable: "Tabela do uzupełniania na bieżąco",
    startWorkout: "Rozpocznij trening",
    chooseExecutionMode: "Wybierz tryb wykonywania",
    showWorkedMuscles: "Pokaż pracujące mięśnie",
    workedMuscles: "Pracujące mięśnie",
    noExerciseMuscleData: "Brak danych o mięśniach dla tego ćwiczenia",
    start: "Rozpocznij",
    cancel: "Anuluj",
    done: "Wykonane",
    next: "Dalej",
    back: "Wstecz",
    finishWorkout: "Zakończ trening",
    finishAndFill: "Zakończ i uzupełnij",
    finishWithoutFilling: "Zakończ bez uzupełniania",
    cancelWorkout: "Anuluj trening",
    abandonWorkout: "Porzuć trening",
    continueWorkout: "Kontynuuj trening",
    workoutHistory: "Historia wykonań",
    actualWeight: "Ciężar",
    actualReps: "Powtórzenia",
    actualDuration: "Rzeczywisty czas",
    actualCalories: "Kalorie",
    actualHeartRate: "Tętno",
    note: "Notatka",
    close: "Zamknij",
    duration: "Czas trwania",
    finish: "Zakończ",
    progress: "Postęp",
    elapsedTime: "Czas treningu",
    restTimer: "Timer odpoczynku",
    startTimer: "Start",
    pauseTimer: "Pauza",
    resetTimer: "Reset",
    finishIncompleteWorkoutTitle: "Zakończyć mimo braków?",
    finishIncompleteWorkoutCopy: "Niektóre elementy nie zostały uzupełnione. Czy na pewno chcesz zapisać trening?",
    activeWorkoutNotice: "Masz aktywny trening",
    workoutSaved: "Trening zapisany",
    workoutSortAlphabetical: "Alfabetycznie",
    workoutSortCreatedAt: "Data stworzenia",
    workoutSortDirection: "Kierunek",
    workoutSortField: "Sortuj według",
    workoutSortTitle: "Sortowanie treningów",
    workoutAbandoned: "Trening przerwany",
    workoutSaveError: "Nie udało się zapisać treningu",
    emptyWorkoutSession: "Ten trening nie ma elementów do wykonania",
    workoutHistoryTitle: "Historia treningów",
    workoutDetails: "Szczegóły treningu",
    exerciseProgress: "Progres ćwiczenia",
    exerciseDetails: "Szczegóły ćwiczenia",
    noExerciseDetails: "Brak szczegółów dla tego ćwiczenia",
    exerciseAnimation: "Animacja ćwiczenia",
    exerciseAnimationPlaceholder: "Animacja zostanie dodana później.",
    howToPerform: "Jak wykonywać",
    techniquePlaceholder: "Opis techniki zostanie dodany później.",
    tips: "Wskazówki",
    tipsPlaceholder: "Wskazówki techniczne zostaną dodane później.",
    commonMistakes: "Typowe błędy",
    commonMistakesPlaceholder: "Typowe błędy zostaną dodane później.",
    exerciseHistory: "Historia ćwiczenia",
    exerciseHistoryPlaceholder: "Historia ćwiczenia będzie dostępna po wykonaniu treningów.",
    showDetails: "Pokaż szczegóły",
    lastResult: "Ostatni wynik",
    viewFullHistory: "Zobacz całą historię",
    details: "Szczegóły",
    emptyWorkoutHistoryTitle: "Nie masz jeszcze historii treningów.",
    emptyWorkoutHistoryCopy: "Wykonaj pierwszy trening, aby zobaczyć historię.",
    emptyProgressTitle: "Brak danych progresu.",
    emptyProgressCopy: "Uzupełnij wyniki po treningu, aby zobaczyć progres.",
    workoutsThisWeek: "Treningi w tym tygodniu",
    workoutsThisMonth: "Treningi w tym miesiącu",
    totalTime: "Łączny czas",
    completedWorkouts: "Ukończone treningi",
    abandonedWorkouts: "Przerwane treningi",
    completedItems: "Wykonano",
    planned: "Plan",
    actual: "Rzeczywiście",
    bestWeight: "Najlepszy ciężar",
    mostReps: "Najwięcej powtórzeń",
    bestVolume: "Najlepsza objętość",
    estimatedOneRepMax: "Szacowane 1RM",
    resultHistory: "Historia wyników",
    last: "Ostatnio",
    noData: "Brak danych",
    historyAll: "Wszystkie",
    completedStatus: "Ukończone",
    abandonedStatus: "Przerwane",
    activeStatus: "Aktywne",
    searchExerciseProgress: "Szukaj ćwiczenia",
    searchWorkoutHistory: "Szukaj treningu",
    volume: "Objętość",
    sessions: "Sesje",
    executionMode: "Tryb wykonania",
    completedStatusLabel: "Ukończony",
    abandonedStatusLabel: "Przerwany",
    activeStatusLabel: "Aktywny",
    collapse: "Zwiń",
    expand: "Rozwiń",
    deleteHistoryEntryTitle: "Usuń wpis z historii?",
    deleteHistoryEntryCopy: "Czy na pewno chcesz usunąć ten wpis z historii treningów? Tej operacji nie można cofnąć.",
    deleteWorkoutWithHistoryTitle: "Usunąć trening z historią?",
    deleteWorkoutWithHistoryCopy: "Ten trening ma już wpisy w historii. Usunięcie treningu jest nieodwracalne. Historia treningów pozostanie zapisana, ale nie będzie już można przywrócić usuniętego treningu. Czy na pewno chcesz kontynuować?",
    deleteWorkoutAction: "Usuń trening",
    disabled: "Wyłączone",
    editSavedWorkout: "Edycja zapisanego treningu",
    editWorkout: "Edytuj trening",
    exercise: "Ćwiczenie",
    exercisePlural: "Ćwiczenia",
    exercisePickerEmpty: "Brak ćwiczeń",
    exercisePickerLoading: "Ładowanie ćwiczeń...",
    exercisePickerTitle: "Wybierz ćwiczenie",
    exerciseMuscleFilter: "Filtruj według mięśnia",
    exerciseMuscleFilterAll: "Wszystkie mięśnie",
    faq: "FAQ",
    goal: "Cel",
    goalType: "Typ celu",
    home: "Strona główna",
    info: "Informacje",
    information: "Informacje",
    integrations: "Integracje",
    login: "Logowanie",
    loginAction: "Zaloguj się",
    loginCta: "Zaloguj",
    loginPanelDismiss: "Ukryj panel logowania",
    loginIntro: "Zaloguj się lub załóż konto.",
    loginStats: "Dostęp do statystyk",
    name: "Nazwa",
    notifications: "Powiadomienia",
    password: "hasło",
    passwordConfirm: "powtórz hasło",
    preferences: "Preferencje",
    profile: "Profil",
    profileUser: "Profil użytkownika",
    register: "Rejestracja",
    registerAction: "Zarejestruj się",
    refresh: "Odśwież",
    saveWorkout: "Zapisz trening",
    save: "Zapisz",
    searchExercise: "Szukaj ćwiczenia",
    searchWorkout: "Wyszukiwarka treningów",
    searchWorkoutPlaceholder: "Szukaj po nazwie, partii lub obciążeniu",
    select: "Wybierz",
    settings: "Ustawienia",
    stageType: "Typ etapu",
    set: "Seria",
    setsInStage: "Serie w etapie",
    submitBug: "Wyślij zgłoszenie",
    theme: "Motyw",
    themeDark: "Nocny",
    themeLight: "Dzienny",
    toChoose: "Do wyboru",
    training: "Trening",
    terms: "Regulamin",
    userAccount: "Konto użytkownika",
    username: "nazwa użytkownika",
    workout: "Trening",
    workouts: "Treningi",
    workoutName: "Nazwa treningu",
    workoutNamePlaceholder: "np. Push - klatka i barki",
    workoutNotes: "Uwagi",
    workoutNotesPlaceholder: "Dodaj opis treningu",
    weight: "Ciężar",
    all: "Wszystkie",
    soon: "Wkrótce",
    empty: "Pusty",
    setupRequired: "Do ustawienia",
    stageWarmup: "Rozgrzewka",
    stageExercise: "Ćwiczenia fizyczne",
    stageRecovery: "Regeneracja",
    stageRest: "Odpoczynek",
    stageCooldown: "Schładzanie",
    stageOther: "Inne",
    goalRepetitions: "Powtórzenia",
    goalTime: "Czas",
    goalButtonPress: "Naciśnięcie przycisku",
    goalCalories: "Suma kalorii",
    goalHeartRate: "Tętno",
    targetBelow: "Poniżej",
    targetAbove: "Powyżej",
    timeHours: "godz.",
    timeMinutes: "min",
    timeSeconds: "sek.",
    repetitionsSuffix: "powtórzenia",
    caloriesSuffix: "kalorii",
    authLoginValidation: "Podaj email i hasło min. 4 znaki.",
    authRequestError: "Nie udało się połączyć z logowaniem. Sprawdź połączenie i backend.",
    rateLimitError: "Zbyt wiele prób. Spróbuj ponownie za chwilę.",
    authLoginSubmitting: "Logowanie...",
    authRegisterSubmitting: "Rejestracja...",
    authPasswordMismatch: "Hasła muszą być takie same.",
    authUsernameValidation: "Podaj nazwę użytkownika.",
    forgotPassword: "Nie pamiętasz hasła?",
    resetPassword: "Reset hasła",
    resetPasswordRequestIntro: "Podaj email konta. Jeśli konto istnieje, wyślemy instrukcję resetu hasła.",
    resetPasswordConfirmIntro: "Wklej kod z emaila i ustaw nowe hasło.",
    resetPasswordRequestSuccess: "Jeśli konto z tym adresem istnieje, wysłaliśmy instrukcję resetu hasła.",
    resetPasswordSuccess: "Hasło zostało zresetowane. Zaloguj się nowym hasłem.",
    resetToken: "kod resetu",
    sendResetInstructions: "Wyślij instrukcję",
    setNewPassword: "Ustaw nowe hasło",
    changePassword: "Zmień hasło",
    currentPassword: "Obecne hasło",
    newPassword: "Nowe hasło",
    repeatNewPassword: "Powtórz hasło",
    passwordChanged: "Hasło zostało zmienione",
    currentPasswordInvalid: "Obecne hasło jest nieprawidłowe",
    newPasswordTooShort: "Nowe hasło jest za krótkie",
    changePasswordFailed: "Nie udało się zmienić hasła",
    activeSessions: "Aktywne sesje",
    noActiveSessions: "Brak aktywnych sesji.",
    sessionExpired: "Sesja wygasła. Zaloguj się ponownie.",
    thisSession: "Ta sesja",
    lastActivity: "Ostatnia aktywność",
    expires: "Wygasa",
    signOutThisSession: "Wyloguj tę sesję",
    signOutAllSessions: "Wyloguj wszystkie sesje",
    confirmSignOutAllSessions: "Czy na pewno wylogować wszystkie sesje?",
    sessionSignedOut: "Sesja została wylogowana",
    unknownDevice: "Nieznane urządzenie",
    defaultUserName: "Użytkownik",
    noWorkout: "Brak treningu",
    noWorkoutCopy: "Dodaj nowy trening albo wybierz inny z listy.",
    edit: "Edytuj",
    delete: "Usuń",
    stage: "Etap",
    stages: "Etapy",
    setsPlural: "serie",
    stageWithoutSets: "Etap bez serii",
    setCount: "Liczba serii",
    elementWithoutExercise: "Element bez ćwiczenia",
    account: "Konto",
    accountPlaceholder: "Puste na razie. Wrócimy tu do profilu, emaila i usunięcia konta.",
    userData: "Dane",
    favoriteExercises: "Ulubione ćwiczenia",
    favoriteExercisesEmptyTitle: "Brak ulubionych ćwiczeń",
    favoriteExercisesEmptyCopy: "Oznacz ćwiczenia gwiazdką, aby mieć do nich szybki dostęp.",
    favoriteExercisesAllFilter: "Wszystkie ćwiczenia",
    favoriteExercisesOnlyFilter: "Tylko ulubione",
    favorites: "Ulubione",
    favoriteExerciseAdded: "Dodano do ulubionych",
    favoriteExerciseRemoved: "Usunięto z ulubionych",
    favoriteExercisesSavedLocally: "Zapis lokalny",
    favoriteExercisesSyncFailed: "Synchronizacja nieudana",
    favoriteExercisesSynced: "Zsynchronizowano z kontem",
    enableReminders: "Włącz przypomnienia",
    reminderDays: "Dni przypomnień",
    reminderMessage: "Wiadomość",
    reminderDescription: "Opis",
    reminderOnlyIfNoWorkoutToday: "Przypominaj tylko, jeśli dzisiaj nie było treningu",
    remindersPermissionDenied: "Powiadomienia są wyłączone w ustawieniach telefonu. Włącz je, aby korzystać z przypomnień.",
    remindersScheduleError: "Nie udało się zaplanować przypomnień",
    remindersScheduled: "Przypomnienia zaplanowane",
    monday: "Poniedziałek",
    tuesday: "Wtorek",
    wednesday: "Środa",
    thursday: "Czwartek",
    friday: "Piątek",
    saturday: "Sobota",
    sunday: "Niedziela",
    mondayShort: "Pon",
    tuesdayShort: "Wt",
    wednesdayShort: "Śr",
    thursdayShort: "Czw",
    fridayShort: "Pt",
    saturdayShort: "Sob",
    sundayShort: "Nd",
    enabled: "Włączone",
    anonymousDataTitle: "Masz dane lokalne bez konta",
    anonymousDataCopy: "Czy chcesz połączyć lokalne dane z tym kontem?",
    mergeLocalData: "Połącz",
    deleteLocalData: "Usuń dane lokalne",
    deleteAnonymousDataTitle: "Usunąć dane lokalne bez konta?",
    deleteAnonymousDataCopy: "Usunięte zostaną tylko dane zapisane bez logowania. Dane tego konta pozostaną bez zmian.",
    accountSwitchDetected: "Wykryto zmianę konta",
    accountSwitchCopy: "Lokalne dane poprzedniego konta pozostają na tym urządzeniu i nie zostaną połączone automatycznie.",
    notNow: "Nie teraz",
    customExercises: "Własne ćwiczenia",
    workoutReminders: "Przypomnienia o treningu",
    trainingDays: "Dni treningowe",
    reminderTime: "Godzina przypomnienia",
    integrationPlaceholder: "Puste na razie. Tu trafi status połączenia i opcja podłączenia konta.",
    termsMeta: "Zasady korzystania z aplikacji",
    contactMeta: "Dane kontaktowe i pomoc",
    defaultSetCountHelp: "Liczba serii dla nowo dodawanej serii",
    defaultWeightHelp: "Ciężar dla nowo dodawanego elementu serii",
    items: "elementów",
    overview: "Przegląd",
    primaryMuscles: "Mięśnie główne",
    secondaryMuscles: "Mięśnie pomocnicze",
    inactiveMuscleGroups: "Niezaangażowane grupy mięśni",
    emptyWorkoutBuilderTitle: "Ten trening nie ma jeszcze etapów ani serii.",
    emptyWorkoutBuilderCopy: "Dodaj etap dla bloku treningu albo serię dla konkretnego ćwiczenia.",
    stageWithoutSeries: "Ten etap nie ma jeszcze serii.",
    setElements: "Ćwiczenia w serii",
    setWithoutElements: "Ta seria nie ma jeszcze elementów.",
    type: "Typ",
    notSignedInProfile: "Nie jesteś zalogowany. Wróć do strony startowej i zaloguj się, aby zobaczyć profil.",
    logout: "Wyloguj",
    viewAllWorkouts: "Zobacz wszystkie",
    termsIntroOne: "Ten regulamin określa zasady korzystania z aplikacji Gymmin. Aplikacja służy do tworzenia i porządkowania treningów siłowych.",
    termsIntroTwo: "Użytkownik odpowiada za poprawne dobranie obciążeń, techniki oraz intensywności ćwiczeń. Aplikacja nie zastępuje konsultacji z trenerem, fizjoterapeutą ani lekarzem.",
    termsIntroThree: "Dane treningowe zapisane w aplikacji powinny być wykorzystywane wyłącznie do planowania aktywności i monitorowania postępów. Błędy w działaniu aplikacji można zgłaszać przez formularz dostępny w sekcji Informacje.",
    termsGeneralTitle: "Postanowienia ogólne",
    termsGeneralText: "Gymmin jest aplikacją do tworzenia, porządkowania i przeglądania treningów siłowych. Regulamin określa podstawowe zasady korzystania z aplikacji oraz dostępnych w niej funkcji.",
    termsAccountText: "Część funkcji może wymagać zalogowania. Użytkownik odpowiada za poprawność danych podanych podczas logowania lub rejestracji oraz za zabezpieczenie dostępu do swojego konta.",
    termsUsageTitle: "Korzystanie z aplikacji",
    termsUsageText: "Aplikacja służy do planowania treningów, zapisywania etapów, serii i elementów ćwiczeniowych. Użytkownik zobowiązuje się korzystać z aplikacji zgodnie z jej przeznaczeniem.",
    termsWorkoutResponsibilityTitle: "Treningi i odpowiedzialność użytkownika",
    termsWorkoutResponsibilityText: "Gymmin nie zastępuje trenera, fizjoterapeuty ani lekarza. Użytkownik samodzielnie odpowiada za dobór ćwiczeń, ciężaru, intensywności i techniki. W razie bólu, kontuzji lub wątpliwości zdrowotnych należy skonsultować się ze specjalistą.",
    termsPrivacyTitle: "Dane i prywatność",
    termsPrivacyText: "Dane wprowadzone w aplikacji powinny być wykorzystywane do planowania aktywności i monitorowania postępów. Użytkownik powinien dbać o poprawność danych podawanych w aplikacji oraz zgłaszać zauważone nieprawidłowości przez formularz zgłoszenia błędu.",
    termsLiabilityTitle: "Ograniczenie odpowiedzialności",
    termsLiabilityText: "Nie ponosimy odpowiedzialności za skutki treningów wykonywanych na podstawie danych wpisanych przez użytkownika. W razie zauważenia błędu w działaniu aplikacji użytkownik może skorzystać z formularza „Zgłoś błąd” dostępnego w sekcji Informacje.",
    termsChangesTitle: "Zmiany regulaminu",
    termsChangesText: "Regulamin może być aktualizowany wraz ze zmianami w aplikacji. Aktualna treść regulaminu będzie dostępna w aplikacji.",
    termsContactText: "W sprawach dotyczących regulaminu, konta, prywatności lub działania aplikacji można skontaktować się pod adresem kontakt@gymmin.app. Błędy w aplikacji najlepiej zgłaszać przez formularz „Zgłoś błąd” w sekcji Informacje."
  },
  en: {
    addElement: "Element",
    addNewWorkout: "Add new workout",
    workoutCreatorCta: "Workout creator",
    workoutCreatorLoginCta: "Workout creator",
    workoutCreatorLoginTooltip: "Only for logged-in users",
    workoutCreatorPendingCta: "Creating plan...",
    addNotes: "Add notes",
    addWorkoutSubtitle: "Open the exercise, set and load builder.",
    aiCreator: "Creator",
    aiCreatorBack: "Back to workouts",
    aiCreatorDays: "Training days",
    aiCreatorDaysPlaceholder: "e.g. 3 days per week",
    aiCreatorDoneCopy: "The plan has been prepared by the creator.",
    aiCreatorDoneTitle: "Workout is being prepared",
    aiCreatorGoal: "Training goal",
    aiCreatorGoalPlaceholder: "e.g. muscle gain, fat loss, strength",
    aiCreatorIntro: "Fill in the basic information. AI will use it to prepare a plan or ask follow-up questions.",
    aiCreatorMeta: "AI-assisted plan",
    aiCreatorNotes: "Additional information",
    aiCreatorNotesPlaceholder: "Equipment, injuries, limitations, preferences",
    aiCreatorProfileLoaded: "Loaded profile",
    aiCreatorProfileName: "Profile name",
    aiCreatorProfileNamePlaceholder: "e.g. John, Kate - fat loss",
    aiCreatorProfiles: "Creator profiles",
    aiCreatorProfileSaveCopy: "You can save this data as a profile to create future plans for this person faster.",
    aiCreatorProfileSaveTitle: "Save data as a profile?",
    aiCreatorProfileUpdateCopy: "The form was filled from a profile. You can update the saved data before sending the request.",
    aiCreatorProfileUpdateTitle: "Update profile?",
    aiCreatorQuestionPlaceholder: "Answer",
    aiCreatorSaveAndSubmit: "Save profile and send",
    aiCreatorSendWithoutSaving: "Send without saving",
    aiCreatorSentCopy: "The form has been sent. You will return to the home screen shortly.",
    aiCreatorSentOk: "OK",
    aiCreatorSentTitle: "Form sent",
    aiCreatorSubmit: "Send to creator",
    aiCreatorSubmitting: "The creator is preparing a plan...",
    aiCreatorSubmitError: "Could not send data to the creator. Check the backend and OpenAI configuration.",
    aiCreatorPendingCopy: "The plan is already being created. You can come back later, and the creator will unlock after the result is received.",
    aiCreatorImportedTitle: "Workouts added",
    aiCreatorImportedCopy: "New workouts are now available in the workout list.",
    aiCreatorResultTitle: "Creator result",
    aiCreatorUpdateAndSubmit: "Update and send",
    aiCreatorWaitingAction: "Back to list",
    aiRewriteAction: "Modify with AI",
    aiRewriteTitle: "Modify workout with AI",
    aiRewritePlaceholder: "Describe what you want to change in this workout...",
    aiRewriteRequired: "Change description is required",
    aiRewriteStartError: "Could not start workout modification",
    aiRewriteProcessing: "Modifying workout...",
    aiRewriteReady: "Modification ready",
    aiRewriteProposal: "AI proposal",
    aiRewriteSaveAsNew: "Save as new workout",
    aiRewriteReplaceCurrent: "Replace current workout",
    aiRewriteDiscard: "Discard",
    aiRewriteReplaceConfirmTitle: "Replace current workout?",
    aiRewriteReplaceConfirmCopy: "This will change the saved workout plan. Completed workout history will stay unchanged.",
    aiRewriteReplaceConfirmAction: "Replace",
    aiRewriteUnmatchedTitle: "Not all exercises could be matched to the catalog.",
    aiRewriteUnmatchedCopy: "Review unmatched exercises before saving the workout.",
    aiRewriteMatched: "All exercises are matched to the catalog.",
    aiRewriteSessionExpired: "Session expired. Please sign in again.",
    aiRewriteInvalidFormat: "AI returned an invalid workout format",
    aiRewriteSuggestionShorten: "Shorten the workout to 45 minutes",
    aiRewriteSuggestionBack: "Add more back exercises",
    aiRewriteSuggestionHome: "Replace exercises with home alternatives",
    aiRewriteSuggestionLegs: "Reduce leg volume",
    aiRewriteSuggestionSets: "Keep exercises but reduce set count",
    aiRewriteSuggestionCatalog: "Replace exercises with catalog alternatives",
    aiCredits: "AI credits",
    aiCreditsAvailable: "Available credits",
    aiCreditsHistory: "Credit history",
    aiCreditsUsed: "Credit used",
    aiCreditsAdded: "Credits added",
    aiCreditsEmpty: "Not enough credits",
    aiCreditsBuy: "Buy credits",
    aiCreditsPurchaseSoon: "Credit purchase will be available soon",
    aiCreditsLoadError: "Could not load credit balance",
    aiCreditsPreparingPurchase: "Preparing purchase...",
    aiCreditsProcessingPurchase: "Processing purchase...",
    aiCreditsPurchaseCancelled: "Purchase cancelled",
    aiCreditsPurchaseCompleted: "Purchase completed",
    aiCreditsPurchaseAdded: "Credits added",
    aiCreditsPurchaseVerifyError: "Could not verify purchase",
    aiCreditsPurchasePending: "Purchase is pending",
    aiCreditsPurchaseRetry: "Try again",
    aiCreditsRestorePurchases: "Restore pending purchases",
    aiCreditsBillingUnavailable: "Google Play purchases are unavailable in this build or on this device.",
    aiCreditsDescription: "1 AI credit = 1 workout generation or AI workout modification.",
    aiCreditsPlanCost: "Plan generation cost",
    aiCreditsRewriteCost: "Workout modification cost",
    aiCreditsGenerateNeed: "You need 1 AI credit to generate a plan.",
    aiCreditsRewriteNeed: "You need 1 AI credit to modify a workout.",
    aiCreditsInsufficient: "You do not have enough AI credits.",
    aiCreditsGoTo: "Go to AI credits",
    aiCreditsCharged: "Credit was charged when generation started.",
    aiCreditsDevGrant: "Add test credits",
    appLanguage: "App language",
    ascending: "Ascending",
    articles: "Articles",
    backToSettings: "Back to settings",
    backToStart: "Back to start",
    bugAccepted: "The report has been received. Thank you for helping improve the app.",
    bugIntro: "Describe the problem and the report will be sent to the Gymmin team.",
    bugReport: "Report a bug",
    bugReportMeta: "Problem report form",
    bugTitle: "Problem title",
    bugTitlePlaceholder: "e.g. I cannot save a workout",
    bugDescription: "Description",
    bugDescriptionPlaceholder: "What happened and on which screen?",
    bugSubmitError: "Could not send the report. Check the connection and backend configuration.",
    bugSubmitting: "Sending report...",
    bugSuccessOk: "OK",
    bugValidation: "Enter a problem description.",
    contact: "Contact",
    contactIntro: "Have a question or suggestion? Contact us by email. Bugs are best reported with the “Report a bug” form in Information.",
    contactResponseTime: "We reply as quickly as possible, usually within a few business days.",
    contactBugInfo: "To report a bug, use the “Report a bug” form. The form sends the report with a problem description and device/system information.",
    contactFaqBugQuestion: "How do I report an app bug?",
    contactFaqBugAnswer: "Go to Settings, open Information and choose “Report a bug”. Fill in the form and the report will be sent to the Gymmin team.",
    contactFaqIdeaQuestion: "Can I suggest a new feature?",
    contactFaqIdeaAnswer: "Yes. We welcome suggestions for app improvements. Describe your idea and send it to kontakt@gymmin.app.",
    contactFaqWorkoutQuestion: "How do I report a workout issue?",
    contactFaqWorkoutAnswer: "Use the “Report a bug” form and describe which workout is affected, what is not working and when you noticed the issue.",
    contactFaqPrivacyQuestion: "Where can I find privacy information?",
    contactFaqPrivacyAnswer: "Data and privacy information is available in the Terms and in the privacy policy when it becomes available.",
    createAccount: "Create account",
    defaultStageType: "Default stage type",
    defaultSetCount: "Default set count",
    defaultWeight: "Default weight",
    defaultWorkoutExecutionMode: "Workout execution mode",
    descending: "Descending",
    executionGuided: "Step by step",
    executionReadonlyPostWorkout: "Read-only, fill after workout",
    executionInlineTable: "Live table",
    startWorkout: "Start workout",
    chooseExecutionMode: "Choose execution mode",
    showWorkedMuscles: "Show worked muscles",
    workedMuscles: "Worked muscles",
    noExerciseMuscleData: "No muscle data available for this exercise",
    start: "Start",
    cancel: "Cancel",
    done: "Done",
    next: "Next",
    back: "Back",
    finishWorkout: "Finish workout",
    finishAndFill: "Finish and fill",
    finishWithoutFilling: "Finish without filling",
    cancelWorkout: "Cancel workout",
    abandonWorkout: "Abandon workout",
    continueWorkout: "Continue workout",
    workoutHistory: "Workout history",
    actualWeight: "Weight",
    actualReps: "Reps",
    actualDuration: "Actual duration",
    actualCalories: "Calories",
    actualHeartRate: "Heart rate",
    note: "Note",
    close: "Close",
    duration: "Duration",
    finish: "Finish",
    progress: "Progress",
    elapsedTime: "Workout time",
    restTimer: "Rest timer",
    startTimer: "Start",
    pauseTimer: "Pause",
    resetTimer: "Reset",
    finishIncompleteWorkoutTitle: "Finish with missing data?",
    finishIncompleteWorkoutCopy: "Some items have not been filled in. Are you sure you want to save this workout?",
    activeWorkoutNotice: "You have an active workout",
    workoutSaved: "Workout saved",
    workoutSortAlphabetical: "Alphabetically",
    workoutSortCreatedAt: "Created date",
    workoutSortDirection: "Direction",
    workoutSortField: "Sort by",
    workoutSortTitle: "Workout sorting",
    workoutAbandoned: "Workout abandoned",
    workoutSaveError: "Could not save workout",
    emptyWorkoutSession: "This workout has no items to perform",
    workoutHistoryTitle: "Workout history",
    workoutDetails: "Workout details",
    exerciseProgress: "Exercise progress",
    exerciseDetails: "Exercise details",
    noExerciseDetails: "No details available for this exercise",
    exerciseAnimation: "Exercise animation",
    exerciseAnimationPlaceholder: "Animation will be added later.",
    howToPerform: "How to perform",
    techniquePlaceholder: "Technique description will be added later.",
    tips: "Tips",
    tipsPlaceholder: "Technique tips will be added later.",
    commonMistakes: "Common mistakes",
    commonMistakesPlaceholder: "Common mistakes will be added later.",
    exerciseHistory: "Exercise history",
    exerciseHistoryPlaceholder: "Exercise history will appear after completed workouts.",
    showDetails: "Show details",
    lastResult: "Last result",
    viewFullHistory: "View full history",
    details: "Details",
    emptyWorkoutHistoryTitle: "You do not have workout history yet.",
    emptyWorkoutHistoryCopy: "Complete your first workout to see history.",
    emptyProgressTitle: "No progress data yet.",
    emptyProgressCopy: "Fill workout results to see progress.",
    workoutsThisWeek: "Workouts this week",
    workoutsThisMonth: "Workouts this month",
    totalTime: "Total time",
    completedWorkouts: "Completed workouts",
    abandonedWorkouts: "Abandoned workouts",
    completedItems: "Completed",
    planned: "Plan",
    actual: "Actual",
    bestWeight: "Best weight",
    mostReps: "Most reps",
    bestVolume: "Best volume",
    estimatedOneRepMax: "Estimated 1RM",
    resultHistory: "Result history",
    last: "Last",
    noData: "No data",
    historyAll: "All",
    completedStatus: "Completed",
    abandonedStatus: "Abandoned",
    activeStatus: "Active",
    searchExerciseProgress: "Search exercise",
    searchWorkoutHistory: "Search workout",
    volume: "Volume",
    sessions: "Sessions",
    executionMode: "Execution mode",
    completedStatusLabel: "Completed",
    abandonedStatusLabel: "Abandoned",
    activeStatusLabel: "Active",
    collapse: "Collapse",
    expand: "Expand",
    deleteHistoryEntryTitle: "Delete history entry?",
    deleteHistoryEntryCopy: "Are you sure you want to delete this workout history entry? This action cannot be undone.",
    deleteWorkoutWithHistoryTitle: "Delete workout with history?",
    deleteWorkoutWithHistoryCopy: "This workout already has history entries. Deleting the workout cannot be undone. Workout history will remain saved, but the deleted workout cannot be restored. Are you sure you want to continue?",
    deleteWorkoutAction: "Delete workout",
    disabled: "Off",
    editSavedWorkout: "Editing saved workout",
    editWorkout: "Edit workout",
    exercise: "Exercise",
    exercisePlural: "Exercises",
    exercisePickerEmpty: "No exercises",
    exercisePickerLoading: "Loading exercises...",
    exercisePickerTitle: "Choose exercise",
    exerciseMuscleFilter: "Filter by muscle",
    exerciseMuscleFilterAll: "All muscles",
    faq: "FAQ",
    goal: "Goal",
    goalType: "Goal type",
    home: "Home",
    info: "Information",
    information: "Information",
    integrations: "Integrations",
    login: "Login",
    loginAction: "Log in",
    loginCta: "Log in",
    loginPanelDismiss: "Hide login panel",
    loginIntro: "Log in or create an account.",
    loginStats: "Access to stats",
    name: "Name",
    notifications: "Notifications",
    password: "password",
    passwordConfirm: "repeat password",
    preferences: "Preferences",
    profile: "Profile",
    profileUser: "User profile",
    register: "Register",
    registerAction: "Create account",
    refresh: "Refresh",
    saveWorkout: "Save workout",
    save: "Save",
    searchExercise: "Search exercise",
    searchWorkout: "Workout search",
    searchWorkoutPlaceholder: "Search by name, body part or load",
    select: "Select",
    settings: "Settings",
    stageType: "Stage type",
    set: "Set",
    setsInStage: "Sets in stage",
    submitBug: "Send report",
    theme: "Theme",
    themeDark: "Dark",
    themeLight: "Light",
    toChoose: "To choose",
    training: "Training",
    terms: "Terms",
    userAccount: "User account",
    username: "username",
    workout: "Workout",
    workouts: "Workouts",
    workoutName: "Workout name",
    workoutNamePlaceholder: "e.g. Push - chest and shoulders",
    workoutNotes: "Notes",
    workoutNotesPlaceholder: "Add workout description",
    weight: "Weight",
    all: "All",
    soon: "Soon",
    empty: "Empty",
    setupRequired: "To set",
    stageWarmup: "Warm-up",
    stageExercise: "Physical exercises",
    stageRecovery: "Recovery",
    stageRest: "Rest",
    stageCooldown: "Cool-down",
    stageOther: "Other",
    goalRepetitions: "Repetitions",
    goalTime: "Time",
    goalButtonPress: "Button press",
    goalCalories: "Total calories",
    goalHeartRate: "Heart rate",
    targetBelow: "Below",
    targetAbove: "Above",
    timeHours: "hrs",
    timeMinutes: "min",
    timeSeconds: "sec",
    repetitionsSuffix: "repetitions",
    caloriesSuffix: "calories",
    authLoginValidation: "Enter email and a password with at least 4 characters.",
    authRequestError: "Could not connect to auth. Check the connection and backend.",
    rateLimitError: "Too many attempts. Try again later.",
    authLoginSubmitting: "Logging in...",
    authRegisterSubmitting: "Creating account...",
    authPasswordMismatch: "Passwords must match.",
    authUsernameValidation: "Enter a username.",
    forgotPassword: "Forgot password?",
    resetPassword: "Reset password",
    resetPasswordRequestIntro: "Enter your account email. If it exists, we will send password reset instructions.",
    resetPasswordConfirmIntro: "Paste the email code and set a new password.",
    resetPasswordRequestSuccess: "If an account with this email exists, we sent password reset instructions.",
    resetPasswordSuccess: "Password has been reset. Sign in with your new password.",
    resetToken: "reset code",
    sendResetInstructions: "Send instructions",
    setNewPassword: "Set new password",
    changePassword: "Change password",
    currentPassword: "Current password",
    newPassword: "New password",
    repeatNewPassword: "Repeat password",
    passwordChanged: "Password changed",
    currentPasswordInvalid: "Current password is incorrect",
    newPasswordTooShort: "New password is too short",
    changePasswordFailed: "Could not change password",
    activeSessions: "Active sessions",
    noActiveSessions: "No active sessions.",
    sessionExpired: "Session expired. Please sign in again.",
    thisSession: "This session",
    lastActivity: "Last activity",
    expires: "Expires",
    signOutThisSession: "Sign out this session",
    signOutAllSessions: "Sign out all sessions",
    confirmSignOutAllSessions: "Are you sure you want to sign out all sessions?",
    sessionSignedOut: "Session signed out",
    unknownDevice: "Unknown device",
    defaultUserName: "User",
    noWorkout: "No workout",
    noWorkoutCopy: "Add a new workout or choose another one from the list.",
    edit: "Edit",
    delete: "Delete",
    stage: "Stage",
    stages: "Stages",
    setsPlural: "sets",
    stageWithoutSets: "Stage without sets",
    setCount: "Number of sets",
    elementWithoutExercise: "Element without exercise",
    account: "Account",
    accountPlaceholder: "Empty for now. We will return to profile, email and account removal here.",
    userData: "Data",
    favoriteExercises: "Favorite exercises",
    favoriteExercisesEmptyTitle: "No favorite exercises yet",
    favoriteExercisesEmptyCopy: "Mark exercises with a star to access them quickly.",
    favoriteExercisesAllFilter: "All exercises",
    favoriteExercisesOnlyFilter: "Favorites only",
    favorites: "Favorites",
    favoriteExerciseAdded: "Added to favorites",
    favoriteExerciseRemoved: "Removed from favorites",
    favoriteExercisesSavedLocally: "Saved locally",
    favoriteExercisesSyncFailed: "Sync failed",
    favoriteExercisesSynced: "Synced with account",
    enableReminders: "Enable reminders",
    reminderDays: "Reminder days",
    reminderMessage: "Message",
    reminderDescription: "Description",
    reminderOnlyIfNoWorkoutToday: "Remind only if I have not trained today",
    remindersPermissionDenied: "Notifications are disabled in phone settings. Enable them to use reminders.",
    remindersScheduleError: "Could not schedule reminders",
    remindersScheduled: "Reminders scheduled",
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday",
    sunday: "Sunday",
    mondayShort: "Mon",
    tuesdayShort: "Tue",
    wednesdayShort: "Wed",
    thursdayShort: "Thu",
    fridayShort: "Fri",
    saturdayShort: "Sat",
    sundayShort: "Sun",
    enabled: "Enabled",
    anonymousDataTitle: "You have local data without an account",
    anonymousDataCopy: "Do you want to merge local data with this account?",
    mergeLocalData: "Merge",
    deleteLocalData: "Delete local data",
    deleteAnonymousDataTitle: "Delete local data without an account?",
    deleteAnonymousDataCopy: "Only data saved while signed out will be deleted. Data for this account will stay unchanged.",
    accountSwitchDetected: "Account switch detected",
    accountSwitchCopy: "Local data from the previous account will stay on this device and will not be merged automatically.",
    notNow: "Not now",
    customExercises: "Custom exercises",
    workoutReminders: "Workout reminders",
    trainingDays: "Training days",
    reminderTime: "Reminder time",
    integrationPlaceholder: "Empty for now. Connection status and account linking will appear here.",
    termsMeta: "App usage rules",
    contactMeta: "Contact details and help",
    defaultSetCountHelp: "Set count for a newly added set",
    defaultWeightHelp: "Weight for a newly added set element",
    items: "items",
    overview: "Overview",
    primaryMuscles: "Primary muscles",
    secondaryMuscles: "Secondary muscles",
    inactiveMuscleGroups: "Inactive muscle groups",
    emptyWorkoutBuilderTitle: "This workout has no stages or sets yet.",
    emptyWorkoutBuilderCopy: "Add a stage for a workout block or a set for a specific exercise.",
    stageWithoutSeries: "This stage has no sets yet.",
    setElements: "Exercises in set",
    setWithoutElements: "This set has no elements yet.",
    type: "Type",
    notSignedInProfile: "You are not signed in. Go back to the start page and sign in to view your profile.",
    logout: "Log out",
    viewAllWorkouts: "View all",
    termsIntroOne: "These terms define the rules for using Gymmin. The app is used to create and organize strength workouts.",
    termsIntroTwo: "The user is responsible for choosing appropriate loads, technique and exercise intensity. The app does not replace advice from a trainer, physiotherapist or doctor.",
    termsIntroThree: "Workout data saved in the app should be used only for activity planning and progress tracking. App issues can be reported with the form available in Information.",
    termsGeneralTitle: "General terms",
    termsGeneralText: "Gymmin is an app for creating, organizing and reviewing strength workouts. These terms define the basic rules for using the app and its available features.",
    termsAccountText: "Some features may require signing in. The user is responsible for the accuracy of data provided during login or registration and for securing access to their account.",
    termsUsageTitle: "Using the app",
    termsUsageText: "The app is used to plan workouts and save stages, sets and exercise elements. The user agrees to use the app according to its intended purpose.",
    termsWorkoutResponsibilityTitle: "Workouts and user responsibility",
    termsWorkoutResponsibilityText: "Gymmin does not replace a trainer, physiotherapist or doctor. The user is responsible for choosing exercises, load, intensity and technique. In case of pain, injury or health concerns, consult a specialist.",
    termsPrivacyTitle: "Data and privacy",
    termsPrivacyText: "Data entered in the app should be used for activity planning and progress tracking. The user should keep their data accurate and report noticed issues with the bug report form.",
    termsLiabilityTitle: "Limitation of liability",
    termsLiabilityText: "We are not responsible for the effects of workouts performed based on data entered by the user. If the user notices an app issue, they can use the “Report a bug” form available in Information.",
    termsChangesTitle: "Changes to terms",
    termsChangesText: "The terms may be updated as the app changes. The current version will be available in the app.",
    termsContactText: "For matters related to terms, account, privacy or app behavior, contact us at kontakt@gymmin.app. App bugs are best reported with the “Report a bug” form in Information."
  }
} as const;

type TranslationKey = keyof typeof translations.pl;

function translate(language: LanguageCode, key: TranslationKey) {
  return translations[language][key];
}

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

type ApiSyncWorkoutsResponse = {
  serverTime: string;
  workouts: ApiWorkout[];
};

type ApiUserSettings = {
  collapsedPanels?: Record<string, boolean>;
  defaultSetCount?: string;
  defaultStageType?: StageType | "" | null;
  defaultWorkoutExecutionMode?: WorkoutExecutionMode | null;
  defaultWeight?: string;
  isAuthPanelDismissed?: boolean;
  language?: LanguageCode;
  themeName?: ThemeName;
  updatedAt?: string;
  workoutReminders?: WorkoutReminderSettings;
};

type ApiFavoriteExercise = {
  exerciseId: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
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
  return {
    ...draft,
    name: repairTextEncoding(draft.name),
    notes: repairTextEncoding(draft.notes),
    steps: draft.steps.map((step) => ({
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
  defaultWorkoutExecutionMode: WorkoutExecutionMode;
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
  const platformConstants = (NativeModules.PlatformConstants ?? {}) as Record<string, unknown>;
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

function createNotesWithRest(notes: string, restSeconds?: number) {
  if (!restSeconds) {
    return notes;
  }

  const restText = `Odpoczynek między seriami: ${restSeconds} s.`;
  return [notes, restText].filter(Boolean).join("\n");
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

const themes = {
  light: {
    background: "#f7f4ec",
    border: "#ded6c5",
    card: "#fffdf8",
    control: "#fffaf1",
    danger: "#b82b48",
    inputText: "#191d1b",
    muted: "#695f53",
    primary: "#0f7c7a",
    primaryStrong: "#14302f",
    secondaryBand: "#e7dcc6",
    selectedOption: "#d2d2d2",
    segment: "#eee6d8",
    statusBar: "dark" as const,
    switchTrack: "#d8cab3",
    text: "#191d1b",
    white: "#ffffff"
  },
  dark: {
    background: "#111717",
    border: "#2d3b3a",
    card: "#182221",
    control: "#111b1a",
    danger: "#ff6f8b",
    inputText: "#f4f1e8",
    muted: "#a9b4ad",
    primary: "#25b7a8",
    primaryStrong: "#07100f",
    secondaryBand: "#223735",
    selectedOption: "#34403f",
    segment: "#24302f",
    statusBar: "light" as const,
    switchTrack: "#2f4542",
    text: "#f4f1e8",
    white: "#ffffff"
  }
};

type ThemeName = keyof typeof themes;
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
  | "aiCredits"
  | "profile"
  | "progress"
  | "exerciseDetail"
  | "exerciseProgress"
  | "workoutHistory"
  | "workoutSessionDetail"
  | "workoutCreator"
  | "workoutAiRewrite"
  | "workoutAiProposal"
  | "workoutDetail"
  | "workoutSession";
type WorkoutHistoryStatusFilter = "all" | WorkoutSessionStatus;
type UserSession = {
  email: string;
  id: string;
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
  email: string;
  id: string;
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
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const languageSheetTranslateY = useRef(new Animated.Value(360)).current;
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [activeScreen, setActiveScreen] = useState<ScreenKey>("home");
  const [savedWorkouts, setSavedWorkouts] = useState<SavedWorkout[]>(() => [...initialWorkouts]);
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
  const [workoutReminders, setWorkoutReminders] = useState<WorkoutReminderSettings>(
    getDefaultWorkoutReminderSettings("en")
  );
  const [pendingWorkoutReminderTime, setPendingWorkoutReminderTime] = useState("18:00");
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
  const [workoutHistoryFilter, setWorkoutHistoryFilter] = useState<WorkoutHistoryStatusFilter>("all");
  const [workoutHistorySearch, setWorkoutHistorySearch] = useState("");
  const [workoutHistoryWorkoutIdFilter, setWorkoutHistoryWorkoutIdFilter] = useState<string | null>(null);
  const [progressSearch, setProgressSearch] = useState("");
  const [selectedExerciseProgressKey, setSelectedExerciseProgressKey] = useState<string | null>(null);
  const [sessionEntryIndex, setSessionEntryIndex] = useState(0);
  const [isPostWorkoutFillMode, setIsPostWorkoutFillMode] = useState(false);
  const [sessionNow, setSessionNow] = useState(() => Date.now());
  const [restTimerEntryId, setRestTimerEntryId] = useState<string | null>(null);
  const [restTimerRemainingSeconds, setRestTimerRemainingSeconds] = useState(0);
  const [isRestTimerRunning, setIsRestTimerRunning] = useState(false);
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
  const [activeAuthSessions, setActiveAuthSessions] = useState<AuthSessionResponse[]>([]);
  const [aiCreditBalance, setAiCreditBalance] = useState<AiCreditBalance>(emptyAiCreditBalance);
  const [aiCreditTransactions, setAiCreditTransactions] = useState<AiCreditTransaction[]>([]);
  const [aiCreditPacks, setAiCreditPacks] = useState<AiCreditPack[]>([]);
  const [aiCreditsError, setAiCreditsError] = useState("");
  const [aiCreditsPurchaseMessage, setAiCreditsPurchaseMessage] = useState("");
  const [isAiCreditsLoading, setIsAiCreditsLoading] = useState(false);
  const [isAiCreditPurchaseLoading, setIsAiCreditPurchaseLoading] = useState(false);
  const [isAuthActionSubmitting, setIsAuthActionSubmitting] = useState(false);
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
  const isCreatorJobPending = pendingCreatorJob?.type === "plan";
  const isRewriteJobPending = pendingCreatorJob?.type === "rewrite";
  const pollingCreatorJobIdRef = useRef<string | null>(null);
  const syncedWorkoutUserIdRef = useRef<string | null>(null);
  const syncedSettingsUserIdRef = useRef<string | null>(null);
  const syncedFavoriteExercisesUserIdRef = useRef<string | null>(null);
  const syncedWorkoutSessionsUserIdRef = useRef<string | null>(null);
  const isApplyingAccountFavoriteExercisesRef = useRef(false);
  const isApplyingAccountWorkoutSessionsRef = useRef(false);
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
      Alert.alert(
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

  async function removeAnonymousAccountData() {
    await cancelWorkoutReminders(ANONYMOUS_LOCAL_OWNER);
    await Promise.all([
      removeAccountJson(localWorkoutsStorageBaseKey, ANONYMOUS_LOCAL_OWNER),
      removeAccountJson(localSettingsStorageBaseKey, ANONYMOUS_LOCAL_OWNER),
      removeAccountJson(FAVORITE_EXERCISES_STORAGE_BASE_KEY, ANONYMOUS_LOCAL_OWNER),
      removeAccountJson(FAVORITE_EXERCISES_SYNC_STORAGE_BASE_KEY, ANONYMOUS_LOCAL_OWNER),
      removeAccountJson(WORKOUT_SESSIONS_STORAGE_BASE_KEY, ANONYMOUS_LOCAL_OWNER),
      removeAccountJson(WORKOUT_SESSIONS_SYNC_STORAGE_BASE_KEY, ANONYMOUS_LOCAL_OWNER),
      removeAccountJson(WORKOUT_REMINDER_NOTIFICATION_IDS_BASE_KEY, ANONYMOUS_LOCAL_OWNER),
      removeAccountJson(localCreatorProfilesStorageBaseKey, ANONYMOUS_LOCAL_OWNER),
      removeAccountJson(localCreatorJobStorageBaseKey, ANONYMOUS_LOCAL_OWNER)
    ]);
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

    const mergedWorkoutSort = accountWorkouts.sort ?? anonymousWorkouts.sort ?? defaultWorkoutSort;

    await Promise.all([
      saveWorkoutsForStorageOwner(accountOwnerId, mergedWorkouts, selectedWorkoutAfterMerge, mergedWorkoutSort),
      saveFavoriteExercises(mergedFavorites, accountOwnerId),
      saveWorkoutSessionsForStorageOwner(accountOwnerId, mergedSessions),
      saveCreatorProfilesForStorageOwner(accountOwnerId, mergedProfiles, selectedProfileAfterMerge),
      removeAccountJson(FAVORITE_EXERCISES_SYNC_STORAGE_BASE_KEY, accountOwnerId),
      removeAccountJson(WORKOUT_SESSIONS_SYNC_STORAGE_BASE_KEY, accountOwnerId)
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
    }

    syncedWorkoutUserIdRef.current = null;
    syncedFavoriteExercisesUserIdRef.current = null;
    syncedWorkoutSessionsUserIdRef.current = null;
    setFavoriteExercisesSyncStatus("local");

    try {
      await synchronizeAccountWorkouts(session, mergedWorkouts);
      const syncedFavorites = await syncAccountFavoriteExercises(session, mergedFavorites, true);
      const syncedSessions = await syncAccountWorkoutSessions(session, mergedSessions, true);

      if (storageOwnerId === accountOwnerId) {
        isApplyingAccountFavoriteExercisesRef.current = true;
        isApplyingAccountWorkoutSessionsRef.current = true;
        setFavoriteExercises(syncedFavorites);
        setWorkoutSessions(syncedSessions);
        setFavoriteExercisesSyncStatus("synced");
        setTimeout(() => {
          isApplyingAccountFavoriteExercisesRef.current = false;
          isApplyingAccountWorkoutSessionsRef.current = false;
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
    Alert.alert(t("anonymousDataTitle"), t("anonymousDataCopy"), [
      {
        text: t("mergeLocalData"),
        onPress: () => {
          void mergeAnonymousDataIntoAccount(session);
        }
      },
      {
        style: "cancel",
        text: t("notNow"),
        onPress: () => {
          void skipAnonymousAccountDataForUser(session);
        }
      },
      {
        style: "destructive",
        text: t("deleteLocalData"),
        onPress: () => {
          Alert.alert(t("deleteAnonymousDataTitle"), t("deleteAnonymousDataCopy"), [
            { style: "cancel", text: t("cancel") },
            {
              style: "destructive",
              text: t("deleteLocalData"),
              onPress: () => {
                void deleteAnonymousAccountDataForUser(session);
              }
            }
          ]);
        }
      }
    ]);
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
          email: String(storedData.user.email),
          id: String(storedData.user.id),
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
          email: responseBody.email,
          id: responseBody.id,
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
              email: storedData.user.email,
              id: storedData.user.id,
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
          Alert.alert(t("accountSwitchDetected"), t("accountSwitchCopy"), [
            { text: t("notNow") }
          ]);
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
          setWorkoutReminders(getDefaultWorkoutReminderSettings("en"));
          setPendingWorkoutReminderTime("18:00");
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
        setWorkoutReminders(nextWorkoutReminders);
        setPendingWorkoutReminderTime(nextWorkoutReminders.time);
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
        const rawData = await AsyncStorage.getItem(getAccountStorageKey(WORKOUT_SESSIONS_STORAGE_BASE_KEY, ownerId));

        if (!isMounted) {
          return;
        }

        if (!rawData) {
          setWorkoutSessions([]);
          setActiveWorkoutSessionId(null);
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
  }, [collapsedPanels, defaultSetCount, defaultStageType, defaultWeight, defaultWorkoutExecutionMode, hasLoadedLocalSettings, isAuthPanelDismissed, language, loadedSettingsOwnerId, storageOwnerId, themeName, user, workoutReminders]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setTrainingFactIndex((current) => current + 1);
    }, 30000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (activeScreen !== "workoutSession" && !isRestTimerRunning) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      setSessionNow(Date.now());
      setRestTimerRemainingSeconds((current) => {
        if (!isRestTimerRunning) {
          return current;
        }

        return Math.max(0, current - 1);
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [activeScreen, isRestTimerRunning]);

  useEffect(() => {
    if (restTimerRemainingSeconds <= 0 && isRestTimerRunning) {
      setIsRestTimerRunning(false);
    }
  }, [isRestTimerRunning, restTimerRemainingSeconds]);

  useEffect(() => {
    setIsRestTimerRunning(false);
  }, [activeWorkoutSessionId, sessionEntryIndex]);

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
  }, [collapsedPanels, defaultSetCount, defaultStageType, defaultWeight, defaultWorkoutExecutionMode, hasLoadedLocalSettings, isAuthPanelDismissed, language, loadedSettingsOwnerId, storageOwnerId, themeName, workoutReminders]);

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

    if (isApplyingAccountWorkoutSessionsRef.current) {
      hasPersistedLocalWorkoutSessionsRef.current = true;
      return;
    }

    if (!user || syncedWorkoutSessionsUserIdRef.current !== user.id) {
      hasPersistedLocalWorkoutSessionsRef.current = true;
      return;
    }

    if (!hasPersistedLocalWorkoutSessionsRef.current) {
      hasPersistedLocalWorkoutSessionsRef.current = true;
      return;
    }

    syncAccountWorkoutSessions(user, normalizedSessions).then((mergedSessions) => {
      isApplyingAccountWorkoutSessionsRef.current = true;
      setWorkoutSessions(mergedSessions);
      setTimeout(() => {
        isApplyingAccountWorkoutSessionsRef.current = false;
      }, 0);
    }).catch((error) => {
      console.error("Failed to sync workout sessions", error);
    });
  }, [hasLoadedWorkoutSessions, loadedWorkoutSessionsOwnerId, storageOwnerId, workoutSessions]);

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
    if (!phrase) {
      return exerciseProgressItems;
    }

    return exerciseProgressItems.filter((item) => {
      return item.exerciseName.toLowerCase().includes(phrase) || item.exerciseKey.toLowerCase().includes(phrase);
    });
  }, [exerciseProgressItems, progressSearch]);

  const selectedWorkoutSession = useMemo(
    () => visibleWorkoutSessions.find((session) => session.id === selectedWorkoutSessionId) ?? null,
    [selectedWorkoutSessionId, visibleWorkoutSessions]
  );

  const selectedExerciseProgressSummary = useMemo(
    () => selectedExerciseProgressKey ? getExerciseProgressSummary(visibleWorkoutSessions, selectedExerciseProgressKey) : null,
    [selectedExerciseProgressKey, visibleWorkoutSessions]
  );

  const bottomInset = Math.max(insets.bottom, 18);
  const bottomSheetBottomPadding = Math.max(insets.bottom, 42) + 24;
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
      setAiCreditsError(error instanceof Error ? error.message : t("aiCreditsLoadError"));
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
        setAiCreditsError(error instanceof Error ? error.message : t("aiCreditsPurchaseVerifyError"));
        setAiCreditsPurchaseMessage("");
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
        setAiCreditsPurchaseMessage(t("aiCreditsPurchasePending"));
        return;
      }

      for (const purchase of pendingPurchases) {
        await verifyGooglePlayAiCreditPurchase(purchase, user);
      }
    } catch (error) {
      console.error("Failed to restore AI credit purchases", error);
      setAiCreditsError(error instanceof Error ? error.message : t("aiCreditsPurchaseVerifyError"));
      setAiCreditsPurchaseMessage("");
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
      setAiCreditsError(error instanceof Error ? error.message : t("aiCreditsLoadError"));
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
      Alert.alert(t("workoutReminders"), t("remindersPermissionDenied"));
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

  function toggleWorkoutReminderDay(day: number) {
    const nextDays = workoutReminders.daysOfWeek.includes(day)
      ? workoutReminders.daysOfWeek.filter((item) => item !== day)
      : [...workoutReminders.daysOfWeek, day].sort((left, right) => left - right);

    updateWorkoutReminderSettings({
      ...workoutReminders,
      daysOfWeek: nextDays
    });
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
    setWorkoutReminders(nextWorkoutReminders);
    setPendingWorkoutReminderTime(nextWorkoutReminders.time);
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
    setTimeout(() => {
      isApplyingAccountWorkoutSessionsRef.current = false;
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
      Alert.alert(t("emptyWorkoutSession"));
      return;
    }

    setWorkoutSessions((current) => [session, ...current]);
    setActiveWorkoutSessionId(session.id);
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
    setSessionEntryIndex(0);
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
    setActiveWorkoutSessionId(null);
    setIsPostWorkoutFillMode(false);
    setActiveScreen("workoutDetail");
    Alert.alert(t("workoutSaved"));
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

    Alert.alert(t("finishIncompleteWorkoutTitle"), t("finishIncompleteWorkoutCopy"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("finish"),
        style: "destructive",
        onPress: finishActiveWorkoutSession
      }
    ]);
  }

  function abandonActiveWorkoutSession() {
    if (!activeWorkoutSession) {
      return;
    }

    Alert.alert(t("abandonWorkout"), t("cancelWorkout"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("abandonWorkout"),
        style: "destructive",
        onPress: () => {
          const abandoned = abandonWorkoutSession(activeWorkoutSession);
          setWorkoutSessions((current) => current.map((session) => session.id === abandoned.id ? abandoned : session));
          setActiveWorkoutSessionId(null);
          setIsPostWorkoutFillMode(false);
          setActiveScreen("home");
          Alert.alert(t("workoutAbandoned"));
        }
      }
    ]);
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
        Alert.alert(t("aiRewriteReady"));
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
        setRewriteError(error instanceof Error ? error.message : t("aiRewriteStartError"));
        setActiveScreen("workoutAiRewrite");
      } else {
        setCreatorSubmitError(error instanceof Error ? error.message : t("aiCreatorSubmitError"));
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
        : error instanceof Error ? error.message : t("aiCreatorSubmitError"));
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
      Alert.alert(t("aiRewriteReady"));
    } catch (error) {
      console.error("Workout rewrite failed", error);
      setRewriteError(isInsufficientAiCreditsError(error)
        ? t("aiCreditsInsufficient")
        : error instanceof Error ? error.message : t("aiRewriteStartError"));
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

    Alert.alert(t("aiRewriteReplaceConfirmTitle"), t("aiRewriteReplaceConfirmCopy"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("aiRewriteReplaceConfirmAction"),
        style: "destructive",
        onPress: () => {
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
      }
    ]);
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
      Alert.alert(t("deleteWorkoutWithHistoryTitle"), t("deleteWorkoutWithHistoryCopy"), [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("deleteWorkoutAction"),
          style: "destructive",
          onPress: () => performDeleteWorkout(workoutId)
        }
      ]);
      return;
    }

    performDeleteWorkout(workoutId);
  }

  function deleteWorkoutHistoryEntry(sessionId: string) {
    const session = workoutSessions.find((item) => item.id === sessionId);
    if (!session || session.deletedAt) {
      return;
    }

    Alert.alert(t("deleteHistoryEntryTitle"), t("deleteHistoryEntryCopy"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: () => {
          const deletedSession = markWorkoutSessionDeleted(session);
          setWorkoutSessions((current) => current.map((item) => item.id === sessionId ? deletedSession : item));
          if (activeWorkoutSessionId === sessionId) {
            setActiveWorkoutSessionId(null);
          }
          if (selectedWorkoutSessionId === sessionId) {
            setSelectedWorkoutSessionId(null);
            setActiveScreen("workoutHistory");
          }
        }
      }
    ]);
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
      email: authResponse.user.email,
      id: authResponse.user.id,
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
      setAuthError(error instanceof Error ? error.message : t("authRequestError"));
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
      setAuthError(error instanceof Error ? error.message : t("authRequestError"));
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
      setAuthError(error instanceof Error ? error.message : t("authRequestError"));
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
      setAuthError(error instanceof Error ? error.message : t("changePasswordFailed"));
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
        headers: getAuthHeaders(user)
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
      setAuthError(error instanceof Error ? error.message : t("authRequestError"));
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
      setAuthError(error instanceof Error ? error.message : t("authRequestError"));
    }
  }

  async function logoutAllAuthSessions() {
    if (!user) {
      return;
    }

    Alert.alert(t("signOutAllSessions"), t("confirmSignOutAllSessions"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("signOutAllSessions"),
        style: "destructive",
        onPress: () => {
          fetch(`${apiBaseUrl}/api/auth/logout-all`, {
            body: JSON.stringify({ exceptCurrent: false }),
            headers: {
              "Content-Type": "application/json",
              ...getAuthHeaders(user)
            },
            method: "POST"
          })
            .then(() => logOut())
            .catch((error) => setAuthError(error instanceof Error ? error.message : t("authRequestError")));
        }
      }
    ]);
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
      setBugFormError(error instanceof Error ? error.message : t("bugSubmitError"));
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

  function openProfile() {
    if (!user) {
      setAuthMode("login");
      setAuthError("");
      setShowLoginForm(true);
    }

    setActiveScreen("profile");
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

    if (activeScreen === "workoutAiRewrite" || activeScreen === "workoutAiProposal") {
      setActiveScreen("workoutDetail");
      return true;
    }

    if (activeScreen === "forgotPassword") {
      setActiveScreen("profile");
      return true;
    }

    if (activeScreen === "changePassword" || activeScreen === "activeSessions") {
      setActiveScreen("settings");
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

  function formatTimerSeconds(totalSeconds: number) {
    const safeSeconds = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const seconds = safeSeconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  function parseTimerSeconds(value?: string) {
    if (!value?.trim()) {
      return 0;
    }

    const trimmed = value.trim().toLowerCase();
    const hmsMatch = trimmed.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
    if (hmsMatch) {
      const first = Number.parseInt(hmsMatch[1], 10);
      const second = Number.parseInt(hmsMatch[2], 10);
      const third = hmsMatch[3] ? Number.parseInt(hmsMatch[3], 10) : 0;
      if ([first, second, third].every(Number.isFinite)) {
        return hmsMatch[3] ? first * 3600 + second * 60 + third : first * 60 + second;
      }
    }

    const minutesMatch = trimmed.match(/(\d+)\s*m/);
    const secondsMatch = trimmed.match(/(\d+)\s*s/);
    const minutes = minutesMatch ? Number.parseInt(minutesMatch[1], 10) : 0;
    const seconds = secondsMatch ? Number.parseInt(secondsMatch[1], 10) : 0;
    if (minutes || seconds) {
      return minutes * 60 + seconds;
    }

    const numeric = Number.parseInt(trimmed, 10);
    return Number.isFinite(numeric) ? numeric : 0;
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
    Alert.alert(shouldBeFavorite ? t("favoriteExerciseAdded") : t("favoriteExerciseRemoved"));
  }

  function toggleCatalogExerciseFavorite(exerciseId: string) {
    if (!findExerciseById(exerciseId)) {
      return;
    }

    const wasFavorite = isExerciseFavorite(favoriteExercises, exerciseId);
    setFavoriteExercises((current) => toggleFavoriteExercise(current, exerciseId));
    Alert.alert(wasFavorite ? t("favoriteExerciseRemoved") : t("favoriteExerciseAdded"));
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

  function formatEntryPlan(entry: WorkoutSessionEntry) {
    const values = [
      entry.plannedTarget,
      entry.plannedWeight ? `${entry.plannedWeight} kg` : ""
    ].filter(Boolean);

    return values.length ? values.join(", ") : t("noData");
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
    setExerciseDetailReturnScreen(activeScreen);
    setActiveScreen("exerciseDetail");
  }

  function renderHome() {
    const homeWorkouts = filteredWorkouts.slice(0, 5);

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
            logOut={logOut}
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

        {activeWorkoutSession ? (
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
        ) : null}

        {renderTrainingFactPill()}

        {renderWorkoutCreatorButton()}

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
          addStep={addStep}
          defaultSetCount={defaultSetCount}
          defaultStageType={defaultStageType}
          defaultWeight={defaultWeight}
          isEditing={Boolean(editingWorkoutId)}
          isDarkMode={isDarkMode}
          favoriteExerciseIds={getValidFavoriteExerciseIds(favoriteExercises)}
          language={language}
          moveStep={moveStep}
          onToggleFavoriteExercise={toggleCatalogExerciseFavorite}
          onBack={() => setActiveScreen(editingWorkoutId ? "workoutDetail" : "home")}
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
        <AppButton
          icon="chevron-back"
          style={styles.secondaryButton}
          textStyle={styles.secondaryButtonText}
          theme={theme}
          variant="outline"
          onPress={() => setActiveScreen("workouts")}
        >
          {t("aiCreatorBack")}
        </AppButton>

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
                    onPress={() => setActiveScreen("aiCredits")}
                  >
                    {t("aiCreditsGoTo")}
                  </AppButton>
                ) : null}
              </View>
              <AppButton
                disabled={isCreatorSubmitting || isCreatorJobPending || aiCreditBalance.balance < aiCreditBalance.planCost}
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
                  disabled={isCreatorSubmitting || isCreatorJobPending}
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
                  disabled={isCreatorSubmitting || isCreatorJobPending}
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
        backLabel={t("backToStart")}
        language={language}
        theme={theme}
        onBack={() => setActiveScreen("home")}
      />
    );
  }

  function renderWorkouts() {
    return (
      <>
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
      { label: t("abandonedStatus"), value: "abandoned" },
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
            {t("start")}: {formatSessionTime(session.startedAt)} · {t("finishWorkout")}: {formatSessionTime(session.finishedAt)}
          </Text>
          <Text style={[styles.workoutMeta, { color: theme.muted }]}>
            {getSessionStatusLabel(session.status)} · {t("executionMode")}: {getExecutionModeLabel(session.executionMode)}
          </Text>
          {session.notes ? (
            <Text style={[styles.workoutDetailNotes, { color: theme.muted }]}>{session.notes}</Text>
          ) : null}
        </View>

        <View style={styles.sessionList}>
          {session.entries.map((entry) => {
            const volume = calculateEntryVolume(entry);

            return (
              <View key={entry.id} style={[styles.sessionEntryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.workoutName, { color: theme.text }]}>{formatSessionEntryTitle(entry)}</Text>
                <Text style={[styles.workoutMeta, { color: theme.muted }]}>{formatSessionEntryMeta(entry)}</Text>
                <Text style={[styles.workoutMeta, { color: theme.muted }]}>
                  {t("planned")}: {formatEntryPlan(entry)}
                </Text>
                <Text style={[styles.workoutMeta, { color: theme.muted }]}>
                  {t("actual")}: {formatEntryActual(entry)}
                </Text>
                {volume ? (
                  <Text style={[styles.workoutMeta, { color: theme.muted }]}>
                    {t("volume")}: {formatNumber(volume, "kg")}
                  </Text>
                ) : null}
                <Text style={[styles.workoutMeta, { color: theme.muted }]}>
                  {entry.isCompleted ? t("completedStatusLabel") : t("noData")}
                </Text>
                {entry.notes ? (
                  <Text style={[styles.workoutDetailNotes, { color: theme.muted }]}>{entry.notes}</Text>
                ) : null}
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  function renderExerciseProgressResult(result: ExerciseProgressResult) {
    const entry = result.entry;

    return (
      <View key={`${result.session.id}-${entry.id}`} style={[styles.sessionHistoryRow, { borderColor: theme.border }]}>
        <Text style={[styles.workoutName, { color: theme.text }]}>{formatSessionDateTime(result.session)}</Text>
        <Text style={[styles.workoutMeta, { color: theme.muted }]}>{getWorkoutSessionDisplayName(result.session)}</Text>
        <Text style={[styles.workoutMeta, { color: theme.muted }]}>{formatSessionEntryMeta(entry)}</Text>
        <Text style={[styles.workoutMeta, { color: theme.muted }]}>
          {t("actual")}: {formatEntryActual(entry)}
        </Text>
        {result.volume ? (
          <Text style={[styles.workoutMeta, { color: theme.muted }]}>
            {t("volume")}: {formatNumber(result.volume, "kg")}
          </Text>
        ) : null}
        {entry.notes ? (
          <Text style={[styles.workoutDetailNotes, { color: theme.muted }]}>{entry.notes}</Text>
        ) : null}
      </View>
    );
  }

  function renderProgressScreen() {
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

        {filteredExerciseProgressItems.length ? (
          <View style={styles.sessionList}>
            {filteredExerciseProgressItems.map((item: ExerciseProgressItem) => (
              <Pressable
                key={item.exerciseKey}
                accessibilityRole="button"
                style={[styles.sessionEntryCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => openExerciseProgress(item.exerciseKey)}
              >
                <View style={styles.sessionEntryHeader}>
                  <View style={styles.workoutInfo}>
                    <Text style={[styles.workoutName, { color: theme.text }]}>
                      {getExerciseDisplayName(item.exerciseName, language)}
                    </Text>
                    <Text style={[styles.workoutMeta, { color: theme.muted }]}>
                      {item.sessionCount} {t("workouts").toLowerCase()}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.muted} />
                </View>
                <Text style={[styles.workoutMeta, { color: theme.muted }]}>
                  {t("last")}: {formatEntryActual(item.lastResult.entry)}
                </Text>
                <Text style={[styles.workoutMeta, { color: theme.muted }]}>
                  {t("bestWeight")}: {formatNumber(item.bestWeight, "kg")}
                </Text>
                <Text style={[styles.workoutMeta, { color: theme.muted }]}>
                  {t("bestVolume")}: {formatNumber(item.bestVolumeSingleEntry, "kg")}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={[styles.emptyBuilder, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="trending-up-outline" size={26} color={theme.primary} />
            <Text style={[styles.emptyBuilderTitle, { color: theme.text }]}>{t("emptyProgressTitle")}</Text>
            <Text style={[styles.emptyBuilderCopy, { color: theme.muted }]}>{t("emptyProgressCopy")}</Text>
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

    const bestSessionVolume = summary.totalVolumeBySession[0]?.volume ?? null;

    return (
      <View style={styles.historyScreen}>
        <View style={[styles.sessionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {getExerciseDisplayName(summary.exerciseName, language)}
          </Text>
          <Text style={[styles.workoutMeta, { color: theme.muted }]}>
            {summary.results.length} {t("sessions").toLowerCase()} · {summary.sessionCount} {t("workouts").toLowerCase()}
          </Text>
          <Text style={[styles.workoutMeta, { color: theme.muted }]}>
            {t("last")}: {formatEntryActual(summary.lastResult.entry)}
          </Text>
          <Text style={[styles.workoutMeta, { color: theme.muted }]}>
            {t("bestWeight")}: {formatNumber(summary.bestWeight, "kg")}
          </Text>
          <Text style={[styles.workoutMeta, { color: theme.muted }]}>
            {t("mostReps")}: {formatNumber(summary.bestReps)}
          </Text>
          <Text style={[styles.workoutMeta, { color: theme.muted }]}>
            {t("bestVolume")}: {formatNumber(bestSessionVolume ?? summary.bestVolumeSingleEntry, "kg")}
          </Text>
          <Text style={[styles.workoutMeta, { color: theme.muted }]}>
            {t("estimatedOneRepMax")}: {formatNumber(summary.estimatedOneRepMax, "kg")}
          </Text>
        </View>

        <CollapsiblePanel
          isCollapsed={false}
          theme={theme}
          title={t("resultHistory")}
          onToggle={() => undefined}
        >
          <View style={styles.sessionHistoryList}>
            {summary.results.map(renderExerciseProgressResult)}
          </View>
        </CollapsiblePanel>
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

    return (
      <View style={styles.historyScreen}>
        <View style={[styles.sessionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.sessionEntryHeader}>
            <View style={styles.workoutInfo}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>{displayName}</Text>
              {details ? (
                <Text style={[styles.workoutMeta, { color: theme.muted }]}>
                  {[details.category, ...details.equipment.slice(0, 3)].filter(Boolean).join(" · ")}
                </Text>
              ) : (
                <Text style={[styles.workoutMeta, { color: theme.muted }]}>{t("noExerciseDetails")}</Text>
              )}
            </View>
            <AppButton
              icon="chevron-back"
              style={styles.builderBackButton}
              textStyle={styles.builderBackButtonText}
              theme={theme}
              variant="outline"
              onPress={() => setActiveScreen(exerciseDetailReturnScreen)}
            >
              {t("back")}
            </AppButton>
          </View>
        </View>

        <View style={[styles.sessionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.workoutName, { color: theme.text }]}>{t("exerciseAnimation")}</Text>
          <View style={[styles.exerciseAnimationPlaceholder, { backgroundColor: theme.secondaryBand, borderColor: theme.border }]}>
            <Ionicons name="videocam-outline" size={28} color={theme.primary} />
            <Text style={[styles.emptyBuilderCopy, { color: theme.muted }]}>
              {details?.hasAnimation && details.animationUrl ? details.animationUrl : t("exerciseAnimationPlaceholder")}
            </Text>
          </View>
        </View>

        <View style={[styles.sessionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.workoutName, { color: theme.text }]}>{t("workedMuscles")}</Text>
          {hasMuscleData ? (
            <>
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
              <View style={styles.muscleOverviewFigures}>
                <HumanMuscleFigure fill={fill} side="front" />
                <HumanMuscleFigure fill={fill} side="back" />
              </View>
            </>
          ) : (
            <Text style={[styles.emptyBuilderCopy, { color: theme.muted }]}>{t("noExerciseMuscleData")}</Text>
          )}
        </View>

        <View style={[styles.sessionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.workoutName, { color: theme.text }]}>{t("howToPerform")}</Text>
          <Text style={[styles.workoutDetailNotes, { color: theme.muted }]}>
            {details?.exercise?.description || t("techniquePlaceholder")}
          </Text>
        </View>

        <View style={[styles.sessionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.workoutName, { color: theme.text }]}>{t("tips")}</Text>
          <Text style={[styles.workoutDetailNotes, { color: theme.muted }]}>{t("tipsPlaceholder")}</Text>
        </View>

        <View style={[styles.sessionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.workoutName, { color: theme.text }]}>{t("commonMistakes")}</Text>
          <Text style={[styles.workoutDetailNotes, { color: theme.muted }]}>{t("commonMistakesPlaceholder")}</Text>
        </View>

        <View style={[styles.sessionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.workoutName, { color: theme.text }]}>{t("exerciseHistory")}</Text>
          {progressSummary ? (
            <>
              <Text style={[styles.workoutMeta, { color: theme.muted }]}>
                {progressSummary.sessionCount} {t("workouts").toLowerCase()} · {progressSummary.results.length} {t("sessions").toLowerCase()}
              </Text>
              <Text style={[styles.workoutMeta, { color: theme.muted }]}>
                {t("last")}: {formatEntryActual(progressSummary.lastResult.entry)}
              </Text>
              <Text style={[styles.workoutMeta, { color: theme.muted }]}>
                {t("bestWeight")}: {formatNumber(progressSummary.bestWeight, "kg")}
              </Text>
              <Text style={[styles.workoutMeta, { color: theme.muted }]}>
                {t("bestVolume")}: {formatNumber(progressSummary.bestVolumeSingleEntry, "kg")}
              </Text>
            </>
          ) : (
            <Text style={[styles.emptyBuilderCopy, { color: theme.muted }]}>{t("exerciseHistoryPlaceholder")}</Text>
          )}
        </View>
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
      .filter((step) => step.kind === "stage")
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
        <AppButton
          icon="sparkles-outline"
          theme={theme}
          variant="outline"
          onPress={() => {
            if (user && aiCreditBalance.balance < aiCreditBalance.rewriteCost) {
              setActiveScreen("aiCredits");
              return;
            }

            openWorkoutAiRewrite(selectedWorkout.id);
          }}
        >
          {t("aiRewriteAction")}
        </AppButton>
        {user && aiCreditBalance.balance < aiCreditBalance.rewriteCost ? (
          <Text style={[styles.settingsHint, { color: theme.danger }]}>
            {t("aiCreditsInsufficient")}
          </Text>
        ) : null}

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
          {stageGroups.map(({ stage, series }, index) => (
            <CollapsiblePanel
              collapseLabel={t("collapse")}
              expandLabel={t("expand")}
              key={stage.id}
              isCollapsed={isReadOnlyWorkoutPanelCollapsed(`workout-stage-${stage.id}`)}
              leadingAccessory={
                <View style={[styles.workoutDetailStageBadge, { backgroundColor: theme.secondaryBand }]}>
                  <Text style={[styles.workoutDetailStageBadgeText, { color: theme.primary }]}>
                    {index + 1}
                  </Text>
                </View>
              }
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
          ))}
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
        <AppButton
          icon="chevron-back"
          style={styles.builderBackButton}
          textStyle={styles.builderBackButtonText}
          theme={theme}
          variant="outline"
          onPress={() => setActiveScreen("workoutDetail")}
        >
          {t("backToStart")}
        </AppButton>

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
                onPress={() => setActiveScreen("aiCredits")}
              >
                {t("aiCreditsGoTo")}
              </AppButton>
            ) : null}
          </View>

          {rewriteError ? <Text style={[styles.authError, { color: theme.danger }]}>{rewriteError}</Text> : null}

          <AppButton
            disabled={isRewriteSubmitting || isRewriteJobPending || !sourceWorkout || aiCreditBalance.balance < aiCreditBalance.rewriteCost}
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
    const selectedReminderDays = reminderDayOptions
      .filter((option) => workoutReminders.daysOfWeek.includes(option.value))
      .map((option) => option.shortLabel)
      .join(", ");
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
          <View style={styles.reminderDaysBlock}>
            <Text style={[styles.settingsOptionLabel, { color: theme.text }]}>{t("reminderDays")}</Text>
            <View style={styles.reminderDayPills}>
              {reminderDayOptions.map((day) => {
                const selected = workoutReminders.daysOfWeek.includes(day.value);

                return (
                  <Pressable
                    key={day.value}
                    accessibilityLabel={day.label}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[
                      styles.reminderDayPill,
                      {
                        backgroundColor: selected ? theme.primary : theme.control,
                        borderColor: selected ? theme.primary : theme.border
                      }
                    ]}
                    onPress={() => toggleWorkoutReminderDay(day.value)}
                  >
                    <Text style={[
                      styles.reminderDayPillText,
                      { color: selected ? theme.white : theme.text }
                    ]}>
                      {day.shortLabel}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            style={styles.reminderTimeCard}
            onPress={() => {
              setPendingWorkoutReminderTime(workoutReminders.time);
              setActiveSettingsSheet("workoutReminderTime");
            }}
          >
            <View style={[styles.infoLinkIcon, { backgroundColor: theme.secondaryBand }]}>
              <Ionicons name="time-outline" size={22} color={theme.primary} />
            </View>
            <Text style={[styles.settingsOptionLabel, { color: theme.text }]}>{t("reminderTime")}</Text>
            <Text style={[styles.reminderTimeValue, { color: theme.text }]}>{workoutReminders.time}</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.muted} />
          </Pressable>
          <View style={styles.reminderMessageBlock}>
            <Text style={[styles.settingsOptionLabel, { color: theme.text }]}>{t("reminderMessage")}</Text>
            <AppInput
              placeholder={getDefaultWorkoutReminderSettings(language).message}
              theme={theme}
              value={workoutReminders.message}
              onChangeText={updateWorkoutReminderMessage}
            />
          </View>
          <View style={styles.reminderMessageBlock}>
            <Text style={[styles.settingsOptionLabel, { color: theme.text }]}>{t("reminderDescription")}</Text>
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
          {reminderSchedulingStatus === "permissionDenied" ? (
            <Text style={[styles.settingsHint, { color: theme.danger }]}>{t("remindersPermissionDenied")}</Text>
          ) : reminderSchedulingStatus === "failed" ? (
            <Text style={[styles.settingsHint, { color: theme.danger }]}>{t("remindersScheduleError")}</Text>
          ) : reminderSchedulingStatus === "scheduled" && workoutReminders.enabled ? (
            <Text style={[styles.settingsHint, { color: theme.muted }]}>{t("remindersScheduled")}</Text>
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

    return (
      <View style={styles.creatorForm}>
        <AppButton
          icon="chevron-back"
          style={styles.builderBackButton}
          textStyle={styles.builderBackButtonText}
          theme={theme}
          variant="outline"
          onPress={() => setActiveScreen("settings")}
        >
          {t("backToSettings")}
        </AppButton>

        <View style={[styles.creatorPanel, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.panelHeroHeader}>
            <View style={[styles.legalIcon, { backgroundColor: theme.secondaryBand }]}>
              <Ionicons name="sparkles-outline" size={26} color={theme.primary} />
            </View>
            <View style={styles.workoutInfo}>
              <Text style={[styles.creatorPromptTitle, { color: theme.text }]}>{t("aiCredits")}</Text>
              <Text style={[styles.creatorDescription, { color: theme.muted }]}>
                {t("aiCreditsDescription")}
              </Text>
            </View>
          </View>

          <View style={[styles.creatorPlanBox, { backgroundColor: theme.secondaryBand, borderColor: theme.border }]}>
            <Text style={[styles.workoutMeta, { color: theme.muted }]}>{t("aiCreditsAvailable")}</Text>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{aiCreditBalance.balance}</Text>
            <Text style={[styles.workoutMeta, { color: theme.muted }]}>
              {t("aiCreditsPlanCost")}: {aiCreditBalance.planCost} · {t("aiCreditsRewriteCost")}: {aiCreditBalance.rewriteCost}
            </Text>
          </View>

          {aiCreditsError ? (
            <Text style={[styles.authError, { color: theme.danger }]}>{aiCreditsError}</Text>
          ) : null}
          {aiCreditsPurchaseMessage ? (
            <Text style={[styles.workoutMeta, { color: theme.primary }]}>{aiCreditsPurchaseMessage}</Text>
          ) : null}

          <AppButton
            disabled={isAiCreditsLoading || isAiCreditPurchaseLoading}
            icon="refresh-outline"
            theme={theme}
            variant="outline"
            onPress={() => void fetchAiCredits(user)}
          >
            {isAiCreditsLoading ? t("aiCreatorSubmitting") : t("refresh")}
          </AppButton>

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
            <Text style={[styles.creatorSectionTitle, { color: theme.text }]}>{t("aiCreditsBuy")}</Text>
            {aiCreditPacks.length ? (
              <View style={styles.sessionHistoryList}>
                {aiCreditPacks.map((pack) => (
                  <View key={pack.productId} style={[styles.sessionHistoryRow, { borderColor: theme.border }]}>
                    <View style={styles.workoutInfo}>
                      <Text style={[styles.workoutName, { color: theme.text }]}>{pack.displayName}</Text>
                      <Text style={[styles.workoutMeta, { color: theme.muted }]}>
                        {pack.credits} {t("aiCredits").toLowerCase()}
                        {pack.localizedPrice ? ` · ${pack.localizedPrice}` : ""}
                      </Text>
                    </View>
                    <AppButton
                      disabled={isAiCreditPurchaseLoading || !pack.active}
                      icon="card-outline"
                      theme={theme}
                      onPress={() => void buyAiCreditPack(pack)}
                    >
                      {isAiCreditPurchaseLoading ? t("aiCreditsProcessingPurchase") : t("aiCreditsBuy")}
                    </AppButton>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.workoutMeta, { color: theme.muted }]}>{t("aiCreditsPurchaseSoon")}</Text>
            )}
            <AppButton
              disabled={isAiCreditPurchaseLoading || !aiCreditPacks.length}
              icon="reload-outline"
              theme={theme}
              variant="outline"
              onPress={() => void restorePendingAiCreditPurchases()}
            >
              {t("aiCreditsRestorePurchases")}
            </AppButton>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={[styles.creatorSectionTitle, { color: theme.text }]}>{t("aiCreditsHistory")}</Text>
            {aiCreditTransactions.length ? (
              <View style={styles.sessionHistoryList}>
                {aiCreditTransactions.map((transaction) => (
                  <View key={transaction.id} style={[styles.sessionHistoryRow, { borderColor: theme.border }]}>
                    <View style={styles.workoutInfo}>
                      <Text style={[styles.workoutName, { color: theme.text }]}>
                        {transaction.amount < 0 ? t("aiCreditsUsed") : t("aiCreditsAdded")}
                      </Text>
                      <Text style={[styles.workoutMeta, { color: theme.muted }]}>
                        {formatAiCreditTransactionDate(transaction.createdAt)}
                        {transaction.reason ? ` · ${transaction.reason}` : ""}
                      </Text>
                    </View>
                    <Text style={[styles.workoutName, { color: transaction.amount < 0 ? theme.danger : theme.primary }]}>
                      {transaction.amount > 0 ? "+" : ""}{transaction.amount}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.workoutMeta, { color: theme.muted }]}>{t("empty")}</Text>
            )}
          </View>
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
        <LegalPage
          icon="document-text-outline"
        title={t("terms")}
        theme={theme}
        backLabel={t("backToSettings")}
        onBack={() => setActiveScreen("settings")}
      >
        <Text style={[styles.legalText, { color: theme.muted }]}>
          {t("termsIntroOne")}
        </Text>
        <Text style={[styles.legalText, { color: theme.muted }]}>
          {t("termsIntroTwo")}
        </Text>
        <Text style={[styles.legalText, { color: theme.muted }]}>
          {t("termsIntroThree")}
        </Text>
        <View style={[styles.legalDivider, { backgroundColor: theme.border }]} />
        <LegalSection
          theme={theme}
          title={t("termsGeneralTitle")}
          text={t("termsGeneralText")}
        />
        <LegalSection
          theme={theme}
          title={t("userAccount")}
          text={t("termsAccountText")}
        />
        <LegalSection
          theme={theme}
          title={t("termsUsageTitle")}
          text={t("termsUsageText")}
        />
        <LegalSection
          theme={theme}
          title={t("termsWorkoutResponsibilityTitle")}
          text={t("termsWorkoutResponsibilityText")}
        />
        <LegalSection
          theme={theme}
          title={t("termsPrivacyTitle")}
          text={t("termsPrivacyText")}
        />
        <LegalSection
          theme={theme}
          title={t("termsLiabilityTitle")}
          text={t("termsLiabilityText")}
        />
        <LegalSection
          theme={theme}
          title={t("termsChangesTitle")}
          text={t("termsChangesText")}
        />
        <LegalSection
          theme={theme}
          title={t("contact")}
          text={t("termsContactText")}
        />
      </LegalPage>
    );
  }

  function renderContact() {
    const contactEmail = "kontakt@gymmin.app";

    return (
      <LegalPage
        icon="mail-outline"
        title={t("contact")}
        theme={theme}
        backLabel={t("backToSettings")}
        onBack={() => setActiveScreen("settings")}
      >
        <Text style={[styles.legalText, { color: theme.muted }]}>
          {t("contactIntro")}
        </Text>
        <Pressable
          accessibilityRole="link"
          style={[styles.contactBox, { backgroundColor: theme.secondaryBand }]}
          onPress={() => Linking.openURL(`mailto:${contactEmail}`)}
        >
          <Text style={[styles.contactLabel, { color: theme.muted }]}>Email</Text>
          <Text style={[styles.contactValue, { color: theme.text }]}>{contactEmail}</Text>
        </Pressable>
        <Text style={[styles.legalText, { color: theme.muted }]}>
          {t("contactResponseTime")}
        </Text>
        <Text style={[styles.legalText, { color: theme.muted }]}>
          {t("contactBugInfo")}
        </Text>
        <View style={[styles.legalDivider, { backgroundColor: theme.border }]} />
        <Text style={[styles.legalSectionTitle, { color: theme.text }]}>{t("faq")}</Text>
        <FaqItem
          answer={t("contactFaqBugAnswer")}
          question={t("contactFaqBugQuestion")}
          theme={theme}
        />
        <FaqItem
          answer={t("contactFaqIdeaAnswer")}
          question={t("contactFaqIdeaQuestion")}
          theme={theme}
        />
        <FaqItem
          answer={t("contactFaqWorkoutAnswer")}
          question={t("contactFaqWorkoutQuestion")}
          theme={theme}
        />
        <FaqItem
          answer={t("contactFaqPrivacyAnswer")}
          question={t("contactFaqPrivacyQuestion")}
          theme={theme}
        />
      </LegalPage>
    );
  }

  function renderBugReport() {
    return (
      <LegalPage
        icon="bug-outline"
        title={t("bugReport")}
        theme={theme}
        backLabel={t("backToSettings")}
        onBack={() => setActiveScreen("settings")}
      >
        <Text style={[styles.legalText, { color: theme.muted }]}>
          {t("bugIntro")}
        </Text>
        <View style={styles.bugReportForm}>
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.text }]}>{t("bugTitle")}</Text>
            <AppInput
              placeholder={t("bugTitlePlaceholder")}
              theme={theme}
              value={bugTitle}
              onChangeText={setBugTitle}
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.text }]}>{t("bugDescription")}</Text>
            <AppTextarea
              placeholder={t("bugDescriptionPlaceholder")}
              style={styles.bugReportTextarea}
              theme={theme}
              value={bugDescription}
              onChangeText={setBugDescription}
            />
          </View>
          {bugFormError ? (
            <Text style={[styles.authError, { color: theme.danger }]}>{bugFormError}</Text>
          ) : null}
          <AppButton
            disabled={isBugSubmitting}
            icon="send-outline"
            theme={theme}
            onPress={() => void submitBugReport()}
          >
            {isBugSubmitting ? t("bugSubmitting") : t("submitBug")}
          </AppButton>
        </View>
      </LegalPage>
    );
  }

  function renderBugReportSuccess() {
    return (
      <LegalPage
        icon="checkmark-circle-outline"
        title={t("bugReport")}
        theme={theme}
        backLabel={t("backToStart")}
        onBack={() => setActiveScreen("home")}
      >
        <View style={[styles.bugSuccessBox, { backgroundColor: theme.secondaryBand }]}>
          <View style={styles.bugSuccessHeader}>
            <View style={[styles.bugSuccessIcon, { backgroundColor: theme.card }]}>
              <Ionicons name="checkmark-circle-outline" size={28} color={theme.primary} />
            </View>
            <Text style={[styles.bugSuccessText, { color: theme.text }]}>
              {t("bugAccepted")}
            </Text>
          </View>
          {bugSubmittedId ? (
            <View style={[styles.bugSuccessIdBox, { backgroundColor: theme.card }]}>
              <Text style={[styles.contactLabel, { color: theme.muted }]}>
                ID
              </Text>
              <Text selectable style={[styles.bugSuccessIdText, { color: theme.text }]}>
                {bugSubmittedId}
              </Text>
            </View>
          ) : null}
        </View>
        <AppButton icon="checkmark-outline" theme={theme} onPress={() => setActiveScreen("home")}>
          {t("bugSuccessOk")}
        </AppButton>
      </LegalPage>
    );
  }

  function renderProfile() {
    if (!user) {
      return (
        <View style={styles.loginScreenContent}>
          <AppButton
            icon="chevron-back"
            style={styles.builderBackButton}
            textStyle={styles.builderBackButtonText}
            theme={theme}
            variant="outline"
            onPress={() => setActiveScreen("home")}
          >
            {t("backToStart")}
          </AppButton>
          <LoginPanel
            authError={authError}
            authMode={authMode}
            displayName={displayName}
            email={email}
            isAuthSubmitting={isAuthSubmitting}
            logIn={logIn}
            logOut={logOut}
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

    return (
      <View style={styles.profileScreen}>
        <View style={styles.profileActionsRow}>
          <AppButton
            icon="log-out-outline"
            style={styles.secondaryButton}
            textStyle={styles.secondaryButtonText}
            theme={theme}
            variant="outline"
            onPress={logOut}
          >
            {t("logout")}
          </AppButton>
        </View>

        <View style={[styles.legalPanel, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.legalContent}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t("userData")}</Text>
            <View style={[styles.contactBox, { backgroundColor: theme.secondaryBand }]}>
              <Text style={[styles.contactLabel, { color: theme.muted }]}>{t("name")}</Text>
              <Text style={[styles.contactValue, { color: theme.text }]}>{user.name}</Text>
            </View>
            <View style={[styles.contactBox, { backgroundColor: theme.secondaryBand }]}>
              <Text style={[styles.contactLabel, { color: theme.muted }]}>Email</Text>
              <Text style={[styles.contactValue, { color: theme.text }]}>{user.email}</Text>
            </View>
          </View>
        </View>

        <SettingsSection
          isCollapsed={false}
          title={t("account")}
          theme={theme}
          onToggle={() => undefined}
        >
          <SettingsOption
            icon="key-outline"
            label={t("changePassword")}
            value=""
            theme={theme}
            onPress={() => {
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
          />
          <SettingsOption
            icon="phone-portrait-outline"
            label={t("activeSessions")}
            value=""
            theme={theme}
            onPress={() => {
              setAuthError("");
              setAuthMessage("");
              setActiveScreen("activeSessions");
              void fetchAuthSessions();
            }}
          />
          <SettingsOption
            icon="sparkles-outline"
            label={t("aiCredits")}
            value={String(aiCreditBalance.balance)}
            theme={theme}
            onPress={() => {
              setActiveScreen("aiCredits");
              void fetchAiCredits(user);
            }}
          />
        </SettingsSection>
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
                {session.deviceName || t("unknownDevice")} {session.isCurrent ? `· ${t("thisSession")}` : ""}
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

    if (activeSettingsSheet === "workoutReminderTime") {
      const [selectedHour = "18", selectedMinute = "00"] = pendingWorkoutReminderTime.split(":");
      const hourOptions = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
      const minuteOptions = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, "0"));

      return (
        <>
          <Text style={[styles.bottomSheetTitle, { color: theme.text }]}>{t("reminderTime")}</Text>
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
                      onPress={() => setPendingWorkoutReminderTime(`${hour}:${selectedMinute}`)}
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
                      onPress={() => setPendingWorkoutReminderTime(`${selectedHour}:${minute}`)}
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
                ...workoutReminders,
                time: pendingWorkoutReminderTime
              });
              closeSettingsSheet();
            }}
          >
            {t("save")}
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

  function formatWorkoutStepSummaryTitle(step: WorkoutStep) {
    if (step.exerciseName) {
      return getExerciseDisplayName(step.exerciseName, language);
    }

    return step.stageType
      ? t(stageTypeTranslationKeys[step.stageType])
      : t("elementWithoutExercise");
  }

  function formatSessionEntryMeta(entry: WorkoutSessionEntry) {
    const parts = [
      entry.sourceStageName,
      `${t("set")} ${entry.seriesIndex + 1}`,
      `${t("setsPlural")} ${entry.setIteration}`
    ].filter(Boolean);
    return parts.join(" · ");
  }

  function getSessionEntryIterationLabel(entry: WorkoutSessionEntry) {
    const iteration = Number.isFinite(entry.setIteration) && entry.setIteration > 0
      ? entry.setIteration
      : entry.seriesIndex + 1;
    return String(iteration || 1);
  }

  function formatSessionEntryExecutionTitle(entry: WorkoutSessionEntry) {
    return `[${getSessionEntryIterationLabel(entry)}] ${formatSessionEntryTitle(entry)}`;
  }

  function formatSessionEntryExecutionMeta(entry: WorkoutSessionEntry) {
    return [entry.sourceStageName].filter(Boolean).join(" · ");
  }

  function formatPlannedSessionEntry(entry: WorkoutSessionEntry) {
    return [
      entry.plannedTarget ? `${t("goal")}: ${entry.plannedTarget}` : "",
      entry.plannedWeight ? `${t("weight")}: ${entry.plannedWeight} kg` : ""
    ].filter(Boolean).join(" · ");
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

  function renderSessionEntryInputs(entry: WorkoutSessionEntry) {
    const toggleCompleted = () => {
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
    };

    return (
      <View style={styles.sessionInputGrid}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: entry.isCompleted }}
          style={styles.sessionCheckboxRow}
          onPress={toggleCompleted}
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
          <Text style={[styles.sessionCheckboxText, { color: theme.text }]}>{t("done")}</Text>
        </Pressable>
        {entry.isCompleted ? (
          <>
            <View style={styles.sessionInlineFields}>
              <View style={[styles.suffixedInput, styles.sessionInlineInput, { backgroundColor: theme.control, borderColor: theme.border }]}>
                <TextInput
                  keyboardType="decimal-pad"
                  placeholder={t("actualWeight")}
                  placeholderTextColor={theme.muted}
                  style={[styles.suffixedTextInput, { color: theme.inputText }]}
                  value={entry.actualWeight ?? ""}
                  onChangeText={(actualWeight) => updateWorkoutSessionEntry(entry.id, { actualWeight })}
                />
                <Text style={[styles.inputSuffix, { color: theme.muted }]}>kg</Text>
              </View>
              <AppInput
                keyboardType="number-pad"
                placeholder={t("actualReps")}
                style={styles.sessionInlineInput}
                theme={theme}
                value={entry.actualReps ?? ""}
                onChangeText={(actualReps) => updateWorkoutSessionEntry(entry.id, { actualReps })}
              />
            </View>
            <AppTextarea
              placeholder={t("note")}
              style={styles.sessionNoteInput}
              theme={theme}
              value={entry.notes ?? ""}
              onChangeText={(notes) => updateWorkoutSessionEntry(entry.id, { notes })}
            />
          </>
        ) : null}
      </View>
    );
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

  function renderGuidedEntryTable(entries: WorkoutSessionEntry[]) {
    return (
      <View style={[styles.guidedEntryTable, { borderColor: theme.border }]}>
        {entries.map((entry, index) => (
          <View
            key={entry.id}
            style={[
              styles.guidedEntryRow,
              { borderBottomColor: theme.border },
              index === entries.length - 1 ? styles.guidedEntryRowLast : null
            ]}
          >
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
              <Text style={[styles.sessionCheckboxText, { color: theme.text }]}>
                {t("set")} {entry.setIteration || index + 1}
              </Text>
            </Pressable>
            {entry.isCompleted ? (
              <View style={styles.guidedEntryFields}>
                <View style={[styles.suffixedInput, styles.guidedEntryInput, { backgroundColor: theme.control, borderColor: theme.border }]}>
                  <TextInput
                    keyboardType="decimal-pad"
                    placeholder={t("actualWeight")}
                    placeholderTextColor={theme.muted}
                    style={[styles.suffixedTextInput, { color: theme.inputText }]}
                    value={entry.actualWeight ?? ""}
                    onChangeText={(actualWeight) => updateWorkoutSessionEntry(entry.id, { actualWeight })}
                  />
                  <Text style={[styles.inputSuffix, { color: theme.muted }]}>kg</Text>
                </View>
                <AppInput
                  keyboardType="number-pad"
                  placeholder={t("actualReps")}
                  style={styles.guidedEntryInput}
                  theme={theme}
                  value={entry.actualReps ?? ""}
                  onChangeText={(actualReps) => updateWorkoutSessionEntry(entry.id, { actualReps })}
                />
              </View>
            ) : null}
          </View>
        ))}
      </View>
    );
  }

  function renderRestTimer(entry?: WorkoutSessionEntry) {
    if (!entry?.plannedTarget) {
      return null;
    }

    const plannedSeconds = parseTimerSeconds(entry.plannedTarget);
    if (plannedSeconds <= 0) {
      return null;
    }

    const isCurrentTimer = restTimerEntryId === entry.id;
    const displayedSeconds = isCurrentTimer ? restTimerRemainingSeconds : plannedSeconds;

    return (
      <View style={[styles.restTimerCard, { backgroundColor: theme.control, borderColor: theme.border }]}>
        <View style={styles.restTimerCopy}>
          <Text style={[styles.workoutMeta, { color: theme.muted }]}>{t("restTimer")}</Text>
          <Text style={[styles.restTimerValue, { color: theme.primary }]}>{formatTimerSeconds(displayedSeconds)}</Text>
        </View>
        <View style={styles.restTimerActions}>
          <Pressable
            accessibilityRole="button"
            style={[styles.restTimerButton, { borderColor: theme.border }]}
            onPress={() => {
              if (!isCurrentTimer || restTimerRemainingSeconds <= 0) {
                setRestTimerEntryId(entry.id);
                setRestTimerRemainingSeconds(plannedSeconds);
              }
              setIsRestTimerRunning((current) => !current || !isCurrentTimer);
            }}
          >
            <Text style={[styles.restTimerButtonText, { color: theme.primary }]}>
              {isCurrentTimer && isRestTimerRunning ? t("pauseTimer") : t("startTimer")}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={[styles.restTimerButton, { borderColor: theme.border }]}
            onPress={() => {
              setRestTimerEntryId(entry.id);
              setRestTimerRemainingSeconds(plannedSeconds);
              setIsRestTimerRunning(false);
            }}
          >
            <Text style={[styles.restTimerButtonText, { color: theme.primary }]}>{t("resetTimer")}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  function renderGuidedPlanPreview(session: WorkoutSession, group: { entries: WorkoutSessionEntry[]; restEntry?: WorkoutSessionEntry }) {
    const entry = group.entries[0];
    const setCount = String(group.entries.length || 1);
    const previewStep = getSessionEntryPreviewStep(session, entry);
    const restStep = group.restEntry ? getSessionEntryPreviewStep(session, group.restEntry) : null;
    const targetText = formatExerciseSetTarget({ ...previewStep, setCount });

    return (
      <View style={[styles.guidedPlanPreview, { borderColor: theme.border }]}>
        <ExerciseSummaryRow
          language={language}
          seriesIndex={entry.seriesIndex + 1}
          step={previewStep}
          targetText={targetText}
          theme={theme}
          t={t}
          onPressDetails={() => openExerciseDetail(previewStep)}
          onPressMuscles={() => openExerciseDetail(previewStep)}
        />
        {entry.notes || previewStep.notes ? (
          <Text style={[styles.workoutDetailNotes, { color: theme.muted }]}>
            {entry.notes || previewStep.notes}
          </Text>
        ) : null}
        {restStep && group.restEntry ? (
          <ExerciseSummaryRow
            language={language}
            pairedTargetText={targetText}
            step={restStep}
            targetText={getSessionEntrySetTarget(group.restEntry)}
            theme={theme}
            t={t}
            onPressDetails={() => openExerciseDetail(restStep)}
            onPressMuscles={() => openExerciseDetail(restStep)}
          />
        ) : null}
        {renderRestTimer(group.restEntry)}
      </View>
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
      const currentStageName = currentGroup.entries[0]?.sourceStageName || t("stage");
      const shouldShowGuidedEntryTable = currentGroup.entries.some(isWorkoutSessionEntryFillRequired);
      const elapsedSeconds = Math.max(0, Math.floor((sessionNow - Date.parse(session.startedAt)) / 1000));

      return (
        <View style={styles.sessionScreen}>
          <View style={[styles.sessionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.sessionProgressRow}>
              <View style={styles.sessionProgressCopy}>
                <Text style={[styles.sessionProgressText, { color: theme.text }]}>
                  {t("exercisePlural")} {guidedGroupIndex + 1}/{guidedGroups.length}
                </Text>
              </View>
              <Text style={[styles.sessionProgressText, styles.sessionProgressStage, { color: theme.primary }]} numberOfLines={1}>
                {formatTimerSeconds(elapsedSeconds)}
              </Text>
            </View>
            {renderGuidedPlanPreview(session, currentGroup)}
            {shouldShowGuidedEntryTable ? renderGuidedEntryTable(currentGroup.entries.filter(isWorkoutSessionEntryFillRequired)) : null}
            <View style={styles.sessionActions}>
              <AppButton
                disabled={!canGoBack}
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
          <WorkoutMuscleOverview language={language} theme={theme} workout={session.planSnapshot} />
          <View style={styles.sessionList}>
            {session.entries.map((entry) => (
              <View key={entry.id} style={[styles.sessionEntryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.workoutName, { color: theme.text }]}>{formatSessionEntryExecutionTitle(entry)}</Text>
                {formatSessionEntryExecutionMeta(entry) ? (
                  <Text style={[styles.workoutMeta, { color: theme.muted }]}>{formatSessionEntryExecutionMeta(entry)}</Text>
                ) : null}
                {formatPlannedSessionEntry(entry) ? (
                  <Text style={[styles.workoutMeta, { color: theme.muted }]}>{formatPlannedSessionEntry(entry)}</Text>
                ) : null}
              </View>
            ))}
          </View>
          <AppButton icon="create-outline" theme={theme} onPress={() => setIsPostWorkoutFillMode(true)}>
            {t("finishAndFill")}
          </AppButton>
          <AppButton icon="checkmark-outline" theme={theme} variant="outline" onPress={finishActiveWorkoutSession}>
            {t("finishWithoutFilling")}
          </AppButton>
          <AppButton icon="close-outline" theme={theme} variant="outline" onPress={abandonActiveWorkoutSession}>
            {t("cancelWorkout")}
          </AppButton>
        </View>
      );
    }

    return (
      <View style={styles.sessionScreen}>
        <View style={styles.sessionList}>
          {session.entries.map((entry) => (
            <View key={entry.id} style={[styles.sessionEntryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.sessionEntryHeader}>
                <View style={styles.workoutInfo}>
                  <Text style={[styles.workoutName, { color: theme.text }]}>{formatSessionEntryExecutionTitle(entry)}</Text>
                  {formatSessionEntryExecutionMeta(entry) ? (
                    <Text style={[styles.workoutMeta, { color: theme.muted }]}>{formatSessionEntryExecutionMeta(entry)}</Text>
                  ) : null}
                </View>
              </View>
              {formatPlannedSessionEntry(entry) ? (
                <Text style={[styles.workoutMeta, { color: theme.muted }]}>{formatPlannedSessionEntry(entry)}</Text>
              ) : null}
              {renderSessionEntryInputs(entry)}
            </View>
          ))}
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
              paddingTop: Math.max(insets.top, 20) + 6
            }
          ]}
        >
          <View style={styles.headerTitleBlock}>
            <GymminMark color={theme.primary} height={34} width={40} />
            <Text numberOfLines={1} style={[styles.headerTitle, { color: theme.text }]}>
              {screenTitle}
            </Text>
          </View>
          {shouldShowProfileHeaderButton ? (
            <Pressable
              accessibilityLabel="Przejdź do profilu"
              accessibilityRole="button"
              style={[styles.profileHeaderButton, { backgroundColor: theme.secondaryBand }]}
              onPress={openProfile}
            >
              <Ionicons name={user ? "person" : "person-outline"} size={24} color={theme.primary} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom:
                activeScreen === "builder"
                  ? stickyActionBottom + 118
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
          {activeScreen === "workoutHistory" && renderWorkoutHistoryScreen()}
          {activeScreen === "workoutSessionDetail" && renderWorkoutSessionDetail()}
          {activeScreen === "progress" && renderProgressScreen()}
          {activeScreen === "exerciseDetail" && renderExerciseDetailScreen()}
          {activeScreen === "exerciseProgress" && renderExerciseProgressScreen()}
          {activeScreen === "favoriteExercises" && renderFavoriteExercises()}
          {activeScreen === "aiCredits" && renderAiCredits()}
          {activeScreen === "terms" && renderTerms()}
          {activeScreen === "contact" && renderContact()}
          {activeScreen === "bugReport" && renderBugReport()}
          {activeScreen === "bugReportSuccess" && renderBugReportSuccess()}
          {activeScreen === "profile" && renderProfile()}
          {activeScreen === "forgotPassword" && renderForgotPassword()}
          {activeScreen === "changePassword" && renderChangePassword()}
          {activeScreen === "activeSessions" && renderActiveSessions()}
        </ScrollView>

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
              paddingBottom: bottomInset
            }
          ]}
        >
          {navItems.map((item) => {
            const selected =
              activeScreen === item.key ||
              (item.key === "home" && activeScreen === "articleDetail") ||
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
    </SafeAreaView>
  );
}

type Theme = (typeof themes)[ThemeName];

function getScreenTitle(
  activeScreen: ScreenKey,
  editingWorkoutId: string | null,
  t: (key: TranslationKey) => string
) {
  const titles: Record<ScreenKey, string> = {
    articleDetail: t("articles"),
    bugReport: t("bugReport"),
    bugReportSuccess: t("bugReport"),
    builder: editingWorkoutId ? t("editWorkout") : t("addNewWorkout"),
    contact: t("contact"),
    exerciseDetail: t("exerciseDetails"),
    exerciseProgress: t("exerciseProgress"),
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
    workoutAiProposal: t("aiRewriteProposal"),
    workoutAiRewrite: t("aiRewriteTitle"),
    workoutCreator: t("aiCreator"),
    workoutDetail: t("workout"),
    workoutHistory: t("workoutHistoryTitle"),
    workoutSession: t("startWorkout"),
    workoutSessionDetail: t("workoutDetails"),
    workouts: t("workouts")
  };

  return titles[activeScreen];
}

function GlobalErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const theme = themes.light;
  const errorMessage = error instanceof Error ? error.message : "Nieznany błąd aplikacji";
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
              {errorMessage}
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

type AppInputProps = TextInputProps & {
  inputStyle?: object | object[];
  theme: Theme;
};

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

function WorkoutMuscleOverview({ language, theme, workout }: WorkoutMuscleOverviewProps) {
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
    <View style={[styles.muscleOverviewPanel, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Text style={[styles.muscleOverviewTitle, { color: theme.text }]}>
        {translate(language, "overview")}
      </Text>
      <View style={styles.muscleOverviewFigures}>
        <HumanMuscleFigure fill={fill} side="front" />
        <HumanMuscleFigure fill={fill} side="back" />
      </View>
      <View style={styles.muscleOverviewLegend}>
        <LegendItem color={colors.primary} label={`${translate(language, "primaryMuscles")} (${primaryCount})`} theme={theme} />
        <LegendItem color={colors.secondary} label={`${translate(language, "secondaryMuscles")} (${secondaryCount})`} theme={theme} />
        <LegendItem color={colors.inactive} label={translate(language, "inactiveMuscleGroups")} theme={theme} />
      </View>
    </View>
  );
}

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
};

function HumanMuscleFigure({ fill, side }: HumanMuscleFigureProps) {
  const svgSource = side === "front" ? frontBodySvg : backBodySvg;
  const regionMap = side === "front" ? frontBodyRegionMap : backBodyRegionMap;
  const xml = useMemo(() => colorizeBodySvg(svgSource, regionMap, fill), [fill, regionMap, svgSource]);

  return (
    <View style={styles.humanMuscleFigure}>
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

function AppInput({ theme, style, ...props }: AppInputProps) {
  return (
    <Input
      style={[
        styles.gluestackInput,
        { backgroundColor: theme.control, borderColor: theme.border },
        style
      ]}
    >
      <InputField
        placeholderTextColor={theme.muted}
        style={[styles.gluestackInputField, { color: theme.inputText }]}
        {...props}
      />
    </Input>
  );
}

type PasswordInputProps = AppInputProps & {
  isVisible: boolean;
  setIsVisible: React.Dispatch<React.SetStateAction<boolean>>;
};

function PasswordInput({ isVisible, setIsVisible, theme, style, ...props }: PasswordInputProps) {
  return (
    <Input
      style={[
        styles.gluestackInput,
        styles.passwordInput,
        { backgroundColor: theme.control, borderColor: theme.border },
        style
      ]}
    >
      <InputField
        placeholderTextColor={theme.muted}
        secureTextEntry={!isVisible}
        style={[styles.gluestackInputField, styles.passwordInputField, { color: theme.inputText }]}
        {...props}
      />
      <Pressable
        accessibilityLabel={isVisible ? "Ukryj hasło" : "Pokaż hasło"}
        accessibilityRole="button"
        style={styles.passwordVisibilityButton}
        onPress={() => setIsVisible((current) => !current)}
      >
        <Ionicons
          name={isVisible ? "eye-off-outline" : "eye-outline"}
          size={22}
          color={theme.muted}
        />
      </Pressable>
    </Input>
  );
}

function AppTextarea({ inputStyle, theme, style, ...props }: AppInputProps) {
  return (
    <Textarea
      style={[
        styles.gluestackTextarea,
        { backgroundColor: theme.control, borderColor: theme.border },
        style
      ]}
    >
      <TextareaInput
        multiline
        placeholderTextColor={theme.muted}
        style={[styles.gluestackTextareaInput, inputStyle, { color: theme.inputText }]}
        {...props}
      />
    </Textarea>
  );
}

type AppButtonProps = {
  children: string;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  style?: object | object[];
  textStyle?: object | object[];
  theme: Theme;
  variant?: "primary" | "light" | "outline";
};

function AppButton({
  children,
  disabled = false,
  icon,
  onPress,
  style,
  textStyle,
  theme,
  variant = "primary"
}: AppButtonProps) {
  const isLight = variant === "light";
  const isOutline = variant === "outline";
  const flattenedTextStyle = StyleSheet.flatten(textStyle) as { color?: string } | undefined;
  const textColorOverride = flattenedTextStyle?.color;
  const foreground = textColorOverride ?? (isLight ? theme.primaryStrong : isOutline ? theme.primary : theme.white);

  return (
    <Button
      accessibilityRole="button"
      isDisabled={disabled}
      style={[
        styles.gluestackButton,
        {
          backgroundColor: isLight ? theme.white : isOutline ? theme.card : theme.primary,
          borderColor: isOutline ? theme.primary : "transparent",
          borderWidth: isOutline ? 1 : 0,
          opacity: disabled ? 0.64 : 1
        },
        style
      ]}
      onPress={disabled ? undefined : onPress}
    >
      {icon === "add" ? (
        <Text style={[styles.plusIcon, styles.buttonPlusIcon, { color: foreground }]}>+</Text>
      ) : icon ? (
        <Ionicons name={icon} size={18} color={foreground} />
      ) : null}
      <ButtonText style={[styles.gluestackButtonText, { color: foreground }, textStyle]}>
        {children}
      </ButtonText>
    </Button>
  );
}

type AppIconButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  theme: Theme;
};

function AppIconButton({ icon, onPress, theme }: AppIconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      style={[styles.panelIconButton, { backgroundColor: theme.primary }]}
      onPress={onPress}
    >
      {icon === "add" ? (
        <Text style={[styles.plusIcon, { color: theme.white }]}>+</Text>
      ) : (
        <Ionicons name={icon} size={22} color={theme.white} />
      )}
    </Pressable>
  );
}

type SelectControlProps<TValue extends string> = {
  disabled?: boolean;
  onChange: (value: TValue) => void;
  options: Array<{ label: string; value: TValue }>;
  placeholder?: string;
  theme: Theme;
  value: TValue | "";
};

type InlineSheetSelectControlProps<TValue extends string> = SelectControlProps<TValue>;

function SelectControl<TValue extends string>({
  disabled = false,
  onChange,
  options,
  placeholder = "Wybierz",
  theme,
  value
}: SelectControlProps<TValue>) {
  const selectedOption = options.find((option) => option.value === value);

  return (
    <Select
      isDisabled={disabled}
      selectedLabel={selectedOption?.label}
      selectedValue={value}
      onValueChange={(nextValue: string) => onChange(nextValue as TValue)}
    >
      <SelectTrigger
        style={[
          styles.gluestackSelectTrigger,
          {
            backgroundColor: disabled ? theme.secondaryBand : theme.control,
            borderColor: theme.border,
            opacity: disabled ? 0.72 : 1
          }
        ]}
      >
        <SelectInput
          placeholder={placeholder}
          style={[
            styles.gluestackSelectInput,
            { color: selectedOption ? theme.inputText : theme.muted }
          ]}
        />
        <SelectIcon as={ChevronDownIcon} color={theme.muted} mr="$3" />
      </SelectTrigger>

      <SelectPortal snapPoints={[45]}>
        <SelectBackdrop
          style={[
            styles.gluestackSelectBackdrop,
            { backgroundColor: theme.background }
          ]}
        />
        <SelectContent
          style={[
            styles.gluestackSelectContent,
            { backgroundColor: theme.card, borderColor: theme.border }
          ]}
        >
          <View style={styles.selectSheetHandleWrap}>
            <View style={[styles.selectSheetHandle, { backgroundColor: theme.border }]} />
          </View>
          <SelectScrollView style={styles.gluestackSelectScrollView}>
            {options.map((option) => (
              <SelectItem
                key={option.value}
                label={option.label}
                style={styles.gluestackSelectItem}
                value={option.value}
                textStyle={{ color: theme.text, fontWeight: "400" }}
              />
            ))}
          </SelectScrollView>
        </SelectContent>
      </SelectPortal>
    </Select>
  );
}

function InlineSheetSelectControl<TValue extends string>({
  onChange,
  options,
  placeholder = "Wybierz",
  theme,
  value
}: InlineSheetSelectControlProps<TValue>) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);

  function selectOption(nextValue: TValue) {
    onChange(nextValue);
    setIsOpen(false);
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        style={[
          styles.gluestackSelectTrigger,
          { backgroundColor: theme.control, borderColor: theme.border }
        ]}
        onPress={() => setIsOpen(true)}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.gluestackSelectInput,
            { color: selectedOption ? theme.inputText : theme.muted }
          ]}
        >
          {selectedOption?.label ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={theme.muted} />
      </Pressable>

      <Modal
        animationType="slide"
        transparent
        visible={isOpen}
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.selectSheetRoot}>
          <Pressable
            accessibilityRole="button"
            style={[styles.selectSheetBackdrop, { backgroundColor: theme.background }]}
            onPress={() => setIsOpen(false)}
          />
          <View
            style={[
              styles.gluestackSelectContent,
              { backgroundColor: theme.card, borderColor: theme.border }
            ]}
          >
            <View style={styles.selectSheetHandleWrap}>
              <View style={[styles.selectSheetHandle, { backgroundColor: theme.border }]} />
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" style={styles.gluestackSelectScrollView}>
              {options.map((option) => {
                const isSelected = option.value === value;

                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    style={[
                      styles.inlineSelectItem,
                      { backgroundColor: isSelected ? theme.selectedOption : theme.card }
                    ]}
                    onPress={() => selectOption(option.value)}
                  >
                    <Text style={[styles.inlineSelectItemText, { color: theme.text }]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

type ExercisePickerProps = {
  disabled?: boolean;
  emptyText: string;
  favoriteExerciseIds: ReadonlySet<string>;
  favoriteFilterAllLabel: string;
  favoriteFilterOnlyLabel: string;
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
  const [groupedOptions, setGroupedOptions] = useState<ExerciseSection[]>([]);
  const [isLoadingExercises, setIsLoadingExercises] = useState(false);
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleKey | "all">("all");
  const [favoriteFilter, setFavoriteFilter] = useState<"all" | "favorites">("all");
  const selectedOption = value ? optionByValue.get(value) : undefined;
  const visibleOptions = useMemo(
    () =>
      favoriteFilter === "favorites"
        ? options.filter((option) => favoriteExerciseIds.has(option.exerciseId))
        : options,
    [favoriteExerciseIds, favoriteFilter, options]
  );
  const muscleOptions = useMemo(
    () => [
      { label: muscleFilterAllLabel, value: "all" as const },
      ...getMuscleOptions(language)
    ],
    [language, muscleFilterAllLabel]
  );

  useEffect(() => {
    if (!isOpen) {
      setGroupedOptions([]);
      setIsLoadingExercises(false);
      return;
    }

    const phrase = query.trim().toLowerCase();
    const nextOptions = phrase
      ? visibleOptions.filter((option) => option.label.toLowerCase().includes(phrase))
      : visibleOptions;

    setGroupedOptions(
      favoriteFilter === "all" && !phrase
        ? getExerciseSectionsForStageType(language, stageType, selectedMuscle)
        : buildExerciseSections(nextOptions, language, selectedMuscle)
    );
    setIsLoadingExercises(false);
  }, [favoriteFilter, isOpen, language, query, selectedMuscle, stageType, visibleOptions]);

  function selectExercise(nextValue: string) {
    onChange(nextValue);
    setIsOpen(false);
    setQuery("");
    setIsSearchOpen(false);
    setSelectedMuscle("all");
    setFavoriteFilter("all");
  }

  function openPicker() {
    if (disabled) {
      return;
    }

    const phrase = query.trim().toLowerCase();
    const nextOptions = phrase
      ? visibleOptions.filter((option) => option.label.toLowerCase().includes(phrase))
      : visibleOptions;
    setGroupedOptions(
      favoriteFilter === "all" && !phrase
        ? getExerciseSectionsForStageType(language, stageType, selectedMuscle)
        : buildExerciseSections(nextOptions, language, selectedMuscle)
    );
    setIsOpen(true);
  }

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
          <View style={styles.exercisePickerContent}>
            <View style={[styles.exercisePickerHeader, { borderBottomColor: theme.border }]}>
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

            <SectionList
              key={`${language}:${stageType || "all"}:${selectedMuscle}:${favoriteFilter}:${query.trim().toLowerCase()}`}
              initialNumToRender={10}
              keyboardShouldPersistTaps="handled"
              maxToRenderPerBatch={10}
              sections={groupedOptions}
              style={[styles.exercisePickerList, { backgroundColor: theme.background }]}
              contentContainerStyle={styles.exercisePickerListContent}
              keyExtractor={(item) => item.sectionKey}
              ListEmptyComponent={
                <Text style={[styles.exercisePickerEmpty, { color: theme.text }]}>
                  {isLoadingExercises ? loadingText : emptyText}
                </Text>
              }
              renderSectionHeader={({ section }) => (
                <Text
                  style={[
                    styles.exercisePickerLetter,
                    { backgroundColor: theme.secondaryBand, color: theme.muted }
                  ]}
                >
                  {section.title}
                </Text>
              )}
              renderItem={({ item }) => (
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
                  <Pressable
                    accessibilityLabel={favoriteExerciseIds.has(item.exerciseId) ? favoriteFilterOnlyLabel : favoriteFilterAllLabel}
                    accessibilityRole="button"
                    style={styles.exercisePickerFavoriteButton}
                    onPress={(event) => {
                      event.stopPropagation();
                      onToggleFavorite(item.exerciseId);
                    }}
                  >
                    <Ionicons
                      name={favoriteExerciseIds.has(item.exerciseId) ? "star" : "star-outline"}
                      size={24}
                      color={favoriteExerciseIds.has(item.exerciseId) ? theme.primary : theme.muted}
                    />
                  </Pressable>
                </Pressable>
              )}
              removeClippedSubviews={false}
              stickySectionHeadersEnabled={false}
              windowSize={5}
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
      <View style={[styles.panelHeader, { borderBottomColor: theme.border }]}>
        <Pressable
          accessibilityLabel={`${isCollapsed ? expandLabel : collapseLabel}: ${title}`}
          accessibilityRole="button"
          accessibilityState={{ expanded: !isCollapsed }}
          style={styles.panelTitleButton}
          onPress={onToggle}
        >
          <Ionicons
            name={isCollapsed ? "chevron-forward" : "chevron-down"}
            size={20}
            color={theme.primary}
          />
          {leadingAccessory}
          <Text style={[styles.panelTitle, { color: theme.text }]}>{title}</Text>
        </Pressable>
        {actions}
      </View>
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
  backLabel: string;
  language: LanguageCode;
  onBack: () => void;
  theme: Theme;
};

function ArticleDetail({ article, backLabel, language, onBack, theme }: ArticleDetailProps) {
  const translation = getArticleTranslation(article, language);
  const blocks = useMemo(() => parseArticleMarkdown(translation.content), [translation.content]);

  return (
    <View style={styles.articleDetail}>
      <AppButton
        icon="chevron-back"
        style={styles.builderBackButton}
        textStyle={styles.builderBackButtonText}
        theme={theme}
        variant="outline"
        onPress={onBack}
      >
        {backLabel}
      </AppButton>

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

type LegalPageProps = {
  backLabel?: string;
  children: ReactNode;
  icon: keyof typeof Ionicons.glyphMap;
  onBack: () => void;
  theme: Theme;
  title: string;
};

function LegalPage({ backLabel = "Wróć do ustawień", children, onBack, theme }: LegalPageProps) {
  return (
    <>
      <AppButton
        icon="chevron-back"
        style={styles.secondaryButton}
        textStyle={styles.secondaryButtonText}
        theme={theme}
        variant="outline"
        onPress={onBack}
      >
        {backLabel}
      </AppButton>

      <View style={[styles.legalPanel, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.legalContent}>{children}</View>
      </View>
    </>
  );
}

type LegalSectionProps = {
  text: string;
  theme: Theme;
  title: string;
};

function LegalSection({ text, theme, title }: LegalSectionProps) {
  return (
    <View style={styles.legalSection}>
      <Text style={[styles.legalSectionTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.legalText, { color: theme.muted }]}>{text}</Text>
    </View>
  );
}

type FaqItemProps = {
  answer: string;
  question: string;
  theme: Theme;
};

function FaqItem({ answer, question, theme }: FaqItemProps) {
  return (
    <View style={[styles.faqItem, { borderColor: theme.border }]}>
      <Text style={[styles.faqQuestion, { color: theme.text }]}>{question}</Text>
      <Text style={[styles.legalText, { color: theme.muted }]}>{answer}</Text>
    </View>
  );
}

type LoginPanelProps = {
  authError: string;
  authMode: AuthMode;
  displayName: string;
  email: string;
  isAuthSubmitting: boolean;
  logIn: () => void;
  logOut: () => void;
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
  logOut,
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
  addStep: (kind: WorkoutStepKind) => void;
  defaultSetCount: string;
  defaultStageType: StageType | "";
  defaultWeight: string;
  favoriteExerciseIds: ReadonlySet<string>;
  isEditing: boolean;
  isDarkMode: boolean;
  language: LanguageCode;
  moveStep: (stepId: string, direction: -1 | 1) => void;
  onToggleFavoriteExercise: (exerciseId: string) => void;
  onBack: () => void;
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
    () => shouldShowExerciseFields ? getCachedExerciseOptionsForStageType(language, exerciseCatalogStageType) : [],
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
    const nextOptions = getCachedExerciseOptionsForStageType(language, nextExerciseCatalogStageType);
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
  addStep,
  defaultSetCount,
  defaultStageType,
  defaultWeight,
  favoriteExerciseIds,
  isEditing,
  isDarkMode,
  language,
  moveStep,
  onToggleFavoriteExercise,
  onBack,
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
        <AppButton
          icon="chevron-back"
          style={styles.builderBackButton}
          textStyle={styles.builderBackButtonText}
          theme={theme}
          variant="outline"
          onPress={onBack}
        >
          {t("backToStart")}
        </AppButton>
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

const styles = StyleSheet.create({
  screen: {
    flex: 1
  },
  splashScreen: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 32
  },
  header: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    minHeight: 62,
    paddingHorizontal: 20,
    paddingBottom: 8
  },
  headerTitleBlock: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 10,
    minWidth: 0
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "900",
    minWidth: 0
  },
  profileHeaderButton: {
    alignItems: "center",
    borderRadius: 19,
    height: 38,
    justifyContent: "center",
    overflow: "hidden",
    width: 38
  },
  content: {
    gap: 18,
    padding: 20
  },
  loginPanel: {
    alignItems: "stretch",
    borderRadius: 8,
    gap: 16,
    padding: 18
  },
  loginScreenContent: {
    gap: 16
  },
  loginPanelHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12
  },
  loginCopy: {
    flex: 1,
    gap: 4
  },
  loginDismissButton: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    marginRight: -6,
    marginTop: -6,
    width: 36
  },
  loginEyebrow: {
    color: "#b7d4cf",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  loginTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "800"
  },
  loginMeta: {
    color: "#b7d4cf",
    fontSize: 13,
    fontWeight: "700"
  },
  loginButton: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    flexDirection: "row",
    flex: 1,
    gap: 6,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 10
  },
  loginButtonText: {
    fontSize: 13,
    fontWeight: "800"
  },
  loginActions: {
    flexDirection: "row",
    gap: 10
  },
  authPanel: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
    paddingBottom: 24,
    paddingHorizontal: 16,
    paddingTop: 16
  },
  authHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginBottom: 10
  },
  closeButton: {
    alignItems: "center",
    height: 36,
    justifyContent: "center",
    width: 36
  },
  authEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  authTitle: {
    fontSize: 19,
    fontWeight: "800"
  },
  authFields: {
    gap: 0
  },
  authInputStack: {
    gap: 12,
    marginTop: 12
  },
  authModeSwitch: {
    borderRadius: 8,
    flexDirection: "row",
    gap: 4,
    padding: 4
  },
  authModeButton: {
    alignItems: "center",
    borderRadius: 6,
    flex: 1,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: 8
  },
  authModeButtonText: {
    fontSize: 13,
    fontWeight: "800"
  },
  authError: {
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    marginTop: 18
  },
  authForgotPassword: {
    fontSize: 14,
    fontWeight: "800",
    marginTop: 10,
    textAlign: "right"
  },
  authButtonSpacer: {
    height: 22
  },
  authRegisterButtonSpacer: {
    height: 30
  },
  authButtonWrap: {
    alignSelf: "stretch",
    minHeight: 48
  },
  authButton: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 48
  },
  authButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800"
  },
  fieldGroup: {
    gap: 8
  },
  stepParagraph: {
    gap: 12,
    marginTop: 8
  },
  label: {
    fontSize: 13,
    fontWeight: "700"
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 46,
    paddingHorizontal: 12
  },
  gluestackInput: {
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 46
  },
  gluestackInputField: {
    flex: 1,
    fontSize: 16,
    fontWeight: "400",
    minHeight: 44,
    paddingHorizontal: 12
  },
  passwordInput: {
    alignItems: "center",
    flexDirection: "row"
  },
  passwordInputField: {
    paddingRight: 4
  },
  passwordVisibilityButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    paddingHorizontal: 12
  },
  gluestackTextarea: {
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 84,
    overflow: "hidden"
  },
  gluestackTextareaInput: {
    fontSize: 16,
    fontWeight: "400",
    height: "100%",
    minHeight: 84,
    paddingHorizontal: 12,
    paddingTop: 12,
    textAlignVertical: "top"
  },
  gluestackSelectTrigger: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 46
  },
  gluestackSelectInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "400",
    paddingHorizontal: 12
  },
  gluestackSelectContent: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    bottom: 0,
    left: 0,
    maxHeight: "46%",
    paddingBottom: 18,
    paddingHorizontal: 12,
    paddingTop: 8,
    position: "absolute",
    right: 0,
    width: "100%"
  },
  gluestackSelectScrollView: {
    width: "100%"
  },
  gluestackSelectItem: {
    minHeight: 48,
    width: "100%"
  },
  gluestackSelectItemText: {
    fontSize: 16,
    fontWeight: "400"
  },
  inlineSelectItem: {
    borderRadius: 6,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 12,
    width: "100%"
  },
  inlineSelectItemText: {
    fontSize: 16,
    fontWeight: "400"
  },
  selectSheetRoot: {
    flex: 1,
    justifyContent: "flex-end"
  },
  selectSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.5
  },
  selectSheetHandleWrap: {
    alignItems: "center",
    paddingVertical: 10
  },
  selectSheetHandle: {
    borderRadius: 999,
    height: 4,
    width: 44
  },
  gluestackSelectBackdrop: {
    opacity: 0.5
  },
  exercisePickerTrigger: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    minHeight: 46,
    paddingHorizontal: 12
  },
  exercisePickerTriggerText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "400",
    minWidth: 0
  },
  exercisePickerScreen: {
    flex: 1
  },
  exercisePickerContent: {
    flex: 1
  },
  exercisePickerHeader: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 14,
    minHeight: 78,
    paddingHorizontal: 18
  },
  exercisePickerHeaderButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44
  },
  exercisePickerHeaderActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  exercisePickerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "800"
  },
  exercisePickerSearchInput: {
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 48
  },
  exercisePickerFilters: {
    gap: 10,
    marginBottom: 18,
    marginHorizontal: 22,
    marginTop: 12
  },
  exercisePickerMuscleFilter: {
    gap: 6
  },
  exerciseFavoriteFilterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
    marginHorizontal: 22
  },
  exerciseFavoriteFilterButton: {
    alignItems: "center",
    borderRadius: 8,
    flex: 1,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: 10
  },
  exerciseFavoriteFilterText: {
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center"
  },
  exercisePickerSearchText: {
    fontSize: 16,
    paddingHorizontal: 14
  },
  exercisePickerList: {
    flex: 1
  },
  exercisePickerListContent: {
    paddingBottom: 220
  },
  exercisePickerLetter: {
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: 22,
    paddingVertical: 6
  },
  exercisePickerRow: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 34
  },
  exercisePickerRowText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "400",
    minWidth: 0
  },
  exercisePickerFavoriteButton: {
    alignItems: "center",
    height: 42,
    justifyContent: "center",
    width: 42
  },
  exercisePickerEmpty: {
    fontSize: 17,
    padding: 24
  },
  favoriteExerciseList: {
    gap: 10
  },
  favoriteExerciseRow: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 12
  },
  favoriteExerciseInfo: {
    flex: 1,
    gap: 4,
    minWidth: 0
  },
  favoriteExerciseRemoveButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44
  },
  emptyStatePanel: {
    alignItems: "center",
    borderRadius: 8,
    gap: 8,
    padding: 18
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center"
  },
  emptyStateCopy: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    textAlign: "center"
  },
  gluestackButton: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 12
  },
  workoutCreatorButton: {
    minHeight: 52
  },
  workoutCreatorButtonWrap: {
    position: "relative",
    zIndex: 5
  },
  trainingFactPill: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  trainingFactIcon: {
    alignItems: "center",
    borderRadius: 15,
    height: 30,
    justifyContent: "center",
    width: 30
  },
  trainingFactText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18
  },
  historyEntryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  historyEntryButton: {
    flex: 1,
    minWidth: 150
  },
  historyScreen: {
    gap: 14
  },
  segmentedControl: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  segmentButton: {
    borderRadius: 8,
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: 12
  },
  segmentButtonText: {
    fontSize: 13,
    fontWeight: "800"
  },
  statsPanel: {
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    padding: 12
  },
  statTile: {
    flex: 1,
    minWidth: 120
  },
  statValue: {
    fontSize: 19,
    fontWeight: "900"
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17
  },
  activeSessionCard: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14
  },
  activeSessionActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  compactButton: {
    flex: 1,
    minHeight: 40,
    minWidth: 130,
    paddingHorizontal: 10
  },
  compactButtonText: {
    fontSize: 13
  },
  creatorLoginTooltip: {
    alignItems: "center",
    bottom: "100%",
    left: 0,
    marginBottom: 8,
    position: "absolute",
    right: 0,
    zIndex: 10
  },
  creatorLoginTooltipBubble: {
    borderRadius: 8,
    maxWidth: "92%",
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  creatorLoginTooltipText: {
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center"
  },
  gluestackButtonText: {
    fontSize: 15,
    fontWeight: "800"
  },
  notesInput: {
    minHeight: 84,
    paddingTop: 12,
    textAlignVertical: "top"
  },
  searchBox: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 12
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    minWidth: 0
  },
  goalField: {
    flex: 3,
    gap: 8
  },
  weightField: {
    flex: 1,
    gap: 8
  },
  suffixedInput: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 46,
    paddingHorizontal: 12
  },
  suffixedTextInput: {
    flex: 1,
    fontSize: 16,
    minWidth: 0,
    padding: 0
  },
  inputSuffix: {
    fontSize: 14,
    fontWeight: "800",
    paddingLeft: 8
  },
  timeTargetRow: {
    flexDirection: "row",
    gap: 10
  },
  timeTargetPart: {
    flex: 1,
    gap: 5,
    minWidth: 0
  },
  timeTargetTextInput: {
    flex: 1,
    fontSize: 16,
    minWidth: 0,
    padding: 0,
    textAlign: "center"
  },
  timeTargetLabel: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center"
  },
  heartRateTargetRow: {
    flexDirection: "row",
    gap: 10
  },
  heartRateComparatorField: {
    flex: 2,
    minWidth: 0
  },
  heartRateValueField: {
    flex: 1,
    minWidth: 0
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  sectionHeaderCopy: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12
  },
  workoutDetailActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-end"
  },
  workoutDetailDescription: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    marginTop: -8
  },
  muscleOverviewPanel: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    padding: 14
  },
  muscleOverviewTitle: {
    fontSize: 18,
    fontWeight: "900"
  },
  muscleOverviewFigures: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "center"
  },
  humanMuscleFigure: {
    aspectRatio: 0.6,
    height: 250,
    maxWidth: "48%",
    width: "48%"
  },
  muscleOverviewLegend: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center"
  },
  muscleLegendItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7
  },
  muscleLegendDot: {
    borderRadius: 8,
    height: 16,
    width: 16
  },
  muscleLegendText: {
    fontSize: 12,
    fontWeight: "700"
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800"
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 3
  },
  builderBackButton: {
    flexShrink: 0,
    minHeight: 38,
    paddingHorizontal: 10
  },
  builderBackButtonText: {
    fontSize: 13
  },
  iconButton: {
    alignItems: "center",
    borderRadius: 8,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  panel: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden"
  },
  panelHeader: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 56,
    paddingHorizontal: 14
  },
  panelActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: "800"
  },
  panelTitleButton: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 44,
    minWidth: 0
  },
  panelBody: {
    gap: 10,
    padding: 12
  },
  panelIconButton: {
    alignItems: "center",
    borderRadius: 8,
    height: 38,
    justifyContent: "center",
    minHeight: 38,
    minWidth: 38,
    width: 38
  },
  sessionEntryActions: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    gap: 8
  },
  sessionDeleteButton: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  workoutList: {
    gap: 10
  },
  addWorkoutPanel: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
    minHeight: 48
  },
  addWorkoutIcon: {
    alignItems: "center",
    borderRadius: 8,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  addWorkoutName: {
    fontSize: 15
  },
  addWorkoutMeta: {
    fontSize: 12,
    lineHeight: 16
  },
  workoutRow: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 56,
    paddingBottom: 8
  },
  workoutIcon: {
    alignItems: "center",
    borderRadius: 8,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  workoutInfo: {
    flex: 1,
    gap: 3,
    minWidth: 0
  },
  workoutName: {
    fontSize: 15,
    fontWeight: "800"
  },
  workoutMeta: {
    fontSize: 12,
    fontWeight: "700"
  },
  workoutDetailStages: {
    gap: 12
  },
  workoutDetailStage: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14
  },
  workoutDetailStageHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12
  },
  workoutDetailStageBadge: {
    alignItems: "center",
    borderRadius: 8,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  workoutDetailStageBadgeText: {
    fontSize: 15,
    fontWeight: "900"
  },
  workoutDetailNotes: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19
  },
  workoutDetailSeriesList: {
    gap: 8
  },
  workoutDetailSeriesRow: {
    borderBottomWidth: 1,
    paddingBottom: 12,
    paddingTop: 4
  },
  workoutDetailSeriesRowLast: {
    borderBottomWidth: 0
  },
  workoutDetailSeriesBadge: {
    alignItems: "center",
    borderRadius: 8,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  workoutDetailSeriesTitle: {
    flex: 1
  },
  workoutDetailElementRow: {
    gap: 3,
    paddingTop: 8
  },
  workoutDetailExerciseName: {
    fontSize: 15,
    fontWeight: "800"
  },
  exerciseSummaryRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    minHeight: 54,
    paddingVertical: 4
  },
  exerciseSummaryCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0
  },
  exerciseSummaryTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    minWidth: 0
  },
  exerciseSummaryRestCopy: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-start",
    minWidth: 0
  },
  exerciseSummaryRight: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    gap: 8
  },
  exerciseSummaryTiles: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5
  },
  exerciseSummaryTile: {
    alignItems: "center",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 34,
    minWidth: 36,
    paddingHorizontal: 8
  },
  exerciseSummarySingleTile: {
    minWidth: 52
  },
  exerciseSummaryTileText: {
    fontSize: 13,
    fontWeight: "900"
  },
  exerciseSummaryTimes: {
    fontSize: 13,
    fontWeight: "900"
  },
  exerciseMuscleButton: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  modalOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.52)",
    flex: 1,
    justifyContent: "center",
    padding: 18
  },
  exerciseMuscleModal: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 16,
    maxHeight: "92%",
    padding: 16,
    width: "100%"
  },
  exerciseMuscleLists: {
    gap: 10
  },
  exerciseAnimationPlaceholder: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    justifyContent: "center",
    minHeight: 150,
    padding: 16
  },
  sessionHistoryList: {
    gap: 10
  },
  sessionHistoryRow: {
    borderBottomWidth: 1,
    gap: 3,
    paddingBottom: 10
  },
  sessionScreen: {
    gap: 14
  },
  sessionCard: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14
  },
  sessionActions: {
    flexDirection: "row",
    gap: 10
  },
  sessionProgressRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between"
  },
  sessionProgressCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  sessionProgressStage: {
    flexShrink: 1,
    fontWeight: "900",
    textAlign: "right"
  },
  sessionProgressText: {
    fontSize: 16,
    fontWeight: "900"
  },
  sessionNavButton: {
    flex: 1
  },
  sessionInputGrid: {
    gap: 10
  },
  sessionCheckboxRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  sessionCheckbox: {
    alignItems: "center",
    borderRadius: 6,
    borderWidth: 1,
    height: 26,
    justifyContent: "center",
    width: 26
  },
  sessionCheckboxText: {
    fontSize: 14,
    fontWeight: "800"
  },
  sessionInlineFields: {
    flexDirection: "row",
    gap: 10
  },
  sessionInlineInput: {
    flex: 1
  },
  sessionNoteInput: {
    minHeight: 76
  },
  guidedPlanPreview: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 12
  },
  guidedEntryTable: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden"
  },
  guidedEntryRow: {
    borderBottomWidth: 1,
    gap: 10,
    padding: 10
  },
  guidedEntryRowLast: {
    borderBottomWidth: 0
  },
  guidedEntryDone: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  guidedEntryFields: {
    flexDirection: "row",
    gap: 10
  },
  guidedEntryInput: {
    flex: 1
  },
  restTimerCard: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    padding: 10
  },
  restTimerCopy: {
    flex: 1,
    minWidth: 0
  },
  restTimerValue: {
    fontSize: 24,
    fontWeight: "900"
  },
  restTimerActions: {
    flexDirection: "row",
    gap: 8
  },
  restTimerButton: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 36,
    minWidth: 62,
    justifyContent: "center",
    paddingHorizontal: 10
  },
  restTimerButtonText: {
    fontSize: 12,
    fontWeight: "900"
  },
  sessionList: {
    gap: 10
  },
  sessionEntryCard: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 12
  },
  sessionEntryHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between"
  },
  sessionDoneButton: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  modeSheetButton: {
    flex: 1,
    minWidth: 140
  },
  detailsButton: {
    minHeight: 36,
    paddingHorizontal: 10
  },
  detailsButtonText: {
    fontSize: 12
  },
  builderBlock: {
    gap: 14
  },
  emptyBuilder: {
    alignItems: "flex-start",
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 16
  },
  emptyBuilderTitle: {
    fontSize: 17,
    fontWeight: "800"
  },
  emptyBuilderCopy: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20
  },
  secondaryButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 12
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "800"
  },
  profileScreen: {
    gap: 14
  },
  profileActionsRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-end"
  },
  stepCard: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14
  },
  stageNameRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  stageNameInput: {
    flex: 1,
    minWidth: 0
  },
  stageConfigToggle: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    height: 46,
    justifyContent: "center",
    width: 46
  },
  seriesBlock: {
    borderTopWidth: 1,
    gap: 12,
    marginTop: 8,
    paddingTop: 14
  },
  seriesHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  seriesTitle: {
    fontSize: 16,
    fontWeight: "800"
  },
  seriesAddButton: {
    minHeight: 38,
    paddingHorizontal: 10
  },
  seriesAddButtonText: {
    fontSize: 13
  },
  seriesList: {
    gap: 10
  },
  seriesContent: {
    gap: 12
  },
  seriesCard: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 12
  },
  emptySeries: {
    borderRadius: 8,
    padding: 12
  },
  emptySeriesText: {
    fontSize: 13,
    fontWeight: "700"
  },
  stepTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  stepTitleButton: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 38,
    minWidth: 0
  },
  stepTitleCopy: {
    flex: 1,
    minWidth: 0
  },
  stepTitle: {
    fontSize: 17,
    fontWeight: "800"
  },
  stepKind: {
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
    textTransform: "uppercase"
  },
  stepActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4
  },
  stepActionButton: {
    alignItems: "center",
    height: 36,
    justifyContent: "center",
    width: 36
  },
  row: {
    flexDirection: "row",
    gap: 12
  },
  flexField: {
    flex: 1,
    gap: 8
  },
  segmented: {
    borderRadius: 8,
    flexDirection: "row",
    padding: 4
  },
  segment: {
    alignItems: "center",
    borderRadius: 6,
    flex: 1,
    paddingVertical: 9
  },
  segmentText: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  buttonGroup: {
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    overflow: "hidden"
  },
  buttonGroupItem: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 6,
    paddingVertical: 8
  },
  buttonGroupItemText: {
    fontSize: 11,
    fontWeight: "800"
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 52
  },
  buttonPlusIcon: {
    fontSize: 22,
    lineHeight: 26,
    width: 24
  },
  addWorkoutPlusIcon: {
    fontSize: 22,
    lineHeight: 25,
    width: 24
  },
  plusIcon: {
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 32,
    textAlign: "center",
    width: 30
  },
  stickyActionBar: {
    borderTopWidth: 1,
    left: 0,
    paddingHorizontal: 20,
    paddingVertical: 12,
    position: "absolute",
    right: 0
  },
  stickyActionRow: {
    flexDirection: "row",
    gap: 8
  },
  stickySmallButton: {
    flex: 0.8,
    minHeight: 52,
    paddingHorizontal: 8
  },
  stickySaveButton: {
    flex: 1.6,
    minHeight: 52,
    paddingHorizontal: 8
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800"
  },
  textButton: {
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 4
  },
  textButtonLabel: {
    fontSize: 14,
    fontWeight: "800"
  },
  articleRow: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingBottom: 12
  },
  articleContent: {
    flex: 1,
    gap: 6,
    minWidth: 0
  },
  articleCategory: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  articleTitle: {
    fontSize: 18,
    fontWeight: "800"
  },
  articleMeta: {
    fontSize: 13,
    fontWeight: "700"
  },
  articleDetail: {
    gap: 16
  },
  articleDetailPanel: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 16,
    padding: 16
  },
  articleDetailTitle: {
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 33
  },
  articleLead: {
    borderRadius: 8,
    padding: 14
  },
  articleLeadText: {
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 24
  },
  articleSectionBlock: {
    gap: 12,
    paddingTop: 8
  },
  articleBlockHeading: {
    fontSize: 19,
    fontWeight: "900",
    lineHeight: 25
  },
  articleParagraph: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 24
  },
  articlePlanList: {
    gap: 10
  },
  articlePlanTitle: {
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 24
  },
  articlePlanCard: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 12
  },
  articlePlanDayBadge: {
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  articlePlanDayBadgeText: {
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  articlePlanItems: {
    gap: 8
  },
  articlePlanItemRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 9
  },
  articlePlanBullet: {
    borderRadius: 3,
    height: 6,
    marginTop: 8,
    width: 6
  },
  articlePlanDescription: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 21
  },
  infoLinkRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minHeight: 70,
    paddingVertical: 4
  },
  infoLinkIcon: {
    alignItems: "center",
    borderRadius: 8,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  settingsOptionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minHeight: 58
  },
  settingsSelectRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minHeight: 82
  },
  settingsSelectContent: {
    flex: 1,
    gap: 8,
    minWidth: 0
  },
  settingsOptionLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    minWidth: 0
  },
  settingsOptionValue: {
    fontSize: 13,
    fontWeight: "800"
  },
  settingsHint: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19
  },
  reminderDaysBlock: {
    gap: 12,
    paddingVertical: 10
  },
  reminderDayPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  reminderDayPill: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: "22%",
    flexGrow: 1,
    justifyContent: "center",
    minWidth: 62,
    paddingHorizontal: 10,
    paddingVertical: 10
  },
  reminderDayPillText: {
    fontSize: 13,
    fontWeight: "900"
  },
  reminderTimeCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minHeight: 58,
    paddingVertical: 4
  },
  reminderTimeValue: {
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18
  },
  reminderMessageBlock: {
    gap: 10,
    paddingVertical: 8
  },
  reminderDescriptionTextarea: {
    minHeight: 58
  },
  reminderDescriptionInput: {
    minHeight: 58,
    paddingBottom: 10
  },
  settingsPlaceholder: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minHeight: 68
  },
  panelHeroHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minWidth: 0
  },
  legalPanel: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 18
  },
  creatorPanel: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 18,
    padding: 18
  },
  creatorForm: {
    gap: 16
  },
  creatorDescription: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20
  },
  creatorSection: {
    borderTopWidth: 1,
    gap: 14,
    paddingTop: 16
  },
  creatorSectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    minHeight: 42
  },
  creatorSectionTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "900",
    minWidth: 0
  },
  creatorSectionFields: {
    gap: 14
  },
  creatorProfilesBlock: {
    gap: 10
  },
  creatorProfileGrid: {
    gap: 10
  },
  creatorProfileCard: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 68,
    padding: 12
  },
  creatorPromptTitle: {
    fontSize: 18,
    fontWeight: "900"
  },
  creatorPromptActions: {
    gap: 16,
    paddingBottom: 10,
    paddingTop: 10
  },
  creatorChoiceList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  creatorChoiceChip: {
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 38,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  creatorChoiceText: {
    fontSize: 13,
    fontWeight: "800"
  },
  creatorTextarea: {
    height: 132,
    minHeight: 132
  },
  creatorWaitingActions: {
    gap: 14
  },
  creatorPlanBox: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 14
  },
  creatorPlanText: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 21
  },
  legalIcon: {
    alignItems: "center",
    borderRadius: 8,
    height: 48,
    justifyContent: "center",
    width: 48
  },
  legalTitle: {
    flexShrink: 1,
    fontSize: 24,
    fontWeight: "800"
  },
  legalContent: {
    gap: 12
  },
  legalSection: {
    gap: 6
  },
  legalSectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 22
  },
  legalText: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22
  },
  legalDivider: {
    height: 1,
    marginVertical: 4,
    opacity: 0.12
  },
  faqItem: {
    borderTopWidth: 1,
    gap: 5,
    paddingTop: 10
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 20
  },
  contactBox: {
    borderRadius: 8,
    gap: 4,
    padding: 14
  },
  contactLabel: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  contactValue: {
    fontSize: 17,
    fontWeight: "800"
  },
  bugReportForm: {
    gap: 18
  },
  bugReportTextarea: {
    height: 132,
    minHeight: 132
  },
  bugSuccessBox: {
    alignItems: "flex-start",
    borderRadius: 8,
    gap: 14,
    padding: 16
  },
  bugSuccessHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12
  },
  bugSuccessIcon: {
    alignItems: "center",
    borderRadius: 8,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  bugSuccessText: {
    flex: 1,
    flexShrink: 1,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 23
  },
  bugSuccessIdBox: {
    alignSelf: "stretch",
    borderRadius: 8,
    gap: 5,
    padding: 12
  },
  bugSuccessIdText: {
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18
  },
  errorScreen: {
    flex: 1,
    justifyContent: "center",
    padding: 20
  },
  errorPanel: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    padding: 18
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "800"
  },
  errorCopy: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22
  },
  errorDetails: {
    borderRadius: 8,
    padding: 12
  },
  errorDetailsText: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18
  },
  errorActions: {
    flexDirection: "row",
    gap: 10
  },
  errorActionButton: {
    flex: 1
  },
  bottomNav: {
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: "row",
    left: 0,
    paddingHorizontal: 10,
    paddingTop: 7,
    position: "absolute",
    right: 0
  },
  bottomSheetRoot: {
    flex: 1,
    justifyContent: "flex-end"
  },
  bottomSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.52)"
  },
  bottomSheetPanel: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 24
  },
  bottomSheetTitle: {
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 30
  },
  bottomSheetOptionGroup: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden"
  },
  bottomSheetOptionRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 56,
    paddingHorizontal: 16
  },
  bottomSheetOptionText: {
    fontSize: 16,
    fontWeight: "800"
  },
  timePickerRow: {
    flexDirection: "row",
    gap: 12
  },
  timePickerColumn: {
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    overflow: "hidden"
  },
  timePickerScroll: {
    maxHeight: 240
  },
  timePickerOption: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44
  },
  bottomSheetButton: {
    minHeight: 56
  },
  navButton: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 5,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 2
  },
  navLabel: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "800"
  }
});
