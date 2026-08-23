import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { AppButton, AppInput, AppTextarea } from "../components/AppControls";
import { getExerciseDisplayName } from "../domain/exercises";
import {
  formatWorkoutBuilderPreviewTarget,
  getUniqueWorkoutBuilderValidationCodes,
  getWorkoutBuilderStagePreviewRows,
  getWorkoutBuilderSummary,
  getWorkoutBuilderValidationCodesForStage,
  requiresCatalogExercise,
  type WorkoutBuilderValidationCode,
  type WorkoutEditorFocus,
  type WorkoutEditorStep
} from "../domain/workoutBuilderFlow";
import { groupWorkoutBuilderSteps, isWorkoutSeriesSuperset } from "../domain/workoutEditor";
import { normalizeSetCountInput } from "../domain/workoutBuilderConfiguration";
import type { ExerciseUsageById } from "../domain/exerciseSearch";
import {
  createStep,
  formatWorkoutDuration,
  parseWorkoutDurationSeconds,
  type StageType,
  type WorkoutDraft,
  type WorkoutStep
} from "../domain/workouts";
import type { LanguageCode, TranslationKey } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";
import { StageConfiguration, StepConfiguration } from "./WorkoutBuilderScreen";

type Props = {
  confirmDelete: (title: string, message: string, onConfirm: () => void) => void;
  defaultSetCount: string;
  defaultStageType: StageType | "";
  defaultWeight: string;
  favoriteExerciseIds: ReadonlySet<string>;
  exerciseUsageById: ExerciseUsageById;
  language: LanguageCode;
  moveStep: (stepId: string, direction: -1 | 1) => void;
  onSaveWorkout: () => void;
  onToggleFavoriteExercise: (exerciseId: string) => void;
  removeStep: (stepId: string) => void;
  setWorkout: Dispatch<SetStateAction<WorkoutDraft>>;
  t: (key: TranslationKey) => string;
  theme: Theme;
  updateStep: (stepId: string, nextStep: WorkoutStep) => void;
  workout: WorkoutDraft;
};

