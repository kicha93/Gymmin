import { describe, expect, it } from "vitest";

import { buildWorkoutExportData } from "../workoutExport/workoutExportMapper";
import { createStep, type WorkoutDraft } from "../workouts";

function workoutFixture(): WorkoutDraft {
  const stageOne = createStep({ id: "stage-1", kind: "stage", label: "Siła", notes: "Etap główny", stageType: "exercise" });
  const setOne = createStep({ id: "set-1", kind: "set", label: "Seria główna", parentStageId: stageOne.id, setCount: "4" });
  const exerciseOne = createStep({
    exerciseId: "squat-back-squats-1249",
    exerciseName: "Back Squats",
    goalType: "repetitions",
    id: "exercise-1",
    kind: "exercise",
    loadKg: "82,5",
    notes: "Pełny zakres",
    parentSetId: setOne.id,
    parentStageId: stageOne.id,
    stageType: "exercise",
    targetValue: "8"
  });
  const rest = createStep({
    exerciseName: "",
    goalType: "time",
    id: "rest-1",
    kind: "exercise",
    parentSetId: setOne.id,
    parentStageId: stageOne.id,
    stageType: "rest",
    targetValue: "00:01:30"
  });
  const setTwo = createStep({ id: "set-2", kind: "set", parentStageId: stageOne.id, setCount: "3" });
  const missingExercise = createStep({
    exerciseId: "custom-missing-id",
    exerciseName: "Ćwiczenie własne",
    goalType: "time",
    id: "exercise-2",
    kind: "exercise",
    parentSetId: setTwo.id,
    parentStageId: stageOne.id,
    stageType: "exercise",
    targetValue: "00:02:05"
  });
  const stageTwo = createStep({ id: "stage-2", kind: "stage", label: "Schłodzenie", stageType: "cooldown" });
  const setThree = createStep({ id: "set-3", kind: "set", parentStageId: stageTwo.id, setCount: "1" });
  const exerciseThree = createStep({
    exerciseName: "Nieznany ruch",
    goalType: "heartRate",
    id: "exercise-3",
    kind: "exercise",
    parentSetId: setThree.id,
    parentStageId: stageTwo.id,
    stageType: "cooldown",
    targetComparator: "below",
    targetValue: "120"
  });

  return {
    name: "FBW siła",
    notes: "Uwagi treningu",
    sport: "strength",
    steps: [stageOne, setOne, exerciseOne, rest, setTwo, missingExercise, stageTwo, setThree, exerciseThree]
  };
}

describe("buildWorkoutExportData", () => {
  it("preserves stage, series and element order and maps the actual target fields", () => {
    const data = buildWorkoutExportData(workoutFixture(), "pl");

    expect(data.summary).toEqual({
      exerciseCount: 4,
      seriesCount: 3,
      stageCount: 2,
      workoutName: "FBW siła",
      workoutNotes: "Uwagi treningu"
    });
    expect(data.rows.map((row) => [row.stageOrder, row.seriesOrder, row.elementOrder])).toEqual([
      [1, 1, 1],
      [1, 1, 2],
      [1, 2, 1],
      [2, 1, 1]
    ]);
    expect(data.rows[0]).toMatchObject({
      exerciseId: "squat-barbell-back-squat-1251",
      repetitions: 8,
      seriesCount: 4,
      weightKg: 82.5
    });
    expect(data.rows[1]).toMatchObject({ durationSeconds: null, restSeconds: 90 });
    expect(data.rows[2]).toMatchObject({
      durationSeconds: 125,
      exerciseId: "custom-missing-id",
      exerciseName: "Ćwiczenie własne"
    });
    expect(data.rows[3]).toMatchObject({ goalValue: "120", targetComparator: "Poniżej" });
  });

  it("returns headers-ready empty data for a workout without elements", () => {
    const stage = createStep({ id: "stage", kind: "stage" });
    const data = buildWorkoutExportData({ name: "Pusty", notes: "", sport: "strength", steps: [stage] }, "en");

    expect(data.rows).toEqual([]);
    expect(data.summary).toMatchObject({ exerciseCount: 0, seriesCount: 0, stageCount: 1 });
  });

  it("uses a localized fallback when neither catalog data nor saved identifiers exist", () => {
    const stage = createStep({ id: "stage", kind: "stage" });
    const set = createStep({ id: "set", kind: "set", parentStageId: stage.id });
    const element = createStep({ id: "element", kind: "exercise", parentSetId: set.id, parentStageId: stage.id });
    const data = buildWorkoutExportData({ name: "Test", notes: "", sport: "strength", steps: [stage, set, element] }, "pl");

    expect(data.rows[0]?.exerciseName).toBe("Nieznane ćwiczenie");
  });
});
