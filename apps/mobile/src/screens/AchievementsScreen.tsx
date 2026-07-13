import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Image, Modal, Pressable, Text, View } from "react-native";
import type { ImageSourcePropType } from "react-native";

import type { AchievementProgress } from "../domain/achievements";
import type { LanguageCode, TranslationKey } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

type AchievementFilter = "all" | "unlocked" | "locked";

type AchievementsScreenProps = {
  formatDateTime: (value: string) => string;
  language: LanguageCode;
  progress: AchievementProgress[];
  t: (key: TranslationKey) => string;
  theme: Theme;
};

const achievementImageSources: Record<string, ImageSourcePropType> = {
  "fifty-training-hours": require("../../assets/achievements/fifty-training-hours.png"),
  "fifty-tons-volume": require("../../assets/achievements/fifty-tons-volume.png"),
  "fifty-two-week-streak": require("../../assets/achievements/fifty-two-week-streak.png"),
  "fifty-unique-exercises": require("../../assets/achievements/fifty-unique-exercises.png"),
  "fifty-workouts": require("../../assets/achievements/fifty-workouts.png"),
  "first-workout": require("../../assets/achievements/first-workout.png"),
  "five-hundred-tons-volume": require("../../assets/achievements/five-hundred-tons-volume.png"),
  "five-hundred-workouts": require("../../assets/achievements/five-hundred-workouts.png"),
  "five-workouts": require("../../assets/achievements/five-workouts.png"),
  "five-workouts-single-week": require("../../assets/achievements/five-workouts-single-week.png"),
  "hundred-training-days": require("../../assets/achievements/hundred-training-days.png"),
  "hundred-training-hours": require("../../assets/achievements/hundred-training-hours.png"),
  "hundred-tons-volume": require("../../assets/achievements/hundred-tons-volume.png"),
  "hundred-unique-exercises": require("../../assets/achievements/hundred-unique-exercises.png"),
  "hundred-workouts": require("../../assets/achievements/hundred-workouts.png"),
  "one-ton-volume": require("../../assets/achievements/one-ton-volume.png"),
  "seven-training-days": require("../../assets/achievements/seven-training-days.png"),
  "ten-app-hours": require("../../assets/achievements/ten-app-hours.png"),
  "ten-training-hours": require("../../assets/achievements/ten-training-hours.png"),
  "ten-tons-volume": require("../../assets/achievements/ten-tons-volume.png"),
  "ten-unique-exercises": require("../../assets/achievements/ten-unique-exercises.png"),
  "ten-workouts": require("../../assets/achievements/ten-workouts.png"),
  "thirty-training-days": require("../../assets/achievements/thirty-training-days.png"),
  "thirty-unique-exercises": require("../../assets/achievements/thirty-unique-exercises.png"),
  "three-week-streak": require("../../assets/achievements/three-week-streak.png"),
  "three-workouts-single-week": require("../../assets/achievements/three-workouts-single-week.png"),
  "twelve-week-streak": require("../../assets/achievements/twelve-week-streak.png"),
  "twenty-five-workouts": require("../../assets/achievements/twenty-five-workouts.png"),
  "two-hundred-fifty-tons-volume": require("../../assets/achievements/two-hundred-fifty-tons-volume.png"),
  "two-hundred-fifty-workouts": require("../../assets/achievements/two-hundred-fifty-workouts.png")
};

const achievementIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  barbell: "barbell-outline",
  calendar: "calendar-outline",
  "calendar-number": "calendar-number-outline",
  compass: "compass-outline",
  construct: "construct-outline",
  cube: "cube-outline",
  fitness: "fitness-outline",
  flame: "flame-outline",
  hammer: "hammer-outline",
  hourglass: "hourglass-outline",
  layers: "layers-outline",
  library: "library-outline",
  medal: "medal-outline",
  "phone-portrait": "phone-portrait-outline",
  pulse: "pulse-outline",
  ribbon: "ribbon-outline",
  shield: "shield-checkmark-outline",
  trophy: "trophy-outline",
  "trending-up": "trending-up-outline"
};

