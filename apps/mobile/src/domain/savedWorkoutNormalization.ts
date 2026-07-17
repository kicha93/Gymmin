import type { SavedWorkout, WorkoutSortSettings } from "./savedWorkouts";
import {
  normalizeWorkoutDraftExerciseIds,
  type WorkoutDraft
} from "./workouts";

export const defaultWorkoutSort: WorkoutSortSettings = {
  direction: "desc",
  field: "createdAt"
};

export function repairTextEncoding(value: string) {
  if (!/[\u00c2-\u00c5\u00e2]/.test(value)) {
    return value;
  }

  const replacements: Array<[string, string]> = [
    ["\u00c4\u2026", "\u0105"],
    ["\u00c4\u2021", "\u0107"],
    ["\u00c4\u2122", "\u0119"],
    ["\u00c5\u201a", "\u0142"],
    ["\u00c5\u201e", "\u0144"],
    ["\u00c3\u00b3", "\u00f3"],
    ["\u00c5\u203a", "\u015b"],
    ["\u00c5\u00ba", "\u017a"],
    ["\u00c5\u00bc", "\u017c"],
    ["\u00c4\u201e", "\u0104"],
    ["\u00c4\u2020", "\u0106"],
    ["\u00c4\u02dc", "\u0118"],
    ["\u00c5\u0081", "\u0141"],
    ["\u00c5\u0192", "\u0143"],
    ["\u00c3\u201c", "\u00d3"],
    ["\u00c5\u0160", "\u015a"],
    ["\u00c5\u00b9", "\u0179"],
    ["\u00c5\u00bb", "\u017b"],
    ["\u00e2\u20ac\u017e", "\u201e"],
    ["\u00e2\u20ac\u0153", "\u201c"],
    ["\u00e2\u20ac\u009d", "\u201d"],
    ["\u00e2\u20ac\u2122", "\u2019"],
    ["\u00e2\u20ac\u02dc", "\u2018"],
    ["\u00e2\u20ac\u201c", "-"],
    ["\u00e2\u20ac\u201d", "-"],
    ["\u00e2\u2020\u2019", "\u2192"],
    ["\u00c2\u00b7", "\u00b7"],
    ["\u00c2\u00ae", "\u00ae"],
    ["\u00c2\u00b0", "\u00b0"],
    ["\u00c2\u00a0", " "]
  ];

  return replacements.reduce((text, [from, to]) => text.split(from).join(to), value);
}

export function normalizeWorkoutDraftTextFields(draft: WorkoutDraft): WorkoutDraft {
  const normalizedDraft = normalizeWorkoutDraftExerciseIds(draft);
  return {
    ...normalizedDraft,
    name: repairTextEncoding(draft.name),
    notes: repairTextEncoding(draft.notes),
    steps: normalizedDraft.steps.map((step) => ({
      ...step,
      exerciseName: repairTextEncoding(step.exerciseName),
      label: repairTextEncoding(step.label),
      loadKg: repairTextEncoding(step.loadKg),
      notes: repairTextEncoding(step.notes),
      setCount: repairTextEncoding(step.setCount),
      targetValue: repairTextEncoding(step.targetValue)
    }))
  };
}

export function normalizeSavedWorkoutTextFields(workout: SavedWorkout): SavedWorkout {
  const draft = normalizeWorkoutDraftTextFields(workout.draft);

  return {
    ...workout,
    createdAt: normalizeDateString(workout.createdAt) ?? getFallbackWorkoutCreatedAt(workout),
    draft,
    name: repairTextEncoding(workout.name || draft.name)
  };
}

export function normalizeDateString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}

export function getFallbackWorkoutCreatedAt(workout: Pick<SavedWorkout, "id">) {
  const timestampMatch = workout.id.match(/(\d{10,})/);
  if (timestampMatch) {
    const timestamp = Number(timestampMatch[1]);
    if (Number.isFinite(timestamp)) {
      return new Date(timestamp).toISOString();
    }
  }

  return new Date(0).toISOString();
}

export function normalizeWorkoutSortSettings(value: unknown): WorkoutSortSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return defaultWorkoutSort;
  }

  const candidate = value as Partial<WorkoutSortSettings>;
  return {
    direction: candidate.direction === "asc" || candidate.direction === "desc"
      ? candidate.direction
      : defaultWorkoutSort.direction,
    field: candidate.field === "name" || candidate.field === "createdAt"
      ? candidate.field
      : defaultWorkoutSort.field
  };
}

export function compareWorkouts(
  left: SavedWorkout,
  right: SavedWorkout,
  sort: WorkoutSortSettings
) {
  const directionMultiplier = sort.direction === "asc" ? 1 : -1;
  const nameCompare = left.name.localeCompare(right.name, undefined, { sensitivity: "base" });

  if (sort.field === "name") {
    return (nameCompare || left.id.localeCompare(right.id)) * directionMultiplier;
  }

  const leftCreatedAt = Date.parse(left.createdAt ?? getFallbackWorkoutCreatedAt(left));
  const rightCreatedAt = Date.parse(right.createdAt ?? getFallbackWorkoutCreatedAt(right));
  const dateCompare = (leftCreatedAt || 0) - (rightCreatedAt || 0);
  return (dateCompare || nameCompare || left.id.localeCompare(right.id)) * directionMultiplier;
}
