import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogDir = path.join(root, "apps/mobile/src/domain/exerciseCatalog");
const outputPath = path.join(root, "apps/mobile/src/domain/advancedExerciseProfiles.generated.ts");
const reportPath = path.join(root, "docs/reports/advanced-muscle-coverage.json");
const eligibleMinimum = 3;

const detailedParents = new Set([
  "abs", "biceps", "calves", "chest", "forearm", "glutes", "hamstrings",
  "lowerBack", "obliques", "quads", "shoulders", "traps", "triceps"
]);

const intentionallyNotDetailedReasons = {
  abductors: "No useful subdivision in Advanced Muscle Mode v1.",
  adductors: "No useful subdivision in Advanced Muscle Mode v1.",
  hips: "The standard hip group combines structures that need a future taxonomy review.",
  lats: "Latissimus dorsi remains a single muscle in Advanced Muscle Mode v1."
};

const explicitParentDecisions = new Map([
  ["lateral-raise-bar-muscle-up-538:chest", "The muscle-up combines pull, transition, and dip phases; available evidence measures pectoralis major globally and does not support a reliable chest-region split."],
  ["lateral-raise-muscle-up-550:chest", "The progression name does not define a standardized technique or pressing angle, so a chest-region split would be speculative."],
  ["lateral-raise-ring-muscle-up-556:chest", "Ring instability and the multi-phase movement alter recruitment, while available evidence does not distinguish pectoralis major regions."],
  ["push-up-biceps-push-up-945:biceps", "This uncommon closed-chain variation has no sufficiently specific evidence for separating biceps heads from brachialis."],
]);

const exercises = [];
for (const file of (await readdir(catalogDir)).filter((name) => name.endsWith(".ts") && name !== "index.ts")) {
  const source = await readFile(path.join(catalogDir, file), "utf8");
  const start = source.indexOf("[");
  const end = source.lastIndexOf("] satisfies");
  exercises.push(...JSON.parse(source.slice(start, end + 1)));
}
exercises.sort((left, right) => left.id.localeCompare(right.id));

function clamp(value, max) { return Math.max(1, Math.min(max, value)); }
function row(id, value, max) { return [id, clamp(value, max)]; }
function mapped(parent, level, ruleId, confidence, engagement) {
  const normalized = engagement
    .filter(([, value]) => value > 0)
    .map(([id, value]) => row(id, value, level));
  if (Math.max(...normalized.map(([, value]) => value)) !== level) {
    throw new Error(`${ruleId}: max subdivision level must equal parent ${parent} level ${level}.`);
  }
  return { confidence, engagement: normalized, ruleId, standardParentMuscle: parent, status: "mapped" };
}
function needsReview(parent, reason) { return { reason, standardParentMuscle: parent, status: "needsReview" }; }
function intentionally(parent, reason) { return { reason, standardParentMuscle: parent, status: "intentionallyNotDetailed" }; }
function text(exercise) { return `${exercise.name} ${exercise.category}`.toLowerCase().replace(/[_-]+/g, " "); }
function has(value, pattern) { return pattern.test(value); }

