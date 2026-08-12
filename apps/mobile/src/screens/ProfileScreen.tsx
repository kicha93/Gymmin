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
  isAvatarSubmitting: boolean;
  latestAchievementTitle?: string;
  onAvatarLoadError: () => void;
  onChangeAvatar: () => void;
  onOpenAchievements: () => void;
  onOpenBugReport: () => void;
  onRemoveAvatar: () => void;
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
  isAvatarSubmitting,
  latestAchievementTitle,
  onAvatarLoadError,
  onChangeAvatar,
  onOpenAchievements,
  onOpenBugReport,
  onRemoveAvatar,
  t,
  theme,
  totalAchievements,
  unlockedAchievements
}: ProfileScreenProps) {
  return (
    <View style={styles.profileScreen}>
      <View style={[styles.profileDashboardCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={[styles.profileDashboardAvatarFrame, { backgroundColor: theme.secondaryBand }]}>
          {avatarSource ? (
            <Image resizeMode="cover" source={avatarSource} style={styles.profileDashboardAvatarImage} onError={onAvatarLoadError} />
          ) : (
            <Ionicons name="person" size={52} color={theme.primary} />
          )}
        </View>
        <View style={styles.profileDashboardInfo}>
          <View style={styles.profileDashboardAvatarActions}>
            <AppButton disabled={isAvatarSubmitting} icon="image-outline" style={styles.profileDashboardAvatarButton}
              textStyle={styles.profileDashboardAvatarButtonText} theme={theme} variant="outline" onPress={onChangeAvatar}>
              {t("changeAvatar")}
            </AppButton>
            {avatarSource ? (
              <AppButton disabled={isAvatarSubmitting} icon="trash-outline" style={styles.profileDashboardAvatarButton}
                textStyle={styles.profileDashboardAvatarButtonText} theme={theme} variant="outline" onPress={onRemoveAvatar}>
                {t("removeAvatar")}
              </AppButton>
            ) : null}
          </View>
          {avatarMessage ? (
            <Text style={[styles.workoutMeta, { color: avatarMessageIsSuccess ? theme.primary : theme.danger }]}>{avatarMessage}</Text>
          ) : null}
        </View>
      </View>

      <Pressable accessibilityRole="button" style={[styles.achievementSummaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={onOpenAchievements}>
        <View style={[styles.achievementIcon, { backgroundColor: theme.secondaryBand }]}>
          <Ionicons name="trophy-outline" size={24} color={theme.primary} />
        </View>
        <View style={styles.achievementCopy}>
          <View style={styles.achievementTitleRow}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t("achievements")}</Text>
            <Text style={[styles.achievementCount, { color: theme.primary }]}>{unlockedAchievements}/{totalAchievements}</Text>
          </View>
          <View style={[styles.achievementProgressTrack, { backgroundColor: theme.secondaryBand }]}>
            <View style={[styles.achievementProgressFill, { backgroundColor: theme.muted, width: `${Math.max(0, Math.min(100, achievementPercent))}%` }]} />
          </View>
          <Text style={[styles.workoutMeta, { color: theme.muted }]}>
            {latestAchievementTitle ? `${t("achievementsLast")}: ${latestAchievementTitle}` : t("achievementsNothingUnlocked")}
          </Text>
          <Text style={[styles.achievementLink, { color: theme.primary }]}>{t("achievementsViewAll")}</Text>
        </View>
      </Pressable>

      <View style={styles.profileQuickActionsSection}>
        <Text style={[styles.profileSectionHeading, { color: theme.text }]}>{t("quickActions")}</Text>
        <View style={styles.profileQuickActionsGrid}>
          <LocalAction icon="warning-outline" label={t("bugReport")} theme={theme} onPress={onOpenBugReport} />
        </View>
      </View>
    </View>
  );
}

function LocalAction({ icon, label, onPress, theme }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  theme: Theme;
}) {
  return (
    <Pressable accessibilityRole="button" style={[styles.profileQuickActionCard, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={onPress}>
      <View style={[styles.profileQuickActionIcon, { backgroundColor: theme.secondaryBand }]}>
        <Ionicons name={icon} size={22} color={theme.primary} />
      </View>
      <Text style={[styles.profileQuickActionLabel, { color: theme.text }]} numberOfLines={2}>{label}</Text>
      <Ionicons name="chevron-forward" size={20} color={theme.text} />
    </Pressable>
  );
}