export function WorkoutBuilderWizardScreen(props: Props) {
  const {
    confirmDelete,
    defaultSetCount,
    defaultStageType,
    defaultWeight,
    exerciseUsageById,
    favoriteExerciseIds,
    language,
    moveStep,
    onSaveWorkout,
    onToggleFavoriteExercise,
    removeStep,
    setWorkout,
    t,
    theme,
    updateStep,
    workout
  } = props;
  const [editorStep, setEditorStep] = useState<WorkoutEditorStep>("details");
  const [focus, setFocus] = useState<WorkoutEditorFocus | null>(null);
  const [exerciseDraft, setExerciseDraft] = useState<WorkoutStep | null>(null);
  const [detailsError, setDetailsError] = useState(false);
  const [exerciseError, setExerciseError] = useState(false);
  const stageGroups = useMemo(() => groupWorkoutBuilderSteps(workout.steps), [workout.steps]);
  const summary = useMemo(() => getWorkoutBuilderSummary(workout), [workout]);
  const validationCodes = useMemo(() => getUniqueWorkoutBuilderValidationCodes(workout), [workout]);
  const activeStage = stageGroups.find((group) => group.stage.id === focus?.stageId) ?? stageGroups[0] ?? null;
  const focusedSetId = focus?.type === "set" || focus?.type === "exercise" ? focus.setId : "";
  const activeSet = activeStage?.series.find((group) => group.set.id === focusedSetId) ?? null;
  const activeStageValidationCodes = useMemo(
    () => activeStage ? getWorkoutBuilderValidationCodesForStage(workout, activeStage.stage.id) : validationCodes.filter((code) => code === "stage-required"),
    [activeStage, validationCodes, workout]
  );

  useEffect(() => {
    if (editorStep !== "stages") return;
    if (stageGroups.length === 0) {
      if (focus) setFocus(null);
      return;
    }
    const stage = stageGroups.find((group) => group.stage.id === focus?.stageId);
    if (!stage) {
      setFocus({ type: "stage", stageId: stageGroups[0].stage.id });
      return;
    }
    if (focus?.type === "set" && !stage.series.some((group) => group.set.id === focus.setId)) {
      setFocus({ type: "stage", stageId: stage.stage.id });
    }
    if (focus?.type === "exercise") {
      const set = stage.series.find((group) => group.set.id === focus.setId);
      const draftMatches = exerciseDraft?.id === focus.itemId;
      if (!set || (!draftMatches && !set.elements.some((element) => element.id === focus.itemId))) {
        setFocus({ type: "stage", stageId: stage.stage.id });
      }
    }
  }, [editorStep, exerciseDraft?.id, focus, stageGroups]);

  function stageName(stage: WorkoutStep, index = stageGroups.findIndex((group) => group.stage.id === stage.id)) {
    return stage.label.trim() || `${t("stage")} ${index + 1}`;
  }

  function counts(stageCount: number, exerciseCount: number) {
    return `${stageCount} ${t("stages").toLowerCase()} · ${exerciseCount} ${t("exercisePlural").toLowerCase()}`;
  }

  function validationMessage(code: WorkoutBuilderValidationCode) {
    const keys: Record<WorkoutBuilderValidationCode, TranslationKey> = {
      "exercise-required": "workoutEditorExerciseRequired",
      "name-required": "workoutEditorNameRequired",
      "nonnegative-values-required": "workoutEditorNonnegative",
      "set-required": "workoutEditorSetRequired",
      "stage-required": "workoutEditorStageRequired"
    };
    return t(keys[code]);
  }

  function showDetails() {
    setEditorStep("details");
    setFocus(null);
    setExerciseDraft(null);
  }

  function showStages() {
    if (!workout.name.trim()) {
      setDetailsError(true);
      return;
    }
    setDetailsError(false);
    setEditorStep("stages");
    setFocus(stageGroups[0] ? { type: "stage", stageId: stageGroups[0].stage.id } : null);
  }

  function showSummary() {
    setEditorStep("summary");
    setExerciseDraft(null);
  }

  function addStage() {
    const stage = createStep({ kind: "stage", stageType: defaultStageType || "exercise" });
    setWorkout((current) => ({ ...current, steps: [...current.steps, stage] }));
    setFocus({ type: "stage", stageId: stage.id });
  }

  function addSet(stageId: string) {
    const set = createStep({ kind: "set", parentStageId: stageId, setCount: defaultSetCount });
    setWorkout((current) => {
      const stageIndex = current.steps.findIndex((step) => step.id === stageId);
      if (stageIndex < 0) return current;
      const nextStageIndex = current.steps.findIndex((step, index) => index > stageIndex && step.kind === "stage");
      const nextSteps = [...current.steps];
      nextSteps.splice(nextStageIndex === -1 ? nextSteps.length : nextStageIndex, 0, set);
      return { ...current, steps: nextSteps };
    });
    setFocus({ type: "set", stageId, setId: set.id });
  }

  function startNewExercise(stageId: string, setId: string) {
    const draft = createStep({
      kind: "exercise",
      loadKg: defaultWeight,
      parentSetId: setId,
      stageType: defaultStageType || "exercise"
    });
    setExerciseDraft(draft);
    setExerciseError(false);
    setFocus({ type: "exercise", stageId, setId, itemId: draft.id });
  }

  function startExerciseEdit(stageId: string, setId: string, element: WorkoutStep) {
    setExerciseDraft({ ...element });
    setExerciseError(false);
    setFocus({ type: "exercise", stageId, setId, itemId: element.id });
  }

  function cancelExercise() {
    if (focus?.type !== "exercise") return;
    setExerciseDraft(null);
    setExerciseError(false);
    setFocus({ type: "set", stageId: focus.stageId, setId: focus.setId });
  }

  function saveExercise() {
    if (!exerciseDraft || focus?.type !== "exercise") return;
    const hasNegativeValue = [
      exerciseDraft.loadKg,
      exerciseDraft.goalType === "time" ? "" : exerciseDraft.targetValue,
      exerciseDraft.restSeconds ?? ""
    ]
      .some((value) => value.trim() !== "" && Number(value.replace(",", ".")) < 0);
    if ((requiresCatalogExercise(exerciseDraft) && !exerciseDraft.exerciseName.trim()) || hasNegativeValue) {
      setExerciseError(true);
      return;
    }
    setWorkout((current) => {
      if (current.steps.some((step) => step.id === exerciseDraft.id)) {
        return { ...current, steps: current.steps.map((step) => step.id === exerciseDraft.id ? exerciseDraft : step) };
      }
      const setIndex = current.steps.findIndex((step) => step.id === focus.setId);
      if (setIndex < 0) return current;
      const boundaryIndex = current.steps.findIndex((step, index) => index > setIndex && (step.kind === "set" || step.kind === "stage"));
      const nextSteps = [...current.steps];
      nextSteps.splice(boundaryIndex === -1 ? nextSteps.length : boundaryIndex, 0, exerciseDraft);
      return { ...current, steps: nextSteps };
    });
    setExerciseDraft(null);
    setFocus({ type: "set", stageId: focus.stageId, setId: focus.setId });
  }

  function confirmRemove(step: WorkoutStep) {
    const key: TranslationKey = step.kind === "stage"
      ? "workoutEditorDeleteStage"
      : step.kind === "set"
        ? "workoutEditorDeleteSet"
        : "workoutEditorDeleteExercise";
    confirmDelete(t(key), t("workoutEditorDeleteCopy"), () => {
      removeStep(step.id);
      if (step.kind === "stage") setFocus(null);
      else if (step.kind === "set" && activeStage) setFocus({ type: "stage", stageId: activeStage.stage.id });
      else if (focus?.type === "exercise") cancelExercise();
    });
  }

  function elementActions(step: WorkoutStep, index: number, total: number) {
    return (
      <View style={styles.workoutEditorElementActions}>
        <Pressable disabled={index === 0} style={{ opacity: index === 0 ? 0.35 : 1 }} onPress={() => moveStep(step.id, -1)}>
          <Ionicons name="arrow-up" size={20} color={theme.primary} />
        </Pressable>
        <Pressable disabled={index === total - 1} style={{ opacity: index === total - 1 ? 0.35 : 1 }} onPress={() => moveStep(step.id, 1)}>
          <Ionicons name="arrow-down" size={20} color={theme.primary} />
        </Pressable>
        <Pressable onPress={() => confirmRemove(step)}><Ionicons name="trash-outline" size={20} color={theme.danger} /></Pressable>
      </View>
    );
  }

  function validationList(codes = validationCodes) {
    if (codes.length === 0) return null;
    return (
      <View style={[styles.workoutEditorValidation, { backgroundColor: theme.secondaryBand }]}>
        {codes.map((code) => (
          <View key={code} style={styles.workoutEditorValidationRow}>
            <Ionicons name="alert-circle-outline" size={18} color={theme.danger} />
            <Text style={[styles.workoutEditorValidationText, { color: theme.danger }]}>{validationMessage(code)}</Text>
          </View>
        ))}
      </View>
    );
  }

  function stepper() {
    const entries: Array<{ id: WorkoutEditorStep; label: string }> = [
      { id: "details", label: t("workoutEditorStepDetails") },
      { id: "stages", label: t("workoutEditorStepStages") },
      { id: "summary", label: t("workoutEditorStepSave") }
    ];
    const activeIndex = entries.findIndex((entry) => entry.id === editorStep);
    return (
      <View style={[styles.workoutEditorStepper, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {entries.map((entry, index) => {
          const active = entry.id === editorStep;
          const complete = index < activeIndex;
          return (
            <Pressable
              key={entry.id}
              disabled={index > activeIndex + 1}
              style={[
                styles.workoutEditorStepperItem,
                { backgroundColor: active ? theme.secondaryBand : theme.card, borderColor: active ? theme.primary : "transparent", opacity: index > activeIndex + 1 ? 0.5 : 1 }
              ]}
              onPress={() => entry.id === "details" ? showDetails() : entry.id === "stages" ? showStages() : showSummary()}
            >
              {complete ? <Ionicons name="checkmark-circle" size={18} color={theme.primary} /> : null}
              <Text style={[styles.workoutEditorStepperText, { color: active || complete ? theme.primary : theme.muted }]}>{entry.label}</Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  function detailsView() {
    return (
      <View style={[styles.workoutEditorCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.workoutEditorCardTitle, { color: theme.text }]}>{t("workoutEditorDetailsTitle")}</Text>
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.muted }]}>{t("workoutName")}</Text>
          <AppTextarea
            autoGrow
            maxHeight={132}
            minHeight={48}
            placeholder={t("workoutEditorNamePlaceholder")}
            theme={theme}
            value={workout.name}
            onChangeText={(name) => {
              setDetailsError(false);
              setWorkout((current) => ({ ...current, name }));
            }}
          />
          {detailsError ? <Text style={[styles.workoutEditorFieldError, { color: theme.danger }]}>{t("workoutEditorNameRequired")}</Text> : null}
        </View>
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.muted }]}>{t("workoutEditorNotesOptional")}</Text>
          <AppTextarea
            autoGrow
            maxHeight={240}
            minHeight={112}
            placeholder={t("workoutEditorNotesPlaceholder")}
            theme={theme}
            value={workout.notes}
            onChangeText={(notes) => setWorkout((current) => ({ ...current, notes }))}
          />
        </View>
      </View>
    );
  }

  function stageTabs() {
    return (
      <View style={styles.workoutEditorStagePicker}>
        <Text style={[styles.label, { color: theme.muted }]}>{t("workoutEditorSelectStage")}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.workoutEditorStageTabs}>
          {stageGroups.map(({ stage }, index) => {
            const selected = activeStage?.stage.id === stage.id;
            return (
              <Pressable key={stage.id} style={[styles.workoutEditorStageTab, { backgroundColor: selected ? theme.primary : theme.card, borderColor: selected ? theme.primary : theme.border }]} onPress={() => setFocus({ type: "stage", stageId: stage.id })}>
                <Text numberOfLines={1} style={[styles.workoutEditorStageTabText, { color: selected ? theme.white : theme.text }]}>{stageName(stage, index)}</Text>
              </Pressable>
            );
          })}
          <Pressable style={[styles.workoutEditorAddStageTab, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={addStage}>
            <Ionicons name="add" size={26} color={theme.primary} />
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  function stageView() {
    if (!activeStage) {
      return (
        <View style={[styles.workoutEditorCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.workoutEditorEmptyText, { color: theme.muted }]}>{t("workoutEditorStageRequired")}</Text>
          <AppButton icon="add" theme={theme} onPress={addStage}>{t("workoutEditorAddStage")}</AppButton>
        </View>
      );
    }
    const stageIndex = stageGroups.findIndex((group) => group.stage.id === activeStage.stage.id);
    const preview = getWorkoutBuilderStagePreviewRows(workout, activeStage.stage.id);
    return (
      <>
        {stageTabs()}
        <View style={[styles.workoutEditorCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.workoutEditorCardHeader}>
            <Text style={[styles.workoutEditorCardTitle, { color: theme.primary }]}>{t("workoutEditorEditing").replace("{name}", stageName(activeStage.stage, stageIndex))}</Text>
            {elementActions(activeStage.stage, stageIndex, stageGroups.length)}
          </View>
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.muted }]}>{t("workoutEditorStageName")}</Text>
            <AppInput placeholder={`${t("stage")} ${stageIndex + 1}`} theme={theme} value={activeStage.stage.label} onChangeText={(label) => updateStep(activeStage.stage.id, { ...activeStage.stage, label })} />
          </View>
          <StageConfiguration stage={activeStage.stage} t={t} theme={theme} updateStep={updateStep} />
          <View style={styles.workoutEditorListSection}>
            <Text style={[styles.workoutEditorSectionTitle, { color: theme.text }]}>{t("workoutEditorSetsInStage")}</Text>
            {activeStage.series.length === 0 ? (
              <Text style={[styles.workoutEditorEmptyText, { color: theme.muted }]}>{t("stageWithoutSeries")}</Text>
            ) : activeStage.series.map(({ set, elements }, index) => (
              <Pressable key={set.id} style={[styles.workoutEditorRow, { borderBottomColor: theme.border }]} onPress={() => setFocus({ type: "set", stageId: activeStage.stage.id, setId: set.id })}>
                <View style={[styles.workoutEditorRowIndex, { backgroundColor: theme.secondaryBand }]}><Text style={[styles.workoutEditorRowIndexText, { color: theme.text }]}>{index + 1}</Text></View>
                <View style={styles.workoutEditorSetExercises}>
                  {isWorkoutSeriesSuperset(elements) ? (
                    <View style={styles.workoutEditorSupersetLabel}>
                      <Ionicons name="link-outline" size={15} color={theme.primary} />
                      <Text style={[styles.workoutEditorSupersetLabelText, { color: theme.primary }]}>{t("superset")}</Text>
                    </View>
                  ) : null}
                  {elements.length === 0 ? (
                    <View style={styles.workoutEditorRowCopy}>
                      <Text style={[styles.workoutEditorRowTitle, { color: theme.text }]}>{t("set")} {index + 1}</Text>
                      <Text style={[styles.workoutEditorRowMeta, { color: theme.muted }]}>{t("workoutEditorNoExercises")}</Text>
                    </View>
                  ) : elements.map((element) => {
                    const target = formatWorkoutBuilderPreviewTarget(element, set.setCount);
                    const elementName = element.exerciseName
                      ? getExerciseDisplayName(element.exerciseName, language)
                      : element.label.trim() || (element.stageType === "warmup" ? t("stageWarmup") : t("elementWithoutExercise"));
                    return (
                      <View key={element.id} style={styles.workoutEditorSetExercise}>
                        <Text style={[styles.workoutEditorRowTitle, { color: theme.text }]}>{elementName}</Text>
                        {target ? <Text style={[styles.workoutEditorRowMeta, { color: theme.muted }]}>{target}</Text> : null}
                      </View>
                    );
                  })}
                </View>
                <Ionicons name="chevron-forward" size={22} color={theme.muted} />
              </Pressable>
            ))}
          </View>
          <AppButton icon="add" variant="outline" theme={theme} onPress={() => addSet(activeStage.stage.id)}>{t("workoutEditorAddSet")}</AppButton>
        </View>
        <View style={[styles.workoutEditorPreview, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.workoutEditorPreviewHeader}><Text style={[styles.workoutEditorSectionTitle, { color: theme.text }]}>{t("workoutEditorQuickPreview")}</Text><Ionicons name="eye-outline" size={20} color={theme.primary} /></View>
          {preview.length === 0
            ? <Text style={[styles.workoutEditorEmptyText, { color: theme.muted }]}>{t("workoutEditorNoExercises")}</Text>
            : preview.map(({ element, target }) => (
              <Text key={element.id} style={[styles.workoutEditorPreviewItem, { color: theme.text }]}>
                {element.exerciseName
                  ? getExerciseDisplayName(element.exerciseName, language)
                  : element.label.trim() || (element.stageType === "warmup" ? t("stageWarmup") : t("elementWithoutExercise"))}
                {target ? ` - ${target}` : ""}
              </Text>
            ))}
        </View>
      </>
    );
  }

  function setView() {
    if (!activeStage || !activeSet || focus?.type !== "set") return stageView();
    const setIndex = activeStage.series.findIndex((group) => group.set.id === activeSet.set.id);
    return (
      <View style={[styles.workoutEditorCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Pressable style={styles.workoutEditorBreadcrumb} onPress={() => setFocus({ type: "stage", stageId: activeStage.stage.id })}><Ionicons name="arrow-back" size={19} color={theme.primary} /><Text style={[styles.workoutEditorBreadcrumbText, { color: theme.primary }]}>{t("workoutEditorBackToStage")}</Text></Pressable>
        <View style={styles.workoutEditorCardHeader}>
          <View style={styles.workoutEditorRowCopy}><Text style={[styles.workoutEditorEyebrow, { color: theme.muted }]}>{stageName(activeStage.stage)} / {t("set")} {setIndex + 1}</Text><Text style={[styles.workoutEditorCardTitle, { color: theme.text }]}>{t("workoutEditorEditing").replace("{name}", `${t("set")} ${setIndex + 1}`)}</Text></View>
          {elementActions(activeSet.set, setIndex, activeStage.series.length)}
        </View>
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.muted }]}>{t("setCount")}</Text>
          <AppInput keyboardType="number-pad" maxLength={2} placeholder="0" theme={theme} value={activeSet.set.setCount} onChangeText={(setCount) => updateStep(activeSet.set.id, { ...activeSet.set, setCount: normalizeSetCountInput(setCount) })} />
        </View>
        <View style={styles.workoutEditorListSection}>
          <View style={styles.workoutEditorSectionHeader}>
            <Text style={[styles.workoutEditorSectionTitle, { color: theme.text }]}>{t("setElements")}</Text>
            {isWorkoutSeriesSuperset(activeSet.elements) ? (
              <View style={styles.workoutEditorSupersetLabel}>
                <Ionicons name="link-outline" size={15} color={theme.primary} />
                <Text style={[styles.workoutEditorSupersetLabelText, { color: theme.primary }]}>{t("superset")}</Text>
              </View>
            ) : null}
          </View>
          {isWorkoutSeriesSuperset(activeSet.elements) ? (
            <Text style={[styles.workoutEditorSupersetHint, { color: theme.muted }]}>
              {t("workoutEditorSupersetHint")}
            </Text>
          ) : null}
          {activeSet.elements.length === 0 ? <Text style={[styles.workoutEditorEmptyText, { color: theme.muted }]}>{t("workoutEditorNoExercises")}</Text> : activeSet.elements.map((element, index) => (
            <Pressable key={element.id} style={[styles.workoutEditorRow, { borderBottomColor: theme.border }]} onPress={() => startExerciseEdit(activeStage.stage.id, activeSet.set.id, element)}>
              <View style={styles.workoutEditorRowCopy}>
                <Text style={[styles.workoutEditorRowTitle, { color: theme.text }]}>
                  {element.exerciseName
                    ? getExerciseDisplayName(element.exerciseName, language)
                    : element.label.trim() || (element.stageType === "warmup" ? t("stageWarmup") : `${t("addElement")} ${index + 1}`)}
                </Text>
                {(() => {
                  const details = [
                    formatWorkoutBuilderPreviewTarget(element, activeSet.set.setCount),
                    element.loadKg ? `${element.loadKg} kg` : "",
                    parseWorkoutDurationSeconds(element.restSeconds)
                      ? `${t("restBetweenSets")}: ${formatWorkoutDuration(parseWorkoutDurationSeconds(element.restSeconds) ?? 0)}`
                      : ""
                  ].filter(Boolean);
                  return details.length
                    ? <Text style={[styles.workoutEditorRowMeta, { color: theme.muted }]}>{details.join(" · ")}</Text>
                    : null;
                })()}
              </View>
              <Ionicons name="chevron-forward" size={22} color={theme.muted} />
            </Pressable>
          ))}
        </View>
      </View>
    );
  }

  function exerciseView() {
    if (!activeStage || !activeSet || focus?.type !== "exercise" || !exerciseDraft) return setView();
    const exerciseIndex = activeSet.elements.findIndex((element) => element.id === exerciseDraft.id);
    return (
      <View style={[styles.workoutEditorCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.workoutEditorCardHeader}>
          <View style={styles.workoutEditorRowCopy}><Text style={[styles.workoutEditorEyebrow, { color: theme.muted }]}>{stageName(activeStage.stage)} / {t("set")} {activeStage.series.findIndex((group) => group.set.id === activeSet.set.id) + 1}</Text><Text style={[styles.workoutEditorCardTitle, { color: theme.text }]}>{t("workoutEditorEditExercise")}</Text></View>
          {exerciseIndex >= 0 ? elementActions(exerciseDraft, exerciseIndex, activeSet.elements.length) : null}
        </View>
        <StepConfiguration
          exerciseUsageById={exerciseUsageById}
          favoriteExerciseIds={favoriteExerciseIds}
          language={language}
          onToggleFavoriteExercise={onToggleFavoriteExercise}
          parentStageType={activeStage.stage.stageType}
          step={exerciseDraft}
          t={t}
          theme={theme}
          typeLabel={t("type")}
          updateStep={(_id, nextStep) => {
            setExerciseError(false);
            setExerciseDraft(nextStep);
          }}
        />
        {exerciseError ? <Text style={[styles.workoutEditorFieldError, { color: theme.danger }]}>{t("workoutEditorExerciseInvalid")}</Text> : null}
      </View>
    );
  }

  function stagesView() {
    return (
      <>
        <View style={[styles.workoutEditorCompactSummary, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.workoutEditorSummaryIcon, { backgroundColor: theme.secondaryBand }]}><Ionicons name="clipboard-outline" size={23} color={theme.primary} /></View>
          <View style={styles.workoutEditorRowCopy}><Text style={[styles.workoutEditorRowTitle, { color: theme.text }]}>{workout.name.trim() || t("addNewWorkout")}</Text><Text style={[styles.workoutEditorRowMeta, { color: theme.muted }]}>{counts(summary.stageCount, summary.exerciseCount)}</Text></View>
        </View>
        {focus?.type === "exercise" ? exerciseView() : focus?.type === "set" ? setView() : stageView()}
        {focus?.type !== "exercise" ? validationList(activeStageValidationCodes) : null}
      </>
    );
  }

  function summaryView() {
    return (
      <View style={[styles.workoutEditorCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.workoutEditorEyebrow, { color: theme.primary }]}>{t("workoutEditorReady")}</Text>
        <Text style={[styles.workoutEditorCardTitle, { color: theme.text }]}>{t("workoutEditorSummaryTitle")}</Text>
        <Text style={[styles.workoutEditorSummaryName, { color: theme.text }]}>{workout.name.trim() || t("addNewWorkout")}</Text>
        {workout.notes.trim() ? <Text style={[styles.workoutEditorSummaryNotes, { color: theme.muted }]}>{workout.notes.trim()}</Text> : null}
        <Text style={[styles.workoutEditorSummaryCounts, { color: theme.primary }]}>{counts(summary.stageCount, summary.exerciseCount)}</Text>
        <View style={styles.workoutEditorSummaryStages}>
          {summary.stages.map((stage, index) => <View key={stage.id} style={[styles.workoutEditorSummaryStage, { borderBottomColor: theme.border }]}><View style={styles.workoutEditorRowCopy}><Text style={[styles.workoutEditorRowTitle, { color: theme.text }]}>{stage.name === `Stage ${index + 1}` ? `${t("stage")} ${index + 1}` : stage.name}</Text><Text style={[styles.workoutEditorRowMeta, { color: theme.muted }]}>{stage.setCount} {t("setsPlural")} · {stage.exerciseCount} {t("exercisePlural").toLowerCase()}</Text></View></View>)}
        </View>
        {validationList()}
      </View>
    );
  }

  function actions() {
    if (editorStep === "details") return <AppButton icon="arrow-forward" theme={theme} onPress={showStages}>{t("next")}</AppButton>;
    if (editorStep === "summary") return <View style={styles.workoutEditorActionRow}><AppButton icon="arrow-back" style={styles.workoutEditorActionButton} variant="outline" theme={theme} onPress={showStages}>{t("back")}</AppButton><AppButton icon="save-outline" style={styles.workoutEditorActionButton} disabled={validationCodes.length > 0} theme={theme} onPress={onSaveWorkout}>{t("saveWorkout")}</AppButton></View>;
    if (focus?.type === "exercise") return <View style={styles.workoutEditorActionRow}><AppButton style={styles.workoutEditorActionButton} variant="outline" theme={theme} onPress={cancelExercise}>{t("cancel")}</AppButton><AppButton icon="save-outline" style={styles.workoutEditorActionButton} theme={theme} onPress={saveExercise}>{t("workoutEditorSaveExercise")}</AppButton></View>;
    if (focus?.type === "set" && activeStage && activeSet) return <View style={styles.workoutEditorActionRow}><AppButton icon="arrow-back" style={styles.workoutEditorActionButton} variant="outline" theme={theme} onPress={() => setFocus({ type: "stage", stageId: activeStage.stage.id })}>{t("workoutEditorBackToStage")}</AppButton><AppButton icon="add" style={styles.workoutEditorActionButton} theme={theme} onPress={() => startNewExercise(activeStage.stage.id, activeSet.set.id)}>{t("workoutEditorAddExercise")}</AppButton></View>;
    return <View style={styles.workoutEditorActionRow}><AppButton icon="arrow-back" style={styles.workoutEditorActionButton} variant="outline" theme={theme} onPress={showDetails}>{t("back")}</AppButton><AppButton icon="arrow-forward" style={styles.workoutEditorActionButton} theme={theme} onPress={showSummary}>{t("next")}</AppButton></View>;
  }

  return (
    <View style={styles.builderBlock}>
      {stepper()}
      {editorStep === "details" ? detailsView() : editorStep === "stages" ? stagesView() : summaryView()}
      <View style={[styles.workoutEditorContextActions, { backgroundColor: theme.background, borderTopColor: theme.border }]}>{actions()}</View>
    </View>
  );
}
