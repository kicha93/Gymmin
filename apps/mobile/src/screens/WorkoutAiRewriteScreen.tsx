import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { AppButton, AppTextarea } from "../components/AppControls";
import type { WorkoutDraft } from "../domain/workouts";
import type { TranslationKey } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

type WorkoutAiItem = { draft: WorkoutDraft; id: string; name: string };
type Props = {
  error: string;
  instruction: string;
  onInstructionChange: (value: string) => void;
  onSubmit: () => void;
  sourceWorkout: WorkoutAiItem | null;
  t: (key: TranslationKey) => string;
  theme: Theme;
};

const suggestionKeys: TranslationKey[] = [
  "aiRewriteSuggestionShorten", "aiRewriteSuggestionBack", "aiRewriteSuggestionHome",
  "aiRewriteSuggestionLegs", "aiRewriteSuggestionSets", "aiRewriteSuggestionCatalog"
];

export function WorkoutAiRewriteScreen({ error, instruction, onInstructionChange, onSubmit, sourceWorkout, t, theme }: Props) {
  return (
    <View style={styles.creatorForm}>
      <View style={[styles.creatorPanel, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.panelHeroHeader}>
          <View style={[styles.legalIcon, { backgroundColor: theme.secondaryBand }]}>
            <Ionicons name="sparkles-outline" size={26} color={theme.primary} />
          </View>
          <View style={styles.workoutInfo}>
            <Text style={[styles.creatorPromptTitle, { color: theme.text }]}>{t("aiRewriteTitle")}</Text>
            <Text style={[styles.creatorDescription, { color: theme.muted }]}>{sourceWorkout?.name ?? t("workout")}</Text>
          </View>
        </View>
        <Text style={[styles.creatorDescription, { color: theme.muted }]}>{t("aiLocalNoUpload")}</Text>
        <View style={styles.creatorChoiceList}>
          {suggestionKeys.map((key) => (
            <Pressable key={key} accessibilityRole="button" style={[styles.creatorChoiceChip, { backgroundColor: theme.secondaryBand, borderColor: theme.border }]}
              onPress={() => onInstructionChange(t(key))}>
              <Text style={[styles.creatorChoiceText, { color: theme.primary }]}>{t(key)}</Text>
            </Pressable>
          ))}
        </View>
        <AppTextarea maxLength={1000} placeholder={t("aiRewritePlaceholder")} style={styles.creatorTextarea} theme={theme}
          value={instruction} onChangeText={(value) => onInstructionChange(value.slice(0, 1000))} />
        {error ? <Text style={[styles.inlineError, { color: theme.danger }]}>{error}</Text> : null}
        <AppButton disabled={!sourceWorkout || !instruction.trim()} icon="document-text-outline" theme={theme} onPress={onSubmit}>
          {t("aiLocalPreparePrompt")}
        </AppButton>
      </View>
    </View>
  );
}
