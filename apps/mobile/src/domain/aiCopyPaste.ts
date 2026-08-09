import { exercises, findCatalogExerciseBestEffort, findExerciseById, resolveExerciseId } from "./exercises";
import type { SavedWorkout } from "./savedWorkouts";
import { createStep, type GoalType, type WorkoutDraft, type WorkoutStep } from "./workouts";
import type { WorkoutCreatorDraft } from "./workoutCreator";

export const AI_RESPONSE_MAX_LENGTH = 1_000_000;
export type AiCopyPasteMode = "create" | "rewrite";

export type AiWorkoutImportIssue = {
  code: "unknown-exercise" | "validation";
  exerciseName: string;
  message: string;
  stepId?: string;
  suggestions: Array<{ id: string; name: string; polishName: string }>;
};

export type AiWorkoutImportResult = {
  errors: string[];
  issues: AiWorkoutImportIssue[];
  workouts: SavedWorkout[];
};

type PromptOptions = {
  creatorDraft?: WorkoutCreatorDraft;
  instruction?: string;
  language: "pl" | "en";
  mode: AiCopyPasteMode;
  sourceWorkout?: SavedWorkout | null;
};

export function buildAiWorkoutPrompt(options: PromptOptions) {
  const languageLabel = options.language === "pl" ? "Polish" : "English";
  const userInput = options.mode === "create"
    ? JSON.stringify(options.creatorDraft ?? {}, null, 2)
    : JSON.stringify({ instruction: options.instruction?.trim() ?? "", workout: compactWorkout(options.sourceWorkout) }, null, 2);
  return [
    "You are preparing a workout for the offline Gymmin mobile app.",
    `Write user-facing text in ${languageLabel}.`,
    "Return exactly one valid JSON object. Do not use Markdown, comments, explanations or trailing commas.",
    "Never invent exercise IDs. Use only an exerciseId from CATALOG below.",
    "Do not create standalone rest elements. Rest after a set belongs in exercise.restSeconds.",
    "Do not include account, userId, jobId, credits, billing, OpenAI or backend fields.",
    "OUTPUT_SCHEMA:",
    JSON.stringify({
      schemaVersion: 1,
      workouts: [{
        name: "string",
        notes: "string optional",
        stages: [{
          name: "string",
          notes: "string optional",
          series: [{
            exercises: [{
              exerciseId: "canonical catalog id",
              goalType: "repetitions|time|buttonPress|calories|heartRate",
              loadKg: "number optional",
              notes: "string optional",
              restSeconds: "integer >= 0",
              targetValue: "number or HH:MM:SS as string"
            }],
            setCount: "positive integer"
          }],
          type: "warmup|exercise|cooldown|other"
        }]
      }]
    }),
    options.mode === "create" ? "TASK: Create a new workout plan from this local form:" : "TASK: Rewrite the workout according to the instruction. Preserve useful details unless asked to change them:",
    userInput,
    "CATALOG (id|English name|Polish name):",
    getCompactExerciseCatalog()
  ].join("\n");
}

let compactCatalogCache = "";
export function getCompactExerciseCatalog() {
  if (!compactCatalogCache) {
    compactCatalogCache = exercises.map((exercise) => `${exercise.id}|${exercise.name}|${exercise.polishName}`).join("\n");
  }
  return compactCatalogCache;
}

