import AsyncStorage from "@react-native-async-storage/async-storage";

import { getLocalOnlyStorageKey } from "./localOnlyStorageMigration";
import { exercises } from "./exerciseCatalog";
import { resolveExerciseId, type Exercise } from "./exercises";

export const FAVORITE_EXERCISES_LEGACY_STORAGE_KEY = "gymmin.favoriteExercises";
export const FAVORITE_EXERCISES_STORAGE_BASE_KEY = "favoriteExercises";

export type FavoriteExercise = {
  exerciseId: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
};


type FavoriteExercisesStorage = {
  favorites: FavoriteExercise[];
  updatedAt: string;
  version: 1;
};

const catalogExerciseIds = new Set(exercises.map((exercise) => exercise.id));
const unknownFavoriteTimestamp = "1970-01-01T00:00:00.000Z";

function isFavoriteExercise(value: unknown): value is FavoriteExercise {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      typeof (value as FavoriteExercise).exerciseId === "string"
  );
}

function getTimestamp(value: string | null | undefined) {
  const timestamp = Date.parse(value ?? "");
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function shouldReplaceFavorite(existing: FavoriteExercise, incoming: FavoriteExercise) {
  const existingUpdatedAt = getTimestamp(existing.updatedAt ?? existing.createdAt);
  const incomingUpdatedAt = getTimestamp(incoming.updatedAt ?? incoming.createdAt);

  if (incomingUpdatedAt > existingUpdatedAt) {
    return true;
  }

  if (incomingUpdatedAt < existingUpdatedAt) {
    return false;
  }

  return Boolean(incoming.deletedAt) && !existing.deletedAt;
}

export function normalizeFavoriteExercises(value: unknown): FavoriteExercise[] {
  const source = Array.isArray(value)
    ? value
    : value && typeof value === "object" && Array.isArray((value as Partial<FavoriteExercisesStorage>).favorites)
      ? (value as Partial<FavoriteExercisesStorage>).favorites ?? []
      : [];
  const seen = new Set<string>();

  return source.reduce<FavoriteExercise[]>((favorites, item) => {
    if (!isFavoriteExercise(item)) {
      return favorites;
    }

    const exerciseId = resolveExerciseId(item.exerciseId.trim());
    if (!exerciseId) {
      return favorites;
    }

    const createdAt = typeof item.createdAt === "string" && item.createdAt.trim() ? item.createdAt : unknownFavoriteTimestamp;
    const updatedAt = typeof item.updatedAt === "string" && item.updatedAt.trim() ? item.updatedAt : createdAt;
    const deletedAt = typeof item.deletedAt === "string" && item.deletedAt.trim() ? item.deletedAt : null;
    const normalized = {
      // Favorites store only stable catalog ids; exercise metadata comes from the local catalog.
      exerciseId,
      createdAt,
      updatedAt,
      deletedAt
    };

    const existingIndex = favorites.findIndex((favorite) => favorite.exerciseId === exerciseId);
    if (existingIndex >= 0) {
      if (shouldReplaceFavorite(favorites[existingIndex], normalized)) {
        favorites[existingIndex] = normalized;
      }
      return favorites;
    }

    if (!seen.has(exerciseId)) {
      seen.add(exerciseId);
      favorites.push(normalized);
    }

    return favorites;
  }, []);
}

export async function loadFavoriteExercises(): Promise<FavoriteExercise[]> {
  try {
    const rawData = await AsyncStorage.getItem(getLocalOnlyStorageKey(FAVORITE_EXERCISES_STORAGE_BASE_KEY));
    if (!rawData) {
      return [];
    }

    return normalizeFavoriteExercises(JSON.parse(rawData));
  } catch (error) {
    console.error("Failed to load favorite exercises", error);
    return [];
  }
}

export async function saveFavoriteExercises(favorites: FavoriteExercise[]) {
  const payload: FavoriteExercisesStorage = {
    favorites: normalizeFavoriteExercises(favorites),
    updatedAt: new Date().toISOString(),
    version: 1
  };

  await AsyncStorage.setItem(getLocalOnlyStorageKey(FAVORITE_EXERCISES_STORAGE_BASE_KEY), JSON.stringify(payload));
}

export function getActiveFavoriteExercises(favorites: FavoriteExercise[]) {
  return normalizeFavoriteExercises(favorites).filter((favorite) => !favorite.deletedAt);
}

export function isExerciseFavorite(favorites: FavoriteExercise[], exerciseId: string) {
  const canonicalId = resolveExerciseId(exerciseId);
  return getActiveFavoriteExercises(favorites).some((favorite) => favorite.exerciseId === canonicalId);
}

export function addFavoriteExercise(favorites: FavoriteExercise[], exerciseId: string): FavoriteExercise[] {
  const canonicalId = resolveExerciseId(exerciseId);
  if (!canonicalId || isExerciseFavorite(favorites, canonicalId)) {
    return favorites;
  }

  const now = new Date().toISOString();
  return normalizeFavoriteExercises([
    ...getActiveFavoriteExercises(favorites),
    {
      exerciseId: canonicalId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    }
  ]);
}

export function removeFavoriteExercise(favorites: FavoriteExercise[], exerciseId: string): FavoriteExercise[] {
  const canonicalId = resolveExerciseId(exerciseId);
  return getActiveFavoriteExercises(favorites)
    .filter((favorite) => favorite.exerciseId !== canonicalId);
}

export function toggleFavoriteExercise(favorites: FavoriteExercise[], exerciseId: string): FavoriteExercise[] {
  return isExerciseFavorite(favorites, exerciseId)
    ? removeFavoriteExercise(favorites, exerciseId)
    : addFavoriteExercise(favorites, exerciseId);
}

export function getFavoriteCatalogExercises(favorites: FavoriteExercise[]): Exercise[] {
  const favoriteIds = new Set(getActiveFavoriteExercises(favorites).map((favorite) => favorite.exerciseId));

  return exercises.filter((exercise) => favoriteIds.has(exercise.id));
}

export function getValidFavoriteExerciseIds(favorites: FavoriteExercise[]): Set<string> {
  return new Set(
    getActiveFavoriteExercises(favorites)
      .map((favorite) => favorite.exerciseId)
      .filter((exerciseId) => catalogExerciseIds.has(exerciseId))
  );
}
