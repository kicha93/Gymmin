import AsyncStorage from "@react-native-async-storage/async-storage";
import { beforeEach, describe, expect, it } from "vitest";

import {
  ACCOUNT_STORAGE_MIGRATION_KEY,
  ANONYMOUS_LOCAL_OWNER,
  detectAccountSwitch,
  getAccountStorageKey,
  getAccountStorageOwnerId,
  migrateLegacyAccountStorage
} from "../accountStorage";

describe("accountStorage", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("builds anonymous and per-user keys", () => {
    expect(getAccountStorageOwnerId(null)).toBe(ANONYMOUS_LOCAL_OWNER);
    expect(getAccountStorageOwnerId(undefined)).toBe(ANONYMOUS_LOCAL_OWNER);
    expect(getAccountStorageOwnerId(" user-a ")).toBe("user-a");

    expect(getAccountStorageKey("workouts", null)).toBe("gymmin.account.anonymous.workouts");
    expect(getAccountStorageKey("workouts", "user-a")).toBe("gymmin.account.user-a.workouts");
    expect(getAccountStorageKey("workoutsSync", "user-a")).not.toBe(getAccountStorageKey("workoutsSync", "user-b"));
    expect(getAccountStorageKey("workoutSessionsSync", null)).not.toBe(getAccountStorageKey("workoutSessionsSync", "user-a"));
  });

  it("detects real account switches only", () => {
    expect(detectAccountSwitch(null, "user-a")).toBe(false);
    expect(detectAccountSwitch("user-a", "user-a")).toBe(false);
    expect(detectAccountSwitch("user-a", "user-b")).toBe(true);
  });

  it("migrates legacy keys to anonymous storage without deleting legacy data", async () => {
    await AsyncStorage.setItem("gymmin.workouts", "{broken json is still preserved");

    await migrateLegacyAccountStorage([{ baseKey: "workouts", legacyKey: "gymmin.workouts" }]);
    await migrateLegacyAccountStorage([{ baseKey: "workouts", legacyKey: "gymmin.workouts" }]);

    expect(await AsyncStorage.getItem(getAccountStorageKey("workouts", null))).toBe("{broken json is still preserved");
    expect(await AsyncStorage.getItem("gymmin.workouts")).toBe("{broken json is still preserved");
    expect(await AsyncStorage.getItem(ACCOUNT_STORAGE_MIGRATION_KEY)).toContain("\"version\":1");
  });
});
