import AsyncStorage from "@react-native-async-storage/async-storage";

import { getLocalOnlyStorageKey } from "./localOnlyStorageMigration";
import {
  calculateSessionVolume,
  getCompletedWorkoutSessions,
  getExerciseKey,
  getSessionDurationMs,
  type WorkoutSession
} from "./workoutSessions";

export type AchievementCategory =
  | "training"
  | "volume"
  | "consistency"
  | "app_usage"
  | "exploration"
  | "ai";

export type AchievementDefinition = {
  id: string;
  category: AchievementCategory;
  title: {
    pl: string;
    en: string;
  };
  description: {
    pl: string;
    en: string;
  };
  lockedDescription?: {
    pl: string;
    en: string;
  };
  target: number;
  unit: "count" | "kg" | "tons" | "minutes" | "hours" | "days" | "weeks";
  metricKey: keyof AchievementMetrics;
  iconKey?: string;
  imageKey?: string;
  sortOrder: number;
  hiddenUntilUnlocked?: boolean;
};

export type UserAchievement = {
  achievementId: string;
  unlockedAt: string;
  progressAtUnlock?: number;
  updatedAt?: string;
};

export type AchievementProgress = {
  definition: AchievementDefinition;
  current: number;
  target: number;
  percent: number;
  unlocked: boolean;
  unlockedAt?: string;
};

export type AchievementMetrics = {
  completedWorkouts: number;
  totalTrainingMinutes: number;
  totalVolumeKg: number;
  totalVolumeTons: number;
  uniqueWorkoutDays: number;
  currentWeeklyStreak: number;
  longestWeeklyStreak: number;
  maxCompletedWorkoutsInSingleWeek: number;
  uniqueExercisesCompleted: number;
  aiWorkoutsCreated: number;
  appUsageHours: number;
  deletedSessionsIgnored: number;
};

export type AppUsageStats = {
  totalForegroundSeconds: number;
  lastStartedAt?: string;
  updatedAt: string;
};

export const ACHIEVEMENTS_STORAGE_BASE_KEY = "achievements";
export const APP_USAGE_STATS_STORAGE_BASE_KEY = "appUsageStats";
export const maxForegroundSessionSeconds = 8 * 60 * 60;

