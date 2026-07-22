import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";

import type { WorkoutExportFormat } from "../domain/workoutExport/workoutExportTypes";
import type { TranslationKey } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

type WorkoutExportSheetProps = {
  bottomPadding: number;
  exportingFormat: WorkoutExportFormat | null;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (format: WorkoutExportFormat) => void;
  t: (key: TranslationKey) => string;
  theme: Theme;
};

const formats: Array<{
  descriptionKey: TranslationKey;
  format: WorkoutExportFormat;
  icon: keyof typeof Ionicons.glyphMap;
  titleKey: TranslationKey;
}> = [
  {
    descriptionKey: "workoutExportCsvDescription",
    format: "csv",
    icon: "document-text-outline",
    titleKey: "workoutExportCsv"
  },
  {
    descriptionKey: "workoutExportXlsxDescription",
    format: "xlsx",
    icon: "grid-outline",
    titleKey: "workoutExportXlsx"
  }
];

export function WorkoutExportSheet({
  bottomPadding,
  exportingFormat,
  isOpen,
  onClose,
  onSelect,
  t,
  theme
}: WorkoutExportSheetProps) {
  const isExporting = exportingFormat !== null;

  return (
    <Modal animationType="fade" transparent visible={isOpen} onRequestClose={isExporting ? undefined : onClose}>
      <View style={styles.bottomSheetRoot}>
        <Pressable
          accessibilityRole="button"
          disabled={isExporting}
          style={styles.bottomSheetBackdrop}
          onPress={onClose}
        />
        <View style={[styles.bottomSheetPanel, { backgroundColor: theme.card, paddingBottom: bottomPadding }]}>
          <Text style={[styles.bottomSheetTitle, { color: theme.text }]}>{t("workoutExportTitle")}</Text>
          <Text style={[styles.workoutExportDescription, { color: theme.muted }]}>
            {isExporting ? t("workoutExporting") : t("workoutExportChooseFormat")}
          </Text>
          <View style={[styles.bottomSheetOptionGroup, { borderColor: theme.border }]}>
            {formats.map((option, index) => (
              <Pressable
                key={option.format}
                accessibilityRole="button"
                disabled={isExporting}
                style={[
                  styles.workoutExportOption,
                  {
                    borderBottomColor: theme.border,
                    borderBottomWidth: index === formats.length - 1 ? 0 : 1,
                    opacity: isExporting && exportingFormat !== option.format ? 0.55 : 1
                  }
                ]}
                onPress={() => onSelect(option.format)}
              >
                <View style={[styles.workoutExportIcon, { backgroundColor: theme.secondaryBand }]}>
                  <Ionicons name={option.icon} size={23} color={theme.primary} />
                </View>
                <View style={styles.workoutExportOptionCopy}>
                  <Text style={[styles.workoutExportOptionTitle, { color: theme.text }]}>{t(option.titleKey)}</Text>
                  <Text style={[styles.workoutExportOptionDescription, { color: theme.muted }]}>
                    {t(option.descriptionKey)}
                  </Text>
                </View>
                {exportingFormat === option.format
                  ? <ActivityIndicator color={theme.primary} />
                  : <Ionicons name="chevron-forward" size={20} color={theme.muted} />}
              </Pressable>
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={isExporting}
            style={[styles.workoutExportCancel, { opacity: isExporting ? 0.55 : 1 }]}
            onPress={onClose}
          >
            <Text style={[styles.workoutExportCancelText, { color: theme.primary }]}>{t("cancel")}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
