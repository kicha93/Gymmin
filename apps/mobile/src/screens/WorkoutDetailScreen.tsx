import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Alert, Pressable, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppButton } from "../components/AppControls";
import { CollapsiblePanel } from "../components/CollapsiblePanel";
import { ExerciseSummaryRow, WorkoutMuscleOverviewContent } from "../components/WorkoutPresentation";
import { WorkoutExportSheet } from "../components/WorkoutExportSheet";
import { addDiagnosticEvent } from "../domain/appDiagnostics";
import { groupWorkoutBuilderSteps } from "../domain/workoutEditor";
import {
  exportWorkoutToFile,
  openWorkoutExportFile,
  WorkoutExportCancelledError
} from "../domain/workoutExport/workoutExportFileService";
import type { WorkoutExportFormat } from "../domain/workoutExport/workoutExportTypes";
import { formatExerciseSetTarget, isRestTargetStep } from "../domain/workoutExerciseSummary";
import type { WorkoutDraft, WorkoutStep } from "../domain/workouts";
import type { WorkoutSession } from "../domain/workoutSessions";
import type { LanguageCode, TranslationKey } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

type WorkoutDetailItem = {
  archivedAt?: string | null;
  draft: WorkoutDraft;
  id: string;
  name: string;
};

type WorkoutDetailScreenProps = {
  getExecutionModeLabel: (mode: WorkoutSession["executionMode"]) => string;
  getSessionStatusLabel: (status: WorkoutSession["status"]) => string;
  isPanelCollapsed: (panelId: string) => boolean;
  language: LanguageCode;
  onDeleteWorkout: (workoutId: string) => void;
  onEditWorkout: (workoutId: string) => void;
  onOpenExercise: (step: WorkoutStep) => void;
  onOpenHistory: (workoutId: string) => void;
  onOpenSession: (sessionId: string) => void;
  onSetArchived: (workoutId: string, archived: boolean) => void;
  onStartWorkout: () => void;
  onTogglePanel: (panelId: string) => void;
  sessions: WorkoutSession[];
  t: (key: TranslationKey) => string;
  theme: Theme;
  workout: WorkoutDetailItem | null;
};

