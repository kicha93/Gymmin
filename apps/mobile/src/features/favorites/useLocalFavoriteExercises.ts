import { useEffect, useState } from "react";

import {
  loadFavoriteExercises,
  saveFavoriteExercises,
  type FavoriteExercise
} from "../../domain/favoriteExercises";

export function useLocalFavoriteExercises(
  hasLoadedLegacyMigration: boolean
) {
  const [favoriteExercises, setFavoriteExercises] = useState<FavoriteExercise[]>([]);
  const [hasLoadedFavoriteExercises, setHasLoadedFavoriteExercises] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!hasLoadedLegacyMigration) return () => { isMounted = false; };

    setHasLoadedFavoriteExercises(false);
    void loadFavoriteExercises().then((favorites) => {
      if (!isMounted) return;
      setFavoriteExercises(favorites);
      setHasLoadedFavoriteExercises(true);
    });
    return () => { isMounted = false; };
  }, [hasLoadedLegacyMigration]);

  useEffect(() => {
    if (!hasLoadedFavoriteExercises) return;
    void saveFavoriteExercises(favoriteExercises).catch((error) => {
      console.error("Failed to save favorite exercises", error);
    });
  }, [favoriteExercises, hasLoadedFavoriteExercises]);

  return {
    favoriteExercises,
    hasLoadedFavoriteExercises,
    setFavoriteExercises
  };
}
