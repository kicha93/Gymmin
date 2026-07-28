import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { AppInput, AppTextarea } from "../components/AppControls";
import { CollapsiblePanel } from "../components/CollapsiblePanel";
import {
  getReminderDayOptions,
  settingsLanguageOptions,
  type ReminderSchedulingStatus,
  type SettingsSheetKey
} from "../domain/settings";
import {
  formatReminderDayTime,
  getReminderScheduleForDay,
  type ReminderWeekday,
  type WorkoutReminderSettings
} from "../domain/workoutReminders";
import type { LanguageCode, TranslationKey } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

type SettingsScreenProps = {
  defaultSetCount: string;
  defaultStageTypeLabel: string;
  defaultWeight: string;
  defaultWorkoutExecutionModeLabel: string;
  favoriteExerciseCount: number;
  isDarkMode: boolean;
  language: LanguageCode;
  reminderDescriptionPlaceholder: string;
  reminderMessagePlaceholder: string;
  reminderSchedulingStatus: ReminderSchedulingStatus;
  showRestTimer: boolean;
  t: (key: TranslationKey) => string;
  theme: Theme;
  workoutReminders: WorkoutReminderSettings;
  isPanelCollapsed: (panelId: string) => boolean;
  onOpenContact: () => void;
  onOpenFavoriteExercises: () => void;
  onOpenReminderDay: (day: ReminderWeekday) => void;
  onOpenReportBug: () => void;
  onOpenSettingsSheet: (sheet: SettingsSheetKey) => void;
  onOpenPrivacy: () => void;
  onOpenTerms: () => void;
  onReminderDescriptionChange: (description: string) => void;
  onReminderMessageChange: (message: string) => void;
  onTogglePanel: (panelId: string) => void;
  onToggleReminderDay: (dayNumber: number) => void;
  onToggleReminderOnlyIfNoWorkoutToday: () => void;
  onToggleReminders: () => void;
  onToggleRestTimer: () => void;
  onToggleTheme: () => void;
};

