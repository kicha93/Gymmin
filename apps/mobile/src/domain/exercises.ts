import { exercises } from "./exerciseCatalog";
import { exerciseAliasMap } from "./exerciseAliases";
import { exerciseIdAliasMap } from "./exerciseIdAliases";
import { stageExerciseCategories } from "./stageExerciseCategories";
import type { ExerciseCategory } from "./stageExerciseCategories";
import type { StageType } from "./workouts";

export { exercises, exercisesByCategory } from "./exerciseCatalog";

export const muscleKeys = [
  "abductors",
  "abs",
  "adductors",
  "biceps",
  "calves",
  "chest",
  "forearm",
  "glutes",
  "hamstrings",
  "hips",
  "lats",
  "lowerBack",
  "obliques",
  "quads",
  "shoulders",
  "traps",
  "triceps"
] as const;

export const equipmentKeys = [
  "ankleWeight",
  "band",
  "barbell",
  "battleRope",
  "bench",
  "bike",
  "bosuBall",
  "box",
  "cableMachine",
  "dumbbell",
  "ezBar",
  "foamRoller",
  "jumpRope",
  "kettlebell",
  "machine",
  "medicineBall",
  "other",
  "plate",
  "pullupBar",
  "rings",
  "rope",
  "sandbag",
  "sled",
  "slidingDisc",
  "smithMachine",
  "squatRack",
  "swissBall",
  "trx",
  "weightVest"
] as const;

export type MuscleKey = (typeof muscleKeys)[number];
export type EquipmentKey = (typeof equipmentKeys)[number];
export type InfluenceScore = 0 | 1 | 2 | 3 | 4 | 5;
export type EquipmentScore = 0 | 1;
export type ExerciseLibraryTier = "main" | "advanced" | "sportSpecific" | "rehab" | "variation" | "progression";

export type Exercise = {
  id: string;
  name: string;
  polishName: string;
  category: ExerciseCategory;
  muscleImpact: Record<MuscleKey, InfluenceScore>;
  equipment: Record<EquipmentKey, EquipmentScore>;
  libraryTier?: ExerciseLibraryTier;
};

export type ExerciseLanguage = "en" | "pl";

export type MuscleImpactGroups = {
  primary: MuscleKey[];
  major: MuscleKey[];
  significant: MuscleKey[];
  secondary: MuscleKey[];
  stabilizing: MuscleKey[];
};

export const muscleLabels: Record<ExerciseLanguage, Record<MuscleKey, string>> = {
  en: {
    abductors: "Abductors",
    abs: "Abdominals",
    adductors: "Adductors",
    biceps: "Biceps",
    calves: "Calves",
    chest: "Chest",
    forearm: "Forearms",
    glutes: "Glutes",
    hamstrings: "Hamstrings",
    hips: "Hips",
    lats: "Lats",
    lowerBack: "Lower back",
    obliques: "Obliques",
    quads: "Quadriceps",
    shoulders: "Shoulders",
    traps: "Trapezius",
    triceps: "Triceps"
  },
  pl: {
    abductors: "Odwodziciele",
    abs: "Mięśnie brzucha",
    adductors: "Przywodziciele",
    biceps: "Bicepsy",
    calves: "Łydki",
    chest: "Klatka piersiowa",
    forearm: "Przedramiona",
    glutes: "Pośladki",
    hamstrings: "Mięśnie dwugłowe uda",
    hips: "Biodra",
    lats: "Mięśnie najszersze grzbietu",
    lowerBack: "Dolna część pleców",
    obliques: "Mięśnie skośne brzucha",
    quads: "Mięśnie czworogłowe uda",
    shoulders: "Barki",
    traps: "Mięśnie czworoboczne",
    triceps: "Tricepsy"
  }
};

export function getExerciseDisplayName(name: string, language: ExerciseLanguage) {
  const exercise = findExerciseByName(name);
  if (!exercise) {
    return name;
  }

  return language === "pl" ? exercise.polishName : exercise.name;
}

export const activeExerciseLibraryTiers: readonly ExerciseLibraryTier[] = [
  "main", "variation", "advanced", "sportSpecific", "rehab"
];

export function isExerciseAvailableForStageType(
  exercise: Exercise,
  stageType: StageType | "",
  visibleTiers: readonly ExerciseLibraryTier[] = ["main"]
) {
  if (!visibleTiers.includes(exercise.libraryTier ?? "main")) {
    return false;
  }

  if (!stageType || stageType === "other") {
    return true;
  }

  return stageExerciseCategories[stageType].includes(exercise.category);
}

const exerciseById = new Map((exercises as readonly Exercise[]).map((exercise) => [exercise.id, exercise]));
const exerciseByExactName = new Map<string, Exercise>();

