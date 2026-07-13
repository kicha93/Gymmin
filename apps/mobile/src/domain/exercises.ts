import { exercises } from "./exerciseCatalog";
import { exerciseAliasMap } from "./exerciseAliases";
import { exerciseIdAliasMap } from "./exerciseIdAliases";
import { stageExerciseCategories } from "./stageExerciseCategories";
import type { GarminCategory } from "./stageExerciseCategories";
import type { StageType } from "./workouts";

export { exercises, exercisesByGarminCategory } from "./exerciseCatalog";

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
export type InfluenceScore = 0 | 1 | 2;
export type EquipmentScore = 0 | 1;
export type ExerciseLibraryTier = "main" | "advanced" | "sportSpecific" | "rehab" | "variation" | "progression" | "deprecated";

export type Exercise = {
  id: string;
  name: string;
  polishName: string;
  garminCategory: GarminCategory;
  garminName: string;
  foundInGarmin: boolean;
  image: string;
  url: string;
  difficulty: string;
  description: string;
  muscleImpact: Record<MuscleKey, InfluenceScore>;
  equipment: Record<EquipmentKey, EquipmentScore>;
  libraryTier?: ExerciseLibraryTier;
};

export type ExerciseOption = {
  exerciseId: string;
  garminCategory: GarminCategory;
  label: string;
  libraryTier: ExerciseLibraryTier;
  muscleImpact: Record<MuscleKey, InfluenceScore>;
  value: string;
};

export type ExerciseSection = {
  data: Array<ExerciseOption & { sectionKey: string }>;
  title: string;
};


export type ExerciseLanguage = "en" | "pl";

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
export type AdditionalExerciseLibraryTier = Exclude<ExerciseLibraryTier, "main" | "deprecated" | "progression">;

export function filterExerciseOptionsForPicker(
  options: readonly ExerciseOption[],
  query: string,
  enabledAdditionalTiers: ReadonlySet<AdditionalExerciseLibraryTier>
) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const enabledTiers = new Set<ExerciseLibraryTier>(["main", ...enabledAdditionalTiers]);
  const activeOptions = normalizedQuery
    ? options.filter((option) => option.libraryTier !== "deprecated" && option.libraryTier !== "progression")
    : options.filter((option) => enabledTiers.has(option.libraryTier));
  const matchingOptions = normalizedQuery
    ? activeOptions.filter((option) => getNormalizedExerciseOptionLabel(option).includes(normalizedQuery))
    : activeOptions;

  return normalizedQuery
    ? [...matchingOptions].sort((left, right) =>
      (left.libraryTier === "main" ? 0 : 1) - (right.libraryTier === "main" ? 0 : 1) ||
      left.label.localeCompare(right.label)
    )
    : matchingOptions;
}

const normalizedExerciseOptionLabelCache = new WeakMap<ExerciseOption, string>();

function getNormalizedExerciseOptionLabel(option: ExerciseOption) {
  const cachedLabel = normalizedExerciseOptionLabelCache.get(option);
  if (cachedLabel !== undefined) {
    return cachedLabel;
  }

  const normalizedLabel = option.label.toLocaleLowerCase();
  normalizedExerciseOptionLabelCache.set(option, normalizedLabel);
  return normalizedLabel;
}

export function getExerciseOptionTierBadge(option: ExerciseOption): AdditionalExerciseLibraryTier | null {
  return option.libraryTier === "main" || option.libraryTier === "deprecated" || option.libraryTier === "progression"
    ? null
    : option.libraryTier;
}

export function getExerciseOptions(
  language: ExerciseLanguage,
  visibleTiers: readonly ExerciseLibraryTier[] = ["main"]
) {
  const allowedTiers = new Set(visibleTiers);
  return exercises
    .filter((exercise) => allowedTiers.has(exercise.libraryTier ?? "main"))
    .map((exercise) => ({
      exerciseId: exercise.id,
      garminCategory: exercise.garminCategory,
      label: language === "pl" ? exercise.polishName : exercise.name,
      libraryTier: exercise.libraryTier ?? "main",
      muscleImpact: exercise.muscleImpact,
      value: exercise.name
    }));
}

export function getExerciseOptionsForStageType(
  language: ExerciseLanguage,
  stageType: StageType | "",
  visibleTiers: readonly ExerciseLibraryTier[] = ["main"]
) {
  if (!stageType || stageType === "other") {
    return getExerciseOptions(language, visibleTiers);
  }

  const allowedCategories = new Set(stageExerciseCategories[stageType]);

  if (!allowedCategories.size) {
    return [];
  }

  return exercises
    .filter((exercise) => allowedCategories.has(exercise.garminCategory) && visibleTiers.includes(exercise.libraryTier ?? "main"))
    .map((exercise) => ({
      exerciseId: exercise.id,
      garminCategory: exercise.garminCategory,
      label: language === "pl" ? exercise.polishName : exercise.name,
      libraryTier: exercise.libraryTier ?? "main",
      muscleImpact: exercise.muscleImpact,
      value: exercise.name
    }));
}