export function SettingsScreen({
  defaultSetCount,
  defaultStageTypeLabel,
  defaultWeight,
  defaultWorkoutExecutionModeLabel,
  favoriteExerciseCount,
  isDarkMode,
  isPanelCollapsed,
  language,
  onOpenContact,
  onOpenFavoriteExercises,
  onOpenReminderDay,
  onOpenReportBug,
  onOpenSettingsSheet,
  onOpenPrivacy,
  onOpenTerms,
  onReminderDescriptionChange,
  onReminderMessageChange,
  onTogglePanel,
  onToggleReminderDay,
  onToggleReminderOnlyIfNoWorkoutToday,
  onToggleReminders,
  onToggleRestTimer,
  onToggleTheme,
  reminderDescriptionPlaceholder,
  reminderMessagePlaceholder,
  reminderSchedulingStatus,
  showRestTimer,
  t,
  theme,
  workoutReminders
}: SettingsScreenProps) {
  const reminderDayOptions = getReminderDayOptions(t);
  const languageLabel = settingsLanguageOptions.find((option) => option.value === language)?.label ?? "Polski";

  return (
    <>
      <SettingsSection
        isCollapsed={isPanelCollapsed("settings-preferences")}
        title={t("preferences")}
        theme={theme}
        onToggle={() => onTogglePanel("settings-preferences")}
      >
        <SettingsOption
          icon="language-outline"
          label={t("appLanguage")}
          value={languageLabel}
          theme={theme}
          onPress={() => onOpenSettingsSheet("language")}
        />
        <SettingsOption
          icon={isDarkMode ? "moon-outline" : "sunny-outline"}
          label={t("theme")}
          value={isDarkMode ? t("themeDark") : t("themeLight")}
          theme={theme}
          onPress={onToggleTheme}
        />
      </SettingsSection>

      <SettingsSection
        isCollapsed={isPanelCollapsed("settings-training")}
        title={t("training")}
        theme={theme}
        onToggle={() => onTogglePanel("settings-training")}
      >
        <SettingsOption
          icon="repeat-outline"
          label={t("defaultSetCount")}
          value={defaultSetCount || t("setupRequired")}
          theme={theme}
          onPress={() => onOpenSettingsSheet("defaultSetCount")}
        />
        <SettingsOption
          icon="barbell-outline"
          label={t("defaultWeight")}
          value={defaultWeight ? `${defaultWeight} kg` : t("empty")}
          theme={theme}
          onPress={() => onOpenSettingsSheet("defaultWeight")}
        />
        <SettingsOption
          icon="layers-outline"
          label={t("defaultStageType")}
          value={defaultStageTypeLabel}
          theme={theme}
          onPress={() => onOpenSettingsSheet("defaultStageType")}
        />
        <SettingsOption
          icon="walk-outline"
          label={t("defaultWorkoutExecutionMode")}
          value={defaultWorkoutExecutionModeLabel}
          theme={theme}
          onPress={() => onOpenSettingsSheet("defaultWorkoutExecutionMode")}
        />
        <SettingsOption
          icon="time-outline"
          label={t("showRestTimer")}
          value={showRestTimer ? t("enabled") : t("disabled")}
          theme={theme}
          onPress={onToggleRestTimer}
        />
        <SettingsOption
          icon="star-outline"
          label={t("favoriteExercises")}
          value={String(favoriteExerciseCount)}
          theme={theme}
          onPress={onOpenFavoriteExercises}
        />
      </SettingsSection>

      <SettingsSection
        isCollapsed={isPanelCollapsed("settings-notifications")}
        title={t("notifications")}
        theme={theme}
        onToggle={() => onTogglePanel("settings-notifications")}
      >
        <SettingsOption
          icon="notifications-outline"
          label={t("enableReminders")}
          value={workoutReminders.enabled ? t("enabled") : t("disabled")}
          theme={theme}
          onPress={onToggleReminders}
        />
        {workoutReminders.enabled ? (
          <>
            <SettingsOption
              icon="checkmark-done-outline"
              label={t("reminderOnlyIfNoWorkoutToday")}
              value={workoutReminders.onlyIfNoWorkoutToday ? t("enabled") : t("disabled")}
              theme={theme}
              onPress={onToggleReminderOnlyIfNoWorkoutToday}
            />
            <View style={styles.reminderWeeklyBlock}>
              <Text style={[styles.settingsOptionLabel, { color: theme.text }]}>{t("reminderWeeklySchedule")}</Text>
              <View style={styles.reminderWeeklyRows}>
                {reminderDayOptions.map((day) => {
                  const schedule = getReminderScheduleForDay(workoutReminders, day.value);
                  const enabled = schedule.enabled;

                  return (
                    <View key={day.value} style={styles.reminderWeeklyRow}>
                      <Pressable
                        accessibilityLabel={`${day.label}: ${enabled ? t("enabled") : t("disabled")}`}
                        accessibilityRole="switch"
                        accessibilityState={{ checked: enabled }}
                        onPress={() => onToggleReminderDay(day.value)}
                        style={[
                          styles.reminderWeeklyDayBadge,
                          {
                            backgroundColor: enabled ? theme.primary : theme.secondaryBand,
                            borderColor: enabled ? theme.primary : theme.border
                          }
                        ]}
                      >
                        <Text style={[
                          styles.reminderWeeklyDayText,
                          { color: enabled ? theme.white : theme.text }
                        ]}>
                          {day.shortLabel}
                        </Text>
                      </Pressable>
                      <Pressable
                        accessibilityLabel={day.label}
                        accessibilityRole="button"
                        style={[
                          styles.reminderWeeklyDetail,
                          { backgroundColor: theme.card, borderColor: theme.border }
                        ]}
                        onPress={() => onOpenReminderDay(day.weekday)}
                      >
                        <View
                          style={[
                            styles.reminderWeeklyStatusDot,
                            { backgroundColor: enabled ? theme.primary : theme.muted }
                          ]}
                        />
                        <Text style={[styles.reminderWeeklyStatus, { color: theme.text }]}>
                          {enabled ? t("enabled") : t("disabled")}
                        </Text>
                        <Text style={[styles.reminderWeeklyTime, { color: theme.text }]}>
                          {formatReminderDayTime(schedule)}
                        </Text>
                        <Ionicons name="chevron-forward" size={20} color={theme.muted} />
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </View>
            <View style={styles.reminderMessageBlock}>
              <Text style={[styles.reminderFieldLabel, { color: theme.text }]}>{t("reminderMessage")}</Text>
              <AppInput
                placeholder={reminderMessagePlaceholder}
                theme={theme}
                value={workoutReminders.message}
                onChangeText={onReminderMessageChange}
              />
            </View>
            <View style={styles.reminderMessageBlock}>
              <Text style={[styles.reminderFieldLabel, { color: theme.text }]}>{t("reminderDescription")}</Text>
              <AppTextarea
                inputStyle={styles.reminderDescriptionInput}
                numberOfLines={2}
                placeholder={reminderDescriptionPlaceholder}
                style={styles.reminderDescriptionTextarea}
                theme={theme}
                value={workoutReminders.description ?? ""}
                onChangeText={onReminderDescriptionChange}
              />
            </View>
          </>
        ) : null}
        {reminderSchedulingStatus === "permissionDenied" ? (
          <Text style={[styles.settingsHint, { color: theme.danger }]}>{t("remindersPermissionDenied")}</Text>
        ) : reminderSchedulingStatus === "failed" ? (
          <Text style={[styles.settingsHint, { color: theme.danger }]}>{t("remindersScheduleError")}</Text>
        ) : null}
      </SettingsSection>

      <SettingsSection
        isCollapsed={isPanelCollapsed("settings-info")}
        title={t("information")}
        theme={theme}
        onToggle={() => onTogglePanel("settings-info")}
      >
        <InfoLinkRow
          icon="document-text-outline"
          label={t("terms")}
          meta={t("termsMeta")}
          theme={theme}
          onPress={onOpenTerms}
        />
        <InfoLinkRow
          icon="shield-checkmark-outline"
          label={t("privacyPolicy")}
          meta={t("privacyPolicyMeta")}
          theme={theme}
          onPress={onOpenPrivacy}
        />
        <InfoLinkRow
          icon="mail-outline"
          label={t("contact")}
          meta={t("contactMeta")}
          theme={theme}
          onPress={onOpenContact}
        />
        <InfoLinkRow
          icon="bug-outline"
          label={t("bugReport")}
          meta={t("bugReportMeta")}
          theme={theme}
          onPress={onOpenReportBug}
        />
      </SettingsSection>
    </>
  );
}

type SettingsSectionProps = {
  children: ReactNode;
  isCollapsed: boolean;
  onToggle: () => void;
  theme: Theme;
  title: string;
};

function SettingsSection({ children, isCollapsed, onToggle, theme, title }: SettingsSectionProps) {
  return (
    <CollapsiblePanel isCollapsed={isCollapsed} theme={theme} title={title} onToggle={onToggle}>
      {children}
    </CollapsiblePanel>
  );
}

type SettingsOptionProps = {
  disabled?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  theme: Theme;
  value: string;
};

function SettingsOption({ disabled = false, icon, label, onPress, theme, value }: SettingsOptionProps) {
  const Container = onPress && !disabled ? Pressable : View;

  return (
    <Container
      accessibilityRole={onPress && !disabled ? "button" : undefined}
      accessibilityState={disabled ? { disabled: true } : undefined}
      onPress={disabled ? undefined : onPress}
      style={[styles.settingsOptionRow, { borderColor: theme.border, opacity: disabled ? 0.48 : 1 }]}
    >
      <View style={[styles.infoLinkIcon, { backgroundColor: disabled ? theme.segment : theme.secondaryBand }]}>
        <Ionicons name={icon} size={21} color={disabled ? theme.muted : theme.primary} />
      </View>
      <Text style={[styles.settingsOptionLabel, { color: disabled ? theme.muted : theme.text }]}>{label}</Text>
      <Text style={[styles.settingsOptionValue, { color: theme.muted }]}>{value}</Text>
    </Container>
  );
}

type InfoLinkRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  meta: string;
  onPress: () => void;
  theme: Theme;
};

function InfoLinkRow({ icon, label, meta, onPress, theme }: InfoLinkRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      style={[styles.infoLinkRow, { borderColor: theme.border }]}
      onPress={onPress}
    >
      <View style={[styles.infoLinkIcon, { backgroundColor: theme.secondaryBand }]}>
        <Ionicons name={icon} size={22} color={theme.primary} />
      </View>
      <View style={styles.workoutInfo}>
        <Text style={[styles.workoutName, { color: theme.text }]}>{label}</Text>
        <Text style={[styles.workoutMeta, { color: theme.muted }]}>{meta}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.muted} />
    </Pressable>
  );
}
