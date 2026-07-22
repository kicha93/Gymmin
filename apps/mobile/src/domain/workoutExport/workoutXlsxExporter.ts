import * as XLSX from "xlsx";

import { workoutExportColumns } from "./workoutCsvExporter";
import type { WorkoutExportData, WorkoutExportLocale } from "./workoutExportTypes";

const summaryLabels = {
  en: {
    exerciseCount: "Exercise count",
    exportDate: "Export date",
    field: "Field",
    seriesCount: "Series count",
    stageCount: "Stage count",
    structure: "Structure",
    summary: "Summary",
    value: "Value",
    workoutName: "Workout name",
    workoutNotes: "Notes"
  },
  pl: {
    exerciseCount: "Liczba ćwiczeń",
    exportDate: "Data eksportu",
    field: "Pole",
    seriesCount: "Liczba serii",
    stageCount: "Liczba etapów",
    structure: "Struktura",
    summary: "Podsumowanie",
    value: "Wartość",
    workoutName: "Nazwa treningu",
    workoutNotes: "Uwagi"
  }
} as const;

export function createWorkoutXlsx(
  exportData: WorkoutExportData,
  locale: WorkoutExportLocale,
  exportedAt = new Date()
): Uint8Array {
  const labels = summaryLabels[locale];
  const summarySheet = XLSX.utils.aoa_to_sheet([
    [labels.field, labels.value],
    [labels.workoutName, exportData.summary.workoutName],
    [labels.workoutNotes, exportData.summary.workoutNotes],
    [labels.stageCount, exportData.summary.stageCount],
    [labels.seriesCount, exportData.summary.seriesCount],
    [labels.exerciseCount, exportData.summary.exerciseCount],
    [labels.exportDate, exportedAt.toISOString()]
  ]);
  summarySheet["!cols"] = [{ wch: 22 }, { wch: 48 }];

  const structureRows = [
    workoutExportColumns.map((column) => column.labels[locale]),
    ...exportData.rows.map((row) => workoutExportColumns.map((column) => row[column.key] ?? ""))
  ];
  const structureSheet = XLSX.utils.aoa_to_sheet(structureRows);
  structureSheet["!cols"] = workoutExportColumns.map((column) => ({ wch: column.width }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, summarySheet, labels.summary);
  XLSX.utils.book_append_sheet(workbook, structureSheet, labels.structure);
  const output = XLSX.write(workbook, { bookType: "xlsx", compression: true, type: "array" });
  return output instanceof Uint8Array ? output : new Uint8Array(output);
}
