import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { Image, Modal, Pressable, ScrollView, Text, View } from "react-native";

import { CollapsiblePanel } from "../components/CollapsiblePanel";
import {
  AdvancedMuscleImpactGroups,
  getMuscleImpactColor,
  MuscleImpactLegend,
  MuscleImpactTextGroups
} from "../components/MuscleImpactPresentation";
import { HumanMuscleFigure } from "../components/WorkoutPresentation";
import { exerciseImageSources } from "../exerciseImageSources";
import { getExerciseDisplayName, muscleKeys, type MuscleKey } from "../domain/exercises";
import { getAdvancedAnatomyRegionLevels } from "../domain/advancedMuscles";
import { getExerciseProgressSummary, type WorkoutSession, type WorkoutSessionEntry } from "../domain/workoutSessions";
import { getExerciseDetails, getExerciseProgressKeyForDetails } from "../domain/workoutExerciseSummary";
import type { WorkoutStep } from "../domain/workouts";
import type { LanguageCode, TranslationKey } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

type ExerciseDetailScreenProps = {
  advancedMuscleMode: boolean;
  collapsedPanels: Record<string, boolean>;
  formatEntryActual: (entry: WorkoutSessionEntry) => string;
  formatNumber: (value: number | null | undefined, suffix?: string) => string;
  language: LanguageCode;
  muscleSide: "front" | "back";
  onChangeCollapsedPanels: Dispatch<SetStateAction<Record<string, boolean>>>;
  onChangeMuscleSide: (side: "front" | "back") => void;
  step: WorkoutStep | null;
  t: (key: TranslationKey) => string;
  theme: Theme;
  visibleWorkoutSessions: WorkoutSession[];
};

