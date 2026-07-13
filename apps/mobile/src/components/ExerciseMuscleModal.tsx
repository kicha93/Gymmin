import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Modal, Text, View } from "react-native";

import { AppButton } from "./AppControls";
import { HumanMuscleFigure, type MuscleUsage } from "./WorkoutPresentation";
import {
  getExerciseDisplayName,
  muscleKeys,
  muscleLabels,
  type MuscleKey
} from "../domain/exercises";
import { getWorkoutStepMuscleGroups } from "../domain/workoutExerciseSummary";
import type { WorkoutStep } from "../domain/workouts";
import type { LanguageCode, TranslationKey } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

type ExerciseMuscleModalProps = {
  language: LanguageCode;
  onClose: () => void;
  onShowDetails?: (step: WorkoutStep) => void;
  step: WorkoutStep | null;
  t: (key: TranslationKey) => string;
  theme: Theme;
};

export function ExerciseMuscleModal({ language, onClose, onShowDetails, step, t, theme }: ExerciseMuscleModalProps) {
  const muscleGroups = useMemo(() => step ? getWorkoutStepMuscleGroups(step) : { primary: [], secondary: [] }, [step]);
  const usage = useMemo(() => {
    const nextUsage = Object.fromEntries(muscleKeys.map((muscle) => [muscle, 0])) as MuscleUsage;
    muscleGroups.primary.forEach((muscle) => {
      nextUsage[muscle] = 2;
    });
    muscleGroups.secondary.forEach((muscle) => {
      nextUsage[muscle] = Math.max(nextUsage[muscle], 1) as 0 | 1 | 2;
    });
    return nextUsage;
  }, [muscleGroups.primary, muscleGroups.secondary]);
  const hasMuscleData = muscleGroups.primary.length > 0 || muscleGroups.secondary.length > 0;
  const exerciseName = step?.exerciseName
    ? getExerciseDisplayName(step.exerciseName, language)
    : t("exercise");
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

  function formatMuscleList(muscles: MuscleKey[]) {
    return muscles.length ? muscles.map((muscle) => muscleLabels[language][muscle]).join(", ") : t("noData");
  }

  return (
    <Modal animationType="fade" transparent visible={Boolean(step)} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.exerciseMuscleModal, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.panelHeroHeader}>
            <View style={[styles.legalIcon, { backgroundColor: theme.secondaryBand }]}>
              <Ionicons name="body-outline" size={26} color={theme.primary} />
            </View>
            <View style={styles.workoutInfo}>
              <Text style={[styles.creatorPromptTitle, { color: theme.text }]}>{t("workedMuscles")}</Text>
              <Text style={[styles.creatorDescription, { color: theme.muted }]}>{exerciseName}</Text>
            </View>
          </View>

          {hasMuscleData ? (
            <>
              <View style={styles.exerciseMuscleLists}>
                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: theme.muted }]}>{t("primaryMuscles")}</Text>
                  <Text style={[styles.workoutName, { color: theme.text }]}>{formatMuscleList(muscleGroups.primary)}</Text>
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: theme.muted }]}>{t("secondaryMuscles")}</Text>
                  <Text style={[styles.workoutName, { color: theme.text }]}>{formatMuscleList(muscleGroups.secondary)}</Text>
                </View>
              </View>
              <View style={styles.muscleOverviewFigures}>
                <HumanMuscleFigure fill={fill} side="front" />
                <HumanMuscleFigure fill={fill} side="back" />
              </View>
            </>
          ) : (
            <Text style={[styles.emptyBuilderCopy, { color: theme.muted }]}>
              {t("noExerciseMuscleData")}
            </Text>
          )}

          {step && onShowDetails ? (
            <AppButton icon="information-circle-outline" theme={theme} onPress={() => onShowDetails(step)}>
              {t("showDetails")}
            </AppButton>
          ) : null}
          <AppButton icon="close-outline" theme={theme} variant="outline" onPress={onClose}>
            {t("close")}
          </AppButton>
        </View>
      </View>
    </Modal>
  );
}

