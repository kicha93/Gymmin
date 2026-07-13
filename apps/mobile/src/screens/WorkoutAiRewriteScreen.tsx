import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { AppButton, AppTextarea } from "../components/AppControls";
import type { WorkoutDraft } from "../domain/workouts";
import type { TranslationKey } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

type WorkoutAiItem = {
  draft: WorkoutDraft;
  id: string;
  name: string;
};

type WorkoutAiRewriteScreenProps = {
  areOnlineFeaturesAvailable: boolean;
  balance: number;
  error: string;
  instruction: string;
  isJobPending: boolean;
  isSubmitting: boolean;
  rewriteCost: number;
  sourceWorkout: WorkoutAiItem | null;
  t: (key: TranslationKey) => string;
  theme: Theme;
  onInstructionChange: (value: string) => void;
  onOpenCredits: () => void;
  onShowOnlineUnavailable: () => void;
  onSubmit: () => void;
};

const rewriteSuggestionKeys: TranslationKey[] = [
  "aiRewriteSuggestionShorten",
  "aiRewriteSuggestionBack",
  "aiRewriteSuggestionHome",
  "aiRewriteSuggestionLegs",
  "aiRewriteSuggestionSets",
  "aiRewriteSuggestionCatalog"
];

export function WorkoutAiRewriteScreen({
  areOnlineFeaturesAvailable,
  balance,
  error,
  instruction,
  isJobPending,
  isSubmitting,
  onInstructionChange,
  onOpenCredits,
  onShowOnlineUnavailable,
  onSubmit,
  rewriteCost,
  sourceWorkout,
  t,
  theme
}: WorkoutAiRewriteScreenProps) {
  const stageCount = sourceWorkout?.draft.steps.filter((step) => step.kind === "stage").length ?? 0;
  const setCount = sourceWorkout?.draft.steps.filter((step) => step.kind === "set").length ?? 0;
  const exerciseCount = sourceWorkout?.draft.steps.filter((step) => step.kind === "exercise").length ?? 0;
  const isProcessing = isSubmitting || isJobPending;

  return (
    <View style={styles.creatorForm}>
      <View style={[styles.creatorPanel, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.panelHeroHeader}>
          <View style={[styles.legalIcon, { backgroundColor: theme.secondaryBand }]}>
            <Ionicons name="sparkles-outline" size={26} color={theme.primary} />
          </View>
          <View style={styles.workoutInfo}>
            <Text style={[styles.creatorPromptTitle, { color: theme.text }]}>{t("aiRewriteTitle")}</Text>
            <Text style={[styles.creatorDescription, { color: theme.muted }]}>
              {sourceWorkout?.name ?? t("workout")}
            </Text>
          </View>
        </View>

        <View style={[styles.creatorPlanBox, { backgroundColor: theme.secondaryBand, borderColor: theme.border }]}>
          <Text style={[styles.creatorPlanText, { color: theme.text }]}>
            {stageCount} {t("stages").toLowerCase()} {"\u00b7"} {setCount} {t("setsPlural")} {"\u00b7"} {exerciseCount} {t("exercise").toLowerCase()}
          </Text>
        </View>

        <View style={styles.creatorChoiceList}>
          {rewriteSuggestionKeys.map((key) => (
            <Pressable
              key={key}
              accessibilityRole="button"
              style={[styles.creatorChoiceChip, { backgroundColor: theme.secondaryBand, borderColor: theme.border }]}
              onPress={() => onInstructionChange(t(key))}
            >
              <Text style={[styles.creatorChoiceText, { color: theme.primary }]}>{t(key)}</Text>
            </Pressable>
          ))}
        </View>

        <AppTextarea
          maxLength={1000}
          placeholder={t("aiRewritePlaceholder")}
          style={styles.creatorTextarea}
          theme={theme}
          value={instruction}
          onChangeText={(value) => onInstructionChange(value.slice(0, 1000))}
        />

        <View style={[styles.creatorPlanBox, { backgroundColor: theme.control, borderColor: theme.border }]}>
          <Text style={[styles.workoutMeta, { color: theme.muted }]}>{t("aiCreditsRewriteNeed")}</Text>
          <Text style={[styles.workoutName, { color: theme.text }]}>
            {t("aiCreditsAvailable")}: {balance}
          </Text>
          <Text style={[styles.workoutMeta, { color: theme.muted }]}>{t("aiCreditsCharged")}</Text>
          {balance < rewriteCost ? (
            <AppButton
              icon="sparkles-outline"
              style={styles.secondaryButton}
              textStyle={styles.secondaryButtonText}
              theme={theme}
              variant="outline"
              onPress={() => {
                if (!areOnlineFeaturesAvailable) {
                  onShowOnlineUnavailable();
                  return;
                }
                onOpenCredits();
              }}
            >
              {t("aiCreditsGoTo")}
            </AppButton>
          ) : null}
        </View>

        {error ? <Text style={[styles.authError, { color: theme.danger }]}>{error}</Text> : null}

        <AppButton
          disabled={isProcessing || !areOnlineFeaturesAvailable || !sourceWorkout || balance < rewriteCost}
          icon={isProcessing ? "hourglass-outline" : "sparkles-outline"}
          theme={theme}
          onPress={onSubmit}
        >
          {isProcessing ? t("aiRewriteProcessing") : t("aiRewriteAction")}
        </AppButton>
      </View>
    </View>
  );
}
