import { findCatalogExerciseBestEffort } from "./exercises";
import type { SavedWorkout } from "./savedWorkouts";
import { createStep, type WorkoutDraft, type WorkoutStep } from "./workouts";

export type AiWarmupImportMode = "ready" | "button" | "none";

export function getWorkoutCreatorPlanText(responseBody: unknown) {
  if (!isRecord(responseBody)) {
    return "";
  }

  const planText = getString(responseBody, ["planText", "outputText", "text", "content", "response"]);
  if (planText) {
    return planText;
  }

  try {
    return JSON.stringify(responseBody, null, 2);
  } catch {
    return "";
  }
}

export function createSavedWorkoutsFromApiResponse(
  responseBody: unknown,
  warmupMode: AiWarmupImportMode,
  now = Date.now()
): SavedWorkout[] {
  return extractWorkoutList(responseBody).flatMap((apiWorkout, workoutIndex) => {
    const name = getString(apiWorkout, ["nazwa", "name", "title", "tytul", "tytuł"])
      || `Trening ${workoutIndex + 1}`;
    const exercises = getRecordArray(apiWorkout, [
      "cwiczenia",
      "ćwiczenia",
      "exercises",
      "items",
      "elementy"
    ]);
    if (!exercises.length) {
      return [];
    }

    const workoutId = `ai-workout-${now}-${workoutIndex}`;
    const stageId = `${workoutId}-stage-main`;
    const steps: WorkoutStep[] = [
      ...createWarmupSteps(workoutId, warmupMode),
      createStep({
        goalType: "",
        id: stageId,
        kind: "stage",
        label: "Ćwiczenia",
        notes: "",
        stageType: "exercise",
        targetValue: ""
      })
    ];

    exercises.forEach((apiExercise, exerciseIndex) => {
      const apiExerciseName = getString(apiExercise, [
        "nazwaCwiczenia",
        "nazwaĆwiczenia",
        "exerciseName",
        "name",
        "nazwa"
      ]);
      const catalogExercise = findCatalogExerciseBestEffort(apiExerciseName);
      const exerciseName = catalogExercise?.name ?? apiExerciseName;
      const setCount = String(normalizePositiveNumber(
        getValue(apiExercise, ["liczbaSerii", "sets", "setCount"])
      ) ?? 1);
      const repetitions = normalizePositiveNumber(
        getValue(apiExercise, ["liczbaPowtorzen", "liczbaPowtórzeń", "reps", "repetitions"])
      );
      const restSeconds = normalizePositiveNumber(getValue(apiExercise, [
        "odpoczynekMiedzySeriamiWSekundach",
        "odpoczynekMiędzySeriamiWSekundach",
        "restSeconds",
        "restBetweenSetsSeconds"
      ]));
      const notes = getString(apiExercise, ["uwagi", "notes", "opis", "description"]);
      const setId = `${workoutId}-set-${exerciseIndex}`;

      steps.push(
        createStep({
          exerciseId: catalogExercise?.id ?? "",
          exerciseName,
          goalType: repetitions ? "repetitions" : "",
          id: setId,
          kind: "set",
          notes,
          parentStageId: stageId,
          setCount,
          stageType: "exercise",
          targetValue: repetitions ? String(repetitions) : ""
        }),
        createStep({
          exerciseId: catalogExercise?.id ?? "",
          exerciseName,
          goalType: repetitions ? "repetitions" : "",
          id: `${workoutId}-element-${exerciseIndex}`,
          kind: "exercise",
          notes,
          parentSetId: setId,
          restSeconds: restSeconds ? String(restSeconds) : "",
          stageType: "exercise",
          targetValue: repetitions ? String(repetitions) : ""
        })
      );
    });

    const draft: WorkoutDraft = {
      name,
      notes: getString(apiWorkout, ["uwagi", "notes", "opis", "description"]),
      sport: "strength",
      steps
    };
    return [{
      createdAt: new Date(now + workoutIndex).toISOString(),
      draft,
      id: workoutId,
      name
    }];
  });
}

