import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { AppButton, AppInput, AppTextarea, SelectControl } from "../components/AppControls";
import {
  workoutCreatorSections,
  type WorkoutCreatorField,
  type WorkoutCreatorPhase,
  type WorkoutCreatorProfile,
  type WorkoutCreatorValue
} from "../domain/workoutCreator";
import type { LanguageCode, TranslationKey } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

type WorkoutCreatorCreditBalance = {
  balance: number;
  planCost: number;
};

type WorkoutCreatorScreenProps = {
  areOnlineFeaturesAvailable: boolean;
  collapsedSections: Record<string, boolean>;
  creditBalance: WorkoutCreatorCreditBalance;
  draft: Record<string, WorkoutCreatorValue>;
  importedWorkoutCount: number;
  isJobPending: boolean;
  isSubmitting: boolean;
  language: LanguageCode;
  phase: WorkoutCreatorPhase;
  planText: string;
  profileName: string;
  profiles: WorkoutCreatorProfile[];
  selectedProfileId: string | null;
  submitError: string;
  t: (key: TranslationKey) => string;
  theme: Theme;
  formatImportedWorkoutCount: (count: number) => string;
  onDraftFieldChange: (fieldId: string, value: WorkoutCreatorValue) => void;
  onLoadProfile: (profile: WorkoutCreatorProfile) => void;
  onOpenCredits: () => void;
  onOpenWorkouts: () => void;
  onProfileNameChange: (value: string) => void;
  onReturnHome: () => void;
  onSaveProfileAndSubmit: () => void;
  onSendWithoutSaving: () => void;
  onShowOnlineUnavailable: () => void;
  onSubmit: () => void;
  onToggleSection: (sectionId: string) => void;
  onUpdateProfileAndSubmit: () => void;
};

