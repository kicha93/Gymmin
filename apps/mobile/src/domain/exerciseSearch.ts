import { exerciseAliasMap } from "./exerciseAliases";
import {
  exercises,
  equipmentKeys,
  findCatalogExerciseBestEffort,
  getRequiredEquipment,
  muscleLabels,
  muscleKeys,
  resolveExerciseId,
  type EquipmentKey,
  type Exercise,
  type ExerciseLibraryTier,
  type MuscleKey
} from "./exercises";
import type { ExerciseCategory } from "./stageExerciseCategories";
import type { WorkoutSession } from "./workoutSessions";

export type ExerciseUsage = { count: number; lastUsedAt: number };
export type ExerciseUsageById = ReadonlyMap<string, ExerciseUsage>;

export type ExerciseSearchRecord = {
  exercise: Exercise;
  normalizedEnglish: string;
  normalizedPolish: string;
  normalizedAliases: readonly string[];
  normalizedMetadata: readonly string[];
  tokens: readonly string[];
  muscles: readonly MuscleKey[];
  equipment: readonly EquipmentKey[];
  category: ExerciseCategory;
  tier: ExerciseLibraryTier;
};

export type ExerciseSearchFilters = {
  muscles: ReadonlySet<MuscleKey>;
  equipment: ReadonlySet<EquipmentKey>;
  categories: ReadonlySet<ExerciseCategory>;
  tiers: ReadonlySet<ExerciseLibraryTier>;
};

export type ExerciseSearchOptions = {
  query: string;
  language: "pl" | "en";
  filters: ExerciseSearchFilters;
  favoriteExerciseIds: ReadonlySet<string>;
  usageById: ExerciseUsageById;
  allowedExerciseIds?: ReadonlySet<string>;
  mode?: "all" | "favorites" | "recent";
  limit?: number;
};

export type ExerciseSearchResult = ExerciseSearchRecord & {
  score: number;
  usage: ExerciseUsage | undefined;
};

export function normalizeExerciseSearchText(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("pl")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[łŁ]/g, "l")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const aliasesByCanonicalId = (() => {
  const result = new Map<string, string[]>();
  Object.entries(exerciseAliasMap).forEach(([alias, target]) => {
    const exercise = findCatalogExerciseBestEffort(target);
    if (!exercise) return;
    const current = result.get(exercise.id) ?? [];
    current.push(normalizeExerciseSearchText(alias));
    result.set(exercise.id, current);
  });
  return result;
})();

// Built once when the feature module loads. Query-time work never normalizes or
// tokenizes all 805 catalog records again.
export const exerciseSearchIndex: readonly ExerciseSearchRecord[] = exercises.map((exercise) => {
  const normalizedEnglish = normalizeExerciseSearchText(exercise.name);
  const normalizedPolish = normalizeExerciseSearchText(exercise.polishName);
  const normalizedAliases = aliasesByCanonicalId.get(exercise.id) ?? [];
  const muscles = muscleKeys
    .filter((key) => exercise.muscleImpact[key] >= 2)
    .sort((left, right) => exercise.muscleImpact[right] - exercise.muscleImpact[left]);
  const equipment = getRequiredEquipment(exercise);
  const normalizedMetadata = [
    ...muscles.flatMap((key) => [muscleLabels.pl[key], muscleLabels.en[key]]),
    exercise.category,
    ...equipment
  ].map(normalizeExerciseSearchText);
  return {
    exercise,
    normalizedEnglish,
    normalizedPolish,
    normalizedAliases,
    normalizedMetadata,
    // Typo tolerance is deliberately limited to displayed PL/EN names. Alias
    // and metadata tokens would make a broad query such as "wyciskanie"
    // surface unrelated canonical exercises through a long historical alias.
    tokens: [...new Set([normalizedEnglish, normalizedPolish].flatMap((value) => value.split(" ")))],
    muscles,
    equipment,
    category: exercise.category,
    tier: exercise.libraryTier ?? "main"
  };
});

function tokenPrefixMatch(text: string, queryTokens: readonly string[]) {
  const tokens = text.split(" ");
  return queryTokens.every((queryToken) => tokens.some((token) => token.startsWith(queryToken)));
}

function textualScore(record: ExerciseSearchRecord, query: string, language: "pl" | "en", allowPartialAliases = false) {
  if (!query) return 0;
  const primary = language === "pl" ? record.normalizedPolish : record.normalizedEnglish;
  const secondary = language === "pl" ? record.normalizedEnglish : record.normalizedPolish;
  if (primary === query) return 10_000;
  if (secondary === query) return 9_500;
  if (record.normalizedAliases.includes(query)) return 9_000;
  if (primary.startsWith(query)) return 8_000;
  if (secondary.startsWith(query)) return 7_500;
  const queryTokens = query.split(" ");
  if (tokenPrefixMatch(primary, queryTokens)) return 7_000;
  if (tokenPrefixMatch(secondary, queryTokens)) return 6_500;
  if (primary.includes(query) || secondary.includes(query)) return 5_000;
  if (allowPartialAliases && record.normalizedAliases.some((alias) => alias.startsWith(query))) return 4_500;
  if (allowPartialAliases && record.normalizedAliases.some((alias) => tokenPrefixMatch(alias, queryTokens))) return 4_000;
  if (record.normalizedMetadata.some((field) => field.includes(query))) return 2_000;
  return -1;
}

