import AsyncStorage from "@react-native-async-storage/async-storage";
import { beforeEach, describe, expect, it } from "vitest";

import {
  hasAnonymousAccountData,
  hasAnonymousMergeHandled,
  loadActiveWorkoutSessionForOwner,
  loadWorkoutsForOwner,
  markAnonymousMergeHandled,
  mergeCreatorProfilesById,
  saveActiveWorkoutSessionForOwner,
  saveWorkoutsForOwner
} from "../../storage/localDataRepositories";
import { getAccountStorageKey } from "../accountStorage";

describe("localDataRepositories", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("round-trips normalized workouts per owner", async () => {
    await saveWorkoutsForOwner("user-a", [{
      draft: { name: "Plan", notes: "", sport: "strength", steps: [] },
      id: "plan-1",
      name: "Plan"
    }], "plan-1", { direction: "asc", field: "name" });

    const stored = await loadWorkoutsForOwner("user-a");
    expect(stored.selectedWorkoutId).toBe("plan-1");
    expect(stored.sort).toEqual({ direction: "asc", field: "name" });
    expect(stored.workouts).toHaveLength(1);
  });

  it("detects invalid or populated anonymous data", async () => {
    await AsyncStorage.setItem(getAccountStorageKey("broken", null), "{invalid");
    await expect(hasAnonymousAccountData(["broken"])).resolves.toBe(true);
    await expect(hasAnonymousAccountData(["missing"])).resolves.toBe(false);
  });

  it("stores the anonymous merge decision per account", async () => {
    await expect(hasAnonymousMergeHandled("user-a")).resolves.toBe(false);
    await markAnonymousMergeHandled("user-a", "merged");
    await expect(hasAnonymousMergeHandled("user-a")).resolves.toBe(true);
  });

  it("merges creator profiles without duplicate ids", () => {
    const draft = {};
    expect(mergeCreatorProfilesById(
      [{ id: "a", name: "Account", draft }],
      [{ id: "a", name: "Anonymous duplicate", draft }, { id: "b", name: "Anonymous", draft }]
    ).map((profile) => profile.name)).toEqual(["Account", "Anonymous"]);
  });

  it("round-trips and clears active workout progress per owner", async () => {
    await saveActiveWorkoutSessionForOwner("user-a", "session-1", 3);
    await expect(loadActiveWorkoutSessionForOwner("user-a")).resolves.toEqual({
      entryIndex: 3,
      sessionId: "session-1"
    });
    await expect(loadActiveWorkoutSessionForOwner("user-b")).resolves.toEqual({
      entryIndex: undefined,
      sessionId: null
    });

    await saveActiveWorkoutSessionForOwner("user-a", null, 0);
    await expect(loadActiveWorkoutSessionForOwner("user-a")).resolves.toEqual({
      entryIndex: undefined,
      sessionId: null
    });
  });
});
