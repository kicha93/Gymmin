import type { WorkoutExportData, WorkoutExportLocale, WorkoutExportRow } from "./workoutExportTypes";

export type WorkoutExportColumn = {
  key: keyof WorkoutExportRow;
  labels: Record<WorkoutExportLocale, string>;
  width: number;
};

export const workoutExportColumns: readonly WorkoutExportColumn[] = [
  { key: "workoutName", labels: { en: "Workout name", pl: "Nazwa treningu" }, width: 28 },
  { key: "stageOrder", labels: { en: "Stage #", pl: "Etap #" }, width: 9 },
  { key: "stageName", labels: { en: "Stage name", pl: "Nazwa etapu" }, width: 22 },
  { key: "stageType", labels: { en: "Stage type", pl: "Typ etapu" }, width: 16 },
  { key: "stageNotes", labels: { en: "Stage notes", pl: "Uwagi etapu" }, width: 34 },
  { key: "seriesOrder", labels: { en: "Series #", pl: "Seria #" }, width: 9 },
  { key: "seriesName", labels: { en: "Series name", pl: "Nazwa serii" }, width: 18 },
  { key: "seriesCount", labels: { en: "Series count", pl: "Liczba serii" }, width: 13 },
  { key: "elementOrder", labels: { en: "Element #", pl: "Element #" }, width: 10 },
  { key: "elementType", labels: { en: "Element type", pl: "Typ elementu" }, width: 16 },
  { key: "exerciseId", labels: { en: "Exercise ID", pl: "ID ćwiczenia" }, width: 34 },
  { key: "exerciseName", labels: { en: "Exercise", pl: "Ćwiczenie" }, width: 32 },
  { key: "goalType", labels: { en: "Goal type", pl: "Typ celu" }, width: 18 },
  { key: "goalValue", labels: { en: "Goal value", pl: "Wartość celu" }, width: 15 },
  { key: "targetComparator", labels: { en: "Goal comparator", pl: "Porównanie celu" }, width: 18 },
  { key: "intensity", labels: { en: "Intensity", pl: "Intensywność" }, width: 15 },
  { key: "repetitions", labels: { en: "Repetitions", pl: "Powtórzenia" }, width: 13 },
  { key: "weightKg", labels: { en: "Weight (kg)", pl: "Ciężar (kg)" }, width: 13 },
  { key: "durationSeconds", labels: { en: "Duration (s)", pl: "Czas (s)" }, width: 13 },
  { key: "distance", labels: { en: "Distance", pl: "Dystans" }, width: 12 },
  { key: "restSeconds", labels: { en: "Rest (s)", pl: "Odpoczynek (s)" }, width: 15 },
  { key: "notes", labels: { en: "Notes", pl: "Uwagi" }, width: 36 }
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
    workoutExportColumns.map((column) => escapeCsvValue(row[column.key])).join(";")
  );
  return `\uFEFF${[header, ...rows].join("\r\n")}`;
}
