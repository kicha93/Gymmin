import { describe, expect, it } from "vitest";

import {
  buildSyncedAccountSettings,
  getSyncedAccountSettingsFieldPresence,
  normalizeSyncedAccountSettings,
  preserveLocalCreatorProfilesDuringInitialSync,
  resolveWeeklyPlanDuringInitialSync
} from "../accountSettings";
import { createDefaultAppSettings } from "../appSettings";
import { getDefaultWeeklyPlanSettings, upsertWeeklyPlanItem } from "../weeklyPlan";

describe("synced account settings", () => {
  const panels = { account: true };
  const settings = createDefaultAppSettings(panels, "2026-07-22T12:00:00.000Z");
  const emptyWeeklyPlan = getDefaultWeeklyPlanSettings(new Date("2026-07-22T12:00:00.000Z"));

  it("includes creator profiles and selected profile in the settings payload", () => {
    const payload = buildSyncedAccountSettings(
      settings,
      [{ id: "profile-1", name: "Kasia", draft: { age: "31" } }],
      "profile-1",
      emptyWeeklyPlan
    );

    expect(payload.creatorProfiles).toEqual([
      { id: "profile-1", name: "Kasia", draft: { age: "31" } }
    ]);
    expect(payload.selectedCreatorProfileId).toBe("profile-1");
  });

  it("restores profiles on a second device and validates the selection", () => {
    const remote = normalizeSyncedAccountSettings({
      ...settings,
      creatorProfiles: [{ id: "profile-1", name: "Kasia", draft: { goal: "Strength" } }],
      selectedCreatorProfileId: "missing"
    }, panels);

    expect(remote?.creatorProfiles).toHaveLength(1);
    expect(remote?.selectedCreatorProfileId).toBeNull();
  });

  it("keeps backward compatibility with settings saved before profile sync", () => {
    const remote = normalizeSyncedAccountSettings(settings, panels);
    expect(remote?.creatorProfiles).toEqual([]);
    expect(remote?.selectedCreatorProfileId).toBeNull();
  });

  it("distinguishes legacy null fields from explicit empty synchronized data", () => {
    expect(getSyncedAccountSettingsFieldPresence({
      creatorProfiles: null,
      weeklyPlan: null
    })).toEqual({ creatorProfiles: false, weeklyPlan: false });
    expect(getSyncedAccountSettingsFieldPresence({
      creatorProfiles: [],
      weeklyPlan: emptyWeeklyPlan
    })).toEqual({ creatorProfiles: true, weeklyPlan: true });
  });

  it("uploads legacy local profiles instead of erasing them on the first synced launch", () => {
    const remote = buildSyncedAccountSettings(settings, [], null, emptyWeeklyPlan);
    const migrated = preserveLocalCreatorProfilesDuringInitialSync(
      remote,
      [{ id: "legacy-1", name: "Profil lokalny", draft: { age: "40" } }],
      "legacy-1",
      false
    );

    expect(migrated.creatorProfiles[0]?.name).toBe("Profil lokalny");
    expect(migrated.selectedCreatorProfileId).toBe("legacy-1");
  });

  it("keeps an explicit remote deletion instead of restoring a stale local profile", () => {
    const remote = buildSyncedAccountSettings(settings, [], null, emptyWeeklyPlan);
    const resolved = preserveLocalCreatorProfilesDuringInitialSync(
      remote,
      [{ id: "stale-1", name: "Stary profil", draft: {} }],
      "stale-1",
      true
    );

    expect(resolved).toBe(remote);
    expect(resolved.creatorProfiles).toEqual([]);
  });

  it("restores the weekly plan on another device", () => {
    const weeklyPlan = upsertWeeklyPlanItem(emptyWeeklyPlan, "workout-1", "monday");
    const remote = normalizeSyncedAccountSettings({
      ...settings,
      creatorProfiles: [],
      selectedCreatorProfileId: null,
      weeklyPlan
    }, panels);

    expect(remote?.weeklyPlan.items).toEqual([
      { day: "monday", order: 0, workoutId: "workout-1" }
    ]);
  });

  it("migrates a legacy local weekly plan only when the remote field was absent", () => {
    const remote = buildSyncedAccountSettings(settings, [], null, emptyWeeklyPlan);
    const local = upsertWeeklyPlanItem(emptyWeeklyPlan, "workout-1", "friday");

    expect(resolveWeeklyPlanDuringInitialSync(remote, local, false, true).weeklyPlan.items)
      .toHaveLength(1);
    expect(resolveWeeklyPlanDuringInitialSync(remote, local, true, false)).toBe(remote);
  });

  it("resolves weekly-plan conflicts independently using its own timestamp", () => {
    const local = upsertWeeklyPlanItem(
      emptyWeeklyPlan,
      "local-workout",
      "monday",
      new Date("2026-07-23T12:00:00.000Z")
    );
    const olderRemotePlan = upsertWeeklyPlanItem(
      emptyWeeklyPlan,
      "remote-workout",
      "friday",
      new Date("2026-07-22T12:00:00.000Z")
    );
    const remote = buildSyncedAccountSettings(settings, [], null, olderRemotePlan);

    expect(resolveWeeklyPlanDuringInitialSync(remote, local, true, true).weeklyPlan)
      .toEqual(local);
  });
});
