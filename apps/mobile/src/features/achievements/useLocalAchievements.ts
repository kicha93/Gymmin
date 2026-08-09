import { useEffect, useState } from "react";

import {
  getDefaultAppUsageStats,
  loadAppUsageStats,
  loadUserAchievements,
  saveAppUsageStats,
  saveUserAchievements,
  type AppUsageStats,
  type UserAchievement
} from "../../domain/achievements";

export function useLocalAchievements() {
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [appUsageStats, setAppUsageStats] = useState<AppUsageStats>(() => getDefaultAppUsageStats());
  const [hasLoadedAchievements, setHasLoadedAchievements] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setHasLoadedAchievements(false);
    void Promise.all([loadUserAchievements(), loadAppUsageStats()])
      .then(([achievements, usage]) => {
        if (!isMounted) return;
        setUserAchievements(achievements);
        setAppUsageStats(usage);
        setHasLoadedAchievements(true);
      })
      .catch((error) => {
        console.error("Failed to load achievements", error);
        if (!isMounted) return;
        setUserAchievements([]);
        setAppUsageStats(getDefaultAppUsageStats());
        setHasLoadedAchievements(true);
      });
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (!hasLoadedAchievements) return;
    void Promise.all([
      saveUserAchievements(userAchievements),
      saveAppUsageStats(appUsageStats)
    ]).catch((error) => console.error("Failed to save achievement state", error));
  }, [appUsageStats, hasLoadedAchievements, userAchievements]);

  return {
    appUsageStats,
    hasLoadedAchievements,
    setAppUsageStats,
    setUserAchievements,
    userAchievements
  };
}
