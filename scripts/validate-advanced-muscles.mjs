import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogDir = path.join(root, "apps/mobile/src/domain/exerciseCatalog");
const profilesPath = path.join(root, "apps/mobile/src/domain/advancedExerciseProfiles.generated.ts");
const taxonomyPath = path.join(root, "apps/mobile/src/domain/advancedMuscles.ts");
const reportPath = path.join(root, "docs/reports/advanced-muscle-coverage.json");

const exercises = [];
for (const file of (await readdir(catalogDir)).filter((name) => name.endsWith(".ts") && name !== "index.ts")) {
  const source = await readFile(path.join(catalogDir, file), "utf8");
  exercises.push(...JSON.parse(source.slice(source.indexOf("["), source.lastIndexOf("] satisfies") + 1)));
}
const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));
const generatedSource = await readFile(profilesPath, "utf8");
const profiles = JSON.parse(generatedSource.slice(generatedSource.indexOf(" = {") + 3, generatedSource.lastIndexOf("};") + 1));
const taxonomySource = await readFile(taxonomyPath, "utf8");
const subdivisionBlock = taxonomySource.slice(
  taxonomySource.indexOf("export const advancedMuscleSubdivisionIds"),
  taxonomySource.indexOf("] as const;", taxonomySource.indexOf("export const advancedMuscleSubdivisionIds")) + 1
);
const subdivisionIds = new Set([...subdivisionBlock.matchAll(/"([a-zA-Z]+\.[a-zA-Z]+)"/g)].map((match) => match[1]));
const subdivisionParents = new Map(
  [...taxonomySource.matchAll(/subdivision\("([a-zA-Z]+\.[a-zA-Z]+)",\s*"[a-zA-Z]+",\s*"([a-zA-Z]+)"/g)]
    .map((match) => [match[1], match[2]])
);
const errors = [];
let eligible = 0;
let mapped = 0;
let intentionallyNotDetailed = 0;
let needsReview = 0;

for (const exercise of exercises) {
  const eligibleParents = Object.entries(exercise.muscleImpact).filter(([, level]) => level >= 3);
  if (!eligibleParents.length) continue;
  eligible += eligibleParents.length;
  const profile = profiles[exercise.id];
  if (!profile) {
    errors.push({ code: "silent_missing_exercise", exerciseId: exercise.id });
    continue;
  }
  const resultsByParent = new Map();
  for (const result of profile.parents) {
    if (resultsByParent.has(result.standardParentMuscle)) {
      errors.push({ code: "duplicate_parent", exerciseId: exercise.id, parent: result.standardParentMuscle });
    }
    resultsByParent.set(result.standardParentMuscle, result);
  }
  for (const [parent, parentLevel] of eligibleParents) {
    const result = resultsByParent.get(parent);
    if (!result) {
      errors.push({ code: "silent_missing_parent", exerciseId: exercise.id, parent });
      continue;
    }
    if (result.status === "mapped") {
      mapped += 1;
      const seen = new Set();
      for (const [subdivisionId, level] of result.engagement) {
        if (!subdivisionIds.has(subdivisionId)) errors.push({ code: "invalid_subdivision", exerciseId: exercise.id, subdivisionId });
        if (subdivisionParents.get(subdivisionId) !== parent) {
          errors.push({ code: "invalid_parent_relationship", exerciseId: exercise.id, parent, subdivisionId });
        }
        if (seen.has(subdivisionId)) errors.push({ code: "duplicate_subdivision", exerciseId: exercise.id, subdivisionId });
        seen.add(subdivisionId);
        if (!Number.isInteger(level) || level < 1 || level > 5) errors.push({ code: "invalid_level", exerciseId: exercise.id, subdivisionId, level });
      }
      if (Math.max(...result.engagement.map(([, level]) => level)) !== parentLevel) {
        errors.push({ code: "parent_level_mismatch", exerciseId: exercise.id, parent, parentLevel });
      }
    } else if (result.status === "intentionallyNotDetailed") intentionallyNotDetailed += 1;
    else if (result.status === "needsReview") needsReview += 1;
    else errors.push({ code: "invalid_status", exerciseId: exercise.id, parent, status: result.status });
  }
}
for (const exerciseId of Object.keys(profiles)) {
  if (!byId.has(exerciseId)) errors.push({ code: "alias_or_unknown_owned_profile", exerciseId });
}

const report = JSON.parse(await readFile(reportPath, "utf8"));
if (report.silentMissing !== 0) errors.push({ code: "report_silent_missing", count: report.silentMissing });
if (report.catalogExerciseCount !== 729) errors.push({ code: "unexpected_exercise_count", actual: report.catalogExerciseCount, expected: 729 });

console.log(`Exercises: ${exercises.length}`);
console.log(`Advanced taxonomy: subdivisions ${subdivisionIds.size}, invalid ${errors.length}`);
console.log(`Eligible advanced mappings (parent 3-5): ${eligible}`);
console.log(`  mapped: ${mapped}`);
console.log(`  intentionallyNotDetailed: ${intentionallyNotDetailed}`);
console.log(`  needsReview: ${needsReview}`);
console.log(`  silent missing: ${Math.max(0, eligible - mapped - intentionallyNotDetailed - needsReview)}`);
console.log(`Invalid mappings: ${errors.length}`);
if (errors.length) {
  console.error(JSON.stringify(errors.slice(0, 50), null, 2));
  process.exitCode = 1;
}
