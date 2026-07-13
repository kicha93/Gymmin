import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { AppButton, AppInput } from "../components/AppControls";
import type { TranslationKey } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

type DeleteAccountScreenProps = {
  canDelete: boolean;
  confirmation: string;
  confirmationPhrase: string;
  error: string;
  isDeleting: boolean;
  onCancel: () => void;
  onChangeConfirmation: (value: string) => void;
  onDelete: () => void;
  t: (key: TranslationKey) => string;
  theme: Theme;
};

export function DeleteAccountScreen({
  canDelete,
  confirmation,
  confirmationPhrase,
  error,
  isDeleting,
  onCancel,
  onChangeConfirmation,
  onDelete,
  t,
  theme
}: DeleteAccountScreenProps) {
  return (
    <View style={styles.profileScreen}>
      <View style={[styles.profileAccountCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.accountDetailsHeader}>
          <View style={[styles.profileQuickActionIcon, { backgroundColor: theme.secondaryBand }]}>
            <Ionicons name="trash-outline" size={24} color={theme.danger} />
          </View>
          <View style={styles.workoutInfo}>
            <Text style={[styles.profileSectionHeading, { color: theme.text }]}>{t("deleteAccount")}</Text>
            <Text style={[styles.workoutMeta, { color: theme.danger }]}>{t("deleteAccountIrreversible")}</Text>
          </View>
        </View>

        <Text style={[styles.workoutMeta, styles.deleteAccountCopy, { color: theme.muted }]}>
          {t("deleteAccountCopy")}
        </Text>
        <Text style={[styles.workoutMeta, styles.deleteAccountCopy, { color: theme.text }]}>
          {t("deleteAccountTypeToConfirm")}
        </Text>
        <AppInput
          autoCapitalize="characters"
          editable={!isDeleting}
          placeholder={t("deleteAccountInputPlaceholder")}
          style={{ borderColor: canDelete || !confirmation ? theme.border : theme.danger }}
          theme={theme}
          value={confirmation}
          onChangeText={onChangeConfirmation}
        />
        {error ? <Text style={[styles.authError, { color: theme.danger }]}>{error}</Text> : null}
        <View style={styles.deleteAccountActions}>
          <AppButton
            disabled={isDeleting}
            icon="close-outline"
            style={styles.deleteAccountActionButton}
            theme={theme}
            variant="outline"
            onPress={onCancel}
          >
            {t("cancel")}
          </AppButton>
          <AppButton
            disabled={!canDelete || isDeleting}
            icon="trash-outline"
            style={[styles.deleteAccountActionButton, { backgroundColor: theme.danger }]}
            textStyle={{ color: theme.white }}
            theme={theme}
            onPress={onDelete}
          >
            {isDeleting ? `${t("deleteAccount")}...` : t("deleteAccountPermanent")}
          </AppButton>
        </View>
        <Text style={[styles.workoutMeta, { color: theme.muted }]}>
          {t("deleteAccountRequiredPhrase").replace("{phrase}", confirmationPhrase)}
        </Text>
      </View>
    </View>
  );
}
