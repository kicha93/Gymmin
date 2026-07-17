import { getExerciseDisplayName, resolveExerciseId } from "./exercises";
import { getExerciseProgressSummary, type WorkoutSession, type WorkoutSessionEntry } from "./workoutSessions";
import { formatExerciseSetTarget } from "./workoutExerciseSummary";
import { createStep, type GoalType, type StageType, type WorkoutStep } from "./workouts";
import type { LanguageCode } from "../i18n/translations";

export type GuidedWorkoutEntryGroup = {
  entries: WorkoutSessionEntry[];
  firstIndex: number;
  key: string;
  restEntry?: WorkoutSessionEntry;
};

export type InlineWorkoutEntryGroup = {
  entries: WorkoutSessionEntry[];
  key: string;
  previewStep: WorkoutStep;
  title: string;
};

export function clampWorkoutSessionEntryIndex(
  entryIndex: unknown,
  session?: WorkoutSession | null
) {
  const parsed = typeof entryIndex === "number"
    ? entryIndex
    : Number.parseInt(String(entryIndex ?? ""), 10);
  const safeIndex = Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
  const maxIndex = Math.max(0, (session?.entries.length ?? 1) - 1);
  return Math.min(safeIndex, maxIndex);
}

export function getSessionEntryPreviewStep(
  session: WorkoutSession,
  entry: WorkoutSessionEntry
): WorkoutStep {
  const sourceStep = session.planSnapshot.steps.find(
    (step) => step.kind === "exercise" && step.id === entry.sourceElementId
  );

  if (sourceStep) {
    return sourceStep;
  }

  return createStep({
    exerciseId: entry.exerciseId ?? "",
    exerciseName: entry.exerciseName ?? "",
    goalType: (entry.plannedTargetType as GoalType | "") || "",
    id: entry.sourceElementId ?? entry.id,
    kind: "exercise",
    loadKg: entry.plannedWeight ?? "",
    stageType: (entry.type as StageType | "") || "",
    targetValue: entry.plannedTarget ?? ""
  });
}

export function getSessionEntrySetTarget(entry: WorkoutSessionEntry, setCount = "1") {
  return formatExerciseSetTarget(
    createStep({
      exerciseName: entry.exerciseName ?? "",
      goalType: (entry.plannedTargetType as GoalType | "") || "",
      kind: "exercise",
      loadKg: entry.plannedWeight ?? "",
      stageType: (entry.type as StageType | "") || "",
      targetValue: entry.plannedTarget ?? "",
      setCount
    })
  );
}

export function getGuidedEntryGroups(session: WorkoutSession): GuidedWorkoutEntryGroup[] {
  const exerciseEntries = session.entries.filter((entry) => entry.type !== "rest");
  const sourceEntries = exerciseEntries.length ? exerciseEntries : session.entries;
  const groups: GuidedWorkoutEntryGroup[] = [];
  const grouped = new Map<string, GuidedWorkoutEntryGroup>();

  sourceEntries.forEach((entry) => {
    const key = [entry.sourceStageId, entry.sourceSeriesId, entry.sourceElementId ?? entry.id]
      .filter(Boolean)
      .join(":");
    const firstIndex = session.entries.findIndex((item) => item.id === entry.id);
    const existing = grouped.get(key);

    if (existing) {
      existing.entries.push(entry);
      return;
    }

    const group = { entries: [entry], firstIndex, key };
    grouped.set(key, group);
    groups.push(group);
  });

  return groups.map((group) => {
    const referenceEntry = group.entries[0];
    const restEntry = session.entries.find(
      (entry) =>
        entry.type === "rest" &&
        entry.sourceSeriesId === referenceEntry.sourceSeriesId &&
        entry.elementIndex > referenceEntry.elementIndex
    );

    return { ...group, restEntry };
  });
}

export function getGuidedGroupIndex(
  groups: Array<Pick<GuidedWorkoutEntryGroup, "entries" | "firstIndex">>,
  entryIndex: number,
  currentEntry?: WorkoutSessionEntry
) {
  const directIndex = groups.findIndex((group) =>
    group.entries.some((entry) => entry.id === currentEntry?.id)
  );

  if (directIndex >= 0) {
    return directIndex;
  }

  const nextIndex = groups.findIndex((group) => group.firstIndex >= entryIndex);
  return nextIndex >= 0 ? nextIndex : Math.max(0, groups.length - 1);
}

export function getWorkoutSessionEntryProgressKey(entry?: WorkoutSessionEntry) {
  if (entry?.exerciseId?.trim()) {
    return `id:${resolveExerciseId(entry.exerciseId.trim()).toLowerCase()}`;
  }

  if (entry?.exerciseName?.trim()) {
    return `name:${entry.exerciseName.trim().toLowerCase()}`;
  }

  return null;
}

export function getPreviousExerciseValues(
  entries: WorkoutSessionEntry[],
  workoutSessions: WorkoutSession[]
) {
  const referenceEntry = entries.find((entry) => entry.exerciseId?.trim() || entry.exerciseName?.trim());
  const progressKey = getWorkoutSessionEntryProgressKey(referenceEntry);
  const summary = progressKey ? getExerciseProgressSummary(workoutSessions, progressKey) : null;
  const previousEntry = summary?.lastResult.entry;

  return {
    reps: previousEntry?.actualReps?.trim() || "",
    weight: previousEntry?.actualWeight?.trim() || ""
  };
}

export function groupInlineWorkoutEntries(
  session: WorkoutSession,
  isEntryVisible: (entry: WorkoutSessionEntry) => boolean,
  language: LanguageCode,
  formatEntryTitle: (entry: WorkoutSessionEntry) => string
): InlineWorkoutEntryGroup[] {
  return session.entries.filter(isEntryVisible).reduce<InlineWorkoutEntryGroup[]>((groups, entry) => {
    const previewStep = getSessionEntryPreviewStep(session, entry);
    const title = previewStep.exerciseName
      ? getExerciseDisplayName(previewStep.exerciseName, language)
      : formatEntryTitle(entry);
    const normalizedTitle = title.trim().toLowerCase();
    const key = entry.exerciseId
      ? `id:${entry.exerciseId}`
      : entry.sourceElementId
        ? `step:${entry.sourceElementId}`
        : `name:${normalizedTitle || entry.id}`;
    const existingGroup = groups.find((group) => group.key === key);

    if (existingGroup) {
      existingGroup.entries.push(entry);
      return groups;
    }

    groups.push({ entries: [entry], key, previewStep, title });
    return groups;
  }, []);
}
