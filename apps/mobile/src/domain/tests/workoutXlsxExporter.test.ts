import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

import { buildWorkoutExportData } from "../workoutExport/workoutExportMapper";
import { createWorkoutXlsx } from "../workoutExport/workoutXlsxExporter";
import { createStep } from "../workouts";

describe("createWorkoutXlsx", () => {
  it("creates localized summary and structure sheets with headers and numeric cells", () => {
    const stage = createStep({ id: "stage", kind: "stage", label: "Główna" });
    const set = createStep({ id: "set", kind: "set", parentStageId: stage.id, setCount: "4" });
    const element = createStep({
      exerciseName: "Przysiad",
      goalType: "repetitions",
      id: "element",
      kind: "exercise",
      loadKg: "80",
      parentSetId: set.id,
      parentStageId: stage.id,
      targetValue: "10"
    });
    const data = buildWorkoutExportData({ name: "Siła", notes: "Żółć", sport: "strength", steps: [stage, set, element] }, "pl");
    const bytes = createWorkoutXlsx(data, "pl", new Date("2026-07-22T10:00:00.000Z"));
    const workbook = XLSX.read(bytes, { type: "array" });

    expect(bytes.byteLength).toBeGreaterThan(1000);
    expect(workbook.SheetNames).toEqual(["Podsumowanie", "Struktura"]);
    const summary = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets.Podsumowanie, { header: 1 });
    const structure = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets.Struktura, { header: 1 });
    expect(summary).toContainEqual(["Nazwa treningu", "Siła"]);
    expect(summary).toContainEqual(["Data eksportu", "2026-07-22T10:00:00.000Z"]);
    expect(structure[0]).toContain("Ćwiczenie");
    expect(structure).toHaveLength(2);
    expect(structure[1]).toContain(80);
    expect(structure[1]).toContain(10);
  });
});
