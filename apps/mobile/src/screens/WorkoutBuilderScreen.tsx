import { Ionicons } from "@expo/vector-icons";
import { Input, InputField } from "@gluestack-ui/themed";
import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { InteractionManager, Pressable, Text, View } from "react-native";

import { AppButton, AppInput, AppTextarea, SelectControl, SuffixedInput } from "../components/AppControls";
import { CollapsiblePanel } from "../components/CollapsiblePanel";
import { ExercisePicker } from "../components/ExercisePicker";
import { ExercisePickerV2 } from "../features/exercisePickerV2/ExercisePickerV2";
import { WorkoutMuscleOverviewContent } from "../components/WorkoutPresentation";
import {
  activeExerciseLibraryTiers,
  findCatalogExerciseBestEffort,
  getCachedExerciseOptionsForStageType,
  getExerciseDisplayName,
  getExerciseSectionsForStageType,
  isExerciseAvailableForStageType
} from "../domain/exercises";
import { groupWorkoutBuilderSteps } from "../domain/workoutEditor";
import type { ExerciseUsageById } from "../domain/exerciseSearch";
import {
  createStep,
  formatWorkoutDuration,
  parseWorkoutDurationSeconds,
  type StageType,
  type WorkoutDraft,
  type WorkoutStep
} from "../domain/workouts";
import {
  getGoalTypeOptions,
  getExerciseElementTypeOptions,
  getStageTypeOptions,
  getStageTypeTranslationKey,
  normalizeSetCountInput
} from "../domain/workoutBuilderConfiguration";
import type { LanguageCode, TranslationKey } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

type WorkoutBuilderProps = {
  defaultSetCount: string;
  defaultStageType: StageType | "";
  defaultWeight: string;
  favoriteExerciseIds: ReadonlySet<string>;
  isEditing: boolean;
  language: LanguageCode;
  moveStep: (stepId: string, direction: -1 | 1) => void;
  onToggleFavoriteExercise: (exerciseId: string) => void;
  removeStep: (stepId: string) => void;
  setWorkout: Dispatch<SetStateAction<WorkoutDraft>>;
  t: (key: TranslationKey) => string;
  theme: Theme;
  updateStep: (stepId: string, nextStep: WorkoutStep) => void;
  workout: WorkoutDraft;
};

type StepConfigurationProps = {
  exerciseUsageById?: ExerciseUsageById;
  favoriteExerciseIds: ReadonlySet<string>;
  language: LanguageCode;
  onToggleFavoriteExercise: (exerciseId: string) => void;
  parentStageType?: StageType | "";
  step: WorkoutStep;
  t: (key: TranslationKey) => string;
  theme: Theme;
  typeLabel: string;
  updateStep: (stepId: string, nextStep: WorkoutStep) => void;
};

const USE_EXERCISE_PICKER_V2 = true;
const emptyExerciseUsageById: ExerciseUsageById = new Map();

type StageConfigurationProps = {
  stage: WorkoutStep;
  t: (key: TranslationKey) => string;
  theme: Theme;
  updateStep: (stepId: string, nextStep: WorkoutStep) => void;
};


type TimeTargetInputProps = {
  onChange: (value: string) => void;
  t: (key: TranslationKey) => string;
  theme: Theme;
  value: string;
};

function TimeTargetInput({ onChange, t, theme, value }: TimeTargetInputProps) {
  const [hours = "", minutes = "", seconds = ""] = value.split(":");

  function updatePart(partIndex: number, partValue: string) {
    const numericValue = partValue.replace(/\D/g, "").slice(0, 2);
    const nextParts = [hours, minutes, seconds];
    nextParts[partIndex] = numericValue;
    onChange(nextParts.join(":"));
  }

  return (
    <View style={styles.timeTargetRow}>
      {[
        { label: t("timeHours"), value: hours },
        { label: t("timeMinutes"), value: minutes },
        { label: t("timeSeconds"), value: seconds }
      ].map((part, index) => (
        <View key={part.label} style={styles.timeTargetPart}>
          <Input
            style={[
              styles.suffixedInput,
              { backgroundColor: theme.control, borderColor: theme.border }
            ]}
          >
            <InputField
              keyboardType="number-pad"
              maxLength={2}
              placeholder="00"
              placeholderTextColor={theme.muted}
              style={[
                styles.timeTargetTextInput,
                { color: theme.inputText }
              ]}
              value={part.value}
              onChangeText={(nextValue) => updatePart(index, nextValue)}
            />
          </Input>
          <Text style={[styles.timeTargetLabel, { color: theme.muted }]}>{part.label}</Text>
        </View>
      ))}
    </View>
  );
}

