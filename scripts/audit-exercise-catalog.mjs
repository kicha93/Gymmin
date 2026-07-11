import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogDir = path.join(repoRoot, "apps", "mobile", "src", "domain", "exerciseCatalog");
const reportDir = path.join(repoRoot, "docs", "reports");

function getArrayLiteral(source, fileName) {
  const start = source.indexOf("[");
  const end = source.lastIndexOf("] satisfies");
  if (start < 0 || end <= start) throw new Error(`Cannot parse ${fileName}`);
  return source.slice(start, end + 1);
}

function normalize(value) {
  return String(value ?? "").trim().toLocaleLowerCase("en").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[’']/g, "'")
    .replace(/[-_]+/g, " ").replace(/\s+/g, " ");
}

function groupDuplicates(exercises, field) {
  const grouped = new Map();
  for (const exercise of exercises) {
    const key = normalize(exercise[field]);
    if (!key) continue;
    grouped.set(key, [...(grouped.get(key) ?? []), { id: exercise.id, name: exercise.name, polishName: exercise.polishName }]);
  }
  return [...grouped.values()].filter((items) => items.length > 1);
}

function equipmentKeys(exercise) {
  return Object.entries(exercise.equipment ?? {}).filter(([, value]) => value > 0).map(([key]) => key);
}

const equipmentHints = [
  [/\bdumbbell\b/i, "dumbbell"], [/\bbarbell\b/i, "barbell"], [/\bcable\b/i, "cableMachine"],
  [/\bswiss ball\b/i, "swissBall"], [/\brings?\b/i, "rings"], [/\bkettlebell\b/i, "kettlebell"],
  [/\bsmith machine\b/i, "smithMachine"], [/\b(resistance band|banded)\b/i, "band"], [/\bbench\b/i, "bench"]
];

async function main() {
  const files = (await readdir(catalogDir)).filter((file) => file.endsWith(".ts") && file !== "index.ts").sort();
  const exercises = [];
  for (const fileName of files) {
    const source = await readFile(path.join(catalogDir, fileName), "utf8");
    for (const exercise of JSON.parse(getArrayLiteral(source, fileName))) exercises.push({ ...exercise, sourceFile: fileName });
  }

  const suspiciousEquipment = [];
  for (const exercise of exercises) {
    const actual = new Set(equipmentKeys(exercise));
    for (const [pattern, expected] of equipmentHints) {
      if (pattern.test(exercise.name) && !actual.has(expected)) {
        suspiciousEquipment.push({ id: exercise.id, name: exercise.name, expected, actual: [...actual] });
      }
    }
  }

  const progressionOrModifier = exercises.filter((exercise) =>
    /(progression|circuit|triple.stop|partial lockout|static hold|isometric|paused|tempo|kipping|jumping pull)/i.test(exercise.name)
  ).map(({ id, name, polishName, garminCategory }) => ({ id, name, polishName, garminCategory }));

  const report = {
    generatedAt: new Date().toISOString(),
    exerciseCount: exercises.length,
    duplicateIds: groupDuplicates(exercises, "id"),
    duplicateEnglishNames: groupDuplicates(exercises, "name"),
    duplicatePolishNames: groupDuplicates(exercises, "polishName"),
    emptyNames: exercises.filter((exercise) => !exercise.name?.trim() || !exercise.polishName?.trim()).map(({ id, name, polishName }) => ({ id, name, polishName })),
    suspiciousEquipment,
    progressionOrModifier
  };

  await mkdir(reportDir, { recursive: true });
  await writeFile(path.join(reportDir, "exercise-catalog-before-refactor.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    exerciseCount: report.exerciseCount,
    duplicateEnglishNames: report.duplicateEnglishNames.length,
    duplicatePolishNames: report.duplicatePolishNames.length,
    suspiciousEquipment: report.suspiciousEquipment.length,
    progressionOrModifier: report.progressionOrModifier.length
  }, null, 2));
}

await main();
