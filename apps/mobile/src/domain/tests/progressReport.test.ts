import { describe, expect, it } from "vitest";

import {
  buildProgressReport,
  calculateExerciseStrengthChange,
  calculateOverallStrengthChange,
  calculateTrainingWeekStreak,
  estimateOneRepMax,
  getPreviousComparisonPeriod,
  getProgressReportPeriod,
  getProgressReportRecords
} from "../progressReport";
import type { WorkoutSession, WorkoutSessionEntry } from "../workoutSessions";

function entry(
  exerciseId: string,
  weight: string,
  reps: string,
  overrides: Partial<WorkoutSessionEntry> = {}
): WorkoutSessionEntry {
  return {
    actualReps: reps,
    actualWeight: weight,
    elementIndex: 0,
    exerciseId,
    exerciseName: exerciseId,
    id: exerciseId + "-entry",
    isCompleted: true,
    seriesIndex: 0,
    setIteration: 1,
    stageIndex: 0,
    type: "exercise",
    ...overrides
  };
}

function session(
  date: Date,
  entries: WorkoutSessionEntry[],
  overrides: Partial<WorkoutSession> = {}
): WorkoutSession {
  const finishedAt = new Date(date.getTime() + 60 * 60 * 1000);
  return {
    entries,
    executionMode: "guided",
    finishedAt: finishedAt.toISOString(),
    id: "session-" + date.getTime(),
    planSnapshot: { name: "Plan", notes: "", sport: "strength", steps: [] },
    sourceWorkoutId: "workout-1",
    sourceWorkoutName: "Plan",
    startedAt: date.toISOString(),
    status: "completed",
    ...overrides
  };
}

describe("progress report periods", () => {
  it("uses local Monday-Sunday weeks and handles a year boundary", () => {
    const range = getProgressReportPeriod("week", new Date(2026, 0, 1, 12));
    expect([range.start.getFullYear(), range.start.getMonth(), range.start.getDate()]).toEqual([2025, 11, 29]);
    expect([range.end.getFullYear(), range.end.getMonth(), range.end.getDate()]).toEqual([2026, 0, 4]);
  });

  it("uses calendar months and the previous calendar month", () => {
    const current = getProgressReportPeriod("month", new Date(2026, 0, 15));
    const previous = getPreviousComparisonPeriod("month", new Date(2026, 0, 15));
    expect(current.start.getDate()).toBe(1);
    expect(current.end.getDate()).toBe(31);
    expect([previous.start.getFullYear(), previous.start.getMonth(), previous.start.getDate()]).toEqual([2025, 11, 1]);
    expect(previous.end.getDate()).toBe(31);
  });

  it("creates exactly twelve Monday-Sunday weeks", () => {
    const range = getProgressReportPeriod("12weeks", new Date(2026, 2, 18));
    expect(Math.round((range.end.getTime() - range.start.getTime() + 1) / (24 * 60 * 60 * 1000))).toBe(84);
    expect(range.start.getDay()).toBe(1);
    expect(range.end.getDay()).toBe(0);
  });
});

describe("progress report strength and records", () => {
  it("uses Epley e1RM and guards invalid comparisons", () => {
    expect(estimateOneRepMax(100, 10)).toBeCloseTo(133.333, 3);
    expect(estimateOneRepMax(0, 10)).toBeNull();
    expect(calculateExerciseStrengthChange(100, 110)).toBeCloseTo(10);
    expect(calculateExerciseStrengthChange(0, 110)).toBeNull();
  });

  it("aggregates exercise percentage changes with a median", () => {
    expect(calculateOverallStrengthChange([30, 10, 20])).toBe(20);
    expect(calculateOverallStrengthChange([10, 20])).toBe(15);
    expect(calculateOverallStrengthChange([])).toBeNull();
  });

  it("does not create a false record from a heavier but weaker set", () => {
    const sessions = [
      session(new Date(2026, 0, 1, 10), [entry("bench", "80", "10")]),
      session(new Date(2026, 0, 8, 10), [entry("bench", "85", "5")])
    ];
    const records = getProgressReportRecords(sessions);
    expect(records).toEqual([]);
  });

  it("keeps record events in newest-first order", () => {
    const sessions = [
      session(new Date(2026, 0, 1, 10), [entry("bench", "80", "8")]),
      session(new Date(2026, 0, 8, 10), [entry("bench", "85", "8")]),
      session(new Date(2026, 0, 15, 10), [entry("bench", "82", "8")])
    ];
    const records = getProgressReportRecords(sessions);
    expect(records.map((record) => record.weightKg)).toEqual([85]);
  });

  it("ignores records from active, abandoned and deleted sessions", () => {
    const date = new Date(2026, 0, 8, 10);
    expect(getProgressReportRecords([
      session(date, [entry("bench", "100", "10")], { status: "active", finishedAt: undefined }),
      session(new Date(2026, 0, 9, 10), [entry("row", "100", "10")], { status: "abandoned" }),
      session(new Date(2026, 0, 10, 10), [entry("squat", "100", "10")], { deletedAt: "2026-01-11T00:00:00.000Z" })
    ])).toEqual([]);
  });
});

