import { useEffect, useRef, useState } from "react";

import {
  getDefaultWeeklyPlanSettings,
  loadWeeklyPlanState,
  saveWeeklyPlan,
  type WeeklyPlanSettings
} from "../../domain/weeklyPlan";

export function useAccountScopedWeeklyPlan(
  storageOwnerId: string,
  hasLoadedAccountStorageMigration: boolean
) {
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlanSettings>(getDefaultWeeklyPlanSettings);
  const [hasLoadedWeeklyPlan, setHasLoadedWeeklyPlan] = useState(false);
  const [hadPersistedWeeklyPlanOnLoad, setHadPersistedWeeklyPlanOnLoad] = useState(false);
  const [loadedWeeklyPlanOwnerId, setLoadedWeeklyPlanOwnerId] = useState<string | null>(null);
  const skipNextPersistenceRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    if (!hasLoadedAccountStorageMigration) {
      return;
    }

    const ownerId = storageOwnerId;
    setHasLoadedWeeklyPlan(false);
    setHadPersistedWeeklyPlanOnLoad(false);
    setLoadedWeeklyPlanOwnerId(null);
    setWeeklyPlan(getDefaultWeeklyPlanSettings());
    skipNextPersistenceRef.current = true;

    void loadWeeklyPlanState(ownerId).then((loaded) => {
      if (!isMounted) {
        return;
      }
      setWeeklyPlan(loaded.plan);
      setHadPersistedWeeklyPlanOnLoad(loaded.hadPersistedPlan);
      setLoadedWeeklyPlanOwnerId(ownerId);
      setHasLoadedWeeklyPlan(true);
    });

    return () => {
      isMounted = false;
    };
  }, [hasLoadedAccountStorageMigration, storageOwnerId]);

  useEffect(() => {
    if (!hasLoadedWeeklyPlan || loadedWeeklyPlanOwnerId !== storageOwnerId) {
      return;
    }
    if (skipNextPersistenceRef.current) {
      skipNextPersistenceRef.current = false;
      return;
    }

    saveWeeklyPlan(weeklyPlan, storageOwnerId).catch((error) => {
      console.error("Failed to save weekly plan", error);
    });
  }, [hasLoadedWeeklyPlan, loadedWeeklyPlanOwnerId, storageOwnerId, weeklyPlan]);

  return {
    hasLoadedWeeklyPlan,
    hadPersistedWeeklyPlanOnLoad,
    loadedWeeklyPlanOwnerId,
    setWeeklyPlan,
    weeklyPlan
  };
}
