import { copyFile, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const catalogDir = path.join(repoRoot, "apps", "mobile", "src", "domain", "exerciseCatalog");
const namesDir = path.join(repoRoot, "apps", "mobile", "src", "domain", "exerciseNames");
const techniquePath = path.join(repoRoot, "apps", "mobile", "src", "domain", "exerciseTechniqueContent.ts");
const assetRoot = path.join(repoRoot, "apps", "mobile", "assets", "exercises");
const defaultInput = path.join("C:", "Users", "Administrator", "Downloads", "recommended_missing_basic_exercises.json");
const defaultImages = path.join("C:", "Users", "Administrator", "Downloads", "drive-download-20260710T132740Z-2-001");

const categoryById = {
  "machine-hip-thrust": "HIP_RAISE",
  "machine-hack-squat": "SQUAT",
  "smith-machine-squat": "SQUAT",
  "seated-leg-curl": "LEG_CURL",
  "lying-leg-curl": "LEG_CURL",
  "machine-hip-abduction": "HIP_STABILITY",
  "machine-hip-adduction": "HIP_STABILITY",
  "cable-glute-kickback": "HIP_RAISE",
  "machine-chest-press": "BENCH_PRESS",
  "pec-deck": "FLYE",
  "machine-shoulder-press": "SHOULDER_PRESS",
  "machine-row": "ROW",
  "chest-supported-machine-row": "ROW",
  "rear-delt-machine": "FLYE",
  "assisted-pull-up-machine": "PULL_UP"
};

const categoryToFile = {
  BANDED_EXERCISES: "banded-exercises", BATTLE_ROPE: "battle-rope", BENCH_PRESS: "bench-press", BIKE_OUTDOOR: "bike-outdoor", CALF_RAISE: "calf-raise", CARDIO: "cardio", CARRY: "carry", CHOP: "chop", CORE: "core", CRUNCH: "crunch", CURL: "curl", DEADLIFT: "deadlift", ELLIPTICAL: "elliptical", FLOOR_CLIMB: "floor-climb", FLYE: "flye", HIP_RAISE: "hip-raise", HIP_STABILITY: "hip-stability", HIP_SWING: "hip-swing", HYPEREXTENSION: "hyperextension", INDOOR_BIKE: "indoor-bike", LADDER: "ladder", LATERAL_RAISE: "lateral-raise", LEG_CURL: "leg-curl", LEG_RAISE: "leg-raise", LUNGE: "lunge", OLYMPIC_LIFT: "olympic-lift", PLANK: "plank", PLYO: "plyo", PULL_UP: "pull-up", PUSH_UP: "push-up", ROW: "row", RUN: "run", RUN_INDOOR: "run-indoor", SANDBAG: "sandbag", SHOULDER_PRESS: "shoulder-press", SHOULDER_STABILITY: "shoulder-stability", SHRUG: "shrug", SIT_UP: "sit-up", SLED: "sled", SLEDGE_HAMMER: "sledge-hammer", SQUAT: "squat", STAIR_STEPPER: "stair-stepper", SUSPENSION: "suspension", TIRE: "tire", TOTAL_BODY: "total-body", TRICEPS_EXTENSION: "triceps-extension", WARM_UP: "warm-up"
};

const muscleKeys = ["abductors", "abs", "adductors", "biceps", "calves", "chest", "forearm", "glutes", "hamstrings", "hips", "lats", "lowerBack", "obliques", "quads", "shoulders", "traps", "triceps"];
const equipmentKeys = ["ankleWeight", "band", "barbell", "battleRope", "bench", "bike", "bosuBall", "box", "cableMachine", "dumbbell", "ezBar", "foamRoller", "jumpRope", "kettlebell", "machine", "medicineBall", "other", "plate", "pullupBar", "rings", "rope", "sandbag", "sled", "slidingDisc", "smithMachine", "squatRack", "swissBall", "trx", "weightVest"];

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { input: defaultInput, images: defaultImages };
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--input" && args[index + 1]) result.input = path.resolve(args[++index]);
    if (args[index] === "--images" && args[index + 1]) result.images = path.resolve(args[++index]);
  }
  return result;
}

