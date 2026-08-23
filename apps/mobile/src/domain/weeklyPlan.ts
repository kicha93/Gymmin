import AsyncStorage from "@react-native-async-storage/async-storage";

import { getLocalOnlyStorageKey } from "./localOnlyStorageMigration";
import type { WorkoutSession } from "./workoutSessions";

export type WeeklyPlanDay = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

export type WeeklyPlanItem = {
  workoutId: string;
  day: WeeklyPlanDay;
  order: number;
};

export type WeeklyPlanSettings = {
  enabled: boolean;
  items: WeeklyPlanItem[];
  updatedAt: string;
};
export type LoadedWeeklyPlan = {
  hadPersistedPlan: boolean;
  plan: WeeklyPlanSettings;
};

export type WeeklyPlanWorkout = { archivedAt?: string | null; id: string; name: string };
export type WeeklyPlanWeekRange = { start: Date; end: Date };
export type WeeklyPlanSummary = {
  completed: number;
  remaining: number;
  percent: number;
  total: number;
  todayItems: Array<WeeklyPlanItem & { workout: WeeklyPlanWorkout }>;
  items: Array<WeeklyPlanItem & { workout: WeeklyPlanWorkout; completed: boolean }>;
};

export const WEEKLY_PLAN_STORAGE_BASE_KEY = "weeklyPlan.v1";
export const weeklyPlanDays: WeeklyPlanDay[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
export const weeklyPlanLimits = {
  itemCount: 100,
  workoutIdLength: 128
} as const;

export function sortWeeklyPlanItemsForDisplay<
  T extends WeeklyPlanItem & { workout: WeeklyPlanWorkout }
>(items: T[]): T[] {
  const dayOrder = new Map(weeklyPlanDays.map((day, index) => [day, index]));

  return [...items].sort((left, right) => {
    const dayDifference = (dayOrder.get(left.day) ?? weeklyPlanDays.length)
      - (dayOrder.get(right.day) ?? weeklyPlanDays.length);
    if (dayDifference !== 0) {
      return dayDifference;
    }

    const nameDifference = left.workout.name.localeCompare(right.workout.name, undefined, {
      sensitivity: "base"
    });
    return nameDifference || left.workout.id.localeCompare(right.workout.id) || left.order - right.order;
  });
}

export function getDefaultWeeklyPlanSettings(now = new Date()): WeeklyPlanSettings {
  return { enabled: false, items: [], updatedAt: now.toISOString() };
}

export function normalizeWeeklyPlanSettings(value: unknown, now = new Date()): WeeklyPlanSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return getDefaultWeeklyPlanSettings(now);
  }

  const candidate = value as Partial<WeeklyPlanSettings>;
  const seen = new Set<string>();
  const items = Array.isArray(candidate.items)
    ? candidate.items.slice(0, weeklyPlanLimits.itemCount).flatMap((item, index) => {
      if (!item || typeof item !== "object") {
        return [];
      }
      const value = item as Partial<WeeklyPlanItem>;
      const workoutId = typeof value.workoutId === "string"
        ? value.workoutId.trim().slice(0, weeklyPlanLimits.workoutIdLength)
        : "";
      const day = value.day as WeeklyPlanDay;
      const uniqueKey = `${workoutId}:${day}`;
      if (!workoutId || seen.has(uniqueKey) || !weeklyPlanDays.includes(day)) {
        return [];
      }
      seen.add(uniqueKey);
      const order = typeof value.order === "number"
        && Number.isSafeInteger(value.order)
        && value.order >= 0
        ? value.order
        : index;
      return [{ workoutId, day, order }];
    })
    : [];
  const updatedAt = typeof candidate.updatedAt === "string"
    && Number.isFinite(Date.parse(candidate.updatedAt))
    ? candidate.updatedAt
    : now.toISOString();

  return {
    enabled: candidate.enabled === true && items.length > 0,
    items: items
      .sort((left, right) => left.order - right.order || left.workoutId.localeCompare(right.workoutId))
      .map((item, index) => ({ ...item, order: index })),
    updatedAt
  };
}

