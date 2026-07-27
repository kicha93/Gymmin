import type { WorkoutExportData, WorkoutExportLocale, WorkoutExportRow } from "./workoutExportTypes";
import { encodeUtf8 } from "./workoutExportEncoding";

export type WorkoutExportColumn = {
  getValue: (row: WorkoutExportRow, locale: WorkoutExportLocale) => unknown;
  labels: Record<WorkoutExportLocale, string>;
  width: number;
};

function formatSeconds(value: number | null): string {
  if (value === null) return "";
  if (value < 60) return `${value} s`;
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return seconds ? `${minutes} min ${seconds} s` : `${minutes} min`;
}

function formatGoal(row: WorkoutExportRow): string {
  if (!row.goalValue) return "";
  const value = row.durationSeconds !== null
    ? formatSeconds(row.durationSeconds)
    : row.goalValue;
  return row.targetComparator ? `${row.targetComparator} ${value}` : value;
}

export const workoutExportColumns: readonly WorkoutExportColumn[] = [
  { getValue: (row) => row.stageName, labels: { en: "Stage", pl: "Etap" }, width: 22 },
  { getValue: (row) => row.stageType, labels: { en: "Type", pl: "Typ" }, width: 16 },
  { getValue: (row) => row.exerciseName, labels: { en: "Exercise", pl: "Ćwiczenie" }, width: 32 },
  { getValue: (row) => row.seriesCount, labels: { en: "Sets", pl: "Serie" }, width: 9 },
  { getValue: (row) => formatGoal(row), labels: { en: "Repetitions / target", pl: "Powtórzenia / cel" }, width: 19 },
  { getValue: (row) => row.weightKg, labels: { en: "Weight (kg)", pl: "Ciężar (kg)" }, width: 13 },
  { getValue: (row) => row.notes, labels: { en: "Notes", pl: "Uwagi" }, width: 38 },
  { getValue: (row) => formatSeconds(row.restSeconds), labels: { en: "Rest", pl: "Przerwa" }, width: 16 }
];

export function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const rawText = String(value);
  const text = typeof value === "string" && /^[\t ]*[=+\-@]/.test(rawText) ? `'${rawText}` : rawText;
  return /[;"\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function createWorkoutCsv(exportData: WorkoutExportData, locale: WorkoutExportLocale): string {
  const header = workoutExportColumns.map((column) => escapeCsvValue(column.labels[locale])).join(";");
  const rows = exportData.rows.map((row) =>
    workoutExportColumns.map((column) => escapeCsvValue(column.getValue(row, locale))).join(";")
  );
  return `\uFEFF${[header, ...rows].join("\r\n")}`;
}

export function createWorkoutCsvBytes(exportData: WorkoutExportData, locale: WorkoutExportLocale): Uint8Array {
  return encodeUtf8(createWorkoutCsv(exportData, locale));
}
