import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { AppButton } from "../components/AppControls";
import { ExerciseSummaryRow } from "../components/WorkoutPresentation";
import { getWorkoutCatalogMatchSummary } from "../domain/workoutAi";
import { formatExerciseSetTarget } from "../domain/workoutExerciseSummary";
import type { WorkoutDraft, WorkoutStep } from "../domain/workouts";
import type { LanguageCode, TranslationKey } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

type WorkoutAiItem = {
  draft: WorkoutDraft;
  id: string;
  name: string;
};

type WorkoutAiProposalScreenProps = {
  language: LanguageCode;
  proposedWorkout: WorkoutAiItem | null;
  sourceWorkout: WorkoutAiItem | null;
  t: (key: TranslationKey) => string;
  theme: Theme;
  onBackToWorkout: () => void;
  onDiscard: () => void;
  onOpenExercise: (step: WorkoutStep) => void;
  onReplaceCurrent: () => void;
  onSaveAsNew: () => void;
};

export function WorkoutAiProposalScreen({
  language,
  onBackToWorkout,
  onDiscard,
  onOpenExercise,
  onReplaceCurrent,
  onSaveAsNew,
  proposedWorkout,
  sourceWorkout,
  t,
  theme
}: WorkoutAiProposalScreenProps) {
  if (!proposedWorkout) {
    return (
      <View style={[styles.emptyBuilder, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Ionicons name="alert-circle-outline" size={26} color={theme.danger} />
        <Text style={[styles.emptyBuilderTitle, { color: theme.text }]}>{t("aiRewriteInvalidFormat")}</Text>
        <AppButton theme={theme} variant="outline" onPress={onBackToWorkout}>
          {t("backToStart")}
        </AppButton>
      </View>
    );
  }

  const matchSummary = getWorkoutCatalogMatchSummary(proposedWorkout.draft);
  const stageGroups = proposedWorkout.draft.steps
    .filter((step) => step.kind === "stage")
    .map((stage) => ({
      stage,
      series: proposedWorkout.draft.steps
        .filter((step) => step.kind === "set" && step.parentStageId === stage.id)
        .map((set) => ({
          set,
          elements: proposedWorkout.draft.steps.filter(
            (step) => step.kind === "exercise" && step.parentSetId === set.id
          )
        }))
    }));

  return (
    <View style={styles.creatorForm}>
      <View style={[styles.creatorPanel, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.panelHeroHeader}>
          <View style={[styles.legalIcon, { backgroundColor: theme.secondaryBand }]}>
            <Ionicons name="sparkles-outline" size={26} color={theme.primary} />
          </View>
          <View style={styles.workoutInfo}>
            <Text style={[styles.creatorPromptTitle, { color: theme.text }]}>{t("aiRewriteProposal")}</Text>
            <Text style={[styles.creatorDescription, { color: theme.muted }]}>
              {sourceWorkout?.name ?? t("workout")} {"\u2192"} {proposedWorkout.name}
            </Text>
          </View>
        </View>

        <View style={[styles.creatorPlanBox, { backgroundColor: theme.secondaryBand, borderColor: theme.border }]}>
          <Text style={[styles.creatorPlanText, { color: theme.text }]}>
            {matchSummary.unmatched ? t("aiRewriteUnmatchedTitle") : t("aiRewriteMatched")}
          </Text>
          {matchSummary.unmatched ? (
            <Text style={[styles.creatorDescription, { color: theme.muted }]}>
              {t("aiRewriteUnmatchedCopy")} {matchSummary.matched}/{matchSummary.total}
            </Text>
          ) : null}
        </View>

        {proposedWorkout.draft.notes ? (
          <Text style={[styles.workoutDetailDescription, { color: theme.muted }]}>
            {proposedWorkout.draft.notes}
          </Text>
        ) : null}

        <View style={styles.workoutDetailStages}>
          {stageGroups.map(({ stage, series }, stageIndex) => (
            <View
              key={stage.id}
              style={[styles.workoutDetailStage, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <Text style={[styles.workoutName, { color: theme.text }]}>
                {stage.label || `${t("stage")} ${stageIndex + 1}`}
              </Text>
              {series.map(({ set, elements }, setIndex) => (
                <View key={set.id} style={[styles.workoutDetailSeriesRow, { borderColor: theme.border }]}>
                  <Text style={[styles.workoutDetailExerciseName, { color: theme.text }]}>
                    {t("set")} {setIndex + 1}
                  </Text>
                  {elements.map((element) => (
                    <ExerciseSummaryRow
                      key={element.id}
                      language={language}
                      step={element}
                      targetText={formatExerciseSetTarget({ ...element, setCount: set.setCount || "1" })}
                      theme={theme}
                      t={t}
                      onPressDetails={() => onOpenExercise(element)}
                      onPressMuscles={() => onOpenExercise(element)}
                    />
                  ))}
                </View>
              ))}
            </View>
          ))}
        </View>

        <AppButton icon="copy-outline" theme={theme} onPress={onSaveAsNew}>
          {t("aiRewriteSaveAsNew")}
        </AppButton>
        <AppButton icon="swap-horizontal-outline" theme={theme} variant="outline" onPress={onReplaceCurrent}>
          {t("aiRewriteReplaceCurrent")}
        </AppButton>
        <AppButton icon="close-outline" theme={theme} variant="outline" onPress={onDiscard}>
          {t("aiRewriteDiscard")}
        </AppButton>
      </View>
    </View>
  );
}
