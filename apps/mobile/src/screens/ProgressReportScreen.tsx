import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { ProgressLineChart } from "../components/ProgressLineChart";
import { getExerciseDisplayName } from "../domain/exercises";
import {
  buildProgressReport,
  formatProgressPercent,
  formatReportDateRange,
  formatReportVolume,
  formatTrainingDuration,
  type ProgressReportPeriod,
  type ProgressReportTrendMetric
} from "../domain/progressReport";
import { weeklyPlanDays, type WeeklyPlanSummary } from "../domain/weeklyPlan";
import type { WorkoutSession } from "../domain/workoutSessions";
import type { LanguageCode, TranslationKey } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

type ProgressReportScreenProps = {
  language: LanguageCode;
  onOpenExercise: (exerciseKey: string) => void;
  onOpenExerciseList: () => void;
  onOpenRecords: () => void;
  onOpenWeeklyPlan: () => void;
  onOpenWorkout: (workoutId: string) => void;
  sessions: WorkoutSession[];
  t: (key: TranslationKey) => string;
  theme: Theme;
  weeklyPlanEnabled: boolean;
  weeklyPlanSummary: WeeklyPlanSummary;
};

function ReportCardTitle({
  action,
  date,
  onAction,
  theme,
  title
}: {
  action?: string;
  date?: string;
  onAction?: () => void;
  theme: Theme;
  title: string;
}) {
  return (
    <View style={styles.progressReportCardHeader}>
      <Text style={[styles.progressReportCardTitle, { color: theme.text }]}>{title}</Text>
      {onAction && action ? (
        <Pressable accessibilityRole="button" style={styles.progressReportHeaderAction} onPress={onAction}>
          <Text style={[styles.progressReportHeaderActionText, { color: theme.primary }]}>{action}</Text>
          <Ionicons name="chevron-forward" size={16} color={theme.primary} />
        </Pressable>
      ) : date ? (
        <Text style={[styles.progressReportDate, { color: theme.muted }]}>{date}</Text>
      ) : null}
    </View>
  );
}

function SummaryMetric({
  caption,
  icon,
  label,
  theme,
  value
}: {
  caption: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  theme: Theme;
  value: string;
}) {
  return (
    <View style={styles.progressReportSummaryMetric}>
      <View style={[styles.progressReportSummaryIcon, { backgroundColor: theme.secondaryBand }]}>
        <Ionicons name={icon} size={21} color={theme.primary} />
      </View>
      <View style={styles.progressReportSummaryCopy}>
        <Text numberOfLines={1} style={[styles.progressReportMetricLabel, { color: theme.muted }]}>{label}</Text>
        <Text adjustsFontSizeToFit minimumFontScale={0.75} numberOfLines={1} style={[styles.progressReportMetricValue, { color: theme.text }]}>
          {value}
        </Text>
        <Text numberOfLines={2} style={[styles.progressReportMetricCaption, { color: theme.muted }]}>{caption}</Text>
      </View>
    </View>
  );
}

function formatRecordDate(date: Date, language: LanguageCode) {
  return date.toLocaleDateString(language === "pl" ? "pl-PL" : "en-US", {
    day: "numeric",
    month: "short"
  });
}

function getTrendLabels(period: ProgressReportPeriod, starts: Date[], language: LanguageCode) {
  if (period === "12weeks") {
    return starts.map((_, index) => (language === "pl" ? "T" : "W") + String(index + 1));
  }
  if (period === "month") {
    return starts.map((date) => String(date.getDate()));
  }
  const pl = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "So"];
  const en = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const labels = language === "pl" ? pl : en;
  return starts.map((date) => labels[date.getDay()]);
}

