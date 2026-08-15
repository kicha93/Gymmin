import { describe, expect, it } from "vitest";

import {
  advancedDisplayFamilies,
  advancedMuscleSubdivisionIds,
  advancedMuscleSubdivisions,
  getAdvancedAnatomyRegionLevels,
  getAdvancedExerciseProfile,
  getAdvancedMuscleSubdivision
} from "../advancedMuscles";

describe("advanced muscle taxonomy", () => {
  it("uses stable unique subdivision ids with translations and valid display families", () => {
    expect(new Set(advancedMuscleSubdivisionIds).size).toBe(advancedMuscleSubdivisionIds.length);
    const familyIds = new Set(advancedDisplayFamilies.map((family) => family.id));
    for (const subdivision of advancedMuscleSubdivisions) {
      expect(familyIds.has(subdivision.displayFamilyId)).toBe(true);
      expect(subdivision.names.en.length).toBeGreaterThan(0);
      expect(subdivision.names.pl.length).toBeGreaterThan(0);
    }
  });

  it("models rhomboids in the upper-back display family, not as an anatomical trapezius child", () => {
    const rhomboids = getAdvancedMuscleSubdivision("upperBack.rhomboids");
    expect(rhomboids).toMatchObject({ displayFamilyId: "upperBack", standardParentMuscle: "traps" });
    expect(rhomboids?.id.startsWith("traps.")).toBe(false);
  });

  it("keeps deep structures in text data without requiring an SVG region", () => {
    expect(getAdvancedMuscleSubdivision("abs.transversusAbdominis")).toMatchObject({
      anatomyRegionIds: [],
      isAnatomyVisible: false
    });
  });

  it("resolves historical aliases through the canonical profile", () => {
    expect(getAdvancedExerciseProfile("calf-raise-calf-raise-107"))
      .toEqual(getAdvancedExerciseProfile("calf-raise-standing-calf-raise-118"));
  });

  it("applies family rules and angle-specific overrides", () => {
    const flat = getAdvancedExerciseProfile("bench-press-barbell-bench-press-76");
    const incline = getAdvancedExerciseProfile("bench-press-incline-barbell-bench-press-84");
    const flatChest = flat?.parents.find((parent) => parent.standardParentMuscle === "chest");
    const inclineChest = incline?.parents.find((parent) => parent.standardParentMuscle === "chest");
    expect(flatChest?.status).toBe("mapped");
    expect(inclineChest?.status).toBe("mapped");
    if (flatChest?.status === "mapped" && inclineChest?.status === "mapped") {
      expect(flatChest.ruleId).toBe("chest.horizontal");
      expect(inclineChest.ruleId).toBe("chest.incline");
      expect(new Map(inclineChest.engagement).get("chest.clavicular"))
        .toBeGreaterThan(new Map(flatChest.engagement).get("chest.clavicular") ?? 0);
    }
  });

  it("distinguishes straight-knee and bent-knee calf work", () => {
    const seated = getAdvancedExerciseProfile("calf-raise-seated-calf-raise-109");
    const standing = getAdvancedExerciseProfile("calf-raise-standing-calf-raise-118");
    const seatedCalves = seated?.parents.find((parent) => parent.standardParentMuscle === "calves");
    const standingCalves = standing?.parents.find((parent) => parent.standardParentMuscle === "calves");
    expect(seatedCalves?.status === "mapped" && seatedCalves.ruleId).toBe("calves.bent-knee");
    expect(standingCalves?.status === "mapped" && standingCalves.ruleId).toBe("calves.straight-knee");
  });

  it("filters visible advanced anatomy regions by front and back", () => {
    expect(Object.keys(getAdvancedAnatomyRegionLevels("bench-press-barbell-bench-press-76", "front"))).toContain("advanced_left_chest_sternocostal");
    expect(Object.keys(getAdvancedAnatomyRegionLevels("bench-press-barbell-bench-press-76", "back"))).not.toContain("advanced_left_chest_sternocostal");
  });
});
