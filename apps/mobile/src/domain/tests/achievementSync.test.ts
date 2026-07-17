import AsyncStorage from "@react-native-async-storage/async-storage";
import { beforeEach, describe, expect, it } from "vitest";

import {
  normalizeAchievementSyncResponse,
  synchronizeAchievements
} from "../achievementSync";
import { loadAchievementsSyncState, type UserAchievement } from "../achievements";

const achievement: UserAchievement = {
  achievementId: "first_workout",
  progressAtUnlock: 1,
  unlockedAt: "2026-01-01T10:00:00.000Z",
  updatedAt: "2026-01-01T10:00:00.000Z"
};

describe("achievementSync", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("normalizes malformed response fields", () => {
    const response = normalizeAchievementSyncResponse({
      appUsageStats: { totalForegroundSeconds: -5, updatedAt: "invalid" },
      serverTime: "2026-01-03T10:00:00.000Z",
      unlocked: [null, {}, achievement]
    });

    expect(response.appUsageStats.totalForegroundSeconds).toBe(0);
    expect(response.unlocked).toEqual([achievement]);
  });

  it("forces a full pull without a cursor", async () => {
    let receivedLastPulledAt: string | undefined | null;
    await synchronizeAchievements({
      appUsageStats: {
        totalForegroundSeconds: 30,
        updatedAt: "2026-01-01T10:00:00.000Z"
      },
      forceFullPull: true,
      request: async (body) => {
        receivedLastPulledAt = body.lastPulledAt;
        return {
          appUsageStats: body.appUsageStats,
          serverTime: "2026-01-03T10:00:00.000Z",
          unlocked: body.unlocked
        };
      },
      unlocked: [achievement],
      userId: "user-a"
    });

    expect(receivedLastPulledAt).toBeNull();
  });

  it("merges server data and persists the next cursor", async () => {
    const result = await synchronizeAchievements({
      appUsageStats: {
        totalForegroundSeconds: 30,
        updatedAt: "2026-01-01T10:00:00.000Z"
      },
      request: async () => ({
        appUsageStats: {
          totalForegroundSeconds: 90,
          updatedAt: "2026-01-02T10:00:00.000Z"
        },
        serverTime: "2026-01-03T10:00:00.000Z",
        unlocked: [{
          achievementId: "five_workouts",
          unlockedAt: "2026-01-02T10:00:00.000Z"
        }]
      }),
      unlocked: [achievement],
      userId: "user-a"
    });

    expect(result.unlocked).toHaveLength(2);
    expect(result.appUsageStats.totalForegroundSeconds).toBe(90);
    expect((await loadAchievementsSyncState("user-a")).lastPulledAt)
      .toBe("2026-01-03T10:00:00.000Z");
  });
});
