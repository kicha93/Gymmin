import type { Dispatch, SetStateAction } from "react";
import { Text, View } from "react-native";

import { AppButton, AppInput, PasswordInput } from "../components/AppControls";
import { LegalPage } from "../components/LegalContent";
import type { TranslationKey } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

type ForgotPasswordScreenProps = {
  authError: string;
  authMessage: string;
  isNewPasswordVisible: boolean;
  isRepeatPasswordVisible: boolean;
  isSubmitting: boolean;
  newPassword: string;
  newPasswordConfirm: string;
  resetEmail: string;
  resetToken: string;
  setIsNewPasswordVisible: Dispatch<SetStateAction<boolean>>;
  setIsRepeatPasswordVisible: Dispatch<SetStateAction<boolean>>;
  setNewPassword: Dispatch<SetStateAction<string>>;
  setNewPasswordConfirm: Dispatch<SetStateAction<string>>;
  setResetEmail: Dispatch<SetStateAction<string>>;
  setResetToken: Dispatch<SetStateAction<string>>;
  t: (key: TranslationKey) => string;
  theme: Theme;
  onBack: () => void;
  onConfirm: () => void;
  onRequest: () => void;
};

export function ForgotPasswordScreen({
  authError,
  authMessage,
  isNewPasswordVisible,
  isRepeatPasswordVisible,
  isSubmitting,
  newPassword,
  newPasswordConfirm,
  resetEmail,
  resetToken,
  setIsNewPasswordVisible,
  setIsRepeatPasswordVisible,
  setNewPassword,
  setNewPasswordConfirm,
  setResetEmail,
  setResetToken,
  t,
  theme,
  onBack,
  onConfirm,
  onRequest
}: ForgotPasswordScreenProps) {
  return (
    <LegalPage icon="key-outline" title={t("resetPassword")} theme={theme} backLabel={t("backToStart")} onBack={onBack}>
      <Text style={[styles.legalText, { color: theme.muted }]}>{t("resetPasswordRequestIntro")}</Text>
      <View style={styles.bugReportForm}>
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.text }]}>Email</Text>
          <AppInput
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="email"
            theme={theme}
            value={resetEmail}
            onChangeText={setResetEmail}
          />
        </View>
        <AppButton disabled={isSubmitting} icon="mail-outline" theme={theme} onPress={onRequest}>
          {t("sendResetInstructions")}
        </AppButton>
        <View style={[styles.legalDivider, { backgroundColor: theme.border }]} />
        <Text style={[styles.legalText, { color: theme.muted }]}>{t("resetPasswordConfirmIntro")}</Text>
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.text }]}>{t("resetToken")}</Text>
          <AppInput theme={theme} value={resetToken} onChangeText={setResetToken} />
        </View>
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.text }]}>{t("newPassword")}</Text>
          <PasswordInput
            isVisible={isNewPasswordVisible}
            placeholder={t("newPassword")}
            setIsVisible={setIsNewPasswordVisible}
            theme={theme}
            value={newPassword}
            onChangeText={setNewPassword}
          />
        </View>
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.text }]}>{t("repeatNewPassword")}</Text>
          <PasswordInput
            isVisible={isRepeatPasswordVisible}
            placeholder={t("repeatNewPassword")}
            setIsVisible={setIsRepeatPasswordVisible}
            theme={theme}
            value={newPasswordConfirm}
            onChangeText={setNewPasswordConfirm}
          />
        </View>
        {authError ? <Text style={[styles.authError, { color: theme.danger }]}>{authError}</Text> : null}
        {authMessage ? <Text style={[styles.legalText, { color: theme.primary }]}>{authMessage}</Text> : null}
        <AppButton disabled={isSubmitting} icon="checkmark-outline" theme={theme} onPress={onConfirm}>
          {t("setNewPassword")}
        </AppButton>
      </View>
    </LegalPage>
  );
}
