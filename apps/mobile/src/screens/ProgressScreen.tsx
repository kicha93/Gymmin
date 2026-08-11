import { Ionicons } from "@expo/vector-icons";
import { Input, InputField } from "@gluestack-ui/themed";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SvgXml } from "react-native-svg";

import { getExerciseDisplayName } from "../domain/exercises";
import {
  formatProgressDashboardVolume,
  formatProgressWorkoutCount,
  getProgressDashboardStats,
  getProgressSparklineValues,
  getSortedProgressItems,
  getSparklinePolylinePoints,
  type ProgressDashboardFilter
} from "../domain/progressDashboard";
import type { ExerciseProgressItem, WorkoutSession, WorkoutSessionEntry } from "../domain/workoutSessions";
import type { LanguageCode, TranslationKey } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

type ProgressScreenProps = {
  language: LanguageCode;
  progressItems: ExerciseProgressItem[];
  sessions: WorkoutSession[];
  t: (key: TranslationKey) => string;
  theme: Theme;
  onOpenExercise: (exerciseKey: string) => void;
};

function formatProgressNumber(value: number | null | undefined, suffix = "") {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }

  const formatted = Number.isInteger(value) ? String(value) : value.toFixed(1).replace(".", ",");
  return suffix ? `${formatted} ${suffix}` : formatted;
}

function formatProgressLatestResult(
  entry: WorkoutSessionEntry,
  language: LanguageCode
) {
  const reps = entry.actualReps ? `${entry.actualReps} ${language === "en" ? "reps" : "powt."}` : "";
  const weight = entry.actualWeight ? `${entry.actualWeight} kg` : "";
  const duration = entry.actualDuration ?? "";
  const values = [reps, weight, duration].filter(Boolean);

  return values.length ? values.join(", ") : "—";
}

function ProgressSparkline({ item, theme }: { item: ExerciseProgressItem; theme: Theme }) {
  const values = getProgressSparklineValues(item);
  const points = getSparklinePolylinePoints(values, 112, 38, 4);

  if (!points) {
    return null;
  }

  const xml = `
    <svg width="112" height="38" viewBox="0 0 112 38" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 32 C28 24 54 32 108 6" stroke="${theme.secondaryBand}" stroke-width="8" fill="none" stroke-linecap="round" opacity="0.8"/>
      <polyline points="${points}" stroke="${theme.primary}" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      ${points.split(" ").map((point) => `<circle cx="${point.split(",")[0]}" cy="${point.split(",")[1]}" r="2.4" fill="${theme.primary}"/>`).join("")}
    </svg>
  `;

  return (
    <View style={styles.progressSparkline}>
      <SvgXml xml={xml} width={112} height={38} />
    </View>
  );
}

function ProgressStatCard({
  caption,
  icon,
  theme,
  title,
  value
}: {
  caption: string;
  icon: keyof typeof Ionicons.glyphMap;
  theme: Theme;
  title: string;
  value: string;
}) {
  return (
    <View style={[styles.progressStatCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[styles.progressStatIcon, { backgroundColor: theme.secondaryBand }]}>
        <Ionicons name={icon} size={22} color={theme.primary} />
      </View>
      <View style={styles.progressStatCopy}>
        <Text style={[styles.progressStatTitle, { color: theme.muted }]}>{title}</Text>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.65}
          numberOfLines={1}
          style={[styles.progressStatValue, { color: theme.text }]}
        >
          {value}
        </Text>
        <Text style={[styles.progressStatCaption, { color: theme.muted }]}>{caption}</Text>
      </View>
    </View>
  );
}

