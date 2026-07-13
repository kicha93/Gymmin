import { Ionicons } from "@expo/vector-icons";
import { Input, InputField } from "@gluestack-ui/themed";
import { Pressable, Text, View } from "react-native";

import {
  calculateSessionVolume,
  getWorkoutSessionDisplayName,
  type WorkoutSession
} from "../domain/workoutSessions";
import type { TranslationKey } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

export type WorkoutHistoryStatusFilter = "all" | "completed" | "active";

type WorkoutHistorySummary = {
  abandonedWorkouts: number;
  completedWorkouts: number;
  totalDurationMs: number;
  workoutsThisMonth: number;
  workoutsThisWeek: number;
};

type WorkoutHistoryScreenProps = {
  filter: WorkoutHistoryStatusFilter;
  formatDurationMs: (durationMs: number | null) => string;
  formatNumber: (value: number | null | undefined, suffix?: string) => string;
  formatSessionDateTime: (session: WorkoutSession) => string;
  formatSessionDuration: (session: WorkoutSession) => string;
  getExecutionModeLabel: (mode: WorkoutSession["executionMode"]) => string;
  getSessionStatusLabel: (status: WorkoutSession["status"]) => string;
  onDeleteSession: (sessionId: string) => void;
  onFilterChange: (filter: WorkoutHistoryStatusFilter) => void;
  onOpenSession: (sessionId: string) => void;
  onSearchChange: (value: string) => void;
  search: string;
  sessions: WorkoutSession[];
  summary: WorkoutHistorySummary;
  t: (key: TranslationKey) => string;
  theme: Theme;
};

function getSessionCompletedCount(session: WorkoutSession) {
  return session.entries.filter((entry) => entry.isCompleted).length;
}

function getSessionExerciseCount(session: WorkoutSession) {
  return new Set(
    session.entries
      .filter((entry) => entry.exerciseName && entry.type !== "rest")
      .map((entry) => entry.exerciseName?.trim().toLowerCase())
  ).size;
}

export function WorkoutHistoryScreen({
  filter,
  formatDurationMs,
  formatNumber,
  formatSessionDateTime,
  formatSessionDuration,
  getExecutionModeLabel,
  getSessionStatusLabel,
  onDeleteSession,
  onFilterChange,
  onOpenSession,
  onSearchChange,
  search,
  sessions,
  summary,
  t,
  theme
}: WorkoutHistoryScreenProps) {
  const filters: Array<{ label: string; value: WorkoutHistoryStatusFilter }> = [
    { label: t("historyAll"), value: "all" },
    { label: t("completedStatus"), value: "completed" },
    { label: t("activeStatus"), value: "active" }
  ];
  const metrics = [
    { label: t("workoutsThisWeek"), value: String(summary.workoutsThisWeek) },
    { label: t("workoutsThisMonth"), value: String(summary.workoutsThisMonth) },
    { label: t("totalTime"), value: formatDurationMs(summary.totalDurationMs || null) },
    { label: t("completedWorkouts"), value: String(summary.completedWorkouts) },
    { label: t("abandonedWorkouts"), value: String(summary.abandonedWorkouts) }
  ];

  return (
    <View style={styles.historyScreen}>
      <View style={[styles.statsPanel, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {metrics.map((metric) => (
          <View key={metric.label} style={styles.statTile}>
            <Text style={[styles.statValue, { color: theme.text }]}>{metric.value}</Text>
            <Text style={[styles.statLabel, { color: theme.muted }]}>{metric.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.segmentedControl}>
        {filters.map((item) => {
          const selected = filter === item.value;

          return (
            <Pressable
              key={item.value}
              accessibilityRole="button"
              style={[
                styles.segmentButton,
                { backgroundColor: selected ? theme.primary : theme.segment }
              ]}
              onPress={() => onFilterChange(item.value)}
            >
              <Text style={[styles.segmentButtonText, { color: selected ? theme.white : theme.text }]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Input style={[styles.searchBox, { backgroundColor: theme.control, borderColor: theme.border }]}>
        <Ionicons name="search" size={20} color={theme.muted} />
        <InputField
          placeholder={t("searchWorkoutHistory")}
          placeholderTextColor={theme.muted}
          style={[styles.searchInput, { color: theme.inputText }]}
          value={search}
          onChangeText={onSearchChange}
        />
      </Input>

      {sessions.length ? (
        <View style={styles.sessionList}>
          {sessions.map((session) => {
            const completedCount = getSessionCompletedCount(session);
            const volume = calculateSessionVolume(session);

            return (
              <Pressable
                key={session.id}
                accessibilityRole="button"
                style={[styles.sessionEntryCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => onOpenSession(session.id)}
              >
                <View style={styles.sessionEntryHeader}>
                  <View style={styles.workoutInfo}>
                    <Text style={[styles.workoutName, { color: theme.text }]}>
                      {getWorkoutSessionDisplayName(session)}
                    </Text>
                    <Text style={[styles.workoutMeta, { color: theme.muted }]}>
                      {formatSessionDateTime(session)}
                    </Text>
                  </View>
                  <View style={styles.sessionEntryActions}>
                    <Pressable
                      accessibilityLabel={t("deleteHistoryEntryTitle")}
                      accessibilityRole="button"
                      style={[styles.sessionDeleteButton, { borderColor: theme.border }]}
                      onPress={(event) => {
                        event.stopPropagation();
                        onDeleteSession(session.id);
                      }}
                    >
                      <Ionicons name="trash-outline" size={18} color={theme.danger} />
                    </Pressable>
                    <Ionicons name="chevron-forward" size={20} color={theme.muted} />
                  </View>
                </View>
                <Text style={[styles.workoutMeta, { color: theme.muted }]}>
                  {getSessionStatusLabel(session.status)} · {getExecutionModeLabel(session.executionMode)}
                </Text>
                <Text style={[styles.workoutMeta, { color: theme.muted }]}>
                  {t("duration")}: {formatSessionDuration(session)}
                </Text>
                <Text style={[styles.workoutMeta, { color: theme.muted }]}>
                  {t("completedItems")}: {completedCount} / {session.entries.length} · {getSessionExerciseCount(session)} {t("exercise").toLowerCase()}
                </Text>
                {volume > 0 ? (
                  <Text style={[styles.workoutMeta, { color: theme.muted }]}>
                    {t("volume")}: {formatNumber(volume, "kg")}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={[styles.emptyBuilder, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="time-outline" size={26} color={theme.primary} />
          <Text style={[styles.emptyBuilderTitle, { color: theme.text }]}>{t("emptyWorkoutHistoryTitle")}</Text>
          <Text style={[styles.emptyBuilderCopy, { color: theme.muted }]}>{t("emptyWorkoutHistoryCopy")}</Text>
        </View>
      )}
    </View>
  );
}