export function WorkoutCreatorScreen({
  areOnlineFeaturesAvailable,
  collapsedSections,
  creditBalance,
  draft,
  formatImportedWorkoutCount,
  importedWorkoutCount,
  isJobPending,
  isSubmitting,
  language,
  onDraftFieldChange,
  onLoadProfile,
  onOpenCredits,
  onOpenWorkouts,
  onProfileNameChange,
  onReturnHome,
  onSaveProfileAndSubmit,
  onSendWithoutSaving,
  onShowOnlineUnavailable,
  onSubmit,
  onToggleSection,
  onUpdateProfileAndSubmit,
  phase,
  planText,
  profileName,
  profiles,
  selectedProfileId,
  submitError,
  t,
  theme
}: WorkoutCreatorScreenProps) {
  const isWaiting = phase === "waiting";
  const isSubmitted = phase === "submitted";
  const isProfilePrompt = phase === "profilePrompt";
  const selectedProfile = selectedProfileId
    ? profiles.find((profile) => profile.id === selectedProfileId)
    : null;

  function getLabel(text: { en: string; pl: string }) {
    return text[language];
  }

  function getTextValue(fieldId: string) {
    const value = draft[fieldId];
    return typeof value === "string" ? value : "";
  }

  function getFieldTextValue(field: WorkoutCreatorField) {
    return getTextValue(field.id) || (field.defaultValue ? getLabel(field.defaultValue) : "");
  }

  function updateTextField(field: WorkoutCreatorField, value: string) {
    if (field.keyboardType === "number-pad" && typeof field.maxValue === "number") {
      const numericValue = value.replace(/\D/g, "");

      if (!numericValue) {
        onDraftFieldChange(field.id, "");
        return;
      }

      onDraftFieldChange(field.id, String(Math.min(Number(numericValue), field.maxValue)));
      return;
    }

    onDraftFieldChange(field.id, value);
  }

  function toggleMultiChoice(fieldId: string, option: string) {
    const currentValues = Array.isArray(draft[fieldId]) ? draft[fieldId] : [];
    const nextValues = currentValues.includes(option)
      ? currentValues.filter((item) => item !== option)
      : [...currentValues, option];

    onDraftFieldChange(fieldId, nextValues);
  }

  function renderField(field: WorkoutCreatorField) {
    const label = getLabel(field.label);
    const placeholder = field.placeholder ? getLabel(field.placeholder) : undefined;

    if (field.kind === "textarea") {
      return (
        <View key={field.id} style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.muted }]}>{label}</Text>
          <AppTextarea
            placeholder={placeholder ?? t("aiCreatorQuestionPlaceholder")}
            style={styles.creatorTextarea}
            theme={theme}
            value={getTextValue(field.id)}
            onChangeText={(value) => onDraftFieldChange(field.id, value)}
          />
        </View>
      );
    }

    if (field.kind === "singleChoice") {
      const options = (field.options ?? []).map((option) => {
        const optionLabel = getLabel(option);
        return { label: optionLabel, value: optionLabel };
      });

      return (
        <View key={field.id} style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.muted }]}>{label}</Text>
          <SelectControl
            options={options}
            placeholder={t("select")}
            theme={theme}
            value={getFieldTextValue(field)}
            onChange={(value) => onDraftFieldChange(field.id, value)}
          />
        </View>
      );
    }

    if (field.kind === "multiChoice") {
      const selectedValues = Array.isArray(draft[field.id]) ? draft[field.id] : [];

      return (
        <View key={field.id} style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.muted }]}>{label}</Text>
          <View style={styles.creatorChoiceList}>
            {(field.options ?? []).map((option) => {
              const optionLabel = getLabel(option);
              const isSelected = selectedValues.includes(optionLabel);

              return (
                <Pressable
                  key={optionLabel}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  style={[
                    styles.creatorChoiceChip,
                    {
                      backgroundColor: isSelected ? theme.primary : theme.control,
                      borderColor: isSelected ? theme.primary : theme.border
                    }
                  ]}
                  onPress={() => toggleMultiChoice(field.id, optionLabel)}
                >
                  <Text
                    style={[
                      styles.creatorChoiceText,
                      { color: isSelected ? theme.white : theme.text }
                    ]}
                  >
                    {optionLabel}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      );
    }

    return (
      <View key={field.id} style={styles.fieldGroup}>
        <Text style={[styles.label, { color: theme.muted }]}>{label}</Text>
        <AppInput
          keyboardType={field.keyboardType}
          placeholder={placeholder ?? t("aiCreatorQuestionPlaceholder")}
          theme={theme}
          value={getTextValue(field.id)}
          onChangeText={(value) => updateTextField(field, value)}
        />
      </View>
    );
  }

  return (
    <View style={[styles.creatorPanel, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {!isProfilePrompt && !isSubmitted ? (
        <Text style={[styles.creatorDescription, { color: theme.muted }]}>
          {isWaiting ? t("aiCreatorDoneCopy") : t("aiCreatorIntro")}
        </Text>
      ) : null}

      {phase === "form" ? (
        <View style={styles.creatorForm}>
          {profiles.length ? (
            <View style={styles.creatorProfilesBlock}>
              <Text style={[styles.creatorSectionTitle, { color: theme.text }]}>
                {t("aiCreatorProfiles")}
              </Text>
              <View style={styles.creatorProfileGrid}>
                {profiles.map((profile) => {
                  const isSelected = selectedProfileId === profile.id;
                  const goalValue = profile.draft.primaryGoal;
                  const meta = typeof goalValue === "string" && goalValue ? goalValue : t("aiCreatorMeta");

                  return (
                    <Pressable
                      key={profile.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      style={[
                        styles.creatorProfileCard,
                        {
                          backgroundColor: isSelected ? theme.secondaryBand : theme.control,
                          borderColor: isSelected ? theme.primary : theme.border
                        }
                      ]}
                      onPress={() => onLoadProfile(profile)}
                    >
                      <View style={[styles.infoLinkIcon, { backgroundColor: theme.secondaryBand }]}>
                        <Ionicons name="person-outline" size={21} color={theme.primary} />
                      </View>
                      <View style={styles.workoutInfo}>
                        <Text style={[styles.workoutName, { color: theme.text }]}>{profile.name}</Text>
                        <Text numberOfLines={1} style={[styles.workoutMeta, { color: theme.muted }]}>
                          {isSelected ? t("aiCreatorProfileLoaded") : meta}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          {workoutCreatorSections.map((section) => {
            const isSectionCollapsed = collapsedSections[section.id] ?? false;

            return (
              <View key={section.id} style={[styles.creatorSection, { borderColor: theme.border }]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: !isSectionCollapsed }}
                  style={styles.creatorSectionHeader}
                  onPress={() => onToggleSection(section.id)}
                >
                  <Text style={[styles.creatorSectionTitle, { color: theme.text }]}>
                    {getLabel(section.title)}
                  </Text>
                  <Ionicons
                    name={isSectionCollapsed ? "chevron-down" : "chevron-up"}
                    size={20}
                    color={theme.muted}
                  />
                </Pressable>
                {!isSectionCollapsed ? (
                  <View style={styles.creatorSectionFields}>
                    {section.fields.map((field) => renderField(field))}
                  </View>
                ) : null}
              </View>
            );
          })}

          <View style={[styles.creatorPlanBox, { backgroundColor: theme.control, borderColor: theme.border }]}>
            <Text style={[styles.workoutMeta, { color: theme.muted }]}>{t("aiCreditsGenerateNeed")}</Text>
            <Text style={[styles.workoutName, { color: theme.text }]}>
              {t("aiCreditsAvailable")}: {creditBalance.balance}
            </Text>
            <Text style={[styles.workoutMeta, { color: theme.muted }]}>{t("aiCreditsCharged")}</Text>
            {creditBalance.balance < creditBalance.planCost ? (
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
          <AppButton
            disabled={isSubmitting || isJobPending || !areOnlineFeaturesAvailable || creditBalance.balance < creditBalance.planCost}
            icon="sparkles-outline"
            theme={theme}
            onPress={onSubmit}
          >
            {t("aiCreatorSubmit")}
          </AppButton>
        </View>
      ) : null}

      {isProfilePrompt ? (
        <View style={styles.creatorForm}>
          <Text style={[styles.creatorPromptTitle, { color: theme.text }]}>
            {selectedProfile ? t("aiCreatorProfileUpdateTitle") : t("aiCreatorProfileSaveTitle")}
          </Text>
          <Text style={[styles.creatorDescription, { color: theme.muted }]}>
            {selectedProfile ? t("aiCreatorProfileUpdateCopy") : t("aiCreatorProfileSaveCopy")}
          </Text>
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.muted }]}>{t("aiCreatorProfileName")}</Text>
            <AppInput
              maxLength={120}
              placeholder={t("aiCreatorProfileNamePlaceholder")}
              theme={theme}
              value={profileName}
              onChangeText={onProfileNameChange}
            />
          </View>
          <View style={styles.creatorPromptActions}>
            <AppButton
              disabled={isSubmitting || isJobPending || !areOnlineFeaturesAvailable}
              icon="save-outline"
              theme={theme}
              onPress={selectedProfile ? onUpdateProfileAndSubmit : onSaveProfileAndSubmit}
            >
              {isSubmitting
                ? t("aiCreatorSubmitting")
                : selectedProfile
                  ? t("aiCreatorUpdateAndSubmit")
                  : t("aiCreatorSaveAndSubmit")}
            </AppButton>
            <AppButton
              disabled={isSubmitting || isJobPending || !areOnlineFeaturesAvailable}
              icon="send-outline"
              theme={theme}
              variant="outline"
              onPress={onSendWithoutSaving}
            >
              {isSubmitting ? t("aiCreatorSubmitting") : t("aiCreatorSendWithoutSaving")}
            </AppButton>
          </View>
          {submitError ? (
            <Text style={[styles.authError, { color: theme.danger }]}>{submitError}</Text>
          ) : null}
        </View>
      ) : null}

      {isSubmitted ? (
        <View style={styles.creatorWaitingActions}>
          <View style={[styles.bugSuccessBox, { backgroundColor: theme.secondaryBand }]}>
            <Ionicons name="checkmark-circle-outline" size={22} color={theme.primary} />
            <View style={styles.workoutInfo}>
              <Text style={[styles.creatorPromptTitle, { color: theme.text }]}>{t("aiCreatorSentTitle")}</Text>
              <Text style={[styles.creatorDescription, { color: theme.muted }]}>
                {isJobPending ? t("aiCreatorPendingCopy") : t("aiCreatorSentCopy")}
              </Text>
            </View>
          </View>
          <AppButton icon="checkmark-outline" theme={theme} onPress={onReturnHome}>
            {t("aiCreatorSentOk")}
          </AppButton>
        </View>
      ) : null}

      {isWaiting ? (
        <View style={styles.creatorWaitingActions}>
          <View style={[styles.bugSuccessBox, { backgroundColor: theme.secondaryBand }]}>
            <Ionicons name="checkmark-circle-outline" size={22} color={theme.primary} />
            <View style={styles.workoutInfo}>
              <Text style={[styles.creatorPromptTitle, { color: theme.text }]}>
                {importedWorkoutCount ? t("aiCreatorImportedTitle") : t("aiCreatorDoneTitle")}
              </Text>
              <Text style={[styles.creatorDescription, { color: theme.muted }]}>
                {importedWorkoutCount
                  ? `${formatImportedWorkoutCount(importedWorkoutCount)} ${t("aiCreatorImportedCopy")}`
                  : t("aiCreatorDoneCopy")}
              </Text>
            </View>
          </View>
          {planText && !importedWorkoutCount ? (
            <View style={[styles.creatorPlanBox, { backgroundColor: theme.control, borderColor: theme.border }]}>
              <Text style={[styles.creatorPromptTitle, { color: theme.text }]}>{t("aiCreatorResultTitle")}</Text>
              <Text style={[styles.creatorPlanText, { color: theme.text }]}>{planText}</Text>
            </View>
          ) : null}
          <AppButton icon="list-outline" theme={theme} onPress={onOpenWorkouts}>
            {t("aiCreatorWaitingAction")}
          </AppButton>
        </View>
      ) : null}
    </View>
  );
}