function editDistanceAtMostTwo(left: string, right: string) {
  if (Math.abs(left.length - right.length) > 2) return false;
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    let rowMinimum = current[0];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const value = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1)
      );
      current[rightIndex] = value;
      rowMinimum = Math.min(rowMinimum, value);
    }
    if (rowMinimum > 2) return false;
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length] <= 2;
}

function matchesFilters(record: ExerciseSearchRecord, filters: ExerciseSearchFilters) {
  return (filters.muscles.size === 0 || record.muscles.some((key) => filters.muscles.has(key)))
    && (filters.equipment.size === 0 || record.equipment.some((key) => filters.equipment.has(key)))
    && (filters.categories.size === 0 || filters.categories.has(record.category))
    && (filters.tiers.size === 0 || filters.tiers.has(record.tier));
}

export function searchExercises(options: ExerciseSearchOptions): ExerciseSearchResult[] {
  const query = normalizeExerciseSearchText(options.query);
  const mode = options.mode ?? "all";
  const candidates = exerciseSearchIndex.filter((record) => {
    if (options.allowedExerciseIds && !options.allowedExerciseIds.has(record.exercise.id)) return false;
    if (!matchesFilters(record, options.filters)) return false;
    if (mode === "favorites" && !options.favoriteExerciseIds.has(record.exercise.id)) return false;
    if (mode === "recent" && !options.usageById.has(record.exercise.id)) return false;
    return true;
  });
  let scored = candidates
    .map((record) => ({ record, score: textualScore(record, query, options.language) }))
    .filter(({ score }) => !query || score >= 0);

  // Partial historical aliases are a fallback, not an additional bucket mixed
  // into a healthy name search. Exact aliases remain searchable above.
  if (query && scored.length === 0) {
    scored = candidates
      .map((record) => ({ record, score: textualScore(record, query, options.language, true) }))
      .filter(({ score }) => score >= 0);
  }

  // Fuzzy matching is deliberately a fallback and only compares query to the
  // pre-tokenized candidate terms when ordinary matching found very little.
  if (query.length >= 4 && scored.length < 5) {
    const existing = new Set(scored.map(({ record }) => record.exercise.id));
    candidates.forEach((record) => {
      if (existing.has(record.exercise.id)) return;
      const queryTokens = query.split(" ");
      const fuzzy = queryTokens.every((queryToken) => record.tokens.some((token) => editDistanceAtMostTwo(queryToken, token)));
      if (fuzzy) scored.push({ record, score: 3_000 });
    });
  }

  return scored
    .map(({ record, score }) => {
      const usage = options.usageById.get(record.exercise.id);
      const contextualBoost = (options.favoriteExerciseIds.has(record.exercise.id) ? 18 : 0)
        + (usage ? Math.min(16, usage.count) + Math.min(14, usage.lastUsedAt / 1e13) : 0);
      return { ...record, usage, score: score + contextualBoost };
    })
    .sort((left, right) => {
      if (mode === "recent") return (right.usage?.lastUsedAt ?? 0) - (left.usage?.lastUsedAt ?? 0);
      if (!query) {
        return (right.usage?.lastUsedAt ?? 0) - (left.usage?.lastUsedAt ?? 0)
          || Number(options.favoriteExerciseIds.has(right.exercise.id)) - Number(options.favoriteExerciseIds.has(left.exercise.id))
          || (options.language === "pl" ? left.exercise.polishName : left.exercise.name)
            .localeCompare(options.language === "pl" ? right.exercise.polishName : right.exercise.name, options.language);
      }
      return right.score - left.score;
    })
    .slice(0, options.limit ?? 200);
}

export function buildExerciseUsageById(sessions: readonly WorkoutSession[]): Map<string, ExerciseUsage> {
  const usage = new Map<string, ExerciseUsage>();
  sessions
    .filter((session) => !session.deletedAt && session.status === "completed")
    .forEach((session) => {
      const usedAt = Date.parse(session.finishedAt ?? session.startedAt);
      const uniqueExerciseIds = new Set(session.entries
        .filter((entry) => entry.isCompleted && (entry.exerciseId || entry.exerciseName))
        .map((entry) => entry.exerciseId
          ? resolveExerciseId(entry.exerciseId)
          : findCatalogExerciseBestEffort(entry.exerciseName ?? "")?.id ?? "")
        .filter(Boolean));
      uniqueExerciseIds.forEach((exerciseId) => {
        const current = usage.get(exerciseId);
        usage.set(exerciseId, {
          count: (current?.count ?? 0) + 1,
          lastUsedAt: Math.max(current?.lastUsedAt ?? 0, Number.isFinite(usedAt) ? usedAt : 0)
        });
      });
    });
  return usage;
}

export const allEquipmentKeys = equipmentKeys;