function RestBetweenSetsInput({ onChange, t, theme, value }: TimeTargetInputProps) {
  const seconds = parseWorkoutDurationSeconds(value) ?? 0;

  return (
    <TimeTargetInput
      t={t}
      theme={theme}
      value={formatWorkoutDuration(seconds)}
      onChange={(duration) => {
        const nextSeconds = parseWorkoutDurationSeconds(duration) ?? 0;
        onChange(nextSeconds > 0 ? String(nextSeconds) : "");
      }}
    />
  );
}

type GoalTargetControlProps = {
  step: WorkoutStep;
  t: (key: TranslationKey) => string;
  theme: Theme;
  updateStep: (stepId: string, nextStep: WorkoutStep) => void;
};

function GoalTargetControl({ step, t, theme, updateStep }: GoalTargetControlProps) {
  if (!step.goalType || step.goalType === "buttonPress") {
    return null;
  }

  if (step.goalType === "time") {
    return (
      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: theme.muted }]}>{t("goal")}</Text>
        <TimeTargetInput
          t={t}
          theme={theme}
          value={step.targetValue}
          onChange={(targetValue) => updateStep(step.id, { ...step, targetValue })}
        />
      </View>
    );
  }

  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.label, { color: theme.muted }]}>{t("goal")}</Text>
      <SuffixedInput
        suffix={t("repetitionsSuffix")}
        theme={theme}
        value={step.targetValue}
        onChangeText={(targetValue) => updateStep(step.id, { ...step, targetValue })}
      />
    </View>
  );
}

export function StageConfiguration({ stage, t, theme, updateStep }: StageConfigurationProps) {
  return (
    <>
      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: theme.muted }]}>{t("stageType")}</Text>
        <SelectControl
          onChange={(stageType) => updateStep(stage.id, { ...stage, stageType })}
          options={getStageTypeOptions(t)}
          placeholder={t("select")}
          theme={theme}
          value={stage.stageType}
        />
      </View>

      <View style={[styles.fieldGroup, styles.stepParagraph]}>
        <Text style={[styles.label, { color: theme.muted }]}>{t("workoutNotes")}</Text>
        <AppTextarea
          placeholder={t("addNotes")}
          theme={theme}
          value={stage.notes}
          onChangeText={(notes) => updateStep(stage.id, { ...stage, notes })}
        />
      </View>
    </>
  );
}

