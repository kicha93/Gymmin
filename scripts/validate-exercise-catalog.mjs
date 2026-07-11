import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogDir = path.join(root, "apps", "mobile", "src", "domain", "exerciseCatalog");
const namesDir = path.join(root, "apps", "mobile", "src", "domain", "exerciseNames");
const reportPath = path.join(root, "docs", "reports", "exercise-catalog-validation.json");
const idAliasPath = path.join(root, "apps", "mobile", "src", "domain", "exerciseIdAliases.ts");
const aliasPath = path.join(root, "apps", "mobile", "src", "domain", "exerciseAliases.ts");

const categories = new Set(["BANDED_EXERCISES","BATTLE_ROPE","BENCH_PRESS","BIKE_OUTDOOR","CALF_RAISE","CARDIO","CARRY","CHOP","CORE","CRUNCH","CURL","DEADLIFT","DORSIFLEXION","ELLIPTICAL","FLOOR_CLIMB","FLYE","HIP_RAISE","HIP_STABILITY","HIP_SWING","HYPEREXTENSION","INDOOR_BIKE","LADDER","LATERAL_RAISE","LEG_CURL","LEG_EXTENSION","LEG_RAISE","LUNGE","OLYMPIC_LIFT","PLANK","PLYO","PULL_UP","PULLOVER","PUSH_UP","ROW","RUN","RUN_INDOOR","SANDBAG","SHOULDER_PRESS","SHOULDER_STABILITY","SHRUG","SIT_UP","SLED","SLEDGE_HAMMER","SQUAT","STAIR_STEPPER","SUSPENSION","TIRE","TOTAL_BODY","TRICEPS_EXTENSION","WARM_UP"]);
const equipment = new Set(["ankleWeight","band","barbell","battleRope","bench","bike","bosuBall","box","cableMachine","dumbbell","ezBar","foamRoller","jumpRope","kettlebell","machine","medicineBall","other","plate","pullupBar","rings","rope","sandbag","sled","slidingDisc","smithMachine","squatRack","swissBall","trx","weightVest"]);
const tiers = new Set(["main","advanced","sportSpecific","rehab","variation","progression","deprecated"]);
const equipmentHints = [[/\bdumbbell\b/i,"dumbbell"],[/\bbarbell\b/i,"barbell"],[/\bcable\b/i,"cableMachine"],[/\bswiss ball\b/i,"swissBall"],[/\brings?\b/i,"rings"],[/\bkettlebell\b/i,"kettlebell"],[/\bsmith machine\b/i,"smithMachine"],[/\b(resistance band|banded)\b/i,"band"],[/\bbench\b/i,"bench"]];
const equipmentHintExceptions = new Set(["bench-press-dumbbell-floor-press-83","bench-press-one-arm-floor-press-91"]);

function parseObject(source, marker) { return JSON.parse(source.slice(source.indexOf("{"), source.lastIndexOf(marker) + 1)); }
function normalize(value) { return String(value ?? "").trim().toLocaleLowerCase("en").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[’']/g,"'").replace(/[-_]+/g," ").replace(/\s+/g," "); }

const errors=[]; const warnings=[]; const exercises=[];
for(const file of (await readdir(catalogDir)).filter((f)=>f.endsWith(".ts")&&f!=="index.ts")){
  try { const source=await readFile(path.join(catalogDir,file),"utf8"); const start=source.indexOf("["); const end=source.lastIndexOf("] satisfies"); exercises.push(...JSON.parse(source.slice(start,end+1))); }
  catch(error){errors.push({code:"invalid_catalog_syntax",file,message:String(error)});}
}
for(const file of (await readdir(namesDir)).filter((f)=>f.endsWith(".json"))){try{JSON.parse(await readFile(path.join(namesDir,file),"utf8"));}catch(error){errors.push({code:"invalid_json",file,message:String(error)});}}

const byId=new Map(); const english=new Map(); const polish=new Map();
for(const exercise of exercises){
  if(!exercise.id?.trim())errors.push({code:"empty_id",exercise}); else if(byId.has(exercise.id))errors.push({code:"duplicate_id",id:exercise.id}); else byId.set(exercise.id,exercise);
  for(const [field,index,code] of [["name",english,"duplicate_english_name"],["polishName",polish,"duplicate_polish_name"]]){const value=exercise[field];if(!value?.trim())errors.push({code:`empty_${field}`,id:exercise.id});else{const key=normalize(value);if(index.has(key))errors.push({code,ids:[index.get(key).id,exercise.id],value});else index.set(key,exercise);}}
  if(!categories.has(exercise.garminCategory))errors.push({code:"invalid_category",id:exercise.id,value:exercise.garminCategory});
  if(!tiers.has(exercise.libraryTier))errors.push({code:"invalid_library_tier",id:exercise.id,value:exercise.libraryTier});
  const actual=new Set(); for(const [key,value] of Object.entries(exercise.equipment??{})){if(!equipment.has(key))errors.push({code:"invalid_equipment_key",id:exercise.id,key});if(![0,1].includes(value))errors.push({code:"invalid_equipment_value",id:exercise.id,key,value});if(value===1)actual.add(key);}
  if(!equipmentHintExceptions.has(exercise.id)){for(const [pattern,expected] of equipmentHints){if(pattern.test(exercise.name)&&!actual.has(expected))warnings.push({code:"equipment_name_mismatch",id:exercise.id,name:exercise.name,expected,actual:[...actual]});}}
  if(exercise.polishName===exercise.name)warnings.push({code:"untranslated_polish_name",id:exercise.id,name:exercise.name});
}

const idAliases=parseObject(await readFile(idAliasPath,"utf8"),"} as const");
for(const [source,target] of Object.entries(idAliases)){if(source===target)errors.push({code:"self_id_mapping",source});if(byId.has(source))errors.push({code:"mapped_source_still_exists",source});if(!byId.has(target))errors.push({code:"missing_id_mapping_target",source,target});let current=target;const seen=new Set([source]);while(idAliases[current]){if(seen.has(current)){errors.push({code:"cyclic_id_mapping",source});break;}seen.add(current);current=idAliases[current];}}
const aliases=parseObject(await readFile(aliasPath,"utf8"),"} as const"); const validNames=new Set(exercises.flatMap((e)=>[e.name,e.polishName]));
for(const [source,target] of Object.entries(aliases)){
  if(source===target){errors.push({code:"self_name_alias",source});continue;}
  let current=target;const seen=new Set([source]);
  while(!validNames.has(current)&&aliases[current]&&!seen.has(current)){seen.add(current);current=aliases[current];}
  if(seen.has(current))errors.push({code:"cyclic_name_alias",source});
  else if(!validNames.has(current))errors.push({code:"missing_name_alias_target",source,target,resolved:current});
}

const report={generatedAt:new Date().toISOString(),exerciseCount:exercises.length,idMappingCount:Object.keys(idAliases).length,errors,warnings};
await writeFile(reportPath,`${JSON.stringify(report,null,2)}\n`,`utf8`);
console.log(JSON.stringify({exerciseCount:report.exerciseCount,idMappingCount:report.idMappingCount,errorCount:errors.length,warningCount:warnings.length},null,2));
if(errors.length)process.exitCode=1;
