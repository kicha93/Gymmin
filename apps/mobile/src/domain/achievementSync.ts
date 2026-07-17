import {
  getDefaultAppUsageStats,
  loadAchievementsSyncState,
  mergeAppUsageStats,
  mergeUserAchievements,
  normalizeAppUsageStats,
  normalizeUserAchievements,
  saveAchievementsSyncState,
  type AchievementsSyncState,
  type AppUsageStats,
  type UserAchievement
} from "./achievements";

export type AchievementSyncRequest = {
  appUsageStats: AppUsageStats;
  lastPulledAt: string | null;
  unlocked: UserAchievement[];
};

export type AchievementSyncResult = {
  appUsageStats: AppUsageStats;
  syncState: AchievementsSyncState;
  unlocked: UserAchievement[];
};

export function normalizeAchievementSyncResponse(value: unknown) {
  const fallbackNow = new Date().toISOString();
  if (!isRecord(value)) {
    return {
      appUsageStats: getDefaultAppUsageStats(fallbackNow),
      serverTime: fallbackNow,
      unlocked: [] as UserAchievement[]
    };
  }

  const serverTime = typeof value.serverTime === "string" ? value.serverTime : fallbackNow;
  return {
    appUsageStats: normalizeAppUsageStats(value.appUsageStats, serverTime),
    serverTime,
    unlocked: normalizeUserAchievements(value.unlocked)
  };
}

export async function synchronizeAchievements(params: {
  appUsageStats: AppUsageStats;
  forceFullPull?: boolean;
  request: (body: AchievementSyncRequest) => Promise<unknown>;
  unlocked: UserAchievement[];
  userId: string;
}): Promise<AchievementSyncResult> {
  const localAchievements = normalizeUserAchievements(params.unlocked);
  const localUsageStats = normalizeAppUsageStats(params.appUsageStats);
  const metadata = await loadAchievementsSyncState(params.userId);
  const response = normalizeAchievementSyncResponse(await params.request({
    appUsageStats: localUsageStats,
    lastPulledAt: params.forceFullPull ? null : metadata.lastPulledAt ?? null,
    unlocked: localAchievements
  }));
  const syncState = {
    lastPulledAt: response.serverTime,
    lastSyncedAt: new Date().toISOString()
  };

  await saveAchievementsSyncState(params.userId, syncState);
  return {
    appUsageStats: mergeAppUsageStats(localUsageStats, response.appUsageStats),
    syncState,
    unlocked: mergeUserAchievements(localAchievements, response.unlocked)
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
