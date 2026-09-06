import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assetsRoot = path.join(repoRoot, "apps", "mobile", "assets", "exercises");
const domainOutputPath = path.join(repoRoot, "apps", "mobile", "src", "domain", "exerciseImageAssets.ts");
const imageSourcesOutputPath = path.join(repoRoot, "apps", "mobile", "src", "exerciseImageSources.ts");

async function fileExists(filePath) {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

async function main() {
  const entries = await readdir(assetsRoot, { withFileTypes: true });
  const imageAssets = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const exerciseId = entry.name;
    const roles = [];
    if (await fileExists(path.join(assetsRoot, exerciseId, "start.webp"))) roles.push("start");
    if (await fileExists(path.join(assetsRoot, exerciseId, "end.webp"))) roles.push("end");
    if (roles.length) imageAssets.push({ exerciseId, roles });
  }

  imageAssets.sort((left, right) => left.exerciseId.localeCompare(right.exerciseId));

  const domainEntries = imageAssets
    .map(({ exerciseId, roles }) => `  ${JSON.stringify(exerciseId)}: [${roles.map((role) => JSON.stringify(`${exerciseId}/${role}`)).join(", ")}]`)
    .join(",\n");
  const imageSourceEntries = imageAssets
    .flatMap(({ exerciseId, roles }) => roles.map((role) =>
      `  ${JSON.stringify(`${exerciseId}/${role}`)}: require("../assets/exercises/${exerciseId}/${role}.webp")`
    ))
    .join(",\n");

  await mkdir(path.dirname(domainOutputPath), { recursive: true });
  await writeFile(domainOutputPath, `import { resolveExerciseId } from "./exercises";

export type ExerciseImageAssetKey = string;

const exerciseImageAssetKeysById: Record<string, ExerciseImageAssetKey[]> = {
${domainEntries}
};

export function getExerciseImageAssetKeys(exerciseId: string): ExerciseImageAssetKey[] {
  return exerciseImageAssetKeysById[resolveExerciseId(exerciseId)] ?? [];
}
`, "utf8");

  await writeFile(imageSourcesOutputPath, `import type { ImageSourcePropType } from "react-native";

export const exerciseImageSources: Record<string, ImageSourcePropType> = {
${imageSourceEntries}
};
`, "utf8");

  console.log(`Synced ${imageAssets.length} exercise image sets.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
