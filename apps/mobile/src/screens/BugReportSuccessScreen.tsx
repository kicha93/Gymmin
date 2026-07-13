import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { AppButton } from "../components/AppControls";
import { LegalPage } from "../components/LegalContent";
import type { TranslationKey } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

type BugReportSuccessScreenProps = {
  onDone: () => void;
  reportId: string;
  t: (key: TranslationKey) => string;
  theme: Theme;
};

export function BugReportSuccessScreen({ onDone, reportId, t, theme }: BugReportSuccessScreenProps) {
  return (
    <LegalPage
      icon="checkmark-circle-outline"
      title={t("bugReport")}
      theme={theme}
      backLabel={t("backToStart")}
      onBack={onDone}
    >
      <View style={[styles.bugSuccessBox, { backgroundColor: theme.secondaryBand }]}>
        <View style={styles.bugSuccessHeader}>
          <View style={[styles.bugSuccessIcon, { backgroundColor: theme.card }]}>
            <Ionicons name="checkmark-circle-outline" size={28} color={theme.primary} />
          </View>
          <Text style={[styles.bugSuccessText, { color: theme.text }]}>{t("bugAccepted")}</Text>
        </View>
        {reportId ? (
          <View style={[styles.bugSuccessIdBox, { backgroundColor: theme.card }]}>
            <Text style={[styles.contactLabel, { color: theme.muted }]}>ID</Text>
            <Text selectable style={[styles.bugSuccessIdText, { color: theme.text }]}>{reportId}</Text>
          </View>
        ) : null}
      </View>
      <AppButton icon="checkmark-outline" theme={theme} onPress={onDone}>
        {t("bugSuccessOk")}
      </AppButton>
    </LegalPage>
  );
}
