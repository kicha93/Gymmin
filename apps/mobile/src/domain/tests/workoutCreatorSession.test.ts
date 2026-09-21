import AsyncStorage from "@react-native-async-storage/async-storage";
import { beforeEach, describe, expect, it } from "vitest";

import {
  clearWorkoutCreatorSession,
  loadWorkoutCreatorSession,
  saveWorkoutCreatorSession
} from "../workoutCreatorSession";

describe("workout creator recovery", () => {
  beforeEach(async () => AsyncStorage.clear());

  it("restores draft and copy-paste progress after an app restart", async () => {
    await saveWorkoutCreatorSession({
      draft: { primaryGoal: "strength", availableEquipment: ["barbell"] },
      phase: "form",
      profileName: "Jan",
      prompt: "prompt",
      response: "response",
      selectedProfileId: "profile-1"
    });
    await expect(loadWorkoutCreatorSession()).resolves.toMatchObject({
      draft: { primaryGoal: "strength", availableEquipment: ["barbell"] },
      profileName: "Jan",
      prompt: "prompt",
      response: "response",
      selectedProfileId: "profile-1"
    });
  });

  it("clears sensitive creator state after completion", async () => {
    await saveWorkoutCreatorSession({ draft: { primaryGoal: "strength" }, phase: "form", profileName: "", prompt: "p", response: "", selectedProfileId: null });
    await clearWorkoutCreatorSession();
    await expect(loadWorkoutCreatorSession()).resolves.toBeNull();
  });
});
