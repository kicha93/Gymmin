import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const catalogDir = path.join(repoRoot, "apps", "mobile", "src", "domain", "exerciseCatalog");
const namesDir = path.join(repoRoot, "apps", "mobile", "src", "domain", "exerciseNames");
const aliasPath = path.join(repoRoot, "apps", "mobile", "src", "domain", "exerciseAliases.ts");

const defaults = {
  deletes: path.join("C:", "Users", "Administrator", "Downloads", "exercises_stage2_delete_recommendations.json"),
  existing: path.join("C:", "Users", "Administrator", "Downloads", "exercises_stage2_mapping_to_existing.json"),
  grouped: path.join("C:", "Users", "Administrator", "Downloads", "exercises_stage2_mapping_to_new_group.json"),
  withoutMapping: path.join("C:", "Users", "Administrator", "Downloads", "exercises_stage2_delete_without_mapping.json")
};

const categoryToFile = {
  BANDED_EXERCISES: "banded-exercises", BATTLE_ROPE: "battle-rope", BENCH_PRESS: "bench-press", BIKE_OUTDOOR: "bike-outdoor", CALF_RAISE: "calf-raise", CARDIO: "cardio", CARRY: "carry", CHOP: "chop", CORE: "core", CRUNCH: "crunch", CURL: "curl", DEADLIFT: "deadlift", ELLIPTICAL: "elliptical", FLOOR_CLIMB: "floor-climb", FLYE: "flye", HIP_RAISE: "hip-raise", HIP_STABILITY: "hip-stability", HIP_SWING: "hip-swing", HYPEREXTENSION: "hyperextension", INDOOR_BIKE: "indoor-bike", LADDER: "ladder", LATERAL_RAISE: "lateral-raise", LEG_CURL: "leg-curl", LEG_RAISE: "leg-raise", LUNGE: "lunge", OLYMPIC_LIFT: "olympic-lift", PLANK: "plank", PLYO: "plyo", PULL_UP: "pull-up", PUSH_UP: "push-up", ROW: "row", RUN: "run", RUN_INDOOR: "run-indoor", SANDBAG: "sandbag", SHOULDER_PRESS: "shoulder-press", SHOULDER_STABILITY: "shoulder-stability", SHRUG: "shrug", SIT_UP: "sit-up", SLED: "sled", SLEDGE_HAMMER: "sledge-hammer", SQUAT: "squat", STAIR_STEPPER: "stair-stepper", SUSPENSION: "suspension", TIRE: "tire", TOTAL_BODY: "total-body", TRICEPS_EXTENSION: "triceps-extension", WARM_UP: "warm-up"
};

const muscleKeys = ["abductors", "abs", "adductors", "biceps", "calves", "chest", "forearm", "glutes", "hamstrings", "hips", "lats", "lowerBack", "obliques", "quads", "shoulders", "traps", "triceps"];
const equipmentKeys = ["ankleWeight", "band", "barbell", "battleRope", "bench", "bike", "bosuBall", "box", "cableMachine", "dumbbell", "ezBar", "foamRoller", "jumpRope", "kettlebell", "machine", "medicineBall", "other", "plate", "pullupBar", "rings", "rope", "sandbag", "sled", "slidingDisc", "smithMachine", "squatRack", "swissBall", "trx", "weightVest"];

const zeroMuscles = () => Object.fromEntries(muscleKeys.map((key) => [key, 0]));
const zeroEquipment = () => Object.fromEntries(equipmentKeys.map((key) => [key, 0]));
const withValues = (base, values) => ({ ...base(), ...values });

