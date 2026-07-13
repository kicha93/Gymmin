import { Ionicons } from "@expo/vector-icons";
import { Input, InputField } from "@gluestack-ui/themed";
import type { ReactNode } from "react";
import { Text, View } from "react-native";

import { AppButton } from "../components/AppControls";
import { CollapsiblePanel } from "../components/CollapsiblePanel";
import { WorkoutList } from "../components/WorkoutList";
import type { SavedWorkout } from "../domain/savedWorkouts";
import type { TranslationKey } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

type WorkoutsScreenProps = {
  activeSessionCard: ReactNode;
  collapsed: boolean;
  creatorButton: ReactNode;
  filteredWorkouts: SavedWorkout[];
  onChangeSearch: (value: string) => void;
  onOpenHistory: () => void;
  onOpenProgress: () => void;
  onOpenWorkout: (workoutId: string) => void;
  onToggleList: () => void;
  search: string;
  sortActions: ReactNode;
  t: (key: TranslationKey) => string;
  theme: Theme;
};

export function WorkoutsScreen({
  activeSessionCard,
  collapsed,
  creatorButton,
  filteredWorkouts,
  onChangeSearch,
  onOpenHistory,
  onOpenProgress,
  onOpenWorkout,
  onToggleList,
  search,
  sortActions,
  t,
  theme
}: WorkoutsScreenProps) {
  return (
    <>
      {activeSessionCard}
      {creatorButton}

      <View style={styles.historyEntryGrid}>
        <AppButton
          icon="time-outline"
          style={styles.historyEntryButton}
          theme={theme}
          variant="outline"
          onPress={onOpenHistory}
        >
          {t("workoutHistoryTitle")}
        </AppButton>
        <AppButton
          icon="trending-up-outline"
          style={styles.historyEntryButton}
          theme={theme}
          variant="outline"
          onPress={onOpenProgress}
        >
          {t("progress")}
        </AppButton>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: theme.muted }]}>{t("searchWorkout")}</Text>
        <Input style={[styles.searchBox, { backgroundColor: theme.control, borderColor: theme.border }]}>
          <Ionicons name="search" size={20} color={theme.muted} />
          <InputField
            placeholder={t("searchWorkoutPlaceholder")}
            placeholderTextColor={theme.muted}
            style={[styles.searchInput, { color: theme.inputText }]}
            value={search}
            onChangeText={onChangeSearch}
          />
        </Input>
      </View>

      <CollapsiblePanel
        actions={sortActions}
        isCollapsed={collapsed}
        theme={theme}
        title={t("workouts")}
        onToggle={onToggleList}
      >
        <WorkoutList workouts={filteredWorkouts} theme={theme} onOpenWorkout={onOpenWorkout} />
      </CollapsiblePanel>
    </>
  );
}
