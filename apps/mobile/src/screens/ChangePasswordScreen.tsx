import type { Dispatch, SetStateAction } from "react";
import { Text, View } from "react-native";

import { AppButton, PasswordInput } from "../components/AppControls";
import { LegalPage } from "../components/LegalContent";
import type { TranslationKey } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

type ChangePasswordScreenProps = {
  authError: string;
  authMessage: string;
  currentPassword: string;
  isCurrentPasswordVisible: boolean;
  isNewPasswordVisible: boolean;
  isRepeatPasswordVisible: boolean;
  isSubmitting: boolean;
  newPassword: string;
  newPasswordConfirm: string;
  setCurrentPassword: Dispatch<SetStateAction<string>>;
  setIsCurrentPasswordVisible: Dispatch<SetStateAction<boolean>>;
  setIsNewPasswordVisible: Dispatch<SetStateAction<boolean>>;
  setIsRepeatPasswordVisible: Dispatch<SetStateAction<boolean>>;
  setNewPassword: Dispatch<SetStateAction<string>>;
  setNewPasswordConfirm: Dispatch<SetStateAction<string>>;
  t: (key: TranslationKey) => string;
  theme: Theme;
  onBack: () => void;
  onSave: () => void;
};

export function ChangePasswordScreen({
  authError,
  authMessage,
  currentPassword,
  isCurrentPasswordVisible,
  isNewPasswordVisible,
  isRepeatPasswordVisible,
  isSubmitting,
  newPassword,
  newPasswordConfirm,
  setCurrentPassword,
  setIsCurrentPasswordVisible,
  setIsNewPasswordVisible,
  setIsRepeatPasswordVisible,
  setNewPassword,
  setNewPasswordConfirm,
  t,
  theme,
  onBack,
  onSave
}: ChangePasswordScreenProps) {
  return (
    <LegalPage icon="key-outline" title={t("changePassword")} theme={theme} backLabel={t("profile")} onBack={onBack}>
      <View style={styles.bugReportForm}>
        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: theme.text }]}>{t("currentPassword")}</Text>
          <PasswordInput
            isVisible={isCurrentPasswordVisible}
            placeholder={t("currentPassword")}
            setIsVisible={setIsCurrentPasswordVisible}
            theme={theme}
            value={currentPassword}
            onChangeText={setCurrentPassword}
          />
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
        <AppButton disabled={isSubmitting} icon="save-outline" theme={theme} onPress={onSave}>
          {t("save")}
        </AppButton>
      </View>
    </LegalPage>
  );
}
