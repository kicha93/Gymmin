import { Ionicons } from "@expo/vector-icons";
import { Linking, Pressable, Text, View } from "react-native";

import { AppButton } from "../components/AppControls";
import { FaqItem, LegalPage } from "../components/LegalContent";
import { buildContactMailUrl, GYMMIN_CONTACT_EMAIL } from "../domain/contact";
import type { TranslationKey } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

type ContactScreenProps = {
  onBack: () => void;
  onOpenBugReport: () => void;
  onShowInfo: (title: string, message: string) => void;
  t: (key: TranslationKey) => string;
  theme: Theme;
};

export function ContactScreen({ onBack, onOpenBugReport, onShowInfo, t, theme }: ContactScreenProps) {
  const openContactEmail = async () => {
    try {
      const url = buildContactMailUrl();
      const canOpenMail = await Linking.canOpenURL(url);
      if (!canOpenMail) {
        throw new Error("No mail client is available");
      }
      await Linking.openURL(url);
    } catch {
      onShowInfo(t("contact"), `${t("contactEmailOpenError")} ${GYMMIN_CONTACT_EMAIL}`);
    }
  };

  return (
    <LegalPage
      icon="mail-outline"
      title={t("contact")}
      theme={theme}
      backLabel={t("backToSettings")}
      onBack={onBack}
    >
      <View style={styles.contactIntroBlock}>
        <Text style={[styles.contactIntroTitle, { color: theme.text }]}>{t("contactIntro")}</Text>
        <Text style={[styles.contactIntroCopy, { color: theme.muted }]}>{t("contactEmailIntro")}</Text>
      </View>
      <View style={[styles.contactBox, { backgroundColor: theme.secondaryBand, borderColor: theme.border }]}>
        <Text style={[styles.contactLabel, { color: theme.muted }]}>{t("contactEmailLabel")}</Text>
        <Text selectable style={[styles.contactValue, { color: theme.text }]}>{GYMMIN_CONTACT_EMAIL}</Text>
        <AppButton icon="mail-outline" theme={theme} onPress={() => { void openContactEmail(); }}>
          {t("contactEmailCta")}
        </AppButton>
      </View>
      <View style={[styles.contactInfoPill, { backgroundColor: theme.control, borderColor: theme.border }]}>
        <View style={[styles.contactCalloutIcon, { backgroundColor: theme.secondaryBand }]}>
          <Ionicons name="time-outline" size={20} color={theme.primary} />
        </View>
        <Text style={[styles.contactInfoPillText, { color: theme.muted }]}>{t("contactResponseTime")}</Text>
      </View>
      <View style={[styles.contactBugCallout, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={[styles.contactCalloutIcon, { backgroundColor: theme.secondaryBand }]}>
          <Ionicons name="bug-outline" size={22} color={theme.primary} />
        </View>
        <View style={styles.contactBugCalloutCopy}>
          <Text style={[styles.contactBugCalloutText, { color: theme.muted }]}>{t("contactBugInfo")}</Text>
          <Pressable accessibilityRole="button" style={styles.contactBugAction} onPress={onOpenBugReport}>
            <Text style={[styles.contactBugActionText, { color: theme.primary }]}>{t("contactBugAction")}</Text>
            <Ionicons name="arrow-forward" size={16} color={theme.primary} />
          </Pressable>
        </View>
      </View>
      <Text style={[styles.contactFaqTitle, { color: theme.text }]}>{t("faq")}</Text>
      <FaqItem
        answer={t("contactFaqBugAnswer")}
        initiallyExpanded
        question={t("contactFaqBugQuestion")}
        theme={theme}
      />
      <FaqItem answer={t("contactFaqIdeaAnswer")} question={t("contactFaqIdeaQuestion")} theme={theme} />
      <FaqItem answer={t("contactFaqWorkoutAnswer")} question={t("contactFaqWorkoutQuestion")} theme={theme} />
    </LegalPage>
  );
}
