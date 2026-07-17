import { useEffect, useRef, useState } from "react";

import {
  getDefaultAppUsageStats,
  loadAppUsageStats,
  loadAchievementsSyncState,
  loadUserAchievements,
  saveAppUsageStats,
  saveAchievementsSyncState,
  saveUserAchievements,
  type AchievementsSyncState,
  type AppUsageStats,
  type UserAchievement
} from "../../domain/achievements";
import type { AchievementSyncResult } from "../../domain/achievementSync";

const achievementSyncDebounceMs = 1400;

export function useAccountScopedAchievements(params: {
  isRemoteSyncReady: boolean;
  ownerId: string;
  syncAchievements: ((
    unlocked: UserAchievement[],
    appUsageStats: AppUsageStats
  ) => Promise<AchievementSyncResult>) | null;
}) {
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [appUsageStats, setAppUsageStats] = useState<AppUsageStats>(() => getDefaultAppUsageStats());
  const [achievementsSyncState, setAchievementsSyncState] = useState<AchievementsSyncState>({});
  const [hasLoadedAchievements, setHasLoadedAchievements] = useState(false);
  const [loadedAchievementsOwnerId, setLoadedAchievementsOwnerId] = useState<string | null>(null);
  const isApplyingRemoteAchievementsRef = useRef(false);
  const hasObservedLocalBaselineRef = useRef(false);
  const requestIdRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncAchievementsRef = useRef(params.syncAchievements);
  syncAchievementsRef.current = params.syncAchievements;

  useEffect(() => {
    let isMounted = true;
    setHasLoadedAchievements(false);
    setLoadedAchievementsOwnerId(null);
    isApplyingRemoteAchievementsRef.current = false;
    hasObservedLocalBaselineRef.current = false;
    requestIdRef.current += 1;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    void Promise.all([
      loadUserAchievements(params.ownerId),
      loadAppUsageStats(params.ownerId),
      loadAchievementsSyncState(params.ownerId)
    ]).then(([loadedAchievements, loadedUsageStats, loadedSyncState]) => {
      if (!isMounted) {
        return;
      }
      setUserAchievements(loadedAchievements);
      setAppUsageStats(loadedUsageStats);
      setAchievementsSyncState(loadedSyncState);
      setLoadedAchievementsOwnerId(params.ownerId);
      setHasLoadedAchievements(true);
    }).catch((error) => {
      console.error("Failed to load achievements", error);
      if (!isMounted) {
        return;
      }
      setUserAchievements([]);
      setAppUsageStats(getDefaultAppUsageStats());
      setAchievementsSyncState({});
      setLoadedAchievementsOwnerId(params.ownerId);
      setHasLoadedAchievements(true);
    });

    return () => {
      isMounted = false;
    };
  }, [params.ownerId]);

  useEffect(() => {
    if (!hasLoadedAchievements || loadedAchievementsOwnerId !== params.ownerId) {
      return;
    }

    void Promise.all([
      saveUserAchievements(params.ownerId, userAchievements),
      saveAppUsageStats(params.ownerId, appUsageStats),
      saveAchievementsSyncState(params.ownerId, achievementsSyncState)
    ]).catch((error) => {
      console.error("Failed to save achievement state", error);
    });

    const clearPendingSync = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    if (isApplyingRemoteAchievementsRef.current || !params.isRemoteSyncReady) {
      hasObservedLocalBaselineRef.current = true;
      clearPendingSync();
      return;
    }

    if (!hasObservedLocalBaselineRef.current) {
      hasObservedLocalBaselineRef.current = true;
      return;
    }

    const syncAchievements = syncAchievementsRef.current;
    if (!syncAchievements) {
      clearPendingSync();
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    clearPendingSync();
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      void syncAchievements(userAchievements, appUsageStats).then((merged) => {
        if (requestIdRef.current !== requestId) {
          return;
        }
        applyRemoteState(merged);
      }).catch((error) => {
        if (requestIdRef.current === requestId) {
          console.error("Failed to sync achievements", error);
        }
      });
    }, achievementSyncDebounceMs);

    return clearPendingSync;
  }, [
    achievementsSyncState,
    appUsageStats,
    hasLoadedAchievements,
    loadedAchievementsOwnerId,
    params.isRemoteSyncReady,
    params.ownerId,
    userAchievements
  ]);

  function applyRemoteState(state: AchievementSyncResult) {
    isApplyingRemoteAchievementsRef.current = true;
    setUserAchievements(state.unlocked);
    setAppUsageStats(state.appUsageStats);
    setAchievementsSyncState(state.syncState);
    setTimeout(() => {
      isApplyingRemoteAchievementsRef.current = false;
    }, 0);
  }

  return {
    achievementsSyncState,
    appUsageStats,
    applyRemoteState,
    hasLoadedAchievements,
    isApplyingRemoteAchievementsRef,
    loadedAchievementsOwnerId,
    setAchievementsSyncState,
    setAppUsageStats,
    setUserAchievements,
    userAchievements
  };
}
