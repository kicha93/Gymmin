import { useEffect, useState } from "react";

import type { WorkoutCreatorProfile } from "../../domain/workoutCreator";
import {
  loadCreatorProfilesForOwner,
  saveCreatorProfilesForOwner
} from "../../storage/localDataRepositories";

export function useAccountScopedCreatorProfiles(
  storageOwnerId: string,
  hasLoadedAccountStorageMigration: boolean
) {
  const [creatorProfiles, setCreatorProfiles] = useState<WorkoutCreatorProfile[]>([]);
  const [selectedCreatorProfileId, setSelectedCreatorProfileId] = useState<string | null>(null);
  const [hasLoadedLocalCreatorProfiles, setHasLoadedLocalCreatorProfiles] = useState(false);
  const [loadedCreatorProfilesOwnerId, setLoadedCreatorProfilesOwnerId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProfiles() {
      if (!hasLoadedAccountStorageMigration) {
        return;
      }

      const ownerId = storageOwnerId;
      setHasLoadedLocalCreatorProfiles(false);
      setLoadedCreatorProfilesOwnerId(null);
      const storedData = await loadCreatorProfilesForOwner(ownerId);
      if (!isMounted) {
        return;
      }

      const selectedProfileId = storedData.selectedProfileId
        && storedData.profiles.some((profile) => profile.id === storedData.selectedProfileId)
        ? storedData.selectedProfileId
        : null;
      setCreatorProfiles(storedData.profiles);
      setSelectedCreatorProfileId(selectedProfileId);
      setLoadedCreatorProfilesOwnerId(ownerId);
      setHasLoadedLocalCreatorProfiles(true);
    }

    void loadProfiles();
    return () => {
      isMounted = false;
    };
  }, [hasLoadedAccountStorageMigration, storageOwnerId]);

  useEffect(() => {
    if (!hasLoadedLocalCreatorProfiles || loadedCreatorProfilesOwnerId !== storageOwnerId) {
      return;
    }

    saveCreatorProfilesForOwner(
      storageOwnerId,
      creatorProfiles,
      selectedCreatorProfileId
    ).catch((error) => {
      console.error("Failed to save local creator profiles", error);
    });
  }, [
    creatorProfiles,
    hasLoadedLocalCreatorProfiles,
    loadedCreatorProfilesOwnerId,
    selectedCreatorProfileId,
    storageOwnerId
  ]);

  return {
    creatorProfiles,
    hasLoadedLocalCreatorProfiles,
    loadedCreatorProfilesOwnerId,
    selectedCreatorProfileId,
    setCreatorProfiles,
    setSelectedCreatorProfileId
  };
}
