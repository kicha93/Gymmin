import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeModules, Platform } from "react-native";

import { getLocalOnlyStorageKey } from "./localOnlyStorageMigration";
import type { WorkoutSession } from "./workoutSessions";

export type ReminderWeekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type ReminderDaySchedule = {
  day: ReminderWeekday;
  enabled: boolean;
  time: string;
};

export type WorkoutReminderSettings = {
  enabled: boolean;
  weeklySchedule: ReminderDaySchedule[];
  message: string;
  description?: string;
  onlyIfNoWorkoutToday: boolean;
  updatedAt?: string;
};

export const WORKOUT_REMINDER_NOTIFICATION_IDS_BASE_KEY = "workoutReminderNotificationIds";
export const WORKOUT_REMINDER_NOTIFICATION_IDS_STORAGE_KEY = getLocalOnlyStorageKey("device.workoutReminderNotificationIds");

export const reminderWeekdays: Array<{ day: ReminderWeekday; number: number }> = [
  { day: "monday", number: 1 },
  { day: "tuesday", number: 2 },
  { day: "wednesday", number: 3 },
  { day: "thursday", number: 4 },
  { day: "friday", number: 5 },
  { day: "saturday", number: 6 },
  { day: "sunday", number: 7 }
];

const reminderChannelId = "workout-reminders";
const reminderNotificationType = "workout-reminder";
const scheduleHorizonDays = 14;
const defaultReminderTime = "18:00";

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

export function isValidReminderDay(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 7;
}

