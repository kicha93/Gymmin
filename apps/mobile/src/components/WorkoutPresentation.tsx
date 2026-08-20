import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Modal, Pressable, Text, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { SvgXml } from "react-native-svg";

import {
  advancedBackBodyRegionMap,
  advancedBackBodySvg,
  advancedFrontBodyRegionMap,
  advancedFrontBodySvg,
  backBodyRegionMap,
  backBodySvg,
  frontBodyRegionMap,
  frontBodySvg
} from "../domain/bodyMaps";
import { colorizeAdvancedRegions, colorizeBodySvg } from "../domain/bodySvgColorizer";
import { addDiagnosticEvent } from "../domain/appDiagnostics";
import {
  getAdvancedDisplayFamily,
  getAdvancedMuscleSubdivision
} from "../domain/advancedMuscles";
import {
  findExerciseById,
  findExerciseByName,
  getExerciseDisplayName,
  muscleLabels,
  muscleKeys,
  type InfluenceScore,
  type MuscleKey
} from "../domain/exercises";
import { getMuscleImpactColor, muscleImpactColors } from "./MuscleImpactPresentation";
import {
  getWorkoutAdvancedMuscleOverview,
  getWorkoutMuscleLegendCategories,
  toggleWorkoutMuscleLegendScore,
  type WorkoutMuscleSide
} from "./workoutMuscleOverview";
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
  advancedMuscleMode?: boolean;
  language: LanguageCode;
  theme: Theme;
  workout: WorkoutDraft;
};

const workoutMuscleLegendLabels: Record<InfluenceScore, TranslationKey> = {
  0: "inactiveMuscleGroups",
  1: "stabilizingMuscles",
  2: "secondaryImpactMuscles",
  3: "significantSynergistMuscles",
  4: "majorContributorMuscles",
  5: "primaryMuscles"
};

type MuscleEngagementLegendRowProps = {
  category: {
    count: number;
    items: Array<{
      anatomyRegionIds: readonly string[];
      id: string;
      isAnatomyVisible: boolean;
      label: string;
      score: InfluenceScore;
    }>;
    ratio: number;
    score: InfluenceScore;
  };
  expanded: boolean;
  focusedItemId: string | null;
  language: LanguageCode;
  onFocusItem: (itemId: string) => void;
  onPress: () => void;
  theme: Theme;
};

