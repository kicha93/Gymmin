import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const catalogDir = path.join(repoRoot, "apps", "mobile", "src", "domain", "exerciseCatalog");
const namesDir = path.join(repoRoot, "apps", "mobile", "src", "domain", "exerciseNames");
const aliasPath = path.join(repoRoot, "apps", "mobile", "src", "domain", "exerciseAliases.ts");
const defaultInput = path.join("C:", "Users", "Administrator", "Downloads", "top20_exercise_name_normalization_mapping.json");

const categoryToFile = {
  BANDED_EXERCISES: "banded-exercises", BATTLE_ROPE: "battle-rope", BENCH_PRESS: "bench-press", BIKE_OUTDOOR: "bike-outdoor", CALF_RAISE: "calf-raise", CARDIO: "cardio", CARRY: "carry", CHOP: "chop", CORE: "core", CRUNCH: "crunch", CURL: "curl", DEADLIFT: "deadlift", ELLIPTICAL: "elliptical", FLOOR_CLIMB: "floor-climb", FLYE: "flye", HIP_RAISE: "hip-raise", HIP_STABILITY: "hip-stability", HIP_SWING: "hip-swing", HYPEREXTENSION: "hyperextension", INDOOR_BIKE: "indoor-bike", LADDER: "ladder", LATERAL_RAISE: "lateral-raise", LEG_CURL: "leg-curl", LEG_RAISE: "leg-raise", LUNGE: "lunge", OLYMPIC_LIFT: "olympic-lift", PLANK: "plank", PLYO: "plyo", PULL_UP: "pull-up", PUSH_UP: "push-up", ROW: "row", RUN: "run", RUN_INDOOR: "run-indoor", SANDBAG: "sandbag", SHOULDER_PRESS: "shoulder-press", SHOULDER_STABILITY: "shoulder-stability", SHRUG: "shrug", SIT_UP: "sit-up", SLED: "sled", SLEDGE_HAMMER: "sledge-hammer", SQUAT: "squat", STAIR_STEPPER: "stair-stepper", SUSPENSION: "suspension", TIRE: "tire", TOTAL_BODY: "total-body", TRICEPS_EXTENSION: "triceps-extension", WARM_UP: "warm-up"
};

function getArrayLiteral(source, fileName) {
  const start = source.indexOf("[");
  const end = source.lastIndexOf("] satisfies");
  if (start < 0 || end <= start) throw new Error(`Could not find catalog array in ${fileName}`);
  return source.slice(start, end + 1);
}

function getConstName(source, fileName) {
  const match = source.match(/export const\s+([A-Za-z0-9_]+)\s*=/);
  if (!match) throw new Error(`Could not find catalog const in ${fileName}`);
  return match[1];
}

function normalize(value) {
  return String(value ?? "").trim().toLocaleLowerCase("en").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function writeCatalogFile(constName, list) {
  return `import type { Exercise } from "../exercises";\n\nexport const ${constName} = ${JSON.stringify(list, null, 2)} satisfies readonly Exercise[];\n`;
}

const inputPath = process.argv[2] ? path.resolve(process.argv[2]) : defaultInput;
const input = JSON.parse(await readFile(inputPath, "utf8"));
const files = (await readdir(catalogDir)).filter((file) => file.endsWith(".ts") && file !== "index.ts");
const byEnglishName = new Map();
const groups = new Map();

for (const fileName of files) {
  const source = await readFile(path.join(catalogDir, fileName), "utf8");
  const list = JSON.parse(getArrayLiteral(source, fileName));
  const category = list[0]?.garminCategory;
  groups.set(category, { constName: getConstName(source, fileName), fileName, list });
  for (const exercise of list) byEnglishName.set(normalize(exercise.name), exercise);
}

const aliasSource = await readFile(aliasPath, "utf8");
const aliasLiteral = aliasSource.slice(aliasSource.indexOf("{"), aliasSource.lastIndexOf("} as const") + 1);
const aliases = new Map(Object.entries(JSON.parse(aliasLiteral)));
const affectedCategories = new Set();
const renamed = [];
const skipped = [];

function addAliases(target, aliasNames) {
  for (const alias of aliasNames ?? []) {
    const value = String(alias ?? "").trim();
    if (value && value !== target.name && value !== target.polishName) aliases.set(value, target.name);
  }
}

for (const mapping of input.renameMappings ?? []) {
  const exercise = byEnglishName.get(normalize(mapping.englishName));
  if (!exercise) { skipped.push({ name: mapping.englishName, reason: "rename_source_not_found" }); continue; }
  const previousPolishName = exercise.polishName;
  exercise.polishName = mapping.normalizedNamePl;
  addAliases(exercise, [previousPolishName, mapping.currentNamePl, ...(mapping.commonAliasesPl ?? [])]);
  affectedCategories.add(exercise.garminCategory);
  renamed.push({ englishName: exercise.name, polishName: exercise.polishName });
}

for (const mapping of input.alreadyGoodNames ?? []) {
  const exercise = byEnglishName.get(normalize(mapping.englishName));
  if (!exercise) { skipped.push({ name: mapping.englishName, reason: "alias_target_not_found" }); continue; }
  addAliases(exercise, mapping.commonAliasesPl);
}

for (const mapping of input.mergeMappings ?? []) {
  const source = byEnglishName.get(normalize(mapping.sourceEnglishName));
  const target = byEnglishName.get(normalize(mapping.targetEnglishName));
  if (source) {
    skipped.push({ name: mapping.sourceEnglishName, reason: "optional_merge_source_still_exists" });
    continue;
  }
  if (!target) { skipped.push({ name: mapping.sourceEnglishName, reason: "optional_merge_target_not_found" }); continue; }
  aliases.set(mapping.sourceEnglishName, target.name);
  if (mapping.sourceNamePl) aliases.set(mapping.sourceNamePl, target.name);
}

for (const [category, group] of groups) {
  if (!affectedCategories.has(category)) continue;
  group.list.sort((left, right) => left.name.localeCompare(right.name));
  await writeFile(path.join(catalogDir, group.fileName), writeCatalogFile(group.constName, group.list), "utf8");
  await writeFile(path.join(namesDir, `${categoryToFile[category]}.json`), `${JSON.stringify(group.list.map((exercise) => exercise.name), null, 2)}\n`, "utf8");
}

const sortedAliases = Object.fromEntries([...aliases.entries()].sort(([left], [right]) => left.localeCompare(right)));
await writeFile(aliasPath, `export const exerciseAliasMap = ${JSON.stringify(sortedAliases, null, 2)} as const;\n`, "utf8");

console.log(JSON.stringify({ renamed, aliasCount: aliases.size, skipped }, null, 2));
