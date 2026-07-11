import { describe, expect, it } from "vitest";

import {
  findCatalogExerciseBestEffort,
  findExerciseById,
  findExerciseByName,
  getExerciseOptions,
  getRequiredEquipment,
  resolveExerciseId
} from "../exercises";
import { getExerciseImageAssetKeys } from "../exerciseImageAssets";

describe("exercise catalog cleanup", () => {
  it("maps removed duplicate exercise names to their canonical target", () => {
    const aliased = findCatalogExerciseBestEffort("TRX Inverted Row");

    expect(aliased?.name).toBe("Suspended Inverted Row");
    expect(findExerciseByName("TRX Inverted Row")?.name).toBe("Suspended Inverted Row");
  });

  it("does not expose removed duplicate names in exercise options", () => {
    const optionLabels = getExerciseOptions("en").map((option) => option.label);

    expect(optionLabels).not.toContain("TRX Inverted Row");
    expect(optionLabels).toContain("Suspended Inverted Row");
  });

  it("applies reviewed category and equipment fixes", () => {
    const barMuscleUp = findCatalogExerciseBestEffort("Bar Muscle-up");

    expect(barMuscleUp?.garminCategory).toBe("PULL_UP");
    expect(barMuscleUp ? getRequiredEquipment(barMuscleUp) : []).toContain("pullupBar");
  });

  it("adds the recommended machine exercises with catalog metadata", () => {
    const machineHipThrust = findExerciseById("machine-hip-thrust");
    const assistedPullUp = findExerciseById("assisted-pull-up-machine");

    expect(machineHipThrust?.polishName).toBe("Hip thrust na maszynie");
    expect(machineHipThrust?.garminCategory).toBe("HIP_RAISE");
    expect(machineHipThrust ? getRequiredEquipment(machineHipThrust) : []).toContain("machine");
    expect(assistedPullUp?.garminCategory).toBe("PULL_UP");
  });

  it("registers supplied exercise image pairs while allowing image-less exercises", () => {
    expect(getExerciseImageAssetKeys("machine-hip-thrust")).toHaveLength(2);
    expect(getExerciseImageAssetKeys("lying-leg-curl")).toHaveLength(0);
  });

  it("preserves old Stage 2 exercise names as aliases to focused catalog entries", () => {
    expect(findExerciseByName("Battle Rope")?.name).toBe("Battle Rope Alternating Wave");
    expect(findExerciseByName("Floor I Raise")?.name).toBe("Prone I-Y-T Raise");
    expect(findExerciseByName("Sledge Hammer")).toBeUndefined();
  });

  it("adds grouped Stage 2 targets instead of exposing individual letter raise variants", () => {
    const groupedRaise = findExerciseByName("Prone I-Y-T Raise");
    const optionLabels = getExerciseOptions("en").map((option) => option.label);

    expect(groupedRaise?.polishName).toBe("Wznosy I-Y-T w leżeniu przodem");
    expect(groupedRaise?.garminCategory).toBe("SHOULDER_STABILITY");
    expect(optionLabels).not.toContain("Floor I Raise");
  });

  it("uses normalized Polish names while retaining common search aliases", () => {
    expect(findExerciseByName("Barbell Hip Thrust with Bench")?.polishName).toBe("Hip thrust ze sztangą na ławce");
    expect(findExerciseByName("Martwy ciąg")?.name).toBe("Barbell Deadlift");
    expect(findExerciseByName("OHP")?.name).toBe("Barbell Overhead Press");
    expect(findExerciseByName("Wiosłowanie wyciągiem dolnym")?.name).toBe("Seated Cable Row");
  });

  it("resolves merged exercise IDs without breaking historical workouts", () => {
    expect(resolveExerciseId("squat-back-squats-1249")).toBe("squat-barbell-back-squat-1251");
    expect(findExerciseById("squat-back-squats-1249")?.name).toBe("Barbell Back Squat");
    expect(findExerciseById("shoulder-press-strict-press-1133")?.name).toBe("Barbell Overhead Press");
  });

  it("keeps chin-up and pull-up distinct with unambiguous Polish names", () => {
    expect(findExerciseById("pull-up-chin-up-902")?.polishName).toBe("Podciąganie na drążku podchwytem");
    expect(findExerciseById("pull-up-pull-up-918")?.polishName).toBe("Podciąganie na drążku nachwytem");
  });

  it("applies equipment and category corrections", () => {
    const declinePress = findExerciseById("bench-press-decline-dumbbell-bench-press-81");
    const toeRaise = findExerciseById("calf-raise-seated-dumbbell-toe-raise-110");
    const rowingMachine = findExerciseById("row-indoor-row-1046");

    expect(declinePress ? getRequiredEquipment(declinePress) : []).toEqual(["bench", "dumbbell"]);
    expect(toeRaise?.garminCategory).toBe("DORSIFLEXION");
    expect(rowingMachine?.garminCategory).toBe("CARDIO");
  });

  it("keeps specialist variants out of the default library", () => {
    const labels = getExerciseOptions("en").map((option) => option.label);

    expect(labels).not.toContain("Triple-stop Barbell Bench Press");
    expect(labels).not.toContain("Banded Pull-ups (Progression)");
    expect(findExerciseById("pull-up-banded-pull-ups-900")?.libraryTier).toBe("progression");
  });
});