export function mergeWeeklyPlans(
  primary: WeeklyPlanSettings,
  secondary: WeeklyPlanSettings,
  now = new Date()
): WeeklyPlanSettings {
  const primaryPlan = normalizeWeeklyPlanSettings(primary, now);
  const secondaryPlan = normalizeWeeklyPlanSettings(secondary, now);
  const seen = new Set<string>();
  const items = [...primaryPlan.items, ...secondaryPlan.items]
    .filter((item) => {
      const key = `${item.workoutId}:${item.day}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, weeklyPlanLimits.itemCount)
    .map((item, index) => ({ ...item, order: index }));

  return {
    enabled: items.length > 0,
    items,
    updatedAt: now.toISOString()
  };
}

export async function loadWeeklyPlanState(): Promise<LoadedWeeklyPlan> {
  try {
    const raw = await AsyncStorage.getItem(getLocalOnlyStorageKey(WEEKLY_PLAN_STORAGE_BASE_KEY));
    return {
      hadPersistedPlan: raw !== null,
      plan: raw ? normalizeWeeklyPlanSettings(JSON.parse(raw)) : getDefaultWeeklyPlanSettings()
    };
  } catch {
    return { hadPersistedPlan: false, plan: getDefaultWeeklyPlanSettings() };
  }
}

export async function loadWeeklyPlan(): Promise<WeeklyPlanSettings> {
  return (await loadWeeklyPlanState()).plan;
}

export async function saveWeeklyPlan(plan: WeeklyPlanSettings) {
  await AsyncStorage.setItem(
    getLocalOnlyStorageKey(WEEKLY_PLAN_STORAGE_BASE_KEY),
    JSON.stringify(normalizeWeeklyPlanSettings(plan))
  );
}

export function getCurrentWeekRange(date: Date): WeeklyPlanWeekRange {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = start.getDay() || 7;
  start.setDate(start.getDate() - day + 1);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function getWeeklyPlanDay(date: Date): WeeklyPlanDay {
  return weeklyPlanDays[(date.getDay() + 6) % 7];
}

export function formatWeekRange(range: WeeklyPlanWeekRange, language: "pl" | "en"): string {
  const plMonths = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"];
  const enMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const months = language === "pl" ? plMonths : enMonths;
  const startMonth = months[range.start.getMonth()];
  const endMonth = months[range.end.getMonth()];
  if (language === "pl") {
    return range.start.getMonth() === range.end.getMonth()
      ? `${range.start.getDate()} - ${range.end.getDate()} ${endMonth}`
      : `${range.start.getDate()} ${startMonth} - ${range.end.getDate()} ${endMonth}`;
  }
  return range.start.getMonth() === range.end.getMonth()
    ? `${startMonth} ${range.start.getDate()} - ${range.end.getDate()}`
    : `${startMonth} ${range.start.getDate()} - ${endMonth} ${range.end.getDate()}`;
}

function sessionMatchesWorkout(session: WorkoutSession, workoutId: string): boolean {
  const fallback = session as WorkoutSession & { workoutId?: string; clientWorkoutId?: string };
  return session.sourceWorkoutId === workoutId || fallback.workoutId === workoutId || fallback.clientWorkoutId === workoutId;
}

export function isWeeklyPlanWorkoutCompleted(item: WeeklyPlanItem, sessions: WorkoutSession[], range: WeeklyPlanWeekRange): boolean {
  return sessions.some((session) => {
    if (session.status !== "completed" || session.deletedAt || !sessionMatchesWorkout(session, item.workoutId)) {
      return false;
    }
    const startedAt = new Date(session.startedAt);
    return !Number.isNaN(startedAt.getTime()) && startedAt >= range.start && startedAt <= range.end;
  });
}

export function getWeeklyPlanSummary(
  plan: WeeklyPlanSettings,
  workouts: WeeklyPlanWorkout[],
  sessions: WorkoutSession[],
  now: Date
): WeeklyPlanSummary {
  const workoutById = new Map(workouts.map((workout) => [workout.id, workout]));
  const range = getCurrentWeekRange(now);
  const currentDay = getWeeklyPlanDay(now);
  const normalizedItems = normalizeWeeklyPlanSettings(plan, now).items;
  const completedSessionsByWorkoutId = new Map<string, number>();
  for (const session of sessions) {
    if (session.status !== "completed" || session.deletedAt) {
      continue;
    }
    const startedAt = new Date(session.startedAt);
    if (Number.isNaN(startedAt.getTime()) || startedAt < range.start || startedAt > range.end) {
      continue;
    }
    const matchingWorkout = workouts.find((workout) => sessionMatchesWorkout(session, workout.id));
    if (matchingWorkout) {
      completedSessionsByWorkoutId.set(matchingWorkout.id, (completedSessionsByWorkoutId.get(matchingWorkout.id) ?? 0) + 1);
    }
  }
  const consumedCompletionsByWorkoutId = new Map<string, number>();
  const items = normalizedItems
    .flatMap((item) => {
      const workout = workoutById.get(item.workoutId);
      if (!workout) {
        return [];
      }
      const consumed = consumedCompletionsByWorkoutId.get(item.workoutId) ?? 0;
      const completed = consumed < (completedSessionsByWorkoutId.get(item.workoutId) ?? 0);
      if (completed) {
        consumedCompletionsByWorkoutId.set(item.workoutId, consumed + 1);
      }
      return [{ ...item, workout, completed }];
    });
  const completed = items.filter((item) => item.completed).length;
  const total = items.length;
  return {
    completed,
    items,
    percent: total ? Math.round((completed / total) * 100) : 0,
    remaining: Math.max(0, total - completed),
    todayItems: items.filter((item) => item.day === currentDay),
    total
  };
}

export function getActiveWeeklyPlanWorkouts<T extends WeeklyPlanWorkout>(
  plan: WeeklyPlanSettings,
  workouts: T[],
  now = new Date()
): T[] {
  if (!plan.enabled) {
    return [];
  }

  const workoutsById = new Map(
    workouts
      .filter((workout) => !workout.archivedAt)
      .map((workout) => [workout.id, workout])
  );
  const seen = new Set<string>();

  return normalizeWeeklyPlanSettings(plan, now).items.flatMap((item) => {
    if (seen.has(item.workoutId)) {
      return [];
    }
    const workout = workoutsById.get(item.workoutId);
    if (!workout) {
      return [];
    }
    seen.add(item.workoutId);
    return [workout];
  });
}

export function upsertWeeklyPlanItem(plan: WeeklyPlanSettings, workoutId: string, day: WeeklyPlanDay, now = new Date()): WeeklyPlanSettings {
  const normalized = normalizeWeeklyPlanSettings(plan, now);
  const alreadyPlanned = normalized.items.some((item) => item.workoutId === workoutId && item.day === day);
  const items = alreadyPlanned
    ? normalized.items
    : [...normalized.items, { workoutId, day, order: normalized.items.length }];
  return { enabled: items.length > 0, items, updatedAt: now.toISOString() };
}

export function removeWeeklyPlanItem(plan: WeeklyPlanSettings, workoutId: string, day?: WeeklyPlanDay, now = new Date()): WeeklyPlanSettings {
  const items = normalizeWeeklyPlanSettings(plan, now).items
    .filter((item) => item.workoutId !== workoutId || (day !== undefined && item.day !== day))
    .map((item, index) => ({ ...item, order: index }));
  return { enabled: items.length > 0, items, updatedAt: now.toISOString() };
}

export function toggleWeeklyPlanItemDay(plan: WeeklyPlanSettings, workoutId: string, day: WeeklyPlanDay, now = new Date()) {
  const normalized = normalizeWeeklyPlanSettings(plan, now);
  return normalized.items.some((item) => item.workoutId === workoutId && item.day === day)
    ? removeWeeklyPlanItem(normalized, workoutId, day, now)
    : upsertWeeklyPlanItem(normalized, workoutId, day, now);
}
