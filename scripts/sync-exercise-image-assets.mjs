import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assetsRoot = path.join(repoRoot, "apps", "mobile", "assets", "exercises");
const domainOutputPath = path.join(repoRoot, "apps", "mobile", "src", "domain", "exerciseImageAssets.ts");
const imageSourcesOutputPath = path.join(repoRoot, "apps", "mobile", "src", "exerciseImageSources.ts");
const videoSourcesOutputPath = path.join(repoRoot, "apps", "mobile", "src", "exerciseVideoSources.ts");

async function fileExists(filePath) {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

async function main() {
  const entries = await readdir(assetsRoot, { withFileTypes: true });
  const exerciseIds = [];
  const animationIds = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const exerciseId = entry.name;
    if (
      (await fileExists(path.join(assetsRoot, exerciseId, "start.webp"))) &&
      (await fileExists(path.join(assetsRoot, exerciseId, "end.webp")))
    ) {
      exerciseIds.push(exerciseId);
    }
    if (await fileExists(path.join(assetsRoot, exerciseId, "animation.mp4"))) {
      animationIds.push(exerciseId);
    }
  }

  exerciseIds.sort((left, right) => left.localeCompare(right));
  animationIds.sort((left, right) => left.localeCompare(right));

  const domainEntries = exerciseIds
    .map((id) => `  ${JSON.stringify(id)}: [${JSON.stringify(`${id}/start`)}, ${JSON.stringify(`${id}/end`)}]`)
    .join(",\n");
  const animationDomainEntries = animationIds
    .map((id) => `  ${JSON.stringify(id)}: ${JSON.stringify(`${id}/animation`)}`)
    .join(",\n");
  const imageSourceEntries = exerciseIds
    .flatMap((id) => [
      `  ${JSON.stringify(`${id}/start`)}: require("../assets/exercises/${id}/start.webp")`,
      `  ${JSON.stringify(`${id}/end`)}: require("../assets/exercises/${id}/end.webp")`
    ])
    .join(",\n");
  const videoSourceEntries = animationIds
    .map((id) => `  ${JSON.stringify(`${id}/animation`)}: require("../assets/exercises/${id}/animation.mp4")`)
    .join(",\n");

  await mkdir(path.dirname(domainOutputPath), { recursive: true });
  await writeFile(domainOutputPath, `import { resolveExerciseId } from "./exercises";

export type ExerciseImageAssetKey = string;

const exerciseImageAssetKeysById: Record<string, ExerciseImageAssetKey[]> = {
${domainEntries}
};

const exerciseAnimationAssetKeyById: Record<string, ExerciseImageAssetKey> = {
${animationDomainEntries}
};

export function getExerciseImageAssetKeys(exerciseId: string): ExerciseImageAssetKey[] {
  return exerciseImageAssetKeysById[resolveExerciseId(exerciseId)] ?? [];
}

export function getExerciseAnimationAssetKey(exerciseId: string): ExerciseImageAssetKey | null {
  return exerciseAnimationAssetKeyById[resolveExerciseId(exerciseId)] ?? null;
}
`, "utf8");

  await writeFile(imageSourcesOutputPath, `import type { ImageSourcePropType } from "react-native";

export const exerciseImageSources: Record<string, ImageSourcePropType> = {
${imageSourceEntries}
};
`, "utf8");

  await writeFile(videoSourcesOutputPath, `import type { VideoSource } from "expo-video";

export const exerciseVideoSources: Record<string, VideoSource> = {
${videoSourceEntries}
};
`, "utf8");

  console.log(`Synced ${exerciseIds.length} exercise image pairs and ${animationIds.length} exercise animations.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