function MuscleEngagementLegendRow({
  category,
  expanded,
  focusedItemId,
  language,
  onFocusItem,
  onPress,
  theme
}: MuscleEngagementLegendRowProps) {
  const color = muscleImpactColors[category.score];

  return (
    <View style={[styles.workoutMuscleLegendRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        style={styles.workoutMuscleLegendPressable}
        onPress={onPress}
      >
        <View style={styles.workoutMuscleLegendHeader}>
          <View style={[styles.workoutMuscleLegendDot, { backgroundColor: color }]} />
          <Text style={[styles.workoutMuscleLegendLabel, { color: theme.text }]} numberOfLines={2}>
            {translate(language, workoutMuscleLegendLabels[category.score])}
          </Text>
          <View style={[styles.workoutMuscleLegendBadge, { backgroundColor: `${color}20` }]}>
            <Text style={[styles.workoutMuscleLegendBadgeText, { color }]}>{category.count}</Text>
          </View>
          <Ionicons color={theme.text} name={expanded ? "chevron-up" : "chevron-down"} size={18} />
        </View>
        <View style={[styles.workoutMuscleLegendTrack, { backgroundColor: theme.segment }]}>
          <View
            style={[
              styles.workoutMuscleLegendFill,
              { backgroundColor: color, width: `${Math.min(1, Math.max(0, category.ratio)) * 100}%` }
            ]}
          />
        </View>
      </Pressable>
      {expanded && category.items.length ? (
        <View style={[styles.workoutMuscleLegendDetails, { borderTopColor: theme.border }]}>
          {category.items.map((item) => {
            const canFocus = item.isAnatomyVisible && item.anatomyRegionIds.length > 0;
            const selected = focusedItemId === item.id;
            const content = (
              <>
                <View style={[styles.workoutMuscleLegendMuscleDot, { backgroundColor: color }]} />
                <Text style={[styles.workoutMuscleLegendMuscleText, { color: theme.text }]}>
                  {item.label}
                </Text>
                {canFocus ? (
                  <Ionicons color={selected ? theme.primary : theme.muted} name="body-outline" size={15} />
                ) : null}
              </>
            );

            return canFocus ? (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => onFocusItem(item.id)}
                style={[
                  styles.workoutMuscleLegendMuscleRow,
                  styles.workoutMuscleLegendMusclePressable,
                  selected ? { backgroundColor: `${theme.primary}12`, borderColor: theme.primary } : null
                ]}
              >
                {content}
              </Pressable>
            ) : (
              <View key={item.id} style={styles.workoutMuscleLegendMuscleRow}>
                {content}
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

export function WorkoutMuscleOverviewContent({
  advancedMuscleMode = false,
  language,
  theme,
  workout
}: WorkoutMuscleOverviewProps) {
  const [side, setSide] = useState<WorkoutMuscleSide>("front");
  const [expandedScore, setExpandedScore] = useState<InfluenceScore | null>(null);
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  const usage = useMemo(() => getWorkoutMuscleUsage(workout), [workout]);
  const advancedOverview = useMemo(
    () => advancedMuscleMode ? getWorkoutAdvancedMuscleOverview(workout, side) : null,
    [advancedMuscleMode, side, workout]
  );
  const legendCategories = useMemo(() => {
    if (advancedOverview) {
      return advancedOverview.categories.map((category) => ({
        ...category,
        items: category.items.map((item) => {
          if (item.subdivisionId) {
            const subdivision = getAdvancedMuscleSubdivision(item.subdivisionId);
            const family = subdivision ? getAdvancedDisplayFamily(subdivision.displayFamilyId) : undefined;
            return {
              anatomyRegionIds: subdivision?.anatomyRegionIds ?? [],
              id: item.id,
              isAnatomyVisible: subdivision?.isAnatomyVisible ?? false,
              label: subdivision
                ? `${family?.names[language] ?? muscleLabels[language][subdivision.standardParentMuscle]} — ${subdivision.names[language]}`
                : item.id,
              score: item.score
            };
          }
          return {
            anatomyRegionIds: [],
            id: item.id,
            isAnatomyVisible: false,
            label: item.muscle ? muscleLabels[language][item.muscle] : item.id,
            score: item.score
          };
        })
      }));
    }

    return getWorkoutMuscleLegendCategories(usage, side).map((category) => ({
      ...category,
      items: category.muscles.map((muscle) => ({
        anatomyRegionIds: [],
        id: muscle,
        isAnatomyVisible: false,
        label: muscleLabels[language][muscle],
        score: category.score
      }))
    }));
  }, [advancedOverview, language, side, usage]);
  const focusedItem = useMemo(
    () => legendCategories.flatMap((category) => category.items).find((item) => item.id === focusedItemId),
    [focusedItemId, legendCategories]
  );
  const highlightedAdvancedRegionIds = useMemo(
    () => focusedItem ? new Set(focusedItem.anatomyRegionIds) : undefined,
    [focusedItem]
  );
  const advancedRegionFills = useMemo(
    () => advancedOverview
      ? Object.fromEntries(
          Object.entries(advancedOverview.regionLevels).map(([regionId, level]) => [
            regionId,
            focusedItem
              ? getMuscleImpactColor(focusedItem.anatomyRegionIds.includes(regionId) ? focusedItem.score : 0)
              : getMuscleImpactColor(level)
          ])
        )
      : undefined,
    [advancedOverview, focusedItem]
  );

  useEffect(() => {
    if (!advancedMuscleMode) setFocusedItemId(null);
  }, [advancedMuscleMode]);

  function fill(muscle: MuscleKey) {
    return getMuscleImpactColor(focusedItem ? 0 : usage[muscle]);
  }

  function selectSide(nextSide: WorkoutMuscleSide) {
    setSide(nextSide);
    setExpandedScore(null);
    setFocusedItemId(null);
  }

  return (
    <>
      <View style={styles.muscleOverviewFigures}>
        <HumanMuscleFigure
          advancedRegionFills={advancedRegionFills}
          fill={fill}
          highlightedAdvancedRegionIds={highlightedAdvancedRegionIds}
          language={language}
          side={side}
          style={styles.muscleOverviewSingleFigure}
        />
      </View>
      <View style={[styles.weeklyMuscleVolumeSegments, { backgroundColor: theme.segment }]}>
        {(["front", "back"] as const).map((option) => {
          const selected = side === option;

          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[
                styles.weeklyMuscleVolumeSegment,
                selected ? { backgroundColor: theme.primary } : null
              ]}
              onPress={() => selectSide(option)}
            >
              <Text style={[styles.weeklyMuscleVolumeSegmentText, { color: selected ? theme.white : theme.text }]}>
                {translate(language, option === "front" ? "bodyFront" : "bodyBack")}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.workoutMuscleLegendList}>
        {legendCategories.map((category) => (
          <MuscleEngagementLegendRow
            key={category.score}
            category={category}
            expanded={expandedScore === category.score}
            focusedItemId={focusedItemId}
            language={language}
            onFocusItem={(itemId) => setFocusedItemId((current) => current === itemId ? null : itemId)}
            onPress={() => {
              setExpandedScore((current) => toggleWorkoutMuscleLegendScore(current, category.score));
              setFocusedItemId(null);
            }}
            theme={theme}
          />
        ))}
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
  highlightedAdvancedRegionIds?: ReadonlySet<string>;
  language: LanguageCode;
  side: "front" | "back";
  style?: StyleProp<ViewStyle>;
};

export function HumanMuscleFigure({
  advancedRegionFills,
  fill,
  highlightedAdvancedRegionIds,
  language,
  side,
  style
}: HumanMuscleFigureProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const isAdvanced = advancedRegionFills !== undefined;
  const svgSource = isAdvanced
    ? side === "front" ? advancedFrontBodySvg : advancedBackBodySvg
    : side === "front" ? frontBodySvg : backBodySvg;
  const regionMap = isAdvanced
    ? side === "front" ? advancedFrontBodyRegionMap : advancedBackBodyRegionMap
    : side === "front" ? frontBodyRegionMap : backBodyRegionMap;
  const xml = useMemo(
    () => {
      return colorizeAdvancedRegions(
        colorizeBodySvg(svgSource, regionMap, fill),
        advancedRegionFills,
        highlightedAdvancedRegionIds
      );
    },
    [advancedRegionFills, fill, highlightedAdvancedRegionIds, regionMap, side, svgSource]
  );
  const standardSvgSource = side === "front" ? frontBodySvg : backBodySvg;
  const standardRegionMap = side === "front" ? frontBodyRegionMap : backBodyRegionMap;
  const fallbackXml = useMemo(
    () => colorizeBodySvg(standardSvgSource, standardRegionMap, fill),
    [fill, standardRegionMap, standardSvgSource]
  );

  const accessibilityLabel = `${translate(language, "enlargeBodyFigure")}: ${translate(
    language,
    side === "front" ? "bodyFront" : "bodyBack"
  )}`;

  return (
    <>
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        onPress={() => setPreviewOpen(true)}
        style={[styles.humanMuscleFigure, style]}
      >
        <SafeBodySvg fallbackXml={fallbackXml} xml={xml} />
      </Pressable>
      <Modal animationType="fade" transparent visible={previewOpen} onRequestClose={() => setPreviewOpen(false)}>
        <Pressable
          accessibilityLabel={translate(language, "close")}
          accessibilityRole="button"
          onPress={() => setPreviewOpen(false)}
          style={styles.achievementPreviewBackdrop}
        >
          <View style={styles.bodyFigurePreviewSurface}>
            <View style={[styles.humanMuscleFigure, styles.bodyFigurePreviewFigure]}>
              <SafeBodySvg fallbackXml={fallbackXml} xml={xml} />
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function SafeBodySvg({ fallbackXml, xml }: { fallbackXml: string; xml: string }) {
  const reportSvgError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    addDiagnosticEvent({
      area: "ui",
      level: "error",
      message: `Nie udało się wyświetlić szczegółowej sylwetki: ${message}`,
      screen: "muscle-anatomy"
    });
  };
  return (
    <ErrorBoundary
      fallbackRender={() => <SvgXml height="100%" width="100%" xml={fallbackXml} />}
      onError={reportSvgError}
      resetKeys={[xml]}
    >
      <SvgXml
        fallback={<SvgXml height="100%" width="100%" xml={fallbackXml} />}
        height="100%"
        onError={reportSvgError}
        width="100%"
        xml={xml}
      />
    </ErrorBoundary>
  );
}
