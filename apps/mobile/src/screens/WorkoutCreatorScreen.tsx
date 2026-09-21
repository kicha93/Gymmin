import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

import { AppButton, AppInput, AppTextarea, SelectControl } from "../components/AppControls";
import {
  workoutCreatorSections,
  getCreatorOptionLabel,
  type WorkoutCreatorField,
  type WorkoutCreatorPhase,
  type WorkoutCreatorProfile,
  type WorkoutCreatorValue
} from "../domain/workoutCreator";
import type { LanguageCode, TranslationKey } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

type WorkoutCreatorScreenProps = {
  collapsedSections: Record<string, boolean>;
  draft: Record<string, WorkoutCreatorValue>;
  fieldErrors: Record<string, string>;
  language: LanguageCode;
  phase: WorkoutCreatorPhase;
  profileName: string;
  profiles: WorkoutCreatorProfile[];
  selectedProfileId: string | null;
  submitError: string;
  t: (key: TranslationKey) => string;
  theme: Theme;
  onDraftFieldChange: (fieldId: string, value: WorkoutCreatorValue) => void;
  onLoadProfile: (profile: WorkoutCreatorProfile) => void;
  onDeleteProfile: (profile: WorkoutCreatorProfile) => void;
  onStartNewProfile: () => void;
  onProfileNameChange: (value: string) => void;
  onSaveProfileAndSubmit: () => void;
  onSendWithoutSaving: () => void;
  onSubmit: () => void;
  onToggleSection: (sectionId: string) => void;
  onUpdateProfileAndSubmit: () => void;
};

export function WorkoutCreatorScreen({
  collapsedSections,
  draft,
  fieldErrors,
  language,
  onDraftFieldChange,
  onLoadProfile,
  onDeleteProfile,
  onStartNewProfile,
  onProfileNameChange,
  onSaveProfileAndSubmit,
  onSendWithoutSaving,
  onSubmit,
  onToggleSection,
  onUpdateProfileAndSubmit,
  phase,
  profileName,
  profiles,
  selectedProfileId,
  submitError,
  t,
  theme
}: WorkoutCreatorScreenProps) {
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
    if (field.keyboardType === "number-pad") {
      const numericValue = value.replace(/\D/g, "");

      if (!numericValue) {
        onDraftFieldChange(field.id, "");
        return;
      }

      onDraftFieldChange(field.id, numericValue);
      return;
    }

    if (field.keyboardType === "decimal-pad") {
      onDraftFieldChange(field.id, value.replace(",", ".").replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1"));
      return;
    }

    onDraftFieldChange(field.id, value);
  }

  function toggleMultiChoice(fieldId: string, option: string) {
    const currentValues = Array.isArray(draft[fieldId]) ? draft[fieldId] : [];
    let nextValues = currentValues.includes(option)
      ? currentValues.filter((item) => item !== option)
      : [...currentValues, option];
    if (fieldId === "chronicDiseases") {
      nextValues = option === "none" && !currentValues.includes(option)
        ? ["none"]
        : nextValues.filter((item) => item !== "none");
    }

    onDraftFieldChange(fieldId, nextValues);
  }

  function renderField(field: WorkoutCreatorField) {
    const label = `${getLabel(field.label)}${field.required ? " *" : ""}`;
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
          {fieldErrors[field.id] ? <Text style={[styles.inlineError, { color: theme.danger }]}>{fieldErrors[field.id]}</Text> : null}
        </View>
      );
    }

    if (field.kind === "singleChoice") {
      const options = (field.options ?? []).map((option) => {
        return { label: getLabel(option), value: option.id };
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
          {fieldErrors[field.id] ? <Text style={[styles.inlineError, { color: theme.danger }]}>{fieldErrors[field.id]}</Text> : null}
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
              const isSelected = selectedValues.includes(option.id);

              return (
                <Pressable
                  key={option.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  style={[
                    styles.creatorChoiceChip,
                    {
                      backgroundColor: isSelected ? theme.primary : theme.control,
                      borderColor: isSelected ? theme.primary : theme.border
                    }
                  ]}
                  onPress={() => toggleMultiChoice(field.id, option.id)}
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
          {fieldErrors[field.id] ? <Text style={[styles.inlineError, { color: theme.danger }]}>{fieldErrors[field.id]}</Text> : null}
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
      {fieldErrors[field.id] ? <Text style={[styles.inlineError, { color: theme.danger }]}>{fieldErrors[field.id]}</Text> : null}
      </View>
    );
  }

  return (
    <View style={[styles.creatorPanel, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {!isProfilePrompt ? (
        <Text style={[styles.creatorDescription, { color: theme.muted }]}>
          {t("aiCreatorIntro")}
        </Text>
      ) : null}

      {phase === "form" ? (
        <View style={styles.creatorForm}>
          {profiles.length ? (
            <View style={styles.creatorProfilesBlock}>
              <Text style={[styles.creatorSectionTitle, { color: theme.text }]}>
                {t("aiCreatorProfiles")}
              </Text>
              <AppButton icon="add-outline" theme={theme} variant="outline" onPress={onStartNewProfile}>
                {t("aiCreatorNewProfile")}
              </AppButton>
              <View style={styles.creatorProfileGrid}>
                {profiles.map((profile) => {
                  const isSelected = selectedProfileId === profile.id;
                  const goalValue = profile.draft.primaryGoal;
                  const goalField = workoutCreatorSections[0].fields.find((field) => field.id === "primaryGoal");
                  const meta = typeof goalValue === "string" && goalValue && goalField
                    ? getCreatorOptionLabel(goalField, goalValue, language)
                    : t("aiCreatorMeta");

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
                      <Pressable
                        accessibilityLabel={t("aiCreatorDeleteProfile")}
                        accessibilityRole="button"
                        hitSlop={10}
                        onPress={(event) => {
                          event.stopPropagation();
                          onDeleteProfile(profile);
                        }}
                      >
                        <Ionicons name="trash-outline" size={20} color={theme.danger} />
                      </Pressable>
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
            <Text style={[styles.creatorDescription, { color: theme.muted }]}>{t("aiLocalNoUpload")}</Text>
          </View>
          <AppButton
            icon="document-text-outline"
            theme={theme}
            onPress={onSubmit}
          >
            {t("aiLocalPreparePrompt")}
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
              icon="save-outline"
              theme={theme}
              onPress={selectedProfile ? onUpdateProfileAndSubmit : onSaveProfileAndSubmit}
            >
              {selectedProfile ? t("aiCreatorUpdateAndSubmit") : t("aiCreatorSaveAndSubmit")}
            </AppButton>
            <AppButton
              icon="send-outline"
              theme={theme}
              variant="outline"
              onPress={onSendWithoutSaving}
            >
              {t("aiCreatorSendWithoutSaving")}
            </AppButton>
          </View>
          {submitError ? (
            <Text style={[styles.inlineError, { color: theme.danger }]}>{submitError}</Text>
          ) : null}
        </View>
      ) : null}

    </View>
  );
}
