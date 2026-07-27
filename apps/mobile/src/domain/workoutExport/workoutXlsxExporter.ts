import * as XLSX from "xlsx";

import { workoutExportColumns } from "./workoutCsvExporter";
import type { WorkoutExportData, WorkoutExportLocale } from "./workoutExportTypes";

export function createWorkoutXlsx(
  exportData: WorkoutExportData,
  locale: WorkoutExportLocale
): Uint8Array {
  const rows = [
    workoutExportColumns.map((column) => column.labels[locale]),
    ...exportData.rows.map((row) => workoutExportColumns.map((column) => column.getValue(row, locale) ?? ""))
  ];
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = workoutExportColumns.map((column) => ({ wch: column.width }));
  sheet["!autofilter"] = { ref: `A1:H${Math.max(1, rows.length)}` };

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, locale === "pl" ? "Trening" : "Workout");
  const output = XLSX.write(workbook, { bookType: "xlsx", compression: true, type: "array" });
  return output instanceof Uint8Array ? output : new Uint8Array(output);
}