export function ExerciseDetailScreen({
  advancedMuscleMode,
  collapsedPanels,
  formatEntryActual,
  formatNumber,
  language,
  muscleSide,
  onChangeMuscleSide,
  onChangeCollapsedPanels,
  step,
  t,
  theme,
  visibleWorkoutSessions
}: ExerciseDetailScreenProps) {
    const details = step ? getExerciseDetails(step, language) : null;
    const progressKey = getExerciseProgressKeyForDetails(details);
    const progressSummary = progressKey ? getExerciseProgressSummary(visibleWorkoutSessions, progressKey) : null;
    const fallbackName = step?.exerciseName ? getExerciseDisplayName(step.exerciseName, language) : t("exerciseDetails");
    const displayName = details?.displayName ?? fallbackName;
    const imageAssetKeys = details?.imageAssetKeys ?? [];
    const imageSequenceKey = imageAssetKeys.join("|");
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
    const normalizedActiveImageIndex = activeImageIndex % Math.max(imageAssetKeys.length, 1);
    const activeImageKey = imageAssetKeys[normalizedActiveImageIndex];
    const activeImageSource = activeImageKey ? exerciseImageSources[activeImageKey] : undefined;
    const muscleImpact = details?.exercise?.muscleImpact;
    const hasMuscleData = Boolean(muscleImpact && muscleKeys.some((muscle) => muscleImpact[muscle] > 0));
    const advancedRegionFills = advancedMuscleMode && details?.exercise?.id
      ? Object.fromEntries(Object.entries(getAdvancedAnatomyRegionLevels(details.exercise.id, muscleSide))
        .map(([regionId, level]) => [regionId, getMuscleImpactColor(level)]))
      : undefined;

    useEffect(() => {
      setActiveImageIndex(0);
      setIsImagePreviewOpen(false);

      if (imageAssetKeys.length < 2) {
        return undefined;
      }

      const interval = setInterval(() => {
        setActiveImageIndex((current) => (current + 1) % imageAssetKeys.length);
      }, 1000);

      return () => clearInterval(interval);
    }, [imageSequenceKey, imageAssetKeys.length]);

    function fill(muscle: MuscleKey) {
      return getMuscleImpactColor(muscleImpact?.[muscle]);
    }

    function isExerciseDetailPanelCollapsed(panelId: string, defaultValue: boolean) {
      return collapsedPanels[panelId] ?? defaultValue;
    }

    function toggleExerciseDetailPanel(panelId: string, defaultValue: boolean) {
      onChangeCollapsedPanels((current) => ({
        ...current,
        [panelId]: !(current[panelId] ?? defaultValue)
      }));
    }

    function renderExerciseDetailBulletList(items: string[], fallback: string, markerColor = theme.primary) {
      if (!items.length) {
        return <Text style={[styles.workoutDetailNotes, { color: theme.muted }]}>{fallback}</Text>;
      }

      return (
        <View style={styles.exerciseDetailBulletList}>
          {items.map((item, index) => (
            <View key={`${index}-${item}`} style={styles.exerciseDetailBulletRow}>
              <Text style={[styles.exerciseDetailBulletMarker, { color: markerColor }]}>•</Text>
              <Text style={[styles.workoutDetailNotes, styles.exerciseDetailBulletText, { color: theme.muted }]}>
                {item}
              </Text>
            </View>
          ))}
        </View>
      );
    }

    function renderExerciseDetailSteps(items: string[], fallback: string) {
      if (!items.length) {
        return <Text style={[styles.workoutDetailNotes, { color: theme.muted }]}>{fallback}</Text>;
      }

      return (
        <View style={styles.exerciseDetailStepList}>
          {items.map((item, index) => (
            <View key={`${index}-${item}`} style={styles.exerciseDetailStepRow}>
              <View style={[styles.exerciseDetailStepBadge, { backgroundColor: theme.primary }]}>
                <Text style={styles.exerciseDetailStepBadgeText}>{index + 1}</Text>
              </View>
              <Text style={[styles.workoutDetailNotes, styles.exerciseDetailStepText, { color: theme.muted }]}>
                {item}
              </Text>
            </View>
          ))}
        </View>
      );
    }

    return (
      <View style={styles.historyScreen}>
        <View style={[styles.exerciseDetailCompactCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.exerciseDetailMusclesHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{displayName}</Text>
          </View>
          {hasMuscleData ? (
            <View style={styles.exerciseDetailSideToggle}>
              {([
                { label: t("bodyFront"), value: "front" as const },
                { label: t("bodyBack"), value: "back" as const }
              ]).map((option) => {
                const selected = muscleSide === option.value;

                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    style={[
                      styles.exerciseDetailSideButton,
                      {
                        backgroundColor: selected ? theme.primary : theme.card,
                        borderColor: selected ? theme.primary : theme.border
                      }
                    ]}
                    onPress={() => onChangeMuscleSide(option.value)}
                  >
                    <Text style={[styles.exerciseDetailSideButtonText, { color: selected ? theme.white : theme.text }]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          {hasMuscleData ? (
            <>
              <View style={styles.exerciseDetailMuscleContent}>
                {muscleImpact ? (advancedMuscleMode && details?.exercise?.id ?
                  <AdvancedMuscleImpactGroups
                    exerciseId={details.exercise.id}
                    impact={muscleImpact}
                    language={language}
                    side={muscleSide}
                    t={t}
                    theme={theme}
                  /> :
                  <MuscleImpactTextGroups impact={muscleImpact} language={language} t={t} theme={theme} />
                ) : null}
                <View style={styles.exerciseDetailSingleFigure}>
                  <HumanMuscleFigure
                    advancedRegionFills={advancedRegionFills}
                    fill={fill}
                    language={language}
                    side={muscleSide}
                    style={styles.exerciseDetailHumanFigure}
                  />
                </View>
              </View>
              {muscleImpact ? <MuscleImpactLegend impact={muscleImpact} t={t} theme={theme} /> : null}
            </>
          ) : (
            <Text style={[styles.emptyBuilderCopy, { color: theme.muted }]}>{t("noExerciseMuscleData")}</Text>
          )}
        </View>

        {activeImageSource ? (
          <View style={[styles.exerciseDetailCompactCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.workoutName, { color: theme.text }]}>{t("exerciseExecution")}</Text>
            <View style={styles.exerciseImageStrip}>
              <Pressable
                accessibilityLabel={t("tapToEnlargeExerciseImage")}
                accessibilityRole="button"
                onPress={() => setIsImagePreviewOpen(true)}
                style={[styles.exerciseImageFrame, { backgroundColor: theme.secondaryBand, borderColor: theme.border }]}
              >
                <Image
                  accessibilityLabel={displayName}
                  source={activeImageSource}
                  style={styles.exerciseDetailImage}
                  resizeMode="contain"
                />
                <View style={[styles.exerciseImageZoomIcon, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Ionicons name="expand-outline" size={17} color={theme.primary} />
                </View>
              </Pressable>
              <Text style={[styles.exerciseImageHint, { color: theme.muted }]}>{t("tapToEnlargeExerciseImage")}</Text>
            </View>
          </View>
        ) : null}

        {activeImageSource ? (
          <Modal animationType="fade" transparent visible={isImagePreviewOpen} onRequestClose={() => setIsImagePreviewOpen(false)}>
            <Pressable
              accessibilityLabel={t("close")}
              accessibilityRole="button"
              onPress={() => setIsImagePreviewOpen(false)}
              style={styles.achievementPreviewBackdrop}
            >
              <View style={[styles.exerciseImagePreviewSurface, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Image source={activeImageSource} style={styles.exerciseImagePreview} resizeMode="contain" />
              </View>
            </Pressable>
          </Modal>
        ) : null}

        <CollapsiblePanel
          collapseLabel={t("collapse")}
          expandLabel={t("expand")}
          isCollapsed={isExerciseDetailPanelCollapsed("howTo", false)}
          theme={theme}
          title={t("howToPerform")}
          onToggle={() => toggleExerciseDetailPanel("howTo", false)}
        >
          {renderExerciseDetailSteps(
            details?.instructions ?? [],
            t("techniquePlaceholder")
          )}
        </CollapsiblePanel>

        <CollapsiblePanel
          collapseLabel={t("collapse")}
          expandLabel={t("expand")}
          isCollapsed={isExerciseDetailPanelCollapsed("tips", true)}
          theme={theme}
          title={t("tips")}
          onToggle={() => toggleExerciseDetailPanel("tips", true)}
        >
          {renderExerciseDetailBulletList(details?.techniqueTips ?? [], t("tipsPlaceholder"))}
        </CollapsiblePanel>

        <CollapsiblePanel
          collapseLabel={t("collapse")}
          expandLabel={t("expand")}
          isCollapsed={isExerciseDetailPanelCollapsed("mistakes", true)}
          theme={theme}
          title={t("commonMistakes")}
          onToggle={() => toggleExerciseDetailPanel("mistakes", true)}
        >
          {renderExerciseDetailBulletList(details?.commonMistakes ?? [], t("commonMistakesPlaceholder"), theme.danger)}
        </CollapsiblePanel>

        <CollapsiblePanel
          collapseLabel={t("collapse")}
          expandLabel={t("expand")}
          isCollapsed={isExerciseDetailPanelCollapsed("history", !progressSummary)}
          theme={theme}
          title={t("exerciseHistory")}
          onToggle={() => toggleExerciseDetailPanel("history", !progressSummary)}
        >
          {progressSummary ? (
            <View style={styles.exerciseDetailHistoryGrid}>
              <View style={[styles.exerciseDetailHistoryTile, { backgroundColor: theme.secondaryBand }]}>
                <Text style={[styles.label, { color: theme.muted }]}>{t("last")}</Text>
                <Text style={[styles.workoutMeta, { color: theme.text }]}>{formatEntryActual(progressSummary.lastResult.entry)}</Text>
              </View>
              <View style={[styles.exerciseDetailHistoryTile, { backgroundColor: theme.secondaryBand }]}>
                <Text style={[styles.label, { color: theme.muted }]}>{t("bestWeight")}</Text>
                <Text style={[styles.workoutMeta, { color: theme.text }]}>{formatNumber(progressSummary.bestWeight, "kg")}</Text>
              </View>
              <View style={[styles.exerciseDetailHistoryTile, { backgroundColor: theme.secondaryBand }]}>
                <Text style={[styles.label, { color: theme.muted }]}>{t("bestVolume")}</Text>
                <Text style={[styles.workoutMeta, { color: theme.text }]}>{formatNumber(progressSummary.bestVolumeSingleEntry, "kg")}</Text>
              </View>
              <View style={[styles.exerciseDetailHistoryTile, { backgroundColor: theme.secondaryBand }]}>
                <Text style={[styles.label, { color: theme.muted }]}>{t("sessions")}</Text>
                <Text style={[styles.workoutMeta, { color: theme.text }]}>{progressSummary.results.length}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.workoutInfo}>
              <Text style={[styles.workoutMeta, { color: theme.text }]}>{t("exerciseHistoryEmpty")}</Text>
              <Text style={[styles.emptyBuilderCopy, { color: theme.muted }]}>{t("exerciseHistoryPlaceholder")}</Text>
            </View>
          )}
        </CollapsiblePanel>
      </View>
    );
  }
