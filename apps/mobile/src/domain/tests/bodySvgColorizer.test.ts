import { describe, expect, it } from "vitest";
import { colorizeAdvancedRegions, colorizeBodySvg } from "../bodySvgColorizer";

const svg = '<svg><g id="chest" fill="#444"><path id="chest-upper"></path></g></svg>';

describe("body SVG colorizer", () => {
  it("colors a standard parent region", () => {
    expect(colorizeBodySvg(svg, { chest: "chest" }, () => "#ff0000"))
      .toContain('<g id="chest" fill="#ff0000">');
  });

  it("adds a fill to a subdivision that inherits its parent color", () => {
    const result = colorizeAdvancedRegions(svg, { "chest-upper": "#00aa88" });
    expect(result).toContain('<path id="chest-upper" fill="#00aa88"></path>');
  });

  it("highlights a subdivision without breaking its closing tag", () => {
    const result = colorizeAdvancedRegions(
      svg,
      { "chest-upper": "#00aa88" },
      new Set(["chest-upper"])
    );
    expect(result).toContain('stroke="#fffdf8"');
    expect(result).toContain('stroke-width="8"');
    expect(result).toContain('</path>');
  });
});
