import { describe, expect, it } from "vitest";

import { exercises } from "../exerciseCatalog";
import {
  getActiveFavoriteExercises,
  getDeletedFavoriteExerciseIds,
  getValidFavoriteExerciseIds,
  mergeFavoriteExercises,
  normalizeFavoriteExercises
} from "../favoriteExercises";

const [firstExercise, secondExercise] = exercises;
const oldDate = "2026-01-01T10:00:00.000Z";
const newDate = "2026-01-02T10:00:00.000Z";

describe("favoriteExercises", () => {
  it("normalizes ids, ignores blanks and keeps stable fallbacks for old records", () => {
    const normalized = normalizeFavoriteExercises([
      { exerciseId: ` ${firstExercise.id} ` },
      { exerciseId: "" },
      { exerciseId: "   " },
      { exerciseId: firstExercise.id, createdAt: oldDate, updatedAt: oldDate }
    ]);

    expect(normalized).toHaveLength(1);
    expect(normalized[0]).toMatchObject({
      exerciseId: firstExercise.id,
      createdAt: oldDate,
      updatedAt: oldDate
    });
  });

  it("merges by newest update and lets newer tombstones win", () => {
    const merged = mergeFavoriteExercises(
      [{ exerciseId: firstExercise.id, createdAt: oldDate, updatedAt: oldDate, deletedAt: null }],
      [{ exerciseId: firstExercise.id, createdAt: oldDate, updatedAt: newDate, deletedAt: newDate }]
    );

    expect(getActiveFavoriteExercises(merged)).toHaveLength(0);
    expect(getDeletedFavoriteExerciseIds(merged)).toEqual([firstExercise.id]);
  });

  it("does not let older tombstones delete newer active records", () => {
    const merged = mergeFavoriteExercises(
      [{ exerciseId: firstExercise.id, createdAt: oldDate, updatedAt: newDate, deletedAt: null }],
      [{ exerciseId: firstExercise.id, createdAt: oldDate, updatedAt: oldDate, deletedAt: oldDate }]
    );

    expect(getActiveFavoriteExercises(merged).map((favorite) => favorite.exerciseId)).toEqual([firstExercise.id]);
  });

  it("filters unknown catalog ids from sync merges", () => {
    const merged = mergeFavoriteExercises(
      [
        { exerciseId: firstExercise.id, createdAt: oldDate, updatedAt: oldDate, deletedAt: null },
        { exerciseId: "missing-catalog-id", createdAt: oldDate, updatedAt: oldDate, deletedAt: null }
      ],
      [{ exerciseId: secondExercise.id, createdAt: oldDate, updatedAt: oldDate, deletedAt: null }]
    );

    expect(getValidFavoriteExerciseIds(merged)).toEqual(new Set([firstExercise.id, secondExercise.id]));
  });
});