function getArrayLiteral(source, fileName) {
  const start = source.indexOf("[");
  const end = source.lastIndexOf("] satisfies");
  if (start < 0 || end <= start) throw new Error(`Could not find catalog array in ${fileName}`);
  return source.slice(start, end + 1);
}

function getConstName(source) {
  return source.match(/export const\s+([A-Za-z0-9_]+)\s*=/)?.[1] ?? "exercises";
}

function normalize(value) {
  return String(value ?? "").trim().toLocaleLowerCase("en").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
}

function activation(level) {
  return level === "high" ? 2 : level === "medium" || level === "low" ? 1 : 0;
}

function muscleKey(name) {
  const value = normalize(name);
  if (value.includes("brzucha") || value.includes("abdominals")) return "abs";
  if (value.includes("skosne") || value.includes("obliques")) return "obliques";
  if (value.includes("przywodz" ) || value.includes("adductor")) return "adductors";
  if (value.includes("odwodz") || value.includes("tensor fascia") || value.includes("gluteus medius") || value.includes("gluteus minimus")) return "abductors";
  if (value.includes("posladk") || value.includes("glutes") || value.includes("gluteus maximus")) return "glutes";
  if (value.includes("dwuglowe") || value.includes("hamstring")) return "hamstrings";
  if (value.includes("czworoglowe") || value.includes("quadriceps")) return "quads";
  if (value.includes("lydki") || value.includes("gastrocnemius") || value.includes("calves")) return "calves";
  if (value.includes("biceps")) return "biceps";
  if (value.includes("triceps")) return "triceps";
  if (value.includes("przedramion") || value.includes("forearm")) return "forearm";
  if (value.includes("najszer") || value.includes("latissimus")) return "lats";
  if (value.includes("czworobocz") || value.includes("trapezius") || value.includes("rhomboid")) return "traps";
  if (value.includes("naramien") || value.includes("deltoid") || value.includes("rotator cuff")) return "shoulders";
  if (value.includes("prostownik") || value.includes("erector") || value.includes("grzbietu") || value.includes("back muscles")) return "lowerBack";
  if (value.includes("klatki") || value.includes("pector") || value.includes("chest")) return "chest";
  return null;
}

function toMuscleImpact(item) {
  const result = Object.fromEntries(muscleKeys.map((key) => [key, 0]));
  for (const muscle of [...(item.primaryMuscles ?? []), ...(item.secondaryMuscles ?? []), ...(item.stabilizingMuscles ?? [])]) {
    const key = muscleKey(muscle.nameEn || muscle.namePl);
    if (key) result[key] = Math.max(result[key], activation(muscle.activationLevel));
  }
  return result;
}

function toEquipment(item) {
  const values = (item.requiredEquipment ?? []).map(normalize);
  const active = new Set();
  if (values.some((value) => value.includes("maszyna smitha") || value.includes("smith"))) active.add("smithMachine");
  if (values.some((value) => value.includes("maszyna") || value.includes("machine"))) active.add("machine");
  if (values.some((value) => value.includes("wyciag") || value.includes("cable"))) active.add("cableMachine");
  if (values.some((value) => value.includes("guma") || value.includes("band"))) active.add("band");
  return Object.fromEntries(equipmentKeys.map((key) => [key, active.has(key) ? 1 : 0]));
}

function toCatalogExercise(item) {
  const garminCategory = categoryById[item.id];
  if (!garminCategory) throw new Error(`No Garmin category for ${item.id}`);
  return {
    id: item.id,
    name: item.nameEn,
    polishName: item.namePl,
    garminCategory,
    garminName: item.id.toUpperCase().replace(/-/g, "_"),
    foundInGarmin: false,
    image: "",
    url: "",
    difficulty: item.difficulty ? item.difficulty.charAt(0).toUpperCase() + item.difficulty.slice(1) : "",
    description: item.notesEn ?? "",
    muscleImpact: toMuscleImpact(item),
    equipment: toEquipment(item)
  };
}

function localize(itemsPl, itemsEn) {
  return (itemsPl ?? []).map((pl, index) => ({ pl, en: itemsEn?.[index] ?? "" }));
}

