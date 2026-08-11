import { Text, View } from "react-native";

import {
  getMuscleImpactGroups,
  muscleLabels,
  type ExerciseLanguage,
  type InfluenceScore,
  type MuscleKey
} from "../domain/exercises";
import type { TranslationKey } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

export const muscleImpactColors: Record<InfluenceScore, string> = {
  0: "#4a4d4c",
  1: "#69b9ae",
  2: "#f4df82",
  3: "#ffc43d",
  4: "#ff7a3d",
  5: "#ff3347"
};

export function getMuscleImpactColor(impact: InfluenceScore | undefined) {
  return muscleImpactColors[impact ?? 0];
}

type MuscleImpactTextGroupsProps = {
  impact: Record<MuscleKey, InfluenceScore>;
  language: ExerciseLanguage;
  t: (key: TranslationKey) => string;
  theme: Theme;
};

export function MuscleImpactTextGroups({ impact, language, t, theme }: MuscleImpactTextGroupsProps) {
  const groups = getMuscleImpactGroups(impact);
  const entries: Array<{ key: keyof typeof groups; label: TranslationKey }> = [
    { key: "primary", label: "primaryMuscles" },
    { key: "major", label: "majorContributorMuscles" },
    { key: "significant", label: "significantSynergistMuscles" },
    { key: "secondary", label: "secondaryImpactMuscles" },
    { key: "stabilizing", label: "stabilizingMuscles" }
  ];

  return (
    <View style={styles.exerciseMuscleLists}>
      {entries.map(({ key, label }) => {
        const muscles = groups[key];
        if (!muscles.length) {
          return null;
        }

        return (
          <View key={key} style={styles.fieldGroup}>
            <Text style={[styles.label, { color: theme.muted }]}>{t(label)}</Text>
            <Text style={[styles.workoutMeta, { color: theme.text }]}>
              {muscles.map((muscle) => muscleLabels[language][muscle]).join(", ")}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
