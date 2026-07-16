import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const assetsRoot = path.join(repoRoot, "apps", "mobile", "assets", "exercises");
const domainOutputPath = path.join(repoRoot, "apps", "mobile", "src", "domain", "exerciseImageAssets.ts");
const sourcesOutputPath = path.join(repoRoot, "apps", "mobile", "src", "exerciseImageSources.ts");

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

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const exerciseId = entry.name;
    const startPath = path.join(assetsRoot, exerciseId, "start.png");
    const endPath = path.join(assetsRoot, exerciseId, "end.png");
    if ((await fileExists(startPath)) && (await fileExists(endPath))) {
      exerciseIds.push(exerciseId);
    }
  }

  exerciseIds.sort((left, right) => left.localeCompare(right));

  const domainEntries = exerciseIds
    .map((id) => `  ${JSON.stringify(id)}: [${JSON.stringify(`${id}/start`)}, ${JSON.stringify(`${id}/end`)}]`)
    .join(",\n");

  const sourceEntries = exerciseIds
    .flatMap((id) => [
      `  ${JSON.stringify(`${id}/start`)}: require("../assets/exercises/${id}/start.png")`,
      `  ${JSON.stringify(`${id}/end`)}: require("../assets/exercises/${id}/end.png")`
    ])
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

  await writeFile(sourcesOutputPath, `import type { ImageSourcePropType } from "react-native";

export const exerciseImageSources: Record<string, ImageSourcePropType> = {
${sourceEntries}
};
`, "utf8");

  console.log(`Synced ${exerciseIds.length} exercise image asset mappings.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
