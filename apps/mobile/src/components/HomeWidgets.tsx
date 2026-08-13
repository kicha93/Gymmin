import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { AppButton } from "./AppControls";
import { HumanMuscleFigure } from "./WorkoutPresentation";
import type { MuscleKey } from "../domain/exercises";
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
  type WeeklyMuscleVolumeStatus,
  type WeeklyMuscleVolumeSummary
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

const weeklyMuscleStatusKeys: Record<WeeklyMuscleVolumeStatus, TranslationKey> = {
  below: "weeklyMuscleVolumeStatusBelow",
  high: "weeklyMuscleVolumeStatusHigh",
  inRange: "weeklyMuscleVolumeStatusInRange",
  near: "weeklyMuscleVolumeStatusNear",
  none: "weeklyMuscleVolumeStatusNone"
};

function getVolumeStatusColor(status: WeeklyMuscleVolumeStatus, theme: Theme) {
  switch (status) {
    case "below": return "#e58a19";
    case "near": return "#d5ab32";
    case "inRange": return theme.primary;
    case "high": return "#687b79";
    default: return theme.secondaryBand;
  }
}

function getEntryValue(entry: WeeklyMuscleVolumeEntry, mode: WeeklyMuscleVolumeMode) {
  return mode === "completed" ? entry.completedSets : entry.projectedSets;
}

function getEntryStatus(entry: WeeklyMuscleVolumeEntry, mode: WeeklyMuscleVolumeMode) {
  return mode === "completed" ? entry.completedStatus : entry.projectedStatus;
}

export function WeeklyPlanHomeCard({
  language,
  onOpenPlan,
  onOpenWorkout,
  savedWorkoutCount,
  summary,
  volumeSummary,
  t,
  theme
}: WeeklyPlanHomeCardProps) {
  const [isVolumeExpanded, setIsVolumeExpanded] = useState(false);
  const [showVolumeInfo, setShowVolumeInfo] = useState(false);
  const [volumeMode, setVolumeMode] = useState<WeeklyMuscleVolumeMode>("completed");
  const [volumeSide, setVolumeSide] = useState<WeeklyMuscleVolumeSide>("front");
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
  const entryByMuscle = useMemo(() => {
    const map = new Map<MuscleKey, WeeklyMuscleVolumeEntry>();
    for (const entry of volumeSummary.entries) {
      for (const muscle of entry.muscleKeys) map.set(muscle, entry);
    }
    return map;
  }, [volumeSummary.entries]);

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
            {isVolumeExpanded ? t("weeklyMuscleVolumeTitle") : t("weeklyMuscleVolumeAction")}
          </Text>
          <Ionicons name={isVolumeExpanded ? "chevron-up" : "chevron-down"} size={20} color={theme.primary} />
        </Pressable>

        {isVolumeExpanded ? (
          <View style={styles.weeklyMuscleVolumeContent}>
            <View style={[styles.weeklyMuscleVolumeSegments, { backgroundColor: theme.segment }]}>
              {(["completed", "projected"] as const).map((mode) => {
                const selected = volumeMode === mode;
                return (
                  <Pressable
                    key={mode}
                    accessibilityRole="button"
                    style={[styles.weeklyMuscleVolumeSegment, selected ? { backgroundColor: theme.primary } : null]}
                    onPress={() => setVolumeMode(mode)}
                  >
                    <Text style={[styles.weeklyMuscleVolumeSegmentText, { color: selected ? theme.white : theme.text }]}>
                      {t(mode === "completed" ? "weeklyMuscleVolumeCompleted" : "weeklyMuscleVolumePlan")}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {volumeMode === "projected" ? (
              <Text style={[styles.weeklyMuscleVolumePlanHint, { color: theme.muted }]}>{t("weeklyMuscleVolumePlanHint")}</Text>
            ) : null}
            <View style={[styles.weeklyMuscleVolumeSegments, { backgroundColor: theme.segment }]}>
              {(["front", "back"] as const).map((side) => {
                const selected = volumeSide === side;
                return (
                  <Pressable
                    key={side}
                    accessibilityRole="button"
                    style={[styles.weeklyMuscleVolumeSegment, selected ? { backgroundColor: theme.primary } : null]}
                    onPress={() => setVolumeSide(side)}
                  >
                    <Text style={[styles.weeklyMuscleVolumeSegmentText, { color: selected ? theme.white : theme.text }]}>
                      {t(side === "front" ? "bodyFront" : "bodyBack")}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {!volumeSummary.hasActivity ? (
              <View style={styles.weeklyMuscleVolumeEmpty}>
                <HumanMuscleFigure fill={() => theme.secondaryBand} side={volumeSide} style={styles.weeklyMuscleVolumeEmptyFigure} />
                <Text style={[styles.weeklyMuscleVolumeEmptyTitle, { color: theme.text }]}>{t("weeklyMuscleVolumeNoData")}</Text>
                <Text style={[styles.weeklyMuscleVolumeEmptyCopy, { color: theme.muted }]}>{t("weeklyMuscleVolumeNoDataCopy")}</Text>
              </View>
            ) : (
              <View style={styles.weeklyMuscleVolumeDashboard}>
                <View style={styles.weeklyMuscleVolumeRows}>
                  {visibleVolumeEntries.map((entry) => {
                    const value = getEntryValue(entry, volumeMode);
                    const status = getEntryStatus(entry, volumeMode);
                    const color = getVolumeStatusColor(status, theme);
                    const progress = Math.min(100, (value / entry.targetMax) * 100);
                    return (
                      <View key={entry.id} style={styles.weeklyMuscleVolumeRow}>
                        <View style={styles.weeklyMuscleVolumeRowTop}>
                          <View style={styles.weeklyMuscleVolumeNameWrap}>
                            <View style={[styles.weeklyMuscleVolumeDot, { backgroundColor: color }]} />
                            <Text style={[styles.weeklyMuscleVolumeName, { color: theme.text }]}>{t(weeklyMuscleLabelKeys[entry.id])}</Text>
                          </View>
                          <Text style={[styles.weeklyMuscleVolumeValue, { color: theme.text }]}>
                            {`${formatWeeklyMuscleSets(value)} / ${entry.targetMin}–${entry.targetMax} ${t("weeklyMuscleVolumeSets")}`}
                          </Text>
                        </View>
                        <View style={styles.weeklyMuscleVolumeRowBottom}>
                          <View style={[styles.weeklyMuscleVolumeTrack, { backgroundColor: theme.secondaryBand }]}>
                            <View style={[styles.weeklyMuscleVolumeTargetBand, { backgroundColor: theme.border }]} />
                            <View style={[styles.weeklyMuscleVolumeFill, { backgroundColor: color, width: `${progress}%` }]} />
                          </View>
                          <View style={[styles.weeklyMuscleVolumeBadge, { backgroundColor: `${color}22` }]}>
                            <Text style={[styles.weeklyMuscleVolumeBadgeText, { color }]}>{t(weeklyMuscleStatusKeys[status])}</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
                <View style={styles.weeklyMuscleVolumeFigureWrap}>
                  <HumanMuscleFigure
                    side={volumeSide}
                    style={styles.weeklyMuscleVolumeFigure}
                    fill={(muscle) => {
                      const entry = entryByMuscle.get(muscle);
                      return entry ? getVolumeStatusColor(getEntryStatus(entry, volumeMode), theme) : theme.secondaryBand;
                    }}
                  />
                </View>
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
