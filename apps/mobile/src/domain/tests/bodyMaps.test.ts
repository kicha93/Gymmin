import { describe, expect, it } from "vitest";
import { advancedMuscleSubdivisions } from "../advancedMuscles";
import {
  advancedBackBodyRegionMap,
  advancedBackBodySvg,
  advancedFrontBodyRegionMap,
  advancedFrontBodySvg,
  backBodyRegionMap,
  backBodySvg,
  frontBodyRegionMap,
  frontBodySvg
} from "../bodyMaps";

describe("body SVG maps", () => {
  it("contains valid, unique React Native-safe region IDs", () => {
    for (const svg of [frontBodySvg, backBodySvg, advancedFrontBodySvg, advancedBackBodySvg]) {
      expect(svg).not.toMatch(/<\/?ns\d+:/);
      const ids = getIds(svg);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("uses a shared normalized canvas", () => {
    expect(advancedFrontBodySvg).toContain('viewBox="0 -4 969 1632"');
    expect(advancedBackBodySvg).toContain('viewBox="-2.5 0 969 1632"');
  });

  it("keeps the standard maps on the standard figures", () => {
    expect(expectMissingRegionIds(frontBodySvg, Object.keys(frontBodyRegionMap))).toEqual([]);
    expect(expectMissingRegionIds(backBodySvg, Object.keys(backBodyRegionMap))).toEqual([]);
  });

  it("resolves corrected standard muscle groups on advanced figures", () => {
    expect(expectMissingRegionIds(advancedFrontBodySvg, Object.keys(advancedFrontBodyRegionMap))).toEqual([]);
    expect(expectMissingRegionIds(advancedBackBodySvg, Object.keys(advancedBackBodyRegionMap))).toEqual([]);
    expect(advancedFrontBodyRegionMap.left_adductor_group).toBe("adductors");
    expect(advancedFrontBodyRegionMap.left_quadriceps_femoris).toBe("quads");
  });

  it("resolves every visible advanced subdivision on the correct side", () => {
    const visible = advancedMuscleSubdivisions.filter((item) => item.isAnatomyVisible);
    expect(visible).toHaveLength(30);

    for (const subdivision of visible) {
      const svg = subdivision.side === "back" ? advancedBackBodySvg : advancedFrontBodySvg;
      expect(expectMissingRegionIds(svg, subdivision.anatomyRegionIds)).toEqual([]);
    }
  });

  it("keeps deep structures intentionally non-visual", () => {
    const hidden = advancedMuscleSubdivisions
      .filter((item) => !item.isAnatomyVisible)
      .map((item) => item.id);

    expect(hidden).toEqual([
      "elbowFlexors.brachialis",
      "forearms.brachioradialis",
      "abs.transversusAbdominis",
      "obliques.internalOblique",
      "quadriceps.vastusIntermedius",
      "hamstrings.bicepsFemorisShortHead",
      "glutes.gluteusMinimus",
      "upperBack.rhomboids"
    ]);
  });
});

function getIds(svg: string) {
  return [...svg.matchAll(/(?:^|\s)id="([^"]+)"/g)].map((match) => match[1]);
}

function expectMissingRegionIds(svg: string, ids: readonly string[]) {
  const svgIds = new Set(getIds(svg));
  return ids.filter((id) => !svgIds.has(id));
}
