import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { AppButton, AppInput } from "../components/AppControls";
import { LegalPage } from "../components/LegalContent";
import type { ProfileAccountDetail, ProfileAccountDetailKey } from "../domain/profile";
import type { TranslationKey } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

type Translate = (key: TranslationKey) => string;

type AccountDetailsScreenProps = {
  rows: ProfileAccountDetail[];
  t: Translate;
  theme: Theme;
};

const accountRowIcons: Record<ProfileAccountDetailKey, keyof typeof Ionicons.glyphMap> = {
  accountId: "finger-print-outline",
  createdOn: "calendar-outline",
  email: "mail-outline",
  name: "person-outline"
};

export function AccountDetailsScreen({ rows, t, theme }: AccountDetailsScreenProps) {
  return (
    <View style={styles.profileScreen}>
      <View style={[styles.profileAccountCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.accountDetailsHeader}>
          <View style={[styles.profileQuickActionIcon, { backgroundColor: theme.secondaryBand }]}>
            <Ionicons name="person-circle-outline" size={24} color={theme.primary} />
          </View>
          <View style={styles.workoutInfo}>
            <Text style={[styles.profileSectionHeading, { color: theme.text }]}>{t("accountDetails")}</Text>
            <Text style={[styles.workoutMeta, { color: theme.muted }]}>{t("accountDetailsIntro")}</Text>
          </View>
        </View>

        <View style={styles.accountDetailsList}>
          {rows.map((row, index) => (
            <View
              key={row.key}
              style={[
                styles.accountDetailsRow,
                { borderBottomColor: theme.border },
                index === rows.length - 1 ? styles.accountDetailsRowLast : null
              ]}
            >
              <View style={[styles.accountDetailsIcon, { backgroundColor: theme.secondaryBand }]}>
                <Ionicons name={accountRowIcons[row.key]} size={19} color={theme.primary} />
              </View>
              <View style={styles.workoutInfo}>
                <Text style={[styles.accountDetailsLabel, { color: theme.muted }]}>{row.label}</Text>
                <Text style={[styles.accountDetailsValue, { color: theme.text }]} selectable>
                  {row.value}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

type DeleteAccountScreenProps = {
  canDelete: boolean;
  confirmation: string;
  confirmationPhrase: string;
  error: string;
  isDeleting: boolean;
  onCancel: () => void;
  onChangeConfirmation: (value: string) => void;
  onDelete: () => void;
  t: Translate;
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

export type ActiveSessionItem = {
  deviceName?: string | null;
  expiresAt: string;
  id: string;
  isCurrent: boolean;
  lastSeenAt: string;
};

type ActiveSessionsScreenProps = {
  error: string;
  fallbackDeviceName: string;
  formatDateTime: (value: string) => string;
  message: string;
  onBack: () => void;
  onLogoutAll: () => void;
  onRevoke: (sessionId: string) => void;
  sessions: ActiveSessionItem[];
  t: Translate;
  theme: Theme;
};

export function ActiveSessionsScreen({
  error,
  fallbackDeviceName,
  formatDateTime,
  message,
  onBack,
  onLogoutAll,
  onRevoke,
  sessions,
  t,
  theme
}: ActiveSessionsScreenProps) {
  return (
    <LegalPage
      icon="phone-portrait-outline"
      title={t("activeSessions")}
      theme={theme}
      backLabel={t("profile")}
      onBack={onBack}
    >
      <View style={styles.sessionHistoryList}>
        {sessions.length === 0 ? (
          <Text style={[styles.emptyBuilderCopy, { color: theme.muted }]}>{t("noActiveSessions")}</Text>
        ) : null}
        {sessions.map((session) => {
          const knownDeviceName = session.deviceName?.trim();
          const deviceName = knownDeviceName && knownDeviceName.toLowerCase() !== "unknown device"
            ? knownDeviceName
            : session.isCurrent
              ? fallbackDeviceName
              : t("unknownDevice");

          return (
            <View key={session.id} style={[styles.sessionEntryCard, { backgroundColor: theme.control, borderColor: theme.border }]}>
              <Text style={[styles.workoutName, { color: theme.text }]}>
                {deviceName} {session.isCurrent ? `· ${t("thisSession")}` : ""}
              </Text>
              <Text style={[styles.workoutMeta, { color: theme.muted }]}>
                {t("lastActivity")}: {formatDateTime(session.lastSeenAt)}
              </Text>
              <Text style={[styles.workoutMeta, { color: theme.muted }]}>
                {t("expires")}: {formatDateTime(session.expiresAt)}
              </Text>
              <AppButton icon="log-out-outline" theme={theme} variant="outline" onPress={() => onRevoke(session.id)}>
                {t("signOutThisSession")}
              </AppButton>
            </View>
          );
        })}
      </View>
      {error ? <Text style={[styles.authError, { color: theme.danger }]}>{error}</Text> : null}
      {message ? <Text style={[styles.legalText, { color: theme.primary }]}>{message}</Text> : null}
      <AppButton icon="log-out-outline" theme={theme} onPress={onLogoutAll}>
        {t("signOutAllSessions")}
      </AppButton>
    </LegalPage>
  );
}
