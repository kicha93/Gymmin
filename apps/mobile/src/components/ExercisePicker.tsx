import { Ionicons } from "@expo/vector-icons";
import { Input, InputField } from "@gluestack-ui/themed";
import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { Modal, Platform, Pressable, SafeAreaView, SectionList, StatusBar, Text, View } from "react-native";
import type { SectionListData, SectionListRenderItemInfo } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { InlineSheetSelectControl } from "./AppControls";
import {
  buildExerciseSections,
  filterExerciseOptionsForPicker,
  getExerciseDisplayName,
  getExerciseOptionTierBadge,
  getExerciseSectionsForStageType,
  getMuscleOptions,
  type ExerciseLibraryTier,
  type ExerciseOption,
  type ExerciseSection,
  type MuscleKey
} from "../domain/exercises";
import type { StageType } from "../domain/workouts";
import type { LanguageCode } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

type ExercisePickerProps = {
  disabled?: boolean;
  emptyText: string;
  favoriteExerciseIds: ReadonlySet<string>;
  favoriteFilterAllLabel: string;
  favoriteFilterOnlyLabel: string;
  hideAdditionalExercisesLabel: string;
  showMoreExercisesLabel: string;
  tierLabels: Readonly<Record<Exclude<ExerciseLibraryTier, "main" | "deprecated" | "progression">, string>>;
  language: LanguageCode;
  loadingText: string;
  muscleFilterAllLabel: string;
  muscleFilterLabel: string;
  onChange: (value: string) => void;
  onToggleFavorite: (exerciseId: string) => void;
  optionByValue: ReadonlyMap<string, ExerciseOption>;
  options: readonly ExerciseOption[];
  placeholder: string;
  searchPlaceholder: string;
  stageType: StageType | "";
  theme: Theme;
  title: string;
  value: string;
};

