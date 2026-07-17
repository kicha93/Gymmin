import { useEffect, useState } from "react";

import {
  getDefaultWeeklyPlanSettings,
  loadWeeklyPlan,
  saveWeeklyPlan,
  type WeeklyPlanSettings
} from "../../domain/weeklyPlan";

export function useAccountScopedWeeklyPlan(storageOwnerId: string) {
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlanSettings>(getDefaultWeeklyPlanSettings);
  const [hasLoadedWeeklyPlan, setHasLoadedWeeklyPlan] = useState(false);
  const [loadedWeeklyPlanOwnerId, setLoadedWeeklyPlanOwnerId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const ownerId = storageOwnerId;
    setHasLoadedWeeklyPlan(false);
    setLoadedWeeklyPlanOwnerId(null);
    setWeeklyPlan(getDefaultWeeklyPlanSettings());

    void loadWeeklyPlan(ownerId).then((plan) => {
      if (!isMounted) {
        return;
      }
      setWeeklyPlan(plan);
      setLoadedWeeklyPlanOwnerId(ownerId);
      setHasLoadedWeeklyPlan(true);
    });

    return () => {
      isMounted = false;
    };
  }, [storageOwnerId]);

  useEffect(() => {
    if (!hasLoadedWeeklyPlan || loadedWeeklyPlanOwnerId !== storageOwnerId) {
      return;
    }

    saveWeeklyPlan(weeklyPlan, storageOwnerId).catch((error) => {
      console.error("Failed to save weekly plan", error);
    });
  }, [hasLoadedWeeklyPlan, loadedWeeklyPlanOwnerId, storageOwnerId, weeklyPlan]);

  return {
    hasLoadedWeeklyPlan,
    loadedWeeklyPlanOwnerId,
    setWeeklyPlan,
    weeklyPlan
  };
}
