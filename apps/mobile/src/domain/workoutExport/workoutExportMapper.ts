import { getWorkoutStepCatalogExercise } from "../workoutExerciseSummary";
import { groupWorkoutBuilderSteps } from "../workoutEditor";
import {
  normalizeWorkoutRestBetweenSets,
  parseWorkoutDurationSeconds,
  type GoalType,
  type IntensityTarget,
  type StageType,
  type TargetComparator,
  type WorkoutDraft
} from "../workouts";
import type { WorkoutExportData, WorkoutExportLocale, WorkoutExportRow } from "./workoutExportTypes";

const unknownExerciseLabels: Record<WorkoutExportLocale, string> = {
  en: "Unknown exercise",
  pl: "Nieznane ćwiczenie"
};

const stageTypeLabels: Record<WorkoutExportLocale, Record<StageType, string>> = {
  en: { cooldown: "Cooldown", exercise: "Exercise", other: "Other", recovery: "Recovery", rest: "Rest", warmup: "Warm-up" },
  pl: { cooldown: "Schłodzenie", exercise: "Ćwiczenie", other: "Inny", recovery: "Regeneracja", rest: "Odpoczynek", warmup: "Rozgrzewka" }
};

const goalTypeLabels: Record<WorkoutExportLocale, Record<GoalType, string>> = {
  en: { buttonPress: "Button press", calories: "Calories", heartRate: "Heart rate", repetitions: "Repetitions", time: "Time" },
  pl: { buttonPress: "Naciśnięcie przycisku", calories: "Kalorie", heartRate: "Tętno", repetitions: "Powtórzenia", time: "Czas" }
};

const comparatorLabels: Record<WorkoutExportLocale, Record<TargetComparator, string>> = {
  en: { above: "Above", below: "Below" },
  pl: { above: "Powyżej", below: "Poniżej" }
};

const intensityLabels: Record<WorkoutExportLocale, Record<IntensityTarget, string>> = {
  en: { heavy: "Heavy", light: "Light", max: "Maximum", moderate: "Moderate" },
  pl: { heavy: "Duża", light: "Lekka", max: "Maksymalna", moderate: "Umiarkowana" }
};

function optionalNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || !value.trim()) return null;
  const parsed = Number(value.trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function durationSeconds(value: unknown): number | null {
  if (typeof value !== "string" || !value.trim()) return optionalNumber(value);
  const parts = value.trim().split(":");
  if (parts.length !== 3) return optionalNumber(value);
  const numeric = parts.map(Number);
  if (numeric.some((part) => !Number.isFinite(part) || part < 0)) return null;
  return numeric[0] * 3600 + numeric[1] * 60 + numeric[2];
}

function localizeStageType(value: StageType | "", locale: WorkoutExportLocale) {
  return value ? stageTypeLabels[locale][value] : "";
}

function localizeGoalType(value: GoalType | "", locale: WorkoutExportLocale) {
  return value ? goalTypeLabels[locale][value] : "";
}

export function buildWorkoutExportData(workout: WorkoutDraft, locale: WorkoutExportLocale): WorkoutExportData {
  const normalizedWorkout = normalizeWorkoutRestBetweenSets(workout);
  const stages = groupWorkoutBuilderSteps(normalizedWorkout.steps);
  const rows: WorkoutExportRow[] = [];
  let seriesCount = 0;
  let exerciseCount = 0;

  stages.forEach(({ stage, series }, stageIndex) => {
    seriesCount += series.length;

    series.forEach(({ elements, set }, seriesIndex) => {
      exerciseCount += elements.length;

      elements.forEach((element, elementIndex) => {
        const catalogExercise = getWorkoutStepCatalogExercise(element);
        const rawExerciseId = element.exerciseId?.trim() ?? "";
        const rawExerciseName = element.exerciseName.trim();
        const isRest = element.stageType === "rest";
        const timeSeconds = element.goalType === "time" ? durationSeconds(element.targetValue) : null;

        rows.push({
          distance: null,
          durationSeconds: isRest ? null : timeSeconds,
          elementOrder: elementIndex + 1,
          elementType: localizeStageType(element.stageType || "exercise", locale),
          exerciseId: catalogExercise?.id ?? rawExerciseId,
          exerciseName: catalogExercise
            ? (locale === "pl" ? catalogExercise.polishName : catalogExercise.name)
            : rawExerciseName || rawExerciseId || unknownExerciseLabels[locale],
          goalType: localizeGoalType(element.goalType, locale),
          goalValue: element.targetValue.trim(),
          intensity: intensityLabels[locale][element.intensity],
          notes: element.notes,
          repetitions: element.goalType === "repetitions" ? optionalNumber(element.targetValue) : null,
          restSeconds: isRest ? timeSeconds : parseWorkoutDurationSeconds(element.restSeconds),
          seriesCount: optionalNumber(set.setCount),
          seriesName: set.label,
          seriesOrder: seriesIndex + 1,
          stageName: stage.label || `${locale === "pl" ? "Etap" : "Stage"} ${stageIndex + 1}`,
          stageNotes: stage.notes,
          stageOrder: stageIndex + 1,
          stageType: localizeStageType(stage.stageType, locale),
          targetComparator: element.targetComparator ? comparatorLabels[locale][element.targetComparator] : "",
          weightKg: optionalNumber(element.loadKg),
          workoutName: normalizedWorkout.name
        });
      });
    });
  });

  return {
    rows,
    summary: {
      exerciseCount,
      seriesCount,
      stageCount: stages.length,
      workoutName: normalizedWorkout.name,
      workoutNotes: normalizedWorkout.notes
    }
  };
}