export function AchievementsScreen({ formatDateTime, language, progress, t, theme }: AchievementsScreenProps) {
  const [filter, setFilter] = useState<AchievementFilter>("all");
  const [preview, setPreview] = useState<{ imageSource: ImageSourcePropType; title: string } | null>(null);
  const unlockedCount = progress.filter((item) => item.unlocked).length;
  const visibleAchievements = useMemo(() => filterAndSortAchievements(progress, filter), [filter, progress]);
  const filters: Array<{ label: string; value: AchievementFilter }> = [
    { label: t("achievementsAll"), value: "all" },
    { label: t("achievementsUnlocked"), value: "unlocked" },
    { label: t("achievementsLocked"), value: "locked" }
  ];

  return (
    <>
      <View style={styles.profileScreen}>
        <View style={[styles.legalPanel, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.legalContent}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {unlockedCount}/{progress.length} {t("achievementsUnlocked").toLowerCase()}
            </Text>
            <AchievementProgressBar
              percent={progress.length ? (unlockedCount / progress.length) * 100 : 0}
              theme={theme}
            />
          </View>
        </View>

        <View style={styles.segmentedControl}>
          {filters.map((item) => {
            const selected = filter === item.value;
            return (
              <Pressable
                key={item.value}
                accessibilityRole="button"
                style={[
                  styles.segmentButton,
                  { backgroundColor: selected ? theme.primary : theme.segment }
                ]}
                onPress={() => setFilter(item.value)}
              >
                <Text style={[styles.segmentButtonText, { color: selected ? theme.white : theme.text }]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.achievementList}>
          {visibleAchievements.map((item) => (
            <AchievementCard
              key={item.definition.id}
              formatDateTime={formatDateTime}
              language={language}
              progress={item}
              t={t}
              theme={theme}
              onPreview={setPreview}
            />
          ))}
        </View>
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={Boolean(preview)}
        onRequestClose={() => setPreview(null)}
      >
        <Pressable
          accessibilityLabel={t("close")}
          accessibilityRole="button"
          style={styles.achievementPreviewBackdrop}
          onPress={() => setPreview(null)}
        >
          {preview ? (
            <Image
              accessibilityIgnoresInvertColors
              accessibilityLabel={preview.title}
              resizeMode="contain"
              source={preview.imageSource}
              style={styles.achievementPreviewImage}
            />
          ) : null}
        </Pressable>
      </Modal>
    </>
  );
}

function AchievementCard({
  formatDateTime,
  language,
  onPreview,
  progress,
  t,
  theme
}: {
  formatDateTime: (value: string) => string;
  language: LanguageCode;
  onPreview: (preview: { imageSource: ImageSourcePropType; title: string }) => void;
  progress: AchievementProgress;
  t: (key: TranslationKey) => string;
  theme: Theme;
}) {
  const title = progress.definition.title[language];
  const description = progress.definition.description[language];
  const current = formatAchievementValue(Math.min(progress.current, progress.target), progress.definition.unit);
  const target = formatAchievementValue(progress.target, progress.definition.unit);
  const imageSource = progress.definition.imageKey
    ? achievementImageSources[progress.definition.imageKey]
    : undefined;
  const iconName = progress.definition.iconKey
    ? achievementIcons[progress.definition.iconKey] ?? "trophy-outline"
    : "trophy-outline";

  return (
    <View
      style={[
        styles.achievementCard,
        {
          backgroundColor: theme.card,
          borderColor: progress.unlocked ? theme.primary : theme.border
        }
      ]}
    >
      <View style={imageSource ? styles.achievementImageSlot : [styles.achievementIcon, { backgroundColor: theme.secondaryBand }]}>
        {imageSource ? (
          <Pressable
            accessibilityLabel={title}
            accessibilityRole="imagebutton"
            hitSlop={8}
            onPress={() => onPreview({ imageSource, title })}
          >
            <Image
              accessibilityIgnoresInvertColors
              resizeMode="contain"
              source={imageSource}
              style={[styles.achievementImage, { opacity: progress.unlocked ? 1 : 0.48 }]}
            />
          </Pressable>
        ) : (
          <Ionicons
            name={iconName}
            size={24}
            color={progress.unlocked ? theme.primary : theme.muted}
          />
        )}
      </View>
      <View style={styles.achievementCopy}>
        <View style={styles.achievementTitleRow}>
          <Text style={[styles.workoutName, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.achievementStatus, { color: progress.unlocked ? theme.primary : theme.muted }]}>
            {progress.unlocked ? t("achievementUnlockedStatus") : t("achievementLockedStatus")}
          </Text>
        </View>
        <Text style={[styles.workoutMeta, { color: theme.muted }]}>{description}</Text>
        <View style={styles.achievementProgressRow}>
          {progress.unlocked ? (
            <Text style={[styles.workoutMeta, { color: theme.primary }]}>{t("achievementUnlockedStatus")}</Text>
          ) : (
            <Text style={[styles.workoutMeta, { color: theme.text }]}>{current} / {target}</Text>
          )}
          {progress.unlockedAt ? (
            <Text style={[styles.workoutMeta, { color: theme.muted }]}>
              {t("unlockedAt")}: {formatDateTime(progress.unlockedAt)}
            </Text>
          ) : null}
        </View>
        <AchievementProgressBar
          percent={progress.percent}
          theme={theme}
          unlocked={progress.unlocked}
        />
      </View>
    </View>
  );
}

function AchievementProgressBar({ percent, theme, unlocked = false }: { percent: number; theme: Theme; unlocked?: boolean }) {
  return (
    <View style={[styles.achievementProgressTrack, { backgroundColor: theme.secondaryBand }]}>
      <View
        style={[
          styles.achievementProgressFill,
          {
            backgroundColor: unlocked ? theme.primary : theme.muted,
            width: `${Math.max(0, Math.min(100, percent))}%`
          }
        ]}
      />
    </View>
  );
}

function filterAndSortAchievements(progress: AchievementProgress[], filter: AchievementFilter) {
  return progress
    .filter((item) => {
      if (filter === "unlocked") {
        return item.unlocked;
      }

      if (filter === "locked") {
        return !item.unlocked;
      }

      return true;
    })
    .sort((left, right) => {
      if (filter === "all" && left.unlocked !== right.unlocked) {
        return left.unlocked ? -1 : 1;
      }

      if (left.unlocked && right.unlocked) {
        return Date.parse(right.unlockedAt ?? "") - Date.parse(left.unlockedAt ?? "");
      }

      return left.definition.sortOrder - right.definition.sortOrder;
    });
}

function formatAchievementValue(value: number, unit: AchievementProgress["definition"]["unit"]) {
  const safeValue = Math.max(0, value);
  if (unit === "tons" || unit === "hours") {
    return safeValue >= 10 ? safeValue.toFixed(0) : safeValue.toFixed(1).replace(/\.0$/, "");
  }

  return Math.floor(safeValue).toString();
}