export function parseAiWorkoutResponse(text: string, now = Date.now()): AiWorkoutImportResult {
  const errors: string[] = [];
  const issues: AiWorkoutImportIssue[] = [];
  if (!text.trim()) return { errors: ["AI response is empty."], issues, workouts: [] };
  if (text.length > AI_RESPONSE_MAX_LENGTH) return { errors: ["AI response is too large."], issues, workouts: [] };
  const parsed = parseLooseJson(text);
  if (parsed === null) return { errors: ["AI response is not valid JSON."], issues, workouts: [] };
  if (!isRecord(parsed) || parsed.schemaVersion !== 1 || !Array.isArray(parsed.workouts)) {
    return { errors: ["AI response does not match Gymmin schema version 1."], issues, workouts: [] };
  }
  const workouts = parsed.workouts.flatMap((value, workoutIndex) => {
    if (!isRecord(value) || !nonEmpty(value.name) || !Array.isArray(value.stages)) {
      errors.push(`Workout ${workoutIndex + 1} is missing a name or stages.`);
      return [];
    }
    const workoutId = `ai-local-${now}-${workoutIndex}`;
    const steps: WorkoutStep[] = [];
    value.stages.forEach((stageValue, stageIndex) => {
      if (!isRecord(stageValue) || !nonEmpty(stageValue.name) || !Array.isArray(stageValue.series)) {
        errors.push(`Stage ${stageIndex + 1} has an invalid shape.`);
        return;
      }
      const stageId = `${workoutId}-stage-${stageIndex}`;
      const stageType = normalizeStageType(stageValue.type);
      if (!isValidStageType(stageValue.type)) errors.push(`Stage ${stageIndex + 1} has an invalid type.`);
      steps.push(createStep({ id: stageId, kind: "stage", label: stageValue.name.trim(), notes: stringValue(stageValue.notes), stageType }));
      stageValue.series.forEach((seriesValue, seriesIndex) => {
        if (!isRecord(seriesValue) || !Array.isArray(seriesValue.exercises)) {
          errors.push(`Series ${seriesIndex + 1} in stage ${stageIndex + 1} is invalid.`);
          return;
        }
        const setCount = positiveInteger(seriesValue.setCount);
        if (!setCount) errors.push(`Series ${seriesIndex + 1} has an invalid setCount.`);
        const setId = `${workoutId}-stage-${stageIndex}-set-${seriesIndex}`;
        steps.push(createStep({ id: setId, kind: "set", parentStageId: stageId, setCount: String(setCount || 1), stageType }));
        seriesValue.exercises.forEach((exerciseValue, exerciseIndex) => {
          if (!isRecord(exerciseValue)) {
            errors.push(`Exercise ${exerciseIndex + 1} has an invalid shape.`);
            return;
          }
          const rawId = stringValue(exerciseValue.exerciseId);
          const rawName = stringValue(exerciseValue.exerciseName) || rawId;
          const resolvedId = rawId ? resolveExerciseId(rawId) : "";
          const byId = resolvedId ? findExerciseById(resolvedId) : undefined;
          const byName = findCatalogExerciseBestEffort(rawName);
          const catalogExercise = byId ?? byName;
          const stepId = `${setId}-exercise-${exerciseIndex}`;
          const goalType = normalizeGoalType(exerciseValue.goalType);
          const targetValue = scalarString(exerciseValue.targetValue);
          const restSeconds = nonNegativeInteger(exerciseValue.restSeconds);
          if (!goalType || !targetValue) errors.push(`Exercise ${rawName || exerciseIndex + 1} has an invalid goal.`);
          if (restSeconds === null) errors.push(`Exercise ${rawName || exerciseIndex + 1} has an invalid restSeconds.`);
          if (!isOptionalNonNegativeNumber(exerciseValue.loadKg)) errors.push(`Exercise ${rawName || exerciseIndex + 1} has an invalid loadKg.`);
          if (typeof exerciseValue.targetValue === "number" && exerciseValue.targetValue < 0) {
            errors.push(`Exercise ${rawName || exerciseIndex + 1} has a negative targetValue.`);
          }
          const step = createStep({
            exerciseId: catalogExercise?.id ?? "",
            exerciseName: catalogExercise?.name ?? rawName,
            goalType: goalType || "repetitions",
            id: stepId,
            kind: "exercise",
            loadKg: scalarString(exerciseValue.loadKg),
            notes: stringValue(exerciseValue.notes),
            parentSetId: setId,
            parentStageId: stageId,
            restSeconds: restSeconds === null ? "" : String(restSeconds),
            stageType,
            targetValue: targetValue || "1"
          });
          steps.push(step);
          if (!catalogExercise) {
            issues.push({
              code: "unknown-exercise",
              exerciseName: rawName || rawId || `Exercise ${exerciseIndex + 1}`,
              message: `Unknown exercise: ${rawName || rawId || exerciseIndex + 1}`,
              stepId,
              suggestions: suggestCatalogExercises(rawName || rawId)
            });
          }
        });
      });
    });
    const draft: WorkoutDraft = { name: value.name.trim(), notes: stringValue(value.notes), sport: "strength", steps };
    return [{ createdAt: new Date(now + workoutIndex).toISOString(), draft, id: workoutId, name: draft.name }];
  });
  if (!workouts.length && !errors.length) errors.push("AI response contains no workouts.");
  return { errors, issues, workouts };
}

