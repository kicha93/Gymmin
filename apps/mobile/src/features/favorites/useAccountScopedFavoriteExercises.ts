import { useEffect, useRef, useState } from "react";

import {
  loadFavoriteExercises,
  saveFavoriteExercises,
  type FavoriteExercise
} from "../../domain/favoriteExercises";

export type FavoriteExercisesSyncStatus = "local" | "synced" | "failed";

export function useAccountScopedFavoriteExercises(params: {
  hasLoadedAccountStorageMigration: boolean;
  isRemoteSyncReady: boolean;
  ownerId: string;
  syncFavorites: ((favorites: FavoriteExercise[]) => Promise<FavoriteExercise[]>) | null;
}) {
  const [favoriteExercises, setFavoriteExercises] = useState<FavoriteExercise[]>([]);
  const [hasLoadedFavoriteExercises, setHasLoadedFavoriteExercises] = useState(false);
  const [loadedFavoriteExercisesOwnerId, setLoadedFavoriteExercisesOwnerId] = useState<string | null>(null);
  const [favoriteExercisesSyncStatus, setFavoriteExercisesSyncStatus] =
    useState<FavoriteExercisesSyncStatus>("local");
  const isApplyingRemoteFavoritesRef = useRef(false);
  const hasObservedLocalBaselineRef = useRef(false);
  const requestIdRef = useRef(0);
  const syncFavoritesRef = useRef(params.syncFavorites);
  syncFavoritesRef.current = params.syncFavorites;

  useEffect(() => {
    let isMounted = true;
    if (!params.hasLoadedAccountStorageMigration) {
      return () => {
        isMounted = false;
      };
    }

    setHasLoadedFavoriteExercises(false);
    setLoadedFavoriteExercisesOwnerId(null);
    setFavoriteExercisesSyncStatus("local");
    isApplyingRemoteFavoritesRef.current = false;
    hasObservedLocalBaselineRef.current = false;
    requestIdRef.current += 1;

    void loadFavoriteExercises(params.ownerId).then((favorites) => {
      if (!isMounted) {
        return;
      }
      setFavoriteExercises(favorites);
      setLoadedFavoriteExercisesOwnerId(params.ownerId);
      setHasLoadedFavoriteExercises(true);
    });

    return () => {
      isMounted = false;
    };
  }, [params.hasLoadedAccountStorageMigration, params.ownerId]);

  useEffect(() => {
    if (!hasLoadedFavoriteExercises || loadedFavoriteExercisesOwnerId !== params.ownerId) {
      return;
    }

    void saveFavoriteExercises(favoriteExercises, params.ownerId).catch((error) => {
      console.error("Failed to save favorite exercises", error);
    });

    if (isApplyingRemoteFavoritesRef.current) {
      hasObservedLocalBaselineRef.current = true;
      return;
    }

    if (!params.isRemoteSyncReady) {
      hasObservedLocalBaselineRef.current = true;
      setFavoriteExercisesSyncStatus("local");
      return;
    }

    if (!hasObservedLocalBaselineRef.current) {
      hasObservedLocalBaselineRef.current = true;
      return;
    }

    const syncFavorites = syncFavoritesRef.current;
    if (!syncFavorites) {
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    void syncFavorites(favoriteExercises).then((mergedFavorites) => {
      if (requestIdRef.current !== requestId) {
        return;
      }

      isApplyingRemoteFavoritesRef.current = true;
      setFavoriteExercises(mergedFavorites);
      setFavoriteExercisesSyncStatus("synced");
      setTimeout(() => {
        isApplyingRemoteFavoritesRef.current = false;
      }, 0);
    }).catch((error) => {
      if (requestIdRef.current !== requestId) {
        return;
      }
      console.error("Failed to sync favorite exercises", error);
      setFavoriteExercisesSyncStatus("failed");
    });
  }, [
    favoriteExercises,
    hasLoadedFavoriteExercises,
    loadedFavoriteExercisesOwnerId,
    params.isRemoteSyncReady,
    params.ownerId
  ]);

  return {
    favoriteExercises,
    favoriteExercisesSyncStatus,
    hasLoadedFavoriteExercises,
    isApplyingRemoteFavoritesRef,
    loadedFavoriteExercisesOwnerId,
    setFavoriteExercises,
    setFavoriteExercisesSyncStatus
  };
}
