import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogDir = path.join(root, "apps/mobile/src/domain/exerciseCatalog");
const namesDir = path.join(root, "apps/mobile/src/domain/exerciseNames");
const reportPath = path.join(root, "docs/reports/exercise-catalog-refactor.json");
const tiers = ["main", "advanced", "sportSpecific", "rehab", "variation", "progression"];
const categoryFiles = { FRONT_RAISE: "front-raise", GOOD_MORNING: "good-morning", STEP_UP: "step-up" };

function arrayLiteral(source, file) {
  const start = source.indexOf("[");
  const end = source.lastIndexOf("] satisfies");
  if (start < 0 || end <= start) throw new Error(`Cannot parse ${file}`);
  return source.slice(start, end + 1);
}
function constName(source, file) {
  const match = source.match(/export const\s+([A-Za-z0-9_]+)\s*=/);
  if (!match) throw new Error(`Cannot find export in ${file}`);
  return match[1];
}
function fileBody(name, list) {
  return `import type { Exercise } from "../exercises";\n\nexport const ${name} = ${JSON.stringify(list, null, 2)} satisfies readonly Exercise[];\n`;
}
function classify(exercise) {
  const name = exercise.name.toLowerCase();
  const category = exercise.category;
  if (/\b(progression|assisted progression)\b/.test(name)) return ["progression", "explicit learning progression"];
  if (["BATTLE_ROPE", "LADDER", "OLYMPIC_LIFT", "SANDBAG", "SLED", "SLEDGE_HAMMER", "TIRE"].includes(category) || /\b(kipping|triple under|double under|wall ball|muscle-up|rope climb)\b/.test(name)) return ["sportSpecific", "discipline-specific or competition movement"];
  if (["DORSIFLEXION", "SHOULDER_STABILITY"].includes(category) || /\b(rehabilitation|rehab|prehab|external rotation|internal rotation|scapular|ankle dorsiflexion)\b/.test(name)) return ["rehab", "rehabilitation or prehabilitation focus"];
  if (/\b(board|partial lockout|triple.stop|isometric|kipping|handstand|pistol|dragon flag|human flag|one-arm pull|one arm pull|turkish get-up|windmill)\b/.test(name)) return ["advanced", "high-skill or specialist strength variant"];
  if (/\b(dead-hang|swiss ball|bosu|stability ball|alternating|single.arm|single arm|one.arm|one arm|single.leg|single leg|staggered|split stance|reverse.grip|wide.grip|close.grip|neutral.grip|paused|pause|tempo|static hold|with rotation|crossover|lateral step|stepover|step-over)\b/.test(name)) return ["variation", "minor stance, grip, tempo, stability or unilateral variation"];
  return ["main", "common standalone exercise"];
}

