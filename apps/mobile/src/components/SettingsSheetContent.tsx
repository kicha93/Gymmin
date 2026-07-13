import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, Text, View } from "react-native";

import { AppButton, AppInput, SuffixedInput } from "./AppControls";
import { getReminderDayOptions, settingsLanguageOptions, type SettingsSheetKey } from "../domain/settings";
import type { StageType } from "../domain/workouts";
import type { ReminderDaySchedule } from "../domain/workoutReminders";
import type { WorkoutExecutionMode } from "../domain/workoutSessions";
import type { LanguageCode, TranslationKey } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

type SettingsSheetContentProps = {
  activeSheet: SettingsSheetKey | null;
  pendingDefaultSetCount: string;
  pendingDefaultStageType: StageType | "";
  pendingDefaultWeight: string;
  pendingDefaultWorkoutExecutionMode: WorkoutExecutionMode;
  pendingLanguage: LanguageCode;
  pendingWorkoutReminderDay: ReminderDaySchedule | null;
  stageTypeOptions: Array<{ label: string; value: StageType }>;
  t: (key: TranslationKey) => string;
  theme: Theme;
  workoutExecutionModeOptions: Array<{ label: string; value: WorkoutExecutionMode }>;
  onCancelReminderDay: () => void;
  onPendingDefaultSetCountChange: (value: string) => void;
  onPendingDefaultStageTypeChange: (value: StageType | "") => void;
  onPendingDefaultWeightChange: (value: string) => void;
  onPendingDefaultWorkoutExecutionModeChange: (value: WorkoutExecutionMode) => void;
  onPendingLanguageChange: (value: LanguageCode) => void;
  onPendingWorkoutReminderDayChange: (patch: Partial<Omit<ReminderDaySchedule, "day">>) => void;
  onSaveDefaultSetCount: () => void;
  onSaveDefaultStageType: () => void;
  onSaveDefaultWeight: () => void;
  onSaveDefaultWorkoutExecutionMode: () => void;
  onSaveLanguage: () => void;
  onSaveReminderDay: () => void;
};

export function SettingsSheetContent({
  activeSheet,
  onCancelReminderDay,
  onPendingDefaultSetCountChange,
  onPendingDefaultStageTypeChange,
  onPendingDefaultWeightChange,
  onPendingDefaultWorkoutExecutionModeChange,
  onPendingLanguageChange,
  onPendingWorkoutReminderDayChange,
  onSaveDefaultSetCount,
  onSaveDefaultStageType,
  onSaveDefaultWeight,
  onSaveDefaultWorkoutExecutionMode,
  onSaveLanguage,
  onSaveReminderDay,
  pendingDefaultSetCount,
  pendingDefaultStageType,
  pendingDefaultWeight,
  pendingDefaultWorkoutExecutionMode,
  pendingLanguage,
  pendingWorkoutReminderDay,
  stageTypeOptions,
  t,
  theme,
  workoutExecutionModeOptions
}: SettingsSheetContentProps) {
  if (activeSheet === "language") {
    return (
      <>
        <Text style={[styles.bottomSheetTitle, { color: theme.text }]}>{t("appLanguage")}</Text>
        <SettingsSheetOptionGroup
          options={settingsLanguageOptions}
          selectedValue={pendingLanguage}
          theme={theme}
          onSelect={onPendingLanguageChange}
        />
        <SettingsSheetSaveButton label={t("save")} theme={theme} onPress={onSaveLanguage} />
      </>
    );
  }

  if (activeSheet === "defaultSetCount") {
    return (
      <>
        <Text style={[styles.bottomSheetTitle, { color: theme.text }]}>{t("defaultSetCount")}</Text>
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.muted }]}>{t("defaultSetCountHelp")}</Text>
          <AppInput
            keyboardType="number-pad"
            placeholder="np. 3"
            theme={theme}
            value={pendingDefaultSetCount}
            onChangeText={(value) => onPendingDefaultSetCountChange(value.replace(/\D/g, "").slice(0, 2))}
          />
        </View>
        <SettingsSheetSaveButton label={t("save")} theme={theme} onPress={onSaveDefaultSetCount} />
      </>
    );
  }

  if (activeSheet === "defaultWeight") {
    return (
      <>
        <Text style={[styles.bottomSheetTitle, { color: theme.text }]}>{t("defaultWeight")}</Text>
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.muted }]}>{t("defaultWeightHelp")}</Text>
          <SuffixedInput
            keyboardType="decimal-pad"
            placeholder="0"
            suffix="kg"
            theme={theme}
            value={pendingDefaultWeight}
            onChangeText={(value) => {
              const normalized = value.replace(",", ".").replace(/[^0-9.]/g, "");
              const parts = normalized.split(".");
              onPendingDefaultWeightChange(parts.length > 1 ? `${parts[0]}.${parts.slice(1).join("")}` : normalized);
            }}
          />
        </View>
        <SettingsSheetSaveButton label={t("save")} theme={theme} onPress={onSaveDefaultWeight} />
      </>
    );
  }

  if (activeSheet === "defaultStageType") {
    const options: Array<{ label: string; value: StageType | "" }> = [
      { label: t("toChoose"), value: "" },
      ...stageTypeOptions
    ];

    return (
      <>
        <Text style={[styles.bottomSheetTitle, { color: theme.text }]}>{t("defaultStageType")}</Text>
        <SettingsSheetOptionGroup
          options={options}
          selectedValue={pendingDefaultStageType}
          theme={theme}
          onSelect={onPendingDefaultStageTypeChange}
        />
        <SettingsSheetSaveButton label={t("save")} theme={theme} onPress={onSaveDefaultStageType} />
      </>
    );
  }

  if (activeSheet === "defaultWorkoutExecutionMode") {
    return (
      <>
        <Text style={[styles.bottomSheetTitle, { color: theme.text }]}>{t("defaultWorkoutExecutionMode")}</Text>
        <SettingsSheetOptionGroup
          options={workoutExecutionModeOptions}
          selectedValue={pendingDefaultWorkoutExecutionMode}
          theme={theme}
          onSelect={onPendingDefaultWorkoutExecutionModeChange}
        />
        <SettingsSheetSaveButton label={t("save")} theme={theme} onPress={onSaveDefaultWorkoutExecutionMode} />
      </>
    );
  }

  if (activeSheet === "workoutReminderDay" && pendingWorkoutReminderDay) {
    const [selectedHour = "18", selectedMinute = "00"] = pendingWorkoutReminderDay.time.split(":");
    const hourOptions = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
    const minuteOptions = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, "0"));
    const dayLabel = getReminderDayOptions(t)
      .find((day) => day.weekday === pendingWorkoutReminderDay.day)?.label ?? t("monday");

    return (
      <>
        <Text style={[styles.bottomSheetTitle, { color: theme.text }]}>
          {t("reminderSingular")} â€” {dayLabel}
        </Text>
        <Text style={[styles.settingsOptionLabel, { color: theme.text }]}>{t("reminderTime")}</Text>
        <View style={styles.timePickerRow}>
          <TimePickerColumn
            options={hourOptions}
            selectedValue={selectedHour}
            theme={theme}
            onSelect={(hour) => onPendingWorkoutReminderDayChange({ time: `${hour}:${selectedMinute}` })}
          />
          <TimePickerColumn
            options={minuteOptions}
            selectedValue={selectedMinute}
            theme={theme}
            onSelect={(minute) => onPendingWorkoutReminderDayChange({ time: `${selectedHour}:${minute}` })}
          />
        </View>
        <SettingsSheetSaveButton label={t("save")} theme={theme} onPress={onSaveReminderDay} />
        <AppButton
          icon="close-outline"
          style={styles.bottomSheetButton}
          theme={theme}
          variant="outline"
          onPress={onCancelReminderDay}
        >
          {t("cancel")}
        </AppButton>
      </>
    );
  }

  return null;
}

