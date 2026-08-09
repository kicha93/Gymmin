import { describe, expect, it } from "vitest";

import { exercises } from "../exerciseCatalog";
import {
  getActiveFavoriteExercises,
  getValidFavoriteExerciseIds,
  normalizeFavoriteExercises,
  removeFavoriteExercise
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

  it("removes favorites physically and still ignores legacy tombstones", () => {
    const favorites = [
      { exerciseId: firstExercise.id, createdAt: oldDate, updatedAt: oldDate, deletedAt: null },
      { exerciseId: secondExercise.id, createdAt: oldDate, updatedAt: newDate, deletedAt: newDate }
    ];
    expect(removeFavoriteExercise(favorites, firstExercise.id)).toEqual([]);
    expect(getActiveFavoriteExercises(favorites).map((favorite) => favorite.exerciseId)).toEqual([firstExercise.id]);
    expect(getValidFavoriteExerciseIds(favorites)).toEqual(new Set([firstExercise.id]));
  });

  it("migrates favorite entries that use a merged exercise id", () => {
    const normalized = normalizeFavoriteExercises([
      { exerciseId: "squat-back-squats-1249", createdAt: oldDate, updatedAt: oldDate }
    ]);

    expect(normalized[0]?.exerciseId).toBe("squat-barbell-back-squat-1251");
  });
});