const groupedExercises = {
  "Back Extension": {
    id: "stage2-back-extension",
    name: "Back Extension",
    polishName: "Back Extension",
    garminCategory: "HYPEREXTENSION",
    garminName: "BACK_EXTENSION",
    foundInGarmin: false,
    image: "",
    url: "",
    difficulty: "Beginner",
    description: "A controlled trunk-extension movement that develops the lower back and glutes.",
    muscleImpact: withValues(zeroMuscles, { glutes: 1, hamstrings: 1, lowerBack: 2 }),
    equipment: zeroEquipment()
  },
  "Prone I-Y-T Raise": {
    id: "stage2-prone-i-y-t-raise",
    name: "Prone I-Y-T Raise",
    polishName: "Wznosy I-Y-T w leżeniu przodem",
    garminCategory: "SHOULDER_STABILITY",
    garminName: "PRONE_I_Y_T_RAISE",
    foundInGarmin: false,
    image: "",
    url: "",
    difficulty: "Beginner",
    description: "A prone shoulder-stability sequence using I, Y and T arm positions.",
    muscleImpact: withValues(zeroMuscles, { shoulders: 2, traps: 2 }),
    equipment: zeroEquipment()
  },
  "Incline Bench I-Y-T-W Raise": {
    id: "stage2-incline-bench-i-y-t-w-raise",
    name: "Incline Bench I-Y-T-W Raise",
    polishName: "Wznosy I-Y-T-W na ławce dodatniej",
    garminCategory: "SHOULDER_STABILITY",
    garminName: "INCLINE_BENCH_I_Y_T_W_RAISE",
    foundInGarmin: false,
    image: "",
    url: "",
    difficulty: "Beginner",
    description: "An incline-bench shoulder-stability sequence using I, Y, T and W arm positions.",
    muscleImpact: withValues(zeroMuscles, { shoulders: 2, traps: 2 }),
    equipment: withValues(zeroEquipment, { bench: 1 })
  },
  "Side-lying Leg Lift": {
    id: "stage2-side-lying-leg-lift",
    name: "Side-lying Leg Lift",
    polishName: "Unoszenie nogi bokiem w leżeniu",
    garminCategory: "HIP_STABILITY",
    garminName: "SIDE_LYING_LEG_LIFT",
    foundInGarmin: false,
    image: "",
    url: "",
    difficulty: "Beginner",
    description: "A side-lying hip-abduction movement for the lateral glutes.",
    muscleImpact: withValues(zeroMuscles, { abductors: 2, glutes: 2, hips: 1 }),
    equipment: zeroEquipment()
  },
  "Swiss Ball I-Y-T-W Raise": {
    id: "stage2-swiss-ball-i-y-t-w-raise",
    name: "Swiss Ball I-Y-T-W Raise",
    polishName: "Wznosy I-Y-T-W na piłce gimnastycznej",
    garminCategory: "SHOULDER_STABILITY",
    garminName: "SWISS_BALL_I_Y_T_W_RAISE",
    foundInGarmin: false,
    image: "",
    url: "",
    difficulty: "Beginner",
    description: "A shoulder-stability sequence performed prone on a Swiss ball.",
    muscleImpact: withValues(zeroMuscles, { shoulders: 2, traps: 2, abs: 1 }),
    equipment: withValues(zeroEquipment, { swissBall: 1 })
  }
};

function parseArgs() {
  const result = { ...defaults };
  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index]?.replace(/^--/, "");
    if (key in result && args[index + 1]) result[key] = path.resolve(args[++index]);
  }
  return result;
}

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

