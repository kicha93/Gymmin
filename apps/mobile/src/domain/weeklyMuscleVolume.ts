import { resolveExerciseId, type Exercise, type MuscleKey } from "./exercises";
import {
  getAdvancedExerciseProfile,
  getAdvancedMuscleSubdivision,
  type AdvancedMuscleSubdivisionId
} from "./advancedMuscles";
import { exerciseCatalogDataSource } from "./exerciseCatalogDataSource";
import { groupWorkoutBuilderSteps } from "./workoutEditor";
import type { SavedWorkout } from "./savedWorkouts";
import { getCurrentWeekRange, normalizeWeeklyPlanSettings, type WeeklyPlanSettings } from "./weeklyPlan";
import type { WorkoutSession, WorkoutSessionEntry } from "./workoutSessions";
import type { WorkoutDraft } from "./workouts";
import {
  getWeeklyVolumeRole,
  getWeeklyVolumeRoleForMuscles,
  getWeeklyVolumeRoleWeight
} from "./weeklyVolumeClassifier";

export type WeeklyMuscleVolumeMode = "completed" | "projected";
export type WeeklyMuscleVolumeSide = "front" | "back";
export type WeeklyVolumeBand = "none" | "low" | "moderate" | "high" | "veryHigh";

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

export type WeeklyAdvancedMuscleExposure = {
  completedExposure: number;
  id: string;
  muscle?: MuscleKey;
  projectedExposure: number;
  sides: readonly WeeklyMuscleVolumeSide[];
  subdivisionId?: AdvancedMuscleSubdivisionId;
};

export type WeeklyMuscleVolumeEntry = WeeklyMuscleVolumeGroup & {
  advancedExposure: WeeklyAdvancedMuscleExposure[];
  completedSets: number;
  projectedSets: number;
  completedStatus: WeeklyVolumeBand;
  projectedStatus: WeeklyVolumeBand;
};

export type WeeklyMuscleVolumeSummary = {
  entries: WeeklyMuscleVolumeEntry[];
  hasActivity: boolean;
};

