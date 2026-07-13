import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

type LegalPageProps = {
  backLabel?: string;
  children: ReactNode;
  icon: keyof typeof Ionicons.glyphMap;
  onBack: () => void;
  theme: Theme;
  title: string;
};

export function LegalPage({ children, theme }: LegalPageProps) {
  return (
    <View style={[styles.legalPanel, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.legalContent}>{children}</View>
    </View>
  );
}

type FaqItemProps = {
  answer: string;
  initiallyExpanded?: boolean;
  question: string;
  theme: Theme;
};

export function FaqItem({ answer, initiallyExpanded = false, question, theme }: FaqItemProps) {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);

  return (
    <View style={[styles.faqItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        style={styles.faqHeader}
        onPress={() => setIsExpanded((current) => !current)}
      >
        <View style={[styles.faqIcon, { backgroundColor: theme.secondaryBand }]}>
          <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color={theme.primary} />
        </View>
        <Text style={[styles.faqQuestion, { color: theme.text }]}>{question}</Text>
        <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color={theme.primary} />
      </Pressable>
      {isExpanded ? <Text style={[styles.faqAnswer, { color: theme.muted }]}>{answer}</Text> : null}
    </View>
  );
}
