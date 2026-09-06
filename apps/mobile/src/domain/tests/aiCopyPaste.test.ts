import { describe, expect, it } from "vitest";

import {
  AI_RESPONSE_MAX_LENGTH,
  buildAiWorkoutPrompt,
  canApplyAiWorkoutResult,
  getCompactExerciseCatalog,
  parseAiWorkoutResponse,
  replaceUnknownExercise
} from "../aiCopyPaste";
import { exercises } from "../exercises";
import { exerciseCatalogDataSource, type ExerciseCatalogDataSource } from "../exerciseCatalogDataSource";

const catalogExercise = exercises[0];

function response(exercise: Record<string, unknown> = {}) {
  return JSON.stringify({
    schemaVersion: 1,
    workouts: [{
      name: "Plan",
      notes: "Notes",
      stages: [{
        name: "Main",
        type: "exercise",
        series: [{
          setCount: 3,
          exercises: [{
            exerciseId: catalogExercise.id,
            goalType: "repetitions",
            restSeconds: 90,
            targetValue: "8",
            ...exercise
          }]
        }]
      }]
    }]
  });
}

describe("local AI copy/paste", () => {
  it("builds PL and EN create prompts from the canonical catalog without backend fields", () => {
    const pl = buildAiWorkoutPrompt({ creatorDraft: { primaryGoal: "Siła" }, language: "pl" });
    const en = buildAiWorkoutPrompt({ creatorDraft: { primaryGoal: "Strength" }, language: "en" });
    for (const prompt of [pl, en]) {
      expect(prompt).toContain(`${catalogExercise.id}|${catalogExercise.name}|${catalogExercise.polishName}`);
      expect(prompt).toContain("restSeconds");
      expect(prompt).toContain("Never invent exercise IDs");
      expect(prompt).not.toContain("consume credit");
      expect(prompt).not.toContain("start job");
    }
    expect(pl).toContain("Polish");
    expect(en).toContain("English");
  });

  it("does not send the retired ready warm-up answer to AI", () => {
    const prompt = buildAiWorkoutPrompt({
      creatorDraft: { primaryGoal: "Strength", readyWarmupSet: "Yes" },
      language: "en"
    });

    expect(prompt).toContain('\"primaryGoal\": \"Strength\"');
    expect(prompt).not.toContain("readyWarmupSet");
  });

  it("builds the catalog section from the active exercise datasource", () => {
    const availableExercises = exerciseCatalogDataSource.getAvailableExercises();
    const compactCatalog = getCompactExerciseCatalog();

    expect(compactCatalog.split("\n")).toHaveLength(availableExercises.length);
    expect(availableExercises.length).toBeGreaterThan(0);
    for (const exercise of availableExercises) {
      expect(compactCatalog).toContain(`${exercise.id}|${exercise.name}|${exercise.polishName}`);
      expect(exercise.libraryTier).not.toBe("progression");
    }
  });

  it("does not keep a hardcoded prompt list and accepts a catalog datasource", () => {
    const catalogDataSource: ExerciseCatalogDataSource = {
      getAvailableExercises: () => [{
        ...catalogExercise,
        id: "datasource-exercise",
        name: "Datasource exercise",
        polishName: "Ćwiczenie ze źródła danych"
      }]
    };

    const prompt = buildAiWorkoutPrompt({
      catalogDataSource,
      creatorDraft: { primaryGoal: "Strength" },
      language: "en"
    });

    expect(prompt).toContain("datasource-exercise|Datasource exercise|Ćwiczenie ze źródła danych");
    expect(prompt).not.toContain(`${catalogExercise.id}|${catalogExercise.name}|${catalogExercise.polishName}`);
  });

  it("parses plain JSON and Markdown fenced JSON with restSeconds", () => {
    for (const text of [response(), `Here is the result:\n\`\`\`json\n${response()}\n\`\`\``]) {
      const result = parseAiWorkoutResponse(text, 10);
      expect(result.errors).toEqual([]);
      expect(result.issues).toEqual([]);
      expect(result.workouts[0].draft.steps.find((step) => step.kind === "exercise")).toMatchObject({
        exerciseId: catalogExercise.id,
        restSeconds: "90",
        targetValue: "8"
      });
      expect(canApplyAiWorkoutResult(result)).toBe(true);
    }
  });

  it("recovers JSON surrounded by text and rejects malformed, missing and oversized responses", () => {
    expect(parseAiWorkoutResponse(`prefix ${response()} suffix`).workouts).toHaveLength(1);
    expect(parseAiWorkoutResponse("{broken").errors).not.toHaveLength(0);
    expect(parseAiWorkoutResponse(JSON.stringify({ schemaVersion: 1 })).errors).not.toHaveLength(0);
    expect(parseAiWorkoutResponse("x".repeat(AI_RESPONSE_MAX_LENGTH + 1)).errors).toContain("AI response is too large.");
  });

  it("rejects wrong field types and negative numeric values", () => {
    expect(parseAiWorkoutResponse(response({ restSeconds: "90" })).errors).not.toHaveLength(0);
    expect(parseAiWorkoutResponse(response({ loadKg: -1 })).errors).not.toHaveLength(0);
    expect(parseAiWorkoutResponse(response({ targetValue: -8 })).errors).not.toHaveLength(0);
  });

  it("normalizes historical aliases and known names without an ID", () => {
    const aliasOrCanonical = catalogExercise.id;
    expect(parseAiWorkoutResponse(response({ exerciseId: aliasOrCanonical })).issues).toEqual([]);
    const byName = parseAiWorkoutResponse(response({ exerciseId: "", exerciseName: catalogExercise.polishName }));
    expect(byName.issues).toEqual([]);
    expect(byName.workouts[0].draft.steps.find((step) => step.kind === "exercise")?.exerciseId).toBe(catalogExercise.id);
  });

  it("blocks unknown exercises, offers replacements and enables apply after replacement", () => {
    const result = parseAiWorkoutResponse(response({ exerciseId: "not-in-gymmin", exerciseName: "Mystery lift" }));
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0].suggestions.length).toBeGreaterThan(0);
    expect(canApplyAiWorkoutResult(result)).toBe(false);
    const repaired = replaceUnknownExercise(result, result.issues[0].stepId!, catalogExercise.id);
    expect(repaired.issues).toEqual([]);
    expect(canApplyAiWorkoutResult(repaired)).toBe(true);
  });

});