export const weeklyVolumeBandThresholds = {
  lowMax: 4.5,
  moderateMax: 9.5,
  highMax: 20,
  visualScaleMax: 20
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

export function getWeeklyVolumeBand(sets: number): WeeklyVolumeBand {
  if (sets <= 0) return "none";
  if (sets <= weeklyVolumeBandThresholds.lowMax) return "low";
  if (sets <= weeklyVolumeBandThresholds.moderateMax) return "moderate";
  if (sets <= weeklyVolumeBandThresholds.highMax) return "high";
  return "veryHigh";
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

type AdvancedExposureMap = Map<WeeklyMuscleVolumeGroupId, Map<string, number>>;

function emptyAdvancedExposureMap(): AdvancedExposureMap {
  return new Map(weeklyMuscleVolumeGroups.map((group) => [group.id, new Map()]));
}

function addAdvancedExposure(
  totals: AdvancedExposureMap,
  groupId: WeeklyMuscleVolumeGroupId,
  id: string,
  contribution: number
) {
  if (contribution <= 0) return;
  const groupTotals = totals.get(groupId);
  if (!groupTotals) return;
  groupTotals.set(id, (groupTotals.get(id) ?? 0) + contribution);
}

function addExerciseAdvancedExposure(
  totals: AdvancedExposureMap,
  exercise: Exercise
) {
  const mappedParents = new Map(
    (getAdvancedExerciseProfile(exercise.id)?.parents ?? []).map((parent) => [parent.standardParentMuscle, parent])
  );

  for (const group of weeklyMuscleVolumeGroups) {
    for (const muscle of group.muscleKeys) {
      const roleWeight = getWeeklyVolumeRoleWeight(getWeeklyVolumeRole(exercise, muscle));
      if (roleWeight <= 0) continue;
      const parent = mappedParents.get(muscle);
      if (parent?.status === "mapped") {
        for (const [subdivisionId, level] of parent.engagement) {
          // The 0-5 advanced level describes relative involvement. Multiplying
          // it by the already-approved weekly role weight creates a comparison
          // score, not a new set count or muscle-specific recommendation.
          addAdvancedExposure(totals, group.id, subdivisionId, roleWeight * (level / 5));
        }
      } else {
        // Some useful structures intentionally have no subdivision in v1
        // (for example latissimus dorsi). Keep their exposure visible instead
        // of making the detailed view imply that they did no work.
        addAdvancedExposure(totals, group.id, `muscle:${muscle}`, roleWeight);
      }
    }
  }
}

function addExerciseSet(
  totals: Map<WeeklyMuscleVolumeGroupId, number>,
  advancedTotals: AdvancedExposureMap,
  exercise: Exercise
) {
  for (const group of weeklyMuscleVolumeGroups) {
    // A compound set can affect multiple catalog muscles in one dashboard
    // group. Taking the maximum prevents one physical set from being counted
    // two or three times as, for example, "back" volume.
    const contribution = getWeeklyVolumeRoleWeight(
      getWeeklyVolumeRoleForMuscles(exercise, group.muscleKeys)
    );
    if (contribution > 0) {
      totals.set(group.id, (totals.get(group.id) ?? 0) + contribution);
    }
  }
  addExerciseAdvancedExposure(advancedTotals, exercise);
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
  advancedTotals: AdvancedExposureMap,
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
          addExerciseSet(totals, advancedTotals, exercise);
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
  advancedTotals: AdvancedExposureMap,
  session: WorkoutSession,
  exerciseMap: Map<string, Exercise>
) {
  for (const entry of session.entries) {
    if (!isWorkoutSessionEntryActuallyCompleted(entry)) continue;
    const exercise = resolveFromMap(entry.exerciseId, exerciseMap);
    if (exercise) addExerciseSet(totals, advancedTotals, exercise);
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
  const completedAdvancedTotals = emptyAdvancedExposureMap();
  const projectedAdvancedTotals = emptyAdvancedExposureMap();
  const currentWeekSessions = sessions.filter((session) => {
    if (session.status !== "completed" || session.deletedAt) return false;
    const startedAt = new Date(session.startedAt);
    return Number.isFinite(startedAt.getTime()) && startedAt >= range.start && startedAt <= range.end;
  });

  for (const session of currentWeekSessions) {
    addCompletedSessionVolume(completedTotals, completedAdvancedTotals, session, exerciseMap);
    addCompletedSessionVolume(projectedTotals, projectedAdvancedTotals, session, exerciseMap);
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
    addPlannedWorkoutVolume(projectedTotals, projectedAdvancedTotals, workout.draft, exerciseMap);
  }

  const entries = weeklyMuscleVolumeGroups.map((group) => {
    const completedSets = completedTotals.get(group.id) ?? 0;
    const projectedSets = projectedTotals.get(group.id) ?? 0;
    const completedAdvanced = completedAdvancedTotals.get(group.id) ?? new Map<string, number>();
    const projectedAdvanced = projectedAdvancedTotals.get(group.id) ?? new Map<string, number>();
    const advancedIds = new Set([...completedAdvanced.keys(), ...projectedAdvanced.keys()]);
    const advancedExposure = [...advancedIds].map((id): WeeklyAdvancedMuscleExposure => {
      if (id.startsWith("muscle:")) {
        const muscle = id.slice("muscle:".length) as MuscleKey;
        return {
          completedExposure: completedAdvanced.get(id) ?? 0,
          id,
          muscle,
          projectedExposure: projectedAdvanced.get(id) ?? 0,
          sides: group.sides
        };
      }
      const subdivisionId = id as AdvancedMuscleSubdivisionId;
      const subdivision = getAdvancedMuscleSubdivision(subdivisionId);
      const sides: readonly WeeklyMuscleVolumeSide[] = subdivision?.side === "both"
        ? ["front", "back"]
        : subdivision?.side
          ? [subdivision.side]
          : group.sides;
      return {
        completedExposure: completedAdvanced.get(id) ?? 0,
        id,
        projectedExposure: projectedAdvanced.get(id) ?? 0,
        sides,
        subdivisionId
      };
    });
    return {
      ...group,
      advancedExposure,
      completedSets,
      projectedSets,
      completedStatus: getWeeklyVolumeBand(completedSets),
      projectedStatus: getWeeklyVolumeBand(projectedSets)
    };
  });

  return {
    entries,
    hasActivity: entries.some((entry) => entry.completedSets > 0 || entry.projectedSets > 0)
  };
}
