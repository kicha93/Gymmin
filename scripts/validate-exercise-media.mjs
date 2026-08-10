import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  collectImagePairs,
  EXPECTED_EXERCISE_IMAGE_COUNT,
  EXPECTED_EXERCISE_PAIR_COUNT,
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
const videoMapPath = path.join(repoRoot, "apps", "mobile", "src", "exerciseVideoSources.ts");

const source = await collectImagePairs(sourceRoot, ".png");
const runtime = await collectImagePairs(runtimeRoot, ".webp");
const mapEntries = await parseExerciseImageSourceMap(sourceMapPath);
const runtimePng = (await listFilesRecursive(runtimeRoot)).filter((filePath) => path.extname(filePath).toLowerCase() === ".png");

if (source.files.length !== EXPECTED_EXERCISE_IMAGE_COUNT || source.byExercise.size !== EXPECTED_EXERCISE_PAIR_COUNT) {
  throw new Error(`Source exercise media count regression: ${source.files.length} files / ${source.byExercise.size} pairs`);
}
if (runtime.files.length !== EXPECTED_EXERCISE_IMAGE_COUNT || runtime.byExercise.size !== EXPECTED_EXERCISE_PAIR_COUNT) {
  throw new Error(`Runtime exercise media count regression: ${runtime.files.length} files / ${runtime.byExercise.size} pairs`);
}
if (runtimePng.length) throw new Error(`Runtime exercise PNG files are forbidden: ${runtimePng.map((item) => path.relative(repoRoot, item)).join(", ")}`);
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
  const start = await readWebpDimensions(pair.start);
  const end = await readWebpDimensions(pair.end);
  if (start.width !== end.width || start.height !== end.height) throw new Error(`Runtime pair dimensions differ: ${exerciseId}`);
  if (start.width > MAX_RUNTIME_WIDTH || start.height > MAX_RUNTIME_HEIGHT) throw new Error(`Runtime image exceeds ${MAX_RUNTIME_WIDTH}x${MAX_RUNTIME_HEIGHT}: ${exerciseId}`);
  for (const role of ["start", "end"]) {
    const bytes = (await stat(pair[role])).size;
    if (bytes > MAX_RUNTIME_WEBP_BYTES) throw new Error(`Runtime WebP exceeds ${MAX_RUNTIME_WEBP_BYTES} bytes: ${exerciseId}/${role} (${bytes})`);
    if (bytes > largest.bytes) largest = { key: `${exerciseId}/${role}`, bytes };
  }
}

for (const [exerciseId, pair] of source.byExercise) {
  const start = await readPngDimensions(pair.start);
  const end = await readPngDimensions(pair.end);
  if (start.width !== end.width || start.height !== end.height) throw new Error(`Source pair dimensions differ: ${exerciseId}`);
}

const mp4Files = (await listFilesRecursive(runtimeRoot)).filter((filePath) => path.extname(filePath).toLowerCase() === ".mp4");
if (mp4Files.length !== 1) throw new Error(`Expected exactly one exercise MP4, found ${mp4Files.length}`);
const videoMap = await readFile(videoMapPath, "utf8");
for (const mp4 of mp4Files) {
  const relative = path.relative(runtimeRoot, mp4).replaceAll(path.sep, "/");
  if (!videoMap.includes(`../assets/exercises/${relative}`)) throw new Error(`Exercise MP4 is not statically mapped: ${relative}`);
}

console.log(JSON.stringify({
  sourcePngFiles: source.files.length,
  runtimeWebpFiles: runtime.files.length,
  completePairs: runtime.byExercise.size,
  runtimePngFiles: runtimePng.length,
  orphanRuntimeImages: 0,
  maxDimensions: `${MAX_RUNTIME_WIDTH}x${MAX_RUNTIME_HEIGHT}`,
  maxFileBytes: MAX_RUNTIME_WEBP_BYTES,
  largestRuntimeWebp: largest,
  exerciseMp4Files: mp4Files.length
}, null, 2));
