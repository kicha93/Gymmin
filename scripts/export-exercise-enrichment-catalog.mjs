import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogDir = path.join(repoRoot, "apps", "mobile", "src", "domain", "exerciseCatalog");
const outputPath = path.join(repoRoot, "docs", "exercise-catalog-for-ai-enrichment.json");

function readArrayLiteral(source, fileName) {
  const start = source.indexOf("[");
  const end = source.lastIndexOf("] satisfies");
  if (start < 0 || end <= start) {
    throw new Error(`Could not parse exercise array in ${fileName}`);
  }
  return JSON.parse(source.slice(start, end + 1));
}

const files = (await readdir(catalogDir))
  .filter((fileName) => fileName.endsWith(".ts") && fileName !== "index.ts")
  .sort((left, right) => left.localeCompare(right));

const exercises = [];
for (const fileName of files) {
  const source = await readFile(path.join(catalogDir, fileName), "utf8");
  exercises.push(...readArrayLiteral(source, fileName));
}

exercises.sort((left, right) => left.id.localeCompare(right.id));
const firstExercise = exercises[0];
const payload = {
  schemaVersion: 1,
  purpose: "Gymmin exercise catalog prepared for external AI-assisted metadata review and enrichment.",
  editingRules: [
    "Do not change or remove exercise.id.",
    "Keep every exercise exactly once.",
    "muscleImpact values must be integers from 0 to 5; use the documented biomechanical impact scale.",
    "equipment values must be 0 or 1.",
    "Use the same schema for every exercise and return valid JSON without Markdown."
  ],
  requestedReview: [
    "Review muscle impact based on exercise biomechanics without interpreting it as an EMG percentage or direct hypertrophy measure.",
    "Correct required equipment.",
    "Propose any additional consistently structured exercise metadata separately before adding it to every record."
  ],
  enums: {
    categories: [...new Set(exercises.map((exercise) => exercise.category))].sort(),
    equipment: Object.keys(firstExercise?.equipment ?? {}),
    libraryTiers: [...new Set(exercises.map((exercise) => exercise.libraryTier ?? "main"))].sort(),
    muscleImpact: {
      none: 0,
      stabilizing: 1,
      secondary: 2,
      significantSynergist: 3,
      majorContributor: 4,
      primary: 5
    },
    muscles: Object.keys(firstExercise?.muscleImpact ?? {})
  },
  exerciseCount: exercises.length,
  exercises: exercises.map((exercise) => ({
    id: exercise.id,
    names: { en: exercise.name, pl: exercise.polishName },
    category: exercise.category,
    libraryTier: exercise.libraryTier ?? "main",
    muscleImpact: exercise.muscleImpact,
    equipment: exercise.equipment
  }))
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`Exported ${exercises.length} exercises to ${path.relative(repoRoot, outputPath)}`);
