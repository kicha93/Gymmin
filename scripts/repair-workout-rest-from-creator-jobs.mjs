import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appDataDirectory = path.join(repoRoot, "backend", "Gymmin.Api", "App_Data");
const workoutsPath = path.join(appDataDirectory, "workouts.json");
const creatorJobsPath = path.join(appDataDirectory, "workout-creator-jobs.json");
const shouldApply = process.argv.includes("--apply");

function normalizeText(value) {
  return typeof value === "string"
    ? value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("pl")
    : "";
}

function isExerciseStep(step) {
  const isExerciseKind = step?.kind === 2 || normalizeText(step?.kind) === "exercise";
  const isRest = step?.stageType === 4 || normalizeText(step?.stageType) === "rest";
  return isExerciseKind && !isRest && normalizeText(step?.exerciseName);
}

function parseCreatorPlans(jobs) {
  const plans = [];

  for (const job of jobs) {
    if (job?.status !== "completed" || job?.jobType !== "plan" || !job?.result?.planText) {
      continue;
    }

    try {
      const parsed = JSON.parse(job.result.planText);
      if (!Array.isArray(parsed)) {
        continue;
      }

      for (const plan of parsed) {
        if (Array.isArray(plan?.cwiczenia)) {
          plans.push({ ...plan, userId: job.userId });
        }
      }
    } catch {
      // A malformed historical result is not a safe recovery source.
    }
  }

  return plans;
}

function isSafePlanMatch(workout, workoutExercises, plan) {
  if (
    workout.userId !== plan.userId
    || normalizeText(workout.name) !== normalizeText(plan.nazwa)
    || workoutExercises.length !== plan.cwiczenia.length
    || workoutExercises.length === 0
  ) {
    return false;
  }

  let exactExerciseNames = 0;
  for (let index = 0; index < workoutExercises.length; index += 1) {
    const step = workoutExercises[index];
    const source = plan.cwiczenia[index];
    const sameExercise = normalizeText(step.exerciseName) === normalizeText(source.nazwaCwiczenia);
    const sameTarget = normalizeText(step.targetValue) === normalizeText(String(source.liczbaPowtorzen ?? ""));
    const sameNotes = normalizeText(step.notes) === normalizeText(source.uwagi);

    if (sameExercise) {
      exactExerciseNames += 1;
    }

    // Exercise aliases may have been normalized during the original import.
    // In that case both the generated notes and target still have to match.
    if (!sameExercise && !(sameTarget && sameNotes)) {
      return false;
    }
  }

  return exactExerciseNames >= Math.ceil(workoutExercises.length * 0.6);
}

function recoverWorkout(workout, plans) {
  if (workout.deletedAt) {
    return { changed: false, recoveredCount: 0, workout };
  }

  const workoutExercises = (workout.steps ?? []).filter(isExerciseStep);
  const matches = plans.filter((plan) => isSafePlanMatch(workout, workoutExercises, plan));
  if (matches.length !== 1) {
    return { changed: false, recoveredCount: 0, workout };
  }

  const sourceByStep = new Map(
    workoutExercises.map((step, index) => [step.clientStepId, matches[0].cwiczenia[index]])
  );
  let recoveredCount = 0;
  const steps = workout.steps.map((step) => {
    const source = sourceByStep.get(step.clientStepId);
    const existingRest = Number.parseInt(String(step.restSeconds ?? ""), 10);
    const sourceRest = Number.parseInt(String(source?.odpoczynekMiedzySeriamiWSekundach ?? ""), 10);

    if (
      !source
      || (Number.isFinite(existingRest) && existingRest > 0)
      || !Number.isFinite(sourceRest)
      || sourceRest <= 0
      || sourceRest > 359_999
    ) {
      return step;
    }

    recoveredCount += 1;
    return { ...step, restSeconds: String(sourceRest) };
  });

  return recoveredCount
    ? {
        changed: true,
        recoveredCount,
        workout: { ...workout, steps, updatedAt: new Date().toISOString() }
      }
    : { changed: false, recoveredCount: 0, workout };
}

const workouts = JSON.parse(fs.readFileSync(workoutsPath, "utf8"));
const jobs = JSON.parse(fs.readFileSync(creatorJobsPath, "utf8"));
const plans = parseCreatorPlans(jobs);
let recoveredFieldCount = 0;
const repairedWorkoutNames = [];
const repairedWorkouts = workouts.map((workout) => {
  const recovered = recoverWorkout(workout, plans);
  if (recovered.changed) {
    recoveredFieldCount += recovered.recoveredCount;
    repairedWorkoutNames.push(`${workout.name} (${recovered.recoveredCount})`);
  }
  return recovered.workout;
});

console.log(`[workout-rest-repair] mode=${shouldApply ? "apply" : "dry-run"}`);
console.log(`[workout-rest-repair] matched workouts=${repairedWorkoutNames.length}`);
for (const name of repairedWorkoutNames) {
  console.log(`[workout-rest-repair] ${name}`);
}
console.log(`[workout-rest-repair] recovered fields=${recoveredFieldCount}`);

if (shouldApply && recoveredFieldCount > 0) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `${workoutsPath}.backup-rest-recovery-${timestamp}`;
  const temporaryPath = `${workoutsPath}.rest-recovery.tmp`;

  fs.copyFileSync(workoutsPath, backupPath);
  fs.writeFileSync(temporaryPath, `${JSON.stringify(repairedWorkouts, null, 2)}\n`, "utf8");
  fs.renameSync(temporaryPath, workoutsPath);
  console.log(`[workout-rest-repair] backup=${backupPath}`);
  console.log(`[workout-rest-repair] saved=${workoutsPath}`);
}
