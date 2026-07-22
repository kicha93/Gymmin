import { describe, expect, it } from "vitest";

import { createWorkoutCsv, escapeCsvValue, workoutExportColumns } from "../workoutExport/workoutCsvExporter";
import { buildWorkoutExportData } from "../workoutExport/workoutExportMapper";
import { createStep, type WorkoutDraft } from "../workouts";

function simpleWorkout(notes = ""): WorkoutDraft {
  const stage = createStep({ id: "stage", kind: "stage", label: "Nogi" });
  const set = createStep({ id: "set", kind: "set", parentStageId: stage.id, setCount: "4" });
  const element = createStep({
    exerciseName: "Przysiad",
    goalType: "repetitions",
    id: "element",
    kind: "exercise",
    loadKg: "100",
    notes,
    parentSetId: set.id,
    parentStageId: stage.id,
    targetValue: "12"
  });
  return { name: "Trening nóg", notes: "", sport: "strength", steps: [stage, set, element] };
}

describe("CSV workout export", () => {
  it("uses UTF-8 BOM, semicolons, Polish headers, numbers and the expected column count", () => {
    const csv = createWorkoutCsv(buildWorkoutExportData(simpleWorkout(), "pl"), "pl");
    const [header, row] = csv.slice(1).split("\r\n");

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(header).toContain("Nazwa treningu;Etap #");
    expect(header.split(";")).toHaveLength(workoutExportColumns.length);
    expect(row.split(";")).toHaveLength(workoutExportColumns.length);
    expect(row).toContain("Trening nóg");
    expect(row).toContain(";12;100;");
  });

  it("escapes semicolons, quotes and line breaks without losing Polish characters", () => {
    expect(escapeCsvValue("Ławka; \"skośna\"\nuwaga")).toBe("\"Ławka; \"\"skośna\"\"\nuwaga\"");
    const csv = createWorkoutCsv(buildWorkoutExportData(simpleWorkout("Tekst; \"ważny\"\nciąg dalszy"), "pl"), "pl");
    expect(csv).toContain("\"Tekst; \"\"ważny\"\"\nciąg dalszy\"");
  });

  it("neutralizes spreadsheet formulas in user-controlled text while preserving numeric values", () => {
    expect(escapeCsvValue("=1+1")).toBe("'=1+1");
    expect(escapeCsvValue("+1+1")).toBe("'+1+1");
    expect(escapeCsvValue(-12)).toBe("-12");
  });

  it("creates a valid header-only file for an empty workout", () => {
    const csv = createWorkoutCsv(buildWorkoutExportData({ name: "Pusty", notes: "", sport: "strength", steps: [] }, "en"), "en");
    expect(csv.slice(1).split("\r\n")).toHaveLength(1);
    expect(csv).toContain("Workout name;Stage #");
  });
});
