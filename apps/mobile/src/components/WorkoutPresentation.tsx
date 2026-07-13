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
  findExerciseByName,
  getExerciseDisplayName,
  muscleKeys,
  type MuscleKey
} from "../domain/exercises";
import { isRestTargetStep } from "../domain/workoutExerciseSummary";
import type { StageType, WorkoutDraft, WorkoutStep } from "../domain/workouts";
import { translate, type LanguageCode, type TranslationKey } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

export type MuscleUsage = Record<MuscleKey, 0 | 1 | 2>;

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
    if (step.kind !== "exercise" || !step.exerciseName) {
      return;
    }

    const exercise = findExerciseByName(step.exerciseName);

    if (!exercise) {
      return;
    }

    muscleKeys.forEach((muscle) => {
      usage[muscle] = Math.max(usage[muscle], exercise.muscleImpact[muscle]) as 0 | 1 | 2;
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
  const primaryCount = muscleKeys.filter((muscle) => usage[muscle] === 2).length;
  const secondaryCount = muscleKeys.filter((muscle) => usage[muscle] === 1).length;
  const colors = {
    inactive: "#4a4d4c",
    primary: "#ff3347",
    secondary: "#ffc43d"
  };

  function fill(muscle: MuscleKey) {
    if (usage[muscle] === 2) {
      return colors.primary;
    }

    if (usage[muscle] === 1) {
      return colors.secondary;
    }

    return colors.inactive;
  }

  return (
    <>
      <View style={styles.muscleOverviewFigures}>
        <HumanMuscleFigure fill={fill} side="front" />
        <HumanMuscleFigure fill={fill} side="back" />
      </View>
      <View style={styles.muscleOverviewLegend}>
        <LegendItem color={colors.primary} label={`${translate(language, "primaryMuscles")} (${primaryCount})`} theme={theme} />
        <LegendItem color={colors.secondary} label={`${translate(language, "secondaryMuscles")} (${secondaryCount})`} theme={theme} />
        <LegendItem color={colors.inactive} label={translate(language, "inactiveMuscleGroups")} theme={theme} />
      </View>
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
  const [pairedSets, pairedTarget] = pairedTargetText ? pairedTargetText.split(" x ") : ["", ""];
  const rawExerciseName = typeof step.exerciseName === "string" ? step.exerciseName : "";
  const rawExerciseId = typeof step.exerciseId === "string" ? step.exerciseId : "";
  const exerciseName = rawExerciseName
    ? getExerciseDisplayName(rawExerciseName, language)
    : step.stageType
      ? t(stageTypeTranslationKeys[step.stageType])
      : t("elementWithoutExercise");
  const meta = step.loadKg ? `${step.loadKg} kg` : "";
  const canShowMuscleButton = Boolean(rawExerciseId.trim() || rawExerciseName.trim());

  if (isRestTarget) {
    return (
      <Pressable accessibilityRole="button" style={styles.exerciseSummaryRow} onPress={onPressDetails}>
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
      </Pressable>
    );
  }

  return (
    <Pressable accessibilityRole="button" style={styles.exerciseSummaryRow} onPress={onPressDetails}>
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
    </Pressable>
  );
}

type LegendItemProps = {
  color: string;
  label: string;
  theme: Theme;
};

function LegendItem({ color, label, theme }: LegendItemProps) {
  return (
    <View style={styles.muscleLegendItem}>
      <View style={[styles.muscleLegendDot, { backgroundColor: color }]} />
      <Text style={[styles.muscleLegendText, { color: theme.muted }]}>{label}</Text>
    </View>
  );
}

type HumanMuscleFigureProps = {
  fill: (muscle: MuscleKey) => string;
  side: "front" | "back";
  style?: StyleProp<ViewStyle>;
};

export function HumanMuscleFigure({ fill, side, style }: HumanMuscleFigureProps) {
  const svgSource = side === "front" ? frontBodySvg : backBodySvg;
  const regionMap = side === "front" ? frontBodyRegionMap : backBodyRegionMap;
  const xml = useMemo(() => colorizeBodySvg(svgSource, regionMap, fill), [fill, regionMap, svgSource]);

  return (
    <View style={[styles.humanMuscleFigure, style]}>
      <SvgXml height="100%" width="100%" xml={xml} />
    </View>
  );
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