describe("progress report aggregation", () => {
  it("summarizes only completed non-deleted sessions in the selected period", () => {
    const completed = session(new Date(2026, 0, 10, 10), [entry("bench", "100", "10")]);
    const abandoned = session(new Date(2026, 0, 12, 10), [entry("bench", "200", "10")], {
      status: "abandoned"
    });
    const deleted = session(new Date(2026, 0, 13, 10), [entry("bench", "300", "10")], {
      deletedAt: "2026-01-14T00:00:00.000Z"
    });
    const report = buildProgressReport({
      period: "month",
      referenceDate: new Date(2026, 0, 20),
      sessions: [completed, abandoned, deleted]
    });
    expect(report.summary).toEqual({
      totalTrainingSeconds: 3600,
      totalVolumeKg: 1000,
      workoutCount: 1
    });
  });

  it("calculates strength only for exercises present in both periods and selects the biggest progress", () => {
    const previous = session(new Date(2025, 11, 10, 10), [
      entry("bench", "75", "10"),
      entry("row", "50", "10")
    ]);
    const current = session(new Date(2026, 0, 10, 10), [
      entry("bench", "90", "10"),
      entry("row", "55", "10"),
      entry("new-exercise", "200", "10")
    ]);
    const report = buildProgressReport({
      period: "month",
      referenceDate: new Date(2026, 0, 20),
      sessions: [previous, current]
    });
    expect(report.changes.strengthPercent).toBeCloseTo(15);
    expect(report.biggestProgress?.exerciseKey).toBe("id:bench");
    expect(report.biggestProgress?.percent).toBeCloseTo(20);
  });

  it("returns no comparison percentage without previous data and buckets the trend", () => {
    const report = buildProgressReport({
      period: "week",
      referenceDate: new Date(2026, 0, 7),
      sessions: [session(new Date(2026, 0, 7, 10), [entry("bench", "80", "10")])]
    });
    expect(report.changes.strengthPercent).toBeNull();
    expect(report.changes.volumePercent).toBeNull();
    expect(report.trend.buckets).toHaveLength(7);
    expect(report.trend.buckets.reduce((sum, bucket) => sum + bucket.workoutCount, 0)).toBe(1);
  });

  it("does not present one comparable exercise as overall strength progress", () => {
    const report = buildProgressReport({
      period: "month",
      referenceDate: new Date(2026, 0, 20),
      sessions: [
        session(new Date(2025, 11, 10, 10), [entry("bench", "80", "10")]),
        session(new Date(2026, 0, 10, 10), [entry("bench", "88", "10")])
      ]
    });
    expect(report.changes.strengthPercent).toBeNull();
    expect(report.biggestProgress?.exerciseKey).toBe("id:bench");
  });

  it("compares the first and last six weeks for the 12-week progress trend", () => {
    const report = buildProgressReport({
      period: "12weeks",
      referenceDate: new Date(2026, 2, 18),
      sessions: [
        session(new Date(2026, 0, 5, 10), [entry("bench", "80", "10")]),
        session(new Date(2026, 2, 9, 10), [entry("bench", "100", "10")])
      ]
    });
    expect(report.biggestProgress?.exerciseKey).toBe("id:bench");
    expect(report.biggestProgress?.percent).toBeCloseTo(25);
  });

  it("provides a safe empty report", () => {
    const report = buildProgressReport({
      period: "month",
      referenceDate: new Date(2026, 0, 7),
      sessions: []
    });
    expect(report.hasAnyHistory).toBe(false);
    expect(report.summary.workoutCount).toBe(0);
    expect(report.recentRecords).toEqual([]);
    expect(report.biggestProgress).toBeNull();
  });

  it("limits dashboard records to the three newest real improvements", () => {
    const sessions = [80, 82, 84, 86, 88].map((weight, index) =>
      session(new Date(2026, 0, 2 + index, 10), [entry("bench", String(weight), "8")])
    );
    const report = buildProgressReport({
      period: "month",
      referenceDate: new Date(2026, 0, 20),
      sessions
    });
    expect(report.allRecords).toHaveLength(4);
    expect(report.recentRecords.map((record) => record.weightKg)).toEqual([88, 86, 84]);
  });

  it("orders daily trend buckets and assigns each completed session once", () => {
    const monday = new Date(2026, 0, 5, 10);
    const sunday = new Date(2026, 0, 11, 10);
    const report = buildProgressReport({
      period: "week",
      referenceDate: new Date(2026, 0, 7),
      sessions: [
        session(monday, [entry("bench", "50", "10")]),
        session(sunday, [entry("row", "40", "10")])
      ]
    });
    expect(report.trend.buckets.map((bucket) => bucket.start.getDate())).toEqual([5, 6, 7, 8, 9, 10, 11]);
    expect(report.trend.buckets.map((bucket) => bucket.workoutCount)).toEqual([1, 0, 0, 0, 0, 0, 1]);
    expect(report.trend.buckets.map((bucket) => bucket.totalVolumeKg)).toEqual([500, 0, 0, 0, 0, 0, 400]);
  });
});

describe("progress report consistency", () => {
  it("counts consecutive Monday-Sunday training weeks", () => {
    const sessions = [
      session(new Date(2026, 0, 5, 10), []),
      session(new Date(2026, 0, 12, 10), []),
      session(new Date(2026, 0, 19, 10), [])
    ];
    expect(calculateTrainingWeekStreak(sessions, new Date(2026, 0, 21))).toBe(3);
  });

  it("does not let an empty current partial week break the previous streak", () => {
    const sessions = [
      session(new Date(2026, 0, 5, 10), []),
      session(new Date(2026, 0, 12, 10), [])
    ];
    expect(calculateTrainingWeekStreak(sessions, new Date(2026, 0, 21))).toBe(2);
  });

  it("stops at a missed week", () => {
    const sessions = [
      session(new Date(2025, 11, 29, 10), []),
      session(new Date(2026, 0, 12, 10), [])
    ];
    expect(calculateTrainingWeekStreak(sessions, new Date(2026, 0, 14))).toBe(1);
  });
});
