import { Ionicons } from "@expo/vector-icons";
import { Input, InputField } from "@gluestack-ui/themed";
import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Pressable, Text, View } from "react-native";

import { AppButton, AppInput, AppTextarea, SelectControl, SuffixedInput } from "../components/AppControls";
import { CollapsiblePanel } from "../components/CollapsiblePanel";
import { ExercisePicker } from "../components/ExercisePicker";
import { WorkoutMuscleOverviewContent } from "../components/WorkoutPresentation";
import {
  activeExerciseLibraryTiers,
  findCatalogExerciseBestEffort,
  getCachedExerciseOptionsForStageType,
  getExerciseDisplayName
} from "../domain/exercises";
import {
  createStep,
  type GoalType,
  type StageType,
  type TargetComparator,
  type WorkoutDraft,
  type WorkoutStep
} from "../domain/workouts";
import type { LanguageCode, TranslationKey } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

const stageTypeValues: StageType[] = ["warmup", "exercise", "recovery", "rest", "cooldown", "other"];
const goalTypeValues: GoalType[] = ["repetitions", "time", "buttonPress", "calories", "heartRate"];
const targetComparatorValues: TargetComparator[] = ["below", "above"];

const stageTypeTranslationKeys: Record<StageType, TranslationKey> = {
  cooldown: "stageCooldown",
  exercise: "stageExercise",
  other: "stageOther",
  recovery: "stageRecovery",
  rest: "stageRest",
  warmup: "stageWarmup"
};

const goalTypeTranslationKeys: Record<GoalType, TranslationKey> = {
  buttonPress: "goalButtonPress",
  calories: "goalCalories",
  heartRate: "goalHeartRate",
  repetitions: "goalRepetitions",
  time: "goalTime"
};

const targetComparatorTranslationKeys: Record<TargetComparator, TranslationKey> = {
  above: "targetAbove",
  below: "targetBelow"
};

function getStageTypeOptions(t: (key: TranslationKey) => string) {
  return stageTypeValues.map((value) => ({ label: t(stageTypeTranslationKeys[value]), value }));
}

function getGoalTypeOptions(t: (key: TranslationKey) => string) {
  return goalTypeValues.map((value) => ({ label: t(goalTypeTranslationKeys[value]), value }));
}

function getTargetComparatorOptions(t: (key: TranslationKey) => string) {
  return targetComparatorValues.map((value) => ({ label: t(targetComparatorTranslationKeys[value]), value }));
}

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

  if (step.goalType === "heartRate") {
    return (
      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: theme.muted }]}>{t("goal")}</Text>
        <View style={styles.heartRateTargetRow}>
          <View style={styles.heartRateComparatorField}>
            <SelectControl
              onChange={(targetComparator) =>
                updateStep(step.id, { ...step, targetComparator })
              }
              options={getTargetComparatorOptions(t)}
              placeholder={t("select")}
              theme={theme}
              value={step.targetComparator}
            />
          </View>
          <View style={styles.heartRateValueField}>
            <SuffixedInput
              suffix="bpm"
              theme={theme}
              value={step.targetValue}
              onChangeText={(targetValue) => updateStep(step.id, { ...step, targetValue })}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.label, { color: theme.muted }]}>{t("goal")}</Text>
      <SuffixedInput
        suffix={step.goalType === "calories" ? t("caloriesSuffix") : t("repetitionsSuffix")}
        theme={theme}
        value={step.targetValue}
        onChangeText={(targetValue) => updateStep(step.id, { ...step, targetValue })}
      />
    </View>
  );
}

function StageConfiguration({ stage, t, theme, updateStep }: StageConfigurationProps) {
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

function normalizeSetCountInput(value: string) {
  const numericValue = value.replace(/\D/g, "").slice(0, 2);

  if (!numericValue) {
    return "";
  }

  return String(Math.min(Number(numericValue), 20));
}

function StepConfiguration({
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
  const shouldShowExerciseFields = step.stageType !== "rest" && step.stageType !== "warmup";
  const exerciseCatalogStageType =
    step.stageType === "exercise" &&
    (parentStageType === "warmup" || parentStageType === "recovery" || parentStageType === "cooldown")
      ? parentStageType
      : step.stageType;
  const filteredExerciseOptions = useMemo(
    () => shouldShowExerciseFields ? getCachedExerciseOptionsForStageType(language, exerciseCatalogStageType, activeExerciseLibraryTiers) : [],
    [exerciseCatalogStageType, language, shouldShowExerciseFields]
  );
  const filteredExerciseOptionByValue = useMemo(
    () => new Map(filteredExerciseOptions.map((option) => [option.value, option])),
    [filteredExerciseOptions]
  );
  const canSelectExercise = filteredExerciseOptions.length > 0;
  const hasSelectedType = Boolean(step.stageType);

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

    if (step.exerciseName && filteredExerciseOptionByValue.has(step.exerciseName)) {
      const catalogExercise = findCatalogExerciseBestEffort(step.exerciseName);

      if (catalogExercise && step.exerciseId !== catalogExercise.id) {
        updateStep(step.id, {
          ...step,
          exerciseId: catalogExercise.id,
          exerciseName: catalogExercise.name
        });
      }
      return;
    }

    if (step.exerciseName && !filteredExerciseOptionByValue.has(step.exerciseName)) {
      const canonicalExercise = findCatalogExerciseBestEffort(step.exerciseName);
      const canonicalExerciseName = canonicalExercise?.name;

      if (canonicalExerciseName && filteredExerciseOptionByValue.has(canonicalExerciseName)) {
        updateStep(step.id, {
          ...step,
          exerciseId: canonicalExercise?.id ?? "",
          exerciseName: canonicalExerciseName
        });
        return;
      }

      updateStep(step.id, {
        ...step,
        exerciseId: "",
        exerciseName: "",
        loadKg: ""
      });
    }
  }, [filteredExerciseOptionByValue, shouldShowExerciseFields, step, updateStep]);

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
    const nextOptions = getCachedExerciseOptionsForStageType(language, nextExerciseCatalogStageType, activeExerciseLibraryTiers);
    const hasCurrentExercise = nextOptions.some((option) => option.value === step.exerciseName);

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
            options={getStageTypeOptions(t)}
            placeholder={t("select")}
            theme={theme}
            value={step.stageType}
          />
        </View>

        {shouldShowExerciseFields ? (
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.muted }]}>{t("exercise")}</Text>
            <ExercisePicker
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
              optionByValue={filteredExerciseOptionByValue}
              options={filteredExerciseOptions}
              placeholder={t("select")}
              searchPlaceholder={t("searchExercise")}
              stageType={exerciseCatalogStageType}
              theme={theme}
              title={t("exercisePickerTitle")}
              value={step.exerciseName}
            />
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
                targetComparator: "",
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
  const stageGroups = workout.steps
    .filter((step) => step.kind === "stage")
    .map((stage) => ({
      stage,
      series: workout.steps
        .filter((step) => step.kind === "set" && step.parentStageId === stage.id)
        .map((set) => ({
          set,
          elements: workout.steps.filter((step) => step.kind === "exercise" && step.parentSetId === set.id)
        }))
    }));

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
                                                        ? t(stageTypeTranslationKeys[element.stageType])
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
