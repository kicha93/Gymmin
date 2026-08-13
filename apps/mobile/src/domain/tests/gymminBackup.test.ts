import { describe, expect, it, vi } from "vitest";

vi.mock("expo-file-system", () => ({ Directory: class {}, File: class {}, Paths: { document: "file:///documents" } }));
vi.mock("expo-image-manipulator", () => ({ ImageManipulator: {}, SaveFormat: { JPEG: "jpeg", PNG: "png", WEBP: "webp" } }));

import { createDefaultAppSettings } from "../appSettings";
import { createStep } from "../workouts";
import {
  createGymminBackup,
  createGymminBackupFilename,
  getGymminBackupSummary,
  GymminBackupValidationError,
  parseGymminBackup,
  serializeGymminBackup,
  type GymminBackupSnapshot
} from "../localBackup/gymminBackup";

const now = new Date("2026-08-09T10:30:00.000Z");
const defaults = { "settings-data": true };

function snapshot(): GymminBackupSnapshot {
  const draft = {
    name: "Siła",
    notes: "pełny plan",
    sport: "strength" as const,
    steps: [
      createStep({ id: "stage-1", kind: "stage", label: "Ćwiczenia", stageType: "exercise" }),
      createStep({ id: "set-1", kind: "set", label: "Seria 1", parentStageId: "stage-1", setCount: "3" }),
      createStep({
        exerciseId: "squat-back-squats-1249",
        exerciseName: "Przysiad",
        goalType: "repetitions",
        id: "exercise-1",
        kind: "exercise",
        parentSetId: "set-1",
        parentStageId: "stage-1",
        targetValue: "8"
      })
    ]
  };
  return {
    achievements: {
      appUsage: { totalForegroundSeconds: 1234 },
      unlocked: [{ achievementId: "first-workout", unlockedAt: now.toISOString() }]
    },
    creatorProfiles: { items: [{ draft: { age: "30" }, id: "profile-1", name: "Profil" }], selectedProfileId: "profile-1" },
    favoriteExercises: [{ createdAt: now.toISOString(), exerciseId: "squat-back-squats-1249" }],
    settings: (({ updatedAt: _updatedAt, ...settings }) => settings)(createDefaultAppSettings(defaults, now.toISOString())),
    weeklyPlan: { enabled: true, items: [{ day: "monday", order: 0, workoutId: "workout-1" }] },
    workoutSessions: {
      active: { entryIndex: 0, sessionId: "session-1" },
      items: [{
        entries: [{ elementIndex: 0, exerciseId: "squat-back-squats-1249", id: "entry-1", isCompleted: true, seriesIndex: 0, setIteration: 0, stageIndex: 0, type: "exercise" }],
        executionMode: "guided",
        id: "session-1",
        planSnapshot: draft,
        sourceWorkoutId: "workout-1",
        sourceWorkoutName: "Siła",
        startedAt: now.toISOString(),
        status: "completed"
      }]
    },
    workouts: {
      items: [{ archivedAt: null, createdAt: now.toISOString(), draft, id: "workout-1", name: "Siła" }],
      selectedWorkoutId: "workout-1",
      sort: { direction: "desc", field: "createdAt" }
    }
  };
}

function roundtrip(value = snapshot()) {
  const backup = createGymminBackup(value, { appVersion: "1.0.0", now });
  return parseGymminBackup(serializeGymminBackup(backup), defaults);
}

