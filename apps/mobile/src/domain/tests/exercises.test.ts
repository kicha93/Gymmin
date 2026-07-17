import { describe, expect, it } from "vitest";

import {
  findCatalogExerciseBestEffort,
  findExerciseById,
  findExerciseByName,
  filterExerciseOptionsForPicker,
  getExerciseOptionTierBadge,
  getExerciseOptions,
  getExerciseOptionsForStageType,
  getExerciseSectionsForStageType,
  getRequiredEquipment,
  resolveExerciseId
} from "../exercises";
import { getExerciseAnimationAssetKey, getExerciseImageAssetKeys } from "../exerciseImageAssets";

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

  it("uses supplied exercise image pairs when no animation is registered", () => {
    const exerciseIds = [
      "curl-cable-biceps-curl-331",
      "lateral-raise-dumbbell-lateral-raise-545",
      "leg-curl-leg-curl-574",
      "leg-raise-hanging-knee-raise-585",
      "lunge-dumbbell-bulgarian-split-squat-625",
      "row-face-pull-1044",
      "shoulder-press-seated-dumbbell-shoulder-press-1128",
      "squat-leg-press-1285",
      "triceps-extension-cable-overhead-triceps-extension-1403"
    ];

    for (const exerciseId of exerciseIds) {
      expect(getExerciseImageAssetKeys(exerciseId), exerciseId).toHaveLength(2);
    }
  });

  it("registers an exercise animation while retaining start and end fallback images", () => {
    expect(getExerciseAnimationAssetKey("squat-barbell-front-squat-1253")).toBe(
      "squat-barbell-front-squat-1253/animation"
    );
    expect(getExerciseImageAssetKeys("squat-barbell-front-squat-1253")).toEqual([
      "squat-barbell-front-squat-1253/start",
      "squat-barbell-front-squat-1253/end"
    ]);
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

  it("keeps the reviewed dead-hang curl separate from the preacher curl", () => {
    expect(findExerciseById("curl-dead-hang-biceps-curl-337")?.name).toBe("Dead-hang Biceps Curl");
    expect(resolveExerciseId("curl-dead-hang-biceps-curl-337")).toBe("curl-dead-hang-biceps-curl-337");
    expect(findExerciseById("curl-ez-bar-preacher-curl-344")?.name).toBe("EZ-Bar Preacher Curl");
  });

  it("uses dedicated categories for front raises, step-ups, good mornings and rope climbs", () => {
    expect(findExerciseById("shoulder-press-dumbbell-front-raise-1117")?.garminCategory).toBe("FRONT_RAISE");
    expect(findExerciseById("squat-step-up-1305")?.garminCategory).toBe("STEP_UP");
    expect(findExerciseById("leg-curl-good-morning-573")?.garminCategory).toBe("GOOD_MORNING");
    expect(findExerciseById("lateral-raise-rope-climb-557")?.garminCategory).toBe("ROPE_CLIMB");
  });

  it("resolves old ids for image assets", () => {
    expect(getExerciseImageAssetKeys("shoulder-press-strict-press-1133")).toEqual(getExerciseImageAssetKeys("shoulder-press-overhead-barbell-press-1125"));
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

  it("reveals additional active tiers only when explicitly requested", () => {
    const main = getExerciseOptions("en").map((option) => option.libraryTier);
    expect(main.every((tier) => tier === "main")).toBe(true);

    const variation = getExerciseOptions("en", ["main", "variation"]);
    expect(variation.some((option) => option.libraryTier === "variation")).toBe(true);
    expect(variation.some((option) => option.libraryTier === "deprecated")).toBe(false);
    expect(variation.some((option) => option.libraryTier === "progression")).toBe(false);

    const advanced = getExerciseOptionsForStageType("en", "exercise", ["main", "advanced"]);
    expect(advanced.some((option) => option.libraryTier === "advanced")).toBe(true);
    expect(advanced.every((option) => option.libraryTier === "main" || option.libraryTier === "advanced")).toBe(true);
  });

  it("keeps selected non-main exercises addressable by their canonical id", () => {
    const options = getExerciseOptions("en", ["main", "variation"]);
    const option = options.find((item) => item.libraryTier === "variation");
    expect(option?.exerciseId).toBeTruthy();
    expect(findExerciseById(option?.exerciseId ?? "")?.id).toBe(option?.exerciseId);
  });

  it.each(["variation", "advanced", "sportSpecific", "rehab"] as const)("supports the %s picker filter", (tier) => {
    const options = getExerciseOptions("en", ["main", tier]);
    expect(options.some((option) => option.libraryTier === tier)).toBe(true);
    expect(filterExerciseOptionsForPicker(options, "", new Set([tier])).some((option) => option.libraryTier === tier)).toBe(true);
    expect(filterExerciseOptionsForPicker(options, "", new Set()).some((option) => option.libraryTier === tier)).toBe(false);
  });

  it("searches all active tiers and ranks main results first", () => {
    const options = getExerciseOptions("en", ["main", "variation", "advanced", "sportSpecific", "rehab"]);
    const results = filterExerciseOptionsForPicker(options, "press", new Set());

    expect(results.length).toBeGreaterThan(1);
    expect(results[0]?.libraryTier).toBe("main");
    expect(results.every((option) => option.libraryTier !== "deprecated" && option.libraryTier !== "progression")).toBe(true);
  });

  it("reuses prebuilt default picker sections for an immediate first open", () => {
    const first = getExerciseSectionsForStageType("pl", "exercise", "all");
    const second = getExerciseSectionsForStageType("pl", "exercise", "all");

    expect(first.length).toBeGreaterThan(0);
    expect(second).toBe(first);
  });

  it("returns tier badges only for active non-main results", () => {
    const options = getExerciseOptions("en", ["main", "variation", "advanced", "sportSpecific", "rehab"]);
    const main = options.find((option) => option.libraryTier === "main");
    const additional = options.find((option) => option.libraryTier !== "main");

    expect(main && getExerciseOptionTierBadge(main)).toBeNull();
    expect(additional && getExerciseOptionTierBadge(additional)).toBe(additional?.libraryTier);
  });
});
