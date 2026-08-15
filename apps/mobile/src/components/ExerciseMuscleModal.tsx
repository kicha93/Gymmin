import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Modal, ScrollView, Text, View } from "react-native";

import { AppButton } from "./AppControls";
import { getMuscleImpactColor, MuscleImpactTextGroups } from "./MuscleImpactPresentation";
import { HumanMuscleFigure } from "./WorkoutPresentation";
import {
  getExerciseDisplayName,
  muscleKeys,
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
  const muscleImpact = muscleGroups.exercise?.muscleImpact;
  const hasMuscleData = Boolean(muscleImpact && muscleKeys.some((muscle) => muscleImpact[muscle] > 0));
  const exerciseName = step?.exerciseName
    ? getExerciseDisplayName(step.exerciseName, language)
    : t("exercise");
  function fill(muscle: MuscleKey) {
    return getMuscleImpactColor(muscleImpact?.[muscle]);
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
            <ScrollView
              contentContainerStyle={styles.exerciseMuscleModalContent}
              showsVerticalScrollIndicator={false}
            >
              {muscleImpact ? <MuscleImpactTextGroups impact={muscleImpact} language={language} t={t} theme={theme} /> : null}
              <View style={styles.muscleOverviewFigures}>
                <HumanMuscleFigure fill={fill} language={language} side="front" />
                <HumanMuscleFigure fill={fill} language={language} side="back" />
              </View>
            </ScrollView>
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
