import type { Dispatch, SetStateAction } from "react";

import type { SavedWorkout } from "../../domain/savedWorkouts";
import {
  addWorkoutStep,
  moveWorkoutStep,
  removeWorkoutStep,
  updateWorkoutStep
} from "../../domain/workoutEditor";
import { createDefaultWorkout, type StageType, type WorkoutDraft, type WorkoutStep, type WorkoutStepKind } from "../../domain/workouts";

type Options = {
  defaultSetCount: string;
  defaultStageType: StageType;
  editingWorkoutId: string | null;
  onNavigate: (screen: "builder" | "workoutDetail") => void;
  onSave: (workout: SavedWorkout) => void;
  savedWorkouts: SavedWorkout[];
  setEditingWorkoutId: Dispatch<SetStateAction<string | null>>;
  setSavedWorkouts: Dispatch<SetStateAction<SavedWorkout[]>>;
  setSelectedWorkoutId: Dispatch<SetStateAction<string>>;
  setWorkout: Dispatch<SetStateAction<WorkoutDraft>>;
  workout: WorkoutDraft;
};

export function useWorkoutEditorController(options: Options) {
  const updateStep = (stepId: string, nextStep: WorkoutStep) =>
    options.setWorkout((current) => updateWorkoutStep(current, stepId, nextStep));
  const removeStep = (stepId: string) => options.setWorkout((current) => removeWorkoutStep(current, stepId));
  const moveStep = (stepId: string, direction: -1 | 1) =>
    options.setWorkout((current) => moveWorkoutStep(current, stepId, direction));
  const addStep = (kind: WorkoutStepKind) => options.setWorkout((current) =>
    addWorkoutStep(current, kind, options.defaultStageType, options.defaultSetCount));

  function openNew() {
    options.setEditingWorkoutId(null);
    options.setWorkout(createDefaultWorkout());
    options.onNavigate("builder");
  }

  function openExisting(workoutId: string) {
    const savedWorkout = options.savedWorkouts.find((item) => item.id === workoutId);
    if (!savedWorkout) return;
    options.setSelectedWorkoutId(workoutId);
    options.setEditingWorkoutId(workoutId);
    options.setWorkout({ ...savedWorkout.draft, steps: savedWorkout.draft.steps.map((step) => ({ ...step })) });
    options.onNavigate("builder");
  }

  function save() {
    const normalizedName = options.workout.name.trim() || "Nowy trening";
    const existing = options.editingWorkoutId
      ? options.savedWorkouts.find((item) => item.id === options.editingWorkoutId)
      : null;
    const nextWorkout: SavedWorkout = {
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      draft: { ...options.workout, name: normalizedName, steps: options.workout.steps.map((step) => ({ ...step })) },
      id: options.editingWorkoutId ?? `workout-${Date.now()}`,
      name: normalizedName
    };
    options.setSavedWorkouts((current) => options.editingWorkoutId
      ? current.map((item) => item.id === options.editingWorkoutId ? nextWorkout : item)
      : [nextWorkout, ...current]);
    options.setSelectedWorkoutId(nextWorkout.id);
    options.setEditingWorkoutId(null);
    options.onNavigate("workoutDetail");
    options.onSave(nextWorkout);
  }

  return { addStep, moveStep, openExisting, openNew, removeStep, save, updateStep };
}
