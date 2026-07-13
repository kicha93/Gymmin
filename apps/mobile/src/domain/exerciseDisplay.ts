import {
  getPrimaryMuscles,
  getRequiredEquipment,
  muscleLabels,
  type Exercise
} from "./exercises";
import type { LanguageCode } from "../i18n/translations";

function formatCodeLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getExerciseNameForLanguage(exercise: Exercise, language: LanguageCode) {
  return language === "pl" ? exercise.polishName : exercise.name;
}

export function getExerciseMetaForLanguage(exercise: Exercise, language: LanguageCode) {
  const primaryMuscles = getPrimaryMuscles(exercise)
    .map((muscle) => muscleLabels[language][muscle])
    .slice(0, 3)
    .join(", ");
  const equipment = getRequiredEquipment(exercise)
    .map(formatCodeLabel)
    .slice(0, 2)
    .join(", ");

  return [primaryMuscles, equipment, formatCodeLabel(exercise.garminCategory)]
    .filter(Boolean)
    .join(" · ");
}
