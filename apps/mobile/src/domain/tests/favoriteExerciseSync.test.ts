import AsyncStorage from "@react-native-async-storage/async-storage";
import { beforeEach, describe, expect, it } from "vitest";

import {
  buildFavoriteExerciseSyncRequest,
  normalizeFavoriteExerciseSyncResponse,
  synchronizeFavoriteExercises
} from "../favoriteExerciseSync";
import { exercises } from "../exerciseCatalog";
import type { FavoriteExercise } from "../favoriteExercises";

const [firstExercise, secondExercise] = exercises;
const favorite: FavoriteExercise = {
  createdAt: "2026-01-01T10:00:00.000Z",
  deletedAt: null,
  exerciseId: firstExercise.id,
  updatedAt: "2026-01-01T10:00:00.000Z"
};

describe("favoriteExerciseSync", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("builds canonical favorites and tombstone ids", () => {
    const request = buildFavoriteExerciseSyncRequest([
      favorite,
      {
        ...favorite,
        deletedAt: "2026-01-02T10:00:00.000Z",
        exerciseId: secondExercise.id,
        updatedAt: "2026-01-02T10:00:00.000Z"
      }
    ], null);

    expect(request.deletedExerciseIds).toEqual([secondExercise.id]);
    expect(request.favorites).toHaveLength(2);
  });

  it("normalizes malformed server responses", () => {
    const response = normalizeFavoriteExerciseSyncResponse({
      favorites: [null, {}, favorite],
      serverTime: "2026-01-03T10:00:00.000Z"
    });

    expect(response.favorites).toEqual([favorite]);
    expect(response.serverTime).toBe("2026-01-03T10:00:00.000Z");
  });

  it("merges a newer remote tombstone", async () => {
    const merged = await synchronizeFavoriteExercises({
      favorites: [favorite],
      forceFullPull: true,
      request: async () => ({
        favorites: [{
          ...favorite,
          deletedAt: "2026-01-02T10:00:00.000Z",
          updatedAt: "2026-01-02T10:00:00.000Z"
        }],
        serverTime: "2026-01-03T10:00:00.000Z"
      }),
      userId: "user-a"
    });

    expect(merged[0].deletedAt).toBe("2026-01-02T10:00:00.000Z");
  });
});
