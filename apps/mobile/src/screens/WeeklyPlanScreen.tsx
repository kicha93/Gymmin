import { Ionicons } from "@expo/vector-icons";
import type { Dispatch, SetStateAction } from "react";
import { Pressable, Text, View } from "react-native";

import type { SavedWorkout } from "../domain/savedWorkouts";
import {
  formatWeekRange,
  getCurrentWeekRange,
  getWeeklyPlanDay,
  removeWeeklyPlanItem,
  sortWeeklyPlanItemsForDisplay,
  toggleWeeklyPlanItemDay,
  upsertWeeklyPlanItem,
  type WeeklyPlanSettings,
  type WeeklyPlanSummary
} from "../domain/weeklyPlan";
import type { LanguageCode, TranslationKey } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

function getWeeklyPlanDayOptions(t: (key: TranslationKey) => string) {
  return [
    { label: t("mondayShort"), value: "monday" as const },
    { label: t("tuesdayShort"), value: "tuesday" as const },
    { label: t("wednesdayShort"), value: "wednesday" as const },
    { label: t("thursdayShort"), value: "thursday" as const },
    { label: t("fridayShort"), value: "friday" as const },
    { label: t("saturdayShort"), value: "saturday" as const },
    { label: t("sundayShort"), value: "sunday" as const }
  ];
}

type WeeklyPlanScreenProps = {
  language: LanguageCode;
  onChangePlan: Dispatch<SetStateAction<WeeklyPlanSettings>>;
  onOpenWorkout: (workoutId: string) => void;
  savedWorkouts: SavedWorkout[];
  summary: WeeklyPlanSummary;
  t: (key: TranslationKey) => string;
  theme: Theme;
};

export function WeeklyPlanScreen({
  language,
  onChangePlan,
  onOpenWorkout,
  savedWorkouts,
  summary,
  t,
  theme
}: WeeklyPlanScreenProps) {
    const dayOptions = getWeeklyPlanDayOptions(t);
    const plannedIds = new Set(summary.items.map((item) => item.workoutId));
    const availableWorkouts = savedWorkouts.filter((workout) => !plannedIds.has(workout.id));
    const range = formatWeekRange(getCurrentWeekRange(new Date()), language);
    const groupedItems = Array.from(
      sortWeeklyPlanItemsForDisplay(summary.items).reduce((groups, item) => {
        const existing = groups.get(item.workoutId);
        if (existing) {
          existing.items.push(item);
        } else {
          groups.set(item.workoutId, { items: [item], workout: item.workout });
        }
        return groups;
      }, new Map<string, { items: typeof summary.items; workout: (typeof summary.items)[number]["workout"] }>()).values()
    );

    return (
      <View style={styles.weeklyPlanScreen}>
        <View style={[styles.weeklyPlanDetailHeader, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.weeklyPlanCardIcon, { backgroundColor: theme.secondaryBand }]}>
            <Ionicons name="calendar-outline" size={22} color={theme.primary} />
          </View>
          <View style={styles.workoutInfo}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t("weeklyPlan")}</Text>
            <Text style={[styles.workoutMeta, { color: theme.muted }]}>{`${t("week")}: ${range}`}</Text>
          </View>
        </View>

        {groupedItems.length ? (
          <View style={[styles.weeklyPlanListCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {groupedItems.map((group, index) => {
              const completedCount = group.items.filter((item) => item.completed).length;
              const isCompleted = completedCount === group.items.length;
              const selectedDays = new Set(group.items.map((item) => item.day));

              return (
              <View key={group.workout.id} style={[styles.weeklyPlanItem, { borderBottomColor: theme.border }, index === groupedItems.length - 1 ? styles.weeklyPlanItemLast : null]}>
                <View style={styles.weeklyPlanItemHeader}>
                  <View style={[styles.weeklyPlanStatusIcon, { backgroundColor: isCompleted ? theme.primary : theme.secondaryBand }]}>
                    <Ionicons name={isCompleted ? "checkmark" : "calendar-outline"} size={18} color={isCompleted ? theme.white : theme.primary} />
                  </View>
                  <View style={styles.workoutInfo}>
                    <Pressable
                      accessibilityLabel={`${t("showDetails")}: ${group.workout.name}`}
                      accessibilityRole="link"
                      hitSlop={6}
                      onPress={() => onOpenWorkout(group.workout.id)}
                    >
                      <Text style={[styles.workoutName, { color: theme.primary }]}>{group.workout.name}</Text>
                    </Pressable>
                    <Text style={[styles.workoutMeta, { color: isCompleted ? theme.primary : theme.muted }]}>{isCompleted ? t("completed") : t("toDo")}</Text>
                  </View>
                  <Pressable accessibilityLabel={t("removeFromWeeklyPlan")} accessibilityRole="button" onPress={() => onChangePlan((current) => removeWeeklyPlanItem(current, group.workout.id))}>
                    <Ionicons name="trash-outline" size={20} color={theme.danger} />
                  </Pressable>
                </View>
                <Text style={[styles.weeklyPlanChooseDayLabel, { color: theme.muted }]}>{t("chooseWeekday")}</Text>
                <View style={styles.weeklyPlanDayChips}>
                  {dayOptions.map((day) => {
                    const selected = selectedDays.has(day.value);
                    return (
                      <Pressable
                        key={day.value}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        style={[styles.weeklyPlanDayChip, { backgroundColor: selected ? theme.primary : theme.control, borderColor: selected ? theme.primary : theme.border }]}
                        onPress={() => onChangePlan((current) => toggleWeeklyPlanItemDay(current, group.workout.id, day.value))}
                      >
                        <Text style={[styles.weeklyPlanDayChipText, { color: selected ? theme.white : theme.text }]}>{day.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              );
            })}
          </View>
        ) : (
          <View style={[styles.weeklyPlanNoItems, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.workoutMeta, { color: theme.muted }]}>{t("weeklyPlanNoItems")}</Text>
          </View>
        )}

        {availableWorkouts.length ? (
          <View style={[styles.weeklyPlanAddCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t("addToWeeklyPlan")}</Text>
            {availableWorkouts.map((workout) => (
              <View key={workout.id} style={[styles.weeklyPlanAddRow, { borderTopColor: theme.border }]}>
                <Text style={[styles.workoutName, styles.weeklyPlanAddName, { color: theme.text }]} numberOfLines={2}>{workout.name}</Text>
                <Pressable
                  accessibilityRole="button"
                  style={[styles.weeklyPlanAddButton, { backgroundColor: theme.primary }]}
                  onPress={() => onChangePlan((current) => upsertWeeklyPlanItem(current, workout.id, getWeeklyPlanDay(new Date())))}
                >
                  <Ionicons name="add" size={18} color={theme.white} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    );
  }
