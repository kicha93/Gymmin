import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const catalogDir = path.join(repoRoot, "apps", "mobile", "src", "domain", "exerciseCatalog");
const namesDir = path.join(repoRoot, "apps", "mobile", "src", "domain", "exerciseNames");
const aliasOutputPath = path.join(repoRoot, "apps", "mobile", "src", "domain", "exerciseAliases.ts");

const defaultInputs = {
  deletes: path.join("C:", "Users", "Administrator", "Downloads", "exercises_to_delete_candidates.json"),
  mappings: path.join("C:", "Users", "Administrator", "Downloads", "exercises_to_map_candidates.json"),
  fixes: path.join("C:", "Users", "Administrator", "Downloads", "exercise_category_fixes.json")
};

const categoryToFile = {
  BANDED_EXERCISES: "banded-exercises",
  BATTLE_ROPE: "battle-rope",
  BENCH_PRESS: "bench-press",
  BIKE_OUTDOOR: "bike-outdoor",
  CALF_RAISE: "calf-raise",
  CARDIO: "cardio",
  CARRY: "carry",
  CHOP: "chop",
  CORE: "core",
  CRUNCH: "crunch",
  CURL: "curl",
  DEADLIFT: "deadlift",
  ELLIPTICAL: "elliptical",
  FLOOR_CLIMB: "floor-climb",
  FLYE: "flye",
  HIP_RAISE: "hip-raise",
  HIP_STABILITY: "hip-stability",
  HIP_SWING: "hip-swing",
  HYPEREXTENSION: "hyperextension",
  INDOOR_BIKE: "indoor-bike",
  LADDER: "ladder",
  LATERAL_RAISE: "lateral-raise",
  LEG_CURL: "leg-curl",
  LEG_RAISE: "leg-raise",
  LUNGE: "lunge",
  OLYMPIC_LIFT: "olympic-lift",
  PLANK: "plank",
  PLYO: "plyo",
  PULL_UP: "pull-up",
  PUSH_UP: "push-up",
  ROW: "row",
  RUN: "run",
  RUN_INDOOR: "run-indoor",
  SANDBAG: "sandbag",
  SHOULDER_PRESS: "shoulder-press",
  SHOULDER_STABILITY: "shoulder-stability",
  SHRUG: "shrug",
  SIT_UP: "sit-up",
  SLED: "sled",
  SLEDGE_HAMMER: "sledge-hammer",
  SQUAT: "squat",
  STAIR_STEPPER: "stair-stepper",
  SUSPENSION: "suspension",
  TIRE: "tire",
  TOTAL_BODY: "total-body",
  TRICEPS_EXTENSION: "triceps-extension",
  WARM_UP: "warm-up"
};

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { ...defaultInputs };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    if (arg === "--deletes" && next) {
      result.deletes = path.resolve(next);
      index += 1;
    } else if (arg === "--mappings" && next) {
      result.mappings = path.resolve(next);
      index += 1;
    } else if (arg === "--fixes" && next) {
      result.fixes = path.resolve(next);
      index += 1;
    }
  }

  return result;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function getArrayLiteral(source, fileName) {
  const start = source.indexOf("[");
  const end = source.lastIndexOf("] satisfies");

  if (start < 0 || end < 0 || end <= start) {
    throw new Error(`Could not find exercise array literal in ${fileName}`);
  }

  return source.slice(start, end + 1);
}

function getConstName(source, fileName) {
  const match = source.match(/export const\s+([A-Za-z0-9_]+)\s*=/);

  if (!match) {
    throw new Error(`Could not find exported const name in ${fileName}`);
  }

  return match[1];
}

