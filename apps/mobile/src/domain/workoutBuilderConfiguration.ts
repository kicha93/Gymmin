import type { TranslationKey } from "../i18n/translations";
import type { GoalType, StageType, TargetComparator } from "./workouts";

const stageTypeValues: StageType[] = ["warmup", "exercise", "recovery", "rest", "cooldown", "other"];
const goalTypeValues: GoalType[] = ["repetitions", "time", "buttonPress", "calories", "heartRate"];
const targetComparatorValues: TargetComparator[] = ["below", "above"];

const stageTypeTranslationKeys: Record<StageType, TranslationKey> = {
  cooldown: "stageCooldown",
  exercise: "stageExercise",
  other: "stageOther",
  recovery: "stageRecovery",
  rest: "stageRest",
  warmup: "stageWarmup"
};

const goalTypeTranslationKeys: Record<GoalType, TranslationKey> = {
  buttonPress: "goalButtonPress",
  calories: "goalCalories",
  heartRate: "goalHeartRate",
  repetitions: "goalRepetitions",
  time: "goalTime"
};

const targetComparatorTranslationKeys: Record<TargetComparator, TranslationKey> = {
  above: "targetAbove",
  below: "targetBelow"
};

type Translate = (key: TranslationKey) => string;

export function getStageTypeOptions(t: Translate) {
  return stageTypeValues.map((value) => ({ label: t(stageTypeTranslationKeys[value]), value }));
}

export function getExerciseElementTypeOptions(t: Translate) {
  return stageTypeValues
    .filter((value) => value !== "rest")
    .map((value) => ({ label: t(stageTypeTranslationKeys[value]), value }));
}

export function getStageTypeTranslationKey(value: StageType) {
  return stageTypeTranslationKeys[value];
}

export function getGoalTypeOptions(t: Translate) {
  return goalTypeValues.map((value) => ({ label: t(goalTypeTranslationKeys[value]), value }));
}

export function getTargetComparatorOptions(t: Translate) {
  return targetComparatorValues.map((value) => ({ label: t(targetComparatorTranslationKeys[value]), value }));
}

export function normalizeSetCountInput(value: string) {
  const numericValue = value.replace(/\D/g, "").slice(0, 2);

  if (!numericValue) {
    return "";
  }

  return String(Math.min(Number(numericValue), 20));
}
