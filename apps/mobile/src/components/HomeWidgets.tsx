import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { AppButton } from "./AppControls";
import {
  formatWeekRange,
  getCurrentWeekRange,
  getWeeklyPlanDay,
  type WeeklyPlanSummary
} from "../domain/weeklyPlan";
import type { WorkoutSession } from "../domain/workoutSessions";
import { getSystemStatusCopy, type SystemStatusState } from "../domain/systemStatus";
import type { LanguageCode, TranslationKey } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

type CommonProps = {
  t: (key: TranslationKey) => string;
  theme: Theme;
};

type WorkoutCreatorButtonProps = CommonProps & {
  isPending: boolean;
  isUserAuthenticated: boolean;
  onOpen: () => void;
  showLoginTooltip: boolean;
};

export function WorkoutCreatorButton({
  isPending,
  isUserAuthenticated,
  onOpen,
  showLoginTooltip,
  t,
  theme
}: WorkoutCreatorButtonProps) {
  const needsLogin = !isUserAuthenticated;
  const label = isPending
    ? t("workoutCreatorPendingCta")
    : needsLogin
      ? t("workoutCreatorLoginCta")
      : t("workoutCreatorCta");
  const button = (
    <AppButton
      disabled={isPending || needsLogin}
      icon={isPending ? "hourglass-outline" : needsLogin ? "lock-closed-outline" : "sparkles-outline"}
      style={styles.workoutCreatorButton}
      theme={theme}
      onPress={onOpen}
    >
      {label}
    </AppButton>
  );

  return (
    <View style={styles.workoutCreatorButtonWrap}>
      {needsLogin && !isPending ? (
        <Pressable accessibilityRole="button" onPress={onOpen}>
          {button}
        </Pressable>
      ) : button}
      {needsLogin && showLoginTooltip ? (
        <View pointerEvents="none" style={styles.creatorLoginTooltip}>
          <View style={[styles.creatorLoginTooltipBubble, { backgroundColor: theme.primaryStrong }]}>
            <Text style={[styles.creatorLoginTooltipText, { color: theme.white }]}>
              {t("workoutCreatorLoginTooltip")}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
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

type SystemStatusCalloutProps = {
  isRefreshing: boolean;
  language: LanguageCode;
  onRefresh: () => void;
  status: SystemStatusState;
  theme: Theme;
};

export function SystemStatusCallout({
  isRefreshing,
  language,
  onRefresh,
  status,
  theme
}: SystemStatusCalloutProps) {
  const copy = getSystemStatusCopy(status, language);
  if (!copy) {
    return null;
  }
  const statusKind = status.kind === "ok" ? "degraded" : status.kind;
  const statusIcons: Record<Exclude<SystemStatusState["kind"], "ok">, keyof typeof Ionicons.glyphMap> = {
    degraded: "information-circle-outline",
    maintenance: "construct-outline",
    offline: "cloud-offline-outline",
    update: "refresh-circle-outline"
  };

  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        styles.systemStatusCallout,
        { backgroundColor: theme.card, borderColor: statusKind === "offline" ? theme.primary : theme.border }
      ]}
    >
      <View style={[styles.systemStatusIcon, { backgroundColor: theme.secondaryBand }]}>
        <Ionicons name={statusIcons[statusKind]} size={22} color={theme.primary} />
      </View>
      <View style={styles.systemStatusCopy}>
        <Text style={[styles.systemStatusTitle, { color: theme.text }]}>{copy.title}</Text>
        <Text style={[styles.systemStatusDescription, { color: theme.muted }]}>{copy.description}</Text>
        <Pressable
          accessibilityRole="button"
          disabled={isRefreshing}
          style={styles.systemStatusAction}
          onPress={onRefresh}
        >
          <Ionicons name="refresh-outline" size={16} color={theme.primary} />
          <Text style={[styles.systemStatusActionText, { color: theme.primary }]}>
            {isRefreshing ? `${copy.cta}...` : copy.cta}
          </Text>
        </Pressable>
      </View>
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
};

export function WeeklyPlanHomeCard({
  language,
  onOpenPlan,
  onOpenWorkout,
  savedWorkoutCount,
  summary,
  t,
  theme
}: WeeklyPlanHomeCardProps) {
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
    monday: "mondayShort",
    tuesday: "tuesdayShort",
    wednesday: "wednesdayShort",
    thursday: "thursdayShort",
    friday: "fridayShort",
    saturday: "saturdayShort",
    sunday: "sundayShort"
  };

  return (
    <Pressable
      accessibilityRole="button"
      style={[styles.weeklyPlanHomeCard, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={onOpenPlan}
    >
      <View style={styles.weeklyPlanHomeTop}>
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
      </View>
      <View style={[styles.weeklyPlanHomeStats, { borderTopColor: theme.border }]}>
        <View style={styles.weeklyPlanHomeStat}>
          <Ionicons name="checkmark-circle" size={21} color={theme.primary} />
          <Text style={[styles.weeklyPlanStatNumber, { color: theme.text }]}>{summary.completed}</Text>
          <Text style={[styles.weeklyPlanStatLabel, { color: theme.muted }]}>{t("completed")}</Text>
        </View>
        <View style={[styles.weeklyPlanStatDivider, { backgroundColor: theme.border }]} />
        <View style={styles.weeklyPlanHomeStat}>
          <Ionicons name="ellipse-outline" size={21} color={theme.secondaryBand} />
          <Text style={[styles.weeklyPlanStatNumber, { color: theme.text }]}>{summary.remaining}</Text>
          <Text style={[styles.weeklyPlanStatLabel, { color: theme.muted }]}>{t("toDo")}</Text>
        </View>
        <View style={[styles.weeklyPlanStatDivider, { backgroundColor: theme.border }]} />
        <View style={styles.weeklyPlanToday}>
          <Text style={[styles.weeklyPlanTodayLabel, { color: theme.muted }]}>
            {`${t("today")}: ${t(dayKeys[getWeeklyPlanDay(new Date())])}`}
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
              {t("todayNoWorkout")}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}