function ProgressMetric({
  icon,
  label,
  theme,
  value
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  theme: Theme;
  value: string;
}) {
  return (
    <View style={styles.progressMetric}>
      <View style={[styles.progressMetricIcon, { backgroundColor: theme.secondaryBand }]}>
        <Ionicons name={icon} size={20} color={theme.primary} />
      </View>
      <View style={styles.progressMetricCopy}>
        <Text style={[styles.progressMetricLabel, { color: theme.muted }]} numberOfLines={1}>{label}</Text>
        <Text style={[styles.progressMetricValue, { color: theme.text }]} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

export function ProgressScreen({
  language,
  onOpenExercise,
  progressItems,
  sessions,
  t,
  theme
}: ProgressScreenProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ProgressDashboardFilter>("all");
  const filteredItems = useMemo(() => {
    const phrase = search.trim().toLowerCase();
    const searchedItems = phrase
      ? progressItems.filter((item) =>
          item.exerciseName.toLowerCase().includes(phrase) || item.exerciseKey.toLowerCase().includes(phrase)
        )
      : progressItems;

    return getSortedProgressItems(searchedItems, filter);
  }, [filter, progressItems, search]);
  const stats = useMemo(() => getProgressDashboardStats(progressItems, sessions), [progressItems, sessions]);
  const filterOptions: Array<{ label: string; value: ProgressDashboardFilter }> = [
    { label: t("progressFilterAll"), value: "all" },
    { label: t("progressFilterStrength"), value: "strength" },
    { label: t("progressFilterVolume"), value: "volume" }
  ];
  const hasAnyProgress = progressItems.length > 0;

  return (
    <View style={styles.historyScreen}>
      <Input style={[styles.searchBox, { backgroundColor: theme.control, borderColor: theme.border }]}>
        <Ionicons name="search" size={20} color={theme.muted} />
        <InputField
          placeholder={t("searchExerciseProgress")}
          placeholderTextColor={theme.muted}
          style={[styles.searchInput, { color: theme.inputText }]}
          value={search}
          onChangeText={setSearch}
        />
      </Input>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.progressStatsRow}>
        <ProgressStatCard
          caption={t("progressTracked")}
          icon="barbell-outline"
          theme={theme}
          title={t("progressExercises")}
          value={String(stats.trackedExercises)}
        />
        <ProgressStatCard
          caption={t("progressBeaten")}
          icon="trophy-outline"
          theme={theme}
          title={t("progressRecords")}
          value={String(stats.beatenRecords)}
        />
        <ProgressStatCard
          caption={t("progressThisMonth")}
          icon="server-outline"
          theme={theme}
          title={t("volume")}
          value={formatProgressDashboardVolume(stats.monthlyVolume, language)}
        />
      </ScrollView>

      <View style={styles.progressFilterRow}>
        {filterOptions.map((option) => {
          const selected = filter === option.value;

          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              style={[
                styles.progressFilterChip,
                {
                  backgroundColor: selected ? theme.primary : theme.card,
                  borderColor: selected ? theme.primary : theme.border
                }
              ]}
              onPress={() => setFilter(option.value)}
            >
              <Text style={[styles.progressFilterChipText, { color: selected ? theme.white : theme.text }]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {filteredItems.length ? (
        <View style={styles.progressExerciseList}>
          {filteredItems.map((item) => (
            <Pressable
              key={item.exerciseKey}
              accessibilityRole="button"
              style={[styles.progressExerciseCard, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => onOpenExercise(item.exerciseKey)}
            >
              <View style={styles.progressExerciseHeader}>
                <View style={styles.progressExerciseTitleBlock}>
                  <Text style={[styles.workoutName, { color: theme.text }]} numberOfLines={2}>
                    {getExerciseDisplayName(item.exerciseName, language)}
                  </Text>
                  <Text style={[styles.workoutMeta, { color: theme.muted }]}>
                    {formatProgressWorkoutCount(item.sessionCount, language)}
                  </Text>
                </View>
                <View style={styles.progressExerciseHeaderRight}>
                  <ProgressSparkline item={item} theme={theme} />
                  <Ionicons name="chevron-forward" size={22} color={theme.muted} />
                </View>
              </View>

              <View style={[styles.progressMetricsRow, { borderTopColor: theme.border }]}>
                <ProgressMetric
                  icon="time-outline"
                  label={t("last")}
                  theme={theme}
                  value={formatProgressLatestResult(item.lastResult.entry, language)}
                />
                <View style={[styles.progressMetricDivider, { backgroundColor: theme.border }]} />
                <ProgressMetric
                  icon="radio-button-on-outline"
                  label={t("bestWeight")}
                  theme={theme}
                  value={formatProgressNumber(item.bestWeight, "kg")}
                />
                <View style={[styles.progressMetricDivider, { backgroundColor: theme.border }]} />
                <ProgressMetric
                  icon="server-outline"
                  label={t("bestVolume")}
                  theme={theme}
                  value={formatProgressNumber(item.bestVolumeSingleEntry, "kg")}
                />
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={[styles.emptyBuilder, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="trending-up-outline" size={26} color={theme.primary} />
          <Text style={[styles.emptyBuilderTitle, { color: theme.text }]}>
            {hasAnyProgress ? t("noProgressSearchResults") : t("emptyProgressTitle")}
          </Text>
          {!hasAnyProgress ? (
            <Text style={[styles.emptyBuilderCopy, { color: theme.muted }]}>{t("emptyProgressCopy")}</Text>
          ) : null}
        </View>
      )}
    </View>
  );
}
