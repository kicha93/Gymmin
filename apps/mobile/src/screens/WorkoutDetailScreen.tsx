import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { AppButton } from "../components/AppControls";
import { CollapsiblePanel } from "../components/CollapsiblePanel";
import { ExerciseSummaryRow, WorkoutMuscleOverviewContent } from "../components/WorkoutPresentation";
import { formatExerciseSetTarget, isRestTargetStep } from "../domain/workoutExerciseSummary";
import type { WorkoutDraft, WorkoutStep } from "../domain/workouts";
import type { WorkoutSession } from "../domain/workoutSessions";
import type { LanguageCode, TranslationKey } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

type WorkoutDetailItem = {
  draft: WorkoutDraft;
  id: string;
  name: string;
};

type WorkoutDetailScreenProps = {
  getExecutionModeLabel: (mode: WorkoutSession["executionMode"]) => string;
  getSessionStatusLabel: (status: WorkoutSession["status"]) => string;
  isAiRewriteCreditBlocked: boolean;
  isAiRewriteOnlineBlocked: boolean;
  isPanelCollapsed: (panelId: string) => boolean;
  language: LanguageCode;
  onAiRewrite: (workoutId: string) => void;
  onDeleteWorkout: (workoutId: string) => void;
  onEditWorkout: (workoutId: string) => void;
  onOpenExercise: (step: WorkoutStep) => void;
  onOpenHistory: (workoutId: string) => void;
  onOpenSession: (sessionId: string) => void;
  onStartWorkout: () => void;
  onTogglePanel: (panelId: string) => void;
  sessions: WorkoutSession[];
  showAiRewriteCreditTooltip: boolean;
  t: (key: TranslationKey) => string;
  theme: Theme;
  workout: WorkoutDetailItem | null;
};

export function WorkoutDetailScreen({
  getExecutionModeLabel,
  getSessionStatusLabel,
  isAiRewriteCreditBlocked,
  isAiRewriteOnlineBlocked,
  isPanelCollapsed,
  language,
  onAiRewrite,
  onDeleteWorkout,
  onEditWorkout,
  onOpenExercise,
  onOpenHistory,
  onOpenSession,
  onStartWorkout,
  onTogglePanel,
  sessions,
  showAiRewriteCreditTooltip,
  t,
  theme,
  workout
}: WorkoutDetailScreenProps) {
  if (!workout) {
    return (
      <View style={[styles.emptyBuilder, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Ionicons name="barbell-outline" size={26} color={theme.primary} />
        <Text style={[styles.emptyBuilderTitle, { color: theme.text }]}>{t("noWorkout")}</Text>
        <Text style={[styles.emptyBuilderCopy, { color: theme.muted }]}>{t("noWorkoutCopy")}</Text>
      </View>
    );
  }

  const stageGroups = workout.draft.steps
    .filter((step) => step.kind === "stage" && step.stageType !== "warmup")
    .map((stage) => ({
      stage,
      series: workout.draft.steps
        .filter((step) => step.kind === "set" && step.parentStageId === stage.id)
        .map((set) => ({
          set,
          elements: workout.draft.steps.filter(
            (step) => step.kind === "exercise" && step.parentSetId === set.id
          )
        }))
    }));
  const isAiRewriteDisabled = isAiRewriteCreditBlocked || isAiRewriteOnlineBlocked;

  return (
    <>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderCopy}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{workout.name}</Text>
        </View>
        <View style={styles.workoutDetailActions}>
          <AppButton
            icon="create-outline"
            style={styles.builderBackButton}
            textStyle={styles.builderBackButtonText}
            theme={theme}
            variant="outline"
            onPress={() => onEditWorkout(workout.id)}
          >
            {t("edit")}
          </AppButton>
          <AppButton
            icon="trash-outline"
            style={[styles.builderBackButton, { borderColor: theme.danger }]}
            textStyle={[styles.builderBackButtonText, { color: theme.danger }]}
            theme={theme}
            variant="outline"
            onPress={() => onDeleteWorkout(workout.id)}
          >
            {t("delete")}
          </AppButton>
        </View>
      </View>

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

      <AppButton icon="play-outline" theme={theme} onPress={onStartWorkout}>
        {t("startWorkout")}
      </AppButton>

      {isAiRewriteCreditBlocked && showAiRewriteCreditTooltip ? (
        <View style={[styles.inlineTooltip, { backgroundColor: theme.secondaryBand, borderColor: theme.border }]}>
          <Text style={[styles.inlineTooltipText, { color: theme.text }]}>{t("aiCreditsInsufficient")}</Text>
        </View>
      ) : null}

      <AppButton
        icon="sparkles-outline"
        style={isAiRewriteDisabled ? styles.disabledActionButton : undefined}
        textStyle={isAiRewriteDisabled ? { color: theme.muted } : undefined}
        theme={theme}
        variant="outline"
        onPress={() => onAiRewrite(workout.id)}
      >
        {t("aiRewriteAction")}
      </AppButton>

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
                              {element.notes ? (
                                <Text style={[styles.workoutDetailNotes, { color: theme.muted }]}>{element.notes}</Text>
                              ) : null}
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
    </>
  );
}
