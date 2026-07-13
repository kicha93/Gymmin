import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { AppButton, AppInput, AppTextarea } from "../components/AppControls";
import { LegalPage } from "../components/LegalContent";
import type { TranslationKey } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

type Translate = (key: TranslationKey) => string;

type BugReportScreenProps = {
  description: string;
  error: string;
  isSubmitting: boolean;
  onBack: () => void;
  onChangeDescription: (value: string) => void;
  onChangeTitle: (value: string) => void;
  onSubmit: () => void;
  t: Translate;
  theme: Theme;
  title: string;
};

export function BugReportScreen({
  description,
  error,
  isSubmitting,
  onBack,
  onChangeDescription,
  onChangeTitle,
  onSubmit,
  t,
  theme,
  title
}: BugReportScreenProps) {
  return (
    <LegalPage
      icon="bug-outline"
      title={t("bugReport")}
      theme={theme}
      backLabel={t("backToSettings")}
      onBack={onBack}
    >
      <Text style={[styles.legalText, { color: theme.muted }]}>{t("bugIntro")}</Text>
      <View style={styles.bugReportForm}>
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.text }]}>{t("bugTitle")}</Text>
          <AppInput
            placeholder={t("bugTitlePlaceholder")}
            theme={theme}
            value={title}
            onChangeText={onChangeTitle}
          />
        </View>
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.text }]}>{t("bugDescription")}</Text>
          <AppTextarea
            placeholder={t("bugDescriptionPlaceholder")}
            style={styles.bugReportTextarea}
            theme={theme}
            value={description}
            onChangeText={onChangeDescription}
          />
        </View>
        {error ? <Text style={[styles.authError, { color: theme.danger }]}>{error}</Text> : null}
        <AppButton disabled={isSubmitting} icon="send-outline" theme={theme} onPress={onSubmit}>
          {isSubmitting ? t("bugSubmitting") : t("submitBug")}
        </AppButton>
      </View>
    </LegalPage>
  );
}

type BugReportSuccessScreenProps = {
  onDone: () => void;
  reportId: string;
  t: Translate;
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
