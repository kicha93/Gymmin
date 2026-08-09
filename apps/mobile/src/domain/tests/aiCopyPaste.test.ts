import { describe, expect, it } from "vitest";

import {
  AI_RESPONSE_MAX_LENGTH,
  applyAiRewrite,
  buildAiWorkoutPrompt,
  canApplyAiWorkoutResult,
  parseAiWorkoutResponse,
  replaceUnknownExercise
} from "../aiCopyPaste";
import { exercises } from "../exercises";
import type { SavedWorkout } from "../savedWorkouts";

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
    const pl = buildAiWorkoutPrompt({ creatorDraft: { primaryGoal: "Siła" }, language: "pl", mode: "create" });
    const en = buildAiWorkoutPrompt({ creatorDraft: { primaryGoal: "Strength" }, language: "en", mode: "create" });
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

  it("builds rewrite prompt with an immutable compact source workout", () => {
    const source = sourceWorkout();
    const before = JSON.stringify(source);
    const prompt = buildAiWorkoutPrompt({ instruction: "Shorten it", language: "en", mode: "rewrite", sourceWorkout: source });
    expect(prompt).toContain("Shorten it");
    expect(prompt).toContain(source.name);
    expect(JSON.stringify(source)).toBe(before);
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

  it("does not mutate the original workout until rewrite apply", () => {
    const source = sourceWorkout();
    const before = JSON.stringify(source);
    const proposal = parseAiWorkoutResponse(response(), 22).workouts[0];
    expect(JSON.stringify(source)).toBe(before);
    const applied = applyAiRewrite(source, proposal);
    expect(applied.id).toBe(source.id);
    expect(applied.createdAt).toBe(source.createdAt);
    expect(applied.draft).not.toBe(source.draft);
    expect(JSON.stringify(source)).toBe(before);
  });
});

function sourceWorkout(): SavedWorkout {
  return {
    createdAt: "2026-01-01T00:00:00.000Z",
    draft: { name: "Original", notes: "", sport: "strength", steps: [] },
    id: "source",
    name: "Original"
  };
}
