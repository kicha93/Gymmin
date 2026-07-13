import { Ionicons } from "@expo/vector-icons";
import type { Dispatch, SetStateAction } from "react";
import { Modal, Pressable, Text, View } from "react-native";

import { AppButton, AppIconButton } from "./AppControls";
import type { SortDirection, WorkoutSortField, WorkoutSortSettings } from "../domain/savedWorkouts";
import type { TranslationKey } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

export function WorkoutSortActions({
  onAdd,
  onOpenSort,
  theme
}: {
  onAdd: () => void;
  onOpenSort: () => void;
  theme: Theme;
}) {
  return (
    <View style={styles.panelActions}>
      <AppIconButton icon="swap-vertical-outline" theme={theme} onPress={onOpenSort} />
      <AppIconButton icon="add" theme={theme} onPress={onAdd} />
    </View>
  );
}

type WorkoutSortSheetProps = {
  bottomPadding: number;
  isOpen: boolean;
  onChange: Dispatch<SetStateAction<WorkoutSortSettings>>;
  onClose: () => void;
  sort: WorkoutSortSettings;
  t: (key: TranslationKey) => string;
  theme: Theme;
};

export function WorkoutSortSheet({
  bottomPadding,
  isOpen,
  onChange,
  onClose,
  sort,
  t,
  theme
}: WorkoutSortSheetProps) {
  const fieldOptions: Array<{ label: string; value: WorkoutSortField }> = [
    { label: t("workoutSortCreatedAt"), value: "createdAt" },
    { label: t("workoutSortAlphabetical"), value: "name" }
  ];
  const directionOptions: Array<{ label: string; value: SortDirection }> = [
    { label: t("descending"), value: "desc" },
    { label: t("ascending"), value: "asc" }
  ];

  return (
    <Modal animationType="fade" transparent visible={isOpen} onRequestClose={onClose}>
      <View style={styles.bottomSheetRoot}>
        <Pressable accessibilityRole="button" style={styles.bottomSheetBackdrop} onPress={onClose} />
        <View style={[styles.bottomSheetPanel, { backgroundColor: theme.card, paddingBottom: bottomPadding }]}>
          <Text style={[styles.bottomSheetTitle, { color: theme.text }]}>{t("workoutSortTitle")}</Text>
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.muted }]}>{t("workoutSortField")}</Text>
            <View style={[styles.bottomSheetOptionGroup, { borderColor: theme.border }]}>
              {fieldOptions.map((option, index) => {
                const selected = sort.field === option.value;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[
                      styles.bottomSheetOptionRow,
                      {
                        backgroundColor: selected ? theme.secondaryBand : theme.card,
                        borderBottomColor: theme.border,
                        borderBottomWidth: index === fieldOptions.length - 1 ? 0 : 1
                      }
                    ]}
                    onPress={() => onChange((current) => ({ ...current, field: option.value }))}
                  >
                    <Text style={[styles.bottomSheetOptionText, { color: theme.text }]}>{option.label}</Text>
                    {selected ? <Ionicons name="checkmark-circle" size={22} color={theme.primary} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.muted }]}>{t("workoutSortDirection")}</Text>
            <View style={[styles.bottomSheetOptionGroup, { borderColor: theme.border }]}>
              {directionOptions.map((option, index) => {
                const selected = sort.direction === option.value;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[
                      styles.bottomSheetOptionRow,
                      {
                        backgroundColor: selected ? theme.secondaryBand : theme.card,
                        borderBottomColor: theme.border,
                        borderBottomWidth: index === directionOptions.length - 1 ? 0 : 1
                      }
                    ]}
                    onPress={() => onChange((current) => ({ ...current, direction: option.value }))}
                  >
                    <Text style={[styles.bottomSheetOptionText, { color: theme.text }]}>{option.label}</Text>
                    {selected ? <Ionicons name="checkmark-circle" size={22} color={theme.primary} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
          <AppButton icon="save-outline" style={styles.bottomSheetButton} theme={theme} onPress={onClose}>
            {t("save")}
          </AppButton>
        </View>
      </View>
    </Modal>
  );
}
