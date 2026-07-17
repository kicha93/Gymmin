import {
  getDeletedFavoriteExerciseIds,
  loadFavoriteExercisesSyncMetadata,
  mergeFavoriteExercises,
  normalizeFavoriteExercises,
  saveFavoriteExercisesSyncMetadata,
  type FavoriteExercise
} from "./favoriteExercises";

export type FavoriteExerciseSyncRequest = {
  deletedExerciseIds: string[];
  favorites: FavoriteExercise[];
  lastPulledAt: string | null;
};

export type FavoriteExerciseSyncResponse = {
  favorites: FavoriteExercise[];
  serverTime?: string;
};

export function buildFavoriteExerciseSyncRequest(
  favorites: FavoriteExercise[],
  lastPulledAt: string | null
): FavoriteExerciseSyncRequest {
  const normalizedFavorites = normalizeFavoriteExercises(favorites);
  return {
    deletedExerciseIds: getDeletedFavoriteExerciseIds(normalizedFavorites),
    favorites: normalizedFavorites,
    lastPulledAt
  };
}

export function normalizeFavoriteExerciseSyncResponse(value: unknown): FavoriteExerciseSyncResponse {
  if (!isRecord(value)) {
    return { favorites: [] };
  }

  return {
    favorites: normalizeFavoriteExercises(value.favorites),
    serverTime: typeof value.serverTime === "string" ? value.serverTime : undefined
  };
}

export async function synchronizeFavoriteExercises(params: {
  favorites: FavoriteExercise[];
  forceFullPull?: boolean;
  request: (body: FavoriteExerciseSyncRequest) => Promise<unknown>;
  userId: string;
}) {
  const localFavorites = normalizeFavoriteExercises(params.favorites);
  const metadata = await loadFavoriteExercisesSyncMetadata(params.userId);
  const lastPulledAt = params.forceFullPull || metadata.userId !== params.userId
    ? null
    : metadata.lastPulledAt ?? null;
  const response = normalizeFavoriteExerciseSyncResponse(
    await params.request(buildFavoriteExerciseSyncRequest(localFavorites, lastPulledAt))
  );
  const mergedFavorites = mergeFavoriteExercises(localFavorites, response.favorites);

  await saveFavoriteExercisesSyncMetadata({
    lastPulledAt: response.serverTime ?? new Date().toISOString(),
    lastPushedAt: new Date().toISOString(),
    userId: params.userId
  }, params.userId);

  return mergedFavorites;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
