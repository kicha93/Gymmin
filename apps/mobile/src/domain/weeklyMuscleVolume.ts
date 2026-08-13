import { resolveExerciseId, type Exercise, type MuscleKey } from "./exercises";
import { exerciseCatalogDataSource } from "./exerciseCatalogDataSource";
import { groupWorkoutBuilderSteps } from "./workoutEditor";
import type { SavedWorkout } from "./savedWorkouts";
import { getCurrentWeekRange, normalizeWeeklyPlanSettings, type WeeklyPlanSettings } from "./weeklyPlan";
import type { WorkoutSession, WorkoutSessionEntry } from "./workoutSessions";
import type { WorkoutDraft } from "./workouts";

export type WeeklyMuscleVolumeMode = "completed" | "projected";
export type WeeklyMuscleVolumeSide = "front" | "back";
export type WeeklyMuscleVolumeStatus = "none" | "below" | "near" | "inRange" | "high";

export type WeeklyMuscleVolumeGroupId =
  | "chest"
  | "shoulders"
  | "biceps"
  | "core"
  | "quads"
  | "hips"
  | "back"
  | "triceps"
  | "glutes"
  | "hamstrings"
  | "calves"
  | "forearms";

export type WeeklyMuscleVolumeGroup = {
  id: WeeklyMuscleVolumeGroupId;
  muscleKeys: readonly MuscleKey[];
  sides: readonly WeeklyMuscleVolumeSide[];
};

export type WeeklyMuscleVolumeEntry = WeeklyMuscleVolumeGroup & {
  completedSets: number;
  projectedSets: number;
  completedStatus: WeeklyMuscleVolumeStatus;
  projectedStatus: WeeklyMuscleVolumeStatus;
  targetMin: number;
  targetMax: number;
};

export type WeeklyMuscleVolumeSummary = {
  entries: WeeklyMuscleVolumeEntry[];
  hasActivity: boolean;
};

export const weeklyMuscleVolumeRecommendation = {
  targetMin: 10,
  targetMax: 20,
  nearTargetRatio: 0.75
} as const;

export const weeklyMuscleVolumeGroups: readonly WeeklyMuscleVolumeGroup[] = [
  { id: "chest", muscleKeys: ["chest"], sides: ["front"] },
  { id: "shoulders", muscleKeys: ["shoulders"], sides: ["front", "back"] },
  { id: "biceps", muscleKeys: ["biceps"], sides: ["front"] },
  { id: "core", muscleKeys: ["abs", "obliques"], sides: ["front"] },
  { id: "quads", muscleKeys: ["quads"], sides: ["front"] },
  { id: "hips", muscleKeys: ["hips", "abductors", "adductors"], sides: ["front"] },
  { id: "back", muscleKeys: ["lats", "traps", "lowerBack"], sides: ["back"] },
  { id: "triceps", muscleKeys: ["triceps"], sides: ["back"] },
  { id: "glutes", muscleKeys: ["glutes"], sides: ["back"] },
  { id: "hamstrings", muscleKeys: ["hamstrings"], sides: ["back"] },
  { id: "calves", muscleKeys: ["calves"], sides: ["back"] },
  { id: "forearms", muscleKeys: ["forearm"], sides: ["front", "back"] }
] as const;

const groupByMuscle = new Map<MuscleKey, WeeklyMuscleVolumeGroup>();
for (const group of weeklyMuscleVolumeGroups) {
  for (const muscle of group.muscleKeys) {
    groupByMuscle.set(muscle, group);
  }
}

export function getWeeklyMuscleVolumeGroupForMuscle(muscle: MuscleKey) {
  return groupByMuscle.get(muscle);
}

export function getWeeklyMuscleVolumeEntriesForSide(
  summary: WeeklyMuscleVolumeSummary,
  side: WeeklyMuscleVolumeSide
) {
  return summary.entries.filter((entry) =>
    entry.sides.includes(side)
    && (entry.completedSets > 0 || entry.projectedSets > 0)
  );
}

export function getFractionalSetWeight(score: number): number {
  if (score === 5) return 1;
  if (score === 4 || score === 3) return 0.5;
  return 0;
}

export function getWeeklyMuscleVolumeStatus(
  sets: number,
  recommendation = weeklyMuscleVolumeRecommendation
): WeeklyMuscleVolumeStatus {
  if (sets <= 0) return "none";
  if (sets < recommendation.targetMin * recommendation.nearTargetRatio) return "below";
  if (sets < recommendation.targetMin) return "near";
  if (sets <= recommendation.targetMax) return "inRange";
  return "high";
}

export function formatWeeklyMuscleSets(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function emptyVolumeMap() {
  return new Map<WeeklyMuscleVolumeGroupId, number>(
    weeklyMuscleVolumeGroups.map((group) => [group.id, 0])
  );
}

function addExerciseSet(
  totals: Map<WeeklyMuscleVolumeGroupId, number>,
  exercise: Exercise
) {
  for (const group of weeklyMuscleVolumeGroups) {
    // A compound set can affect multiple catalog muscles in one dashboard
    // group. Taking the maximum prevents one physical set from being counted
    // two or three times as, for example, "back" volume.
    const contribution = Math.max(
      0,
      ...group.muscleKeys.map((muscle) => getFractionalSetWeight(exercise.muscleImpact[muscle]))
    );
    if (contribution > 0) {
      totals.set(group.id, (totals.get(group.id) ?? 0) + contribution);
    }
  }
}

function parseSetCount(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 100) : 1;
}