export function normalizeWorkoutReminderTime(value: unknown) {
  if (typeof value !== "string") {
    return defaultReminderTime;
  }

  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) {
    return defaultReminderTime;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return defaultReminderTime;
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function createDefaultWeeklySchedule(enabledDays: number[] = [1, 3, 5], time = defaultReminderTime): ReminderDaySchedule[] {
  const enabledDaySet = new Set(enabledDays.filter(isValidReminderDay));
  const normalizedTime = normalizeWorkoutReminderTime(time);

  return reminderWeekdays.map((item) => ({
    day: item.day,
    enabled: enabledDaySet.has(item.number),
    time: normalizedTime
  }));
}

export function getDefaultWorkoutReminderSettings(language: "pl" | "en" = "en"): WorkoutReminderSettings {
  return {
    description: language === "pl"
      ? "Otwórz Gymmin i wykonaj zaplanowany trening."
      : "Open Gymmin and complete your planned workout.",
    enabled: false,
    message: language === "pl" ? "Czas na trening" : "Time to train",
    onlyIfNoWorkoutToday: true,
    weeklySchedule: createDefaultWeeklySchedule([], defaultReminderTime)
  };
}

function getReminderDayNumber(day: ReminderWeekday) {
  return reminderWeekdays.find((item) => item.day === day)?.number ?? 1;
}

function getReminderWeekday(dayNumber: number): ReminderWeekday {
  return reminderWeekdays.find((item) => item.number === dayNumber)?.day ?? "monday";
}

function normalizeLegacyReminderDays(value: unknown, fallback: number[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  return Array.from(new Set(value.filter(isValidReminderDay))).sort((left, right) => left - right);
}

export function normalizeWeeklySchedule(value: unknown, legacyDays: number[], legacyTime: string): ReminderDaySchedule[] {
  const byDay = new Map<ReminderWeekday, ReminderDaySchedule>();

  if (Array.isArray(value)) {
    value.forEach((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return;
      }

      const raw = item as Partial<ReminderDaySchedule>;
      if (!raw.day || !reminderWeekdays.some((weekday) => weekday.day === raw.day)) {
        return;
      }

      byDay.set(raw.day, {
        day: raw.day,
        enabled: raw.enabled === true,
        time: normalizeWorkoutReminderTime(raw.time)
      });
    });
  }

  const legacySchedule = createDefaultWeeklySchedule(legacyDays, legacyTime);
  return reminderWeekdays.map((item) => byDay.get(item.day) ?? legacySchedule.find((schedule) => schedule.day === item.day)!);
}

export function getReminderScheduleForDay(settings: WorkoutReminderSettings, dayNumber: number) {
  const weekday = getReminderWeekday(dayNumber);
  return settings.weeklySchedule.find((schedule) => schedule.day === weekday) ?? createDefaultWeeklySchedule([], defaultReminderTime)[dayNumber - 1];
}

export function getEnabledReminderDayNumbers(settings: WorkoutReminderSettings) {
  return settings.weeklySchedule
    .filter((schedule) => schedule.enabled)
    .map((schedule) => getReminderDayNumber(schedule.day));
}

export function formatReminderDayTime(schedule: ReminderDaySchedule) {
  return schedule.enabled ? schedule.time : "—";
}

export function updateReminderDaySchedule(
  settings: WorkoutReminderSettings,
  day: ReminderWeekday,
  patch: Partial<Omit<ReminderDaySchedule, "day">>
): WorkoutReminderSettings {
  return {
    ...settings,
    weeklySchedule: reminderWeekdays.map((item) => {
      const current = settings.weeklySchedule.find((schedule) => schedule.day === item.day) ?? {
        day: item.day,
        enabled: false,
        time: defaultReminderTime
      };

      return item.day === day
        ? {
            ...current,
            ...patch,
            time: patch.time === undefined ? current.time : normalizeWorkoutReminderTime(patch.time)
          }
        : current;
    })
  };
}

export function normalizeWorkoutReminderSettings(
  value: unknown,
  language: "pl" | "en" = "en"
): WorkoutReminderSettings {
  const defaults = getDefaultWorkoutReminderSettings(language);
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return defaults;
  }

  const raw = value as Partial<WorkoutReminderSettings> & { daysOfWeek?: unknown; time?: unknown };
  const legacyTime = normalizeWorkoutReminderTime(raw.time);
  const legacyDays = normalizeLegacyReminderDays(raw.daysOfWeek, getEnabledReminderDayNumbers(defaults));

  return {
    description: typeof raw.description === "string" && raw.description.trim()
      ? raw.description.trim()
      : defaults.description,
    enabled: raw.enabled === true,
    message: typeof raw.message === "string" && raw.message.trim() ? raw.message.trim() : defaults.message,
    onlyIfNoWorkoutToday: raw.onlyIfNoWorkoutToday !== false,
    weeklySchedule: normalizeWeeklySchedule(raw.weeklySchedule, legacyDays, legacyTime),
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
    enableVibrate: true,
    importance: notifications.AndroidImportance.DEFAULT,
    name: "Workout reminders",
    vibrationPattern: [0, 300, 180, 300]
  });
}

function createWorkoutReminderDateTrigger(notifications: NotificationsModule, reminderDate: Date) {
  return {
    ...(Platform.OS === "android" ? { channelId: reminderChannelId } : {}),
    date: reminderDate,
    type: notifications.SchedulableTriggerInputTypes.DATE
  } as Parameters<typeof notifications.scheduleNotificationAsync>[0]["trigger"];
}

