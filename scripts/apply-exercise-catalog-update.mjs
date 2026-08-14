import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogDir = path.join(repoRoot, "apps", "mobile", "src", "domain", "exerciseCatalog");
const sourcePath = process.argv[2];

if (!sourcePath) {
  throw new Error("Usage: node scripts/apply-exercise-catalog-update.mjs <catalog.json>");
}

function readArrayLiteral(source, fileName) {
  const start = source.indexOf("[");
  const end = source.lastIndexOf("] satisfies");
  if (start < 0 || end <= start) {
    throw new Error(`Could not parse exercise array in ${fileName}`);
  }
  return {
    end,
    exercises: JSON.parse(source.slice(start, end + 1)),
    start
  };
}

function normalizeIncomingExercise(exercise) {
  return {
    id: exercise.id,
    name: exercise.names.en,
    polishName: exercise.names.pl,
    category: exercise.category,
    muscleImpact: exercise.muscleImpact,
    equipment: exercise.equipment,
    libraryTier: exercise.libraryTier
  };
}

const input = JSON.parse(await readFile(path.resolve(sourcePath), "utf8"));
const incoming = input.exercises;
if (!Array.isArray(incoming) || incoming.length !== 805) {
  throw new Error(`Expected exactly 805 incoming exercises, received ${incoming?.length ?? "invalid payload"}.`);
}

const incomingById = new Map(incoming.map((exercise) => [exercise.id, exercise]));
if (incomingById.size !== incoming.length) {
  throw new Error("Incoming catalog contains duplicate exercise ids.");
}

const files = (await readdir(catalogDir))
  .filter((fileName) => fileName.endsWith(".ts") && fileName !== "index.ts")
  .sort((left, right) => left.localeCompare(right));

const sourceIds = new Set();
const parsedFiles = [];
for (const fileName of files) {
  const filePath = path.join(catalogDir, fileName);
  const source = await readFile(filePath, "utf8");
  const parsed = readArrayLiteral(source, fileName);
  for (const exercise of parsed.exercises) {
    if (sourceIds.has(exercise.id)) {
      throw new Error(`Duplicate source exercise id: ${exercise.id}`);
    }
    sourceIds.add(exercise.id);
  }
  parsedFiles.push({ filePath, source, ...parsed });
}

const missingFromInput = [...sourceIds].filter((id) => !incomingById.has(id));
const missingFromSource = [...incomingById.keys()].filter((id) => !sourceIds.has(id));
if (missingFromInput.length || missingFromSource.length) {
  throw new Error(JSON.stringify({ missingFromInput, missingFromSource }, null, 2));
}

for (const { end, exercises, filePath, source, start } of parsedFiles) {
  const updated = exercises.map((exercise) => normalizeIncomingExercise(incomingById.get(exercise.id)));
  const nextSource = `${source.slice(0, start)}${JSON.stringify(updated, null, 2)}${source.slice(end + 1)}`;
  await writeFile(filePath, nextSource, "utf8");
}

console.log(`Updated ${sourceIds.size} exercises across ${parsedFiles.length} catalog files.`);