function buildExerciseMap(exercises: readonly Exercise[]) {
  return new Map(exercises.map((exercise) => [exercise.id, exercise]));
}

function resolveFromMap(exerciseId: string | undefined, exerciseMap: Map<string, Exercise>) {
  if (!exerciseId?.trim()) return undefined;
  return exerciseMap.get(resolveExerciseId(exerciseId.trim()));
}

function addPlannedWorkoutVolume(
  totals: Map<WeeklyMuscleVolumeGroupId, number>,
  draft: WorkoutDraft,
  exerciseMap: Map<string, Exercise>
) {
  for (const { stage, series } of groupWorkoutBuilderSteps(draft.steps)) {
    if (stage.stageType !== "exercise") continue;
    for (const { elements, set } of series) {
      const setCount = parseSetCount(set.setCount);
      for (const element of elements) {
        if (element.stageType === "rest") continue;
        const exercise = resolveFromMap(element.exerciseId, exerciseMap);
        if (!exercise) continue;
        for (let iteration = 0; iteration < setCount; iteration += 1) {
          addExerciseSet(totals, exercise);
        }
      }
    }
  }
}

export function isWorkoutSessionEntryActuallyCompleted(entry: WorkoutSessionEntry) {
  if (!entry.isCompleted || entry.type !== "exercise") return false;
  if (entry.completedAt && Number.isFinite(Date.parse(entry.completedAt))) return true;
  return [entry.actualReps, entry.actualWeight, entry.actualDuration, entry.actualTarget]
    .some((value) => typeof value === "string" && value.trim().length > 0);
}

function addCompletedSessionVolume(
  totals: Map<WeeklyMuscleVolumeGroupId, number>,
  session: WorkoutSession,
  exerciseMap: Map<string, Exercise>
) {
  for (const entry of session.entries) {
    if (!isWorkoutSessionEntryActuallyCompleted(entry)) continue;
    const exercise = resolveFromMap(entry.exerciseId, exerciseMap);
    if (exercise) addExerciseSet(totals, exercise);
  }
}

function sessionMatchesWorkout(session: WorkoutSession, workoutId: string) {
  const legacy = session as WorkoutSession & { workoutId?: string; clientWorkoutId?: string };
  return session.sourceWorkoutId === workoutId
    || legacy.workoutId === workoutId
    || legacy.clientWorkoutId === workoutId;
}

export function buildWeeklyMuscleVolumeSummary({
  exercises = exerciseCatalogDataSource.getAvailableExercises(),
  now = new Date(),
  plan,
  sessions,
  workouts
}: {
  exercises?: readonly Exercise[];
  now?: Date;
  plan: WeeklyPlanSettings;
  sessions: readonly WorkoutSession[];
  workouts: readonly SavedWorkout[];
}): WeeklyMuscleVolumeSummary {
  const range = getCurrentWeekRange(now);
  const exerciseMap = buildExerciseMap(exercises);
  const completedTotals = emptyVolumeMap();
  const projectedTotals = emptyVolumeMap();
  const currentWeekSessions = sessions.filter((session) => {
    if (session.status !== "completed" || session.deletedAt) return false;
    const startedAt = new Date(session.startedAt);
    return Number.isFinite(startedAt.getTime()) && startedAt >= range.start && startedAt <= range.end;
  });

  for (const session of currentWeekSessions) {
    addCompletedSessionVolume(completedTotals, session, exerciseMap);
    addCompletedSessionVolume(projectedTotals, session, exerciseMap);
  }

  const workoutById = new Map(workouts.map((workout) => [workout.id, workout]));
  const availableCompletionsByWorkoutId = new Map<string, number>();
  for (const workout of workouts) {
    const completionCount = currentWeekSessions.filter((session) => sessionMatchesWorkout(session, workout.id)).length;
    if (completionCount > 0) availableCompletionsByWorkoutId.set(workout.id, completionCount);
  }

  const consumedByWorkoutId = new Map<string, number>();
  for (const item of normalizeWeeklyPlanSettings(plan, now).items) {
    const workout = workoutById.get(item.workoutId);
    if (!workout) continue;
    const consumed = consumedByWorkoutId.get(item.workoutId) ?? 0;
    const completedOccurrences = availableCompletionsByWorkoutId.get(item.workoutId) ?? 0;
    if (consumed < completedOccurrences) {
      consumedByWorkoutId.set(item.workoutId, consumed + 1);
      continue;
    }
    addPlannedWorkoutVolume(projectedTotals, workout.draft, exerciseMap);
  }

  const entries = weeklyMuscleVolumeGroups.map((group) => {
    const completedSets = completedTotals.get(group.id) ?? 0;
    const projectedSets = projectedTotals.get(group.id) ?? 0;
    return {
      ...group,
      completedSets,
      projectedSets,
      completedStatus: getWeeklyMuscleVolumeStatus(completedSets),
      projectedStatus: getWeeklyMuscleVolumeStatus(projectedSets),
      targetMin: weeklyMuscleVolumeRecommendation.targetMin,
      targetMax: weeklyMuscleVolumeRecommendation.targetMax
    };
  });

  return {
    entries,
    hasActivity: entries.some((entry) => entry.completedSets > 0 || entry.projectedSets > 0)
  };
}
