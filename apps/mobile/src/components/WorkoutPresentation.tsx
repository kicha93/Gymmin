import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { SvgXml } from "react-native-svg";

import {
  backBodyRegionMap,
  backBodySvg,
  frontBodyRegionMap,
  frontBodySvg
} from "../domain/bodyMaps";
import {
  findExerciseById,
  findExerciseByName,
  getExerciseDisplayName,
  muscleKeys,
  type InfluenceScore,
  type MuscleKey
} from "../domain/exercises";
import { getMuscleImpactColor, MuscleImpactLegend } from "./MuscleImpactPresentation";
import { getExerciseTargetDisplay, isRestTargetStep } from "../domain/workoutExerciseSummary";
import {
  formatWorkoutDuration,
  parseWorkoutDurationSeconds,
  type StageType,
  type WorkoutDraft,
  type WorkoutStep
} from "../domain/workouts";
import { translate, type LanguageCode, type TranslationKey } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

export type MuscleUsage = Record<MuscleKey, InfluenceScore>;

const stageTypeTranslationKeys: Record<StageType, TranslationKey> = {
  cooldown: "stageCooldown",
  exercise: "stageExercise",
  other: "stageOther",
  recovery: "stageRecovery",
  rest: "stageRest",
  warmup: "stageWarmup"
};

function getWorkoutMuscleUsage(workout: WorkoutDraft): MuscleUsage {
  const usage = Object.fromEntries(muscleKeys.map((muscle) => [muscle, 0])) as MuscleUsage;

  workout.steps.forEach((step) => {
    if (step.kind !== "exercise") {
      return;
    }

    const exercise = step.exerciseId
      ? findExerciseById(step.exerciseId) ?? (step.exerciseName ? findExerciseByName(step.exerciseName) : undefined)
      : step.exerciseName
        ? findExerciseByName(step.exerciseName)
        : undefined;

    if (!exercise) {
      return;
    }

    muscleKeys.forEach((muscle) => {
      usage[muscle] = Math.max(usage[muscle], exercise.muscleImpact[muscle]) as InfluenceScore;
    });
  });

  return usage;
}

type WorkoutMuscleOverviewProps = {
  language: LanguageCode;
  theme: Theme;
  workout: WorkoutDraft;
};

export function WorkoutMuscleOverviewContent({ language, theme, workout }: WorkoutMuscleOverviewProps) {
  const usage = useMemo(() => getWorkoutMuscleUsage(workout), [workout]);

  function fill(muscle: MuscleKey) {
    return getMuscleImpactColor(usage[muscle]);
  }

  return (
    <>
      <View style={styles.muscleOverviewFigures}>
        <HumanMuscleFigure fill={fill} side="front" />
        <HumanMuscleFigure fill={fill} side="back" />
      </View>
      <MuscleImpactLegend impact={usage} t={(key) => translate(language, key)} theme={theme} />
    </>
  );
}

type ExerciseSummaryRowProps = {
  hideTitle?: boolean;
  language: LanguageCode;
  onPressDetails: () => void;
  onPressMuscles: () => void;
  pairedTargetText?: string;
  seriesIndex?: number;
  step: WorkoutStep;
  t: (key: TranslationKey) => string;
  targetText: string;
  theme: Theme;
};

