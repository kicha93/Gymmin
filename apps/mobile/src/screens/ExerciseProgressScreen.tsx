import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { getExerciseDisplayName } from "../domain/exercises";
import {
  filterExerciseProgressHistoryGroups,
  formatExerciseProgressMetric,
  formatExerciseProgressSeriesValue,
  formatExerciseProgressSetCount,
  type ExerciseProgressHistoryGroup,
  type ExerciseProgressHistoryRange
} from "../domain/exerciseProgressHistory";
import {
  getWorkoutSessionDisplayName,
  type ExerciseProgressSummary,
  type WorkoutSession
} from "../domain/workoutSessions";
import type { LanguageCode, TranslationKey } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

type ExerciseProgressScreenProps = {
  formatSessionDateTime: (session: WorkoutSession) => string;
  groups: ExerciseProgressHistoryGroup[];
  language: LanguageCode;
  summary: ExerciseProgressSummary | null;
  t: (key: TranslationKey) => string;
  theme: Theme;
};

type OverviewMetric = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
};

const initialVisibleGroupCount = 5;

export function ExerciseProgressScreen({
  formatSessionDateTime,
  groups,
  language,
  summary,
  t,
  theme
}: ExerciseProgressScreenProps) {
  const [historyRange, setHistoryRange] = useState<ExerciseProgressHistoryRange>("all");
  const [visibleGroupCount, setVisibleGroupCount] = useState(initialVisibleGroupCount);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setHistoryRange("all");
    setVisibleGroupCount(initialVisibleGroupCount);
    setExpandedGroups({});
  }, [summary?.exerciseKey]);

  const filteredGroups = useMemo(
    () => filterExerciseProgressHistoryGroups(groups, historyRange),
    [groups, historyRange]
  );
  const visibleGroups = filteredGroups.slice(0, visibleGroupCount);

  if (!summary) {
    return (
      <View style={[styles.emptyBuilder, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.emptyBuilderTitle, { color: theme.text }]}>{t("emptyProgressTitle")}</Text>
      </View>
    );
  }

  const latestGroup = groups[0];
  const overviewMetrics: OverviewMetric[] = [
    {
      icon: "barbell-outline",
      label: t("bestWeight"),
      value: formatExerciseProgressMetric(summary.bestWeight, "kg", language)
    },
    {
      icon: "repeat-outline",
      label: t("mostReps"),
      value: formatExerciseProgressMetric(summary.bestReps, "", language)
    },
    {
      icon: "server-outline",
      label: t("bestVolume"),
      value: formatExerciseProgressMetric(
        summary.totalVolumeBySession[0]?.volume ?? summary.bestVolumeSingleEntry,
        "kg",
        language
      )
    },
    {
      icon: "speedometer-outline",
      label: t("estimatedOneRepMax"),
      value: formatExerciseProgressMetric(summary.estimatedOneRepMax, "kg", language)
    }
  ];
  const rangeOptions: Array<{ label: string; value: ExerciseProgressHistoryRange }> = [
    { label: t("progressHistoryAll"), value: "all" },
    { label: t("progressHistory3Months"), value: "3m" },
    { label: t("progressHistory6Months"), value: "6m" },
    { label: t("progressHistory1Year"), value: "1y" }
  ];

  const toggleGroup = (group: ExerciseProgressHistoryGroup, index: number) => {
    const isExpanded = expandedGroups[group.key] ?? index === 0;
    setExpandedGroups((current) => ({ ...current, [group.key]: !isExpanded }));
  };

  return (
    <View style={styles.historyScreen}>
      <View style={[styles.exerciseProgressOverviewCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.exerciseProgressOverviewTop}>
          <View style={[styles.exerciseProgressOverviewIcon, { backgroundColor: theme.secondaryBand }]}>
            <Ionicons name="barbell-outline" size={26} color={theme.primary} />
          </View>
          <View style={styles.exerciseProgressOverviewTitleBlock}>
            <Text style={[styles.sectionTitle, { color: theme.text }]} numberOfLines={2}>
              {getExerciseDisplayName(summary.exerciseName, language)}
            </Text>
            <Text style={[styles.workoutMeta, { color: theme.muted }]} numberOfLines={2}>
              {latestGroup ? getWorkoutSessionDisplayName(latestGroup.session) : "—"}
            </Text>
          </View>
        </View>

        <View style={[styles.exerciseProgressOverviewMetrics, { borderTopColor: theme.border }]}>
          {overviewMetrics.map((metric) => (
            <View key={metric.label} style={styles.exerciseProgressOverviewMetric}>
              <View style={[styles.exerciseProgressOverviewMetricIcon, { backgroundColor: theme.secondaryBand }]}>
                <Ionicons name={metric.icon} size={18} color={theme.primary} />
              </View>
              <View style={styles.exerciseProgressOverviewMetricCopy}>
                <Text style={[styles.exerciseProgressOverviewMetricLabel, { color: theme.muted }]} numberOfLines={1}>
                  {metric.label}
                </Text>
                <Text style={[styles.exerciseProgressOverviewMetricValue, { color: theme.text }]} numberOfLines={1}>
                  {metric.value}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={[styles.exerciseProgressHistoryPanel, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.exerciseProgressHistoryPanelHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t("resultHistory")}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.exerciseProgressRangeChips}
          >
            {rangeOptions.map((option) => {
              const selected = historyRange === option.value;

              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  style={[
                    styles.exerciseProgressRangeChip,
                    {
                      backgroundColor: selected ? theme.primary : theme.control,
                      borderColor: selected ? theme.primary : theme.border
                    }
                  ]}
                  onPress={() => {
                    setHistoryRange(option.value);
                    setVisibleGroupCount(initialVisibleGroupCount);
                  }}
                >
                  <Text style={[styles.exerciseProgressRangeChipText, { color: selected ? theme.white : theme.text }]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.exerciseProgressHistoryList}>
          {visibleGroups.length ? (
            visibleGroups.map((group, index) => {
              const isExpanded = expandedGroups[group.key] ?? index === 0;

              return (
                <View
                  key={group.key}
                  style={[
                    styles.exerciseProgressHistoryCard,
                    { backgroundColor: theme.card, borderColor: theme.border }
                  ]}
                >
                  <Pressable
                    accessibilityRole="button"
                    style={styles.exerciseProgressHistoryHeader}
                    onPress={() => toggleGroup(group, index)}
                  >
                    <View style={[styles.exerciseProgressHistoryCalendar, { backgroundColor: theme.secondaryBand }]}>
                      <Ionicons name="calendar-outline" size={19} color={theme.primary} />
                    </View>
                    <View style={styles.exerciseProgressHistoryTitleBlock}>
                      <Text style={[styles.exerciseProgressHistoryDate, { color: theme.text }]}>
                        {formatSessionDateTime(group.session)}
                      </Text>
                      <Text style={[styles.exerciseProgressHistoryWorkout, { color: theme.muted }]} numberOfLines={2}>
                        {getWorkoutSessionDisplayName(group.session)}
                      </Text>
                    </View>
                    <View style={styles.exerciseProgressHistoryHeaderRight}>
                      <View
                        style={[
                          styles.exerciseProgressHistoryBadge,
                          { backgroundColor: isExpanded ? theme.primary : theme.secondaryBand }
                        ]}
                      >
                        <Text
                          style={[
                            styles.exerciseProgressHistoryBadgeText,
                            { color: isExpanded ? theme.white : theme.primary }
                          ]}
                        >
                          {formatExerciseProgressSetCount(group.entries.length, language)}
                        </Text>
                      </View>
                      <Ionicons
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        size={19}
                        color={theme.primary}
                      />
                    </View>
                  </Pressable>

                  {isExpanded ? (
                    <View style={[styles.exerciseProgressTable, { borderColor: theme.border }]}>
                      {group.entries.map((result, entryIndex) => {
                        const entry = result.entry;
                        const setNumber = entry.setIteration > 0 ? entry.setIteration : entryIndex + 1;
                        const values = formatExerciseProgressSeriesValue(
                          entry.actualReps,
                          entry.actualWeight,
                          result.volume,
                          language
                        );

                        return (
                          <View
                            key={entry.id}
                            style={[styles.exerciseProgressSeriesRow, { borderBottomColor: theme.border }]}
                          >
                            <View style={[styles.exerciseProgressSetBadge, { backgroundColor: theme.secondaryBand }]}>
                              <Text style={[styles.exerciseProgressSetBadgeText, { color: theme.primary }]}>{setNumber}</Text>
                            </View>
                            <Text style={[styles.exerciseProgressSeriesValue, { color: theme.text }]}>
                              {values.repetitions}
                            </Text>
                            <Text style={[styles.exerciseProgressSeriesValue, { color: theme.text }]}>{values.load}</Text>
                            <Text style={[styles.exerciseProgressSeriesVolume, { color: theme.muted }]}>
                              {values.volume}
                            </Text>
                          </View>
                        );
                      })}
                      <View style={[styles.exerciseProgressTotalRow, { backgroundColor: theme.control }]}>
                        <View style={styles.exerciseProgressTotalLabel}>
                          <Text style={[styles.exerciseProgressTotalText, { color: theme.text }]}>{t("totalVolume")}</Text>
                        </View>
                        <Text style={[styles.exerciseProgressTotalValue, { color: theme.primary }]}>
                          {formatExerciseProgressMetric(group.totalVolume, "kg", language)}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View style={[styles.exerciseProgressHistorySummary, { borderTopColor: theme.border }]}>
                      <View>
                        <Text style={[styles.exerciseProgressHistorySummaryLabel, { color: theme.muted }]}>
                          {t("bestWeight")}
                        </Text>
                        <Text style={[styles.exerciseProgressHistorySummaryValue, { color: theme.text }]}>
                          {formatExerciseProgressMetric(group.bestWeight, "kg", language)}
                        </Text>
                      </View>
                      <View>
                        <Text style={[styles.exerciseProgressHistorySummaryLabel, { color: theme.muted }]}>
                          {t("mostReps")}
                        </Text>
                        <Text style={[styles.exerciseProgressHistorySummaryValue, { color: theme.text }]}>
                          {formatExerciseProgressMetric(group.bestReps, "", language)}
                        </Text>
                      </View>
                      <View>
                        <Text style={[styles.exerciseProgressHistorySummaryLabel, { color: theme.muted }]}>
                          {t("volume")}
                        </Text>
                        <Text style={[styles.exerciseProgressHistorySummaryValue, { color: theme.text }]}>
                          {formatExerciseProgressMetric(group.totalVolume, "kg", language)}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          ) : (
            <Text style={[styles.exerciseProgressHistoryEmpty, { color: theme.muted }]}>
              {t("exerciseHistoryEmpty")}
            </Text>
          )}
        </View>

        {visibleGroups.length < filteredGroups.length ? (
          <Pressable
            accessibilityRole="button"
            style={styles.exerciseProgressOlderButton}
            onPress={() => setVisibleGroupCount((count) => count + initialVisibleGroupCount)}
          >
            <Text style={[styles.exerciseProgressOlderButtonText, { color: theme.primary }]}>
              {t("showOlderResults")}
            </Text>
            <Ionicons name="chevron-down" size={18} color={theme.primary} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