export function ProgressReportScreen({
  language,
  onOpenExercise,
  onOpenExerciseList,
  onOpenRecords,
  onOpenWeeklyPlan,
  onOpenWorkout,
  sessions,
  t,
  theme,
  weeklyPlanEnabled,
  weeklyPlanSummary
}: ProgressReportScreenProps) {
  const [period, setPeriod] = useState<ProgressReportPeriod>("month");
  const [trendMetric, setTrendMetric] = useState<ProgressReportTrendMetric>("volume");
  const [referenceDate] = useState(() => new Date());
  const report = useMemo(
    () => buildProgressReport({ period, referenceDate, sessions }),
    [period, referenceDate, sessions]
  );
  const periodOptions: Array<{ label: string; value: ProgressReportPeriod }> = [
    { label: t("progressPeriodWeek"), value: "week" },
    { label: t("progressPeriodMonth"), value: "month" },
    { label: t("progressPeriod12Weeks"), value: "12weeks" }
  ];
  const strengthPercent = formatProgressPercent(report.changes.strengthPercent);
  const volumePercent = formatProgressPercent(report.changes.volumePercent);
  const currentWeekdayIndex = (referenceDate.getDay() + 6) % 7;
  const sortedWeeklyItems = weeklyPlanEnabled ? [...weeklyPlanSummary.items].sort(
    (left, right) => weeklyPlanDays.indexOf(left.day) - weeklyPlanDays.indexOf(right.day) || left.order - right.order
  ) : [];
  const changeInsights = [
    strengthPercent ? {
      icon: "trending-up-outline" as const,
      label: t("progressStrength"),
      value: strengthPercent
    } : null,
    volumePercent ? {
      icon: "server-outline" as const,
      label: t("volume"),
      value: volumePercent
    } : null,
    report.changes.newRecordsCount > 0 ? {
      icon: "trophy-outline" as const,
      label: report.changes.newRecordsCount === 1 ? t("progressNewRecord") : t("progressNewRecords"),
      value: String(report.changes.newRecordsCount)
    } : null
  ].filter((item): item is NonNullable<typeof item> => item !== null).slice(0, 2);

  return (
    <View style={styles.progressReportScreen}>
      <View style={[styles.progressReportPeriodControl, { backgroundColor: theme.segment }]}>
        {periodOptions.map((option) => {
          const selected = option.value === period;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[styles.progressReportPeriodButton, selected ? { backgroundColor: theme.primary } : null]}
              onPress={() => setPeriod(option.value)}
            >
              <Text style={[styles.progressReportPeriodText, { color: selected ? theme.white : theme.text }]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {!report.hasAnyHistory ? (
        <View style={[styles.progressReportEmpty, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.progressReportEmptyIcon, { backgroundColor: theme.secondaryBand }]}>
            <Ionicons name="trending-up-outline" size={28} color={theme.primary} />
          </View>
          <Text style={[styles.progressReportEmptyTitle, { color: theme.text }]}>{t("progressReportEmptyTitle")}</Text>
          <Text style={[styles.progressReportEmptyCopy, { color: theme.muted }]}>{t("progressReportEmptyCopy")}</Text>
        </View>
      ) : (
        <>
          <View style={[styles.progressReportCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <ReportCardTitle
              date={formatReportDateRange(report.currentRange, language)}
              theme={theme}
              title={t("progressSummary")}
            />
            <View style={styles.progressReportSummaryRow}>
              <SummaryMetric
                caption={t("progressCompletedCaption")}
                icon="barbell-outline"
                label={t("workouts")}
                theme={theme}
                value={String(report.summary.workoutCount)}
              />
              <SummaryMetric
                caption={t("progressTrainingTimeCaption")}
                icon="time-outline"
                label={t("progressTime")}
                theme={theme}
                value={formatTrainingDuration(report.summary.totalTrainingSeconds)}
              />
              <SummaryMetric
                caption={t("progressTotalCaption")}
                icon="server-outline"
                label={t("volume")}
                theme={theme}
                value={formatReportVolume(report.summary.totalVolumeKg, language)}
              />
            </View>
          </View>

          <View style={[styles.progressReportCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <ReportCardTitle
              action={t("progressViewMore")}
              onAction={onOpenExerciseList}
              theme={theme}
              title={t("progressKeyChanges")}
            />
            {changeInsights.length ? (
              <View style={styles.progressReportInsights}>
                {changeInsights.map((insight) => (
                  <View key={insight.label} style={[styles.progressReportInsight, { backgroundColor: theme.control }]}>
                    <View style={[styles.progressReportInsightIcon, { backgroundColor: theme.secondaryBand }]}>
                      <Ionicons name={insight.icon} size={23} color={theme.primary} />
                    </View>
                    <View style={styles.progressReportInsightCopy}>
                      <Text style={[styles.progressReportMetricLabel, { color: theme.muted }]}>{insight.label}</Text>
                      <Text style={[styles.progressReportInsightValue, { color: theme.primary }]}>{insight.value}</Text>
                      <Text style={[styles.progressReportMetricCaption, { color: theme.muted }]}>
                        {insight.label === t("progressNewRecord") || insight.label === t("progressNewRecords")
                          ? t("progressGreatWork")
                          : t("progressComparedPrevious")}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.progressReportNoComparison, { color: theme.muted }]}>
                {t("progressNeedsMoreData")}
              </Text>
            )}
          </View>

          {report.summary.workoutCount > 0 ? (
            <View style={[styles.progressReportCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <ReportCardTitle theme={theme} title={t("progressOverallTrend")} />
              <View style={styles.progressReportTrendTabs}>
                {(["volume", "workouts"] as ProgressReportTrendMetric[]).map((metric) => {
                  const selected = metric === trendMetric;
                  return (
                    <Pressable
                      key={metric}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      style={[
                        styles.progressReportTrendTab,
                        { borderColor: selected ? theme.primary : theme.border },
                        selected ? { backgroundColor: theme.secondaryBand } : null
                      ]}
                      onPress={() => setTrendMetric(metric)}
                    >
                      <Text style={[styles.progressReportTrendTabText, { color: selected ? theme.primary : theme.muted }]}>
                        {metric === "volume" ? t("volume") : t("workouts")}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <ProgressLineChart
                buckets={report.trend.buckets}
                labels={getTrendLabels(period, report.trend.buckets.map((bucket) => bucket.start), language)}
                metric={trendMetric}
                theme={theme}
              />
            </View>
          ) : null}

          <View style={[styles.progressReportCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <ReportCardTitle
              action={sortedWeeklyItems.length ? undefined : t("progressOpenWeeklyPlan")}
              date={formatReportDateRange(
                {
                  start: report.period === "week" ? report.currentRange.start : new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate() - currentWeekdayIndex),
                  end: new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate() + 6 - currentWeekdayIndex, 23, 59, 59, 999)
                },
                language
              )}
              onAction={sortedWeeklyItems.length ? undefined : onOpenWeeklyPlan}
              theme={theme}
              title={t("progressThisWeek")}
            />
            {sortedWeeklyItems.length ? (
              <View style={styles.progressReportWeeklyList}>
                {sortedWeeklyItems.map((item) => {
                  const dayIndex = weeklyPlanDays.indexOf(item.day);
                  const status = item.completed
                    ? "completed"
                    : dayIndex < currentWeekdayIndex
                      ? "missed"
                      : "todo";
                  const statusLabel = status === "completed"
                    ? t("progressWeeklyCompleted")
                    : status === "missed"
                      ? t("progressWeeklyMissed")
                      : t("progressWeeklyTodo");
                  return (
                    <Pressable
                      key={item.workoutId + item.day}
                      accessibilityRole="button"
                      style={[styles.progressReportWeeklyRow, { backgroundColor: theme.control }]}
                      onPress={() => onOpenWorkout(item.workoutId)}
                    >
                      <Ionicons
                        name={status === "completed" ? "checkmark-circle" : status === "missed" ? "remove-circle-outline" : "ellipse-outline"}
                        size={23}
                        color={status === "completed" ? theme.primary : theme.muted}
                      />
                      <Text numberOfLines={2} style={[styles.progressReportWeeklyName, { color: theme.text }]}>
                        {item.workout.name}
                      </Text>
                      <Text style={[styles.progressReportWeeklyStatus, { color: theme.muted }]}>{statusLabel}</Text>
                      <Ionicons name="chevron-forward" size={18} color={theme.muted} />
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <Text style={[styles.progressReportNoComparison, { color: theme.muted }]}>
                {t("progressNoWeeklyPlan")}
              </Text>
            )}
          </View>

          <View style={styles.progressReportCompactCards}>
            {report.biggestProgress ? (
              <Pressable
                accessibilityRole="button"
                style={[styles.progressReportCompactCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => onOpenExercise(report.biggestProgress!.exerciseKey)}
              >
                <Ionicons name="stats-chart-outline" size={24} color={theme.primary} />
                <Text style={[styles.progressReportCompactTitle, { color: theme.text }]}>{t("progressBiggestProgress")}</Text>
                <Text numberOfLines={2} style={[styles.progressReportCompactName, { color: theme.text }]}>
                  {getExerciseDisplayName(report.biggestProgress.exerciseName, language)}
                </Text>
                <Text style={[styles.progressReportCompactValue, { color: theme.primary }]}>
                  {formatProgressPercent(report.biggestProgress.percent)}
                </Text>
                <Text style={[styles.progressReportCompactMeta, { color: theme.muted }]}>
                  {"e1RM " + Math.round(report.biggestProgress.previousEstimatedOneRepMaxKg)
                    + " → " + Math.round(report.biggestProgress.currentEstimatedOneRepMaxKg) + " kg"}
                </Text>
              </Pressable>
            ) : null}
            <View style={[styles.progressReportCompactCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="calendar-outline" size={24} color={theme.primary} />
              <Text style={[styles.progressReportCompactTitle, { color: theme.text }]}>{t("progressConsistency")}</Text>
              <Text style={[styles.progressReportCompactValue, { color: theme.primary }]}>
                {String(report.consistency.weekStreak)}
              </Text>
              <Text style={[styles.progressReportCompactMeta, { color: theme.muted }]}>
                {report.consistency.weekStreak === 1 ? t("progressWeekStreak") : t("progressWeeksStreak")}
              </Text>
            </View>
          </View>

          {report.recentRecords.length ? (
            <View style={[styles.progressReportCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <ReportCardTitle
                action={t("progressViewAll")}
                onAction={onOpenRecords}
                theme={theme}
                title={t("progressRecentRecords")}
              />
              <View style={styles.progressReportRecords}>
                {report.recentRecords.map((record, index) => (
                  <Pressable
                    key={record.sessionId + record.exerciseKey}
                    accessibilityRole="button"
                    style={[styles.progressReportRecordRow, { borderTopColor: theme.border }]}
                    onPress={() => onOpenExercise(record.exerciseKey)}
                  >
                    <View style={[styles.progressReportRecordIndex, { backgroundColor: theme.secondaryBand }]}>
                      <Text style={[styles.progressReportRecordIndexText, { color: theme.primary }]}>{index + 1}</Text>
                    </View>
                    <View style={styles.progressReportRecordListCopy}>
                      <Text numberOfLines={2} style={[styles.progressReportRecordName, { color: theme.text }]}>
                        {getExerciseDisplayName(record.exerciseName, language)}
                      </Text>
                      <Text style={[styles.progressReportRecordDate, { color: theme.muted }]}>
                        {formatRecordDate(record.achievedAt, language)}
                      </Text>
                    </View>
                    <Text style={[styles.progressReportRecordValue, { color: theme.text }]}>
                      {Math.round(record.estimatedOneRepMaxKg) + " kg e1RM"}
                    </Text>
                    <Ionicons name="chevron-forward" size={17} color={theme.muted} />
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
        </>
      )}

      <Pressable
        accessibilityRole="button"
        style={[styles.progressReportExerciseLink, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={onOpenExerciseList}
      >
        <View style={[styles.progressReportExerciseLinkIcon, { backgroundColor: theme.secondaryBand }]}>
          <Ionicons name="barbell-outline" size={22} color={theme.primary} />
        </View>
        <View style={styles.progressReportExerciseLinkCopy}>
          <Text style={[styles.progressReportExerciseLinkTitle, { color: theme.text }]}>{t("progressExerciseList")}</Text>
          <Text style={[styles.progressReportExerciseLinkMeta, { color: theme.muted }]}>{t("progressViewAll")}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.primary} />
      </Pressable>
    </View>
  );
}
