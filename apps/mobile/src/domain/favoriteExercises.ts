import AsyncStorage from "@react-native-async-storage/async-storage";

import { getAccountStorageKey } from "./accountStorage";
import { exercises } from "./exerciseCatalog";
import type { Exercise } from "./exercises";

export const FAVORITE_EXERCISES_LEGACY_STORAGE_KEY = "gymmin.favoriteExercises";
export const FAVORITE_EXERCISES_LEGACY_SYNC_STORAGE_KEY = "gymmin.favoriteExercisesSync";
export const FAVORITE_EXERCISES_STORAGE_BASE_KEY = "favoriteExercises";
export const FAVORITE_EXERCISES_SYNC_STORAGE_BASE_KEY = "favoriteExercisesSync";

export type FavoriteExercise = {
  exerciseId: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
};

export type FavoriteExercisesSyncMetadata = {
  lastPulledAt?: string | null;
  lastPushedAt?: string | null;
  userId?: string | null;
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

    const exerciseId = item.exerciseId.trim();
    if (!exerciseId) {
      return favorites;
    }

    const createdAt = typeof item.createdAt === "string" && item.createdAt.trim() ? item.createdAt : unknownFavoriteTimestamp;
    const updatedAt = typeof item.updatedAt === "string" && item.updatedAt.trim() ? item.updatedAt : createdAt;
    const deletedAt = typeof item.deletedAt === "string" && item.deletedAt.trim() ? item.deletedAt : null;
    const normalized = {
      // Favorite exercises intentionally store catalog ids only to keep future Garmin mapping possible.
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

export async function loadFavoriteExercises(userId?: string | null): Promise<FavoriteExercise[]> {
  try {
    const rawData = await AsyncStorage.getItem(getAccountStorageKey(FAVORITE_EXERCISES_STORAGE_BASE_KEY, userId));
    if (!rawData) {
      return [];
    }

    return normalizeFavoriteExercises(JSON.parse(rawData));
  } catch (error) {
    console.error("Failed to load favorite exercises", error);
    return [];
  }
}

export async function saveFavoriteExercises(favorites: FavoriteExercise[], userId?: string | null) {
  const payload: FavoriteExercisesStorage = {
    favorites: normalizeFavoriteExercises(favorites),
    updatedAt: new Date().toISOString(),
    version: 1
  };

  await AsyncStorage.setItem(getAccountStorageKey(FAVORITE_EXERCISES_STORAGE_BASE_KEY, userId), JSON.stringify(payload));
}

export async function loadFavoriteExercisesSyncMetadata(userId?: string | null): Promise<FavoriteExercisesSyncMetadata> {
  try {
    const rawData = await AsyncStorage.getItem(getAccountStorageKey(FAVORITE_EXERCISES_SYNC_STORAGE_BASE_KEY, userId));
    if (!rawData) {
      return {};
    }

    const parsed = JSON.parse(rawData) as Partial<FavoriteExercisesSyncMetadata>;
    return {
      lastPulledAt: typeof parsed.lastPulledAt === "string" ? parsed.lastPulledAt : null,
      lastPushedAt: typeof parsed.lastPushedAt === "string" ? parsed.lastPushedAt : null,
      userId: typeof parsed.userId === "string" ? parsed.userId : null
    };
  } catch (error) {
    console.error("Failed to load favorite exercises sync metadata", error);
    return {};
  }
}

export async function saveFavoriteExercisesSyncMetadata(metadata: FavoriteExercisesSyncMetadata, userId?: string | null) {
  await AsyncStorage.setItem(getAccountStorageKey(FAVORITE_EXERCISES_SYNC_STORAGE_BASE_KEY, userId), JSON.stringify(metadata));
}

export function getActiveFavoriteExercises(favorites: FavoriteExercise[]) {
  return normalizeFavoriteExercises(favorites).filter((favorite) => !favorite.deletedAt);
}

export function isExerciseFavorite(favorites: FavoriteExercise[], exerciseId: string) {
  return getActiveFavoriteExercises(favorites).some((favorite) => favorite.exerciseId === exerciseId);
}

export function addFavoriteExercise(favorites: FavoriteExercise[], exerciseId: string): FavoriteExercise[] {
  if (!exerciseId || isExerciseFavorite(favorites, exerciseId)) {
    return favorites;
  }

  const now = new Date().toISOString();
  return normalizeFavoriteExercises([
    ...favorites,
    {
      exerciseId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    }
  ]);
}

export function removeFavoriteExercise(favorites: FavoriteExercise[], exerciseId: string): FavoriteExercise[] {
  const now = new Date().toISOString();
  const normalized = normalizeFavoriteExercises(favorites);
  const existing = normalized.find((favorite) => favorite.exerciseId === exerciseId);

  if (!existing) {
    return normalized;
  }

  return normalizeFavoriteExercises([
    ...normalized.filter((favorite) => favorite.exerciseId !== exerciseId),
    {
      ...existing,
      updatedAt: now,
      deletedAt: now
    }
  ]);
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

export function mergeFavoriteExercises(localFavorites: FavoriteExercise[], remoteFavorites: FavoriteExercise[]) {
  return normalizeFavoriteExercises([...localFavorites, ...remoteFavorites])
    .filter((favorite) => catalogExerciseIds.has(favorite.exerciseId));
}

export function getDeletedFavoriteExerciseIds(favorites: FavoriteExercise[]) {
  return normalizeFavoriteExercises(favorites)
    .filter((favorite) => Boolean(favorite.deletedAt))
    .map((favorite) => favorite.exerciseId);
}

// TODO: sync favorite exercises conflict resolution across multiple signed-in accounts on one device.
