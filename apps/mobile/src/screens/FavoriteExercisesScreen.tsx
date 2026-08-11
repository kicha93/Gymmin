import { Ionicons } from "@expo/vector-icons";
import { Input, InputField } from "@gluestack-ui/themed";
import { Pressable, Text, View } from "react-native";

import { LegalPage } from "../components/LegalContent";
import { getExerciseNameForLanguage, getExerciseMetaForLanguage } from "../domain/exerciseDisplay";
import { getFavoriteCatalogExercises, type FavoriteExercise } from "../domain/favoriteExercises";
import type { LanguageCode, TranslationKey } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

type FavoriteExercisesScreenProps = {
  favoriteExercises: FavoriteExercise[];
  language: LanguageCode;
  onBack: () => void;
  onChangeSearch: (value: string) => void;
  onSetFavorite: (exerciseId: string, shouldBeFavorite: boolean) => void;
  search: string;
  t: (key: TranslationKey) => string;
  theme: Theme;
};

export function FavoriteExercisesScreen({
  favoriteExercises,
  language,
  onBack,
  onChangeSearch,
  onSetFavorite,
  search,
  t,
  theme
}: FavoriteExercisesScreenProps) {
    const favoriteCatalogExercises = getFavoriteCatalogExercises(favoriteExercises);
    const searchPhrase = search.trim().toLowerCase();
    const filteredFavorites = favoriteCatalogExercises
      .filter((exercise) => {
        if (!searchPhrase) {
          return true;
        }

        return (
          exercise.name.toLowerCase().includes(searchPhrase) ||
          exercise.polishName.toLowerCase().includes(searchPhrase) ||
          exercise.category.toLowerCase().includes(searchPhrase)
        );
      })
      .sort((first, second) => getExerciseNameForLanguage(first, language).localeCompare(getExerciseNameForLanguage(second, language), language));

    return (
      <LegalPage
        icon="star-outline"
        title={t("favoriteExercises")}
        theme={theme}
        backLabel={t("backToSettings")}
        onBack={onBack}
      >
        <View style={styles.fieldGroup}>
          <Text style={[styles.workoutMeta, { color: theme.muted }]}>
            {t("favoriteExercisesSavedLocally")}
          </Text>
          <Input
            style={[
              styles.exercisePickerSearchInput,
              { backgroundColor: theme.control, borderColor: theme.border }
            ]}
          >
            <InputField
              placeholder={t("searchExercise")}
              placeholderTextColor={theme.muted}
              style={[styles.exercisePickerSearchText, { color: theme.inputText }]}
              value={search}
              onChangeText={onChangeSearch}
            />
          </Input>
        </View>

        {filteredFavorites.length ? (
          <View style={styles.favoriteExerciseList}>
            {filteredFavorites.map((exercise) => (
              <View
                key={exercise.id}
                style={[styles.favoriteExerciseRow, { borderColor: theme.border }]}
              >
                <View style={styles.favoriteExerciseInfo}>
                  <Text style={[styles.workoutName, { color: theme.text }]} numberOfLines={2}>
                    {getExerciseNameForLanguage(exercise, language)}
                  </Text>
                  <Text style={[styles.workoutMeta, { color: theme.muted }]} numberOfLines={3}>
                    {getExerciseMetaForLanguage(exercise, language)}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  style={styles.favoriteExerciseRemoveButton}
                  onPress={() => onSetFavorite(exercise.id, false)}
                >
                  <Ionicons name="star" size={25} color={theme.primary} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <View style={[styles.emptyStatePanel, { backgroundColor: theme.secondaryBand }]}>
            <Ionicons name="star-outline" size={28} color={theme.primary} />
            <Text style={[styles.emptyStateTitle, { color: theme.text }]}>
              {t("favoriteExercisesEmptyTitle")}
            </Text>
            <Text style={[styles.emptyStateCopy, { color: theme.muted }]}>
              {t("favoriteExercisesEmptyCopy")}
            </Text>
          </View>
        )}
      </LegalPage>
    );
  }
