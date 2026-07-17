import { useEffect, useState } from "react";

import type { PendingWorkoutCreatorJob } from "../../domain/workoutCreatorJob";
import {
  loadCreatorJobForOwner,
  saveCreatorJobForOwner
} from "../../storage/localDataRepositories";

export function useAccountScopedCreatorJob(
  storageOwnerId: string,
  hasLoadedAccountStorageMigration: boolean
) {
  const [pendingCreatorJob, setPendingCreatorJob] = useState<PendingWorkoutCreatorJob | null>(null);
  const [hasLoadedLocalCreatorJob, setHasLoadedLocalCreatorJob] = useState(false);
  const [loadedCreatorJobOwnerId, setLoadedCreatorJobOwnerId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadCreatorJob() {
      if (!hasLoadedAccountStorageMigration) {
        return;
      }

      const ownerId = storageOwnerId;
      setHasLoadedLocalCreatorJob(false);
      setLoadedCreatorJobOwnerId(null);
      setPendingCreatorJob(null);

      const storedJob = await loadCreatorJobForOwner(ownerId);
      if (!isMounted) {
        return;
      }

      setPendingCreatorJob(storedJob);
      setLoadedCreatorJobOwnerId(ownerId);
      setHasLoadedLocalCreatorJob(true);
    }

    void loadCreatorJob();
    return () => {
      isMounted = false;
    };
  }, [hasLoadedAccountStorageMigration, storageOwnerId]);

  useEffect(() => {
    if (!hasLoadedLocalCreatorJob || loadedCreatorJobOwnerId !== storageOwnerId) {
      return;
    }

    saveCreatorJobForOwner(storageOwnerId, pendingCreatorJob).catch((error) => {
      console.error("Failed to save pending creator job", error);
    });
  }, [
    hasLoadedLocalCreatorJob,
    loadedCreatorJobOwnerId,
    pendingCreatorJob,
    storageOwnerId
  ]);

  return {
    hasLoadedLocalCreatorJob,
    loadedCreatorJobOwnerId,
    pendingCreatorJob,
    setPendingCreatorJob
  };
}
