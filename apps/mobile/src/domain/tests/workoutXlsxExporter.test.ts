import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

import { buildWorkoutExportData } from "../workoutExport/workoutExportMapper";
import { createWorkoutXlsx } from "../workoutExport/workoutXlsxExporter";
import { createStep } from "../workouts";

describe("createWorkoutXlsx", () => {
  it("creates one simple localized workout sheet with readable columns", () => {
    const stage = createStep({ id: "stage", kind: "stage", label: "Główna", stageType: "exercise" });
    const set = createStep({ id: "set", kind: "set", parentStageId: stage.id, setCount: "4" });
    const element = createStep({
      exerciseName: "Przysiad",
      goalType: "repetitions",
      id: "element",
      kind: "exercise",
      loadKg: "80",
      notes: "Pełny zakres",
      parentSetId: set.id,
      parentStageId: stage.id,
      restSeconds: "90",
      targetValue: "10"
    });
    const data = buildWorkoutExportData({ name: "Siła", notes: "Żółć", sport: "strength", steps: [stage, set, element] }, "pl");
    const bytes = createWorkoutXlsx(data, "pl");
    const workbook = XLSX.read(bytes, { type: "array" });

    expect(bytes.byteLength).toBeGreaterThan(1000);
    expect(workbook.SheetNames).toEqual(["Trening"]);
    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets.Trening, { header: 1 });
    expect(rows[0]).toEqual([
      "Etap",
      "Typ",
      "Ćwiczenie",
      "Serie",
      "Powtórzenia / cel",
      "Ciężar (kg)",
      "Uwagi",
      "Przerwa"
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[1]).toEqual(["Główna", "Ćwiczenie", "Przysiad", 4, "10", 80, "Pełny zakres", "1 min 30 s"]);
  });
});
