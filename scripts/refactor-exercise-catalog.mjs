import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogDir = path.join(repoRoot, "apps", "mobile", "src", "domain", "exerciseCatalog");
const namesDir = path.join(repoRoot, "apps", "mobile", "src", "domain", "exerciseNames");
const aliasPath = path.join(repoRoot, "apps", "mobile", "src", "domain", "exerciseAliases.ts");
const idAliasPath = path.join(repoRoot, "apps", "mobile", "src", "domain", "exerciseIdAliases.ts");
const reportPath = path.join(repoRoot, "docs", "reports", "exercise-catalog-refactor.json");

const categoryToFile = {
  BANDED_EXERCISES: "banded-exercises", BATTLE_ROPE: "battle-rope", BENCH_PRESS: "bench-press",
  BIKE_OUTDOOR: "bike-outdoor", CALF_RAISE: "calf-raise", CARDIO: "cardio", CARRY: "carry",
  CHOP: "chop", CORE: "core", CRUNCH: "crunch", CURL: "curl", DEADLIFT: "deadlift",
  DORSIFLEXION: "dorsiflexion", ELLIPTICAL: "elliptical", FLOOR_CLIMB: "floor-climb", FLYE: "flye",
  HIP_RAISE: "hip-raise", HIP_STABILITY: "hip-stability", HIP_SWING: "hip-swing",
  HYPEREXTENSION: "hyperextension", INDOOR_BIKE: "indoor-bike", LADDER: "ladder",
  LATERAL_RAISE: "lateral-raise", LEG_CURL: "leg-curl", LEG_EXTENSION: "leg-extension",
  LEG_RAISE: "leg-raise", LUNGE: "lunge", OLYMPIC_LIFT: "olympic-lift", PLANK: "plank",
  PLYO: "plyo", PULL_UP: "pull-up", PULLOVER: "pullover", PUSH_UP: "push-up", ROW: "row",
  RUN: "run", RUN_INDOOR: "run-indoor", SANDBAG: "sandbag", SHOULDER_PRESS: "shoulder-press",
  SHOULDER_STABILITY: "shoulder-stability", SHRUG: "shrug", SIT_UP: "sit-up", SLED: "sled",
  SLEDGE_HAMMER: "sledge-hammer", SQUAT: "squat", STAIR_STEPPER: "stair-stepper",
  SUSPENSION: "suspension", TIRE: "tire", TOTAL_BODY: "total-body",
  TRICEPS_EXTENSION: "triceps-extension", WARM_UP: "warm-up"
};

const merges = [
  ["carry-farmers-carry-150", "carry-farmers-walk-153", "same loaded carry"],
  ["carry-farmers-carry-on-toes-151", "carry-farmers-walk-on-toes-154", "same loaded carry on toes"],
  ["squat-squat-1299", "squat-air-squat-1246", "same bodyweight squat"],
  ["squat-back-squats-1249", "squat-barbell-back-squat-1251", "same barbell back squat"],
  ["shoulder-press-barbell-shoulder-press-1114", "shoulder-press-overhead-barbell-press-1125", "same strict standing barbell press"],
  ["shoulder-press-military-press-1123", "shoulder-press-overhead-barbell-press-1125", "historical name for strict barbell overhead press"],
  ["shoulder-press-strict-press-1133", "shoulder-press-overhead-barbell-press-1125", "same strict barbell overhead press"],
  ["shoulder-press-dumbbell-shoulder-press-1120", "shoulder-press-overhead-dumbbell-press-1126", "same standing dumbbell overhead press"],
  ["curl-standing-dumbbell-biceps-curl-363", "curl-dumbbell-biceps-curl-339", "standing is the default dumbbell curl"],
  ["curl-standing-alternating-dumbbell-curls-362", "curl-alternating-dumbbell-biceps-curl-323", "same alternating standing dumbbell curl"],
  ["crunch-cable-crunch-238", "crunch-kneeling-cable-crunch-255", "generic record describes kneeling cable crunch"],
  ["triceps-extension-reverse-grip-pressdown-1414", "triceps-extension-reverse-grip-triceps-pressdown-1415", "same reverse-grip cable press-down"],
  ["calf-raise-calf-raise-107", "calf-raise-standing-calf-raise-118", "same unweighted standing calf raise"]
];