export function StepConfiguration({
  exerciseUsageById = emptyExerciseUsageById,
  favoriteExerciseIds,
  language,
  onToggleFavoriteExercise,
  parentStageType,
  step,
  t,
  theme,
  typeLabel,
  updateStep
}: StepConfigurationProps) {
  const includeSetCount = false;
  const hasSelectedType = Boolean(step.stageType);
  const shouldShowExerciseFields = hasSelectedType && step.stageType !== "rest" && step.stageType !== "warmup";
  const exerciseCatalogStageType =
    step.stageType === "exercise" &&
    (parentStageType === "warmup" || parentStageType === "recovery" || parentStageType === "cooldown")
      ? parentStageType
      : step.stageType;
  const canSelectExercise = shouldShowExerciseFields;

  useEffect(() => {
    if (!shouldShowExerciseFields && (step.exerciseId || step.exerciseName || step.loadKg)) {
      updateStep(step.id, {
        ...step,
        exerciseId: "",
        exerciseName: "",
        loadKg: ""
      });
      return;
    }

    if (step.exerciseName) {
      const catalogExercise = findCatalogExerciseBestEffort(step.exerciseName);
      const isAvailable = Boolean(catalogExercise && isExerciseAvailableForStageType(
        catalogExercise,
        exerciseCatalogStageType,
        activeExerciseLibraryTiers
      ));

      if (catalogExercise && isAvailable) {
        if (step.exerciseId !== catalogExercise.id || step.exerciseName !== catalogExercise.name) {
          updateStep(step.id, {
            ...step,
            exerciseId: catalogExercise.id,
            exerciseName: catalogExercise.name
          });
        }
        return;
      }

      if (!isAvailable) {
        updateStep(step.id, {
          ...step,
          exerciseId: "",
          exerciseName: "",
          loadKg: ""
        });
      }
    }
  }, [exerciseCatalogStageType, shouldShowExerciseFields, step, updateStep]);

  function updateStageType(stageType: StageType | "") {
    if (stageType === "rest" || stageType === "warmup") {
      updateStep(step.id, {
        ...step,
        exerciseId: "",
        exerciseName: "",
        loadKg: "",
        stageType
      });
      return;
    }

    const nextExerciseCatalogStageType =
      stageType === "exercise" &&
      (parentStageType === "warmup" || parentStageType === "recovery" || parentStageType === "cooldown")
        ? parentStageType
        : stageType;
    const currentExercise = step.exerciseName
      ? findCatalogExerciseBestEffort(step.exerciseName)
      : undefined;
    const hasCurrentExercise = Boolean(
      currentExercise && isExerciseAvailableForStageType(
        currentExercise,
        nextExerciseCatalogStageType,
        activeExerciseLibraryTiers
      )
    );

    updateStep(step.id, {
      ...step,
      exerciseId: hasCurrentExercise ? step.exerciseId : "",
      exerciseName: hasCurrentExercise ? step.exerciseName : "",
      loadKg: hasCurrentExercise ? step.loadKg : "",
      stageType
    });
  }

  return (
    <>
      {includeSetCount && (
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.muted }]}>{t("setCount")}</Text>
          <AppInput
            keyboardType="number-pad"
            maxLength={2}
            placeholder="0"
            theme={theme}
            value={step.setCount}
            onChangeText={(setCount) => updateStep(step.id, { ...step, setCount: normalizeSetCountInput(setCount) })}
          />
        </View>
      )}

      <View style={styles.stepParagraph}>
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.muted }]}>{typeLabel}</Text>
          <SelectControl
            onChange={updateStageType}
            options={getExerciseElementTypeOptions(t)}
            placeholder={t("select")}
            theme={theme}
            value={step.stageType}
          />
        </View>

        {shouldShowExerciseFields ? (
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.muted }]}>{t("exercise")}</Text>
            {USE_EXERCISE_PICKER_V2 ? <ExercisePickerV2
              disabled={!hasSelectedType || !canSelectExercise}
              favoriteExerciseIds={favoriteExerciseIds}
              language={language}
              onChange={(exerciseName) => {
                const catalogExercise = findCatalogExerciseBestEffort(exerciseName);
                updateStep(step.id, {
                  ...step,
                  exerciseId: catalogExercise?.id ?? "",
                  exerciseName: catalogExercise?.name ?? exerciseName,
                  loadKg: step.loadKg
                });
              }}
              onToggleFavorite={onToggleFavoriteExercise}
              placeholder={t("select")}
              stageType={exerciseCatalogStageType}
              t={t}
              theme={theme}
              usageById={exerciseUsageById}
              value={step.exerciseName}
            /> : <ExercisePicker
              disabled={!hasSelectedType || !canSelectExercise}
              emptyText={t("exercisePickerEmpty")}
              favoriteExerciseIds={favoriteExerciseIds}
              favoriteFilterAllLabel={t("favoriteExercisesAllFilter")}
              favoriteFilterOnlyLabel={t("favoriteExercisesOnlyFilter")}
              hideAdditionalExercisesLabel={t("exercisePickerHideMore")}
              showMoreExercisesLabel={t("exercisePickerShowMore")}
              tierLabels={{
                variation: t("exercisePickerTierVariation"),
                advanced: t("exercisePickerTierAdvanced"),
                sportSpecific: t("exercisePickerTierSportSpecific"),
                rehab: t("exercisePickerTierRehab")
              }}
              language={language}
              loadingText={t("exercisePickerLoading")}
              muscleFilterAllLabel={t("exerciseMuscleFilterAll")}
              muscleFilterLabel={t("exerciseMuscleFilter")}
              onChange={(exerciseName) => {
                const catalogExercise = findCatalogExerciseBestEffort(exerciseName);
                updateStep(step.id, {
                  ...step,
                  exerciseId: catalogExercise?.id ?? "",
                  exerciseName: catalogExercise?.name ?? exerciseName,
                  loadKg: step.loadKg
                });
              }}
              onToggleFavorite={onToggleFavoriteExercise}
              placeholder={t("select")}
              searchPlaceholder={t("searchExercise")}
              stageType={exerciseCatalogStageType}
              theme={theme}
              title={t("exercisePickerTitle")}
              value={step.exerciseName}
            />}
          </View>
        ) : null}
      </View>

      <View style={shouldShowExerciseFields ? [styles.row, styles.stepParagraph] : [styles.fieldGroup, styles.stepParagraph]}>
        <View style={shouldShowExerciseFields ? styles.goalField : undefined}>
          <Text style={[styles.label, { color: theme.muted }]}>{t("goalType")}</Text>
          <SelectControl
            disabled={!hasSelectedType}
            onChange={(goalType) =>
              updateStep(step.id, {
                ...step,
                goalType,
                targetValue: ""
              })
            }
            options={getGoalTypeOptions(t)}
            placeholder={t("select")}
            theme={theme}
            value={step.goalType}
          />
        </View>
        {shouldShowExerciseFields ? (
          <View style={styles.weightField}>
            <Text style={[styles.label, { color: theme.muted }]}>{t("weight")}</Text>
            <SuffixedInput
              editable={canSelectExercise && Boolean(step.exerciseName)}
              keyboardType="decimal-pad"
              suffix="kg"
              theme={theme}
              value={step.loadKg}
              onChangeText={(loadKg) => updateStep(step.id, { ...step, loadKg })}
            />
          </View>
        ) : null}
      </View>

      <GoalTargetControl step={step} t={t} theme={theme} updateStep={updateStep} />

      {shouldShowExerciseFields ? (
        <View style={[styles.fieldGroup, styles.stepParagraph]}>
          <Text style={[styles.label, { color: theme.muted }]}>{t("restBetweenSets")}</Text>
          <RestBetweenSetsInput
            t={t}
            theme={theme}
            value={step.restSeconds ?? ""}
            onChange={(restSeconds) => updateStep(step.id, { ...step, restSeconds })}
          />
          <Text style={[styles.timeTargetLabel, { color: theme.muted }]}>{t("restBetweenSetsHint")}</Text>
        </View>
      ) : null}

      <View style={[styles.fieldGroup, styles.stepParagraph]}>
        <Text style={[styles.label, { color: theme.muted }]}>{t("workoutNotes")}</Text>
        <AppTextarea
          placeholder={t("addNotes")}
          theme={theme}
          value={step.notes}
          onChangeText={(notes) => updateStep(step.id, { ...step, notes })}
        />
      </View>
    </>
  );
}

