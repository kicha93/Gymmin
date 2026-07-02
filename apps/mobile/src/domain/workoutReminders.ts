import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeModules, Platform } from "react-native";

import { getAccountStorageKey } from "./accountStorage";
import type { WorkoutSession } from "./workoutSessions";

export type WorkoutReminderSettings = {
  enabled: boolean;
  daysOfWeek: number[];
  time: string;
  message: string;
  description?: string;
  onlyIfNoWorkoutToday: boolean;
  updatedAt?: string;
};

export const WORKOUT_REMINDER_NOTIFICATION_IDS_BASE_KEY = "workoutReminderNotificationIds";

const reminderChannelId = "workout-reminders";
const scheduleHorizonDays = 14;

type NotificationsModule = typeof import("expo-notifications");

function isAndroidExpoGo() {
  const expoConstants = (
    NativeModules.ExponentConstants ??
    NativeModules.ExpoConstants ??
    {}
  ) as Record<string, unknown>;

  return Platform.OS === "android" && expoConstants.appOwnership === "expo";
}

async function getNotificationsModule(): Promise<NotificationsModule | null> {
  if (Platform.OS === "web" || isAndroidExpoGo()) {
    return null;
  }

  try {
    return await import("expo-notifications");
  } catch (error) {
    console.warn("expo-notifications is not available", error);
    return null;
  }
}

export function getDefaultWorkoutReminderSettings(language: "pl" | "en" = "en"): WorkoutReminderSettings {
  return {
    daysOfWeek: [1, 3, 5],
    description: language === "pl"
      ? "Otwórz Gymmin i wykonaj zaplanowany trening."
      : "Open Gymmin and complete your planned workout.",
    enabled: false,
    message: language === "pl" ? "Czas na trening" : "Time to train",
    onlyIfNoWorkoutToday: true,
    time: "18:00"
  };
}

function isValidReminderDay(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 7;
}

export function normalizeWorkoutReminderTime(value: unknown) {
  if (typeof value !== "string") {
    return "18:00";
  }

  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) {
    return "18:00";
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return "18:00";
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function normalizeWorkoutReminderSettings(
  value: unknown,
  language: "pl" | "en" = "en"
): WorkoutReminderSettings {
  const defaults = getDefaultWorkoutReminderSettings(language);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return defaults;
  }

  const raw = value as Partial<WorkoutReminderSettings>;
  const daysOfWeek = Array.isArray(raw.daysOfWeek)
    ? Array.from(new Set(raw.daysOfWeek.filter(isValidReminderDay))).sort((left, right) => left - right)
    : defaults.daysOfWeek;

  return {
    daysOfWeek,
    description: typeof raw.description === "string" && raw.description.trim()
      ? raw.description.trim()
      : defaults.description,
    enabled: raw.enabled === true,
    message: typeof raw.message === "string" && raw.message.trim() ? raw.message.trim() : defaults.message,
    onlyIfNoWorkoutToday: raw.onlyIfNoWorkoutToday !== false,
    time: normalizeWorkoutReminderTime(raw.time),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : undefined
  };
}

export async function requestWorkoutReminderPermissions() {
  const notifications = await getNotificationsModule();
  if (!notifications) {
    return false;
  }

  const current = await notifications.getPermissionsAsync();
  const status = current.granted ? current.status : (await notifications.requestPermissionsAsync()).status;
  return status === "granted";
}

async function hasWorkoutReminderPermissions(notifications: NotificationsModule) {
  const current = await notifications.getPermissionsAsync();
  return current.granted || current.status === "granted";
}

export async function ensureWorkoutReminderNotificationChannel(notifications: NotificationsModule) {
  if (Platform.OS !== "android") {
    return;
  }

  await notifications.setNotificationChannelAsync(reminderChannelId, {
    importance: notifications.AndroidImportance.DEFAULT,
    name: "Workout reminders"
  });
}

function createWorkoutReminderDateTrigger(notifications: NotificationsModule, reminderDate: Date) {
  return {
    ...(Platform.OS === "android" ? { channelId: reminderChannelId } : {}),
    date: reminderDate,
    type: notifications.SchedulableTriggerInputTypes.DATE
  } as Parameters<typeof notifications.scheduleNotificationAsync>[0]["trigger"];
}