function createWarmupSteps(workoutId: string, mode: AiWarmupImportMode): WorkoutStep[] {
  if (mode === "none") {
    return [];
  }

  const stageId = `${workoutId}-stage-warmup`;
  const setId = `${workoutId}-set-warmup`;
  const base = [
    createStep({ goalType: "", id: stageId, kind: "stage", label: "Rozgrzewka", notes: "", stageType: "warmup", targetValue: "" }),
    createStep({ goalType: "", id: setId, kind: "set", notes: "", parentStageId: stageId, setCount: "1", stageType: "warmup", targetValue: "" })
  ];
  if (mode === "button") {
    return [...base, createStep({
      goalType: "buttonPress",
      id: `${workoutId}-warmup-button-press`,
      kind: "exercise",
      notes: "",
      parentSetId: setId,
      stageType: "warmup",
      targetValue: ""
    })];
  }

  const definitions = [
    ["Trucht", "jog", "time", "00:05:00", ""],
    ["Krążenie ramionami", "arm-circles", "repetitions", "10", ""],
    ["Rotacja klatki piersiowej", "thoracic-rotation", "repetitions", "10", "Na stronę"],
    ["Krążenie biodrami", "hip-circles", "repetitions", "10", "Na stronę"],
    ["Wykroki z rozciąganiem skrętnym kręgosłupa", "lunge-twist", "repetitions", "7", "Na stronę"]
  ] as const;
  return [...base, ...definitions.map(([exerciseName, idSuffix, goalType, targetValue, notes]) => {
    const exercise = findCatalogExerciseBestEffort(exerciseName);
    return createStep({
      exerciseId: exercise?.id ?? "",
      exerciseName: exercise?.name ?? exerciseName,
      goalType,
      id: `${workoutId}-warmup-${idSuffix}`,
      kind: "exercise",
      notes,
      parentSetId: setId,
      stageType: "exercise",
      targetValue
    });
  })];
}

function extractWorkoutList(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.filter(isRecord);
  }
  if (!isRecord(value)) {
    return [];
  }
  for (const key of ["workouts", "treningi", "plans", "plan", "items", "data", "dni"]) {
    const direct = getRecordArray(value, [key]);
    if (direct.length) {
      return direct;
    }
  }
  const result = getValue(value, ["result"]);
  if (isRecord(result) || Array.isArray(result)) {
    const wrapped = extractWorkoutList(result);
    if (wrapped.length) {
      return wrapped;
    }
  }
  if (getRecordArray(value, ["cwiczenia", "ćwiczenia", "exercises"]).length) {
    return [value];
  }
  const parsed = parseLooseJsonText(getString(value, ["planText", "outputText", "text", "content", "response"]));
  return parsed === null ? [] : extractWorkoutList(parsed);
}

function parseLooseJsonText(text: string): unknown | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  const candidates = [trimmed];
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1];
  if (fenced) candidates.push(fenced.trim());
  const arrayStart = trimmed.indexOf("[");
  const arrayEnd = trimmed.lastIndexOf("]");
  if (arrayStart >= 0 && arrayEnd > arrayStart) candidates.push(trimmed.slice(arrayStart, arrayEnd + 1));
  const objectStart = trimmed.indexOf("{");
  const objectEnd = trimmed.lastIndexOf("}");
  if (objectStart >= 0 && objectEnd > objectStart) candidates.push(trimmed.slice(objectStart, objectEnd + 1));
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as unknown;
    } catch {
      // Try the next supported wrapper.
    }
  }
  return null;
}

function getValue(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    if (key in record) return record[key];
  }
  const normalizedKeys = new Set(keys.map(normalizeKey));
  const matchingKey = Object.keys(record).find((key) => normalizedKeys.has(normalizeKey(key)));
  return matchingKey ? record[matchingKey] : undefined;
}

function getString(record: Record<string, unknown>, keys: string[]) {
  const value = getValue(record, keys);
  return typeof value === "string" ? value.trim() : "";
}

function getRecordArray(record: Record<string, unknown>, keys: string[]) {
  const value = getValue(record, keys);
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function normalizePositiveNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return Math.round(value);
  if (typeof value !== "string") return undefined;
  const match = value.replace(",", ".").match(/\d+(\.\d+)?/);
  const parsed = match ? Number(match[0]) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : undefined;
}

function normalizeKey(key: string) {
  return key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
