import type { LanguageCode } from "../../i18n/translations";

export type WorkoutExportFormat = "csv" | "xlsx";
export type WorkoutExportLocale = LanguageCode;

export type WorkoutExportSummary = {
  workoutName: string;
  workoutNotes: string;
  stageCount: number;
  seriesCount: number;
  exerciseCount: number;
};

export type WorkoutExportRow = {
  workoutName: string;
  stageOrder: number;
  stageName: string;
  stageType: string;
  stageNotes: string;
  seriesOrder: number;
  seriesName: string;
  seriesCount: number | null;
  elementOrder: number;
  elementType: string;
  exerciseId: string;
  exerciseName: string;
  goalType: string;
  goalValue: string;
  targetComparator: string;
  intensity: string;
  repetitions: number | null;
  weightKg: number | null;
  durationSeconds: number | null;
  distance: number | null;
  restSeconds: number | null;
  notes: string;
};

export type WorkoutExportData = {
  rows: WorkoutExportRow[];
  summary: WorkoutExportSummary;
};
