import {
  getExerciseProgressItems,
  getSessionStartedAtTime,
  parseNumberInput,
  type ExerciseProgressResult,
  type WorkoutSession
} from "./workoutSessions";

export type ExerciseProgressHistoryRange = "all" | "3m" | "6m" | "1y";

export type ExerciseProgressHistoryGroup = {
  bestReps: number | null;
  bestWeight: number | null;
  entries: ExerciseProgressResult[];
  key: string;
  session: WorkoutSession;
  totalVolume: number | null;
};

export function formatExerciseProgressSetCount(count: number, language: "pl" | "en") {
  const safeCount = Math.max(0, Math.floor(Number.isFinite(count) ? count : 0));

  if (language === "en") {
    return `${safeCount} ${safeCount === 1 ? "set" : "sets"}`;
  }

  if (safeCount === 1) {
    return "1 seria";
  }

  return safeCount >= 2 && safeCount <= 4 ? `${safeCount} serie` : `${safeCount} serii`;
}

export function formatExerciseProgressSeriesValue(
  reps: string | undefined,
  weight: string | undefined,
  volume: number | null,
  language: "pl" | "en"
) {
  const repetitions = reps?.trim() ? `${reps.trim()} ${language === "pl" ? "powt." : "reps"}` : "—";
  const load = weight?.trim() ? `${weight.trim()} kg` : "—";
  const volumeLabel = language === "pl" ? "obj." : "vol.";
  const displayedVolume = volume !== null && Number.isFinite(volume) && volume > 0
    ? `${formatExerciseProgressDecimal(volume, language)} kg`
    : "—";

  return { load, repetitions, volume: `${volumeLabel} ${displayedVolume}` };
}

function formatExerciseProgressDecimal(value: number, language: "pl" | "en") {
  const rounded = Math.round((value + Number.EPSILON) * 10) / 10;
  const formatted = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return language === "pl" ? formatted.replace(".", ",") : formatted;
}

function getGroupKey(result: ExerciseProgressResult, exerciseKey: string) {
  // One card represents one completed workout session. Results already belong to
  // the selected exercise, so stage/element data only controls row ordering.
  return `${result.session.id}:${exerciseKey}`;
}

function sortEntries(left: ExerciseProgressResult, right: ExerciseProgressResult) {
  return (
    left.entry.stageIndex - right.entry.stageIndex ||
    left.entry.seriesIndex - right.entry.seriesIndex ||
    left.entry.setIteration - right.entry.setIteration ||
    left.entry.elementIndex - right.entry.elementIndex ||
    left.entry.id.localeCompare(right.entry.id)
  );
}

export function getExerciseProgressHistoryGroups(
  sessions: WorkoutSession[],
  exerciseKey: string
): ExerciseProgressHistoryGroup[] {
  const item = getExerciseProgressItems(sessions).find((candidate) => candidate.exerciseKey === exerciseKey);
  if (!item) {
    return [];
  }

  const groups = new Map<string, ExerciseProgressResult[]>();
  for (const result of item.results) {
    const key = getGroupKey(result, exerciseKey);
    groups.set(key, [...(groups.get(key) ?? []), result]);
  }

  return Array.from(groups.entries())
    .map(([key, results]) => {
      const entries = [...results].sort(sortEntries);
      const weights = entries
        .map((result) => parseNumberInput(result.entry.actualWeight))
        .filter((value): value is number => value !== null && value > 0);
      const reps = entries
        .map((result) => parseNumberInput(result.entry.actualReps))
        .filter((value): value is number => value !== null && value > 0);
      const volumes = entries
        .map((result) => result.volume)
        .filter((value): value is number => value !== null && value > 0);

      return {
        bestReps: reps.length ? Math.max(...reps) : null,
        bestWeight: weights.length ? Math.max(...weights) : null,
        entries,
        key,
        session: entries[0].session,
        totalVolume: volumes.length ? volumes.reduce((sum, value) => sum + value, 0) : null
      };
    })
    .sort((left, right) => getSessionStartedAtTime(right.session) - getSessionStartedAtTime(left.session));
}

export function filterExerciseProgressHistoryGroups(
  groups: ExerciseProgressHistoryGroup[],
  range: ExerciseProgressHistoryRange,
  now = new Date()
) {
  if (range === "all") {
    return groups;
  }

  const months = range === "3m" ? 3 : range === "6m" ? 6 : 12;
  const threshold = new Date(now);
  threshold.setMonth(threshold.getMonth() - months);
  const thresholdTime = threshold.getTime();

  return groups.filter((group) => getSessionStartedAtTime(group.session) >= thresholdTime);
}
