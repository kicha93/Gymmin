import type { MuscleKey } from "./exercises";

export function colorizeAdvancedRegions(
  svg: string,
  regionFills?: Readonly<Record<string, string>>,
  highlightedRegionIds?: ReadonlySet<string>
) {
  if (!regionFills) return svg;
  return Object.entries(regionFills).reduce((currentSvg, [regionId, fill]) => {
    return replaceSvgRegionTag(currentSvg, regionId, (tag) => {
      const colorized = setSvgTagAttribute(tag, "fill", fill);
      if (!highlightedRegionIds?.has(regionId)) return colorized;
      return setSvgTagAttribute(
        setSvgTagAttribute(
          setSvgTagAttribute(colorized, "stroke", "#fffdf8"),
          "stroke-width",
          "8"
        ),
        "stroke-linejoin",
        "round"
      );
    });
  }, svg);
}

export function colorizeBodySvg(
  svg: string,
  regionMap: Record<string, MuscleKey>,
  fill: (muscle: MuscleKey) => string
) {
  return Object.entries(regionMap).reduce(
    (currentSvg, [regionId, muscle]) => replaceSvgRegionTag(
      currentSvg,
      regionId,
      (tag) => setSvgTagAttribute(tag, "fill", fill(muscle))
    ),
    svg
  );
}

function replaceSvgRegionTag(svg: string, regionId: string, replace: (tag: string) => string) {
  const escapedId = regionId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regionPattern = new RegExp(`(<[^>]+(?:^|\\s)id="${escapedId}"[^>]*>)`, "g");
  return svg.replace(regionPattern, replace);
}

function setSvgTagAttribute(tag: string, name: string, value: string) {
  const attributePattern = new RegExp(`\\b${name}="[^"]*"`);
  if (attributePattern.test(tag)) {
    return tag.replace(attributePattern, `${name}="${value}"`);
  }
  return tag.replace(/\s*(\/?>)$/, ` ${name}="${value}"$1`);
}