type SettingsSheetOptionGroupProps<T extends string> = {
  options: Array<{ label: string; value: T }>;
  selectedValue: T;
  theme: Theme;
  onSelect: (value: T) => void;
};

function SettingsSheetOptionGroup<T extends string>({
  onSelect,
  options,
  selectedValue,
  theme
}: SettingsSheetOptionGroupProps<T>) {
  return (
    <View style={[styles.bottomSheetOptionGroup, { borderColor: theme.border }]}>
      {options.map((option, index) => {
        const selected = selectedValue === option.value;

        return (
          <Pressable
            key={option.value || "empty"}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            style={[
              styles.bottomSheetOptionRow,
              {
                backgroundColor: selected ? theme.secondaryBand : theme.card,
                borderBottomColor: theme.border,
                borderBottomWidth: index === options.length - 1 ? 0 : 1
              }
            ]}
            onPress={() => onSelect(option.value)}
          >
            <Text style={[styles.bottomSheetOptionText, { color: theme.text }]}>{option.label}</Text>
            {selected ? <Ionicons name="checkmark-circle" size={22} color={theme.primary} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

type TimePickerColumnProps = {
  options: string[];
  selectedValue: string;
  theme: Theme;
  onSelect: (value: string) => void;
};

function TimePickerColumn({ onSelect, options, selectedValue, theme }: TimePickerColumnProps) {
  return (
    <View style={[styles.timePickerColumn, { borderColor: theme.border }]}>
      <ScrollView style={styles.timePickerScroll} nestedScrollEnabled>
        {options.map((option) => {
          const selected = selectedValue === option;

          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[
                styles.timePickerOption,
                { backgroundColor: selected ? theme.secondaryBand : theme.card }
              ]}
              onPress={() => onSelect(option)}
            >
              <Text style={[styles.bottomSheetOptionText, { color: theme.text }]}>{option}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

type SettingsSheetSaveButtonProps = {
  label: string;
  onPress: () => void;
  theme: Theme;
};

function SettingsSheetSaveButton({ label, onPress, theme }: SettingsSheetSaveButtonProps) {
  return (
    <AppButton icon="save-outline" style={styles.bottomSheetButton} theme={theme} onPress={onPress}>
      {label}
    </AppButton>
  );
}

