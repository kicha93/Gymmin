import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, Text, useWindowDimensions, View } from "react-native";

import { AppButton } from "./AppControls";
import { HumanMuscleFigure } from "./WorkoutPresentation";
import {
  getWeeklyMuscleVolumeLayout,
  toggleWeeklyMuscleGroup,
  type WeeklyMuscleVolumeLayout
} from "./weeklyMuscleVolumeLayout";
import { getAdvancedMuscleSubdivision } from "../domain/advancedMuscles";
import { muscleLabels, type MuscleKey } from "../domain/exercises";
import {
  formatWeekRange,
  getCurrentWeekRange,
  getWeeklyPlanDay,
  type WeeklyPlanSummary
} from "../domain/weeklyPlan";
import {
  formatWeeklyMuscleSets,
  getWeeklyMuscleVolumeEntriesForSide,
  type WeeklyMuscleVolumeEntry,
  type WeeklyMuscleVolumeGroupId,
  type WeeklyMuscleVolumeMode,
  type WeeklyMuscleVolumeSide,
  type WeeklyMuscleVolumeSummary,
  type WeeklyVolumeBand,
  weeklyVolumeBandThresholds
} from "../domain/weeklyMuscleVolume";
import type { WorkoutSession } from "../domain/workoutSessions";
import type { LanguageCode, TranslationKey } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

type CommonProps = {
  t: (key: TranslationKey) => string;
  theme: Theme;
};

type WorkoutCreatorButtonProps = CommonProps & {
  onOpen: () => void;
};

export function WorkoutCreatorButton({
  onOpen,
  t,
  theme
}: WorkoutCreatorButtonProps) {
  return (
    <AppButton
      icon="sparkles-outline"
      style={styles.workoutCreatorButton}
      theme={theme}
      onPress={onOpen}
    >
      {t("workoutCreatorCta")}
    </AppButton>
  );
}

export function TrainingFactPill({ fact, theme }: { fact: string; theme: Theme }) {
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[styles.trainingFactPill, { backgroundColor: theme.secondaryBand, borderColor: theme.border }]}
    >
      <View style={[styles.trainingFactIcon, { backgroundColor: theme.primary }]}>
        <Ionicons name="bulb-outline" size={16} color={theme.white} />
      </View>
      <Text style={[styles.trainingFactText, { color: theme.text }]}>{fact}</Text>
    </View>
  );
}

type ActiveWorkoutSessionCardProps = CommonProps & {
  onAbandon: () => void;
  onContinue: (sessionId: string) => void;
  session: WorkoutSession | null;
};