export function WorkoutBuilderScreen({
  defaultSetCount,
  defaultStageType,
  defaultWeight,
  favoriteExerciseIds,
  isEditing,
  language,
  moveStep,
  onToggleFavoriteExercise,
  removeStep,
  setWorkout,
  t,
  theme,
  updateStep,
  workout
}: WorkoutBuilderProps) {
  const [collapsedPanels, setCollapsedPanels] = useState<Record<string, boolean>>({});
  const hasConfiguredExercises = workout.steps.some(
    (step) => step.kind === "exercise" && Boolean(step.exerciseName)
  );
  const overviewCollapsed = collapsedPanels["builder-overview"] ?? true;
  const stageGroups = useMemo(() => groupWorkoutBuilderSteps(workout.steps), [workout.steps]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const task = InteractionManager.runAfterInteractions(() => {
      timeoutId = setTimeout(() => {
        getExerciseSectionsForStageType(language, "exercise", "all");
        getCachedExerciseOptionsForStageType(language, "exercise", activeExerciseLibraryTiers);
      }, 600);
    });

    return () => {
      task.cancel();
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, [language]);

  function addSeriesToStage(stageId: string) {
    setWorkout((current) => {
      const stageIndex = current.steps.findIndex((step) => step.id === stageId);

      if (stageIndex < 0) {
        return current;
      }

      const nextStageIndex = current.steps.findIndex(
        (step, index) => index > stageIndex && step.kind === "stage"
      );
      const insertIndex = nextStageIndex === -1 ? current.steps.length : nextStageIndex;
      const nextSteps = [...current.steps];
      nextSteps.splice(insertIndex, 0, createStep({ kind: "set", parentStageId: stageId, setCount: defaultSetCount }));

      return {
        ...current,
        steps: nextSteps
      };
    });
  }

  function addElementToSet(setId: string) {
    setWorkout((current) => {
      const setIndex = current.steps.findIndex((step) => step.id === setId);

      if (setIndex < 0) {
        return current;
      }

      const nextSetIndex = current.steps.findIndex(
        (step, index) => index > setIndex && (step.kind === "set" || step.kind === "stage")
      );
      const insertIndex = nextSetIndex === -1 ? current.steps.length : nextSetIndex;
      const nextSteps = [...current.steps];
      nextSteps.splice(insertIndex, 0, createStep({
        kind: "exercise",
        loadKg: defaultWeight,
        parentSetId: setId,
        stageType: defaultStageType
      }));

      return {
        ...current,
        steps: nextSteps
      };
    });
  }

  function isCollapsed(panelId: string) {
    return collapsedPanels[panelId] ?? false;
  }

  function togglePanel(panelId: string) {
    setCollapsedPanels((current) => ({
      ...current,
      [panelId]: !isCollapsed(panelId)
    }));
  }

  return (
    <View style={styles.builderBlock}>
      <View style={styles.sectionHeader}>
        {!isEditing ? (
          <View>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {t("addNewWorkout")}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: theme.muted }]}>{t("workoutName")}</Text>
        <AppInput
          placeholder={t("workoutNamePlaceholder")}
          theme={theme}
          value={workout.name}
          onChangeText={(name) => setWorkout((current) => ({ ...current, name }))}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: theme.muted }]}>{t("workoutNotes")}</Text>
        <AppTextarea
          placeholder={t("workoutNotesPlaceholder")}
          theme={theme}
          value={workout.notes}
          onChangeText={(notes) => setWorkout((current) => ({ ...current, notes }))}
        />
      </View>

      {hasConfiguredExercises && (
        <CollapsiblePanel
          isCollapsed={overviewCollapsed}
          title={t("overview")}
          theme={theme}
          onToggle={() => togglePanel("builder-overview")}
        >
          <WorkoutMuscleOverviewContent language={language} theme={theme} workout={workout} />
        </CollapsiblePanel>
      )}

      {workout.steps.length === 0 && (
        <View style={[styles.emptyBuilder, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="list-outline" size={26} color={theme.primary} />
          <Text style={[styles.emptyBuilderTitle, { color: theme.text }]}>
            {t("emptyWorkoutBuilderTitle")}
          </Text>
          <Text style={[styles.emptyBuilderCopy, { color: theme.muted }]}>
            {t("emptyWorkoutBuilderCopy")}
          </Text>
        </View>
      )}

      {stageGroups.map(({ stage, series }, index) => {
        const stageCollapsed = isCollapsed(stage.id);
        const stageConfigCollapsed = isCollapsed(`stage-config-${stage.id}`);
        const stageTitle = stage.label.trim() || `${t("stage")} ${index + 1}`;

        return (
          <View
            key={stage.id}
            style={[styles.stepCard, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <View style={styles.stepTopRow}>
              <Pressable
                accessibilityLabel={stageCollapsed ? "Rozwin etap" : "Zwin etap"}
                accessibilityRole="button"
                accessibilityState={{ expanded: !stageCollapsed }}
                style={styles.stepTitleButton}
                onPress={() => togglePanel(stage.id)}
              >
                <Ionicons
                  name={stageCollapsed ? "chevron-forward" : "chevron-down"}
                  size={20}
                  color={theme.primary}
                />
                <View style={styles.stepTitleCopy}>
                  <Text style={[styles.stepTitle, { color: theme.text }]}>{stageTitle}</Text>
                  <Text style={[styles.stepKind, { color: theme.muted }]}>
                    {series.length} {series.length === 1 ? t("set").toLowerCase() : t("setsPlural")}
                  </Text>
                </View>
              </Pressable>
              <View style={styles.stepActions}>
                <Pressable
                  accessibilityLabel="Przenies wyzej"
                  accessibilityRole="button"
                  disabled={index === 0}
                  style={[
                    styles.stepActionButton,
                    {
                      opacity: index === 0 ? 0.35 : 1
                    }
                  ]}
                  onPress={() => moveStep(stage.id, -1)}
                >
                  <Ionicons name="arrow-up" size={19} color={theme.primary} />
                </Pressable>
                <Pressable
                  accessibilityLabel="Przenies nizej"
                  accessibilityRole="button"
                  disabled={index === workout.steps.length - 1}
                  style={[
                    styles.stepActionButton,
                    {
                      opacity: index === stageGroups.length - 1 ? 0.35 : 1
                    }
                  ]}
                  onPress={() => moveStep(stage.id, 1)}
                >
                  <Ionicons name="arrow-down" size={19} color={theme.primary} />
                </Pressable>
                <Pressable
                  accessibilityLabel="Usun element"
                  accessibilityRole="button"
                  style={styles.stepActionButton}
                  onPress={() => removeStep(stage.id)}
                >
                  <Ionicons name="trash-outline" size={20} color={theme.danger} />
                </Pressable>
              </View>
            </View>

            {!stageCollapsed && (
              <>
                <View style={styles.stageNameRow}>
                  <AppInput
                    placeholder={`${t("stage")} ${index + 1}`}
                    style={styles.stageNameInput}
                    theme={theme}
                    value={stage.label}
                    onChangeText={(label) => updateStep(stage.id, { ...stage, label })}
                  />
                  <Pressable
                    accessibilityLabel={
                      stageConfigCollapsed
                        ? "Pokaż konfigurację etapu"
                        : "Ukryj konfigurację etapu"
                    }
                    accessibilityRole="button"
                    accessibilityState={{ expanded: !stageConfigCollapsed }}
                    style={[
                      styles.stageConfigToggle,
                      { backgroundColor: theme.secondaryBand, borderColor: theme.border }
                    ]}
                    onPress={() => togglePanel(`stage-config-${stage.id}`)}
                  >
                    <Ionicons
                      name={stageConfigCollapsed ? "chevron-down" : "chevron-up"}
                      size={22}
                      color={theme.primary}
                    />
                  </Pressable>
                </View>

                {!stageConfigCollapsed && (
                  <StageConfiguration
                    stage={stage}
                    t={t}
                    theme={theme}
                    updateStep={updateStep}
                  />
                )}

                <View style={[styles.seriesBlock, { borderColor: theme.border }]}>
                  <View style={styles.seriesHeader}>
                    <Text style={[styles.seriesTitle, { color: theme.text }]}>{t("setsInStage")}</Text>
                    <AppButton
                      icon="add"
                      style={styles.seriesAddButton}
                      textStyle={styles.seriesAddButtonText}
                      theme={theme}
                      onPress={() => addSeriesToStage(stage.id)}
                    >
                      {t("set")}
                    </AppButton>
                  </View>

                  {series.length === 0 ? (
                    <View style={[styles.emptySeries, { backgroundColor: theme.secondaryBand }]}>
                      <Text style={[styles.emptySeriesText, { color: theme.muted }]}>
                        {t("stageWithoutSeries")}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.seriesList}>
                      {series.map(({ set, elements }, setIndex) => {
                        const seriesCollapsed = isCollapsed(set.id);

                        return (
                          <View
                            key={set.id}
                            style={[
                              styles.seriesCard,
                              { backgroundColor: theme.background, borderColor: theme.border }
                            ]}
                          >
                            <View style={styles.stepTopRow}>
                              <Pressable
                                accessibilityLabel={seriesCollapsed ? "Rozwin serie" : "Zwin serie"}
                                accessibilityRole="button"
                                accessibilityState={{ expanded: !seriesCollapsed }}
                                style={styles.stepTitleButton}
                                onPress={() => togglePanel(set.id)}
                              >
                                <Ionicons
                                  name={seriesCollapsed ? "chevron-forward" : "chevron-down"}
                                  size={20}
                                  color={theme.primary}
                                />
                                <View style={styles.stepTitleCopy}>
                                  <Text style={[styles.stepTitle, { color: theme.text }]}>
                                    {t("set")} {setIndex + 1}
                                  </Text>
                                </View>
                              </Pressable>
                              <View style={styles.stepActions}>
                                <Pressable
                                  accessibilityLabel="Przenies serie wyzej"
                                  accessibilityRole="button"
                                  disabled={setIndex === 0}
                                  style={[
                                    styles.stepActionButton,
                                    { opacity: setIndex === 0 ? 0.35 : 1 }
                                  ]}
                                  onPress={() => moveStep(set.id, -1)}
                                >
                                  <Ionicons name="arrow-up" size={19} color={theme.primary} />
                                </Pressable>
                                <Pressable
                                  accessibilityLabel="Przenies serie nizej"
                                  accessibilityRole="button"
                                  disabled={setIndex === series.length - 1}
                                  style={[
                                    styles.stepActionButton,
                                    { opacity: setIndex === series.length - 1 ? 0.35 : 1 }
                                  ]}
                                  onPress={() => moveStep(set.id, 1)}
                                >
                                  <Ionicons name="arrow-down" size={19} color={theme.primary} />
                                </Pressable>
                                <Pressable
                                  accessibilityLabel="Usun serie"
                                  accessibilityRole="button"
                                  style={styles.stepActionButton}
                                  onPress={() => removeStep(set.id)}
                                >
                                  <Ionicons name="trash-outline" size={20} color={theme.danger} />
                                </Pressable>
                              </View>
                            </View>

                            {!seriesCollapsed && (
                              <View style={styles.seriesContent}>
                                <View style={styles.fieldGroup}>
                                  <Text style={[styles.label, { color: theme.muted }]}>{t("setCount")}</Text>
                                  <AppInput
                                    keyboardType="number-pad"
                                    maxLength={2}
                                    placeholder="0"
                                    theme={theme}
                                    value={set.setCount}
                                    onChangeText={(setCount) => updateStep(set.id, { ...set, setCount: normalizeSetCountInput(setCount) })}
                                  />
                                </View>

                                <View style={[styles.seriesBlock, { borderColor: theme.border }]}>
                                  <View style={styles.seriesHeader}>
                                    <Text style={[styles.seriesTitle, { color: theme.text }]}>
                                    {t("setElements")}
                                    </Text>
                                    <AppButton
                                      icon="add"
                                      style={styles.seriesAddButton}
                                      textStyle={styles.seriesAddButtonText}
                                      theme={theme}
                                      onPress={() => addElementToSet(set.id)}
                                    >
                                      {t("addElement")}
                                    </AppButton>
                                  </View>

                                  {elements.length === 0 ? (
                                    <View style={[styles.emptySeries, { backgroundColor: theme.secondaryBand }]}>
                                      <Text style={[styles.emptySeriesText, { color: theme.muted }]}>
                                        {t("setWithoutElements")}
                                      </Text>
                                    </View>
                                  ) : (
                                    <View style={styles.seriesList}>
                                      {elements.map((element, elementIndex) => {
                                        const elementCollapsed = isCollapsed(element.id);

                                        return (
                                          <View
                                            key={element.id}
                                            style={[
                                              styles.seriesCard,
                                              { backgroundColor: theme.card, borderColor: theme.border }
                                            ]}
                                          >
                                            <View style={styles.stepTopRow}>
                                              <Pressable
                                                accessibilityLabel={elementCollapsed ? "Rozwiń element" : "Zwiń element"}
                                                accessibilityRole="button"
                                                accessibilityState={{ expanded: !elementCollapsed }}
                                                style={styles.stepTitleButton}
                                                onPress={() => togglePanel(element.id)}
                                              >
                                                <Ionicons
                                                  name={elementCollapsed ? "chevron-forward" : "chevron-down"}
                                                  size={20}
                                                  color={theme.primary}
                                                />
                                                <View style={styles.stepTitleCopy}>
                                                  <Text style={[styles.stepTitle, { color: theme.text }]}>
                                                    {element.exerciseName
                                                      ? getExerciseDisplayName(element.exerciseName, language)
                                                      : element.stageType
                                                        ? t(getStageTypeTranslationKey(element.stageType))
                                                      : `${t("addElement")} ${elementIndex + 1}`}
                                                  </Text>
                                                </View>
                                              </Pressable>
                                              <View style={styles.stepActions}>
                                                <Pressable
                                                  accessibilityLabel="Przenieś element wyżej"
                                                  accessibilityRole="button"
                                                  disabled={elementIndex === 0}
                                                  style={[
                                                    styles.stepActionButton,
                                                    { opacity: elementIndex === 0 ? 0.35 : 1 }
                                                  ]}
                                                  onPress={() => moveStep(element.id, -1)}
                                                >
                                                  <Ionicons name="arrow-up" size={19} color={theme.primary} />
                                                </Pressable>
                                                <Pressable
                                                  accessibilityLabel="Przenieś element niżej"
                                                  accessibilityRole="button"
                                                  disabled={elementIndex === elements.length - 1}
                                                  style={[
                                                    styles.stepActionButton,
                                                    { opacity: elementIndex === elements.length - 1 ? 0.35 : 1 }
                                                  ]}
                                                  onPress={() => moveStep(element.id, 1)}
                                                >
                                                  <Ionicons name="arrow-down" size={19} color={theme.primary} />
                                                </Pressable>
                                                <Pressable
                                                  accessibilityLabel="Usuń element"
                                                  accessibilityRole="button"
                                                  style={styles.stepActionButton}
                                                  onPress={() => removeStep(element.id)}
                                                >
                                                  <Ionicons name="trash-outline" size={20} color={theme.danger} />
                                                </Pressable>
                                              </View>
                                            </View>

                                            {!elementCollapsed && (
                                          <StepConfiguration
                                            favoriteExerciseIds={favoriteExerciseIds}
                                            language={language}
                                            onToggleFavoriteExercise={onToggleFavoriteExercise}
                                            parentStageType={stage.stageType}
                                            step={element}
                                            t={t}
                                            theme={theme}
                                            typeLabel={t("type")}
                                            updateStep={updateStep}
                                          />
                                            )}
                                          </View>
                                        );
                                      })}
                                    </View>
                                  )}
                                </View>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              </>
            )}
          </View>
        );
      })}

    </View>
  );
}
