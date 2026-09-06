import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  collectImagePairs,
  EXPECTED_EXERCISE_IMAGE_COUNT,
  EXPECTED_EXERCISE_SET_COUNT,
  listFilesRecursive,
  logicalAssetKey,
  MAX_RUNTIME_HEIGHT,
  MAX_RUNTIME_WEBP_BYTES,
  MAX_RUNTIME_WIDTH,
  parseExerciseImageSourceMap,
  readPngDimensions,
  readWebpDimensions
} from "./exercise-media-lib.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(repoRoot, "media-source", "exercises");
const runtimeRoot = path.join(repoRoot, "apps", "mobile", "assets", "exercises");
const sourceMapPath = path.join(repoRoot, "apps", "mobile", "src", "exerciseImageSources.ts");

const source = await collectImagePairs(sourceRoot, ".png");
const runtime = await collectImagePairs(runtimeRoot, ".webp");
const mapEntries = await parseExerciseImageSourceMap(sourceMapPath);
const runtimePng = (await listFilesRecursive(runtimeRoot)).filter((filePath) => path.extname(filePath).toLowerCase() === ".png");
const forbiddenAnimatedMediaExtensions = new Set([".gif", ".m4v", ".mov", ".mp4", ".webm"]);
const runtimeAnimatedMedia = (await listFilesRecursive(runtimeRoot)).filter((filePath) =>
  forbiddenAnimatedMediaExtensions.has(path.extname(filePath).toLowerCase())
);

if (source.files.length !== EXPECTED_EXERCISE_IMAGE_COUNT || source.byExercise.size !== EXPECTED_EXERCISE_SET_COUNT) {
  throw new Error(`Source exercise media count regression: ${source.files.length} files / ${source.byExercise.size} sets`);
}
if (runtime.files.length !== EXPECTED_EXERCISE_IMAGE_COUNT || runtime.byExercise.size !== EXPECTED_EXERCISE_SET_COUNT) {
  throw new Error(`Runtime exercise media count regression: ${runtime.files.length} files / ${runtime.byExercise.size} sets`);
}
if (runtimePng.length) throw new Error(`Runtime exercise PNG files are forbidden: ${runtimePng.map((item) => path.relative(repoRoot, item)).join(", ")}`);
if (runtimeAnimatedMedia.length) throw new Error(`Animated exercise media is forbidden: ${runtimeAnimatedMedia.map((item) => path.relative(repoRoot, item)).join(", ")}`);
if (mapEntries.length !== EXPECTED_EXERCISE_IMAGE_COUNT || mapEntries.some((entry) => entry.extension !== ".webp")) {
  throw new Error(`Static asset map must contain exactly ${EXPECTED_EXERCISE_IMAGE_COUNT} WebP require() entries`);
}

const sourceKeys = new Set(source.files.map((filePath) => logicalAssetKey(sourceRoot, filePath)));
const runtimeKeys = new Set(runtime.files.map((filePath) => logicalAssetKey(runtimeRoot, filePath)));
const mapKeys = new Set(mapEntries.map((entry) => entry.key));
for (const key of sourceKeys) if (!runtimeKeys.has(key) || !mapKeys.has(key)) throw new Error(`Missing runtime/map counterpart for source: ${key}`);
for (const key of runtimeKeys) if (!sourceKeys.has(key) || !mapKeys.has(key)) throw new Error(`Orphan runtime exercise image: ${key}`);
for (const entry of mapEntries) {
  if (!runtimeKeys.has(entry.key)) throw new Error(`Static asset map points to a missing WebP: ${entry.relative}`);
}

let largest = { key: "", bytes: 0 };
for (const [exerciseId, pair] of runtime.byExercise) {
  const roles = ["start", "end"].filter((role) => pair[role]);
  const dimensions = [];
  for (const role of roles) {
    const imageDimensions = await readWebpDimensions(pair[role]);
    dimensions.push(imageDimensions);
    if (imageDimensions.width > MAX_RUNTIME_WIDTH || imageDimensions.height > MAX_RUNTIME_HEIGHT) throw new Error(`Runtime image exceeds ${MAX_RUNTIME_WIDTH}x${MAX_RUNTIME_HEIGHT}: ${exerciseId}/${role}`);
    const bytes = (await stat(pair[role])).size;
    if (bytes > MAX_RUNTIME_WEBP_BYTES) throw new Error(`Runtime WebP exceeds ${MAX_RUNTIME_WEBP_BYTES} bytes: ${exerciseId}/${role} (${bytes})`);
    if (bytes > largest.bytes) largest = { key: `${exerciseId}/${role}`, bytes };
  }
  if (dimensions.length === 2 && (dimensions[0].width !== dimensions[1].width || dimensions[0].height !== dimensions[1].height)) throw new Error(`Runtime pair dimensions differ: ${exerciseId}`);
}

for (const [exerciseId, pair] of source.byExercise) {
  if (pair.start && pair.end) {
    const start = await readPngDimensions(pair.start);
    const end = await readPngDimensions(pair.end);
    if (start.width !== end.width || start.height !== end.height) throw new Error(`Source pair dimensions differ: ${exerciseId}`);
  } else {
    await readPngDimensions(pair.start ?? pair.end);
  }
}

console.log(JSON.stringify({
  sourcePngFiles: source.files.length,
  runtimeWebpFiles: runtime.files.length,
  imageSets: runtime.byExercise.size,
  completePairs: [...runtime.byExercise.values()].filter((pair) => pair.start && pair.end).length,
  singleImages: [...runtime.byExercise.values()].filter((pair) => !pair.start || !pair.end).length,
  runtimePngFiles: runtimePng.length,
  orphanRuntimeImages: 0,
  maxDimensions: `${MAX_RUNTIME_WIDTH}x${MAX_RUNTIME_HEIGHT}`,
  maxFileBytes: MAX_RUNTIME_WEBP_BYTES,
  largestRuntimeWebp: largest,
  animatedMediaFiles: runtimeAnimatedMedia.length
}, null, 2));