for (const exercise of exercises as readonly Exercise[]) {
  if (!exerciseByExactName.has(exercise.name)) {
    exerciseByExactName.set(exercise.name, exercise);
  }
  if (!exerciseByExactName.has(exercise.polishName)) {
    exerciseByExactName.set(exercise.polishName, exercise);
  }
}

export function findExerciseByName(name: string) {
  const resolvedName = resolveExerciseAliasName(name);
  return exerciseByExactName.get(resolvedName);
}

export function findExerciseById(exerciseId: string) {
  const resolvedId = resolveExerciseId(exerciseId);
  return exerciseById.get(resolvedId);
}

export function resolveExerciseId(exerciseId: string) {
  let current = exerciseId;
  const visited = new Set<string>();
  const aliases = exerciseIdAliasMap as Record<string, string>;

  while (aliases[current] && !visited.has(current)) {
    visited.add(current);
    current = aliases[current];
  }

  return current;
}

export type ExerciseReference = {
  exerciseId?: string;
  exerciseName?: string;
};

/**
 * Converts a persisted exercise reference to the current canonical catalog
 * entry. Stored workouts and sessions keep the canonical English name; UI
 * localization is applied by getExerciseDisplayName(). This deliberately
 * rewrites removed variants (for example banded exercises) instead of merely
 * resolving them at render time, so the compatibility aliases can be retired
 * after the migration release has rewritten local data.
 */
export function normalizeExerciseReference<T extends ExerciseReference>(reference: T): T {
  const rawId = reference.exerciseId?.trim();
  const rawName = reference.exerciseName?.trim();
  const exercise = rawId
    ? findExerciseById(rawId)
    : rawName
      ? findCatalogExerciseBestEffort(rawName)
      : undefined;

  if (!exercise) {
    return reference;
  }

  return {
    ...reference,
    exerciseId: exercise.id,
    exerciseName: exercise.name
  };
}

export function isExerciseVisibleInDefaultLibrary(exercise: Exercise) {
  return (exercise.libraryTier ?? "main") === "main";
}

function normalizeExerciseLookupValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

const normalizedExerciseAliasMap = new Map(
  Object.entries(exerciseAliasMap).map(([sourceName, targetName]) => [
    normalizeExerciseLookupValue(sourceName),
    targetName
  ])
);

export function resolveExerciseAliasName(name: string) {
  const directAliases = exerciseAliasMap as Record<string, string>;
  const visited = new Set<string>();
  let current = name;

  while (!visited.has(normalizeExerciseLookupValue(current))) {
    visited.add(normalizeExerciseLookupValue(current));
    const next = directAliases[current]
      ?? normalizedExerciseAliasMap.get(normalizeExerciseLookupValue(current));
    if (!next) {
      break;
    }
    current = next;
  }

  return current;
}

const exerciseByNormalizedLookupValue = new Map<string, Exercise>();

for (const exercise of exercises as readonly Exercise[]) {
  const candidates = [
    exercise.id,
    exercise.name,
    exercise.polishName,
    `${exercise.category} ${exercise.name}`
  ];

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeExerciseLookupValue(candidate);
    if (!exerciseByNormalizedLookupValue.has(normalizedCandidate)) {
      exerciseByNormalizedLookupValue.set(normalizedCandidate, exercise);
    }
  }
}

export function findCatalogExerciseBestEffort(name: string): Exercise | undefined {
  const byId = findExerciseById(name);
  if (byId) {
    return byId;
  }

  const resolvedName = resolveExerciseAliasName(name);
  const normalizedName = normalizeExerciseLookupValue(resolvedName);

  if (!normalizedName) {
    return undefined;
  }

  return exerciseByNormalizedLookupValue.get(normalizedName);
}

export function getPrimaryMuscles(exercise: Exercise) {
  return getMuscleImpactGroups(exercise.muscleImpact).primary;
}

export function getSecondaryMuscles(exercise: Exercise) {
  const groups = getMuscleImpactGroups(exercise.muscleImpact);
  return [...groups.major, ...groups.significant, ...groups.secondary];
}

export function getMuscleImpactGroups(
  muscleImpact: Record<MuscleKey, InfluenceScore>
): MuscleImpactGroups {
  return {
    primary: muscleKeys.filter((muscle) => muscleImpact[muscle] === 5),
    major: muscleKeys.filter((muscle) => muscleImpact[muscle] === 4),
    significant: muscleKeys.filter((muscle) => muscleImpact[muscle] === 3),
    secondary: muscleKeys.filter((muscle) => muscleImpact[muscle] === 2),
    stabilizing: muscleKeys.filter((muscle) => muscleImpact[muscle] === 1)
  };
}

export function getRequiredEquipment(exercise: Exercise) {
  return equipmentKeys.filter((equipment) => exercise.equipment[equipment] > 0);
}