describe("Gymmin backup contract", () => {
  it("roundtrips a complete domain snapshot and remains idempotent", () => {
    const first = roundtrip();
    const second = parseGymminBackup(serializeGymminBackup(first), defaults);
    expect(second).toEqual(first);
    expect(getGymminBackupSummary(first)).toMatchObject({ achievementCount: 1, creatorProfileCount: 1, favoriteCount: 1, sessionCount: 1, workoutCount: 1 });
    expect(first.data.workouts.items[0].draft.steps[2].exerciseId).toBe("squat-barbell-back-squat-1251");
  });

  it("supports an empty installation", () => {
    const value = snapshot();
    value.workouts.items = [];
    value.workouts.selectedWorkoutId = null;
    value.workoutSessions = { active: null, items: [] };
    value.weeklyPlan = { enabled: false, items: [] };
    value.creatorProfiles = { items: [], selectedProfileId: null };
    value.favoriteExercises = [];
    value.achievements = { appUsage: { totalForegroundSeconds: 0 }, unlocked: [] };
    expect(roundtrip(value).data.workouts.items).toEqual([]);
  });

  it("keeps v1 backward compatible and roundtrips an optional local profile", () => {
    const withoutProfile = roundtrip();
    expect(withoutProfile.data.profile).toBeUndefined();
    const value = snapshot();
    value.profile = { avatar: { base64: "/9j/2Q==", mimeType: "image/jpeg" } };
    expect(roundtrip(value).data.profile).toEqual(value.profile);
  });

  it.each([
    ["malformed-json", "{bad"],
    ["invalid-format", JSON.stringify({ format: "other", version: 1 })],
    ["unsupported-version", JSON.stringify({ format: "gymmin-backup", version: 2 })]
  ])("rejects %s", (code, raw) => {
    expect(() => parseGymminBackup(raw, defaults)).toThrowError(expect.objectContaining({ code }) as GymminBackupValidationError);
  });

  it("rejects missing and partially damaged sections", () => {
    const backup = createGymminBackup(snapshot(), { appVersion: "1.0.0", now }) as any;
    delete backup.data.settings;
    expect(() => parseGymminBackup(JSON.stringify(backup), defaults)).toThrowError(expect.objectContaining({ code: "missing-section" }));
    backup.data.settings = {};
    backup.data.workouts.items[0].draft.steps[0].id = 3;
    expect(() => parseGymminBackup(JSON.stringify(backup), defaults)).toThrowError(expect.objectContaining({ code: "invalid-workout" }));
  });

  it("drops an orphaned weekly plan reference without rejecting the remaining backup", () => {
    const backup = createGymminBackup(snapshot(), { appVersion: "1.0.0", now }) as any;
    backup.data.weeklyPlan.items[0].workoutId = "missing";
    const parsed = parseGymminBackup(JSON.stringify(backup), defaults);
    expect(parsed.data.weeklyPlan).toMatchObject({ enabled: false, items: [] });
  });

  it("rejects a broken active session reference", () => {
    const backup = createGymminBackup(snapshot(), { appVersion: "1.0.0", now }) as any;
    backup.data.workoutSessions.active.sessionId = "missing";
    expect(() => parseGymminBackup(JSON.stringify(backup), defaults)).toThrowError(expect.objectContaining({ code: "invalid-active-session-reference" }));
  });

  it("ignores unknown fields from the same version", () => {
    const backup = createGymminBackup(snapshot(), { appVersion: "1.0.0", now }) as any;
    backup.futureTopLevel = true;
    backup.data.settings.futurePreference = "safe-to-ignore";
    expect(parseGymminBackup(JSON.stringify(backup), defaults)).toMatchObject({ format: "gymmin-backup", version: 1 });
  });

  it("handles a large workout session history", () => {
    const value = snapshot();
    value.workoutSessions.active = null;
    value.workoutSessions.items = Array.from({ length: 2_000 }, (_, index) => ({
      ...value.workoutSessions.items[0],
      id: `session-${index}`,
      startedAt: new Date(now.getTime() - index * 60_000).toISOString()
    }));
    expect(roundtrip(value).data.workoutSessions.items).toHaveLength(2_000);
  });

  it("creates a portable file name", () => {
    expect(createGymminBackupFilename(now)).toBe("Gymmin_backup_2026-08-09_10-30.gymmin.json");
  });
});