async function main() {
  const files = (await readdir(catalogDir)).filter((file) => file.endsWith(".ts") && file !== "index.ts");
  const metadata = new Map();
  const exercises = [];
  for (const file of files) {
    const source = await readFile(path.join(catalogDir, file), "utf8");
    const list = JSON.parse(arrayLiteral(source, file));
    if (list[0]) metadata.set(list[0].category, { file, name: constName(source, file) });
    exercises.push(...list);
  }

  const beforeTierCounts = Object.fromEntries(tiers.map((tier) => [tier, exercises.filter((item) => item.libraryTier === tier).length]));
  const deadHang = {
    id: "curl-dead-hang-biceps-curl-337", name: "Dead-hang Biceps Curl", polishName: "Uginanie ramion ze swobodnego zwisu",
    category: "CURL",
    muscleImpact: { abductors:0,abs:0,adductors:0,biceps:5,calves:0,chest:0,forearm:2,glutes:0,hamstrings:0,hips:0,lats:0,lowerBack:0,obliques:0,quads:0,shoulders:0,traps:0,triceps:0 },
    equipment: { ankleWeight:0,band:0,barbell:0,battleRope:0,bench:0,bike:0,bosuBall:0,box:0,cableMachine:0,dumbbell:0,ezBar:1,foamRoller:0,jumpRope:0,kettlebell:0,machine:0,medicineBall:0,other:1,plate:0,pullupBar:0,rings:0,rope:0,sandbag:0,sled:0,slidingDisc:0,smithMachine:0,squatRack:0,swissBall:0,trx:0,weightVest:0 },
    libraryTier: "variation"
  };
  if (!exercises.some((item) => item.id === deadHang.id)) exercises.push(deadHang);

  const categoryChanges = [];
  for (const exercise of exercises) {
    let next = exercise.category;
    if (/front raise/i.test(exercise.name)) next = "FRONT_RAISE";
    else if (/\b(step-up|step up|stepover|step-over)\b/i.test(exercise.name)) next = "STEP_UP";
    else if (/good morning/i.test(exercise.name)) next = "GOOD_MORNING";
    if (next !== exercise.category) {
      categoryChanges.push({ id: exercise.id, name: exercise.name, before: exercise.category, after: next });
      exercise.category = next;
    }
  }

  const tierChanges = [];
  for (const exercise of exercises) {
    const [next, reason] = classify(exercise);
    const before = exercise.libraryTier ?? "main";
    if (before !== next) tierChanges.push({ id: exercise.id, name: exercise.name, before, after: next, reason });
    exercise.libraryTier = next;
  }

  const grouped = new Map();
  for (const exercise of exercises) grouped.set(exercise.category, [...(grouped.get(exercise.category) ?? []), exercise]);
  for (const [category, list] of grouped) {
    const known = metadata.get(category);
    const base = categoryFiles[category] ?? known?.file?.replace(/\.ts$/, "") ?? category.toLowerCase().replaceAll("_", "-");
    const file = known?.file ?? `${base}.ts`;
    const name = known?.name ?? base.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    list.sort((a, b) => a.name.localeCompare(b.name));
    await writeFile(path.join(catalogDir, file), fileBody(name, list), "utf8");
    await writeFile(path.join(namesDir, `${base}.json`), `${JSON.stringify(list.map((item) => item.name), null, 2)}\n`, "utf8");
  }
  for (const [category, known] of metadata) if (!grouped.has(category)) {
    await writeFile(path.join(catalogDir, known.file), fileBody(known.name, []), "utf8");
  }

  const report = JSON.parse(await readFile(reportPath, "utf8"));
  report.phase2 = {
    generatedAt: new Date().toISOString(),
    riskyMergeDecisions: [
      { sourceId: deadHang.id, targetId: "curl-ez-bar-preacher-curl-344", decision: "reverted", evidence: "The source uses a forward free-hanging arm position; the target is an EZ-bar preacher-bench curl. Position and support differ despite matching muscle/equipment flags." },
      { sourceId: "stage2-back-extension", targetId: "hyperextension-hyperextension-496", decision: "alias_removed_not_restored", evidence: "No source catalog record, technique content, image or historical source payload exists in repository history; equivalence cannot be demonstrated and inventing a duplicate record would violate catalog validation." }
    ],
    categoryChanges,
    tierCountsBefore: beforeTierCounts,
    tierCountsAfter: Object.fromEntries(tiers.map((tier) => [tier, exercises.filter((item) => item.libraryTier === tier).length])),
    tierChanges,
    unresolvedProductDecisions: ["Whether users should get an explicit UI toggle for advanced, sport-specific, rehab and variation tiers; default creation remains main-only."]
  };
  report.afterCount = exercises.length;
  report.mergedCount = report.beforeCount - exercises.length;
  report.tierCounts = report.phase2.tierCountsAfter;
  report.merges = report.merges.filter((merge) => ![deadHang.id, "stage2-back-extension"].includes(merge.removed.id));
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ exerciseCount: exercises.length, categoryChanges: categoryChanges.length, tierChanges: tierChanges.length, tierCounts: report.phase2.tierCountsAfter }, null, 2));
}

await main();