export function replaceUnknownExercise(result: AiWorkoutImportResult, stepId: string, exerciseId: string): AiWorkoutImportResult {
  const canonicalId = resolveExerciseId(exerciseId);
  const exercise = findExerciseById(canonicalId);
  if (!exercise) return result;
  return {
    ...result,
    issues: result.issues.filter((issue) => issue.stepId !== stepId),
    workouts: result.workouts.map((workout) => ({
      ...workout,
      draft: {
        ...workout.draft,
        steps: workout.draft.steps.map((step) => step.id === stepId
          ? { ...step, exerciseId: exercise.id, exerciseName: exercise.name }
          : step)
      }
    }))
  };
}

export function canApplyAiWorkoutResult(result: AiWorkoutImportResult | null) {
  return Boolean(result && result.workouts.length && !result.errors.length && !result.issues.length);
}

export function applyAiRewrite(source: SavedWorkout, proposal: SavedWorkout): SavedWorkout {
  return {
    ...proposal,
    createdAt: source.createdAt,
    id: source.id,
    draft: { ...proposal.draft, steps: proposal.draft.steps.map((step) => ({ ...step })) }
  };
}

function compactWorkout(workout?: SavedWorkout | null) {
  if (!workout) return null;
  return {
    name: workout.name,
    notes: workout.draft.notes,
    steps: workout.draft.steps.map(({ id: _id, ...step }) => step)
  };
}

function parseLooseJson(text: string): unknown | null {
  const trimmed = text.trim();
  const candidates = [trimmed];
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1];
  if (fenced) candidates.push(fenced.trim());
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) candidates.push(trimmed.slice(start, end + 1));
  for (const candidate of candidates) {
    try { return JSON.parse(candidate); } catch { /* next supported wrapper */ }
  }
  return null;
}

function suggestCatalogExercises(value: string) {
  const query = normalizeText(value);
  return exercises
    .map((exercise) => ({ exercise, score: similarityScore(query, normalizeText(`${exercise.name} ${exercise.polishName}`)) }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 5)
    .map(({ exercise }) => ({ id: exercise.id, name: exercise.name, polishName: exercise.polishName }));
}

function similarityScore(query: string, candidate: string) {
  if (!query) return 0;
  if (candidate.includes(query)) return 1000 - candidate.indexOf(query);
  const queryTokens = new Set(query.split(/\s+/).filter(Boolean));
  return candidate.split(/\s+/).reduce((score, token) => score + (queryTokens.has(token) ? 10 : 0), 0);
}
function normalizeText(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
function normalizeStageType(value: unknown) { return ["warmup", "exercise", "cooldown", "other"].includes(String(value)) ? String(value) as WorkoutStep["stageType"] : "exercise"; }
function isValidStageType(value: unknown) { return typeof value === "string" && ["warmup", "exercise", "cooldown", "other"].includes(value); }
function normalizeGoalType(value: unknown): GoalType | "" {
  const normalized = String(value);
  return ["repetitions", "time", "buttonPress", "calories", "heartRate"].includes(normalized)
    ? normalized as GoalType
    : "";
}
function positiveInteger(value: unknown) { return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= 100 ? value : null; }
function nonNegativeInteger(value: unknown) { return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 86_400 ? value : null; }
function isOptionalNonNegativeNumber(value: unknown) { return value === undefined || (typeof value === "number" && Number.isFinite(value) && value >= 0); }
function scalarString(value: unknown) { return typeof value === "string" || typeof value === "number" ? String(value).trim().slice(0, 100) : ""; }
function stringValue(value: unknown) { return typeof value === "string" ? value.trim().slice(0, 4_000) : ""; }
function nonEmpty(value: unknown): value is string { return typeof value === "string" && value.trim().length > 0; }
function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
