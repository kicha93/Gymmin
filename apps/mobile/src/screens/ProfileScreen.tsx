import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, Text, View } from "react-native";
import type { ImageSourcePropType } from "react-native";

import { AppButton } from "../components/AppControls";
import type { TranslationKey } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

type ProfileScreenProps = {
  achievementPercent: number;
  avatarMessage: string;
  avatarMessageIsSuccess: boolean;
  avatarSource: ImageSourcePropType | null;
  canRemoveAvatar: boolean;
  displayEmail: string;
  displayName: string;
  isAvatarSubmitting: boolean;
  latestAchievementTitle?: string;
  onChangeAvatar: () => void;
  onDeleteAccount: () => void;
  onLogout: () => void;
  onOpenAccountDetails: () => void;
  onOpenAchievements: () => void;
  onOpenActiveSessions: () => void;
  onOpenBugReport: () => void;
  onOpenChangePassword: () => void;
  onOpenCredits: () => void;
  onRemoveAvatar: () => void;
  t: (key: TranslationKey) => string;
  theme: Theme;
  totalAchievements: number;
  unlockedAchievements: number;
};

type QuickAction = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
};

export function ProfileScreen({
  achievementPercent,
  avatarMessage,
  avatarMessageIsSuccess,
  avatarSource,
  canRemoveAvatar,
  displayEmail,
  displayName,
  isAvatarSubmitting,
  latestAchievementTitle,
  onChangeAvatar,
  onDeleteAccount,
  onLogout,
  onOpenAccountDetails,
  onOpenAchievements,
  onOpenActiveSessions,
  onOpenBugReport,
  onOpenChangePassword,
  onOpenCredits,
  onRemoveAvatar,
  t,
  theme,
  totalAchievements,
  unlockedAchievements
}: ProfileScreenProps) {
  const quickActions: QuickAction[] = [
    { icon: "server-outline", label: t("aiCredits"), onPress: onOpenCredits },
    { icon: "lock-closed-outline", label: t("changePassword"), onPress: onOpenChangePassword },
    { icon: "calendar-outline", label: t("profileSessions"), onPress: onOpenActiveSessions },
    { icon: "warning-outline", label: t("bugReport"), onPress: onOpenBugReport }
  ];

  return (
    <View style={styles.profileScreen}>
      <View style={[styles.profileDashboardCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={[styles.profileDashboardAvatarFrame, { backgroundColor: theme.secondaryBand }]}>
          {avatarSource ? (
            <Image resizeMode="cover" source={avatarSource} style={styles.profileDashboardAvatarImage} />
          ) : (
            <Ionicons name="person" size={52} color={theme.primary} />
          )}
        </View>
        <View style={styles.profileDashboardInfo}>
          <Text style={[styles.profileDashboardName, { color: theme.text }]} numberOfLines={2}>
            {displayName}
          </Text>
          <Text style={[styles.profileDashboardEmail, { color: theme.muted }]} numberOfLines={2}>
            {displayEmail}
          </Text>
          <View style={styles.profileDashboardAvatarActions}>
            <AppButton
              disabled={isAvatarSubmitting}
              icon="image-outline"
              style={styles.profileDashboardAvatarButton}
              textStyle={styles.profileDashboardAvatarButtonText}
              theme={theme}
              variant="outline"
              onPress={onChangeAvatar}
            >
              {t("changeAvatar")}
            </AppButton>
            {canRemoveAvatar ? (
              <AppButton
                disabled={isAvatarSubmitting}
                icon="trash-outline"
                style={styles.profileDashboardAvatarButton}
                textStyle={styles.profileDashboardAvatarButtonText}
                theme={theme}
                variant="outline"
                onPress={onRemoveAvatar}
              >
                {t("removeAvatar")}
              </AppButton>
            ) : null}
          </View>
          {avatarMessage ? (
            <Text style={[styles.workoutMeta, { color: avatarMessageIsSuccess ? theme.primary : theme.danger }]}>
              {avatarMessage}
            </Text>
          ) : null}
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        style={[styles.achievementSummaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={onOpenAchievements}
      >
        <View style={[styles.achievementIcon, { backgroundColor: theme.secondaryBand }]}>
          <Ionicons name="trophy-outline" size={24} color={theme.primary} />
        </View>
        <View style={styles.achievementCopy}>
          <View style={styles.achievementTitleRow}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t("achievements")}</Text>
            <Text style={[styles.achievementCount, { color: theme.primary }]}>
              {unlockedAchievements}/{totalAchievements}
            </Text>
          </View>
          <View style={[styles.achievementProgressTrack, { backgroundColor: theme.secondaryBand }]}>
            <View
              style={[
                styles.achievementProgressFill,
                {
                  backgroundColor: theme.muted,
                  width: `${Math.max(0, Math.min(100, achievementPercent))}%`
                }
              ]}
            />
          </View>
          <Text style={[styles.workoutMeta, { color: theme.muted }]}>
            {latestAchievementTitle
              ? `${t("achievementsLast")}: ${latestAchievementTitle}`
              : t("achievementsNothingUnlocked")}
          </Text>
          <View style={styles.profileAchievementLinkRow}>
            <Text style={[styles.achievementLink, { color: theme.primary }]}>{t("achievementsViewAll")}</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.primary} />
          </View>
        </View>
      </Pressable>

      <View style={styles.profileQuickActionsSection}>
        <Text style={[styles.profileSectionHeading, { color: theme.text }]}>{t("quickActions")}</Text>
        <View style={styles.profileQuickActionsGrid}>
          {quickActions.map((action) => (
            <Pressable
              key={action.label}
              accessibilityRole="button"
              style={[styles.profileQuickActionCard, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={action.onPress}
            >
              <View style={[styles.profileQuickActionIcon, { backgroundColor: theme.secondaryBand }]}>
                <Ionicons name={action.icon} size={22} color={theme.primary} />
              </View>
              <Text style={[styles.profileQuickActionLabel, { color: theme.text }]} numberOfLines={2}>
                {action.label}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={theme.text} />
            </Pressable>
          ))}
        </View>
      </View>

      <View style={[styles.profileAccountCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.profileSectionHeading, { color: theme.text }]}>{t("account")}</Text>
        <ProfileAccountRow
          icon="person-circle-outline"
          label={t("accountDetails")}
          theme={theme}
          onPress={onOpenAccountDetails}
        />
        <ProfileAccountRow
          icon="phone-portrait-outline"
          label={t("activeSessions")}
          theme={theme}
          onPress={onOpenActiveSessions}
        />
        <ProfileAccountRow
          danger
          icon="trash-outline"
          label={t("deleteAccount")}
          theme={theme}
          onPress={onDeleteAccount}
        />
        <ProfileAccountRow
          danger
          isLast
          icon="log-out-outline"
          label={t("logout")}
          theme={theme}
          onPress={onLogout}
        />
      </View>
    </View>
  );
}

type ProfileAccountRowProps = {
  danger?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  isLast?: boolean;
  label: string;
  onPress: () => void;
  theme: Theme;
};

function ProfileAccountRow({ danger = false, icon, isLast = false, label, onPress, theme }: ProfileAccountRowProps) {
  const color = danger ? theme.danger : theme.muted;

  return (
    <Pressable
      accessibilityRole="button"
      style={[
        styles.profileAccountRow,
        isLast ? styles.profileLogoutRow : { borderBottomColor: theme.border }
      ]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={24} color={color} />
      <Text style={[styles.profileAccountRowText, { color: danger ? theme.danger : theme.text }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={20} color={danger ? theme.danger : theme.text} />
    </Pressable>
  );
}
