import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import type { ProfileAccountDetail, ProfileAccountDetailKey } from "../domain/profile";
import type { TranslationKey } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

type AccountDetailsScreenProps = {
  rows: ProfileAccountDetail[];
  t: (key: TranslationKey) => string;
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
