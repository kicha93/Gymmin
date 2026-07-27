import {
  formatWorkoutDuration,
  normalizeWorkoutRestBetweenSets,
  parseWorkoutDurationSeconds,
  type WorkoutDraft,
  type WorkoutStep
} from "./workouts";
import { resolveExerciseId } from "./exercises";
import { groupWorkoutBuilderSteps } from "./workoutEditor";
import {
  createWorkoutSessionSupersetsFromPlan,
  normalizeWorkoutSessionSupersets
} from "./workoutSessionSupersets";

export type WorkoutExecutionMode =
  | "guided"
  | "readonly-post-workout"
  | "inline-table";

export type WorkoutSessionStatus =
  | "active"
  | "completed"
  | "abandoned";

export type WorkoutSessionEntry = {
  id: string;
  sourceStageId?: string;
  sourceStageName?: string;
  sourceSeriesId?: string;
  sourceElementId?: string;
  exerciseId?: string;
  stageIndex: number;
  seriesIndex: number;
  setIteration: number;
  elementIndex: number;
  type: string;
  exerciseName?: string;
  plannedTargetType?: string;
  plannedTarget?: string;
  plannedWeight?: string;
  actualTarget?: string;
  actualReps?: string;
  actualWeight?: string;
  actualDuration?: string;
  actualCalories?: string;
  actualHeartRate?: string;
  isCompleted: boolean;
  completedAt?: string;
  notes?: string;
};

export type WorkoutSessionSuperset = {
  id: string;
  entryIds: [string, string];
  createdAt: string;
  updatedAt: string;
};

export type WorkoutSession = {
  id: string;
  sourceWorkoutId: string;
  sourceWorkoutName: string;
  executionMode: WorkoutExecutionMode;
  status: WorkoutSessionStatus;
  startedAt: string;
  finishedAt?: string;
  abandonedAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  planSnapshot: WorkoutDraft;
  entries: WorkoutSessionEntry[];
  supersets?: WorkoutSessionSuperset[];
  notes?: string;
};

export type WorkoutSessionsSyncMetadata = {
  lastPulledAt?: string | null;
  lastPushedAt?: string | null;
  userId?: string | null;
};

export const WORKOUT_SESSIONS_LEGACY_SYNC_STORAGE_KEY = "gymmin.workoutSessionsSync";
export const WORKOUT_SESSIONS_STORAGE_BASE_KEY = "workoutSessions";
export const WORKOUT_SESSIONS_SYNC_STORAGE_BASE_KEY = "workoutSessionsSync";
const unknownSessionTimestamp = "1970-01-01T00:00:00.000Z";

function parseSetCount(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 100) : 1;
}

function getStageName(stage: WorkoutStep, fallback: string) {
  return stage.label.trim() || fallback;
}

