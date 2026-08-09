import { useEffect, useState } from "react";

import type { WorkoutCreatorProfile } from "../../domain/workoutCreator";
import {
  loadLocalCreatorProfiles,
  saveLocalCreatorProfiles
} from "../../storage/localDataRepositories";

export function useLocalCreatorProfiles(
  hasLoadedAccountStorageMigration: boolean
) {
  const [creatorProfiles, setCreatorProfiles] = useState<WorkoutCreatorProfile[]>([]);
  const [selectedCreatorProfileId, setSelectedCreatorProfileId] = useState<string | null>(null);
  const [hasLoadedLocalCreatorProfiles, setHasLoadedLocalCreatorProfiles] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadProfiles() {
      if (!hasLoadedAccountStorageMigration) {
        return;
      }

      setHasLoadedLocalCreatorProfiles(false);
      const storedData = await loadLocalCreatorProfiles();
      if (!isMounted) {
        return;
      }

      const selectedProfileId = storedData.selectedProfileId
        && storedData.profiles.some((profile) => profile.id === storedData.selectedProfileId)
        ? storedData.selectedProfileId
        : null;
      setCreatorProfiles(storedData.profiles);
      setSelectedCreatorProfileId(selectedProfileId);
      setHasLoadedLocalCreatorProfiles(true);
    }

    void loadProfiles();
    return () => {
      isMounted = false;
    };
  }, [hasLoadedAccountStorageMigration]);

  useEffect(() => {
    if (!hasLoadedLocalCreatorProfiles) {
      return;
    }

    saveLocalCreatorProfiles(
      creatorProfiles,
      selectedCreatorProfileId
    ).catch((error) => {
      console.error("Failed to save local creator profiles", error);
    });
  }, [
    creatorProfiles,
    hasLoadedLocalCreatorProfiles,
    selectedCreatorProfileId,
  ]);

  return {
    creatorProfiles,
    hasLoadedLocalCreatorProfiles,
    selectedCreatorProfileId,
    setCreatorProfiles,
    setSelectedCreatorProfileId
  };
}
