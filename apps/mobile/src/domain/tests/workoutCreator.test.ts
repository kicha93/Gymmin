import { describe, expect, it } from "vitest";

import {
  areCreatorDraftsEqual,
  cloneCreatorDraft,
  normalizeWorkoutCreatorProfiles,
  workoutCreatorSections,
  type WorkoutCreatorDraft
} from "../workoutCreator";

describe("workout creator domain", () => {
  it("clones multi-choice answers without sharing their arrays", () => {
    const source: WorkoutCreatorDraft = {
      primaryGoal: "Budowa masy mięśniowej",
      secondaryGoals: ["Siła", "Kondycja"]
    };

    const clone = cloneCreatorDraft(source);
    (clone.secondaryGoals as string[]).push("Mobilność");

    expect(source.secondaryGoals).toEqual(["Siła", "Kondycja"]);
    expect(clone.primaryGoal).toBe(source.primaryGoal);
  });

  it("removes the retired ready warm-up answer from drafts and persisted profiles", () => {
    expect(cloneCreatorDraft({ primaryGoal: "Strength", readyWarmupSet: "Yes" })).toEqual({
      primaryGoal: "Strength"
    });
    expect(normalizeWorkoutCreatorProfiles([{
      draft: { primaryGoal: "Strength", readyWarmupSet: "Yes" },
      id: "profile-1",
      name: "Profile"
    }])).toEqual([{
      draft: { primaryGoal: "Strength" },
      id: "profile-1",
      name: "Profile"
    }]);
  });

  it("compares every defined creator field and ignores unrelated metadata", () => {
    const left: WorkoutCreatorDraft = {
      primaryGoal: "Strength increase",
      gymAccess: "Yes",
      metadata: "old"
    };
    const right: WorkoutCreatorDraft = {
      primaryGoal: "Strength increase",
      gymAccess: "Yes",
      metadata: "new"
    };

    expect(areCreatorDraftsEqual(left, right)).toBe(true);
    expect(areCreatorDraftsEqual(left, { ...right, gymAccess: "No" })).toBe(false);
  });

  it("keeps creator field identifiers unique", () => {
    const fieldIds = workoutCreatorSections.flatMap((section) =>
      section.fields.map((field) => field.id)
    );

    expect(new Set(fieldIds).size).toBe(fieldIds.length);
    expect(fieldIds).not.toContain("readyWarmupSet");
  });

  it("normalizes persisted creator profiles and rejects unsafe values", () => {
    expect(normalizeWorkoutCreatorProfiles([
      {
        draft: { age: "31", days: ["Monday", "Friday"], invalid: 7 },
        id: " profile-1 ",
        name: " Kasia "
      },
      { draft: {}, id: "profile-1", name: "Duplicate" },
      { draft: {}, id: "", name: "Broken" }
    ])).toEqual([{
      draft: { age: "31", days: ["Monday", "Friday"] },
      id: "profile-1",
      name: "Kasia"
    }]);
  });
});