const updates = {
  "pull-up-chin-up-902": { polishName: "Podciąganie na drążku podchwytem" },
  "pull-up-pull-up-918": { polishName: "Podciąganie na drążku nachwytem" },
  "pull-up-band-assisted-chin-up-898": { polishName: "Podciąganie na drążku podchwytem z pomocą gumy" },
  "pull-up-band-assisted-pull-up-899": { polishName: "Podciąganie na drążku nachwytem z pomocą gumy" },
  "plank-rolling-side-plank-763": { polishName: "Przejścia między deskami bocznymi" },
  "plank-side-plank-to-plank-with-reach-under-768": { polishName: "Deska boczna z przejściem do deski i sięganiem pod tułów" },
  "plank-side-plank-with-reach-under-774": { polishName: "Deska boczna z sięganiem pod tułów" },
  "carry-farmers-walk-153": { name: "Farmer's Walk", polishName: "Spacer farmera" },
  "carry-farmers-walk-on-toes-154": { polishName: "Spacer farmera na palcach" },
  "squat-air-squat-1246": { name: "Bodyweight Squat", polishName: "Przysiad bez obciążenia" },
  "squat-barbell-back-squat-1251": { name: "Barbell Back Squat", polishName: "Przysiad ze sztangą na plecach" },
  "shoulder-press-overhead-barbell-press-1125": { name: "Barbell Overhead Press", polishName: "Wyciskanie sztangi nad głowę" },
  "shoulder-press-overhead-dumbbell-press-1126": { name: "Dumbbell Shoulder Press", polishName: "Wyciskanie hantli nad głowę" },
  "crunch-kneeling-cable-crunch-255": { name: "Kneeling Cable Crunch", polishName: "Spięcia brzucha na wyciągu w klęku" },
  "triceps-extension-reverse-grip-triceps-pressdown-1415": { name: "Reverse-grip Triceps Press-down", polishName: "Prostowanie ramion na wyciągu podchwytem" },
  "calf-raise-standing-calf-raise-118": { name: "Standing Calf Raise", polishName: "Wspięcia na palce stojąc" },
  "hyperextension-hyperextension-496": { name: "Back Extension", polishName: "Wyprost grzbietu" },
  "triceps-extension-dumbbell-kickback-1404": { name: "Dumbbell Triceps Kickback", polishName: "Prostowanie ramienia z hantlem w opadzie tułowia" },
  "flye-cable-crossover-398": { polishName: "Rozpiętki na bramie" },
  "lateral-raise-seated-rear-lateral-raise-560": { polishName: "Unoszenie hantli bokiem w opadzie tułowia siedząc" },
  "calf-raise-seated-dumbbell-toe-raise-110": { polishName: "Unoszenie palców stóp z hantlem siedząc", garminCategory: "DORSIFLEXION" },
  "hip-raise-barbell-hip-thrust-on-floor-407": { name: "Barbell Glute Bridge", polishName: "Mostek biodrowy ze sztangą" },
  "banded-exercises-external-rotation-at-90-degree-abduction-11": { polishName: "Rotacja zewnętrzna ramienia z gumą przy odwiedzeniu do 90 stopni", libraryTier: "rehab" },
  "banded-exercises-kneeling-crunch-21": { polishName: "Spięcia brzucha w klęku z gumą oporową" },
  "squat-wall-ball-squat-and-press-1317": { polishName: "Przysiad z wyrzutem piłki lekarskiej o ścianę" },
  "shoulder-press-dumbbell-push-press-1119": { polishName: "Wyciskanie hantli nad głowę z wybiciem z nóg" },
  "core-cable-core-press-186": { name: "Pallof Press", polishName: "Pallof press na wyciągu" },
  "cardio-ski-moguls-132": { polishName: "Skoki narciarskie na boki" },
  "indoor-bike-assault-bike-532": { polishName: "Rower powietrzny Assault Bike" },
  "lateral-raise-scaption-558": { polishName: "Unoszenie ramion w płaszczyźnie łopatki" },
  "run-sprint-1086": { polishName: "Bieg sprinterski" },
  "squat-goblet-squat-1280": { polishName: "Przysiad goblet" },
  "total-body-burpee-1381": { polishName: "Burpee (padnij-powstań)" }
};

const equipmentUpdates = {
  "bench-press-decline-dumbbell-bench-press-81": ["dumbbell", "bench"],
  "calf-raise-standing-dumbbell-calf-raise-119": ["dumbbell"],
  "hip-stability-standing-cable-hip-abduction-468": ["cableMachine"],
  "plank-ring-plank-sprawls-762": ["rings"],
  "plank-swiss-ball-plank-with-feet-on-bench-784": ["swissBall", "bench"],
  "shrug-overhead-dumbbell-shrug-1185": ["dumbbell"],
  "squat-dumbbell-stepover-1276": ["dumbbell", "box"],
  "warm-up-ankle-dorsiflexion-with-band-1481": ["band"],
  "warm-up-swiss-ball-hip-crossover-1501": ["swissBall"],
  "warm-up-swiss-ball-reach-roll-and-lift-1502": ["swissBall"],
  "warm-up-swiss-ball-windshield-wipers-1503": ["swissBall"]
};