export const achievementDefinitions: AchievementDefinition[] = [
  {
    id: "first_workout",
    category: "training",
    title: { pl: "Pierwszy trening", en: "First workout" },
    description: { pl: "Ukończ pierwszy trening.", en: "Complete your first workout." },
    target: 1,
    unit: "count",
    metricKey: "completedWorkouts",
    iconKey: "barbell",
    imageKey: "first-workout",
    sortOrder: 10
  },
  {
    id: "five_workouts",
    category: "training",
    title: { pl: "Rozgrzewka za Tobą", en: "Warm-up complete" },
    description: { pl: "Ukończ 5 treningów.", en: "Complete 5 workouts." },
    target: 5,
    unit: "count",
    metricKey: "completedWorkouts",
    iconKey: "flame",
    imageKey: "five-workouts",
    sortOrder: 20
  },
  {
    id: "ten_workouts",
    category: "training",
    title: { pl: "Wchodzisz w rytm", en: "Finding your rhythm" },
    description: { pl: "Ukończ 10 treningów.", en: "Complete 10 workouts." },
    target: 10,
    unit: "count",
    metricKey: "completedWorkouts",
    iconKey: "pulse",
    imageKey: "ten-workouts",
    sortOrder: 30
  },
  {
    id: "twenty_five_workouts",
    category: "training",
    title: { pl: "Stały bywalec", en: "Regular lifter" },
    description: { pl: "Ukończ 25 treningów.", en: "Complete 25 workouts." },
    target: 25,
    unit: "count",
    metricKey: "completedWorkouts",
    iconKey: "calendar",
    imageKey: "twenty-five-workouts",
    sortOrder: 40
  },
  {
    id: "fifty_workouts",
    category: "training",
    title: { pl: "Maszyna treningowa", en: "Training machine" },
    description: { pl: "Ukończ 50 treningów.", en: "Complete 50 workouts." },
    target: 50,
    unit: "count",
    metricKey: "completedWorkouts",
    iconKey: "fitness",
    imageKey: "fifty-workouts",
    sortOrder: 50
  },
  {
    id: "hundred_workouts",
    category: "training",
    title: { pl: "Żelazna konsekwencja", en: "Iron consistency" },
    description: { pl: "Ukończ 100 treningów.", en: "Complete 100 workouts." },
    target: 100,
    unit: "count",
    metricKey: "completedWorkouts",
    iconKey: "shield",
    imageKey: "hundred-workouts",
    sortOrder: 60
  },
  {
    id: "one_ton_volume",
    category: "volume",
    title: { pl: "Pierwsza tona", en: "First ton" },
    description: { pl: "Przerzuć łącznie 1 tonę ciężaru.", en: "Move a total of 1 ton of weight." },
    target: 1,
    unit: "tons",
    metricKey: "totalVolumeTons",
    iconKey: "cube",
    imageKey: "one-ton-volume",
    sortOrder: 70
  },
  {
    id: "ten_tons_volume",
    category: "volume",
    title: { pl: "Dziesięć ton", en: "Ten tons" },
    description: { pl: "Przerzuć łącznie 10 ton ciężaru.", en: "Move a total of 10 tons of weight." },
    target: 10,
    unit: "tons",
    metricKey: "totalVolumeTons",
    iconKey: "layers",
    imageKey: "ten-tons-volume",
    sortOrder: 80
  },
  {
    id: "fifty_tons_volume",
    category: "volume",
    title: { pl: "Ciężka robota", en: "Heavy work" },
    description: { pl: "Przerzuć łącznie 50 ton ciężaru.", en: "Move a total of 50 tons of weight." },
    target: 50,
    unit: "tons",
    metricKey: "totalVolumeTons",
    iconKey: "construct",
    imageKey: "fifty-tons-volume",
    sortOrder: 90
  },
  {
    id: "hundred_tons_volume",
    category: "volume",
    title: { pl: "Stalowy zapas", en: "Steel reserve" },
    description: { pl: "Przerzuć łącznie 100 ton ciężaru.", en: "Move a total of 100 tons of weight." },
    target: 100,
    unit: "tons",
    metricKey: "totalVolumeTons",
    iconKey: "medal",
    imageKey: "hundred-tons-volume",
    sortOrder: 100
  },
  {
    id: "ten_training_hours",
    category: "training",
    title: { pl: "10 godzin pracy", en: "10 hours of work" },
    description: {
      pl: "Spędź łącznie 10 godzin na ukończonych treningach.",
      en: "Spend 10 total hours in completed workouts."
    },
    target: 600,
    unit: "minutes",
    metricKey: "totalTrainingMinutes",
    iconKey: "time",
    imageKey: "ten-training-hours",
    sortOrder: 110
  },
  {
    id: "fifty_training_hours",
    category: "training",
    title: { pl: "50 godzin treningu", en: "50 training hours" },
    description: {
      pl: "Spędź łącznie 50 godzin na ukończonych treningach.",
      en: "Spend 50 total hours in completed workouts."
    },
    target: 3000,
    unit: "minutes",
    metricKey: "totalTrainingMinutes",
    iconKey: "hourglass",
    imageKey: "fifty-training-hours",
    sortOrder: 120
  },
  {
    id: "seven_training_days",
    category: "consistency",
    title: { pl: "Siedem aktywnych dni", en: "Seven active days" },
    description: { pl: "Trenuj w 7 różnych dniach.", en: "Train on 7 different days." },
    target: 7,
    unit: "days",
    metricKey: "uniqueWorkoutDays",
    iconKey: "calendar",
    imageKey: "seven-training-days",
    sortOrder: 130
  },
  {
    id: "thirty_training_days",
    category: "consistency",
    title: { pl: "Miesiąc aktywności", en: "A month of activity" },
    description: { pl: "Trenuj w 30 różnych dniach.", en: "Train on 30 different days." },
    target: 30,
    unit: "days",
    metricKey: "uniqueWorkoutDays",
    iconKey: "calendar-number",
    imageKey: "thirty-training-days",
    sortOrder: 140
  },
  {
    id: "three_week_streak",
    category: "consistency",
    title: { pl: "Trzy tygodnie z rzędu", en: "Three-week streak" },
    description: {
      pl: "Ukończ przynajmniej jeden trening tygodniowo przez 3 tygodnie z rzędu.",
      en: "Complete at least one workout per week for 3 weeks in a row."
    },
    target: 3,
    unit: "count",
    metricKey: "longestWeeklyStreak",
    iconKey: "trending-up",
    imageKey: "three-week-streak",
    sortOrder: 150
  },
  {
    id: "ten_unique_exercises",
    category: "exploration",
    title: { pl: "Odkrywca ćwiczeń", en: "Exercise explorer" },
    description: { pl: "Wykonaj 10 różnych ćwiczeń.", en: "Complete 10 different exercises." },
    target: 10,
    unit: "count",
    metricKey: "uniqueExercisesCompleted",
    iconKey: "compass",
    imageKey: "ten-unique-exercises",
    sortOrder: 160
  },
  {
    id: "thirty_unique_exercises",
    category: "exploration",
    title: { pl: "Biblioteka ruchu", en: "Movement library" },
    description: { pl: "Wykonaj 30 różnych ćwiczeń.", en: "Complete 30 different exercises." },
    target: 30,
    unit: "count",
    metricKey: "uniqueExercisesCompleted",
    iconKey: "library",
    imageKey: "thirty-unique-exercises",
    sortOrder: 170
  },
  {
    id: "ten_app_hours",
    category: "app_usage",
    title: { pl: "10 godzin z Gymmin", en: "10 hours with Gymmin" },
    description: { pl: "Spędź łącznie 10 godzin w aplikacji.", en: "Spend 10 total hours in the app." },
    target: 10,
    unit: "hours",
    metricKey: "appUsageHours",
    iconKey: "phone-portrait",
    imageKey: "ten-app-hours",
    sortOrder: 180
  },
  {
    id: "two_hundred_fifty_workouts",
    category: "training",
    title: { pl: "Legenda sali", en: "Gym legend" },
    description: { pl: "Ukończ 250 treningów.", en: "Complete 250 workouts." },
    target: 250,
    unit: "count",
    metricKey: "completedWorkouts",
    iconKey: "trophy",
    imageKey: "two-hundred-fifty-workouts",
    sortOrder: 190
  },
  {
    id: "five_hundred_workouts",
    category: "training",
    title: { pl: "Tysiąc procent normy", en: "One thousand percent" },
    description: { pl: "Ukończ 500 treningów.", en: "Complete 500 workouts." },
    target: 500,
    unit: "count",
    metricKey: "completedWorkouts",
    iconKey: "ribbon",
    imageKey: "five-hundred-workouts",
    sortOrder: 200
  },
  {
    id: "two_hundred_fifty_tons_volume",
    category: "volume",
    title: { pl: "Kowal żelaza", en: "Iron blacksmith" },
    description: { pl: "Przerzuć łącznie 250 ton ciężaru.", en: "Move a total of 250 tons of weight." },
    target: 250,
    unit: "tons",
    metricKey: "totalVolumeTons",
    iconKey: "hammer",
    imageKey: "two-hundred-fifty-tons-volume",
    sortOrder: 210
  },
  {
    id: "five_hundred_tons_volume",
    category: "volume",
    title: { pl: "Dźwigar", en: "Heavy hauler" },
    description: { pl: "Przerzuć łącznie 500 ton ciężaru.", en: "Move a total of 500 tons of weight." },
    target: 500,
    unit: "tons",
    metricKey: "totalVolumeTons",
    iconKey: "barbell",
    imageKey: "five-hundred-tons-volume",
    sortOrder: 220
  },
  {
    id: "hundred_training_hours",
    category: "training",
    title: { pl: "Setka godzin", en: "One hundred hours" },
    description: {
      pl: "Spędź łącznie 100 godzin na ukończonych treningach.",
      en: "Spend 100 total hours in completed workouts."
    },
    target: 6000,
    unit: "minutes",
    metricKey: "totalTrainingMinutes",
    iconKey: "time",
    imageKey: "hundred-training-hours",
    sortOrder: 230
  },
  {
    id: "hundred_training_days",
    category: "consistency",
    title: { pl: "Sto aktywnych dni", en: "One hundred active days" },
    description: { pl: "Trenuj w 100 różnych dniach.", en: "Train on 100 different days." },
    target: 100,
    unit: "days",
    metricKey: "uniqueWorkoutDays",
    iconKey: "calendar-number",
    imageKey: "hundred-training-days",
    sortOrder: 240
  },
  {
    id: "twelve_week_streak",
    category: "consistency",
    title: { pl: "Kwartał konsekwencji", en: "Quarter of consistency" },
    description: {
      pl: "Ukończ przynajmniej jeden trening tygodniowo przez 12 tygodni z rzędu.",
      en: "Complete at least one workout per week for 12 weeks in a row."
    },
    target: 12,
    unit: "weeks",
    metricKey: "longestWeeklyStreak",
    iconKey: "trending-up",
    imageKey: "twelve-week-streak",
    sortOrder: 250
  },
  {
    id: "fifty_two_week_streak",
    category: "consistency",
    title: { pl: "Rok bez wymówek", en: "A year without excuses" },
    description: {
      pl: "Ukończ przynajmniej jeden trening tygodniowo przez 52 tygodnie z rzędu.",
      en: "Complete at least one workout per week for 52 weeks in a row."
    },
    target: 52,
    unit: "weeks",
    metricKey: "longestWeeklyStreak",
    iconKey: "shield",
    imageKey: "fifty-two-week-streak",
    sortOrder: 260
  },
  {
    id: "fifty_unique_exercises",
    category: "exploration",
    title: { pl: "Atlas ćwiczeń", en: "Exercise atlas" },
    description: { pl: "Wykonaj 50 różnych ćwiczeń.", en: "Complete 50 different exercises." },
    target: 50,
    unit: "count",
    metricKey: "uniqueExercisesCompleted",
    iconKey: "library",
    imageKey: "fifty-unique-exercises",
    sortOrder: 270
  },
  {
    id: "hundred_unique_exercises",
    category: "exploration",
    title: { pl: "Mistrz ruchu", en: "Movement master" },
    description: { pl: "Wykonaj 100 różnych ćwiczeń.", en: "Complete 100 different exercises." },
    target: 100,
    unit: "count",
    metricKey: "uniqueExercisesCompleted",
    iconKey: "compass",
    imageKey: "hundred-unique-exercises",
    sortOrder: 280
  },
  {
    id: "three_workouts_single_week",
    category: "consistency",
    title: { pl: "Tydzień treningowy", en: "Training week" },
    description: { pl: "Ukończ 3 treningi w jednym tygodniu kalendarzowym.", en: "Complete 3 workouts in a single calendar week." },
    target: 3,
    unit: "count",
    metricKey: "maxCompletedWorkoutsInSingleWeek",
    iconKey: "calendar",
    imageKey: "three-workouts-single-week",
    sortOrder: 290
  },
  {
    id: "five_workouts_single_week",
    category: "consistency",
    title: { pl: "Mocny tydzień", en: "Strong week" },
    description: { pl: "Ukończ 5 treningów w jednym tygodniu kalendarzowym.", en: "Complete 5 workouts in a single calendar week." },
    target: 5,
    unit: "count",
    metricKey: "maxCompletedWorkoutsInSingleWeek",
    iconKey: "flame",
    imageKey: "five-workouts-single-week",
    sortOrder: 300
  }
];