export function ExerciseSummaryRow({
  hideTitle = false,
  language,
  onPressDetails,
  onPressMuscles,
  pairedTargetText,
  seriesIndex,
  step,
  t,
  targetText,
  theme
}: ExerciseSummaryRowProps) {
  const isRestTarget = isRestTargetStep(step);
  const target = isRestTarget ? targetText : "";
  const [sets, exerciseTarget] = targetText.split(" x ");
  const [pairedSets, pairedTarget] = pairedTargetText ? pairedTargetText.split(" x ") : ["", ""];
  const rawExerciseName = typeof step.exerciseName === "string" ? step.exerciseName : "";
  const rawExerciseId = typeof step.exerciseId === "string" ? step.exerciseId : "";
  const exerciseName = rawExerciseName
    ? getExerciseDisplayName(rawExerciseName, language)
    : step.stageType
      ? t(stageTypeTranslationKeys[step.stageType])
      : t("elementWithoutExercise");
  const restSeconds = parseWorkoutDurationSeconds(step.restSeconds);
  const restText = restSeconds
    ? getExerciseTargetDisplay({ goalType: "time", targetValue: formatWorkoutDuration(restSeconds) })
    : "-";
  const meta = step.loadKg ? `${step.loadKg} kg` : "";
  const canShowMuscleButton = Boolean(rawExerciseId.trim() || rawExerciseName.trim());

  if (isRestTarget) {
    return (
      <Pressable accessibilityRole="button" style={styles.exerciseSummaryContainer} onPress={onPressDetails}>
        <View style={styles.exerciseSummaryRow}>
          <View style={styles.exerciseSummaryRestCopy}>
            <Text style={[styles.workoutDetailExerciseName, { color: theme.text }]} numberOfLines={2}>
              {exerciseName}
            </Text>
            <View style={[styles.exerciseSummaryTile, styles.exerciseSummarySingleTile, { backgroundColor: theme.secondaryBand }]}>
              <Text style={[styles.exerciseSummaryTileText, { color: theme.primary }]}>{target || "-"}</Text>
            </View>
          </View>
          {pairedTargetText ? (
            <View style={styles.exerciseSummaryTiles} accessibilityLabel={`${pairedSets || "-"} x ${pairedTarget || "-"}`}>
              <View style={[styles.exerciseSummaryTile, { backgroundColor: theme.secondaryBand }]}>
                <Text style={[styles.exerciseSummaryTileText, { color: theme.primary }]}>{pairedSets || "-"}</Text>
              </View>
              <Text style={[styles.exerciseSummaryTimes, { color: theme.muted }]}>x</Text>
              <View style={[styles.exerciseSummaryTile, { backgroundColor: theme.secondaryBand }]}>
                <Text style={[styles.exerciseSummaryTileText, { color: theme.primary }]}>{pairedTarget || "-"}</Text>
              </View>
            </View>
          ) : null}
        </View>
        {step.notes ? (
          <Text style={[styles.workoutDetailNotes, { color: theme.muted }]}>{step.notes}</Text>
        ) : null}
      </Pressable>
    );
  }

  return (
    <Pressable accessibilityRole="button" style={styles.exerciseSummaryContainer} onPress={onPressDetails}>
      <View style={styles.exerciseSummaryRow}>
        <View style={styles.exerciseSummaryCopy}>
          {hideTitle ? null : (
            <View style={styles.exerciseSummaryTitleRow}>
              {typeof seriesIndex === "number" ? (
                <View style={[styles.workoutDetailSeriesBadge, { backgroundColor: theme.secondaryBand }]}>
                  <Text style={[styles.workoutDetailStageBadgeText, { color: theme.primary }]}>{seriesIndex}</Text>
                </View>
              ) : null}
              <Text style={[styles.workoutDetailExerciseName, styles.workoutDetailSeriesTitle, { color: theme.text }]} numberOfLines={2}>
                {exerciseName}
              </Text>
            </View>
          )}
          {meta ? (
            <Text style={[styles.workoutMeta, { color: theme.muted }]} numberOfLines={1}>
              {meta}
            </Text>
          ) : null}
        </View>
        {canShowMuscleButton ? (
          <View style={styles.exerciseSummaryRight}>
            <Pressable
              accessibilityLabel={t("showDetails")}
              accessibilityRole="button"
              hitSlop={8}
              style={[styles.exerciseMuscleButton, { backgroundColor: theme.control, borderColor: theme.border }]}
              onPress={(event) => {
                event.stopPropagation();
                onPressMuscles();
              }}
            >
              <Ionicons name="body-outline" size={20} color={theme.primary} />
            </Pressable>
          </View>
        ) : null}
      </View>
      {step.notes ? (
        <Text style={[styles.workoutDetailNotes, { color: theme.muted }]}>{step.notes}</Text>
      ) : null}
      <View style={styles.guidedExerciseMetaRow}>
        <View style={styles.guidedRestGroup}>
          <Text style={[styles.guidedRestLabel, { color: theme.text }]}>{t("stageRest")}</Text>
          <View style={[styles.guidedRestPill, { backgroundColor: theme.secondaryBand }]}>
            <Ionicons name="time-outline" size={16} color={theme.text} />
            <Text style={[styles.guidedRestPillText, { color: theme.primary }]}>{restText}</Text>
          </View>
        </View>
        <View accessibilityLabel={`${sets || "-"} x ${exerciseTarget || "-"}`} style={styles.guidedTargetGroup}>
          <View style={[styles.guidedTargetPill, { backgroundColor: theme.secondaryBand }]}>
            <Text style={[styles.guidedTargetText, { color: theme.primary }]}>{sets || "-"}</Text>
          </View>
          <Text style={[styles.guidedTargetSeparator, { color: theme.text }]}>x</Text>
          <View style={[styles.guidedTargetPill, { backgroundColor: theme.secondaryBand }]}>
            <Text style={[styles.guidedTargetText, { color: theme.primary }]}>{exerciseTarget || "-"}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

type HumanMuscleFigureProps = {
  advancedRegionFills?: Readonly<Record<string, string>>;
  fill: (muscle: MuscleKey) => string;
  side: "front" | "back";
  style?: StyleProp<ViewStyle>;
};

export function HumanMuscleFigure({ advancedRegionFills, fill, side, style }: HumanMuscleFigureProps) {
  const svgSource = side === "front" ? frontBodySvg : backBodySvg;
  const regionMap = side === "front" ? frontBodyRegionMap : backBodyRegionMap;
  const xml = useMemo(
    () => colorizeAdvancedRegions(colorizeBodySvg(svgSource, regionMap, fill), advancedRegionFills),
    [advancedRegionFills, fill, regionMap, svgSource]
  );

  return (
    <View style={[styles.humanMuscleFigure, style]}>
      <SvgXml height="100%" width="100%" xml={xml} />
    </View>
  );
}

function colorizeAdvancedRegions(svg: string, regionFills?: Readonly<Record<string, string>>) {
  if (!regionFills) return svg;
  return Object.entries(regionFills).reduce((currentSvg, [regionId, fill]) => {
    const escapedId = regionId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regionPattern = new RegExp(`(<[^>]+\\bid="${escapedId}"[^>]*>)`, "g");
    return currentSvg.replace(regionPattern, (tag) => tag.replace(/\bfill="[^"]*"/, `fill="${fill}"`));
  }, svg);
}

function colorizeBodySvg(
  svg: string,
  regionMap: Record<string, MuscleKey>,
  fill: (muscle: MuscleKey) => string
) {
  return Object.entries(regionMap).reduce((currentSvg, [regionId, muscle]) => {
    const escapedId = regionId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regionPattern = new RegExp(`(<[^>]+\\bid="${escapedId}"[^>]*>)`, "g");

    return currentSvg.replace(regionPattern, (tag) =>
      tag.replace(/\bfill="[^"]*"/, `fill="${fill(muscle)}"`)
    );
  }, svg);
}