const categoryUpdates = {
  "hyperextension-hollow-hold-and-roll-495": "CORE",
  "hyperextension-knee-raises-498": "LEG_RAISE",
  "hyperextension-lat-pull-down-with-row-500": "ROW",
  "hyperextension-medicine-ball-deadlift-to-reach-501": "DEADLIFT",
  "hyperextension-one-arm-one-leg-row-502": "ROW",
  "hyperextension-one-arm-row-with-band-503": "ROW",
  "hyperextension-overhead-lunge-with-medicine-ball-504": "LUNGE",
  "hyperextension-plank-knee-tucks-505": "PLANK",
  "hyperextension-side-step-506": "HIP_STABILITY",
  "crunch-leg-extensions-260": "LEG_EXTENSION",
  "squat-alternating-box-dumbbell-step-ups-1247": "LUNGE",
  "squat-barbell-lateral-step-up-1256": "LUNGE",
  "squat-barbell-step-up-1261": "LUNGE",
  "squat-barbell-stepover-1262": "LUNGE",
  "squat-crossover-dumbbell-step-up-1268": "LUNGE",
  "squat-dumbbell-step-up-1275": "LUNGE",
  "squat-dumbbell-stepover-1276": "LUNGE",
  "squat-lateral-dumbbell-step-up-1284": "LUNGE",
  "squat-step-up-1305": "LUNGE",
  "squat-barbell-hang-squat-snatch-1255": "OLYMPIC_LIFT",
  "squat-barbell-squat-snatch-1259": "OLYMPIC_LIFT",
  "squat-dumbbell-squat-clean-1273": "OLYMPIC_LIFT",
  "squat-dumbbell-squat-snatch-1274": "OLYMPIC_LIFT",
  "squat-squat-american-swing-1300": "HIP_SWING",
  "squat-kettlebell-swing-overhead-1282": "HIP_SWING",
  "shoulder-press-dumbbell-front-raise-1117": "LATERAL_RAISE",
  "shoulder-press-weight-plate-front-raise-1135": "LATERAL_RAISE",
  "leg-curl-band-good-morning-571": "DEADLIFT",
  "leg-curl-bar-good-morning-572": "DEADLIFT",
  "leg-curl-good-morning-573": "DEADLIFT",
  "leg-curl-seated-barbell-good-morning-575": "DEADLIFT",
  "leg-curl-single-leg-barbell-good-morning-576": "DEADLIFT",
  "leg-curl-split-barbell-good-morning-579": "DEADLIFT",
  "leg-curl-staggered-stance-good-morning-581": "DEADLIFT",
  "leg-curl-zercher-good-morning-584": "DEADLIFT",
  "row-indoor-row-1046": "CARDIO",
  "lateral-raise-calorie-row-542": "CARDIO",
  "pull-up-ez-bar-pullover-906": "PULLOVER",
  "pull-up-standing-cable-pullover-920": "PULLOVER",
  "pull-up-straight-arm-pulldown-921": "PULLOVER",
  "pull-up-swiss-ball-ez-bar-pullover-923": "PULLOVER",
  "lateral-raise-rope-climb-557": "FLOOR_CLIMB",
  "pull-up-hanging-hurdle-907": "CORE",
  "core-ghd-back-extensions-192": "HYPEREXTENSION"
};

const tierRules = [
  [/(progression)/i, "progression"], [/(circuit)/i, "deprecated"],
  [/(kipping|triple under|battle rope.*circle)/i, "sportSpecific"],
  [/(swiss ball|board bench|partial lockout|isometric|triple.stop|reverse.grip incline|cheating)/i, "advanced"],
  [/(static hold|paused|tempo)/i, "variation"]
];

function arrayLiteral(source, file) { const a=source.indexOf("["); const b=source.lastIndexOf("] satisfies"); if(a<0||b<=a) throw new Error(`Cannot parse ${file}`); return source.slice(a,b+1); }
function constName(source, file) { const match=source.match(/export const\s+([A-Za-z0-9_]+)\s*=/); if(!match) throw new Error(`Cannot find const in ${file}`); return match[1]; }
function fileBody(name, list) { return `import type { Exercise } from "../exercises";\n\nexport const ${name} = ${JSON.stringify(list, null, 2)} satisfies readonly Exercise[];\n`; }
function setEquipment(exercise, required) { for (const key of Object.keys(exercise.equipment)) exercise.equipment[key]=required.includes(key)?1:0; }