export function ExercisePicker({
  disabled = false,
  emptyText,
  favoriteExerciseIds,
  favoriteFilterAllLabel,
  favoriteFilterOnlyLabel,
  hideAdditionalExercisesLabel,
  showMoreExercisesLabel,
  tierLabels,
  language,
  loadingText,
  muscleFilterAllLabel,
  muscleFilterLabel,
  onChange,
  onToggleFavorite,
  optionByValue,
  options,
  placeholder,
  searchPlaceholder,
  stageType,
  theme,
  title,
  value
}: ExercisePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleKey | "all">("all");
  const [favoriteFilter, setFavoriteFilter] = useState<"all" | "favorites">("all");
  const [showAdditionalExercises, setShowAdditionalExercises] = useState(false);
  const [enabledAdditionalTiers, setEnabledAdditionalTiers] = useState<Set<Exclude<ExerciseLibraryTier, "main" | "deprecated" | "progression">>>(new Set());
  const pickerInsets = useSafeAreaInsets();
  const pickerHeaderTopPadding = Math.max(pickerInsets.top, 20) + 6;
  const selectedOption = value ? optionByValue.get(value) : undefined;
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const defaultGroupedOptions = useMemo(
    () => getExerciseSectionsForStageType(language, stageType, "all"),
    [language, stageType]
  );
  const visibleOptions = useMemo(() => {
    return favoriteFilter === "favorites"
      ? filterExerciseOptionsForPicker(options, normalizedQuery, enabledAdditionalTiers).filter((option) => favoriteExerciseIds.has(option.exerciseId))
      : filterExerciseOptionsForPicker(options, normalizedQuery, enabledAdditionalTiers);
  }, [enabledAdditionalTiers, favoriteExerciseIds, favoriteFilter, normalizedQuery, options]);
  const muscleOptions = useMemo(
    () => [
      { label: muscleFilterAllLabel, value: "all" as const },
      ...getMuscleOptions(language)
    ],
    [language, muscleFilterAllLabel]
  );
  const groupedOptions = useMemo<ExerciseSection[]>(() => {
    if (!isOpen) {
      return [];
    }

    if (
      !normalizedQuery &&
      favoriteFilter === "all" &&
      enabledAdditionalTiers.size === 0 &&
      selectedMuscle === "all"
    ) {
      return defaultGroupedOptions;
    }

    const nextOptions = visibleOptions;

    return buildExerciseSections(nextOptions, language, selectedMuscle);
  }, [defaultGroupedOptions, enabledAdditionalTiers, favoriteFilter, isOpen, language, normalizedQuery, selectedMuscle, visibleOptions]);
  const exerciseListEmptyText = isOpen ? emptyText : loadingText;
  const exerciseListExtraData = useMemo(
    () => ({ favoriteExerciseIds, value }),
    [favoriteExerciseIds, value]
  );

  const selectExercise = useCallback((nextValue: string) => {
    onChange(nextValue);
    setIsOpen(false);
    setQuery("");
    setIsSearchOpen(false);
    setSelectedMuscle("all");
    setFavoriteFilter("all");
    setShowAdditionalExercises(false);
    setEnabledAdditionalTiers(new Set());
  }, [onChange]);

  const toggleAdditionalTier = useCallback((tier: Exclude<ExerciseLibraryTier, "main" | "deprecated" | "progression">) => {
    setEnabledAdditionalTiers((current) => {
      const next = new Set(current);
      if (next.has(tier)) next.delete(tier);
      else next.add(tier);
      return next;
    });
  }, []);

  function openPicker() {
    if (disabled) {
      return;
    }

    setIsOpen(true);
  }

  const getExerciseItemKey = useCallback((item: ExerciseSection["data"][number]) => item.sectionKey, []);
  const renderExerciseListEmpty = useCallback(
    () => (
      <Text style={[styles.exercisePickerEmpty, { color: theme.text }]}>
        {exerciseListEmptyText}
      </Text>
    ),
    [exerciseListEmptyText, theme.text]
  );
  const renderExerciseSectionHeader = useCallback(
    ({ section }: { section: SectionListData<ExerciseSection["data"][number], ExerciseSection> }) => (
      <Text
        style={[
          styles.exercisePickerLetter,
          { backgroundColor: theme.secondaryBand, color: theme.muted }
        ]}
      >
        {section.title}
      </Text>
    ),
    [theme.muted, theme.secondaryBand]
  );
  const renderExerciseItem = useCallback(
    ({ item }: SectionListRenderItemInfo<ExerciseSection["data"][number], ExerciseSection>) => {
      const isFavorite = favoriteExerciseIds.has(item.exerciseId);
      const tierBadge = getExerciseOptionTierBadge(item);

      return (
        <Pressable
          accessibilityRole="button"
          style={[
            styles.exercisePickerRow,
            {
              backgroundColor: item.value === value ? theme.secondaryBand : theme.card,
              borderBottomColor: theme.border
            }
          ]}
          onPress={() => selectExercise(item.value)}
        >
          <Text style={[styles.exercisePickerRowText, { color: theme.text }]}>
            {item.label}
          </Text>
          {tierBadge ? (
            <Text style={[styles.exercisePickerTierBadge, { color: theme.primary, backgroundColor: theme.secondaryBand }]}>
              {tierLabels[tierBadge]}
            </Text>
          ) : null}
          <Pressable
            accessibilityLabel={isFavorite ? favoriteFilterOnlyLabel : favoriteFilterAllLabel}
            accessibilityRole="button"
            style={styles.exercisePickerFavoriteButton}
            onPress={(event) => {
              event.stopPropagation();
              onToggleFavorite(item.exerciseId);
            }}
          >
            <Ionicons
              name={isFavorite ? "star" : "star-outline"}
              size={24}
              color={isFavorite ? theme.primary : theme.muted}
            />
          </Pressable>
        </Pressable>
      );
    },
    [
      favoriteExerciseIds,
      favoriteFilterAllLabel,
      favoriteFilterOnlyLabel,
      onToggleFavorite,
      selectExercise,
      tierLabels,
      theme.border,
      theme.card,
      theme.muted,
      theme.primary,
      theme.secondaryBand,
      theme.text,
      value
    ]
  );

  return (
    <>
      <Pressable
        accessibilityRole="button"
        style={[
          styles.exercisePickerTrigger,
          {
            backgroundColor: disabled ? theme.secondaryBand : theme.control,
            borderColor: theme.border,
            opacity: disabled ? 0.72 : 1
          }
        ]}
        onPress={openPicker}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.exercisePickerTriggerText,
            { color: selectedOption ? theme.inputText : theme.muted }
          ]}
        >
          {selectedOption?.label ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={19} color={theme.muted} />
      </Pressable>

      <Modal animationType="slide" visible={isOpen} onRequestClose={() => setIsOpen(false)}>
        <SafeAreaView style={[styles.exercisePickerScreen, { backgroundColor: theme.background }]}>
          <StatusBar
            backgroundColor={theme.card}
            barStyle={theme.statusBar === "dark" ? "dark-content" : "light-content"}
            translucent={false}
          />
          <View style={styles.exercisePickerContent}>
            <View
              style={[
                styles.exercisePickerHeader,
                {
                  backgroundColor: theme.card,
                  borderBottomColor: theme.border,
                  paddingTop: pickerHeaderTopPadding
                }
              ]}
            >
              <Pressable
                accessibilityRole="button"
                style={styles.exercisePickerHeaderButton}
                onPress={() => setIsOpen(false)}
              >
                <Ionicons name="arrow-back" size={28} color={theme.text} />
              </Pressable>
              <Text style={[styles.exercisePickerTitle, { color: theme.text }]}>{title}</Text>
              <View style={styles.exercisePickerHeaderActions}>
                <Pressable
                  accessibilityRole="button"
                  style={styles.exercisePickerHeaderButton}
                  onPress={() => setIsSearchOpen((current) => !current)}
                >
                  <Ionicons name="search" size={27} color={theme.text} />
                </Pressable>
              </View>
            </View>

            {isSearchOpen ? (
              <View style={styles.exercisePickerFilters}>
                <Input
                  style={[
                    styles.exercisePickerSearchInput,
                    { backgroundColor: theme.control, borderColor: theme.border }
                  ]}
                >
                  <InputField
                    autoFocus
                    placeholder={searchPlaceholder}
                    placeholderTextColor={theme.muted}
                    style={[styles.exercisePickerSearchText, { color: theme.inputText }]}
                    value={query}
                    onChangeText={setQuery}
                  />
                </Input>
                <View style={styles.exercisePickerMuscleFilter}>
                  <Text style={[styles.label, { color: theme.muted }]}>{muscleFilterLabel}</Text>
                  <InlineSheetSelectControl
                    options={muscleOptions}
                    placeholder={muscleFilterAllLabel}
                    theme={theme}
                    value={selectedMuscle}
                    onChange={setSelectedMuscle}
                  />
                </View>
              </View>
            ) : null}

            <View style={styles.exerciseFavoriteFilterRow}>
              {([
                { label: favoriteFilterAllLabel, value: "all" as const },
                { label: favoriteFilterOnlyLabel, value: "favorites" as const }
              ]).map((option) => {
                const selected = favoriteFilter === option.value;

                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    style={[
                      styles.exerciseFavoriteFilterButton,
                      {
                        backgroundColor: selected ? theme.primary : theme.secondaryBand
                      }
                    ]}
                    onPress={() => setFavoriteFilter(option.value)}
                  >
                    <Text
                      style={[
                        styles.exerciseFavoriteFilterText,
                        { color: selected ? theme.white : theme.text }
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.exerciseTierFilterPanel}>
              <Pressable
                accessibilityRole="button"
                style={[styles.exerciseTierFilterToggle, { borderColor: theme.border, backgroundColor: theme.control }]}
                onPress={() => setShowAdditionalExercises((current) => !current)}
              >
                <Text style={[styles.exerciseTierFilterToggleText, { color: theme.text }]}>
                  {showAdditionalExercises ? hideAdditionalExercisesLabel : showMoreExercisesLabel}
                </Text>
                <Ionicons name={showAdditionalExercises ? "chevron-up" : "chevron-down"} size={18} color={theme.primary} />
              </Pressable>
              {showAdditionalExercises ? (
                <View style={styles.exerciseTierFilterOptions}>
                  {(["variation", "advanced", "sportSpecific", "rehab"] as const).map((tier) => {
                    const enabled = enabledAdditionalTiers.has(tier);
                    return (
                      <Pressable
                        key={tier}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: enabled }}
                        style={[styles.exerciseTierFilterChip, { borderColor: theme.border, backgroundColor: enabled ? theme.primary : theme.secondaryBand }]}
                        onPress={() => toggleAdditionalTier(tier)}
                      >
                        <Ionicons name={enabled ? "checkmark-circle" : "ellipse-outline"} size={18} color={enabled ? theme.white : theme.muted} />
                        <Text style={[styles.exerciseTierFilterChipText, { color: enabled ? theme.white : theme.text }]}>{tierLabels[tier]}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>

            <SectionList
              initialNumToRender={14}
              extraData={exerciseListExtraData}
              keyboardShouldPersistTaps="handled"
              maxToRenderPerBatch={16}
              sections={groupedOptions}
              style={[styles.exercisePickerList, { backgroundColor: theme.background }]}
              contentContainerStyle={styles.exercisePickerListContent}
              keyExtractor={getExerciseItemKey}
              ListEmptyComponent={renderExerciseListEmpty}
              renderSectionHeader={renderExerciseSectionHeader}
              renderItem={renderExerciseItem}
              removeClippedSubviews={Platform.OS === "android"}
              stickySectionHeadersEnabled={false}
              updateCellsBatchingPeriod={50}
              windowSize={7}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}
