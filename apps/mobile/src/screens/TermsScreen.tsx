import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import type { TranslationKey } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

type Translate = (key: TranslationKey) => string;

type TermsScreenProps = {
  onOpenInfo: () => void;
  t: Translate;
  theme: Theme;
};

const summaryItems: Array<{
  icon: keyof typeof Ionicons.glyphMap;
  text: TranslationKey;
  title: TranslationKey;
}> = [
  { icon: "bookmark-outline", text: "termsPurposeText", title: "termsPurposeTitle" },
  { icon: "person-outline", text: "termsUserResponsibilityText", title: "termsUserResponsibilityTitle" },
  { icon: "alert-circle-outline", text: "termsNoSpecialistsText", title: "termsNoSpecialistsTitle" }
];

const detailedSections: Array<{
  icon: keyof typeof Ionicons.glyphMap;
  id: string;
  text: TranslationKey;
  title: TranslationKey;
}> = [
  { icon: "document-text-outline", id: "general", text: "termsGeneralText", title: "termsGeneralTitle" },
  { icon: "person-outline", id: "account", text: "termsAccountText", title: "termsAccountTitle" },
  { icon: "barbell-outline", id: "usage", text: "termsUsageText", title: "termsUsageTitle" },
  { icon: "save-outline", id: "workout-data", text: "termsWorkoutDataText", title: "termsWorkoutDataTitle" },
  { icon: "shield-checkmark-outline", id: "safety", text: "termsResponsibilitySafetyText", title: "termsResponsibilitySafetyTitle" },
  { icon: "bug-outline", id: "issues", text: "termsReportingIssuesText", title: "termsReportingIssuesTitle" },
  { icon: "refresh-outline", id: "changes", text: "termsChangesText", title: "termsChangesTitle" }
];

const benefitItems: Array<[keyof typeof Ionicons.glyphMap, TranslationKey]> = [
  ["barbell-outline", "termsBenefitWorkouts"],
  ["trending-up-outline", "termsBenefitProgress"],
  ["shield-checkmark-outline", "termsBenefitResponsibly"]
];

export function TermsScreen({ onOpenInfo, t, theme }: TermsScreenProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const areAllTermsExpanded = detailedSections.every((section) => expandedSections[section.id]);

  return (
    <View style={styles.termsScreen}>
      <View style={[styles.termsHeroCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.termsHeroTop}>
          <View style={[styles.termsHeroIcon, { backgroundColor: theme.secondaryBand }]}>
            <Ionicons name="shield-checkmark-outline" size={40} color={theme.primary} />
          </View>
          <View style={styles.termsHeroCopy}>
            <Text style={[styles.termsHeroTitle, { color: theme.text }]}>{t("termsHeroTitle")}</Text>
            <Text style={[styles.termsHeroDescription, { color: theme.muted }]}>{t("termsHeroDescription")}</Text>
          </View>
        </View>
        <View style={[styles.termsBenefits, { borderTopColor: theme.border }]}>
          {benefitItems.map(([icon, label]) => (
            <View key={label} style={styles.termsBenefit}>
              <View style={[styles.termsBenefitIcon, { backgroundColor: theme.secondaryBand }]}>
                <Ionicons name={icon} size={19} color={theme.primary} />
              </View>
              <Text style={[styles.termsBenefitText, { color: theme.text }]}>{t(label)}</Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={[styles.termsSectionTitle, { color: theme.text }]}>{t("termsInShort")}</Text>
      <View style={[styles.termsSummaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {summaryItems.map((item, index) => (
          <View
            key={item.title}
            style={[
              styles.termsSummaryRow,
              { borderBottomColor: theme.border },
              index === summaryItems.length - 1 ? styles.termsSummaryRowLast : null
            ]}
          >
            <View style={[styles.termsSummaryIcon, { backgroundColor: theme.secondaryBand }]}>
              <Ionicons name={item.icon} size={22} color={theme.primary} />
            </View>
            <View style={styles.termsSummaryCopy}>
              <Text style={[styles.termsSummaryTitle, { color: theme.text }]}>{t(item.title)}</Text>
              <Text style={[styles.termsSummaryText, { color: theme.muted }]}>{t(item.text)}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={[styles.termsBugCallout, { backgroundColor: theme.control, borderColor: theme.border }]}>
        <View style={styles.termsBugCalloutHeader}>
          <View style={[styles.termsSummaryIcon, { backgroundColor: theme.secondaryBand }]}>
            <Ionicons name="information-circle-outline" size={25} color={theme.primary} />
          </View>
          <Text style={[styles.termsBugCalloutText, { color: theme.text }]}>{t("termsBugCallout")}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          style={[styles.termsInfoButton, { borderColor: theme.primary }]}
          onPress={onOpenInfo}
        >
          <Text style={[styles.termsInfoButtonText, { color: theme.primary }]}>{t("termsGoToInfo")}</Text>
        </Pressable>
      </View>

      <View style={styles.termsDetailedHeader}>
        <Text style={[styles.termsSectionTitle, { color: theme.text }]}>{t("termsDetailedRules")}</Text>
        <Pressable
          accessibilityRole="button"
          style={styles.termsExpandAllButton}
          onPress={() =>
            setExpandedSections(Object.fromEntries(detailedSections.map((section) => [section.id, !areAllTermsExpanded])))
          }
        >
          <Text style={[styles.termsExpandAllText, { color: theme.primary }]}>
            {areAllTermsExpanded ? t("termsCollapseAll") : t("termsExpandAll")}
          </Text>
          <Ionicons name={areAllTermsExpanded ? "chevron-up" : "chevron-down"} size={18} color={theme.primary} />
        </Pressable>
      </View>
      <View style={[styles.termsAccordion, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {detailedSections.map((section, index) => {
          const isExpanded = expandedSections[section.id] === true;

          return (
            <View
              key={section.id}
              style={[
                styles.termsAccordionItem,
                { borderBottomColor: theme.border },
                index === detailedSections.length - 1 ? styles.termsAccordionItemLast : null
              ]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: isExpanded }}
                style={styles.termsAccordionHeader}
                onPress={() => setExpandedSections((current) => ({ ...current, [section.id]: !isExpanded }))}
              >
                <View style={[styles.termsAccordionIcon, { backgroundColor: theme.secondaryBand }]}>
                  <Ionicons name={section.icon} size={19} color={theme.primary} />
                </View>
                <Text style={[styles.termsAccordionTitle, { color: theme.text }]}>{`${index + 1}. ${t(section.title)}`}</Text>
                <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color={theme.primary} />
              </Pressable>
              {isExpanded ? <Text style={[styles.termsAccordionText, { color: theme.muted }]}>{t(section.text)}</Text> : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}
