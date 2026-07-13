import { Text, View } from "react-native";

import { AppButton } from "../components/AppControls";
import { LegalPage } from "../components/LegalContent";
import type { TranslationKey } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

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
  t: (key: TranslationKey) => string;
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
                {deviceName} {session.isCurrent ? `\u00b7 ${t("thisSession")}` : ""}
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