function normalizeName(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function setEquipment(exercise, equipmentKeys) {
  const nextEquipment = { ...exercise.equipment };
  Object.keys(nextEquipment).forEach((key) => {
    nextEquipment[key] = equipmentKeys.includes(key) ? 1 : 0;
  });
  exercise.equipment = nextEquipment;
}

async function readCatalog() {
  const files = (await readdir(catalogDir))
    .filter((fileName) => fileName.endsWith(".ts") && fileName !== "index.ts")
    .sort((left, right) => left.localeCompare(right));

  const fileMetaByCategory = new Map();
  const exercises = [];

  for (const fileName of files) {
    const source = await readFile(path.join(catalogDir, fileName), "utf8");
    const constName = getConstName(source, fileName);
    const parsed = JSON.parse(getArrayLiteral(source, fileName));

    for (const exercise of parsed) {
      exercises.push(exercise);
    }

    const category = parsed[0]?.garminCategory;

    if (category) {
      fileMetaByCategory.set(category, { constName, fileName });
    }
  }

  return { exercises, fileMetaByCategory };
}

function buildNameIndex(exercises) {
  const index = new Map();

  for (const exercise of exercises) {
    index.set(normalizeName(exercise.name), exercise);
    index.set(normalizeName(exercise.polishName), exercise);
  }

  return index;
}

function findExercise(index, name) {
  return index.get(normalizeName(name));
}

function writeExerciseFile(constName, exercises) {
  const body = JSON.stringify(exercises, null, 2);
  return `import type { Exercise } from "../exercises";\n\nexport const ${constName} = ${body} satisfies readonly Exercise[];\n`;
}

async function main() {
  const inputs = parseArgs();
  const [deleteJson, mappingJson, fixesJson] = await Promise.all([
    readJson(inputs.deletes),
    readJson(inputs.mappings),
    readJson(inputs.fixes)
  ]);
  const { exercises, fileMetaByCategory } = await readCatalog();
  const beforeCount = exercises.length;
  const nameIndex = buildNameIndex(exercises);
  const aliases = new Map();
  const removedIds = new Set();
  const unresolvedDeletes = [];
  const skippedDeletes = [];

  for (const mapping of mappingJson.items ?? []) {
    const source = findExercise(nameIndex, mapping.sourceEnglishName);
    const target = findExercise(nameIndex, mapping.targetEnglishName);

    if (!source) {
      skippedDeletes.push({ sourceEnglishName: mapping.sourceEnglishName, reason: "source_not_found" });
      continue;
    }

    if (!target) {
      unresolvedDeletes.push({
        sourceEnglishName: mapping.sourceEnglishName,
        targetEnglishName: mapping.targetEnglishName,
        reason: "target_not_found"
      });
      continue;
    }

    if (source.id === target.id) {
      skippedDeletes.push({ sourceEnglishName: mapping.sourceEnglishName, reason: "source_is_target" });
      continue;
    }

    aliases.set(source.name, target.name);
    aliases.set(source.polishName, target.polishName);
    removedIds.add(source.id);
  }

  for (const item of deleteJson.items ?? []) {
    const source = findExercise(nameIndex, item.englishName);
    const target = findExercise(nameIndex, item.mapToEnglishName);

    if (!source || !target || source.id === target.id) {
      continue;
    }

    aliases.set(source.name, target.name);
    aliases.set(source.polishName, target.polishName);
    removedIds.add(source.id);
  }

  const remainingExercises = exercises.filter((exercise) => !removedIds.has(exercise.id));
  const remainingIndex = buildNameIndex(remainingExercises);
  const appliedFixes = [];
  const skippedFixes = [];

  for (const fix of fixesJson.items ?? []) {
    const exercise = findExercise(remainingIndex, fix.englishName);

    if (!exercise) {
      skippedFixes.push({ englishName: fix.englishName, reason: "exercise_not_found_or_removed" });
      continue;
    }

    const suggestedCategory = fix.suggestedExerciseType;

    if (!categoryToFile[suggestedCategory]) {
      skippedFixes.push({ englishName: fix.englishName, reason: `unknown_category:${suggestedCategory}` });
      continue;
    }

    exercise.garminCategory = suggestedCategory;

    if (Array.isArray(fix.suggestedRequiredEquipment)) {
      setEquipment(exercise, fix.suggestedRequiredEquipment);
    }

    appliedFixes.push({
      englishName: exercise.name,
      suggestedExerciseType: suggestedCategory,
      suggestedRequiredEquipment: fix.suggestedRequiredEquipment ?? []
    });
  }

  const groupedByCategory = new Map();

  for (const category of Object.keys(categoryToFile)) {
    groupedByCategory.set(category, []);
  }

  for (const exercise of remainingExercises) {
    const group = groupedByCategory.get(exercise.garminCategory);

    if (!group) {
      throw new Error(`Exercise ${exercise.name} has unsupported category ${exercise.garminCategory}`);
    }

    group.push(exercise);
  }

  for (const [category, group] of groupedByCategory) {
    group.sort((left, right) => left.name.localeCompare(right.name));
    const meta = fileMetaByCategory.get(category);
    const fileName = meta?.fileName ?? `${categoryToFile[category]}.ts`;
    const constName = meta?.constName ?? categoryToFile[category].replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    await writeFile(path.join(catalogDir, fileName), writeExerciseFile(constName, group), "utf8");
    await writeFile(
      path.join(namesDir, `${categoryToFile[category]}.json`),
      `${JSON.stringify(group.map((exercise) => exercise.name), null, 2)}\n`,
      "utf8"
    );
  }

  const sortedAliases = Object.fromEntries(
    [...aliases.entries()].sort(([left], [right]) => left.localeCompare(right))
  );
  await writeFile(
    aliasOutputPath,
    `export const exerciseAliasMap = ${JSON.stringify(sortedAliases, null, 2)} as const;\n`,
    "utf8"
  );

  const afterCount = remainingExercises.length;
  const report = {
    beforeCount,
    afterCount,
    removedCount: beforeCount - afterCount,
    aliasCount: aliases.size,
    mappingInputCount: mappingJson.items?.length ?? 0,
    deleteInputCount: deleteJson.items?.length ?? 0,
    categoryFixInputCount: fixesJson.items?.length ?? 0,
    appliedCategoryFixes: appliedFixes.length,
    skippedCategoryFixes: skippedFixes,
    unresolvedDeletes,
    skippedDeletes: skippedDeletes.slice(0, 25)
  };

  console.log(JSON.stringify(report, null, 2));
}

await main();