export function parseNumberInput(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().replace(",", ".");
  if (!normalized) {
    return null;
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function calculateEntryVolume(entry: WorkoutSessionEntry): number | null {
  const weight = parseNumberInput(entry.actualWeight);
  const reps = parseNumberInput(entry.actualReps);

  if (weight === null || reps === null || weight <= 0 || reps <= 0) {
    return null;
  }

  return weight * reps;
}

export function calculateSessionVolume(session: WorkoutSession): number {
  return session.entries.reduce((total, entry) => total + (calculateEntryVolume(entry) ?? 0), 0);
}

export function getCompletedWorkoutSessions(sessions: WorkoutSession[]): WorkoutSession[] {
  return sessions.filter((session) => !session.deletedAt && session.status === "completed");
}

export function getActiveWorkoutSessionsForUi(sessions: WorkoutSession[]): WorkoutSession[] {
  return sessions.filter((session) => !session.deletedAt);
}

export function markWorkoutSessionDeleted(session: WorkoutSession, deletedAt = new Date().toISOString()): WorkoutSession {
  return {
    ...session,
    deletedAt,
    updatedAt: deletedAt
  };
}

export function workoutHasHistory(workoutId: string, sessions: WorkoutSession[]): boolean {
  const normalizedWorkoutId = workoutId.trim();
  if (!normalizedWorkoutId) {
    return false;
  }

  return normalizeWorkoutSessions(sessions).some(
    (session) => !session.deletedAt && session.sourceWorkoutId === normalizedWorkoutId
  );
}

export function getWorkoutSessionStatusLabel(
  status: string,
  labels: { abandoned: string; active: string; completed: string; unknown?: string }
): string {
  if (status === "completed") {
    return labels.completed;
  }

  if (status === "abandoned") {
    return labels.abandoned;
  }

  if (status === "active") {
    return labels.active;
  }

  return labels.unknown ?? status;
}

export function getClientSessionId(session: WorkoutSession): string {
  return session.id;
}

export function getWorkoutSessionUpdatedAt(session: Partial<WorkoutSession>): string {
  const candidates = [
    session.updatedAt,
    session.deletedAt,
    session.finishedAt,
    session.abandonedAt,
    session.startedAt
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "string") {
      continue;
    }

    const time = Date.parse(candidate);
    if (Number.isFinite(time)) {
      return new Date(time).toISOString();
    }
  }

  return unknownSessionTimestamp;
}

function compareSessionVersions(left: WorkoutSession, right: WorkoutSession) {
  const leftUpdatedAt = Date.parse(getWorkoutSessionUpdatedAt(left));
  const rightUpdatedAt = Date.parse(getWorkoutSessionUpdatedAt(right));

  if (leftUpdatedAt !== rightUpdatedAt) {
    return leftUpdatedAt - rightUpdatedAt;
  }

  if (left.deletedAt && !right.deletedAt) {
    return 1;
  }

  if (!left.deletedAt && right.deletedAt) {
    return -1;
  }

  return 0;
}

export function mergeWorkoutSessions(localSessions: WorkoutSession[], remoteSessions: WorkoutSession[]): WorkoutSession[] {
  const merged = new Map<string, WorkoutSession>();

  normalizeWorkoutSessions(localSessions).forEach((session) => {
    const id = getClientSessionId(session);
    merged.set(id, session);
  });

  normalizeWorkoutSessions(remoteSessions).forEach((session) => {
    const id = getClientSessionId(session);
    const existing = merged.get(id);
    if (!existing) {
      merged.set(id, session);
      return;
    }

    if (
      existing.status === "active" &&
      session.status === "active" &&
      !existing.deletedAt &&
      !session.deletedAt
    ) {
      return;
    }

    if (compareSessionVersions(existing, session) <= 0) {
      merged.set(id, session);
    }
  });

  return Array.from(merged.values()).sort((left, right) => getSessionStartedAtTime(right) - getSessionStartedAtTime(left));
}

export function getDeletedWorkoutSessionIds(sessions: WorkoutSession[]): string[] {
  return normalizeWorkoutSessions(sessions)
    .filter((session) => Boolean(session.deletedAt))
    .map(getClientSessionId);
}

function isExecutionMode(value: unknown): value is WorkoutExecutionMode {
  return value === "guided" || value === "readonly-post-workout" || value === "inline-table";
}

function isSessionStatus(value: unknown): value is WorkoutSessionStatus {
  return value === "active" || value === "completed" || value === "abandoned";
}

function cloneWorkoutDraft(value: unknown, fallbackName: string): WorkoutDraft {
  const draft = value as Partial<WorkoutDraft> | null | undefined;
  return {
    name: typeof draft?.name === "string" ? draft.name : fallbackName,
    notes: typeof draft?.notes === "string" ? draft.notes : "",
    sport: draft?.sport === "strength" ? draft.sport : "strength",
    steps: Array.isArray(draft?.steps) ? draft.steps.map((step) => ({ ...step })) as WorkoutStep[] : []
  };
}

function getLegacySourceWorkoutId(value: Record<string, unknown>): string {
  const sourceWorkout = value.sourceWorkout;
  const nestedSourceWorkoutId = sourceWorkout && typeof sourceWorkout === "object"
    ? (sourceWorkout as Record<string, unknown>).id
    : undefined;
  const candidates = [
    value.sourceWorkoutId,
    value.workoutId,
    value.clientWorkoutId,
    nestedSourceWorkoutId
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return "";
}

export function normalizeWorkoutSessions(value: unknown): WorkoutSession[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized: WorkoutSession[] = [];

  value.forEach((item) => {
    if (!item || typeof item !== "object") {
      return;
    }

    const record = item as Record<string, unknown>;
    const raw = item as Partial<WorkoutSession>;
    const id = typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : "";
    if (!id) {
      return;
    }

    const startedAt = getWorkoutSessionUpdatedAt({ startedAt: raw.startedAt });
    const sourceWorkoutName = typeof raw.sourceWorkoutName === "string" && raw.sourceWorkoutName.trim()
      ? raw.sourceWorkoutName
      : typeof raw.planSnapshot?.name === "string" && raw.planSnapshot.name.trim()
        ? raw.planSnapshot.name
        : "Workout";
    const entries = Array.isArray(raw.entries) ? raw.entries
      .filter((entry): entry is WorkoutSessionEntry => Boolean(entry && typeof entry === "object" && typeof entry.id === "string"))
      .map((entry) => ({
        ...entry,
        exerciseId: entry.exerciseId?.trim() ? resolveExerciseId(entry.exerciseId.trim()) : entry.exerciseId
      })) : [];
    const supersets = normalizeWorkoutSessionSupersets(raw.supersets, entries, startedAt);
    const session: WorkoutSession = {
      id,
      sourceWorkoutId: getLegacySourceWorkoutId(record),
      sourceWorkoutName,
      executionMode: isExecutionMode(raw.executionMode) ? raw.executionMode : "guided",
      status: isSessionStatus(raw.status) ? raw.status : "active",
      startedAt: typeof raw.startedAt === "string" ? raw.startedAt : startedAt,
      finishedAt: typeof raw.finishedAt === "string" ? raw.finishedAt : undefined,
      abandonedAt: typeof raw.abandonedAt === "string" ? raw.abandonedAt : undefined,
      updatedAt: getWorkoutSessionUpdatedAt(raw),
      deletedAt: typeof raw.deletedAt === "string" ? raw.deletedAt : null,
      planSnapshot: cloneWorkoutDraft(raw.planSnapshot, sourceWorkoutName),
      entries,
      supersets: supersets.length ? supersets : undefined,
      notes: typeof raw.notes === "string" ? raw.notes : undefined
    };

    normalized.push(session);
  });

  const byId = new Map<string, WorkoutSession>();
  normalized.forEach((session) => {
    const existing = byId.get(session.id);
    if (!existing || compareSessionVersions(existing, session) <= 0) {
      byId.set(session.id, session);
    }
  });

  return Array.from(byId.values()).sort((left, right) => getSessionStartedAtTime(right) - getSessionStartedAtTime(left));
}

export function getSessionStartedAtTime(session: WorkoutSession): number {
  const parsed = Date.parse(session.startedAt);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getSessionDurationMs(session: WorkoutSession): number | null {
  if (!session.finishedAt) {
    return null;
  }

  const startedAt = Date.parse(session.startedAt);
  const finishedAt = Date.parse(session.finishedAt);

  if (!Number.isFinite(startedAt) || !Number.isFinite(finishedAt) || finishedAt <= startedAt) {
    return null;
  }

  return finishedAt - startedAt;
}

function getWeekStart(date: Date) {
  const start = new Date(date);
  const day = start.getDay() || 7;
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - day + 1);
  return start.getTime();
}

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
}

export function getWorkoutHistorySummary(sessions: WorkoutSession[], now = new Date()) {
  const completedSessions = getCompletedWorkoutSessions(sessions);
  const weekStart = getWeekStart(now);
  const monthStart = getMonthStart(now);

  return {
    abandonedWorkouts: getActiveWorkoutSessionsForUi(sessions).filter((session) => session.status === "abandoned").length,
    completedWorkouts: completedSessions.length,
    totalDurationMs: completedSessions.reduce((total, session) => total + (getSessionDurationMs(session) ?? 0), 0),
    workoutsThisMonth: completedSessions.filter((session) => getSessionStartedAtTime(session) >= monthStart).length,
    workoutsThisWeek: completedSessions.filter((session) => getSessionStartedAtTime(session) >= weekStart).length
  };
}

export function getWorkoutSessionDisplayName(session: WorkoutSession): string {
  return session.sourceWorkoutName || session.planSnapshot?.name || "Workout";
}

export function getExerciseKey(entry: WorkoutSessionEntry): string | null {
  if (entry.type === "rest" || !entry.exerciseName?.trim()) {
    return null;
  }

  if (entry.exerciseId?.trim()) {
    return `id:${resolveExerciseId(entry.exerciseId.trim()).toLowerCase()}`;
  }

  return `name:${entry.exerciseName.trim().toLowerCase()}`;
}

export type ExerciseProgressResult = {
  entry: WorkoutSessionEntry;
  session: WorkoutSession;
  volume: number | null;
};

export type ExerciseProgressItem = {
  bestVolumeSingleEntry: number | null;
  bestWeight: number | null;
  exerciseKey: string;
  exerciseName: string;
  lastResult: ExerciseProgressResult;
  results: ExerciseProgressResult[];
  sessionCount: number;
};

export type ExerciseProgressSummary = ExerciseProgressItem & {
  bestReps: number | null;
  estimatedOneRepMax: number | null;
  totalVolumeBySession: Array<{ session: WorkoutSession; volume: number }>;
};

function compareResultsByDate(left: ExerciseProgressResult, right: ExerciseProgressResult) {
  return getSessionStartedAtTime(right.session) - getSessionStartedAtTime(left.session);
}

export function getExerciseProgressItems(sessions: WorkoutSession[]): ExerciseProgressItem[] {
  const grouped = new Map<string, ExerciseProgressResult[]>();
  const displayNames = new Map<string, string>();

  getCompletedWorkoutSessions(sessions).forEach((session) => {
    session.entries.forEach((entry) => {
      const exerciseKey = getExerciseKey(entry);
      if (!exerciseKey) {
        return;
      }

      const result = { entry, session, volume: calculateEntryVolume(entry) };
      grouped.set(exerciseKey, [...(grouped.get(exerciseKey) ?? []), result]);
      displayNames.set(exerciseKey, entry.exerciseName?.trim() || exerciseKey);
    });
  });

  return Array.from(grouped.entries())
    .map(([exerciseKey, results]) => {
      const sortedResults = [...results].sort(compareResultsByDate);
      const weights = sortedResults
        .map((result) => parseNumberInput(result.entry.actualWeight))
        .filter((value): value is number => value !== null);
      const volumes = sortedResults
        .map((result) => result.volume)
        .filter((value): value is number => value !== null);

      return {
        bestVolumeSingleEntry: volumes.length ? Math.max(...volumes) : null,
        bestWeight: weights.length ? Math.max(...weights) : null,
        exerciseKey,
        exerciseName: displayNames.get(exerciseKey) ?? exerciseKey,
        lastResult: sortedResults[0],
        results: sortedResults,
        sessionCount: new Set(sortedResults.map((result) => result.session.id)).size
      };
    })
    .sort((left, right) => left.exerciseName.localeCompare(right.exerciseName));
}

export function getExerciseProgressSummary(
  sessions: WorkoutSession[],
  exerciseKey: string
): ExerciseProgressSummary | null {
  const item = getExerciseProgressItems(sessions).find((progressItem) => progressItem.exerciseKey === exerciseKey);

  if (!item) {
    return null;
  }

  const reps = item.results
    .map((result) => parseNumberInput(result.entry.actualReps))
    .filter((value): value is number => value !== null);
  const oneRepMaxValues = item.results
    .map((result) => {
      const weight = parseNumberInput(result.entry.actualWeight);
      const repsCount = parseNumberInput(result.entry.actualReps);
      if (weight === null || repsCount === null || weight <= 0 || repsCount <= 0) {
        return null;
      }

      return weight * (1 + repsCount / 30);
    })
    .filter((value): value is number => value !== null);
  const volumeBySession = new Map<string, { session: WorkoutSession; volume: number }>();

  item.results.forEach((result) => {
    const volume = result.volume;
    if (volume === null) {
      return;
    }

    const current = volumeBySession.get(result.session.id);
    volumeBySession.set(result.session.id, {
      session: result.session,
      volume: (current?.volume ?? 0) + volume
    });
  });

  return {
    ...item,
    bestReps: reps.length ? Math.max(...reps) : null,
    estimatedOneRepMax: oneRepMaxValues.length ? Math.max(...oneRepMaxValues) : null,
    totalVolumeBySession: Array.from(volumeBySession.values()).sort(
      (left, right) => getSessionStartedAtTime(right.session) - getSessionStartedAtTime(left.session)
    )
  };
}

export function flattenWorkoutToSessionEntries(workout: WorkoutDraft): WorkoutSessionEntry[] {
  const entries: WorkoutSessionEntry[] = [];
  const normalizedWorkout = normalizeWorkoutRestBetweenSets(workout);
  const stages = groupWorkoutBuilderSteps(normalizedWorkout.steps);

  stages.forEach(({ stage, series: stageSets }, stageIndex) => {
    const sourceStageName = getStageName(stage, `Stage ${stageIndex + 1}`);

    stageSets.forEach(({ elements, set: series }, seriesIndex) => {
      const setCount = parseSetCount(series.setCount);

      elements.forEach((element, elementIndex) => {
        for (let iteration = 1; iteration <= setCount; iteration += 1) {
          const entryId = `${stage.id}-${series.id}-${element.id}-${iteration}`;
          entries.push({
            id: entryId,
            sourceElementId: element.id,
            sourceSeriesId: series.id,
            sourceStageId: stage.id,
            sourceStageName,
            stageIndex,
            seriesIndex,
            setIteration: iteration,
            elementIndex,
            type: element.stageType || "exercise",
            exerciseId: element.exerciseId || undefined,
            exerciseName: element.exerciseName || undefined,
            plannedTargetType: element.goalType || undefined,
            plannedTarget: element.targetValue || undefined,
            plannedWeight: element.loadKg || undefined,
            isCompleted: true
          });

          const restSeconds = parseWorkoutDurationSeconds(element.restSeconds);
          if (restSeconds && element.stageType !== "rest") {
            entries.push({
              id: `${entryId}-rest`,
              sourceElementId: `${element.id}-rest`,
              sourceSeriesId: series.id,
              sourceStageId: stage.id,
              sourceStageName,
              stageIndex,
              seriesIndex,
              setIteration: iteration,
              elementIndex: elementIndex + 0.5,
              type: "rest",
              plannedTargetType: "time",
              plannedTarget: formatWorkoutDuration(restSeconds),
              isCompleted: true
            });
          }
        }
      });
    });
  });

  return entries;
}

export function recoverWorkoutRestSecondsFromSessions(
  workout: WorkoutDraft,
  sourceWorkoutId: string,
  sessions: WorkoutSession[]
): WorkoutDraft {
  const relevantSessions = sessions
    .filter((session) => !session.deletedAt && session.sourceWorkoutId === sourceWorkoutId)
    .sort((left, right) => getSessionStartedAtTime(right) - getSessionStartedAtTime(left));
  if (relevantSessions.length === 0) {
    return workout;
  }

  let changed = false;
  const steps = workout.steps.map((step) => {
    if (
      step.kind !== "exercise"
      || step.stageType === "rest"
      || parseWorkoutDurationSeconds(step.restSeconds)
    ) {
      return step;
    }

    for (const session of relevantSessions) {
      const snapshot = normalizeWorkoutRestBetweenSets(session.planSnapshot);
      const snapshotStep = snapshot.steps.find((candidate) => candidate.id === step.id);
      const snapshotRestSeconds = parseWorkoutDurationSeconds(snapshotStep?.restSeconds);
      if (snapshotRestSeconds) {
        changed = true;
        return { ...step, restSeconds: String(snapshotRestSeconds) };
      }

      const anchor = session.entries.find((entry) =>
        entry.type !== "rest" && entry.sourceElementId === step.id
      );
      if (!anchor) {
        continue;
      }

      const restEntry = session.entries
        .filter((entry) =>
          entry.type === "rest"
          && entry.sourceSeriesId === anchor.sourceSeriesId
          && entry.setIteration === anchor.setIteration
          && entry.elementIndex > anchor.elementIndex
        )
        .sort((left, right) => left.elementIndex - right.elementIndex)[0];
      const sessionRestSeconds = parseWorkoutDurationSeconds(restEntry?.plannedTarget);
      if (sessionRestSeconds) {
        changed = true;
        return { ...step, restSeconds: String(sessionRestSeconds) };
      }
    }

    return step;
  });

  return changed ? { ...workout, steps } : workout;
}

export function createWorkoutSessionFromWorkout(
  workout: WorkoutDraft,
  sourceWorkoutId: string,
  executionMode: WorkoutExecutionMode
): WorkoutSession {
  const startedAt = new Date().toISOString();
  const normalizedWorkout = normalizeWorkoutRestBetweenSets(workout);
  const entries = flattenWorkoutToSessionEntries(normalizedWorkout);
  const supersets = executionMode === "guided"
    ? createWorkoutSessionSupersetsFromPlan(normalizedWorkout, entries, startedAt)
    : [];

  return {
    id: `session-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    sourceWorkoutId,
    sourceWorkoutName: normalizedWorkout.name,
    executionMode,
    status: "active",
    startedAt,
    updatedAt: startedAt,
    deletedAt: null,
    planSnapshot: {
      ...normalizedWorkout,
      steps: normalizedWorkout.steps.map((step) => ({ ...step }))
    },
    entries,
    supersets: supersets.length ? supersets : undefined
  };
}

export function completeWorkoutSession(session: WorkoutSession): WorkoutSession {
  const now = new Date().toISOString();
  return {
    ...session,
    status: "completed",
    finishedAt: now,
    updatedAt: now
  };
}

export function abandonWorkoutSession(session: WorkoutSession): WorkoutSession {
  const now = new Date().toISOString();
  return {
    ...session,
    status: "abandoned",
    abandonedAt: now,
    updatedAt: now
  };
}
