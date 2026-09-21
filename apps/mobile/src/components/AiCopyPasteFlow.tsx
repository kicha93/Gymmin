import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { Pressable, Text, View } from "react-native";
import { useState } from "react";

import { AppButton, AppTextarea } from "./AppControls";
import type { AiWorkoutImportResult } from "../domain/aiCopyPaste";
import { copyAiPrompt, pasteAiResponse } from "../domain/aiClipboard";
import type { LanguageCode, TranslationKey } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

type Props = {
  canApply: boolean;
  language: LanguageCode;
  onApply: () => void;
  onClearResponse: () => void;
  onEditForm: () => void;
  onParse: () => void;
  onReplaceExercise: (stepId: string, exerciseId: string) => void;
  onResponseChange: (value: string) => void;
  prompt: string;
  response: string;
  result: AiWorkoutImportResult | null;
  t: (key: TranslationKey) => string;
  theme: Theme;
};

export function AiCopyPasteFlow({
  canApply,
  language,
  onApply,
  onClearResponse,
  onEditForm,
  onParse,
  onReplaceExercise,
  onResponseChange,
  prompt,
  response,
  result,
  t,
  theme
}: Props) {
  const [clipboardMessage, setClipboardMessage] = useState("");
  const [showPrompt, setShowPrompt] = useState(false);
  async function copyPrompt() {
    try {
      await copyAiPrompt(Clipboard, prompt);
      setClipboardMessage(t("aiLocalPromptCopied"));
    } catch {
      setClipboardMessage(t("aiLocalClipboardError"));
    }
  }

  async function pasteResponse() {
    try {
      const value = await pasteAiResponse(Clipboard);
      if (value) {
        onResponseChange(value);
        setClipboardMessage(t("aiLocalResponsePasted"));
      }
    } catch {
      setClipboardMessage(t("aiLocalClipboardError"));
    }
  }

  return (
    <View style={styles.creatorForm}>
      <FlowStep number="1" title={t("aiLocalPreparePrompt")} theme={theme}>
        <Text style={[styles.creatorDescription, { color: theme.muted }]}>{t("aiLocalNoUpload")}</Text>
        <Text style={[styles.workoutMeta, { color: theme.muted }]}>{t("aiLocalPrivacyWarning")}</Text>
        <AppButton icon="copy-outline" theme={theme} onPress={() => { void copyPrompt(); }}>
          {t("aiLocalCopyPrompt")}
        </AppButton>
        <AppButton icon={showPrompt ? "eye-off-outline" : "eye-outline"} theme={theme} variant="outline" onPress={() => setShowPrompt((current) => !current)}>
          {showPrompt ? t("aiLocalHidePrompt") : t("aiLocalShowPrompt")}
        </AppButton>
        {showPrompt ? <AppTextarea editable={false} style={styles.creatorTextarea} theme={theme} value={prompt} /> : null}
        <AppButton icon="create-outline" theme={theme} variant="outline" onPress={onEditForm}>
          {t("aiLocalEditAnswers")}
        </AppButton>
        {clipboardMessage ? <Text accessibilityLiveRegion="polite" style={[styles.workoutMeta, { color: theme.muted }]}>{clipboardMessage}</Text> : null}
      </FlowStep>

      <FlowStep number="2" title={t("aiLocalUseExternalAi")} theme={theme}>
        <Text style={[styles.creatorDescription, { color: theme.muted }]}>{t("aiLocalExternalAiCopy")}</Text>
      </FlowStep>

      <FlowStep number="3" title={t("aiLocalPasteResponse")} theme={theme}>
        <AppTextarea
          maxLength={1_000_000}
          placeholder={t("aiLocalResponsePlaceholder")}
          style={styles.creatorTextarea}
          theme={theme}
          value={response}
          onChangeText={onResponseChange}
        />
        <AppButton icon="clipboard-outline" theme={theme} variant="outline" onPress={() => { void pasteResponse(); }}>
          {t("aiLocalPasteClipboard")}
        </AppButton>
        <AppButton disabled={!response.trim()} icon="checkmark-circle-outline" theme={theme} onPress={onParse}>
          {t("aiLocalValidate")}
        </AppButton>
        {response.trim() ? (
          <AppButton icon="trash-outline" theme={theme} variant="outline" onPress={onClearResponse}>
            {t("aiLocalClearResponse")}
          </AppButton>
        ) : null}
      </FlowStep>

      {result ? (
        <FlowStep number="4" title={t("aiLocalReviewSave")} theme={theme}>
          {result.errors.map((error) => (
            <Text key={error} style={[styles.inlineError, { color: theme.danger }]}>{error}</Text>
          ))}
          {result.warnings.map((warning) => (
            <View key={warning} style={styles.creatorSectionHeader}>
              <Ionicons name="warning-outline" size={18} color={theme.primary} />
              <Text style={[styles.workoutMeta, { color: theme.primary, flex: 1 }]}>{warning}</Text>
            </View>
          ))}
          {result.errors.length && result.workouts.length === 0 ? (
            <Text style={[styles.creatorDescription, { color: theme.muted }]}>{t("aiLocalJsonOnlyHint")}</Text>
          ) : null}
          {result.workouts.map((workout) => (
            <View key={workout.id} style={[styles.creatorPlanBox, { backgroundColor: theme.secondaryBand, borderColor: theme.border }]}>
              <Text style={[styles.workoutName, { color: theme.text }]}>{workout.name}</Text>
              <Text style={[styles.workoutMeta, { color: theme.muted }]}>
                {workout.draft.steps.filter((step) => step.kind === "stage").length} {t("stages").toLowerCase()} · {workout.draft.steps.filter((step) => step.kind === "exercise").length} {t("exercise").toLowerCase()}
              </Text>
              {workout.draft.notes ? <Text style={[styles.workoutMeta, { color: theme.muted }]}>{workout.draft.notes}</Text> : null}
              {workout.draft.steps.map((step) => {
                if (step.kind === "stage") {
                  return <Text key={step.id} style={[styles.creatorSectionTitle, { color: theme.text }]}>{step.label}</Text>;
                }
                if (step.kind === "set") {
                  return <Text key={step.id} style={[styles.workoutMeta, { color: theme.muted }]}>{t("set")}: {step.setCount}</Text>;
                }
                return (
                  <View key={step.id} style={{ gap: 2 }}>
                    <Text style={[styles.workoutMeta, { color: theme.text }]}>
                      {step.exerciseName || t("aiLocalUnknownExercise")} · {step.targetValue} · {step.restSeconds || "0"}s{step.loadKg ? ` · ${step.loadKg} kg` : ""}
                    </Text>
                    {step.notes ? <Text style={[styles.workoutMeta, { color: theme.muted }]}>{step.notes}</Text> : null}
                  </View>
                );
              })}
            </View>
          ))}
          {result.issues.map((issue) => (
            <View key={issue.stepId ?? issue.message} style={[styles.creatorPlanBox, { backgroundColor: theme.control, borderColor: theme.danger }]}>
              <Text style={[styles.workoutName, { color: theme.danger }]}>{issue.message}</Text>
              <Text style={[styles.workoutMeta, { color: theme.muted }]}>{t("aiLocalChooseReplacement")}</Text>
              {issue.suggestions.map((suggestion) => (
                <Pressable key={suggestion.id} accessibilityRole="button" style={styles.creatorSectionHeader}
                  onPress={() => issue.stepId && onReplaceExercise(issue.stepId, suggestion.id)}>
                  <Ionicons name="swap-horizontal-outline" size={18} color={theme.primary} />
                  <Text style={[styles.creatorChoiceText, { color: theme.primary }]}>
                    {language === "pl" ? suggestion.polishName : suggestion.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          ))}
          <AppButton disabled={!canApply} icon="save-outline" theme={theme} onPress={onApply}>
            {t("aiLocalApply")}
          </AppButton>
        </FlowStep>
      ) : null}
    </View>
  );
}

function FlowStep({ children, number, theme, title }: { children: React.ReactNode; number: string; theme: Theme; title: string }) {
  return (
    <View style={[styles.creatorPanel, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.panelHeroHeader}>
        <View style={[styles.legalIcon, { backgroundColor: theme.secondaryBand }]}>
          <Text style={[styles.workoutName, { color: theme.primary }]}>{number}</Text>
        </View>
        <Text style={[styles.creatorPromptTitle, { color: theme.text }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}