function formatGarminCategory(category: string) {
  return category
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function buildExerciseSections(
  options: readonly ExerciseOption[],
  language: ExerciseLanguage,
  selectedMuscle: MuscleKey | "all"
): ExerciseSection[] {
  const groups: Array<{
    data: Array<ExerciseOption & { sectionKey: string }>;
    key: string;
    title: string;
  }> = [];
  const groupsByKey = new Map<string, (typeof groups)[number]>();

  function getOrCreateGroup(groupKey: string, title: string) {
    const existingGroup = groupsByKey.get(groupKey);

    if (existingGroup) {
      return existingGroup;
    }

    const nextGroup = { data: [], key: groupKey, title };
    groups.push(nextGroup);
    groupsByKey.set(groupKey, nextGroup);
    return nextGroup;
  }

  options.forEach((option) => {
    let groupKeys: string[];

    if (selectedMuscle !== "all") {
      if ((option.muscleImpact?.[selectedMuscle] ?? 0) <= 0) {
        return;
      }

      groupKeys = [selectedMuscle];
    } else {
      const maximumImpact = Math.max(...muscleKeys.map((muscle) => option.muscleImpact?.[muscle] ?? 0));
      groupKeys = maximumImpact > 0
        ? muscleKeys.filter((muscle) => (option.muscleImpact?.[muscle] ?? 0) === maximumImpact)
        : [`garmin:${option.garminCategory || "OTHER"}`];
    }

    groupKeys.forEach((groupKey) => {
      const title = groupKey.startsWith("garmin:")
        ? formatGarminCategory(groupKey.slice("garmin:".length))
        : muscleLabels[language][groupKey as MuscleKey];
      const currentGroup = getOrCreateGroup(groupKey, title);

      currentGroup.data.push({
        ...option,
        sectionKey: `${groupKey}:${option.value}`
      });
    });
  });

  return groups
    .map((group) => ({
      data: [...group.data].sort((first, second) => first.label.localeCompare(second.label, language)),
      title: group.title
    }))
    .sort((first, second) => first.title.localeCompare(second.title, language));
}

const exerciseOptionsCache = new Map<string, ExerciseOption[]>();
const stageExerciseOptionsCache = new Map<string, ExerciseOption[]>();
const exerciseSectionsCache = new Map<string, ExerciseSection[]>();

export function clearExerciseCaches() {
  exerciseOptionsCache.clear();
  stageExerciseOptionsCache.clear();
  exerciseSectionsCache.clear();
}

export function getCachedExerciseOptions(
  language: ExerciseLanguage,
  visibleTiers: readonly ExerciseLibraryTier[] = ["main"]
) {
  const cacheKey = `${language}:${visibleTiers.join(",")}`;
  const cachedOptions = exerciseOptionsCache.get(cacheKey);

  if (cachedOptions) {
    return cachedOptions;
  }

  const options = getExerciseOptions(language, visibleTiers);
  exerciseOptionsCache.set(cacheKey, options);
  return options;
}

export function getCachedExerciseOptionsForStageType(
  language: ExerciseLanguage,
  stageType: StageType | "",
  visibleTiers: readonly ExerciseLibraryTier[] = ["main"]
) {
  const cacheKey = `${language}:${stageType || "all"}:${visibleTiers.join(",")}`;
  const cachedOptions = stageExerciseOptionsCache.get(cacheKey);

  if (cachedOptions) {
    return cachedOptions;
  }

  const options = getExerciseOptionsForStageType(language, stageType, visibleTiers);
  stageExerciseOptionsCache.set(cacheKey, options);
  return options;
}

export function getExerciseSections(language: ExerciseLanguage, selectedMuscle: MuscleKey | "all") {
  const cacheKey = `${language}:${selectedMuscle}`;
  const cachedSections = exerciseSectionsCache.get(cacheKey);

  if (cachedSections) {
    return cachedSections;
  }

  const sections = buildExerciseSections(getCachedExerciseOptions(language), language, selectedMuscle);
  exerciseSectionsCache.set(cacheKey, sections);
  return sections;
}

export function getExerciseSectionsForStageType(
  language: ExerciseLanguage,
  stageType: StageType | "",
  selectedMuscle: MuscleKey | "all"
) {
  const cacheKey = `${language}:${stageType || "all"}:${selectedMuscle}`;
  const cachedSections = exerciseSectionsCache.get(cacheKey);

  if (cachedSections) {
    return cachedSections;
  }

  const sections = buildExerciseSections(
    getCachedExerciseOptionsForStageType(language, stageType),
    language,
    selectedMuscle
  );
  exerciseSectionsCache.set(cacheKey, sections);
  return sections;
}

export function getMuscleOptions(language: ExerciseLanguage) {
  return muscleKeys
    .map((value) => ({
      label: muscleLabels[language][value],
      value
    }))
    .sort((first, second) => first.label.localeCompare(second.label, language));
}

export function findExerciseByName(name: string) {
  const resolvedName = resolveExerciseAliasName(name);
  return exercises.find((exercise) => exercise.name === resolvedName || exercise.polishName === resolvedName);
}

export function findExerciseById(exerciseId: string) {
  const resolvedId = resolveExerciseId(exerciseId);
  return exercises.find((exercise) => exercise.id === resolvedId);
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

  return (exercises as readonly Exercise[]).find((exercise) => {
    const candidates: string[] = [
      exercise.id,
      exercise.name,
      exercise.polishName,
      exercise.garminName,
      `${exercise.garminCategory} ${exercise.garminName}`
    ];

    return candidates.some((candidate) => normalizeExerciseLookupValue(candidate) === normalizedName);
  });
}

export function getPrimaryMuscles(exercise: Exercise) {
  return muscleKeys.filter((muscle) => exercise.muscleImpact[muscle] === 2);
}

export function getSecondaryMuscles(exercise: Exercise) {
  return muscleKeys.filter((muscle) => exercise.muscleImpact[muscle] === 1);
}

export function getRequiredEquipment(exercise: Exercise) {
  return equipmentKeys.filter((equipment) => exercise.equipment[equipment] > 0);
}
