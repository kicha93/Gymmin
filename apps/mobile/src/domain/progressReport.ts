import {
  calculateSessionVolume,
  getCompletedWorkoutSessions,
  getExerciseKey,
  getSessionDurationMs,
  getSessionStartedAtTime,
  type WorkoutSession,
  type WorkoutSessionEntry
} from "./workoutSessions";

export type ProgressReportPeriod = "week" | "month" | "12weeks";
export type ProgressReportTrendMetric = "volume" | "workouts";

export type ProgressReportDateRange = {
  end: Date;
  start: Date;
};

export type ProgressReportTrendBucket = ProgressReportDateRange & {
  index: number;
  totalVolumeKg: number;
  workoutCount: number;
};

export type ProgressReportRecord = {
  achievedAt: Date;
  estimatedOneRepMaxKg: number;
  exerciseKey: string;
  exerciseName: string;
  repetitions: number;
  sessionId: string;
  weightKg: number;
};

export type ProgressReportStrengthChange = {
  currentEstimatedOneRepMaxKg: number;
  exerciseKey: string;
  exerciseName: string;
  percent: number;
  previousEstimatedOneRepMaxKg: number;
};

export type ProgressReport = {
  allRecords: ProgressReportRecord[];
  biggestProgress: ProgressReportStrengthChange | null;
  changes: {
    newRecordsCount: number;
    strengthPercent: number | null;
    volumePercent: number | null;
    workoutCountChange: number;
  };
  consistency: { weekStreak: number };
  currentRange: ProgressReportDateRange;
  hasAnyHistory: boolean;
  period: ProgressReportPeriod;
  previousRange: ProgressReportDateRange;
  recentRecords: ProgressReportRecord[];
  summary: {
    totalTrainingSeconds: number;
    totalVolumeKg: number;
    workoutCount: number;
  };
  trend: { buckets: ProgressReportTrendBucket[] };
};

type BuildProgressReportOptions = {
  period: ProgressReportPeriod;
  referenceDate: Date;
  sessions: WorkoutSession[];
};

type StrengthObservation = {
  estimatedOneRepMaxKg: number;
  exerciseKey: string;
  exerciseName: string;
};

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function addLocalDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function startOfLocalWeek(date: Date) {
  const start = startOfLocalDay(date);
  const weekday = start.getDay() || 7;
  return addLocalDays(start, 1 - weekday);
}

export function getProgressReportPeriod(
  period: ProgressReportPeriod,
  referenceDate: Date
): ProgressReportDateRange {
  if (period === "week") {
    const start = startOfLocalWeek(referenceDate);
    return { start, end: endOfLocalDay(addLocalDays(start, 6)) };
  }

  if (period === "month") {
    const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
    const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }

  const currentWeekStart = startOfLocalWeek(referenceDate);
  const start = addLocalDays(currentWeekStart, -11 * 7);
  return { start, end: endOfLocalDay(addLocalDays(currentWeekStart, 6)) };
}

export function getPreviousComparisonPeriod(
  period: ProgressReportPeriod,
  referenceDate: Date
): ProgressReportDateRange {
  if (period === "month") {
    return getProgressReportPeriod(
      "month",
      new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1)
    );
  }

  const current = getProgressReportPeriod(period, referenceDate);
  const durationDays = period === "week" ? 7 : 12 * 7;
  const end = endOfLocalDay(addLocalDays(current.start, -1));
  return { start: addLocalDays(current.start, -durationDays), end };
}

export function estimateOneRepMax(weightKg: number, repetitions: number) {
  if (!Number.isFinite(weightKg) || !Number.isFinite(repetitions) || weightKg <= 0 || repetitions <= 0) {
    return null;
  }

  return weightKg * (1 + repetitions / 30);
}

export function calculateExerciseStrengthChange(
  previousEstimatedOneRepMaxKg: number,
  currentEstimatedOneRepMaxKg: number
) {
  if (!Number.isFinite(previousEstimatedOneRepMaxKg)
    || !Number.isFinite(currentEstimatedOneRepMaxKg)
    || previousEstimatedOneRepMaxKg <= 0
    || currentEstimatedOneRepMaxKg <= 0) {
    return null;
  }

  return ((currentEstimatedOneRepMaxKg - previousEstimatedOneRepMaxKg)
    / previousEstimatedOneRepMaxKg) * 100;
}

export function calculateOverallStrengthChange(changes: number[]) {
  const valid = changes.filter(Number.isFinite).sort((left, right) => left - right);
  if (!valid.length) return null;
  const middle = Math.floor(valid.length / 2);
  return valid.length % 2 === 0
    ? (valid[middle - 1] + valid[middle]) / 2
    : valid[middle];
}

