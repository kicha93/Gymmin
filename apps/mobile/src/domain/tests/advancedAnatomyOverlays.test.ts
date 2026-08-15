import { describe, expect, it } from "vitest";

import { backBodySvg, frontBodySvg } from "../bodyMaps";
import {
  addAdvancedAnatomyOverlays,
  advancedAnatomyOverlayRegionIds
} from "../advancedAnatomyOverlays";

describe("advanced anatomy overlays", () => {
  it("adds deterministic front subdivisions without replacing the source anatomy", () => {
    const result = addAdvancedAnatomyOverlays(frontBodySvg, "front");

    expect(result).toContain('id="left_pectoralis_major"');
    expect(result).toContain('id="advanced_left_chest_clavicular"');
    expect(result).toContain('id="advanced_left_chest_sternocostal"');
    expect(result).toContain('id="advanced_left_quadriceps_medialis"');
    expect(result).not.toContain('id="advanced_left_gluteus_maximus"');
  });

  it("adds only the selected back subdivisions", () => {
    const result = addAdvancedAnatomyOverlays(backBodySvg, "back");

    expect(result).toContain('id="advanced_left_gluteus_maximus"');
    expect(result).toContain('id="advanced_left_calf_soleus"');
    expect(result).toContain('id="advanced_left_trapezius_lower"');
    expect(result).not.toContain('id="advanced_left_chest_clavicular"');
  });

  it("keeps every generated region id unique", () => {
    expect(advancedAnatomyOverlayRegionIds.size).toBe(28);
  });
});