async function loadScheduledNotificationIds(userId?: string | null): Promise<string[]> {
  try {
    const rawData = await AsyncStorage.getItem(getAccountStorageKey(WORKOUT_REMINDER_NOTIFICATION_IDS_BASE_KEY, userId));
    const parsed = rawData ? JSON.parse(rawData) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch (error) {
    console.error("Failed to load workout reminder notification ids", error);
    return [];
  }
}

async function saveScheduledNotificationIds(userId: string | null | undefined, ids: string[]) {
  await AsyncStorage.setItem(getAccountStorageKey(WORKOUT_REMINDER_NOTIFICATION_IDS_BASE_KEY, userId), JSON.stringify(ids));
}

function toReminderDay(date: Date) {
  // Gymmin convention: 1 = Monday, 7 = Sunday.
  return date.getDay() === 0 ? 7 : date.getDay();
}

function isSameLocalDate(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate();
}

export function hasCompletedWorkoutOnDate(sessions: WorkoutSession[], date: Date) {
  return sessions.some((session) => {
    if (session.deletedAt || session.status !== "completed") {
      return false;
    }

    const completedAt = new Date(session.finishedAt || session.startedAt);
    return Number.isFinite(completedAt.getTime()) && isSameLocalDate(completedAt, date);
  });
}

export function shouldScheduleReminderForDay(
  settings: WorkoutReminderSettings,
  date: Date,
  sessions: WorkoutSession[],
  currentDate = new Date()
) {
  if (!settings.enabled || !settings.daysOfWeek.includes(toReminderDay(date))) {
    return false;
  }

  if (settings.onlyIfNoWorkoutToday && isSameLocalDate(date, currentDate) && hasCompletedWorkoutOnDate(sessions, date)) {
    return false;
  }

  return true;
}

export function getUpcomingReminderDates(settings: WorkoutReminderSettings, sessions: WorkoutSession[], now = new Date()) {
  const [hourText, minuteText] = settings.time.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const dates: Date[] = [];

  for (let dayOffset = 0; dayOffset < scheduleHorizonDays; dayOffset += 1) {
    const reminderDate = new Date(now);
    reminderDate.setDate(now.getDate() + dayOffset);
    reminderDate.setHours(hour, minute, 0, 0);

    if (reminderDate <= now || !shouldScheduleReminderForDay(settings, reminderDate, sessions, now)) {
      continue;
    }

    dates.push(reminderDate);
  }

  return dates;
}

export function getWorkoutReminderNotificationContent(settings: WorkoutReminderSettings) {
  return {
    body: settings.description ?? "",
    sound: true,
    title: settings.message
  };
}

export async function cancelWorkoutReminders(userId?: string | null) {
  const notifications = await getNotificationsModule();
  const ids = await loadScheduledNotificationIds(userId);

  if (notifications) {
    await Promise.all(ids.map((id) => notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)));
  }

  await saveScheduledNotificationIds(userId, []);
}

export async function scheduleWorkoutReminders(
  settings: WorkoutReminderSettings,
  sessions: WorkoutSession[],
  userId?: string | null
) {
  const notifications = await getNotificationsModule();
  if (!notifications || !settings.enabled || settings.daysOfWeek.length === 0) {
    await cancelWorkoutReminders(userId);
    return { scheduledCount: 0 };
  }

  if (!await hasWorkoutReminderPermissions(notifications)) {
    await cancelWorkoutReminders(userId);
    return { permissionDenied: true, scheduledCount: 0 };
  }

  await ensureWorkoutReminderNotificationChannel(notifications);
  await cancelWorkoutReminders(userId);

  const ids: string[] = [];
  for (const reminderDate of getUpcomingReminderDates(settings, sessions)) {
    const id = await notifications.scheduleNotificationAsync({
      content: getWorkoutReminderNotificationContent(settings),
      trigger: createWorkoutReminderDateTrigger(notifications, reminderDate)
    });
    ids.push(id);
  }

  await saveScheduledNotificationIds(userId, ids);
  return { scheduledCount: ids.length };
}

export async function rescheduleWorkoutReminders(
  settings: WorkoutReminderSettings,
  sessions: WorkoutSession[],
  userId?: string | null
) {
  if (!settings.enabled) {
    await cancelWorkoutReminders(userId);
    return { scheduledCount: 0 };
  }

  return scheduleWorkoutReminders(settings, sessions, userId);
}
