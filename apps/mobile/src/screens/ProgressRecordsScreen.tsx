import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";

import { getExerciseDisplayName } from "../domain/exercises";
import { getProgressReportRecords } from "../domain/progressReport";
import type { WorkoutSession } from "../domain/workoutSessions";
import type { LanguageCode, TranslationKey } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

type ProgressRecordsScreenProps = {
  language: LanguageCode;
  onOpenExercise: (exerciseKey: string) => void;
  sessions: WorkoutSession[];
  t: (key: TranslationKey) => string;
  theme: Theme;
};

export function ProgressRecordsScreen({
  language,
  onOpenExercise,
  sessions,
  t,
  theme
}: ProgressRecordsScreenProps) {
  const records = useMemo(() => getProgressReportRecords(sessions), [sessions]);

  return (
    <View style={styles.progressReportScreen}>
      <View style={[styles.progressReportCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.progressReportCardTitle, { color: theme.text }]}>{t("progressRecentRecords")}</Text>
        <Text style={[styles.progressReportNoComparison, { color: theme.muted }]}>{t("progressRecordsDefinition")}</Text>
        <View style={styles.progressReportRecords}>
          {records.length ? records.map((record, index) => (
            <Pressable
              key={record.sessionId + record.exerciseKey}
              accessibilityRole="button"
              style={[styles.progressReportRecordRow, { borderTopColor: theme.border }]}
              onPress={() => onOpenExercise(record.exerciseKey)}
            >
              <View style={[styles.progressReportRecordIndex, { backgroundColor: theme.secondaryBand }]}>
                <Text style={[styles.progressReportRecordIndexText, { color: theme.primary }]}>{index + 1}</Text>
              </View>
              <View style={styles.progressReportRecordListCopy}>
                <Text numberOfLines={2} style={[styles.progressReportRecordName, { color: theme.text }]}>
                  {getExerciseDisplayName(record.exerciseName, language)}
                </Text>
                <Text style={[styles.progressReportRecordDate, { color: theme.muted }]}>
                  {record.achievedAt.toLocaleDateString(language === "pl" ? "pl-PL" : "en-US")}
                </Text>
              </View>
              <Text style={[styles.progressReportRecordValue, { color: theme.text }]}>
                {Math.round(record.estimatedOneRepMaxKg) + " kg e1RM"}
              </Text>
              <Ionicons name="chevron-forward" size={17} color={theme.muted} />
            </Pressable>
          )) : (
            <Text style={[styles.progressReportNoComparison, { color: theme.muted }]}>
              {t("progressNeedsMoreData")}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}
