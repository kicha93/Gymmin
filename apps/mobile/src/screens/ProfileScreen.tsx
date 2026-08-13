import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, Text, useWindowDimensions, View } from "react-native";
import type { ImageSourcePropType } from "react-native";

import { AppButton } from "../components/AppControls";
import { getProfileDisplayName } from "../domain/profileDashboard";
import type { TranslationKey } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";
import { getProfileScreenLayout } from "./profileScreenLayout";

type ProfileScreenProps = {
  achievementPercent: number;
  avatarMessage: string;
  avatarMessageIsSuccess: boolean;
  avatarSource: ImageSourcePropType | null;
  completedSessions: number;
  displayName?: string;
  isAvatarSubmitting: boolean;
  latestAchievementTitle?: string;
  onAvatarLoadError: () => void;
  onChangeAvatar: () => void;
  onOpenAchievements: () => void;
  onOpenBugReport: () => void;
  onRemoveAvatar: () => void;
  savedPlans: number;
  t: (key: TranslationKey) => string;
  theme: Theme;
  totalAchievements: number;
  unlockedAchievements: number;
};

export function ProfileScreen({
  achievementPercent,
  avatarMessage,
  avatarMessageIsSuccess,
  avatarSource,
  completedSessions,
  displayName,
  isAvatarSubmitting,
  latestAchievementTitle,
  onAvatarLoadError,
  onChangeAvatar,
  onOpenAchievements,
  onOpenBugReport,
  onRemoveAvatar,
  savedPlans,
  t,
  theme,
  totalAchievements,
  unlockedAchievements
}: ProfileScreenProps) {
  const { width } = useWindowDimensions();
  const layout = getProfileScreenLayout(width);
  const profileName = getProfileDisplayName(displayName, t("localProfile"));
  const clampedAchievementPercent = Math.max(0, Math.min(100, achievementPercent));

  return (
    <View style={styles.profileScreen}>
      <View style={[styles.profileDashboardCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.profileDashboardTopRow}>
          <View style={styles.profileDashboardAvatarWrap}>
            <View
              style={[
                styles.profileDashboardAvatarFrame,
                {
                  backgroundColor: theme.secondaryBand,
                  borderRadius: layout.avatarSize / 2,
                  height: layout.avatarSize,
                  width: layout.avatarSize
                }
              ]}
            >
              {avatarSource ? (
                <Image
                  accessibilityLabel={t("profileAvatarAccessibility")}
                  accessible
                  resizeMode="cover"
                  source={avatarSource}
                  style={styles.profileDashboardAvatarImage}
                  onError={onAvatarLoadError}
                />
              ) : (
                <Ionicons name="person" size={layout.compact ? 48 : 58} color={theme.primary} />
              )}
            </View>
            <Pressable
              accessibilityLabel={t("changeAvatar")}
              accessibilityRole="button"
              disabled={isAvatarSubmitting}
              hitSlop={6}
              style={[
                styles.profileDashboardAvatarEdit,
                {
                  backgroundColor: theme.primary,
                  borderColor: theme.card,
                  opacity: isAvatarSubmitting ? 0.64 : 1
                }
              ]}
              onPress={onChangeAvatar}
            >
              <Ionicons name="image-outline" size={20} color={theme.white} />
            </Pressable>
          </View>

          <View style={styles.profileDashboardIdentity}>
            <Text
              numberOfLines={2}
              style={[
                styles.profileDashboardName,
                layout.compact && styles.profileDashboardNameCompact,
                { color: theme.text }
              ]}
            >
              {profileName}
            </Text>
            <Text style={[styles.profileDashboardLocalMeta, { color: theme.muted }]}>{t("localProfileMeta")}</Text>

            <View style={[styles.profileDashboardStats, { borderTopColor: theme.border }]}>
              <ProfileStat label={t("profileCompleted")} value={completedSessions} theme={theme} />
              <View style={[styles.profileDashboardStatDivider, { backgroundColor: theme.border }]} />
              <ProfileStat label={t("profilePlans")} value={savedPlans} theme={theme} />
            </View>
          </View>
        </View>

        <View style={[styles.profileDashboardAvatarActions, layout.actionsStacked && styles.profileDashboardAvatarActionsStacked]}>
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
          {avatarSource ? (
            <AppButton
              disabled={isAvatarSubmitting}
              icon="trash-outline"
              style={[styles.profileDashboardAvatarButton, { borderColor: theme.danger }]}
              textStyle={[styles.profileDashboardAvatarButtonText, { color: theme.danger }]}
              theme={theme}
              variant="outline"
              onPress={onRemoveAvatar}
            >
              {t("removeAvatar")}
            </AppButton>
          ) : null}
        </View>
        {avatarMessage ? (
          <Text style={[styles.profileDashboardMessage, { color: avatarMessageIsSuccess ? theme.primary : theme.danger }]}>
            {avatarMessage}
          </Text>
        ) : null}
      </View>

      <Pressable
        accessibilityLabel={t("achievementsViewAllFull")}
        accessibilityRole="button"
        style={[styles.profileAchievementCard, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={onOpenAchievements}
      >
        <View style={[styles.profileAchievementIcon, { backgroundColor: theme.secondaryBand }]}>
          <Ionicons name="trophy-outline" size={46} color={theme.primary} />
        </View>
        <View style={styles.profileAchievementCopy}>
          <View style={styles.profileAchievementTitleRow}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t("achievements")}</Text>
            <Text style={[styles.profileAchievementCount, { color: theme.primary }]}>
              {unlockedAchievements}/{totalAchievements}
            </Text>
          </View>
          <View style={[styles.achievementProgressTrack, { backgroundColor: theme.secondaryBand }]}>
            <View
              style={[
                styles.achievementProgressFill,
                { backgroundColor: theme.primary, width: `${clampedAchievementPercent}%` }
              ]}
            />
          </View>
          <Text numberOfLines={2} style={[styles.workoutMeta, { color: theme.muted }]}>
            {latestAchievementTitle ? `${t("achievementsLast")}: ${latestAchievementTitle}` : t("achievementsNothingUnlocked")}
          </Text>
          <View style={[styles.profileAchievementCta, { backgroundColor: theme.segment }]}>
            <Text style={[styles.profileAchievementCtaText, { color: theme.primary }]}>
              {t("achievementsViewAllFull")}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={theme.primary} />
          </View>
        </View>
      </Pressable>

      <View style={styles.profileQuickActionsSection}>
        <Text style={[styles.profileSectionHeading, { color: theme.text }]}>{t("quickActions")}</Text>
        <LocalAction
          description={t("bugReportProfileMeta")}
          icon="warning-outline"
          label={t("bugReport")}
          theme={theme}
          onPress={onOpenBugReport}
        />
      </View>
    </View>
  );
}

function ProfileStat({ label, theme, value }: { label: string; theme: Theme; value: number }) {
  return (
    <View style={styles.profileDashboardStat}>
      <Text style={[styles.profileDashboardStatValue, { color: theme.primary }]}>{value}</Text>
      <Text numberOfLines={1} style={[styles.profileDashboardStatLabel, { color: theme.muted }]}>{label}</Text>
    </View>
  );
}

function LocalAction({ description, icon, label, onPress, theme }: {
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  theme: Theme;
}) {
  return (
    <Pressable
      accessibilityLabel={`${label}. ${description}`}
      accessibilityRole="button"
      style={[styles.profileQuickActionCard, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={onPress}
    >
      <View style={[styles.profileQuickActionIcon, { backgroundColor: theme.secondaryBand }]}>
        <Ionicons name={icon} size={24} color={theme.primary} />
      </View>
      <View style={styles.profileQuickActionCopy}>
        <Text style={[styles.profileQuickActionLabel, { color: theme.text }]}>{label}</Text>
        <Text style={[styles.profileQuickActionDescription, { color: theme.muted }]}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color={theme.text} />
    </Pressable>
  );
}
