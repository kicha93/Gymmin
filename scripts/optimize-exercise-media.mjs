import { copyFile, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  collectImagePairs,
  EXPECTED_EXERCISE_IMAGE_COUNT,
  EXPECTED_EXERCISE_SET_COUNT,
  logicalAssetKey,
  MAX_RUNTIME_HEIGHT,
  MAX_RUNTIME_WIDTH,
  median,
  parseExerciseImageSourceMap,
  readPngDimensions,
  readWebpDimensions
} from "./exercise-media-lib.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(repoRoot, "media-source", "exercises");
const runtimeRoot = path.join(repoRoot, "apps", "mobile", "assets", "exercises");
const sourceMapPath = path.join(repoRoot, "apps", "mobile", "src", "exerciseImageSources.ts");
const reportRoot = path.join(repoRoot, ".artifacts", "exercise-media-optimization");
const stagingRoot = path.join(reportRoot, "staging");
const shouldWrite = process.argv.includes("--write");
const quality = 90;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: repoRoot, encoding: "utf8", stdio: options.capture ? "pipe" : "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}${result.stderr ? `: ${result.stderr.trim()}` : ""}`);
  return result.stdout?.trim() ?? "";
}

const source = await collectImagePairs(sourceRoot, ".png");
const mapEntries = await parseExerciseImageSourceMap(sourceMapPath);
if (source.files.length !== EXPECTED_EXERCISE_IMAGE_COUNT || source.byExercise.size !== EXPECTED_EXERCISE_SET_COUNT) {
  throw new Error(`Expected ${EXPECTED_EXERCISE_IMAGE_COUNT} source PNG in ${EXPECTED_EXERCISE_SET_COUNT} sets, found ${source.files.length} / ${source.byExercise.size}`);
}
const sourceKeys = new Set(source.files.map((filePath) => logicalAssetKey(sourceRoot, filePath)));
const mapKeys = new Set(mapEntries.map((entry) => entry.key));
for (const key of mapKeys) if (!sourceKeys.has(key)) throw new Error(`Static asset map has no source PNG: ${key}`);

for (const [exerciseId, pair] of source.byExercise) {
  if (pair.start && pair.end) {
    const start = await readPngDimensions(pair.start);
    const end = await readPngDimensions(pair.end);
    if (start.width !== end.width || start.height !== end.height) throw new Error(`Source pair dimensions differ: ${exerciseId}`);
  } else {
    await readPngDimensions(pair.start ?? pair.end);
  }
}

const pendingMapEntries = [...sourceKeys].filter((key) => !mapKeys.has(key)).length;
console.log(`Preflight passed: ${source.files.length} source PNG in ${source.byExercise.size} image sets, ${pendingMapEntries} new map entries to generate.`);
if (!shouldWrite) {
  console.log(`Dry run only. Re-run with --write to generate WebP Q${quality}, max ${MAX_RUNTIME_WIDTH}x${MAX_RUNTIME_HEIGHT}, preserve aspect ratio, no crop.`);
  process.exit(0);
}

const magickVersion = run("magick", ["-version"], { capture: true }).split(/\r?\n/)[0];
await rm(reportRoot, { recursive: true, force: true });
await mkdir(stagingRoot, { recursive: true });
const rows = [];

for (const [exerciseId, pair] of [...source.byExercise.entries()].sort(([left], [right]) => left.localeCompare(right))) {
  for (const role of ["start", "end"].filter((candidate) => pair[candidate])) {
    const input = pair[role];
    const outputDirectory = path.join(stagingRoot, exerciseId);
    const output = path.join(outputDirectory, `${role}.webp`);
    await mkdir(outputDirectory, { recursive: true });
    run("magick", [input, "-auto-orient", "-colorspace", "sRGB", "-resize", `${MAX_RUNTIME_WIDTH}x${MAX_RUNTIME_HEIGHT}>`, "-strip", "-quality", String(quality), "-define", "webp:method=6", output]);
    const sourceDimensions = await readPngDimensions(input);
    const targetDimensions = await readWebpDimensions(output);
    if (targetDimensions.width > MAX_RUNTIME_WIDTH || targetDimensions.height > MAX_RUNTIME_HEIGHT) throw new Error(`Converted image exceeds box: ${exerciseId}/${role}`);
    const sourceRatio = sourceDimensions.width / sourceDimensions.height;
    const targetRatio = targetDimensions.width / targetDimensions.height;
    if (Math.abs(sourceRatio - targetRatio) > 0.001) throw new Error(`Aspect ratio changed: ${exerciseId}/${role}`);
    rows.push({
      exerciseId,
      role,
      sourceWidth: sourceDimensions.width,
      sourceHeight: sourceDimensions.height,
      sourceBytes: (await stat(input)).size,
      targetWidth: targetDimensions.width,
      targetHeight: targetDimensions.height,
      targetBytes: (await stat(output)).size
    });
  }
}

for (const exerciseId of source.byExercise.keys()) {
  const start = rows.find((row) => row.exerciseId === exerciseId && row.role === "start");
  const end = rows.find((row) => row.exerciseId === exerciseId && row.role === "end");
  if (start && end && (start.targetWidth !== end.targetWidth || start.targetHeight !== end.targetHeight)) throw new Error(`Converted pair dimensions differ: ${exerciseId}`);
}

for (const row of rows) {
  const destinationDirectory = path.join(runtimeRoot, row.exerciseId);
  await mkdir(destinationDirectory, { recursive: true });
  await copyFile(path.join(stagingRoot, row.exerciseId, `${row.role}.webp`), path.join(destinationDirectory, `${row.role}.webp`));
}

run(process.execPath, [path.join(repoRoot, "scripts", "sync-exercise-image-assets.mjs")]);
run(process.execPath, [path.join(repoRoot, "scripts", "validate-exercise-media.mjs")]);

const sourceBytes = rows.reduce((sum, row) => sum + row.sourceBytes, 0);
const targetBytes = rows.reduce((sum, row) => sum + row.targetBytes, 0);
const targetSizes = rows.map((row) => row.targetBytes);
const largest = [...rows].sort((left, right) => right.targetBytes - left.targetBytes)[0];
const smallest = [...rows].sort((left, right) => left.targetBytes - right.targetBytes)[0];
const report = {
  settings: { format: "WebP", quality, maxWidth: MAX_RUNTIME_WIDTH, maxHeight: MAX_RUNTIME_HEIGHT, preserveAspectRatio: true, crop: false, upscale: false, imageMagick: magickVersion },
  source: { files: rows.length, sets: source.byExercise.size, bytes: sourceBytes },
  runtime: { files: rows.length, sets: source.byExercise.size, bytes: targetBytes, averageBytes: targetBytes / rows.length, medianBytes: median(targetSizes), largest, smallest },
  reductionPercent: (1 - targetBytes / sourceBytes) * 100
};
await writeFile(path.join(reportRoot, "before-after.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
const csvHeader = "exerciseId,role,sourceWidth,sourceHeight,sourceBytes,targetWidth,targetHeight,targetBytes";
const csvRows = rows.map((row) => [row.exerciseId, row.role, row.sourceWidth, row.sourceHeight, row.sourceBytes, row.targetWidth, row.targetHeight, row.targetBytes].join(","));
await writeFile(path.join(reportRoot, "before-after.csv"), `${[csvHeader, ...csvRows].join("\n")}\n`, "utf8");
await rm(stagingRoot, { recursive: true, force: true });
console.log(JSON.stringify(report, null, 2));
