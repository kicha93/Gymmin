import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const catalogDir = path.join(repoRoot, "apps", "mobile", "src", "domain", "exerciseCatalog");
const outputPath = path.join(repoRoot, "docs", "exercise-summary.json");

function getArrayLiteral(source, fileName) {
  const start = source.indexOf("[");
  const end = source.lastIndexOf("] satisfies");

  if (start < 0 || end < 0 || end <= start) {
    throw new Error(`Could not find exercise array literal in ${fileName}`);
  }

  return source.slice(start, end + 1);
}

function getRequiredEquipment(equipment) {
  if (!equipment || typeof equipment !== "object") {
    return [];
  }

  return Object.entries(equipment)
    .filter(([, value]) => value === 1)
    .map(([key]) => key)
    .sort((left, right) => left.localeCompare(right));
}

const files = (await readdir(catalogDir))
  .filter((fileName) => fileName.endsWith(".ts") && fileName !== "index.ts")
  .sort((left, right) => left.localeCompare(right));

const exercises = [];

for (const fileName of files) {
  const source = await readFile(path.join(catalogDir, fileName), "utf8");
  const arrayLiteral = getArrayLiteral(source, fileName);
  const parsed = JSON.parse(arrayLiteral);

  for (const exercise of parsed) {
    exercises.push({
      id: exercise.id,
      polishName: exercise.polishName,
      englishName: exercise.name,
      exerciseType: exercise.garminCategory,
      requiredEquipment: getRequiredEquipment(exercise.equipment),
      libraryTier: exercise.libraryTier ?? "main"
    });
  }
}

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(exercises, null, 2)}\n`, "utf8");

console.log(`Exported ${exercises.length} exercises to ${path.relative(repoRoot, outputPath)}`);
