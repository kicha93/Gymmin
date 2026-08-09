import { useEffect, useRef, useState } from "react";

import {
  getDefaultWeeklyPlanSettings,
  loadWeeklyPlanState,
  saveWeeklyPlan,
  type WeeklyPlanSettings
} from "../../domain/weeklyPlan";

export function useLocalWeeklyPlan(
  hasLoadedAccountStorageMigration: boolean
) {
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlanSettings>(getDefaultWeeklyPlanSettings);
  const [hasLoadedWeeklyPlan, setHasLoadedWeeklyPlan] = useState(false);
  const [hadPersistedWeeklyPlanOnLoad, setHadPersistedWeeklyPlanOnLoad] = useState(false);
  const skipNextPersistenceRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    if (!hasLoadedAccountStorageMigration) {
      return;
    }

    setHasLoadedWeeklyPlan(false);
    setHadPersistedWeeklyPlanOnLoad(false);
    setWeeklyPlan(getDefaultWeeklyPlanSettings());
    skipNextPersistenceRef.current = true;

    void loadWeeklyPlanState().then((loaded) => {
      if (!isMounted) {
        return;
      }
      setWeeklyPlan(loaded.plan);
      setHadPersistedWeeklyPlanOnLoad(loaded.hadPersistedPlan);
      setHasLoadedWeeklyPlan(true);
    });

    return () => {
      isMounted = false;
    };
  }, [hasLoadedAccountStorageMigration]);

  useEffect(() => {
    if (!hasLoadedWeeklyPlan) {
      return;
    }
    if (skipNextPersistenceRef.current) {
      skipNextPersistenceRef.current = false;
      return;
    }

    saveWeeklyPlan(weeklyPlan).catch((error) => {
      console.error("Failed to save weekly plan", error);
    });
  }, [hasLoadedWeeklyPlan, weeklyPlan]);

  return {
    hasLoadedWeeklyPlan,
    hadPersistedWeeklyPlanOnLoad,
    setWeeklyPlan,
    weeklyPlan
  };
}
