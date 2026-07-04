import AsyncStorage from "@react-native-async-storage/async-storage";
import { describe, expect, it } from "vitest";

import { getAccountStorageKey } from "../accountStorage";
import {
  ACHIEVEMENTS_STORAGE_BASE_KEY,
  APP_USAGE_STATS_STORAGE_BASE_KEY,
  achievementDefinitions,
  addForegroundUsageSeconds,
  calculateAchievementMetrics,
  evaluateAchievements,
  getAchievementProgress,
  getDefaultAppUsageStats,
  loadAppUsageStats,
  loadAchievementsSyncState,
  loadUserAchievements,
  maxForegroundSessionSeconds,
  mergeAppUsageStats,
  mergeUserAchievements,
  saveAppUsageStats,
  saveAchievementsSyncState,
  saveUserAchievements,
  type AppUsageStats
} from "../achievements";
import type { WorkoutSession } from "../workoutSessions";

const baseSession: WorkoutSession = {
  id: "session-1",
  sourceWorkoutId: "workout-1",
  sourceWorkoutName: "Push",
  executionMode: "guided",
  status: "completed",
  startedAt: "2026-01-05T10:00:00.000Z",
  finishedAt: "2026-01-05T11:00:00.000Z",
  updatedAt: "2026-01-05T11:00:00.000Z",
  deletedAt: null,
  planSnapshot: { name: "Push", notes: "", sport: "strength", steps: [] },
  entries: [
    {
      id: "entry-1",
      exerciseId: "bench_press",
      exerciseName: "Bench press",
      stageIndex: 1,
      seriesIndex: 1,
      setIteration: 1,
      elementIndex: 1,
      type: "exercise",
      actualReps: "10",
      actualWeight: "50",
      isCompleted: true
    }
  ]
};

function session(overrides: Partial<WorkoutSession>): WorkoutSession {
  return {
    ...baseSession,
    ...overrides,
    entries: overrides.entries ?? baseSession.entries,
    planSnapshot: overrides.planSnapshot ?? baseSession.planSnapshot
  };
}

function metrics(overrides: Partial<ReturnType<typeof calculateAchievementMetrics>>) {
  return {
    ...calculateAchievementMetrics([]),
    ...overrides
  };
}

function isUnlocked(metricOverrides: Partial<ReturnType<typeof calculateAchievementMetrics>>, achievementId: string) {
  return evaluateAchievements(achievementDefinitions, metrics(metricOverrides), [], "2026-01-05T12:00:00.000Z")
    .newUnlocks
    .some((item) => item.achievementId === achievementId);
}

