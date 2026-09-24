import { describe, expect, it } from "vitest";

import {
  exercises,
  exercisesByCategory,
  findCatalogExerciseBestEffort,
  findExerciseById,
  findExerciseByName,
  getMuscleImpactGroups,
  getPrimaryMuscles,
  getRequiredEquipment,
  getSecondaryMuscles,
  isExerciseAvailableForStageType,
  normalizeExerciseReference,
  resolveExerciseId
} from "../exercises";
import { exerciseIdAliasMap } from "../exerciseIdAliases";
import { getExerciseImageAssetKeys } from "../exerciseImageAssets";

describe("exercise catalog cleanup", () => {
  it("maps removed duplicate exercise names to their canonical target", () => {
    const aliased = findCatalogExerciseBestEffort("Back squat");

    expect(aliased?.name).toBe("Barbell Back Squat");
    expect(findExerciseByName("Back squat")?.name).toBe("Barbell Back Squat");
  });

  it("does not expose removed duplicate names in exercise options", () => {
    const optionLabels = exercises.filter((exercise) => (exercise.libraryTier ?? "main") === "main").map((exercise) => exercise.name);

    expect(optionLabels).not.toContain("Back squat");
    expect(optionLabels).toContain("Barbell Back Squat");
  });

  it("applies reviewed category and equipment fixes", () => {
    const barMuscleUp = findCatalogExerciseBestEffort("Bar Muscle-up");

    expect(barMuscleUp?.category).toBe("PULL_UP");
    expect(barMuscleUp ? getRequiredEquipment(barMuscleUp) : []).toContain("pullupBar");
  });

  it("uses the reviewed 0-5 muscle impact scale for UI muscle groups", () => {
    const exercise = findExerciseById("assisted-pull-up-machine");

    expect(exercise?.muscleImpact.lats).toBe(5);
    expect(exercise?.muscleImpact.biceps).toBe(4);
    expect(exercise?.muscleImpact.traps).toBe(3);
    expect(exercise?.muscleImpact.abs).toBe(2);
    expect(exercise && getPrimaryMuscles(exercise)).toEqual(["lats"]);
    expect(exercise && getSecondaryMuscles(exercise)).toEqual(expect.arrayContaining(["abs", "biceps", "forearm", "shoulders", "traps"]));
    expect(exercise && getMuscleImpactGroups(exercise.muscleImpact)).toEqual({
      primary: ["lats"],
      major: ["biceps"],
      significant: ["forearm", "traps"],
      secondary: ["abs", "shoulders"],
      stabilizing: []
    });
  });

  it("uses movement categories while retaining equipment discovery", () => {
    const dumbbellCurl = findExerciseById("curl-dumbbell-biceps-curl-339");

    expect(dumbbellCurl?.category).toBe("CURL");
    expect(dumbbellCurl && getRequiredEquipment(dumbbellCurl)).toContain("dumbbell");
    expect(exercisesByCategory.CURL).toContain(dumbbellCurl);
  });

  it("applies the final targeted catalog corrections", () => {
    expect(findExerciseById("bench-press-partial-lockout-92")?.polishName).toBe("Częściowy wyprost w wyciskaniu");
    expect(findExerciseById("hip-raise-kettlebell-swing-420")?.category).toBe("HIP_SWING");
    expect(findExerciseById("squat-alternating-box-dumbbell-step-ups-1247")?.category).toBe("STEP_UP");
    expect(findExerciseById("squat-dumbbell-split-squat-1271")?.category).toBe("LUNGE");
    expect(findExerciseById("chop-cable-pull-through-157")?.category).toBe("DEADLIFT");
    expect(findExerciseById("lunge-dumbbell-box-lunge-624")?.equipment.box).toBe(1);
    expect(findExerciseById("row-banded-face-pulls-1033")?.muscleImpact.lats).toBe(1);
    expect(findExerciseById("row-face-pull-1044")?.muscleImpact.lats).toBe(1);
    expect(findExerciseById("row-face-pull-with-external-rotation-1045")?.muscleImpact.lats).toBe(1);
    const facePull = findExerciseById("row-face-pull-1044");
    expect(facePull && getPrimaryMuscles(facePull)).not.toContain("lats");
    expect(facePull && getSecondaryMuscles(facePull)).not.toContain("lats");
    expect(facePull && getMuscleImpactGroups(facePull.muscleImpact).stabilizing).toContain("lats");
  });

  it("uses general names for canonical equipment exercises", () => {
    const hipThrust = findExerciseById("hip-thrust");
    const assistedPullUp = findExerciseById("assisted-pull-up-machine");

    expect(hipThrust?.name).toBe("Hip Thrust");
    expect(hipThrust?.polishName).toBe("Hip thrust");
    expect(hipThrust?.category).toBe("HIP_RAISE");
    expect(hipThrust ? getRequiredEquipment(hipThrust) : []).toContain("machine");
    expect(assistedPullUp?.category).toBe("PULL_UP");

    expect(findExerciseById("hack-squat")?.name).toBe("Hack Squat");
    expect(findExerciseById("chest-press")?.name).toBe("Chest Press");
    expect(findExerciseById("shoulder-press")?.name).toBe("Shoulder Press");
    expect(findExerciseById("hip-abduction")?.name).toBe("Hip Abduction");
    expect(findExerciseById("hip-adduction")?.name).toBe("Hip Adduction");
    expect(findExerciseById("glute-kickback")?.name).toBe("Glute Kickback");
    expect(findExerciseById("bulgarian-split-squat")?.name).toBe("Bulgarian Split Squat");
    expect(findExerciseById("pullover")?.name).toBe("Pullover");
    expect(findExerciseById("reverse-pec-deck")?.name).toBe("Reverse Pec Deck");

  });

  it("registers supplied exercise image sets for every canonical exercise", () => {
    expect(getExerciseImageAssetKeys("hip-thrust")).toHaveLength(2);
    for (const exercise of exercises) {
      expect(getExerciseImageAssetKeys(exercise.id), exercise.id).not.toHaveLength(0);
    }
  });

  it("uses supplied exercise image sets", () => {
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

  it("keeps a single available end image and the completed jump-rope pair", () => {
    expect(getExerciseImageAssetKeys("cardio-jump-rope-128")).toEqual([
      "cardio-jump-rope-128/start",
      "cardio-jump-rope-128/end"
    ]);
    expect(getExerciseImageAssetKeys("total-body-burpee-1381")).toEqual([
      "total-body-burpee-1381/end"
    ]);
  });

  it("retains the front squat start and end images", () => {
    expect(getExerciseImageAssetKeys("squat-barbell-front-squat-1253")).toEqual([
      "squat-barbell-front-squat-1253/start",
      "squat-barbell-front-squat-1253/end"
    ]);
  });

  it("does not resolve removed exercise families while preserving supported catalog aliases", () => {
    expect(findExerciseByName("Battle Rope")).toBeUndefined();
    expect(findExerciseByName("Floor I Raise")?.name).toBe("Prone I-Y-T Raise");
    expect(findExerciseByName("Sledge Hammer")).toBeUndefined();
  });

  it("adds grouped Stage 2 targets instead of exposing individual letter raise variants", () => {
    const groupedRaise = findExerciseByName("Prone I-Y-T Raise");
    const optionLabels = exercises.filter((exercise) => (exercise.libraryTier ?? "main") === "main").map((exercise) => exercise.name);

    expect(groupedRaise?.polishName).toBe("Wznosy I-Y-T w leżeniu przodem");
    expect(groupedRaise?.category).toBe("SHOULDER_STABILITY");
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
    expect(resolveExerciseId("banded-exercises-squat-to-press-40")).toBe("squat-thrusters-1313");
    expect(findExerciseById("banded-exercises-front-raise-14")?.name).toBe("Front Raise");
  });

  it("rewrites every temporary id alias to a complete canonical reference", () => {
    for (const legacyId of Object.keys(exerciseIdAliasMap)) {
      const canonical = findExerciseById(legacyId);
      expect(canonical, legacyId).toBeDefined();
      expect(normalizeExerciseReference({ exerciseId: legacyId, exerciseName: `Legacy ${legacyId}` }), legacyId)
        .toEqual({ exerciseId: canonical?.id, exerciseName: canonical?.name });
    }
  });

  it("does not expose explicit resistance-band variants in the active catalog", () => {
    expect(exercises.some((exercise) => /\bbanded\b|\bband-assisted\b|\bwith (?:a )?(?:resistance )?band\b/i.test(exercise.name))).toBe(false);
    expect(exercises.some((exercise) => /\bgum(?:a|ą|y|ie|ę)\b/i.test(exercise.polishName))).toBe(false);
  });

  it("consolidates alternating and duplicate weighted variants into base exercises", () => {
    expect(exercises.some((exercise) => /\balternating(?:-hands)?\b/i.test(exercise.name))).toBe(false);
    expect(exercises.some((exercise) => /\bnaprzemien|\bnaprzemian/i.test(exercise.polishName))).toBe(false);
    expect(findExerciseById("curl-alternating-dumbbell-biceps-curl-323")?.id).toBe("curl-dumbbell-biceps-curl-339");
    expect(findExerciseById("triceps-extension-weighted-dip-1435")?.name).toBe("Dip");
    expect(findExerciseById("squat-weighted-wall-squat-1340")?.name).toBe("Wall Squat");
    expect(findExerciseById("calf-raise-3-way-weighted-calf-raise-105")?.name).toBe("3-way Calf Raise");
    expect(findExerciseById("push-up-medicine-ball-push-up-967")?.name).toBe("Push-up");
  });

  it("keeps Smith-machine and sliding-disc movements as distinct catalog exercises", () => {
    expect(exercises.some((exercise) => exercise.equipment.smithMachine === 1)).toBe(true);
    expect(exercises.some((exercise) => exercise.equipment.slidingDisc === 1)).toBe(true);
    expect(findExerciseById("core-alternating-slide-out-183")?.name).toBe("Slide-out");
  });

  it("retains exercise media after alternating curl variants are consolidated", () => {
    expect(getExerciseImageAssetKeys("curl-dumbbell-biceps-curl-339")).toHaveLength(2);
    expect(getExerciseImageAssetKeys("curl-alternating-dumbbell-biceps-curl-323")).toEqual(
      getExerciseImageAssetKeys("curl-dumbbell-biceps-curl-339")
    );
  });

  it("keeps the reviewed dead-hang curl separate from the preacher curl", () => {
    expect(findExerciseById("curl-dead-hang-biceps-curl-337")?.name).toBe("Dead-hang Biceps Curl");
    expect(resolveExerciseId("curl-dead-hang-biceps-curl-337")).toBe("curl-dead-hang-biceps-curl-337");
    expect(findExerciseById("curl-ez-bar-preacher-curl-344")?.name).toBe("EZ-Bar Preacher Curl");
  });

  it("uses dedicated categories for front raises, step-ups and good mornings", () => {
    expect(findExerciseById("shoulder-press-dumbbell-front-raise-1117")?.category).toBe("FRONT_RAISE");
    expect(findExerciseById("squat-step-up-1305")?.category).toBe("STEP_UP");
    expect(findExerciseById("leg-curl-good-morning-573")?.category).toBe("GOOD_MORNING");
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
    expect(toeRaise?.category).toBe("DORSIFLEXION");
    expect(rowingMachine?.category).toBe("CARDIO");
  });

  it("keeps specialist variants out of the default library", () => {
    const labels = exercises.filter((exercise) => (exercise.libraryTier ?? "main") === "main").map((exercise) => exercise.name);

    expect(labels).not.toContain("Triple-stop Barbell Bench Press");
    expect(labels).not.toContain("Banded Pull-ups (Progression)");
    expect(findExerciseById("pull-up-banded-pull-ups-900")?.id).toBe("pull-up-pull-up-918");
  });

  it("reveals additional active tiers only when explicitly requested", () => {
    const main = exercises.filter((exercise) => (exercise.libraryTier ?? "main") === "main");
    expect(main.every((exercise) => (exercise.libraryTier ?? "main") === "main")).toBe(true);

    const variation = exercises.filter((exercise) => ["main", "variation"].includes(exercise.libraryTier ?? "main"));
    expect(variation.some((exercise) => exercise.libraryTier === "variation")).toBe(true);
    expect(variation.some((exercise) => exercise.libraryTier === "progression")).toBe(false);

    const advanced = exercises.filter((exercise) => isExerciseAvailableForStageType(exercise, "exercise", ["main", "advanced"]));
    expect(advanced.some((exercise) => exercise.libraryTier === "advanced")).toBe(true);
    expect(advanced.every((exercise) => (exercise.libraryTier ?? "main") === "main" || exercise.libraryTier === "advanced")).toBe(true);
  });

  it("keeps selected non-main exercises addressable by their canonical id", () => {
    const exercise = exercises.find((item) => item.libraryTier === "variation");
    expect(exercise?.id).toBeTruthy();
    expect(findExerciseById(exercise?.id ?? "")?.id).toBe(exercise?.id);
  });

  it("checks stage availability without building picker option arrays", () => {
    const frontSquat = findExerciseById("squat-barbell-front-squat-1253");

    expect(frontSquat).toBeDefined();
    expect(frontSquat && isExerciseAvailableForStageType(frontSquat, "exercise", ["main"])).toBe(true);
    expect(frontSquat && isExerciseAvailableForStageType(frontSquat, "warmup", ["main"])).toBe(false);
  });

});
