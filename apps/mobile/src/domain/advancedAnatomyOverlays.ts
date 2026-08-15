type OverlayRegionSpec = {
  clipId: string;
  id: string;
  sourceId: string;
};

const clipDefinitions = `
  <defs id="advanced_anatomy_clip_definitions">
    <clipPath id="advanced_clip_top_28" clipPathUnits="objectBoundingBox"><rect x="0" y="0" width="1" height="0.28" /></clipPath>
    <clipPath id="advanced_clip_middle_44" clipPathUnits="objectBoundingBox"><rect x="0" y="0.28" width="1" height="0.44" /></clipPath>
    <clipPath id="advanced_clip_bottom_28" clipPathUnits="objectBoundingBox"><rect x="0" y="0.72" width="1" height="0.28" /></clipPath>
    <clipPath id="advanced_clip_top_32" clipPathUnits="objectBoundingBox"><rect x="0" y="0" width="1" height="0.32" /></clipPath>
    <clipPath id="advanced_clip_bottom_68" clipPathUnits="objectBoundingBox"><rect x="0" y="0.32" width="1" height="0.68" /></clipPath>
    <clipPath id="advanced_clip_top_55" clipPathUnits="objectBoundingBox"><rect x="0" y="0" width="1" height="0.55" /></clipPath>
    <clipPath id="advanced_clip_bottom_45" clipPathUnits="objectBoundingBox"><rect x="0" y="0.55" width="1" height="0.45" /></clipPath>
    <clipPath id="advanced_clip_left_42" clipPathUnits="objectBoundingBox"><rect x="0" y="0" width="0.42" height="1" /></clipPath>
    <clipPath id="advanced_clip_middle_36" clipPathUnits="objectBoundingBox"><rect x="0.32" y="0" width="0.36" height="1" /></clipPath>
    <clipPath id="advanced_clip_right_42" clipPathUnits="objectBoundingBox"><rect x="0.58" y="0" width="0.42" height="1" /></clipPath>
  </defs>`;

const frontOverlayRegions: readonly OverlayRegionSpec[] = [
  ...pairedVerticalRegions("left_pectoralis_major", "left_chest", [
    ["clavicular", "advanced_clip_top_28"],
    ["sternocostal", "advanced_clip_middle_44"],
    ["abdominal", "advanced_clip_bottom_28"]
  ]),
  ...pairedVerticalRegions("right_pectoralis_major", "right_chest", [
    ["clavicular", "advanced_clip_top_28"],
    ["sternocostal", "advanced_clip_middle_44"],
    ["abdominal", "advanced_clip_bottom_28"]
  ]),
  region("left_deltoid", "advanced_left_deltoid_lateral", "advanced_clip_left_42"),
  region("left_deltoid", "advanced_left_deltoid_anterior", "advanced_clip_right_42"),
  region("right_deltoid", "advanced_right_deltoid_anterior", "advanced_clip_left_42"),
  region("right_deltoid", "advanced_right_deltoid_lateral", "advanced_clip_right_42"),
  region("left_quadriceps_femoris", "advanced_left_quadriceps_lateralis", "advanced_clip_left_42"),
  region("left_quadriceps_femoris", "advanced_left_quadriceps_rectus", "advanced_clip_middle_36"),
  region("left_quadriceps_femoris", "advanced_left_quadriceps_medialis", "advanced_clip_right_42"),
  region("right_quadriceps_femoris", "advanced_right_quadriceps_medialis", "advanced_clip_left_42"),
  region("right_quadriceps_femoris", "advanced_right_quadriceps_rectus", "advanced_clip_middle_36"),
  region("right_quadriceps_femoris", "advanced_right_quadriceps_lateralis", "advanced_clip_right_42")
];

const backOverlayRegions: readonly OverlayRegionSpec[] = [
  region("left_trapezius_rhomboid_region", "advanced_left_trapezius_middle", "advanced_clip_top_55"),
  region("left_trapezius_rhomboid_region", "advanced_left_trapezius_lower", "advanced_clip_bottom_45"),
  region("right_trapezius_rhomboid_region", "advanced_right_trapezius_middle", "advanced_clip_top_55"),
  region("right_trapezius_rhomboid_region", "advanced_right_trapezius_lower", "advanced_clip_bottom_45"),
  region("left_gluteus_maximus_medius", "advanced_left_gluteus_medius", "advanced_clip_top_32"),
  region("left_gluteus_maximus_medius", "advanced_left_gluteus_maximus", "advanced_clip_bottom_68"),
  region("right_gluteus_maximus_medius", "advanced_right_gluteus_medius", "advanced_clip_top_32"),
  region("right_gluteus_maximus_medius", "advanced_right_gluteus_maximus", "advanced_clip_bottom_68"),
  region("left_gastrocnemius_soleus", "advanced_left_calf_gastrocnemius", "advanced_clip_top_55"),
  region("left_gastrocnemius_soleus", "advanced_left_calf_soleus", "advanced_clip_bottom_45"),
  region("right_gastrocnemius_soleus", "advanced_right_calf_gastrocnemius", "advanced_clip_top_55"),
  region("right_gastrocnemius_soleus", "advanced_right_calf_soleus", "advanced_clip_bottom_45")
];

export const advancedAnatomyOverlayRegionIds = new Set(
  [...frontOverlayRegions, ...backOverlayRegions].map((item) => item.id)
);

export function addAdvancedAnatomyOverlays(svg: string, side: "front" | "back") {
  const specs = side === "front" ? frontOverlayRegions : backOverlayRegions;
  const overlays = specs.map((spec) => clonePath(svg, spec)).filter(Boolean).join("");
  if (!overlays) return svg;
  return svg.replace("</svg>", `${clipDefinitions}<g id="advanced_anatomy_overlays">${overlays}</g></svg>`);
}

function clonePath(svg: string, spec: OverlayRegionSpec) {
  const escapedId = spec.sourceId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const openingTag = svg.match(new RegExp(`<path\\b(?=[^>]*\\bid="${escapedId}")[^>]*>`))?.[0];
  if (!openingTag) return "";
  return openingTag
    .replace(`id="${spec.sourceId}"`, `id="${spec.id}"`)
    .replace(/\s*\/?\>$/, ` clip-path="url(#${spec.clipId})" />`);
}

function pairedVerticalRegions(
  sourceId: string,
  prefix: string,
  segments: ReadonlyArray<readonly [string, string]>
): OverlayRegionSpec[] {
  return segments.map(([suffix, clipId]) => region(sourceId, `advanced_${prefix}_${suffix}`, clipId));
}

function region(sourceId: string, id: string, clipId: string): OverlayRegionSpec {
  return { clipId, id, sourceId };
}