function parsePositiveNumber(value: string | undefined) {
  if (!value?.trim()) return null;
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function isInRange(time: number, range: ProgressReportDateRange) {
  return time >= range.start.getTime() && time <= range.end.getTime();
}

function sessionsInRange(sessions: WorkoutSession[], range: ProgressReportDateRange) {
  return sessions.filter((session) => isInRange(getSessionStartedAtTime(session), range));
}

function getStrengthObservation(entry: WorkoutSessionEntry): StrengthObservation | null {
  const weightKg = parsePositiveNumber(entry.actualWeight);
  const repetitions = parsePositiveNumber(entry.actualReps);
  const exerciseKey = getExerciseKey(entry);
  const estimatedOneRepMaxKg = weightKg && repetitions
    ? estimateOneRepMax(weightKg, repetitions)
    : null;
  if (!exerciseKey || estimatedOneRepMaxKg === null) return null;
  return {
    estimatedOneRepMaxKg,
    exerciseKey,
    exerciseName: entry.exerciseName?.trim() || exerciseKey
  };
}

function bestStrengthByExercise(sessions: WorkoutSession[]) {
  const best = new Map<string, StrengthObservation>();
  for (const session of sessions) {
    for (const entry of session.entries) {
      if (entry.type === "warmup" || !entry.isCompleted) continue;
      const observation = getStrengthObservation(entry);
      if (!observation) continue;
      const current = best.get(observation.exerciseKey);
      if (!current || observation.estimatedOneRepMaxKg > current.estimatedOneRepMaxKg) {
        best.set(observation.exerciseKey, observation);
      }
    }
  }
  return best;
}

export function calculateStrengthChanges(
  currentSessions: WorkoutSession[],
  previousSessions: WorkoutSession[]
): ProgressReportStrengthChange[] {
  const current = bestStrengthByExercise(currentSessions);
  const previous = bestStrengthByExercise(previousSessions);
  return Array.from(current.entries()).flatMap(([exerciseKey, currentResult]) => {
    const previousResult = previous.get(exerciseKey);
    if (!previousResult) return [];
    const percent = calculateExerciseStrengthChange(
      previousResult.estimatedOneRepMaxKg,
      currentResult.estimatedOneRepMaxKg
    );
    return percent === null ? [] : [{
      currentEstimatedOneRepMaxKg: currentResult.estimatedOneRepMaxKg,
      exerciseKey,
      exerciseName: currentResult.exerciseName,
      percent,
      previousEstimatedOneRepMaxKg: previousResult.estimatedOneRepMaxKg
    }];
  });
}

function buildRecordCandidates(sessions: WorkoutSession[]) {
  const candidates = new Map<string, ProgressReportRecord>();
  for (const session of sessions) {
    const achievedAt = new Date(getSessionStartedAtTime(session));
    for (const entry of session.entries) {
      if (entry.type === "warmup" || !entry.isCompleted) continue;
      const observation = getStrengthObservation(entry);
      const weightKg = parsePositiveNumber(entry.actualWeight);
      const repetitions = parsePositiveNumber(entry.actualReps);
      if (!observation || weightKg === null || repetitions === null) continue;
      const candidate: ProgressReportRecord = {
        achievedAt,
        estimatedOneRepMaxKg: observation.estimatedOneRepMaxKg,
        exerciseKey: observation.exerciseKey,
        exerciseName: observation.exerciseName,
        repetitions,
        sessionId: session.id,
        weightKg
      };
      const candidateKey = session.id + "|" + observation.exerciseKey;
      const existing = candidates.get(candidateKey);
      if (!existing || candidate.estimatedOneRepMaxKg > existing.estimatedOneRepMaxKg) {
        candidates.set(candidateKey, candidate);
      }
    }
  }
  return Array.from(candidates.values()).sort(
    (left, right) => left.achievedAt.getTime() - right.achievedAt.getTime()
  );
}

export function getProgressReportRecords(sessions: WorkoutSession[]) {
  const bestByExercise = new Map<string, number>();
  const records: ProgressReportRecord[] = [];
  for (const candidate of buildRecordCandidates(getCompletedWorkoutSessions(sessions))) {
    const previousBest = bestByExercise.get(candidate.exerciseKey);
    if (previousBest === undefined) {
      bestByExercise.set(candidate.exerciseKey, candidate.estimatedOneRepMaxKg);
      continue;
    }
    if (candidate.estimatedOneRepMaxKg > previousBest + 0.001) {
      records.push(candidate);
      bestByExercise.set(candidate.exerciseKey, candidate.estimatedOneRepMaxKg);
    }
  }
  return records.sort((left, right) => right.achievedAt.getTime() - left.achievedAt.getTime());
}

export function calculateTrainingWeekStreak(sessions: WorkoutSession[], referenceDate: Date) {
  const completedWeeks = new Set(
    getCompletedWorkoutSessions(sessions).map((session) =>
      startOfLocalWeek(new Date(getSessionStartedAtTime(session))).getTime()
    )
  );
  let cursor = startOfLocalWeek(referenceDate);
  if (!completedWeeks.has(cursor.getTime())) cursor = addLocalDays(cursor, -7);
  let streak = 0;
  while (completedWeeks.has(cursor.getTime())) {
    streak += 1;
    cursor = addLocalDays(cursor, -7);
  }
  return streak;
}

function createTrendBuckets(period: ProgressReportPeriod, range: ProgressReportDateRange) {
  const buckets: ProgressReportTrendBucket[] = [];
  const stepDays = period === "week" ? 1 : 7;
  let start = new Date(range.start);
  let index = 0;
  while (start <= range.end) {
    const end = endOfLocalDay(addLocalDays(start, stepDays - 1));
    buckets.push({
      start: new Date(start),
      end: end > range.end ? new Date(range.end) : end,
      index,
      totalVolumeKg: 0,
      workoutCount: 0
    });
    start = addLocalDays(start, stepDays);
    index += 1;
  }
  return buckets;
}

export function buildProgressReport({
  period,
  referenceDate,
  sessions
}: BuildProgressReportOptions): ProgressReport {
  const completedSessions = getCompletedWorkoutSessions(sessions);
  const currentRange = getProgressReportPeriod(period, referenceDate);
  const previousRange = getPreviousComparisonPeriod(period, referenceDate);
  const currentSessions = sessionsInRange(completedSessions, currentRange);
  const previousSessions = sessionsInRange(completedSessions, previousRange);
  const currentVolume = currentSessions.reduce((sum, session) => sum + calculateSessionVolume(session), 0);
  const previousVolume = previousSessions.reduce((sum, session) => sum + calculateSessionVolume(session), 0);
  const strengthChanges = calculateStrengthChanges(currentSessions, previousSessions);
  const records = getProgressReportRecords(completedSessions);
  const buckets = createTrendBuckets(period, currentRange);

  for (const session of currentSessions) {
    const startedAt = getSessionStartedAtTime(session);
    const bucket = buckets.find((item) => isInRange(startedAt, item));
    if (!bucket) continue;
    bucket.workoutCount += 1;
    bucket.totalVolumeKg += calculateSessionVolume(session);
  }

  const volumePercent = previousVolume > 0
    ? ((currentVolume - previousVolume) / previousVolume) * 100
    : null;
  const biggestProgress = strengthChanges
    .filter((change) => change.percent > 0)
    .sort((left, right) => right.percent - left.percent)[0] ?? null;

  return {
    allRecords: records,
    biggestProgress,
    changes: {
      newRecordsCount: records.filter((record) => isInRange(record.achievedAt.getTime(), currentRange)).length,
      strengthPercent: strengthChanges.length >= 2
        ? calculateOverallStrengthChange(strengthChanges.map((change) => change.percent))
        : null,
      volumePercent,
      workoutCountChange: currentSessions.length - previousSessions.length
    },
    consistency: { weekStreak: calculateTrainingWeekStreak(completedSessions, referenceDate) },
    currentRange,
    hasAnyHistory: completedSessions.length > 0,
    period,
    previousRange,
    recentRecords: records.slice(0, 3),
    summary: {
      totalTrainingSeconds: Math.round(
        currentSessions.reduce((sum, session) => sum + (getSessionDurationMs(session) ?? 0), 0) / 1000
      ),
      totalVolumeKg: currentVolume,
      workoutCount: currentSessions.length
    },
    trend: { buckets }
  };
}

export function formatReportDateRange(range: ProgressReportDateRange, language: "pl" | "en") {
  const plMonths = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];
  const enMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const months = language === "pl" ? plMonths : enMonths;
  const startMonth = months[range.start.getMonth()];
  const endMonth = months[range.end.getMonth()];
  const year = range.end.getFullYear();
  if (range.start.getMonth() === range.end.getMonth() && range.start.getFullYear() === year) {
    return String(range.start.getDate()) + "–" + String(range.end.getDate()) + " " + endMonth + " " + String(year);
  }
  if (range.start.getFullYear() !== year) {
    return String(range.start.getDate()) + " " + startMonth + " " + String(range.start.getFullYear())
      + " – " + String(range.end.getDate()) + " " + endMonth + " " + String(year);
  }
  return String(range.start.getDate()) + " " + startMonth + " – "
    + String(range.end.getDate()) + " " + endMonth + " " + String(year);
}

export function formatTrainingDuration(totalSeconds: number) {
  const safeSeconds = Number.isFinite(totalSeconds) && totalSeconds > 0 ? Math.round(totalSeconds) : 0;
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  if (hours > 0) return String(hours) + "h " + String(minutes) + "m";
  return String(minutes) + "m";
}

export function formatReportVolume(value: number, language: "pl" | "en") {
  const safeValue = Number.isFinite(value) && value > 0 ? value : 0;
  if (safeValue < 1000) return String(Math.round(safeValue)) + " kg";
  const tons = Math.round((safeValue / 1000) * 10) / 10;
  const formatted = Number.isInteger(tons) ? String(tons) : tons.toFixed(1);
  return (language === "pl" ? formatted.replace(".", ",") : formatted) + " t";
}

export function formatProgressPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  return (rounded > 0 ? "+" : "") + String(rounded) + "%";
}
