import { vi } from "vitest";

const asyncStorage = new Map<string, string>();

const asyncStorageMock = {
  clear: vi.fn(async () => {
    asyncStorage.clear();
  }),
  getAllKeys: vi.fn(async () => Array.from(asyncStorage.keys())),
  getItem: vi.fn(async (key: string) => asyncStorage.get(key) ?? null),
  removeItem: vi.fn(async (key: string) => {
    asyncStorage.delete(key);
  }),
  setItem: vi.fn(async (key: string, value: string) => {
    asyncStorage.set(key, value);
  })
};

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: asyncStorageMock
}));

vi.mock("react-native", () => ({
  NativeModules: {},
  Platform: { OS: "android" }
}));

vi.mock("expo-notifications", () => ({
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DATE: "date" },
  cancelScheduledNotificationAsync: vi.fn(async () => undefined),
  getAllScheduledNotificationsAsync: vi.fn(async () => []),
  getPermissionsAsync: vi.fn(async () => ({ granted: true, status: "granted" })),
  requestPermissionsAsync: vi.fn(async () => ({ granted: true, status: "granted" })),
  scheduleNotificationAsync: vi.fn(async () => "notification-id"),
  setNotificationChannelAsync: vi.fn(async () => undefined)
}));
