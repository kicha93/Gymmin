import { describe, expect, it } from "vitest";

import { exerciseSearchIndex, searchExercises, type ExerciseSearchFilters } from "../exerciseSearch";

describe("exercise picker V2 performance budget", () => {
  it("keeps indexed search/filter work within a small synchronous budget", () => {
    const filters: ExerciseSearchFilters = { categories: new Set(), equipment: new Set(), muscles: new Set(), tiers: new Set() };
    const queries = ["b", "ben", "bench press", "wycisknaie", "zolnierskie", "lat pulldown"];
    const durations: number[] = [];
    for (let iteration = 0; iteration < 30; iteration += 1) {
      for (const query of queries) {
        const startedAt = performance.now();
        searchExercises({ query, language: "pl", filters, favoriteExerciseIds: new Set(), usageById: new Map() });
        durations.push(performance.now() - startedAt);
      }
    }
    durations.sort((left, right) => left - right);
    const p50 = durations[Math.floor(durations.length * 0.5)] ?? 0;
    const p95 = durations[Math.floor(durations.length * 0.95)] ?? 0;
    const indexTextBytes = new TextEncoder().encode(JSON.stringify(exerciseSearchIndex.map((record) => [
      record.exercise.id,
      record.normalizedEnglish,
      record.normalizedPolish,
      record.normalizedAliases,
      record.normalizedMetadata
    ]))).byteLength;
    console.info(`Exercise Picker V2 benchmark: p50=${p50.toFixed(2)}ms p95=${p95.toFixed(2)}ms indexText=${indexTextBytes}B`);
    expect(p95).toBeLessThan(20);
    expect(indexTextBytes).toBeLessThan(1_000_000);
  });
});