function profileParent(exercise, parent, level) {
  const value = text(exercise);
  const explicitDecision = explicitParentDecisions.get(`${exercise.id}:${parent}`);
  if (explicitDecision) return intentionally(parent, explicitDecision);
  if (!detailedParents.has(parent)) {
    return intentionally(parent, intentionallyNotDetailedReasons[parent] ?? "No advanced taxonomy in v1.");
  }

  switch (parent) {
    case "chest": {
      if (has(value, /incline|low.to.high/)) return mapped(parent, level, "chest.incline", "high", [
        ["chest.clavicular", level], ["chest.sternocostal", level - 1], ["chest.abdominal", level - 3]
      ]);
      if (has(value, /decline|dip|high.to.low/)) return mapped(parent, level, "chest.decline", "high", [
        ["chest.clavicular", level - 3], ["chest.sternocostal", level - 1], ["chest.abdominal", level]
      ]);
      if (has(value, /press|fly|flye|crossover|push up|pullover|burpee|squat thrust/)) return mapped(parent, level, "chest.horizontal", "medium", [
        ["chest.clavicular", level - 2], ["chest.sternocostal", level], ["chest.abdominal", level - 2]
      ]);
      return needsReview(parent, "Chest involvement is high, but the movement angle cannot be classified reliably.");
    }
    case "shoulders": {
      if (has(value, /rear|reverse|face pull|bent over|posterior|external rotation|pull apart|prone.*[iyt]/)) return mapped(parent, level, "shoulders.posterior", "high", [
        ["shoulders.anteriorDeltoid", level - 4], ["shoulders.lateralDeltoid", level - 2], ["shoulders.posteriorDeltoid", level]
      ]);
      if (has(value, /lateral|scaption|upright row|abduction/)) return mapped(parent, level, "shoulders.lateral", "high", [
        ["shoulders.anteriorDeltoid", level - 3], ["shoulders.lateralDeltoid", level], ["shoulders.posteriorDeltoid", level - 3]
      ]);
      if (has(value, /front raise|shoulder flexion/)) return mapped(parent, level, "shoulders.anterior-raise", "high", [
        ["shoulders.anteriorDeltoid", level], ["shoulders.lateralDeltoid", level - 3]
      ]);
      if (has(value, /shoulder press|overhead|arnold|push press|jerk|handstand|thruster|wall ball|snatch|waiter|turkish|get up|windmill/)) return mapped(parent, level, "shoulders.overhead-press", "high", [
        ["shoulders.anteriorDeltoid", level], ["shoulders.lateralDeltoid", level - 1], ["shoulders.posteriorDeltoid", level - 4]
      ]);
      if (has(value, /bench|chest press|fly|flye|push.up|dip/)) return mapped(parent, level, "shoulders.horizontal-press", "medium", [
        ["shoulders.anteriorDeltoid", level], ["shoulders.lateralDeltoid", level - 2]
      ]);
      if (has(value, /row|pull up|pulldown|pull down|crawl|rollout|roll out|l sit|lever|sled push|plank/)) return mapped(parent, level, "shoulders.pull", "medium", [
        ["shoulders.lateralDeltoid", level - 2], ["shoulders.posteriorDeltoid", level]
      ]);
      return intentionally(parent, "The movement is too general or compound for a useful deltoid subdivision in v1.");
    }
    case "triceps": {
      if (has(value, /overhead.*(triceps|extension)|(?:triceps|extension).*overhead|behind.*head|skull|lying extension/)) return mapped(parent, level, "triceps.overhead", "high", [
        ["triceps.longHead", level], ["triceps.lateralHead", level - 1], ["triceps.medialHead", level - 1]
      ]);
      if (has(value, /push.?down|press.?down|kickback/)) return mapped(parent, level, "triceps.pushdown", "high", [
        ["triceps.longHead", level - 1], ["triceps.lateralHead", level], ["triceps.medialHead", level]
      ]);
      if (has(value, /extension|press|dip|push up|close grip|thruster|wall ball|l sit|sled push/)) return mapped(parent, level, "triceps.extension-or-press", "medium", [
        ["triceps.longHead", level - 1], ["triceps.lateralHead", level], ["triceps.medialHead", level]
      ]);
      return intentionally(parent, "Elbow and shoulder position are not specific enough for a useful triceps-head split.");
    }
    case "biceps": {
      if (has(value, /hammer|reverse(?:.grip)?.*curl|neutral.grip/)) return mapped(parent, level, "elbow-flexors.neutral-pronated", "high", [
        ["elbowFlexors.bicepsLongHead", level - 1], ["elbowFlexors.bicepsShortHead", level - 1], ["elbowFlexors.brachialis", level]
      ]);
      if (has(value, /incline|bayesian|drag curl/)) return mapped(parent, level, "elbow-flexors.shoulder-extended", "high", [
        ["elbowFlexors.bicepsLongHead", level], ["elbowFlexors.bicepsShortHead", level - 1], ["elbowFlexors.brachialis", level - 1]
      ]);
      if (has(value, /preacher|concentration|spider/)) return mapped(parent, level, "elbow-flexors.shoulder-flexed", "medium", [
        ["elbowFlexors.bicepsLongHead", level - 1], ["elbowFlexors.bicepsShortHead", level], ["elbowFlexors.brachialis", level - 1]
      ]);
      if (has(value, /curl|row|pull up|pulldown|pull down|chin/)) return mapped(parent, level, "elbow-flexors.general", "medium", [
        ["elbowFlexors.bicepsLongHead", level], ["elbowFlexors.bicepsShortHead", level], ["elbowFlexors.brachialis", level - 1]
      ]);
      return needsReview(parent, "Elbow-flexor involvement is high, but grip and shoulder position are unclear.");
    }
    case "forearm": {
      if (has(value, /reverse wrist|wrist extension/)) return mapped(parent, level, "forearms.extensors", "high", [["forearms.extensors", level]]);
      if (has(value, /hammer|reverse(?:.grip)?.*curl/)) return mapped(parent, level, "forearms.brachioradialis", "high", [
        ["forearms.flexors", level - 1], ["forearms.extensors", level - 1], ["forearms.brachioradialis", level]
      ]);
      if (has(value, /wrist curl|finger curl|grip|carry|deadlift|row|pull|curl|hang|toes|snatch|clean|swing|pinch|lever/)) return mapped(parent, level, "forearms.flexors-grip", "medium", [
        ["forearms.flexors", level], ["forearms.extensors", level - 2], ["forearms.brachioradialis", level - 1]
      ]);
      return intentionally(parent, "Grip action is not specific enough for a useful forearm subdivision.");
    }
    case "abs": {
      if (has(value, /plank|stability|carry|brace|anti.rotation/)) return mapped(parent, level, "abs.bracing", "medium", [
        ["abs.rectusAbdominis", level - 1], ["abs.transversusAbdominis", level]
      ]);
      if (has(value, /crunch|sit.up|leg raise|knee raise|toes.to|rollout/)) return mapped(parent, level, "abs.trunk-flexion", "high", [
        ["abs.rectusAbdominis", level], ["abs.transversusAbdominis", level - 2]
      ]);
      return mapped(parent, level, "abs.general", "medium", [["abs.rectusAbdominis", level], ["abs.transversusAbdominis", level - 1]]);
    }
    case "obliques":
      return mapped(parent, level, has(value, /twist|rotation|chop|side/) ? "obliques.rotation" : "obliques.general", "medium", [
        ["obliques.externalOblique", level], ["obliques.internalOblique", level]
      ]);
    case "quads": {
      if (has(value, /leg extension/)) return mapped(parent, level, "quadriceps.knee-extension", "high", [
        ["quadriceps.rectusFemoris", level], ["quadriceps.vastusLateralis", level], ["quadriceps.vastusMedialis", level], ["quadriceps.vastusIntermedius", level - 1]
      ]);
      if (has(value, /squat|lunge|leg press|step up|plyo|jump|bike|stair|crawl|l sit|deadlift|burpee|mogul|jack|clean|snatch/)) return mapped(parent, level, "quadriceps.compound", "medium", [
        ["quadriceps.rectusFemoris", level - 2], ["quadriceps.vastusLateralis", level], ["quadriceps.vastusMedialis", level], ["quadriceps.vastusIntermedius", level - 1]
      ]);
      return intentionally(parent, "The movement does not expose a useful quadriceps-region bias in v1.");
    }
    case "hamstrings": {
      if (has(value, /leg curl|hamstring curl|nordic|glute ham|razor/)) return mapped(parent, level, "hamstrings.knee-flexion", "high", [
        ["hamstrings.bicepsFemorisLongHead", level], ["hamstrings.bicepsFemorisShortHead", level], ["hamstrings.semitendinosus", level], ["hamstrings.semimembranosus", level]
      ]);
      if (has(value, /deadlift|hinge|good morning|hip extension|hyperextension|swing|squat|lunge|step up|windmill|bridge|hip raise|snatch|clean/)) return mapped(parent, level, "hamstrings.hip-extension", "medium", [
        ["hamstrings.bicepsFemorisLongHead", level], ["hamstrings.bicepsFemorisShortHead", level - 4], ["hamstrings.semitendinosus", level], ["hamstrings.semimembranosus", level]
      ]);
      return intentionally(parent, "Hip-extension versus knee-flexion bias is not specific enough for a reliable subdivision.");
    }
    case "glutes": {
      if (has(value, /abduction|hip stability|side.*walk|lateral.*walk|clam|fire hydrant|side lying/)) return mapped(parent, level, "glutes.abduction", "high", [
        ["glutes.gluteusMaximus", level - 2], ["glutes.gluteusMedius", level], ["glutes.gluteusMinimus", level]
      ]);
      if (has(value, /hip thrust|hip raise|bridge|deadlift|hinge|squat|lunge|step up|good morning|back extension|hip extension|donkey kick|leg lift|bike|stair|burpee|swing|clean|snatch|mogul|jack/)) return mapped(parent, level, "glutes.extension", "medium", [
        ["glutes.gluteusMaximus", level], ["glutes.gluteusMedius", level - 2], ["glutes.gluteusMinimus", level - 3]
      ]);
      return intentionally(parent, "Extension versus abduction bias is not specific enough for a reliable glute subdivision.");
    }
    case "calves": {
      if (has(value, /seated|bent.knee/)) return mapped(parent, level, "calves.bent-knee", "high", [
        ["calves.gastrocnemius", level - 2], ["calves.soleus", level]
      ]);
      if (has(value, /calf|plantar|jump|skip|run|walk|stair|under|mogul|jack|siff|snatch|clean/)) return mapped(parent, level, "calves.straight-knee", "medium", [
        ["calves.gastrocnemius", level], ["calves.soleus", level - 1]
      ]);
      return intentionally(parent, "Knee position is unclear, so gastrocnemius versus soleus bias is not detailed.");
    }
    case "traps": {
      if (has(value, /shrug|carry/)) return mapped(parent, level, "upper-back.elevation", "high", [
        ["upperBack.trapeziusUpper", level], ["upperBack.trapeziusMiddle", level - 2], ["upperBack.trapeziusLower", level - 3], ["upperBack.rhomboids", level - 3]
      ]);
      if (has(value, /row|reverse|face pull|rear|pull apart|prone.*[iyt]|i y t/)) return mapped(parent, level, "upper-back.retraction", "high", [
        ["upperBack.trapeziusUpper", level - 2], ["upperBack.trapeziusMiddle", level], ["upperBack.trapeziusLower", level - 1], ["upperBack.rhomboids", level]
      ]);
      if (has(value, /pull.up|pulldown|pull down/)) return mapped(parent, level, "upper-back.depression", "medium", [
        ["upperBack.trapeziusUpper", level - 2], ["upperBack.trapeziusMiddle", level - 1], ["upperBack.trapeziusLower", level], ["upperBack.rhomboids", level - 1]
      ]);
      if (has(value, /overhead|shoulder press|lateral raise|front raise|snatch|clean|high pull|thruster|wall ball/)) return mapped(parent, level, "upper-back.upward-rotation", "medium", [
        ["upperBack.trapeziusUpper", level], ["upperBack.trapeziusMiddle", level - 2], ["upperBack.trapeziusLower", level - 1], ["upperBack.rhomboids", level - 3]
      ]);
      if (has(value, /deadlift|hinge|good morning|swing/)) return mapped(parent, level, "upper-back.isometric-load", "medium", [
        ["upperBack.trapeziusUpper", level], ["upperBack.trapeziusMiddle", level - 1], ["upperBack.trapeziusLower", level - 2], ["upperBack.rhomboids", level - 1]
      ]);
      return intentionally(parent, "Scapular action is not specific enough for a useful upper-back subdivision.");
    }
    case "lowerBack":
      return mapped(parent, level, "spinal-erectors.general", "medium", [
        ["spinalErectors.thoracic", level - 1], ["spinalErectors.lumbar", level]
      ]);
    default:
      return intentionally(parent, "No advanced taxonomy in v1.");
  }
}