export function WorkoutDetailScreen({
  getExecutionModeLabel,
  getSessionStatusLabel,
  isPanelCollapsed,
  language,
  onDeleteWorkout,
  onEditWorkout,
  onOpenExercise,
  onOpenHistory,
  onOpenSession,
  onSetArchived,
  onStartWorkout,
  onTogglePanel,
  sessions,
  t,
  theme,
  workout
}: WorkoutDetailScreenProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [isExportSheetOpen, setIsExportSheetOpen] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<WorkoutExportFormat | null>(null);
  const useCompactHeaderActions = width < 480;
  const stageGroups = useMemo(
    () => workout
      ? groupWorkoutBuilderSteps(workout.draft.steps)
          .filter(({ stage }) => stage.stageType !== "warmup")
      : [],
    [workout?.draft.steps]
  );

  if (!workout) {
    return (
      <View style={[styles.emptyBuilder, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Ionicons name="barbell-outline" size={26} color={theme.primary} />
        <Text style={[styles.emptyBuilderTitle, { color: theme.text }]}>{t("noWorkout")}</Text>
        <Text style={[styles.emptyBuilderCopy, { color: theme.muted }]}>{t("noWorkoutCopy")}</Text>
      </View>
    );
  }

  async function handleExport(format: WorkoutExportFormat) {
    if (!workout || exportingFormat) return;
    setExportingFormat(format);
    try {
      const result = await exportWorkoutToFile({
        format,
        locale: language,
        notificationCopy: {
          openLabel: t("workoutExportOpenFile"),
          title: t("workoutExportDownloadedNotificationTitle")
        },
        workout: workout.draft
      });
      setIsExportSheetOpen(false);
      if (!result.notificationShown) {
        Alert.alert(
          t("workoutExportSavedTitle"),
          `${t("workoutExportSavedDescription")}\n${result.filename}`,
          [
            { style: "cancel", text: t("cancel") },
            {
              onPress: () => {
                void openWorkoutExportFile(result.uri, format).catch((error) => {
                  addDiagnosticEvent({
                    area: "workout",
                    extra: { errorName: error instanceof Error ? error.name : "UnknownError", format },
                    level: "error",
                    message: "workout_export_open_failed",
                    screen: "workoutDetail"
                  });
                  Alert.alert(
                    t("workoutExportOpenFailedTitle"),
                    t("workoutExportOpenFailedDescription")
                  );
                });
              },
              text: t("workoutExportOpenFile")
            }
          ]
        );
      }
    } catch (error) {
      if (error instanceof WorkoutExportCancelledError) return;
      addDiagnosticEvent({
        area: "workout",
        extra: { errorName: error instanceof Error ? error.name : "UnknownError", format },
        level: "error",
        message: "workout_export_failed",
        screen: "workoutDetail"
      });
      Alert.alert(
        t("workoutExportFailedTitle"),
        t("workoutExportFailedDescription")
      );
    } finally {
      setExportingFormat(null);
    }
  }


  return (
    <>
      <View style={[styles.sectionHeader, useCompactHeaderActions ? styles.workoutDetailHeaderCompact : null]}>
        <View style={[styles.sectionHeaderCopy, useCompactHeaderActions ? styles.workoutDetailHeaderCopyCompact : null]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{workout.name}</Text>
        </View>
        {!workout.archivedAt ? (
          <View style={[styles.workoutDetailActions, useCompactHeaderActions ? styles.workoutDetailActionsCompact : null]}>
            <AppButton
              icon="create-outline"
              style={[styles.builderBackButton, styles.workoutDetailActionButton, useCompactHeaderActions ? styles.workoutDetailActionButtonCompact : null]}
              textStyle={styles.builderBackButtonText}
              theme={theme}
              variant="outline"
              onPress={() => onEditWorkout(workout.id)}
            >
              {t("edit")}
            </AppButton>
            <AppButton
              disabled={Boolean(exportingFormat)}
              icon="download-outline"
              style={[styles.builderBackButton, styles.workoutDetailActionButton, useCompactHeaderActions ? styles.workoutDetailActionButtonCompact : null]}
              textStyle={styles.builderBackButtonText}
              theme={theme}
              variant="outline"
              onPress={() => setIsExportSheetOpen(true)}
            >
              {t("workoutExportAction")}
            </AppButton>
          </View>
        ) : null}
      </View>

      <View style={styles.workoutDetailPrimaryActions}>
        <AppButton
          icon={workout.archivedAt ? "arrow-undo-outline" : "archive-outline"}
          style={styles.workoutDetailPrimaryAction}
          theme={theme}
          variant="outline"
          onPress={() => onSetArchived(workout.id, !workout.archivedAt)}
        >
          {t(workout.archivedAt ? "unarchiveWorkout" : "archiveWorkout")}
        </AppButton>
        <AppButton
          icon="trash-outline"
          style={[styles.workoutDetailPrimaryAction, { borderColor: theme.danger }]}
          textStyle={{ color: theme.danger }}
          theme={theme}
          variant="outline"
          onPress={() => onDeleteWorkout(workout.id)}
        >
          {t("delete")}
        </AppButton>
      </View>

      {!workout.archivedAt ? <View style={styles.workoutDetailPrimaryActions}>
        <AppButton
          icon="play-outline"
          style={styles.workoutDetailPrimaryAction}
          textStyle={styles.workoutDetailPrimaryActionText}
          theme={theme}
          onPress={onStartWorkout}
        >
          {t("startWorkout")}
        </AppButton>
      </View> : null}

      {workout.draft.notes ? (
        <CollapsiblePanel
          collapseLabel={t("collapse")}
          expandLabel={t("expand")}
          isCollapsed={isPanelCollapsed("workout-notes")}
          theme={theme}
          title={t("workoutNotes")}
          onToggle={() => onTogglePanel("workout-notes")}
        >
          <Text style={[styles.workoutDetailDescription, { color: theme.muted }]}>{workout.draft.notes}</Text>
        </CollapsiblePanel>
      ) : null}

      <CollapsiblePanel
        collapseLabel={t("collapse")}
        expandLabel={t("expand")}
        isCollapsed={isPanelCollapsed("workout-overview")}
        theme={theme}
        title={t("overview")}
        onToggle={() => onTogglePanel("workout-overview")}
      >
        <WorkoutMuscleOverviewContent language={language} theme={theme} workout={workout.draft} />
      </CollapsiblePanel>

      <View style={styles.workoutDetailStages}>
        {stageGroups.map(({ stage, series }, index) => {
          const exerciseCount = series.reduce(
            (total, item) => total + item.elements.filter((element) => !isRestTargetStep(element)).length,
            0
          );

          return (
            <CollapsiblePanel
              actions={
                <View style={[styles.panelCountBadge, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.panelCountBadgeText, { color: theme.primary }]}>{exerciseCount}</Text>
                </View>
              }
              collapseLabel={t("collapse")}
              expandLabel={t("expand")}
              key={stage.id}
              isCollapsed={isPanelCollapsed(`workout-stage-${stage.id}`)}
              theme={theme}
              title={stage.label || `${t("stage")} ${index + 1}`}
              onToggle={() => onTogglePanel(`workout-stage-${stage.id}`)}
            >
              {stage.notes ? (
                <Text style={[styles.workoutDetailNotes, { color: theme.muted }]}>{stage.notes}</Text>
              ) : null}

              {series.length ? (
                <View style={styles.workoutDetailSeriesList}>
                  {series.map(({ set, elements }, setIndex) => {
                    const headerElement = elements.find((element) => !isRestTargetStep(element)) ?? elements[0];

                    return (
                      <View
                        key={set.id}
                        style={[
                          styles.workoutDetailSeriesRow,
                          { borderColor: theme.border },
                          setIndex === series.length - 1 ? styles.workoutDetailSeriesRowLast : null
                        ]}
                      >
                        <View style={styles.workoutInfo}>
                          {elements.map((element) => (
                            <View key={element.id} style={styles.workoutDetailElementRow}>
                              <ExerciseSummaryRow
                                language={language}
                                pairedTargetText={
                                  isRestTargetStep(element)
                                    ? (() => {
                                      const elementIndex = elements.findIndex((item) => item.id === element.id);
                                      const previousExercise = [...elements]
                                        .slice(0, Math.max(0, elementIndex))
                                        .reverse()
                                        .find((item) => !isRestTargetStep(item));

                                      return previousExercise
                                        ? formatExerciseSetTarget({ ...previousExercise, setCount: set.setCount || "1" })
                                        : undefined;
                                    })()
                                    : undefined
                                }
                                seriesIndex={headerElement?.id === element.id ? setIndex + 1 : undefined}
                                step={element}
                                targetText={formatExerciseSetTarget({ ...element, setCount: set.setCount || "1" })}
                                theme={theme}
                                t={t}
                                onPressDetails={() => onOpenExercise(element)}
                                onPressMuscles={() => onOpenExercise(element)}
                              />
                            </View>
                          ))}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </CollapsiblePanel>
          );
        })}
      </View>

      <CollapsiblePanel
        collapseLabel={t("collapse")}
        expandLabel={t("expand")}
        isCollapsed={isPanelCollapsed("workout-history")}
        theme={theme}
        title={t("workoutHistory")}
        onToggle={() => onTogglePanel("workout-history")}
      >
        {sessions.length ? (
          <View style={styles.sessionHistoryList}>
            {sessions.map((session) => {
              const completedCount = session.entries.filter((entry) => entry.isCompleted).length;
              const durationMs = session.finishedAt
                ? Date.parse(session.finishedAt) - Date.parse(session.startedAt)
                : 0;
              const durationMinutes = durationMs > 0 ? Math.round(durationMs / 60000) : 0;

              return (
                <Pressable
                  key={session.id}
                  accessibilityRole="button"
                  style={[styles.sessionHistoryRow, { borderColor: theme.border }]}
                  onPress={() => onOpenSession(session.id)}
                >
                  <Text style={[styles.workoutName, { color: theme.text }]}>
                    {new Date(session.startedAt).toLocaleDateString()}
                  </Text>
                  <Text style={[styles.workoutMeta, { color: theme.muted }]}>
                    {getSessionStatusLabel(session.status)} · {getExecutionModeLabel(session.executionMode)} · {completedCount}/{session.entries.length}
                    {durationMinutes ? ` · ${durationMinutes} min` : ""}
                  </Text>
                </Pressable>
              );
            })}
            <AppButton
              icon="time-outline"
              theme={theme}
              variant="outline"
              onPress={() => onOpenHistory(workout.id)}
            >
              {t("viewFullHistory")}
            </AppButton>
          </View>
        ) : (
          <Text style={[styles.workoutMeta, { color: theme.muted }]}>{t("empty")}</Text>
        )}
      </CollapsiblePanel>

      <WorkoutExportSheet
        bottomPadding={Math.max(insets.bottom, 24) + 12}
        exportingFormat={exportingFormat}
        isOpen={isExportSheetOpen}
        t={t}
        theme={theme}
        onClose={() => {
          if (!exportingFormat) setIsExportSheetOpen(false);
        }}
        onSelect={(format) => void handleExport(format)}
      />
    </>
  );
}
