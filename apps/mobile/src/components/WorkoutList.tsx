import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import type { SavedWorkout } from "../domain/savedWorkouts";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

function getWorkoutNotesPreview(notes: string, maxLength = 86) {
  const normalizedNotes = notes.trim().replace(/\s+/g, " ");
  return normalizedNotes.length <= maxLength
    ? normalizedNotes
    : `${normalizedNotes.slice(0, maxLength).trim()}...`;
}

type WorkoutListProps = {
  emptyContent?: ReactNode;
  onOpenWorkout: (workoutId: string) => void;
  theme: Theme;
  workouts: SavedWorkout[];
};

export function WorkoutList({ emptyContent = null, onOpenWorkout, theme, workouts }: WorkoutListProps) {
  if (!workouts.length) {
    return <>{emptyContent}</>;
  }

  return (
    <View style={styles.workoutList}>
      {workouts.map((item, index) => (
        <Pressable
          key={item.id}
          accessibilityRole="button"
          style={[
            styles.workoutRow,
            {
              borderBottomWidth: index === workouts.length - 1 ? 0 : 1,
              borderColor: theme.border
            }
          ]}
          onPress={() => onOpenWorkout(item.id)}
        >
          <View style={[styles.workoutIcon, { backgroundColor: theme.secondaryBand }]}>
            <Ionicons name="barbell-outline" size={20} color={theme.primary} />
          </View>
          <View style={styles.workoutInfo}>
            <Text style={[styles.workoutName, { color: theme.text }]}>{item.name}</Text>
            {item.draft.notes ? (
              <Text numberOfLines={2} style={[styles.workoutMeta, { color: theme.muted }]}>
                {getWorkoutNotesPreview(item.draft.notes)}
              </Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.muted} />
        </Pressable>
      ))}
    </View>
  );
}
