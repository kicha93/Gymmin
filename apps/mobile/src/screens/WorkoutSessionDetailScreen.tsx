import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import {
  calculateEntryVolume,
  getWorkoutSessionDisplayName,
  type WorkoutSession,
  type WorkoutSessionEntry
} from "../domain/workoutSessions";
import type { TranslationKey } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

type WorkoutSessionDetailScreenProps = {
  formatNumber: (value: number | null | undefined, suffix?: string) => string;
  formatSessionDateTime: (session: WorkoutSession) => string;
  formatSessionDuration: (session: WorkoutSession) => string;
  formatSessionEntryTitle: (entry: WorkoutSessionEntry) => string;
  formatSessionTime: (value?: string) => string;
  getSessionEntryIterationLabel: (entry: WorkoutSessionEntry) => string;
  historyTableMinWidth?: number;
  onDeleteSession: (sessionId: string) => void;
  session: WorkoutSession | null;
  t: (key: TranslationKey) => string;
  theme: Theme;
};

export function WorkoutSessionDetailScreen({
  formatNumber,
  formatSessionDateTime,
  formatSessionDuration,
  formatSessionEntryTitle,
  formatSessionTime,
  getSessionEntryIterationLabel,
  historyTableMinWidth,
  onDeleteSession,
  session,
  t,
  theme
}: WorkoutSessionDetailScreenProps) {
  const groupedSessionEntries = useMemo(() => {
    if (!session) {
      return [];
    }

    return session.entries
      .filter((entry) => entry.type !== "rest" && entry.type !== "warmup")
      .reduce<{ key: string; title: string; entries: WorkoutSessionEntry[] }[]>((groups, entry) => {
        const title = formatSessionEntryTitle(entry);
        const normalizedTitle = title.trim().toLowerCase();
        const key = entry.exerciseId ? `id:${entry.exerciseId}` : `name:${normalizedTitle || entry.id}`;
        const existingGroup = groups.find((group) => group.key === key);

        if (existingGroup) {
          existingGroup.entries.push(entry);
          return groups;
        }

        groups.push({ key, title, entries: [entry] });
        return groups;
      }, []);
  }, [formatSessionEntryTitle, session]);

  if (!session) {
    return (
      <View style={[styles.emptyBuilder, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.emptyBuilderTitle, { color: theme.text }]}>{t("noData")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.historyScreen}>
      <View style={[styles.sessionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.sessionEntryHeader}>
          <View style={styles.workoutInfo}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{getWorkoutSessionDisplayName(session)}</Text>
          </View>
          <Pressable
            accessibilityLabel={t("deleteHistoryEntryTitle")}
            accessibilityRole="button"
            style={[styles.sessionDeleteButton, { borderColor: theme.border }]}
            onPress={() => onDeleteSession(session.id)}
          >
            <Ionicons name="trash-outline" size={18} color={theme.danger} />
          </Pressable>
        </View>
        <Text style={[styles.workoutMeta, { color: theme.muted }]}>{formatSessionDateTime(session)}</Text>
        <Text style={[styles.workoutMeta, { color: theme.muted }]}>
          {t("duration")}: {formatSessionDuration(session)}
        </Text>
        <Text style={[styles.workoutMeta, { color: theme.muted }]}>
          {t("sessionStartedAt")}: {formatSessionTime(session.startedAt)} · {t("sessionFinishedAt")}: {formatSessionTime(session.finishedAt)}
        </Text>
        {session.notes ? (
          <Text style={[styles.workoutDetailNotes, { color: theme.muted }]}>{session.notes}</Text>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        style={styles.workoutSessionDetailTableScroll}
        contentContainerStyle={styles.workoutSessionDetailTableScrollContent}
      >
        <View
          style={[
            styles.workoutSessionDetailTable,
            historyTableMinWidth ? { minWidth: historyTableMinWidth } : null,
            { borderColor: theme.border }
          ]}
        >
          <View
            style={[
              styles.workoutSessionDetailTableHeader,
              { backgroundColor: theme.secondaryBand, borderBottomColor: theme.border }
            ]}
          >
            <View
              style={[
                styles.workoutSessionDetailHeaderCell,
                styles.workoutSessionDetailExerciseCell,
                { borderRightColor: theme.border }
              ]}
            >
              <Text style={[styles.workoutSessionDetailHeaderText, { color: theme.primary }]}>{t("exercise")}</Text>
            </View>
            <View
              style={[
                styles.workoutSessionDetailHeaderCell,
                styles.workoutSessionDetailSetCell,
                { borderRightColor: theme.border }
              ]}
            >
              <Text style={[styles.workoutSessionDetailHeaderText, { color: theme.primary }]}>{t("set")}</Text>
            </View>
            <View style={[styles.workoutSessionDetailRepsHeader, { borderRightColor: theme.border }]}>
              <Text style={[styles.workoutSessionDetailHeaderText, { color: theme.primary }]}>{t("actualReps")}</Text>
              <View style={[styles.workoutSessionDetailRepsSubHeader, { borderTopColor: theme.border }]}>
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.88}
                  numberOfLines={1}
                  style={[
                    styles.workoutSessionDetailHeaderText,
                    styles.workoutSessionDetailRepsCell,
                    { color: theme.primary, borderRightColor: theme.border }
                  ]}
                >
                  {t("repsDone")}
                </Text>
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.88}
                  numberOfLines={1}
                  style={[
                    styles.workoutSessionDetailHeaderText,
                    styles.workoutSessionDetailRepsCell,
                    { color: theme.primary, borderRightWidth: 0 }
                  ]}
                >
                  {t("repsPlanned")}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.workoutSessionDetailHeaderCell,
                styles.workoutSessionDetailWeightCell,
                { borderRightColor: theme.border }
              ]}
            >
              <Text style={[styles.workoutSessionDetailHeaderText, { color: theme.primary }]}>{t("weight")}</Text>
            </View>
            <View
              style={[
                styles.workoutSessionDetailHeaderCell,
                styles.workoutSessionDetailVolumeCell,
                styles.workoutSessionDetailLastHeaderCell
              ]}
            >
              <Text style={[styles.workoutSessionDetailHeaderText, { color: theme.primary }]}>{t("volume")}</Text>
            </View>
          </View>

          {groupedSessionEntries.map((group, groupIndex) => (
            <View
              key={group.key}
              style={[
                styles.workoutSessionDetailExerciseGroup,
                { borderBottomColor: theme.border },
                groupIndex === groupedSessionEntries.length - 1
                  ? styles.workoutSessionDetailExerciseGroupLast
                  : null
              ]}
            >
              <View style={[styles.workoutSessionDetailExerciseCell, { borderRightColor: theme.border }]}>
                <Text style={[styles.workoutDetailTableExerciseName, { color: theme.text }]} numberOfLines={3}>
                  {group.title}
                </Text>
              </View>
              <View style={styles.workoutSessionDetailSetsCell}>
                {group.entries.map((entry, entryIndex) => {
                  const volume = calculateEntryVolume(entry);
                  const plannedReps = entry.plannedTargetType === "repetitions" ? entry.plannedTarget : "";

                  return (
                    <View
                      key={entry.id}
                      style={[
                        styles.workoutSessionDetailSetRow,
                        { borderBottomColor: theme.border },
                        entryIndex === group.entries.length - 1
                          ? styles.workoutSessionDetailSetRowLast
                          : null
                      ]}
                    >
                      <Text
                        style={[
                          styles.workoutDetailTableValue,
                          styles.workoutSessionDetailSetCell,
                          styles.workoutSessionDetailBodyCell,
                          { color: theme.text, borderRightColor: theme.border }
                        ]}
                        numberOfLines={1}
                      >
                        {getSessionEntryIterationLabel(entry)}
                      </Text>
                      <Text
                        style={[
                          styles.workoutDetailTableValue,
                          styles.workoutSessionDetailRepsCell,
                          styles.workoutSessionDetailBodyCell,
                          { color: theme.text, borderRightColor: theme.border }
                        ]}
                        numberOfLines={1}
                      >
                        {entry.actualReps?.trim() || "-"}
                      </Text>
                      <Text
                        style={[
                          styles.workoutDetailTableValue,
                          styles.workoutSessionDetailRepsCell,
                          styles.workoutSessionDetailBodyCell,
                          { color: theme.text, borderRightColor: theme.border }
                        ]}
                        numberOfLines={1}
                      >
                        {plannedReps?.trim() || "-"}
                      </Text>
                      <Text
                        style={[
                          styles.workoutDetailTableValue,
                          styles.workoutSessionDetailWeightCell,
                          styles.workoutSessionDetailBodyCell,
                          { color: theme.text, borderRightColor: theme.border }
                        ]}
                        numberOfLines={1}
                      >
                        {entry.actualWeight?.trim() ? `${entry.actualWeight.trim()} kg` : "-"}
                      </Text>
                      <Text
                        style={[
                          styles.workoutDetailTableValue,
                          styles.workoutSessionDetailVolumeCell,
                          styles.workoutSessionDetailBodyCell,
                          { color: theme.text }
                        ]}
                        numberOfLines={1}
                      >
                        {volume ? formatNumber(volume, "kg") : "-"}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