export function getDefaultAppUsageStats(now = new Date().toISOString()): AppUsageStats {
  return {
    totalForegroundSeconds: 0,
    updatedAt: now
  };
}

function normalizeDate(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

export function normalizeUserAchievements(value: unknown): UserAchievement[] {
  const records = Array.isArray(value)
    ? value
    : typeof value === "object" && value !== null && Array.isArray((value as { achievements?: unknown }).achievements)
      ? (value as { achievements: unknown[] }).achievements
      : [];
  const byId = new Map<string, UserAchievement>();

  records.forEach((item) => {
    if (typeof item !== "object" || item === null) {
      return;
    }

    const raw = item as Partial<UserAchievement>;
    const achievementId = typeof raw.achievementId === "string" ? raw.achievementId.trim() : "";
    const unlockedAt = normalizeDate(raw.unlockedAt);
    if (!achievementId || !unlockedAt || byId.has(achievementId)) {
      return;
    }

    const progressAtUnlock = typeof raw.progressAtUnlock === "number" && Number.isFinite(raw.progressAtUnlock)
      ? raw.progressAtUnlock
      : undefined;
    const updatedAt = normalizeDate(raw.updatedAt) ?? unlockedAt;
    byId.set(achievementId, { achievementId, unlockedAt, progressAtUnlock, updatedAt });
  });

  return Array.from(byId.values()).sort((left, right) => Date.parse(right.unlockedAt) - Date.parse(left.unlockedAt));
}

export function normalizeAppUsageStats(value: unknown, now = new Date().toISOString()): AppUsageStats {
  if (typeof value !== "object" || value === null) {
    return getDefaultAppUsageStats(now);
  }

  const raw = value as Partial<AppUsageStats>;
  const totalForegroundSeconds = typeof raw.totalForegroundSeconds === "number" && Number.isFinite(raw.totalForegroundSeconds)
    ? Math.max(0, Math.floor(raw.totalForegroundSeconds))
    : 0;

  return {
    totalForegroundSeconds,
    lastStartedAt: normalizeDate(raw.lastStartedAt) ?? undefined,
    updatedAt: normalizeDate(raw.updatedAt) ?? now
  };
}

export async function loadUserAchievements(): Promise<UserAchievement[]> {
  try {
    const rawData = await AsyncStorage.getItem(getLocalOnlyStorageKey(ACHIEVEMENTS_STORAGE_BASE_KEY));
    return rawData ? normalizeUserAchievements(JSON.parse(rawData)) : [];
  } catch {
    return [];
  }
}

export async function saveUserAchievements(achievements: UserAchievement[]) {
  await AsyncStorage.setItem(
    getLocalOnlyStorageKey(ACHIEVEMENTS_STORAGE_BASE_KEY),
    JSON.stringify({ achievements: normalizeUserAchievements(achievements), version: 1 })
  );
}

export async function loadAppUsageStats(): Promise<AppUsageStats> {
  try {
    const rawData = await AsyncStorage.getItem(getLocalOnlyStorageKey(APP_USAGE_STATS_STORAGE_BASE_KEY));
    return rawData ? normalizeAppUsageStats(JSON.parse(rawData)) : getDefaultAppUsageStats();
  } catch {
    return getDefaultAppUsageStats();
  }
}

export async function saveAppUsageStats(stats: AppUsageStats) {
  await AsyncStorage.setItem(
    getLocalOnlyStorageKey(APP_USAGE_STATS_STORAGE_BASE_KEY),
    JSON.stringify({ ...normalizeAppUsageStats(stats), version: 1 })
  );
}

export function getNewUserAchievementUnlocks(previous: UserAchievement[], next: UserAchievement[]): UserAchievement[] {
  const previousIds = new Set(normalizeUserAchievements(previous).map((achievement) => achievement.achievementId));
  return normalizeUserAchievements(next).filter((achievement) => !previousIds.has(achievement.achievementId));
}

function getLocalDateKey(value: string): string | null {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  const date = new Date(parsed);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getLocalWeekStart(value: string): number | null {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  const date = new Date(parsed);
  const day = date.getDay() || 7;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - day + 1);
  return date.getTime();
}

function getWeeklyStreaks(sessions: WorkoutSession[]) {
  const weeks = Array.from(new Set(
    sessions
      .map((session) => getLocalWeekStart(session.startedAt))
      .filter((value): value is number => value !== null)
  )).sort((left, right) => left - right);

  let longestWeeklyStreak = 0;
  let currentRun = 0;
  let previousWeek: number | null = null;

  weeks.forEach((week) => {
    if (previousWeek !== null && week - previousWeek === 7 * 24 * 60 * 60 * 1000) {
      currentRun += 1;
    } else {
      currentRun = 1;
    }

    longestWeeklyStreak = Math.max(longestWeeklyStreak, currentRun);
    previousWeek = week;
  });

  return {
    currentWeeklyStreak: currentRun,
    longestWeeklyStreak
  };
}

function getMaxCompletedWorkoutsInSingleWeek(sessions: WorkoutSession[]) {
  const countsByWeek = new Map<number, number>();

  sessions.forEach((session) => {
    const week = getLocalWeekStart(session.startedAt);
    if (week === null) {
      return;
    }

    countsByWeek.set(week, (countsByWeek.get(week) ?? 0) + 1);
  });

  return countsByWeek.size ? Math.max(...countsByWeek.values()) : 0;
}

export function calculateAchievementMetrics(
  sessions: WorkoutSession[],
  appUsageStats: AppUsageStats = getDefaultAppUsageStats()
): AchievementMetrics {
  const completedSessions = getCompletedWorkoutSessions(sessions);
  const deletedSessionsIgnored = sessions.filter((session) => Boolean(session.deletedAt)).length;
  const totalVolumeKg = completedSessions.reduce((total, session) => total + calculateSessionVolume(session), 0);
  const uniqueWorkoutDays = new Set(
    completedSessions
      .map((session) => getLocalDateKey(session.startedAt))
      .filter((value): value is string => Boolean(value))
  ).size;
  const uniqueExercises = new Set<string>();

  completedSessions.forEach((session) => {
    session.entries.forEach((entry) => {
      const key = getExerciseKey(entry);
      if (key) {
        uniqueExercises.add(key);
      }
    });
  });

  const weeklyStreaks = getWeeklyStreaks(completedSessions);

  return {
    completedWorkouts: completedSessions.length,
    totalTrainingMinutes: completedSessions.reduce((total, session) => total + ((getSessionDurationMs(session) ?? 0) / 60000), 0),
    totalVolumeKg,
    totalVolumeTons: totalVolumeKg / 1000,
    uniqueWorkoutDays,
    currentWeeklyStreak: weeklyStreaks.currentWeeklyStreak,
    longestWeeklyStreak: weeklyStreaks.longestWeeklyStreak,
    maxCompletedWorkoutsInSingleWeek: getMaxCompletedWorkoutsInSingleWeek(completedSessions),
    uniqueExercisesCompleted: uniqueExercises.size,
    aiWorkoutsCreated: 0,
    appUsageHours: normalizeAppUsageStats(appUsageStats).totalForegroundSeconds / 3600,
    deletedSessionsIgnored
  };
}

function getMetricValue(definition: AchievementDefinition, metrics: AchievementMetrics): number {
  const value = metrics[definition.metricKey];
  return Number.isFinite(value) ? value : 0;
}

export function getAchievementProgress(
  definitions: AchievementDefinition[],
  metrics: AchievementMetrics,
  unlockedAchievements: UserAchievement[]
): AchievementProgress[] {
  const unlockedById = new Map(unlockedAchievements.map((achievement) => [achievement.achievementId, achievement]));

  return [...definitions]
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .filter((definition) => !definition.hiddenUntilUnlocked || unlockedById.has(definition.id))
    .map((definition) => {
      const current = getMetricValue(definition, metrics);
      const unlocked = unlockedById.get(definition.id);
      const reached = current >= definition.target;
      const percent = definition.target > 0 ? Math.max(0, Math.min(100, (current / definition.target) * 100)) : 100;

      return {
        definition,
        current,
        target: definition.target,
        percent: unlocked || reached ? Math.max(percent, unlocked ? 100 : percent) : percent,
        unlocked: Boolean(unlocked) || reached,
        unlockedAt: unlocked?.unlockedAt
      };
    });
}

export function evaluateAchievements(
  definitions: AchievementDefinition[],
  metrics: AchievementMetrics,
  existingUnlocked: UserAchievement[],
  now: string
) {
  const normalizedExisting = normalizeUserAchievements(existingUnlocked);
  const existingIds = new Set(normalizedExisting.map((achievement) => achievement.achievementId));
  const newUnlocks = definitions
    .filter((definition) => !existingIds.has(definition.id) && getMetricValue(definition, metrics) >= definition.target)
    .map((definition) => ({
      achievementId: definition.id,
      progressAtUnlock: getMetricValue(definition, metrics),
      unlockedAt: now
    }));
  const unlockedAchievements = normalizeUserAchievements([...normalizedExisting, ...newUnlocks]);

  return {
    newUnlocks,
    progress: getAchievementProgress(definitions, metrics, unlockedAchievements),
    unlockedAchievements
  };
}

export function addForegroundUsageSeconds(
  stats: AppUsageStats,
  startedAtMs: number,
  endedAtMs: number,
  now = new Date(endedAtMs).toISOString()
): AppUsageStats {
  const deltaSeconds = Math.floor((endedAtMs - startedAtMs) / 1000);
  const boundedDelta = Number.isFinite(deltaSeconds)
    ? Math.max(0, Math.min(maxForegroundSessionSeconds, deltaSeconds))
    : 0;
  const normalizedStats = normalizeAppUsageStats(stats, now);

  return {
    totalForegroundSeconds: normalizedStats.totalForegroundSeconds + boundedDelta,
    updatedAt: now
  };
}
