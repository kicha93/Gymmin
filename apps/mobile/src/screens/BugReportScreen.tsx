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
  fallbackReport: string;
  onBack: () => void;
  onChangeDescription: (value: string) => void;
  onChangeTitle: (value: string) => void;
  onCopyEmail: () => void;
  onCopyReport: () => void;
  onSubmit: () => void;
  t: Translate;
  theme: Theme;
  title: string;
};

export function BugReportScreen({
  description,
  error,
  isSubmitting,
  fallbackReport,
  onBack,
  onChangeDescription,
  onChangeTitle,
  onCopyEmail,
  onCopyReport,
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
        {error ? <Text style={[styles.inlineError, { color: theme.danger }]}>{error}</Text> : null}
        {fallbackReport ? (
          <View style={[styles.termsHeroCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Text style={[styles.legalText, { color: theme.text }]}>{t("bugEmailFallback")}</Text>
            <AppButton variant="outline" icon="copy-outline" theme={theme} onPress={onCopyEmail}>
              {t("copyEmailAddress")}
            </AppButton>
            <AppButton variant="outline" icon="copy-outline" theme={theme} onPress={onCopyReport}>
              {t("copyBugReport")}
            </AppButton>
          </View>
        ) : null}
        <AppButton disabled={isSubmitting} icon="send-outline" theme={theme} onPress={onSubmit}>
          {isSubmitting ? t("bugSubmitting") : t("submitBug")}
        </AppButton>
      </View>
    </LegalPage>
  );
}