async function main() {
  const input = parseArgs();
  const [deleteRecommendations, existingMappings, groupedMappings, withoutMapping] = await Promise.all(
    Object.values(input).map(async (filePath) => JSON.parse(await readFile(filePath, "utf8")))
  );
  const files = (await readdir(catalogDir)).filter((file) => file.endsWith(".ts") && file !== "index.ts");
  const allExercises = [];
  const groups = new Map();
  const byName = new Map();

  for (const fileName of files) {
    const source = await readFile(path.join(catalogDir, fileName), "utf8");
    const list = JSON.parse(getArrayLiteral(source, fileName));
    const category = list[0]?.garminCategory;
    groups.set(category, { fileName, constName: getConstName(source, fileName), list });
    for (const exercise of list) {
      allExercises.push(exercise);
      byName.set(normalize(exercise.name), exercise);
      byName.set(normalize(exercise.polishName), exercise);
    }
  }

  const aliasSource = await readFile(aliasPath, "utf8");
  const aliasLiteral = aliasSource.slice(aliasSource.indexOf("{") , aliasSource.lastIndexOf("} as const") + 1);
  const aliases = new Map(Object.entries(JSON.parse(aliasLiteral)));
  const resolveAlias = (name) => {
    const visited = new Set();
    let current = name;
    while (aliases.has(current) && !visited.has(current)) {
      visited.add(current);
      current = aliases.get(current);
    }
    return current;
  };
  const findCurrent = (name) => byName.get(normalize(name));
  const findTarget = (name) => byName.get(normalize(resolveAlias(name))) ?? findCurrent(name);
  const removedIds = new Set();
  const affectedCategories = new Set();
  const mapped = [];
  const skipped = [];

  for (const mapping of groupedMappings.items ?? []) {
    const source = findCurrent(mapping.sourceEnglishName);
    const target = groupedExercises[mapping.suggestedTargetEnglishName];
    if (!source) { skipped.push({ source: mapping.sourceEnglishName, reason: "source_not_found" }); continue; }
    if (!target) { skipped.push({ source: mapping.sourceEnglishName, reason: "missing_group_target" }); continue; }
    if (!byName.has(normalize(target.name))) {
      const group = groups.get(target.garminCategory);
      group.list.push(target);
      byName.set(normalize(target.name), target);
      byName.set(normalize(target.polishName), target);
      affectedCategories.add(target.garminCategory);
    }
    aliases.set(source.name, target.name);
    aliases.set(source.polishName, target.polishName);
    removedIds.add(source.id);
    affectedCategories.add(source.garminCategory);
    mapped.push({ source: source.name, target: target.name });
  }

  for (const mapping of existingMappings.items ?? []) {
    const source = findCurrent(mapping.sourceEnglishName);
    const target = findTarget(mapping.targetEnglishName);
    if (!source) { skipped.push({ source: mapping.sourceEnglishName, reason: "source_not_found" }); continue; }
    if (!target) { skipped.push({ source: mapping.sourceEnglishName, reason: "target_not_found", target: mapping.targetEnglishName }); continue; }
    if (source.id === target.id) continue;
    aliases.set(source.name, target.name);
    aliases.set(source.polishName, target.polishName);
    removedIds.add(source.id);
    affectedCategories.add(source.garminCategory);
    mapped.push({ source: source.name, target: target.name });
  }

  for (const item of withoutMapping.items ?? []) {
    const source = findCurrent(item.englishName);
    if (!source) { skipped.push({ source: item.englishName, reason: "source_not_found" }); continue; }
    removedIds.add(source.id);
    affectedCategories.add(source.garminCategory);
  }

  const recommendationNames = new Set((deleteRecommendations.items ?? []).map((item) => normalize(item.englishName)));
  const requestedNames = new Set([
    ...(existingMappings.items ?? []).map((item) => normalize(item.sourceEnglishName)),
    ...(groupedMappings.items ?? []).map((item) => normalize(item.sourceEnglishName)),
    ...(withoutMapping.items ?? []).map((item) => normalize(item.englishName))
  ]);
  const unmatchedRecommendations = [...recommendationNames].filter((name) => !requestedNames.has(name));
  if (unmatchedRecommendations.length) throw new Error(`Stage 2 inputs are inconsistent: ${unmatchedRecommendations.length} delete recommendations have no action.`);

  for (const [category, group] of groups) {
    if (!affectedCategories.has(category)) continue;
    const retained = group.list.filter((exercise) => !removedIds.has(exercise.id)).sort((a, b) => a.name.localeCompare(b.name));
    await writeFile(path.join(catalogDir, group.fileName), writeCatalogFile(group.constName, retained), "utf8");
    await writeFile(path.join(namesDir, `${categoryToFile[category]}.json`), `${JSON.stringify(retained.map((exercise) => exercise.name), null, 2)}\n`, "utf8");
  }

  const sortedAliases = Object.fromEntries([...aliases.entries()].sort(([left], [right]) => left.localeCompare(right)));
  await writeFile(aliasPath, `export const exerciseAliasMap = ${JSON.stringify(sortedAliases, null, 2)} as const;\n`, "utf8");

  console.log(JSON.stringify({
    beforeCount: allExercises.length,
    afterCount: allExercises.length - removedIds.size + [...Object.values(groupedExercises)].filter((target) => byName.get(normalize(target.name)) === target).length,
    removedCount: removedIds.size,
    addedGroupedExercises: [...Object.values(groupedExercises)].filter((target) => byName.get(normalize(target.name)) === target).map((target) => target.name),
    mappedCount: mapped.length,
    deleteWithoutMappingCount: (withoutMapping.items ?? []).filter((item) => !skipped.some((skip) => skip.source === item.englishName)).length,
    aliasCount: aliases.size,
    skipped
  }, null, 2));
}

await main();
