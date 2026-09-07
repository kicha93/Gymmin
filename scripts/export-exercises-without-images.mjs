import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const catalogDir = path.join(repoRoot, "apps", "mobile", "src", "domain", "exerciseCatalog");
const imageRoot = path.join(repoRoot, "media-source", "exercises");
const defaultOutput = path.join(repoRoot, ".artifacts", "cwiczenia-bez-obrazkow.csv");

function getArrayLiteral(source, fileName) {
  const start = source.indexOf("[");
  const end = source.lastIndexOf("] satisfies");
  if (start < 0 || end < 0 || end <= start) {
    throw new Error(`Could not find exercise array literal in ${fileName}`);
  }
  return source.slice(start, end + 1);
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

async function loadCatalog() {
  const files = (await readdir(catalogDir))
    .filter((fileName) => fileName.endsWith(".ts") && fileName !== "index.ts")
    .sort((left, right) => left.localeCompare(right));
  const exercises = [];
  for (const fileName of files) {
    const source = await readFile(path.join(catalogDir, fileName), "utf8");
    exercises.push(...JSON.parse(getArrayLiteral(source, fileName)));
  }
  return exercises;
}

async function main() {
  const outputArg = process.argv[2];
  const outputPath = outputArg ? path.resolve(outputArg) : defaultOutput;
  const exercises = await loadCatalog();
  const imageIds = new Set(
    (await readdir(imageRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
  );

  const ids = new Set();
  for (const exercise of exercises) {
    if (ids.has(exercise.id)) throw new Error(`Duplicate canonical exercise ID: ${exercise.id}`);
    ids.add(exercise.id);
  }

  const missing = exercises
    .filter((exercise) => !imageIds.has(exercise.id))
    .sort((left, right) => left.polishName.localeCompare(right.polishName, "pl"));
  const rows = [
    ["Polska nazwa", "Angielska nazwa", "Canonical ID"],
    ...missing.map((exercise) => [exercise.polishName, exercise.name, exercise.id])
  ];

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`, "utf8");
  console.log(`Exported ${missing.length} exercises without images to ${outputPath}`);
}

await main();