async function main() {
  const files=(await readdir(catalogDir)).filter((f)=>f.endsWith(".ts")&&f!=="index.ts");
  const meta=new Map(); const all=[];
  for(const file of files){const source=await readFile(path.join(catalogDir,file),"utf8");const list=JSON.parse(arrayLiteral(source,file));if(list[0])meta.set(list[0].garminCategory,{file,name:constName(source,file)});all.push(...list);}
  const before=all.length; const byId=new Map(all.map((e)=>[e.id,e]));
  const aliasSource=await readFile(aliasPath,"utf8"); const aliases=new Map(Object.entries(JSON.parse(aliasSource.slice(aliasSource.indexOf("{"),aliasSource.lastIndexOf("} as const")+1))));
  const removed=new Set(); const idAliases={}; const mergeReport=[]; const nameChanges=[]; const equipmentChanges=[]; const categoryChanges=[];
  for(const [sourceId,targetId,reason] of merges){const source=byId.get(sourceId),target=byId.get(targetId);if(!source||!target)throw new Error(`Missing merge record ${sourceId} -> ${targetId}`);removed.add(sourceId);idAliases[sourceId]=targetId;aliases.set(source.name,target.name);aliases.set(source.polishName,target.polishName);mergeReport.push({removed:{id:source.id,name:source.name},canonical:{id:target.id,name:target.name},reason});}
  for(const [id,change] of Object.entries(updates)){const exercise=byId.get(id);if(!exercise)throw new Error(`Missing update record ${id}`);for(const field of ["name","polishName"]){if(change[field]&&change[field]!==exercise[field])nameChanges.push({id,field,before:exercise[field],after:change[field]});}Object.assign(exercise,change);}
  for(const [id,required] of Object.entries(equipmentUpdates)){const exercise=byId.get(id);if(!exercise)throw new Error(`Missing equipment record ${id}`);const beforeEquipment=Object.entries(exercise.equipment).filter(([,v])=>v>0).map(([k])=>k);setEquipment(exercise,required);equipmentChanges.push({id,name:exercise.name,before:beforeEquipment,after:required});}
  for(const [id,category] of Object.entries(categoryUpdates)){const exercise=byId.get(id);if(!exercise)throw new Error(`Missing category record ${id}`);categoryChanges.push({id,name:exercise.name,before:exercise.garminCategory,after:category});exercise.garminCategory=category;}
  for(const exercise of all){if(!exercise.libraryTier){exercise.libraryTier="main";for(const [pattern,tier] of tierRules){if(pattern.test(exercise.name)){exercise.libraryTier=tier;break;}}}}
  const retained=all.filter((e)=>!removed.has(e.id)); const groups=new Map(); for(const exercise of retained){groups.set(exercise.garminCategory,[...(groups.get(exercise.garminCategory)??[]),exercise]);}
  for(const [category,list] of groups){const known=meta.get(category);const file=known?.file??`${categoryToFile[category]}.ts`;const name=known?.name??categoryToFile[category].replace(/-([a-z])/g,(_,c)=>c.toUpperCase());list.sort((a,b)=>a.name.localeCompare(b.name));await writeFile(path.join(catalogDir,file),fileBody(name,list),"utf8");await writeFile(path.join(namesDir,`${categoryToFile[category]}.json`),`${JSON.stringify(list.map((e)=>e.name),null,2)}\n`,"utf8");}
  for(const [category,known] of meta){if(!groups.has(category)){await writeFile(path.join(catalogDir,known.file),fileBody(known.name,[]),"utf8");await writeFile(path.join(namesDir,`${categoryToFile[category]}.json`),"[]\n","utf8");}}
  await writeFile(aliasPath,`export const exerciseAliasMap = ${JSON.stringify(Object.fromEntries([...aliases].sort(([a],[b])=>a.localeCompare(b))),null,2)} as const;\n`,`utf8`);
  await writeFile(idAliasPath,`export const exerciseIdAliasMap = ${JSON.stringify(idAliases,null,2)} as const;\n`,`utf8`);
  const tierCounts=Object.fromEntries(["main","advanced","sportSpecific","rehab","variation","progression","deprecated"].map((tier)=>[tier,retained.filter((e)=>e.libraryTier===tier).length]));
  const report={generatedAt:new Date().toISOString(),beforeCount:before,afterCount:retained.length,mergedCount:removed.size,nameChanges,equipmentChanges,categoryChanges,tierCounts,merges:mergeReport,ambiguousNotMerged:["Band-assisted Pull-up vs Banded Pull-ups (Progression)","Dynamic Push-up vs Explosive Push-up","Body-weight Dip vs Incline Dip","Seated vs standing single-arm overhead dumbbell triceps extensions","Swiss-ball technical variants"]};
  await mkdir(path.dirname(reportPath),{recursive:true});await writeFile(reportPath,`${JSON.stringify(report,null,2)}\n`,`utf8`);console.log(JSON.stringify({beforeCount:before,afterCount:retained.length,mergedCount:removed.size,nameChanges:nameChanges.length,equipmentChanges:equipmentChanges.length,categoryChanges:categoryChanges.length,tierCounts},null,2));
}

await main();
