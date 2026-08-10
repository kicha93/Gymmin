import { copyFile, mkdir, readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const catalogDir = path.join(repoRoot, "apps", "mobile", "src", "domain", "exerciseCatalog");
const defaultOutputRoot = path.join(repoRoot, "media-source", "exercises");

function parseArgs(argv) {
  const args = {
    dryRun: false,
    outputRoot: defaultOutputRoot,
    sourceRoot: null
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const nextValue = () => {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`Missing value for ${arg}`);
      }
      index += 1;
      return value;
    };

    if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--output-root") args.outputRoot = path.resolve(repoRoot, nextValue());
    else if (arg === "--source-root") args.sourceRoot = path.resolve(nextValue());
    else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!args.sourceRoot) {
    throw new Error("--source-root is required");
  }

  return args;
}

function printHelp() {
  console.log(`
Import exercise images from folders named by Polish exercise names.

Expected source structure:
  <source-root>/<Polish exercise name>/start.png
  <source-root>/<Polish exercise name>/end.png

Example:
  node scripts/import-exercise-images-from-folder.mjs --source-root "C:\\Users\\Administrator\\Downloads\\cwiczenia" --dry-run

Imported PNG files are editable sources. Run npm run exercise:media:optimize to create production WebP assets.
`);
}

function getArrayLiteral(source, fileName) {
  const start = source.indexOf("[");
  const end = source.lastIndexOf("] satisfies");
  if (start < 0 || end < 0 || end <= start) {
    throw new Error(`Could not find exercise array literal in ${fileName}`);
  }
  return source.slice(start, end + 1);
}

async function loadCatalogExercises() {
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

function normalizeName(value) {
  return String(value ?? "")
    .normalize("NFC")
    .trim()
    .toLocaleLowerCase("pl")
    .replace(/\s+/g, " ");
}

function buildPolishNameLookup(exercises) {
  const lookup = new Map();
  const duplicates = new Map();

  for (const exercise of exercises) {
    const key = normalizeName(exercise.polishName);
    if (lookup.has(key)) {
      duplicates.set(key, [...(duplicates.get(key) ?? [lookup.get(key)]), exercise]);
      lookup.delete(key);
      continue;
    }
    if (!duplicates.has(key)) {
      lookup.set(key, exercise);
    }
  }

  return { duplicates, lookup };
}

async function isDirectory(filePath) {
  try {
    return (await stat(filePath)).isDirectory();
  } catch {
    return false;
  }
}

async function fileExists(filePath) {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const catalogExercises = await loadCatalogExercises();
  const { duplicates, lookup } = buildPolishNameLookup(catalogExercises);
  const sourceEntries = await readdir(args.sourceRoot);
  const sourceFolders = [];

  for (const entry of sourceEntries) {
    const sourcePath = path.join(args.sourceRoot, entry);
    if (await isDirectory(sourcePath)) {
      sourceFolders.push({ name: entry, sourcePath });
    }
  }

  const matched = [];
  const missingImages = [];
  const unmatched = [];
  const ambiguous = [];

  for (const folder of sourceFolders) {
    const key = normalizeName(folder.name);
    const duplicateMatches = duplicates.get(key);
    if (duplicateMatches) {
      ambiguous.push({ folder: folder.name, ids: duplicateMatches.map((item) => item.id) });
      continue;
    }

    const exercise = lookup.get(key);
    if (!exercise) {
      unmatched.push(folder.name);
      continue;
    }

    const startPath = path.join(folder.sourcePath, "start.png");
    const endPath = path.join(folder.sourcePath, "end.png");
    if (!(await fileExists(startPath)) || !(await fileExists(endPath))) {
      missingImages.push(folder.name);
      continue;
    }

    matched.push({
      endPath,
      exercise,
      folderName: folder.name,
      outputDir: path.join(args.outputRoot, exercise.id),
      startPath
    });
  }

  console.log(`Catalog exercises: ${catalogExercises.length}`);
  console.log(`Source folders: ${sourceFolders.length}`);
  console.log(`Matched folders: ${matched.length}`);
  console.log(`Unmatched folders: ${unmatched.length}`);
  console.log(`Ambiguous folders: ${ambiguous.length}`);
  console.log(`Missing image folders: ${missingImages.length}`);

  if (unmatched.length) {
    console.log(`Unmatched: ${unmatched.slice(0, 20).join(" | ")}${unmatched.length > 20 ? " ..." : ""}`);
  }
  if (ambiguous.length) {
    console.log(`Ambiguous: ${ambiguous.slice(0, 20).map((item) => `${item.folder} -> ${item.ids.join(",")}`).join(" | ")}${ambiguous.length > 20 ? " ..." : ""}`);
  }
  if (missingImages.length) {
    console.log(`Missing images: ${missingImages.slice(0, 20).join(" | ")}${missingImages.length > 20 ? " ..." : ""}`);
  }

  for (const item of matched) {
    console.log(`${args.dryRun ? "[dry-run] " : ""}${item.folderName} -> ${path.relative(repoRoot, item.outputDir)}`);
    if (args.dryRun) {
      continue;
    }

    await mkdir(item.outputDir, { recursive: true });
    await copyFile(item.startPath, path.join(item.outputDir, "start.png"));
    await copyFile(item.endPath, path.join(item.outputDir, "end.png"));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
