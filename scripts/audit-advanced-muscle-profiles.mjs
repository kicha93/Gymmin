import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogDir = path.join(root, "apps/mobile/src/domain/exerciseCatalog");
const profilesPath = path.join(root, "apps/mobile/src/domain/advancedExerciseProfiles.generated.ts");
const outputPath = path.join(root, "docs/reports/advanced-muscle-representative-audit.md");

const sample = [
  ["bench-press-barbell-bench-press-76", "flat barbell"],
  ["bench-press-incline-barbell-bench-press-84", "incline barbell"],
  ["bench-press-decline-dumbbell-bench-press-81", "decline dumbbell"],
  ["flye-cable-crossover-398", "cable crossover"],
  ["triceps-extension-body-weight-dip-1400", "body-weight dip"],
  ["shoulder-press-overhead-barbell-press-1125", "barbell overhead"],
  ["lateral-raise-dumbbell-lateral-raise-545", "dumbbell lateral"],
  ["reverse-pec-deck", "reverse pec deck"],
  ["triceps-extension-triceps-pressdown-1433", "cable press-down"],
  ["triceps-extension-cable-overhead-triceps-extension-1403", "cable overhead extension"],
  ["bench-press-close-grip-barbell-bench-press-80", "close-grip barbell"],
  ["curl-barbell-biceps-curl-326", "supinated barbell"],
  ["curl-alternating-incline-dumbbell-biceps-curl-325", "incline dumbbell"],
  ["curl-ez-bar-preacher-curl-344", "preacher EZ-bar"],
  ["curl-dumbbell-hammer-curl-341", "neutral-grip hammer"],
  ["curl-reverse-grip-barbell-biceps-curl-356", "pronated reverse"],
  ["squat-barbell-back-squat-1251", "barbell back squat"],
  ["crunch-leg-extensions-260", "knee extension"],
  ["deadlift-romanian-deadlift-374", "hip-hinge RDL"],
  ["seated-leg-curl", "seated knee flexion"],
  ["lying-leg-curl", "lying knee flexion"],
  ["hip-thrust", "hip thrust"],
  ["calf-raise-standing-calf-raise-118", "straight-knee standing"],
  ["calf-raise-seated-calf-raise-109", "bent-knee seated"],
  ["row-barbell-row-1034", "horizontal barbell row"],
  ["shrug-barbell-shrug-1176", "barbell elevation"],
];

const exercises = [];
for (const file of (await readdir(catalogDir)).filter((name) => name.endsWith(".ts") && name !== "index.ts")) {
  const source = await readFile(path.join(catalogDir, file), "utf8");
  exercises.push(...JSON.parse(source.slice(source.indexOf("["), source.lastIndexOf("] satisfies") + 1)));
}
const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));
const generated = await readFile(profilesPath, "utf8");
const profiles = JSON.parse(generated.slice(generated.indexOf("= ") + 2, generated.lastIndexOf(";")));

const rows = sample.map(([id, variant]) => {
  const exercise = byId.get(id);
  const profile = profiles[id];
  if (!exercise || !profile) throw new Error(`Missing representative exercise/profile: ${id}`);
  const parents = Object.entries(exercise.muscleImpact).filter(([, level]) => level >= 3).map(([parent, level]) => `${parent} ${level}`).join(", ");
  const rules = profile.parents.map((item) => item.status === "mapped" ? `${item.standardParentMuscle}: ${item.ruleId}` : `${item.standardParentMuscle}: ${item.status}`).join("; ");
  const subdivisions = profile.parents.map((item) => item.status === "mapped"
    ? `${item.standardParentMuscle}: ${item.engagement.map(([subdivision, level]) => `${subdivision}=${level}`).join(", ")}`
    : `${item.standardParentMuscle}: ${item.status}`).join("; ");
  const confidence = profile.parents.map((item) => `${item.standardParentMuscle}: ${item.status === "mapped" ? item.confidence : "n/a"}`).join("; ");
  return [exercise.name, parents, rules, variant, subdivisions, confidence, "none"];
});

const escape = (value) => String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
const markdown = [
  "# Advanced Muscle Mode — representative generator audit",
  "",
  "Generated deterministically from the current 805-exercise catalog and final runtime profiles.",
  "",
  "| Exercise | Parent engagement | Family/rule used | Variant detected | Final advanced subdivisions | Confidence | Override |",
  "|---|---|---|---|---|---|---|",
  ...rows.map((row) => `| ${row.map(escape).join(" | ")} |`),
  "",
].join("\n");

await writeFile(outputPath, markdown, "utf8");
console.log(`Wrote ${rows.length} representative exercises to ${path.relative(root, outputPath)}.`);