export function ActiveWorkoutSessionCard({
  onAbandon,
  onContinue,
  session,
  t,
  theme
}: ActiveWorkoutSessionCardProps) {
  if (!session) {
    return null;
  }
  return (
    <View style={[styles.activeSessionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.workoutInfo}>
        <Text style={[styles.workoutName, { color: theme.text }]}>{t("activeWorkoutNotice")}</Text>
        <Text style={[styles.workoutMeta, { color: theme.muted }]}>{session.sourceWorkoutName}</Text>
      </View>
      <View style={styles.activeSessionActions}>
        <AppButton
          icon="play-outline"
          style={styles.compactButton}
          textStyle={styles.compactButtonText}
          theme={theme}
          onPress={() => onContinue(session.id)}
        >
          {t("continueWorkout")}
        </AppButton>
        <AppButton
          icon="close-outline"
          style={styles.compactButton}
          textStyle={styles.compactButtonText}
          theme={theme}
          variant="outline"
          onPress={onAbandon}
        >
          {t("abandonWorkout")}
        </AppButton>
      </View>
    </View>
  );
}

type WeeklyPlanHomeCardProps = CommonProps & {
  advancedMuscleMode: boolean;
  language: LanguageCode;
  onOpenPlan: () => void;
  onOpenWorkout: (workoutId: string) => void;
  savedWorkoutCount: number;
  summary: WeeklyPlanSummary;
  volumeSummary: WeeklyMuscleVolumeSummary;
};

const weeklyMuscleLabelKeys: Record<WeeklyMuscleVolumeGroupId, TranslationKey> = {
  back: "weeklyMuscleBack",
  biceps: "weeklyMuscleBiceps",
  calves: "weeklyMuscleCalves",
  chest: "weeklyMuscleChest",
  core: "weeklyMuscleCore",
  forearms: "weeklyMuscleForearms",
  glutes: "weeklyMuscleGlutes",
  hamstrings: "weeklyMuscleHamstrings",
  hips: "weeklyMuscleHips",
  quads: "weeklyMuscleQuads",
  shoulders: "weeklyMuscleShoulders",
  triceps: "weeklyMuscleTriceps"
};

const weeklyMuscleStatusKeys: Record<WeeklyVolumeBand, TranslationKey> = {
  high: "weeklyMuscleVolumeStatusHigh",
  low: "weeklyMuscleVolumeStatusLow",
  moderate: "weeklyMuscleVolumeStatusModerate",
  none: "weeklyMuscleVolumeStatusNone",
  veryHigh: "weeklyMuscleVolumeStatusVeryHigh"
};

function getVolumeStatusColor(status: WeeklyVolumeBand, theme: Theme) {
  switch (status) {
    case "low": return "#e58a19";
    case "moderate": return "#d5ab32";
    case "high": return theme.primary;
    case "veryHigh": return "#527876";
    default: return theme.secondaryBand;
  }
}

function getEntryValue(entry: WeeklyMuscleVolumeEntry, mode: WeeklyMuscleVolumeMode) {
  return mode === "completed" ? entry.completedSets : entry.projectedSets;
}

function getEntryStatus(entry: WeeklyMuscleVolumeEntry, mode: WeeklyMuscleVolumeMode) {
  return mode === "completed" ? entry.completedStatus : entry.projectedStatus;
}

type WeeklyMuscleVolumeControlsProps = CommonProps & {
  layout: WeeklyMuscleVolumeLayout;
  mode: WeeklyMuscleVolumeMode;
  onModeChange: (mode: WeeklyMuscleVolumeMode) => void;
  onSideChange: (side: WeeklyMuscleVolumeSide) => void;
  side: WeeklyMuscleVolumeSide;
};

function WeeklyMuscleVolumeControls({
  layout,
  mode,
  onModeChange,
  onSideChange,
  side,
  t,
  theme
}: WeeklyMuscleVolumeControlsProps) {
  return (
    <View style={[styles.weeklyMuscleVolumeControls, layout.controlsStacked ? styles.weeklyMuscleVolumeControlsStacked : null]}>
      <View style={[styles.weeklyMuscleVolumeSegments, { backgroundColor: theme.segment }]}>
        {(["completed", "projected"] as const).map((option) => {
          const selected = mode === option;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[styles.weeklyMuscleVolumeSegment, selected ? { backgroundColor: theme.primary } : null]}
              onPress={() => onModeChange(option)}
            >
              <Text
                numberOfLines={1}
                style={[styles.weeklyMuscleVolumeSegmentText, { color: selected ? theme.white : theme.text }]}
              >
                {t(option === "completed" ? "weeklyMuscleVolumeCompleted" : "weeklyMuscleVolumePlan")}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={[styles.weeklyMuscleVolumeSegments, { backgroundColor: theme.segment }]}>
        {(["front", "back"] as const).map((option) => {
          const selected = side === option;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[styles.weeklyMuscleVolumeSegment, selected ? { backgroundColor: theme.primary } : null]}
              onPress={() => onSideChange(option)}
            >
              <Text
                numberOfLines={1}
                style={[styles.weeklyMuscleVolumeSegmentText, { color: selected ? theme.white : theme.text }]}
              >
                {t(option === "front" ? "bodyFront" : "bodyBack")}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

type WeeklyMuscleVolumeListProps = CommonProps & {
  advancedMuscleMode: boolean;
  entries: WeeklyMuscleVolumeEntry[];
  expandedAdvancedGroups: ReadonlySet<WeeklyMuscleVolumeGroupId>;
  hiddenGroups: ReadonlySet<WeeklyMuscleVolumeGroupId>;
  language: LanguageCode;
  mode: WeeklyMuscleVolumeMode;
  onToggleAdvancedGroup: (group: WeeklyMuscleVolumeGroupId) => void;
  onToggleGroup: (group: WeeklyMuscleVolumeGroupId) => void;
  rowMetaStacked: boolean;
  side: WeeklyMuscleVolumeSide;
};

function WeeklyMuscleVolumeList({
  advancedMuscleMode,
  entries,
  expandedAdvancedGroups,
  hiddenGroups,
  language,
  mode,
  onToggleAdvancedGroup,
  onToggleGroup,
  rowMetaStacked,
  side,
  t,
  theme
}: WeeklyMuscleVolumeListProps) {
  const getSetsLabel = (value: number) => {
    if (language !== "pl") return t(value === 1 ? "weeklyMuscleVolumeSetOne" : "weeklyMuscleVolumeSets");
    if (!Number.isInteger(value)) return t("weeklyMuscleVolumeSets");
    const lastTwo = value % 100;
    const last = value % 10;
    if (value === 1) return t("weeklyMuscleVolumeSetOne");
    if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) {
      return t("weeklyMuscleVolumeSetsFew");
    }
    return t("weeklyMuscleVolumeSets");
  };
  return (
    <View style={styles.weeklyMuscleVolumeRows}>
      {entries.map((entry) => {
        const value = getEntryValue(entry, mode);
        const status = getEntryStatus(entry, mode);
        const isVisible = !hiddenGroups.has(entry.id);
        const color = isVisible ? getVolumeStatusColor(status, theme) : theme.selectedOption;
        const progress = Math.min(100, (value / weeklyVolumeBandThresholds.visualScaleMax) * 100);
        const advancedItems = entry.advancedExposure
          .filter((item) => item.sides.includes(side))
          .map((item) => ({
            ...item,
            exposure: mode === "completed" ? item.completedExposure : item.projectedExposure
          }))
          .filter((item) => item.exposure > 0)
          .sort((left, right) => right.exposure - left.exposure);
        const maxAdvancedExposure = Math.max(0, ...advancedItems.map((item) => item.exposure));
        const advancedExpanded = expandedAdvancedGroups.has(entry.id);
        return (
          <Pressable
            key={entry.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isVisible }}
            style={[
              styles.weeklyMuscleVolumeRow,
              !isVisible ? styles.weeklyMuscleVolumeRowDisabled : null,
              { borderBottomColor: theme.border }
            ]}
            onPress={() => onToggleGroup(entry.id)}
          >
            <View style={[styles.weeklyMuscleVolumeRowTop, rowMetaStacked ? styles.weeklyMuscleVolumeRowTopStacked : null]}>
              <View style={styles.weeklyMuscleVolumeNameWrap}>
                <View style={[styles.weeklyMuscleVolumeDot, { backgroundColor: color }]} />
                <Text numberOfLines={2} style={[styles.weeklyMuscleVolumeName, { color: theme.text }]}>
                  {t(weeklyMuscleLabelKeys[entry.id])}
                </Text>
              </View>
              <Text numberOfLines={1} style={[styles.weeklyMuscleVolumeValue, { color: theme.text }]}>
                {`${formatWeeklyMuscleSets(value)} ${getSetsLabel(value)}`}
              </Text>
            </View>
            <View style={[styles.weeklyMuscleVolumeTrack, { backgroundColor: theme.secondaryBand }]}>
              <View style={[styles.weeklyMuscleVolumeFill, { backgroundColor: color, width: `${progress}%` }]} />
            </View>
            <View style={[styles.weeklyMuscleVolumeBadge, { backgroundColor: `${color}22` }]}>
              <Text numberOfLines={1} style={[styles.weeklyMuscleVolumeBadgeText, { color }]}>
                {t(weeklyMuscleStatusKeys[status])}
              </Text>
            </View>
            {advancedMuscleMode && advancedItems.length ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: advancedExpanded }}
                  style={styles.weeklyMuscleAdvancedToggle}
                  onPress={(event) => {
                    event.stopPropagation();
                    onToggleAdvancedGroup(entry.id);
                  }}
                >
                  <Text style={[styles.weeklyMuscleAdvancedToggleText, { color: theme.primary }]}>
                    {t("weeklyMuscleAdvancedSubgroups")}
                  </Text>
                  <Ionicons name={advancedExpanded ? "chevron-up" : "chevron-down"} size={14} color={theme.primary} />
                </Pressable>
                {advancedExpanded ? (
                  <View style={[styles.weeklyMuscleAdvancedList, { borderLeftColor: color }]}>
                    {advancedItems.map((item) => {
                      const subdivision = item.subdivisionId
                        ? getAdvancedMuscleSubdivision(item.subdivisionId)
                        : undefined;
                      const label = subdivision?.names[language]
                        ?? (item.muscle ? muscleLabels[language][item.muscle] : item.id);
                      const relative = maxAdvancedExposure > 0 ? item.exposure / maxAdvancedExposure : 0;
                      const involvementKey: TranslationKey = relative >= 0.75
                        ? "weeklyMuscleAdvancedHighShare"
                        : relative >= 0.4
                          ? "weeklyMuscleAdvancedModerateShare"
                          : "weeklyMuscleAdvancedLowShare";
                      return (
                        <View key={item.id} style={styles.weeklyMuscleAdvancedItem}>
                          <View style={styles.weeklyMuscleAdvancedItemTop}>
                            <Text numberOfLines={2} style={[styles.weeklyMuscleAdvancedName, { color: theme.text }]}>{label}</Text>
                            <Text numberOfLines={1} style={[styles.weeklyMuscleAdvancedShare, { color: theme.muted }]}>{t(involvementKey)}</Text>
                          </View>
                          <View style={[styles.weeklyMuscleAdvancedTrack, { backgroundColor: theme.secondaryBand }]}>
                            <View style={[styles.weeklyMuscleAdvancedFill, { backgroundColor: color, width: `${relative * 100}%` }]} />
                          </View>
                        </View>
                      );
                    })}
                    <Text style={[styles.weeklyMuscleAdvancedHint, { color: theme.muted }]}>
                      {t("weeklyMuscleAdvancedRelativeHint")}
                    </Text>
                  </View>
                ) : null}
              </>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

type WeeklyMuscleAnatomyProps = CommonProps & {
  entryByMuscle: Map<MuscleKey, WeeklyMuscleVolumeEntry>;
  hiddenGroups: ReadonlySet<WeeklyMuscleVolumeGroupId>;
  language: LanguageCode;
  layout: WeeklyMuscleVolumeLayout;
  mode: WeeklyMuscleVolumeMode;
  side: WeeklyMuscleVolumeSide;
};

function WeeklyMuscleAnatomy({ entryByMuscle, hiddenGroups, language, layout, mode, side, theme }: WeeklyMuscleAnatomyProps) {
  return (
    <View
      style={[
        styles.weeklyMuscleVolumeFigureWrap,
        { backgroundColor: theme.control, borderColor: theme.border, width: layout.anatomyWidth }
      ]}
    >
      <HumanMuscleFigure
        language={language}
        side={side}
        style={{ height: layout.anatomyHeight, maxWidth: "100%", width: layout.anatomyWidth - 4 }}
        fill={(muscle) => {
          const entry = entryByMuscle.get(muscle);
          if (!entry) return theme.secondaryBand;
          return hiddenGroups.has(entry.id)
            ? theme.selectedOption
            : getVolumeStatusColor(getEntryStatus(entry, mode), theme);
        }}
      />
    </View>
  );
}

export function WeeklyPlanHomeCard({
  advancedMuscleMode,
  language,
  onOpenPlan,
  onOpenWorkout,
  savedWorkoutCount,
  summary,
  volumeSummary,
  t,
  theme
}: WeeklyPlanHomeCardProps) {
  const { width: windowWidth } = useWindowDimensions();
  const [isVolumeExpanded, setIsVolumeExpanded] = useState(false);
  const [showVolumeInfo, setShowVolumeInfo] = useState(false);
  const [volumeMode, setVolumeMode] = useState<WeeklyMuscleVolumeMode>("completed");
  const [volumeSide, setVolumeSide] = useState<WeeklyMuscleVolumeSide>("front");
  const [hiddenVolumeGroups, setHiddenVolumeGroups] = useState<Set<WeeklyMuscleVolumeGroupId>>(() => new Set());
  const [expandedAdvancedGroups, setExpandedAdvancedGroups] = useState<Set<WeeklyMuscleVolumeGroupId>>(() => new Set());
  const volumeLayout = getWeeklyMuscleVolumeLayout(windowWidth);
  const entryByMuscle = useMemo(() => {
    const map = new Map<MuscleKey, WeeklyMuscleVolumeEntry>();
    for (const entry of volumeSummary.entries) {
      for (const muscle of entry.muscleKeys) map.set(muscle, entry);
    }
    return map;
  }, [volumeSummary.entries]);
  if (!savedWorkoutCount) {
    return null;
  }
  if (!summary.total) {
    return (
      <View style={[styles.weeklyPlanEmptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={[styles.weeklyPlanCardIcon, { backgroundColor: theme.secondaryBand }]}>
          <Ionicons name="calendar-outline" size={22} color={theme.primary} />
        </View>
        <View style={styles.weeklyPlanEmptyCopy}>
          <Text style={[styles.weeklyPlanEmptyTitle, { color: theme.text }]}>{t("planYourWeek")}</Text>
          <Text style={[styles.weeklyPlanEmptyText, { color: theme.muted }]}>{t("weeklyPlanEmptyCopy")}</Text>
        </View>
        <Pressable accessibilityRole="button" style={[styles.weeklyPlanSetupButton, { borderColor: theme.primary }]} onPress={onOpenPlan}>
          <Text style={[styles.weeklyPlanSetupButtonText, { color: theme.primary }]}>{t("setPlan")}</Text>
        </Pressable>
      </View>
    );
  }

  const range = formatWeekRange(getCurrentWeekRange(new Date()), language);
  const todayItem = summary.todayItems[0];
  const completion = t("weeklyPlanCompleted")
    .replace("{completed}", String(summary.completed))
    .replace("{total}", String(summary.total));
  const dayKeys: Record<ReturnType<typeof getWeeklyPlanDay>, TranslationKey> = {
    monday: "monday",
    tuesday: "tuesday",
    wednesday: "wednesday",
    thursday: "thursday",
    friday: "friday",
    saturday: "saturday",
    sunday: "sunday"
  };

  const visibleVolumeEntries = getWeeklyMuscleVolumeEntriesForSide(volumeSummary, volumeSide);
  return (
    <View style={[styles.weeklyPlanHomeCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Pressable accessibilityRole="button" style={styles.weeklyPlanHomeTop} onPress={onOpenPlan}>
        <View style={[styles.weeklyPlanCardIcon, { backgroundColor: theme.primary }]}>
          <Ionicons name="calendar-outline" size={22} color={theme.white} />
        </View>
        <View style={styles.weeklyPlanHomeCopy}>
          <Text style={[styles.weeklyPlanHomeTitle, { color: theme.text }]}>{`${t("week")}: ${range}`}</Text>
          <Text style={[styles.weeklyPlanHomeMeta, { color: theme.muted }]}>{completion}</Text>
        </View>
        <View style={styles.weeklyPlanProgressCopy}>
          <Text style={[styles.weeklyPlanProgressText, { color: theme.primary }]}>{`${summary.percent}%`}</Text>
          <View style={[styles.weeklyPlanProgressRing, { borderColor: theme.secondaryBand }]}>
            <View style={[styles.weeklyPlanProgressRingFill, { backgroundColor: theme.primary, height: `${Math.max(8, summary.percent)}%` }]} />
          </View>
        </View>
        <Ionicons name="chevron-forward" size={22} color={theme.muted} />
      </Pressable>
      <View style={[styles.weeklyPlanHomeStats, { borderTopColor: theme.border }]}>
        <View style={styles.weeklyPlanToday}>
          <Text style={[styles.weeklyPlanTodayLabel, { color: theme.text }]}>
            {t(dayKeys[getWeeklyPlanDay(new Date())])}
          </Text>
          {todayItem ? (
            <Pressable
              accessibilityLabel={`${t("showDetails")}: ${todayItem.workout.name}`}
              accessibilityRole="link"
              hitSlop={6}
              style={styles.weeklyPlanTodayLink}
              onPress={(event) => {
                event.stopPropagation();
                onOpenWorkout(todayItem.workout.id);
              }}
            >
              <Text style={[styles.weeklyPlanTodayName, { color: theme.primary }]} numberOfLines={1}>
                {todayItem.workout.name}
              </Text>
              <Ionicons name="chevron-forward" size={15} color={theme.primary} />
            </Pressable>
          ) : (
            <Text style={[styles.weeklyPlanTodayName, { color: theme.text }]} numberOfLines={1}>
              {t("noWorkout")}
            </Text>
          )}
        </View>
      </View>
      <View style={[styles.weeklyMuscleVolumeSection, { borderTopColor: theme.border }]}>
        <Pressable
          accessibilityRole="button"
          style={styles.weeklyMuscleVolumeHeader}
          onPress={() => setIsVolumeExpanded((current) => !current)}
        >
          <View style={[styles.weeklyMuscleVolumeIcon, { backgroundColor: theme.primary }]}>
            <Ionicons name="body-outline" size={18} color={theme.white} />
          </View>
          <Text style={[styles.weeklyMuscleVolumeTitle, { color: theme.text }]}>
            {t("weeklyMuscleVolumeTitle")}
          </Text>
          <Ionicons name={isVolumeExpanded ? "chevron-up" : "chevron-down"} size={20} color={theme.primary} />
        </Pressable>

        {isVolumeExpanded ? (
          <View style={styles.weeklyMuscleVolumeContent}>
            <WeeklyMuscleVolumeControls
              layout={volumeLayout}
              mode={volumeMode}
              side={volumeSide}
              t={t}
              theme={theme}
              onModeChange={setVolumeMode}
              onSideChange={setVolumeSide}
            />
            {volumeMode === "projected" ? (
              <Text style={[styles.weeklyMuscleVolumePlanHint, { color: theme.muted }]}>{t("weeklyMuscleVolumePlanHint")}</Text>
            ) : null}
            {!volumeSummary.hasActivity ? (
              <View style={styles.weeklyMuscleVolumeEmpty}>
                <View style={styles.weeklyMuscleVolumeEmptyCopyWrap}>
                  <Text style={[styles.weeklyMuscleVolumeEmptyTitle, { color: theme.text }]}>{t("weeklyMuscleVolumeNoData")}</Text>
                  <Text style={[styles.weeklyMuscleVolumeEmptyCopy, { color: theme.muted }]}>{t("weeklyMuscleVolumeNoDataCopy")}</Text>
                </View>
                <View
                  style={[
                    styles.weeklyMuscleVolumeFigureWrap,
                    { backgroundColor: theme.control, borderColor: theme.border, width: volumeLayout.anatomyWidth }
                  ]}
                >
                  <HumanMuscleFigure
                    fill={() => theme.secondaryBand}
                    language={language}
                    side={volumeSide}
                    style={{ height: volumeLayout.anatomyHeight, maxWidth: "100%", width: volumeLayout.anatomyWidth - 4 }}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.weeklyMuscleVolumeDashboard}>
                <WeeklyMuscleVolumeList
                  advancedMuscleMode={advancedMuscleMode}
                  entries={visibleVolumeEntries}
                  expandedAdvancedGroups={expandedAdvancedGroups}
                  hiddenGroups={hiddenVolumeGroups}
                  language={language}
                  mode={volumeMode}
                  onToggleAdvancedGroup={(group) => setExpandedAdvancedGroups((current) => toggleWeeklyMuscleGroup(current, group))}
                  onToggleGroup={(group) => setHiddenVolumeGroups((current) => toggleWeeklyMuscleGroup(current, group))}
                  rowMetaStacked={volumeLayout.rowMetaStacked}
                  side={volumeSide}
                  t={t}
                  theme={theme}
                />
                <WeeklyMuscleAnatomy
                  entryByMuscle={entryByMuscle}
                  hiddenGroups={hiddenVolumeGroups}
                  language={language}
                  layout={volumeLayout}
                  mode={volumeMode}
                  side={volumeSide}
                  t={t}
                  theme={theme}
                />
              </View>
            )}

            <Pressable accessibilityRole="button" style={styles.weeklyMuscleVolumeInfoButton} onPress={() => setShowVolumeInfo((current) => !current)}>
              <Ionicons name="information-circle-outline" size={18} color={theme.muted} />
              <Text style={[styles.weeklyMuscleVolumeInfoButtonText, { color: theme.muted }]}>
                {showVolumeInfo ? t("close") : t("weeklyMuscleVolumeAbout")}
              </Text>
            </Pressable>
            {showVolumeInfo ? (
              <Text style={[styles.weeklyMuscleVolumeInfo, { color: theme.muted, borderTopColor: theme.border }]}>{t("weeklyMuscleVolumeInfo")}</Text>
            ) : null}
            <Pressable accessibilityRole="button" style={[styles.weeklyMuscleVolumeCollapse, { borderTopColor: theme.border }]} onPress={() => setIsVolumeExpanded(false)}>
              <Text style={[styles.weeklyMuscleVolumeCollapseText, { color: theme.primary }]}>{t("weeklyMuscleVolumeCollapse")}</Text>
              <Ionicons name="chevron-up" size={17} color={theme.primary} />
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}