const profiles = {};
const coverage = {};
const needsReviewItems = [];
let eligibleExerciseCount = 0;
for (const exercise of exercises) {
  const eligibleParents = Object.entries(exercise.muscleImpact).filter(([, level]) => level >= eligibleMinimum);
  if (!eligibleParents.length) continue;
  eligibleExerciseCount += 1;
  const parents = eligibleParents.map(([parent, level]) => profileParent(exercise, parent, level));
  profiles[exercise.id] = { parents };
  for (const result of parents) {
    const item = coverage[result.standardParentMuscle] ??= { eligible: 0, intentionallyNotDetailed: 0, mapped: 0, needsReview: 0 };
    item.eligible += 1;
    item[result.status] += 1;
    if (result.status === "needsReview") needsReviewItems.push({
      exerciseId: exercise.id, name: exercise.name, parentLevel: exercise.muscleImpact[result.standardParentMuscle],
      parentMuscle: result.standardParentMuscle, reason: result.reason
    });
  }
}

const counts = Object.values(coverage).reduce((total, item) => ({
  eligible: total.eligible + item.eligible,
  intentionallyNotDetailed: total.intentionallyNotDetailed + item.intentionallyNotDetailed,
  mapped: total.mapped + item.mapped,
  needsReview: total.needsReview + item.needsReview
}), { eligible: 0, intentionallyNotDetailed: 0, mapped: 0, needsReview: 0 });

const generated = `/* Generated by scripts/generate-advanced-muscle-profiles.mjs. Do not edit manually. */\nimport type { AdvancedExerciseProfile } from "./advancedMuscles";\n\nexport const advancedExerciseProfiles: Readonly<Record<string, AdvancedExerciseProfile>> = ${JSON.stringify(profiles)};\n`;
const report = {
  catalogExerciseCount: exercises.length,
  eligibleExerciseCount,
  eligibleParentEngagementCount: counts.eligible,
  ...counts,
  silentMissing: counts.eligible - counts.mapped - counts.intentionallyNotDetailed - counts.needsReview,
  coveragePercent: Number(((counts.mapped / counts.eligible) * 100).toFixed(2)),
  perParent: coverage,
  needsReview: needsReviewItems
};

await writeFile(outputPath, generated, "utf8");
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
