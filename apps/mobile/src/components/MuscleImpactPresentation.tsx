import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import {
  getMuscleImpactGroups,
  muscleLabels,
  muscleKeys,
  type ExerciseLanguage,
  type InfluenceScore,
  type MuscleKey
} from "../domain/exercises";
import {
  getAdvancedDisplayFamily,
  getAdvancedExerciseProfile,
  getAdvancedMuscleSubdivision
} from "../domain/advancedMuscles";
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

const muscleImpactLegendEntries: Array<{ impact: InfluenceScore; label: TranslationKey }> = [
  { impact: 5, label: "primaryMuscles" },
  { impact: 4, label: "majorContributorMuscles" },
  { impact: 3, label: "significantSynergistMuscles" },
  { impact: 2, label: "secondaryImpactMuscles" },
  { impact: 1, label: "stabilizingMuscles" },
  { impact: 0, label: "inactiveMuscleGroups" }
];

type MuscleImpactLegendProps = {
  impact: Record<MuscleKey, InfluenceScore>;
  t: (key: TranslationKey) => string;
  theme: Theme;
};

export function MuscleImpactLegend({ impact, t, theme }: MuscleImpactLegendProps) {
  const count = (score: InfluenceScore) => muscleKeys.filter((muscle) => impact[muscle] === score).length;

  return (
    <View style={styles.muscleOverviewLegend}>
      {muscleImpactLegendEntries.map((entry) => (
        <View key={entry.impact} style={styles.muscleLegendItem}>
          <View style={[styles.muscleLegendDot, { backgroundColor: muscleImpactColors[entry.impact] }]} />
          <Text style={[styles.muscleLegendText, { color: theme.muted }]}>
            {`${t(entry.label)} (${count(entry.impact)})`}
          </Text>
        </View>
      ))}
    </View>
  );
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

type AdvancedMuscleImpactGroupsProps = MuscleImpactTextGroupsProps & {
  exerciseId: string;
  side: "front" | "back";
};

export function AdvancedMuscleImpactGroups({ exerciseId, impact, language, side, t, theme }: AdvancedMuscleImpactGroupsProps) {
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});
  const profile = getAdvancedExerciseProfile(exerciseId);

  useEffect(() => {
    setExpandedParents({});
  }, [exerciseId, side]);

  if (!profile) return <MuscleImpactTextGroups impact={impact} language={language} t={t} theme={theme} />;

  const categoryLabel = (score: InfluenceScore) => {
    if (score === 5) return t("primaryMuscles");
    if (score === 4) return t("majorContributorMuscles");
    if (score === 3) return t("significantSynergistMuscles");
    if (score === 2) return t("secondaryImpactMuscles");
    return t("stabilizingMuscles");
  };

  return (
    <View style={styles.exerciseMuscleLists}>
      {profile.parents.map((parent) => {
        const parentLevel = impact[parent.standardParentMuscle];
        if (parent.status !== "mapped") {
          return (
            <View key={parent.standardParentMuscle} style={styles.advancedMuscleParent}>
              <View style={styles.advancedMuscleParentHeader}>
                <Text style={[styles.workoutMeta, { color: theme.text }]}>{muscleLabels[language][parent.standardParentMuscle]}</Text>
                <Text style={[styles.advancedMuscleCategory, { color: theme.muted }]}>{categoryLabel(parentLevel)}</Text>
              </View>
            </View>
          );
        }

        const subdivisions = parent.engagement.flatMap(([subdivisionId, level]) => {
          const subdivision = getAdvancedMuscleSubdivision(subdivisionId);
          return subdivision && (subdivision.side === "both" || subdivision.side === side)
            ? [{ level, subdivision }]
            : [];
        });
        if (!subdivisions.length) return null;
        const family = getAdvancedDisplayFamily(subdivisions[0].subdivision.displayFamilyId);
        const parentLabel = family?.names[language] ?? muscleLabels[language][parent.standardParentMuscle];
        const expanded = expandedParents[parent.standardParentMuscle] === true;

        return (
          <View key={parent.standardParentMuscle} style={styles.advancedMuscleParent}>
            <Pressable
              accessibilityLabel={parentLabel}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              style={styles.advancedMuscleParentToggle}
              onPress={() => setExpandedParents((current) => ({
                ...current,
                [parent.standardParentMuscle]: !expanded
              }))}
            >
              <View style={styles.advancedMuscleParentHeader}>
                <Text style={[styles.workoutMeta, { color: theme.text }]}>{parentLabel}</Text>
                <Text style={[styles.advancedMuscleCategory, { color: theme.muted }]}>{categoryLabel(parentLevel)}</Text>
              </View>
              <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color={theme.muted} />
            </Pressable>
            {expanded ? subdivisions.map(({ level, subdivision }) => (
              <View key={subdivision.id} style={styles.advancedMuscleRow}>
                <View style={[styles.advancedMuscleBranch, { borderColor: theme.border }]} />
                <View style={styles.advancedMuscleRowContent}>
                  <Text style={[styles.advancedMuscleName, { color: theme.muted }]}>{subdivision.names[language]}</Text>
                  <View style={[styles.advancedMuscleTrack, { backgroundColor: theme.segment }]}>
                    <View style={{ backgroundColor: getMuscleImpactColor(parentLevel), borderRadius: 999, height: "100%", width: `${level * 20}%` }} />
                  </View>
                </View>
              </View>
            )) : null}
          </View>
        );
      })}
    </View>
  );
}