describe("achievements", () => {
  it("has 30 unique achievement definitions with translations", () => {
    const ids = new Set(achievementDefinitions.map((definition) => definition.id));

    expect(achievementDefinitions).toHaveLength(30);
    expect(ids.size).toBe(30);
    achievementDefinitions.forEach((definition) => {
      expect(definition.title.pl.trim()).not.toBe("");
      expect(definition.title.en.trim()).not.toBe("");
      expect(definition.description.pl.trim()).not.toBe("");
      expect(definition.description.en.trim()).not.toBe("");
      expect(definition.imageKey?.trim()).not.toBe("");
    });
  });

  it("calculates metrics only from completed non-deleted sessions", () => {
    const metrics = calculateAchievementMetrics([
      baseSession,
      session({ id: "deleted", deletedAt: "2026-01-06T10:00:00.000Z" }),
      session({ id: "abandoned", status: "abandoned", finishedAt: undefined, abandonedAt: "2026-01-06T10:00:00.000Z" }),
      session({ id: "active", status: "active", finishedAt: undefined })
    ]);

    expect(metrics.completedWorkouts).toBe(1);
    expect(metrics.deletedSessionsIgnored).toBe(1);
    expect(metrics.totalTrainingMinutes).toBe(60);
    expect(metrics.totalVolumeKg).toBe(500);
    expect(metrics.totalVolumeTons).toBe(0.5);
    expect(metrics.uniqueWorkoutDays).toBe(1);
    expect(metrics.maxCompletedWorkoutsInSingleWeek).toBe(1);
    expect(metrics.uniqueExercisesCompleted).toBe(1);
  });

  it("counts unique workout days, exercise ids, and weekly streaks", () => {
    const metrics = calculateAchievementMetrics([
      baseSession,
      session({
        id: "session-2",
        startedAt: "2026-01-12T10:00:00.000Z",
        finishedAt: "2026-01-12T11:00:00.000Z",
        entries: [{ ...baseSession.entries[0], id: "entry-2", exerciseId: "squat", exerciseName: "Squat" }]
      }),
      session({
        id: "session-3",
        startedAt: "2026-01-19T10:00:00.000Z",
        finishedAt: "2026-01-19T11:00:00.000Z",
        entries: [{ ...baseSession.entries[0], id: "entry-3", exerciseId: undefined, exerciseName: "Pull up" }]
      })
    ]);

    expect(metrics.uniqueWorkoutDays).toBe(3);
    expect(metrics.uniqueExercisesCompleted).toBe(3);
    expect(metrics.longestWeeklyStreak).toBe(3);
  });

  it("unlocks the new threshold achievements", () => {
    expect(isUnlocked({ completedWorkouts: 250 }, "two_hundred_fifty_workouts")).toBe(true);
    expect(isUnlocked({ completedWorkouts: 500 }, "five_hundred_workouts")).toBe(true);
    expect(isUnlocked({ totalVolumeTons: 250 }, "two_hundred_fifty_tons_volume")).toBe(true);
    expect(isUnlocked({ totalVolumeTons: 500 }, "five_hundred_tons_volume")).toBe(true);
    expect(isUnlocked({ totalTrainingMinutes: 6000 }, "hundred_training_hours")).toBe(true);
    expect(isUnlocked({ uniqueWorkoutDays: 100 }, "hundred_training_days")).toBe(true);
    expect(isUnlocked({ longestWeeklyStreak: 12 }, "twelve_week_streak")).toBe(true);
    expect(isUnlocked({ longestWeeklyStreak: 52 }, "fifty_two_week_streak")).toBe(true);
    expect(isUnlocked({ uniqueExercisesCompleted: 50 }, "fifty_unique_exercises")).toBe(true);
    expect(isUnlocked({ uniqueExercisesCompleted: 100 }, "hundred_unique_exercises")).toBe(true);
  });

  it("calculates max completed workouts in a single Monday-based week", () => {
    const sameWeekSessions = Array.from({ length: 5 }, (_, index) => session({
      id: `same-week-${index}`,
      startedAt: `2026-01-0${5 + index}T10:00:00.000Z`,
      finishedAt: `2026-01-0${5 + index}T11:00:00.000Z`,
      updatedAt: `2026-01-0${5 + index}T11:00:00.000Z`
    }));
    const otherWeekSessions = [
      session({ id: "other-week-1", startedAt: "2026-01-12T10:00:00.000Z", finishedAt: "2026-01-12T11:00:00.000Z" }),
      session({ id: "other-week-2", startedAt: "2026-01-13T10:00:00.000Z", finishedAt: "2026-01-13T11:00:00.000Z" })
    ];
    const ignoredSessions = [
      session({ id: "deleted-week", deletedAt: "2026-01-07T12:00:00.000Z", startedAt: "2026-01-07T10:00:00.000Z" }),
      session({ id: "active-week", status: "active", startedAt: "2026-01-08T10:00:00.000Z", finishedAt: undefined }),
      session({ id: "abandoned-week", status: "abandoned", startedAt: "2026-01-09T10:00:00.000Z", finishedAt: undefined, abandonedAt: "2026-01-09T10:30:00.000Z" })
    ];

    const calculated = calculateAchievementMetrics([...sameWeekSessions, ...otherWeekSessions, ...ignoredSessions]);

    expect(calculated.maxCompletedWorkoutsInSingleWeek).toBe(5);
    expect(isUnlocked({ maxCompletedWorkoutsInSingleWeek: 3 }, "three_workouts_single_week")).toBe(true);
    expect(isUnlocked({ maxCompletedWorkoutsInSingleWeek: 5 }, "five_workouts_single_week")).toBe(true);
  });

  it("evaluates unlocks once and keeps unlockedAt stable", () => {
    const metrics = calculateAchievementMetrics([baseSession]);
    const first = evaluateAchievements(achievementDefinitions, metrics, [], "2026-01-05T12:00:00.000Z");

    expect(first.newUnlocks.some((item) => item.achievementId === "first_workout")).toBe(true);

    const second = evaluateAchievements(achievementDefinitions, metrics, first.unlockedAchievements, "2026-01-06T12:00:00.000Z");
    const firstWorkout = second.unlockedAchievements.find((item) => item.achievementId === "first_workout");

    expect(second.newUnlocks).toHaveLength(0);
    expect(firstWorkout?.unlockedAt).toBe("2026-01-05T12:00:00.000Z");
  });

  it("clamps percent to 100", () => {
    const progress = getAchievementProgress(
      achievementDefinitions.filter((definition) => definition.id === "first_workout"),
      { ...calculateAchievementMetrics([baseSession]), completedWorkouts: 1000 },
      []
    );

    expect(progress[0].percent).toBe(100);
  });

  it("adds foreground usage safely", () => {
    const stats: AppUsageStats = getDefaultAppUsageStats("2026-01-01T10:00:00.000Z");
    const updated = addForegroundUsageSeconds(stats, Date.parse("2026-01-01T10:00:00.000Z"), Date.parse("2026-01-01T10:30:00.000Z"));
    const clamped = addForegroundUsageSeconds(stats, Date.parse("2026-01-01T10:00:00.000Z"), Date.parse("2026-01-02T10:00:00.000Z"));
    const negative = addForegroundUsageSeconds(stats, Date.parse("2026-01-01T10:30:00.000Z"), Date.parse("2026-01-01T10:00:00.000Z"));

    expect(updated.totalForegroundSeconds).toBe(1800);
    expect(clamped.totalForegroundSeconds).toBe(maxForegroundSessionSeconds);
    expect(negative.totalForegroundSeconds).toBe(0);
  });

  it("stores achievements and usage per account owner", async () => {
    await saveUserAchievements("user-a", [{ achievementId: "first_workout", unlockedAt: "2026-01-01T10:00:00.000Z" }]);
    await saveAppUsageStats("user-a", { totalForegroundSeconds: 3600, updatedAt: "2026-01-01T10:00:00.000Z" });

    expect(await loadUserAchievements("user-a")).toHaveLength(1);
    expect(await loadUserAchievements("user-b")).toHaveLength(0);
    expect((await loadAppUsageStats("user-a")).totalForegroundSeconds).toBe(3600);
    expect((await loadAppUsageStats("user-b")).totalForegroundSeconds).toBe(0);
    expect(getAccountStorageKey(ACHIEVEMENTS_STORAGE_BASE_KEY, "user-a")).not.toBe(getAccountStorageKey(ACHIEVEMENTS_STORAGE_BASE_KEY, "user-b"));
    expect(getAccountStorageKey(APP_USAGE_STATS_STORAGE_BASE_KEY, null)).not.toBe(getAccountStorageKey(APP_USAGE_STATS_STORAGE_BASE_KEY, "user-a"));
  });

  it("does not crash on damaged storage", async () => {
    await AsyncStorage.setItem(getAccountStorageKey(ACHIEVEMENTS_STORAGE_BASE_KEY, "broken"), "{bad");
    await AsyncStorage.setItem(getAccountStorageKey(APP_USAGE_STATS_STORAGE_BASE_KEY, "broken"), "{bad");

    expect(await loadUserAchievements("broken")).toEqual([]);
    expect((await loadAppUsageStats("broken")).totalForegroundSeconds).toBe(0);
  });

  it("merges local and remote unlocked achievements as a stable union", () => {
    const merged = mergeUserAchievements(
      [
        {
          achievementId: "first_workout",
          progressAtUnlock: 1,
          unlockedAt: "2026-01-03T10:00:00.000Z",
          updatedAt: "2026-01-03T10:00:00.000Z"
        }
      ],
      [
        {
          achievementId: "first_workout",
          progressAtUnlock: 2,
          unlockedAt: "2026-01-01T10:00:00.000Z",
          updatedAt: "2026-01-04T10:00:00.000Z"
        },
        {
          achievementId: "five_workouts",
          progressAtUnlock: 5,
          unlockedAt: "2026-01-05T10:00:00.000Z",
          updatedAt: "2026-01-05T10:00:00.000Z"
        }
      ]
    );

    expect(merged).toHaveLength(2);
    expect(merged.find((item) => item.achievementId === "first_workout")?.unlockedAt).toBe("2026-01-01T10:00:00.000Z");
    expect(merged.find((item) => item.achievementId === "first_workout")?.progressAtUnlock).toBe(2);
    expect(merged.find((item) => item.achievementId === "first_workout")?.updatedAt).toBe("2026-01-04T10:00:00.000Z");
  });

  it("merges app usage stats with max foreground seconds", () => {
    const merged = mergeAppUsageStats(
      { totalForegroundSeconds: 7200, updatedAt: "2026-01-02T10:00:00.000Z" },
      { totalForegroundSeconds: 3600, updatedAt: "2026-01-03T10:00:00.000Z" }
    );

    expect(merged.totalForegroundSeconds).toBe(7200);
    expect(merged.updatedAt).toBe("2026-01-03T10:00:00.000Z");
  });

  it("stores achievement sync metadata per account owner", async () => {
    await saveAchievementsSyncState("user-a", {
      lastPulledAt: "2026-01-01T10:00:00.000Z",
      lastSyncedAt: "2026-01-01T10:01:00.000Z"
    });

    expect((await loadAchievementsSyncState("user-a")).lastPulledAt).toBe("2026-01-01T10:00:00.000Z");
    expect((await loadAchievementsSyncState("user-b")).lastPulledAt).toBeUndefined();
  });
});
