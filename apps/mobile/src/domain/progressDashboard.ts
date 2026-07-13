import {
  calculateSessionVolume,
  getCompletedWorkoutSessions,
  getSessionStartedAtTime,
  type ExerciseProgressItem,
  type WorkoutSession
} from "./workoutSessions";

export type ProgressDashboardFilter = "all" | "strength" | "volume";

export type ProgressDashboardStats = {
  beatenRecords: number;
  monthlyVolume: number;
  trackedExercises: number;
};

export function formatProgressWorkoutCount(count: number, language: "pl" | "en") {
  if (language === "en") {
    return `${count} ${count === 1 ? "workout" : "workouts"}`;
  }

  if (count === 1) {
    return "1 trening";
  }

  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;
  if ((lastTwoDigits < 12 || lastTwoDigits > 14) && lastDigit >= 2 && lastDigit <= 4) {
    return `${count} treningi`;
  }

  return `${count} treningów`;
}

export function formatProgressDashboardVolume(value: number, language: "pl" | "en") {
  if (!Number.isFinite(value) || value <= 0) {
    return "0 kg";
  }

  const roundedKilograms = Math.round(value);
  if (roundedKilograms < 1000) {
    return `${roundedKilograms} kg`;
  }

  const tons = Math.round((value / 1000 + Number.EPSILON) * 10) / 10;
  const formatted = Number.isInteger(tons) ? String(tons) : tons.toFixed(1);
  return `${language === "pl" ? formatted.replace(".", ",") : formatted} t`;
}

function compareNullableNumbersDesc(left: number | null, right: number | null) {
  if (left === null && right === null) {
    return 0;
  }

  if (left === null) {
    return 1;
  }

  if (right === null) {
    return -1;
  }

  return right - left;
}

function compareByLatestResultDesc(left: ExerciseProgressItem, right: ExerciseProgressItem) {
  const latestDiff = getSessionStartedAtTime(right.lastResult.session) - getSessionStartedAtTime(left.lastResult.session);

  return latestDiff || left.exerciseName.localeCompare(right.exerciseName);
}

export function getSortedProgressItems(items: ExerciseProgressItem[], filter: ProgressDashboardFilter) {
  const sorted = [...items];

  if (filter === "strength") {
    return sorted.sort((left, right) =>
      compareNullableNumbersDesc(left.bestWeight, right.bestWeight) || compareByLatestResultDesc(left, right)
    );
  }

  if (filter === "volume") {
    return sorted.sort((left, right) =>
      compareNullableNumbersDesc(left.bestVolumeSingleEntry, right.bestVolumeSingleEntry) || compareByLatestResultDesc(left, right)
    );
  }

  return sorted.sort(compareByLatestResultDesc);
}

export function getProgressDashboardStats(
  items: ExerciseProgressItem[],
  sessions: WorkoutSession[],
  now = new Date()
): ProgressDashboardStats {
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthlyVolume = getCompletedWorkoutSessions(sessions)
    .filter((session) => {
      const startedAt = new Date(getSessionStartedAtTime(session));

      return startedAt.getFullYear() === currentYear && startedAt.getMonth() === currentMonth;
    })
    .reduce((sum, session) => sum + calculateSessionVolume(session), 0);

  return {
    beatenRecords: items.filter((item) => item.bestWeight !== null).length,
    monthlyVolume,
    trackedExercises: items.length
  };
}

export function getProgressSparklineValues(item: ExerciseProgressItem, limit = 6) {
  const chronologicalResults = [...item.results].reverse();
  const values = chronologicalResults
    .map((result) => result.volume ?? Number(result.entry.actualWeight))
    .filter((value) => Number.isFinite(value) && value > 0)
    .slice(-limit);

  return values.length >= 2 ? values : [];
}

export function getSparklinePolylinePoints(values: number[], width: number, height: number, padding = 4) {
  if (values.length < 2 || width <= padding * 2 || height <= padding * 2) {
    return null;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;

  return values
    .map((value, index) => {
      const x = padding + (index / (values.length - 1)) * usableWidth;
      const ratio = range === 0 ? 0.5 : (value - min) / range;
      const y = padding + (1 - ratio) * usableHeight;

      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}