async function exists(filePath) {
  try { return (await stat(filePath)).isFile(); } catch { return false; }
}

async function main() {
  const args = parseArgs();
  const items = JSON.parse(await readFile(args.input, "utf8"));
  const files = (await readdir(catalogDir)).filter((file) => file.endsWith(".ts") && file !== "index.ts");
  const catalogByCategory = new Map();
  const ids = new Set();
  const names = new Set();

  for (const fileName of files) {
    const source = await readFile(path.join(catalogDir, fileName), "utf8");
    const list = JSON.parse(getArrayLiteral(source, fileName));
    catalogByCategory.set(list[0]?.garminCategory, { fileName, constName: getConstName(source), list });
    for (const exercise of list) { ids.add(exercise.id); names.add(normalize(exercise.name)); }
  }

  const techniqueSource = await readFile(techniquePath, "utf8");
  const marker = "export const exerciseTechniqueContentById: Record<string, ExerciseTechniqueContent> =";
  const start = techniqueSource.indexOf("{", techniqueSource.indexOf(marker));
  const end = techniqueSource.lastIndexOf("};");
  const technique = JSON.parse(techniqueSource.slice(start, end + 1));
  const imported = [];
  const copiedImages = [];

  for (const item of items) {
    if (ids.has(item.id) || names.has(normalize(item.nameEn))) throw new Error(`Exercise already exists: ${item.id}`);
    const exercise = toCatalogExercise(item);
    const group = catalogByCategory.get(exercise.garminCategory);
    if (!group) throw new Error(`Catalog category missing: ${exercise.garminCategory}`);
    group.list.push(exercise);
    technique[exercise.id] = {
      instructions: localize(item.instructionsPl, item.instructionsEn),
      techniqueTips: localize(item.tipsPl, item.tipsEn),
      commonMistakes: localize(item.commonMistakesPl, item.commonMistakesEn)
    };
    ids.add(exercise.id); names.add(normalize(exercise.name)); imported.push(exercise);

    const sourceDir = path.join(args.images, item.nameEn);
    const startImage = path.join(sourceDir, "start.png");
    const endImage = path.join(sourceDir, "end.png");
    if (await exists(startImage) && await exists(endImage)) {
      const outputDir = path.join(assetRoot, exercise.id);
      await mkdir(outputDir, { recursive: true });
      await copyFile(startImage, path.join(outputDir, "start.png"));
      await copyFile(endImage, path.join(outputDir, "end.png"));
      copiedImages.push(exercise.id);
    }
  }

  for (const group of catalogByCategory.values()) {
    group.list.sort((left, right) => left.name.localeCompare(right.name));
    await writeFile(path.join(catalogDir, group.fileName), `import type { Exercise } from "../exercises";\n\nexport const ${group.constName} = ${JSON.stringify(group.list, null, 2)} satisfies readonly Exercise[];\n`, "utf8");
    const category = group.list[0]?.garminCategory;
    await writeFile(path.join(namesDir, `${categoryToFile[category]}.json`), `${JSON.stringify(group.list.map((exercise) => exercise.name), null, 2)}\n`, "utf8");
  }

  await writeFile(techniquePath, `export type LocalizedExerciseText = {\n  pl: string;\n  en: string;\n};\n\nexport type ExerciseTechniqueContent = {\n  instructions: LocalizedExerciseText[];\n  techniqueTips: LocalizedExerciseText[];\n  commonMistakes: LocalizedExerciseText[];\n};\n\nexport const exerciseTechniqueContentById: Record<string, ExerciseTechniqueContent> = ${JSON.stringify(technique, null, 2)};\n\nexport function getExerciseTechniqueContent(exerciseId: string): ExerciseTechniqueContent | undefined {\n  return exerciseTechniqueContentById[exerciseId];\n}\n`, "utf8");
  console.log(JSON.stringify({ imported: imported.map((item) => item.id), copiedImages, missingImages: imported.filter((item) => !copiedImages.includes(item.id)).map((item) => item.id) }, null, 2));
}

await main();