async function loadScheduledNotificationIds(): Promise<string[]> {
  try {
    const rawData = await AsyncStorage.getItem(WORKOUT_REMINDER_NOTIFICATION_IDS_STORAGE_KEY);
    const parsed = rawData ? JSON.parse(rawData) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch (error) {
    console.error("Failed to load workout reminder notification ids", error);
    return [];
  }
}

async function saveScheduledNotificationIds(ids: string[]) {
  await AsyncStorage.setItem(WORKOUT_REMINDER_NOTIFICATION_IDS_STORAGE_KEY, JSON.stringify(ids));
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
  const daySchedule = getReminderScheduleForDay(settings, toReminderDay(date));
  if (!settings.enabled || !daySchedule.enabled) {
    return false;
  }

  if (settings.onlyIfNoWorkoutToday && isSameLocalDate(date, currentDate) && hasCompletedWorkoutOnDate(sessions, date)) {
    return false;
  }

  return true;
}

export function getUpcomingReminderDates(settings: WorkoutReminderSettings, sessions: WorkoutSession[], now = new Date()) {
  const dates: Date[] = [];

  for (let dayOffset = 0; dayOffset < scheduleHorizonDays; dayOffset += 1) {
    const reminderDate = new Date(now);
    reminderDate.setDate(now.getDate() + dayOffset);

    const daySchedule = getReminderScheduleForDay(settings, toReminderDay(reminderDate));
    const [hourText, minuteText] = daySchedule.time.split(":");
    reminderDate.setHours(Number(hourText), Number(minuteText), 0, 0);

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
    data: {
      gymminType: reminderNotificationType
    },
    sound: true,
    title: settings.message
  };
}

function isWorkoutReminderScheduledNotification(notification: unknown) {
  if (!notification || typeof notification !== "object") {
    return false;
  }

  const record = notification as Record<string, unknown>;
  const content = record.content && typeof record.content === "object"
    ? record.content as Record<string, unknown>
    : {};
  const data = content.data && typeof content.data === "object"
    ? content.data as Record<string, unknown>
    : {};
  const trigger = record.trigger && typeof record.trigger === "object"
    ? record.trigger as Record<string, unknown>
    : {};

  return data.gymminType === reminderNotificationType || trigger.channelId === reminderChannelId;
}

async function cancelOrphanedWorkoutReminderNotifications(notifications: NotificationsModule, knownIds: Set<string>) {
  const getAllScheduledNotificationsAsync = (
    notifications as NotificationsModule & {
      getAllScheduledNotificationsAsync?: () => Promise<Array<{ identifier?: string }>>;
    }
  ).getAllScheduledNotificationsAsync;

  if (!getAllScheduledNotificationsAsync) {
    return;
  }

  const scheduledNotifications = await getAllScheduledNotificationsAsync().catch(() => []);
  await Promise.all(scheduledNotifications
    .filter((notification) => {
      const identifier = typeof notification.identifier === "string" ? notification.identifier : "";
      return identifier && !knownIds.has(identifier) && isWorkoutReminderScheduledNotification(notification);
    })
    .map((notification) => notifications.cancelScheduledNotificationAsync(notification.identifier!).catch(() => undefined)));
}

export async function cancelWorkoutReminders() {
  const notifications = await getNotificationsModule();
  const ids = await loadScheduledNotificationIds();
  const knownIds = new Set(ids);

  if (notifications) {
    await Promise.all(ids.map((id) => notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)));
    await cancelOrphanedWorkoutReminderNotifications(notifications, knownIds);
  }

  await saveScheduledNotificationIds([]);
}

export async function scheduleWorkoutReminders(
  settings: WorkoutReminderSettings,
  sessions: WorkoutSession[]
) {
  const notifications = await getNotificationsModule();
  if (!notifications || !settings.enabled || getEnabledReminderDayNumbers(settings).length === 0) {
    await cancelWorkoutReminders();
    return { scheduledCount: 0 };
  }

  if (!await hasWorkoutReminderPermissions(notifications)) {
    await cancelWorkoutReminders();
    return { permissionDenied: true, scheduledCount: 0 };
  }

  await ensureWorkoutReminderNotificationChannel(notifications);
  await cancelWorkoutReminders();

  const ids: string[] = [];
  for (const reminderDate of getUpcomingReminderDates(settings, sessions)) {
    const id = await notifications.scheduleNotificationAsync({
      content: getWorkoutReminderNotificationContent(settings),
      trigger: createWorkoutReminderDateTrigger(notifications, reminderDate)
    });
    ids.push(id);
  }

  await saveScheduledNotificationIds(ids);
  return { scheduledCount: ids.length };
}

export async function rescheduleWorkoutReminders(
  settings: WorkoutReminderSettings,
  sessions: WorkoutSession[]
) {
  if (!settings.enabled) {
    await cancelWorkoutReminders();
    return { scheduledCount: 0 };
  }

  return scheduleWorkoutReminders(settings, sessions);
}
