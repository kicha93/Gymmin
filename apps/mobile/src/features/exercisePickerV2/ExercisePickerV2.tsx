import { Ionicons } from "@expo/vector-icons";
import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Image,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet as NativeStyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  activeExerciseLibraryTiers,
  equipmentKeys,
  exercises,
  getExerciseDisplayName,
  isExerciseAvailableForStageType,
  muscleKeys,
  muscleLabels,
  type EquipmentKey,
  type ExerciseLibraryTier,
  type MuscleKey
} from "../../domain/exercises";
import { getExerciseImageAssetKeys } from "../../domain/exerciseImageAssets";
import {
  searchExercises,
  type ExerciseSearchFilters,
  type ExerciseSearchResult,
  type ExerciseUsageById
} from "../../domain/exerciseSearch";
import { exerciseCategoryValues, type ExerciseCategory } from "../../domain/stageExerciseCategories";
import type { StageType } from "../../domain/workouts";
import { exerciseImageSources } from "../../exerciseImageSources";
import type { LanguageCode, TranslationKey } from "../../i18n/translations";
import type { Theme } from "../../theme/theme";

const StyleSheet = { ...NativeStyleSheet, absoluteFillObject: NativeStyleSheet.absoluteFill };

type PickerTab = "all" | "favorites" | "recent";
type FilterSection = "muscle" | "equipment" | "category" | "more";
const exercisePickerLibraryTiers: readonly ExerciseLibraryTier[] = [...activeExerciseLibraryTiers, "progression"];

const exercisePickerTierTranslationKeys = {
  main: "exercisePickerV2TierMain",
  variation: "exercisePickerV2TierVariation",
  advanced: "exercisePickerV2TierAdvanced",
  sportSpecific: "exercisePickerV2TierSportSpecific",
  rehab: "exercisePickerV2TierRehab",
  progression: "exercisePickerV2TierProgression"
} as const satisfies Record<ExerciseLibraryTier, TranslationKey>;

type Props = {
  disabled?: boolean;
  favoriteExerciseIds: ReadonlySet<string>;
  language: LanguageCode;
  onChange: (exerciseName: string) => void;
  onToggleFavorite: (exerciseId: string) => void;
  placeholder: string;
  stageType: StageType | "";
  t: (key: TranslationKey) => string;
  theme: Theme;
  usageById: ExerciseUsageById;
  value: string;
};

const equipmentLabels: Record<LanguageCode, Record<EquipmentKey, string>> = {
  pl: {
    ankleWeight: "Obciążniki", band: "Gumy", barbell: "Sztanga", battleRope: "Liny treningowe", bench: "Ławka", bike: "Rower",
    bosuBall: "BOSU", box: "Skrzynia", cableMachine: "Wyciąg", dumbbell: "Hantle", ezBar: "Gryf EZ", foamRoller: "Roller",
    jumpRope: "Skakanka", kettlebell: "Kettlebell", machine: "Maszyna", medicineBall: "Piłka lekarska", other: "Inne", plate: "Talerz",
    pullupBar: "Drążek", rings: "Kółka", rope: "Lina", sandbag: "Worek", sled: "Sanki", slidingDisc: "Dyski ślizgowe",
    smithMachine: "Maszyna Smitha", squatRack: "Stojak", swissBall: "Piłka", trx: "Taśmy", weightVest: "Kamizelka"
  },
  en: {
    ankleWeight: "Ankle weights", band: "Bands", barbell: "Barbell", battleRope: "Battle ropes", bench: "Bench", bike: "Bike",
    bosuBall: "BOSU", box: "Box", cableMachine: "Cable", dumbbell: "Dumbbells", ezBar: "EZ bar", foamRoller: "Foam roller",
    jumpRope: "Jump rope", kettlebell: "Kettlebell", machine: "Machine", medicineBall: "Medicine ball", other: "Other", plate: "Plate",
    pullupBar: "Pull-up bar", rings: "Rings", rope: "Rope", sandbag: "Sandbag", sled: "Sled", slidingDisc: "Sliding discs",
    smithMachine: "Smith machine", squatRack: "Rack", swissBall: "Swiss ball", trx: "Suspension", weightVest: "Weight vest"
  }
};

function categoryLabel(value: ExerciseCategory, language: LanguageCode) {
  const english = value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  const polish: Partial<Record<ExerciseCategory, string>> = {
    BENCH_PRESS: "Wyciskanie na klatkę", CALF_RAISE: "Wspięcia na łydki", CARDIO: "Cardio", CARRY: "Chód z obciążeniem",
    CORE: "Core", CRUNCH: "Brzuszki", CURL: "Uginanie ramion", DEADLIFT: "Martwy ciąg", FLYE: "Rozpiętki",
    FRONT_RAISE: "Unoszenie w przód", HIP_RAISE: "Unoszenie bioder", LATERAL_RAISE: "Unoszenie bokiem", LEG_CURL: "Uginanie nóg",
    LEG_EXTENSION: "Prostowanie nóg", LUNGE: "Wykroki", PLANK: "Deska", PULL_UP: "Podciąganie i ściąganie", PUSH_UP: "Pompki",
    ROW: "Wiosłowanie", SHOULDER_PRESS: "Wyciskanie nad głowę", SHRUG: "Szrugsy", SQUAT: "Przysiady",
    TRICEPS_EXTENSION: "Prostowanie ramion", WARM_UP: "Rozgrzewka"
  };
  return language === "pl" ? polish[value] ?? english : english;
}

function useDebouncedValue(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [delayMs, value]);
  return debounced;
}

type ResultRowProps = {
  favorite: boolean;
  item: ExerciseSearchResult;
  language: LanguageCode;
  onFavorite: (id: string) => void;
  onSelect: (name: string) => void;
  theme: Theme;
  t: (key: TranslationKey) => string;
};

const ResultRow = memo(function ResultRow({ favorite, item, language, onFavorite, onSelect, t, theme }: ResultRowProps) {
  const exercise = item.exercise;
  const imageKey = getExerciseImageAssetKeys(exercise.id)[0];
  const source = imageKey ? exerciseImageSources[imageKey] : undefined;
  const metadata = [
    item.muscles[0] ? muscleLabels[language][item.muscles[0]] : null,
    item.equipment[0] ? equipmentLabels[language][item.equipment[0]] : null,
    categoryLabel(item.category, language)
  ].filter(Boolean).slice(0, 3).join(" · ");
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={getExerciseDisplayName(exercise.name, language)}
      style={[localStyles.resultRow, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={() => onSelect(exercise.name)}
    >
      <View style={[localStyles.thumbnail, { backgroundColor: theme.secondaryBand }]}>
        {source ? <Image resizeMode="cover" source={source} style={localStyles.thumbnailImage} /> : <Ionicons name="barbell-outline" size={24} color={theme.primary} />}
      </View>
      <View style={localStyles.resultCopy}>
        <Text numberOfLines={2} style={[localStyles.resultName, { color: theme.text }]}>{getExerciseDisplayName(exercise.name, language)}</Text>
        <Text numberOfLines={1} style={[localStyles.resultMeta, { color: theme.muted }]}>{metadata}</Text>
        {item.usage ? <Text style={[localStyles.contextBadge, { color: theme.primary, backgroundColor: theme.secondaryBand }]}>{t("exercisePickerV2RecentlyUsed")}</Text> : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={favorite ? t("exercisePickerV2RemoveFavorite") : t("exercisePickerV2AddFavorite")}
        hitSlop={5}
        style={localStyles.rowAction}
        onPress={(event) => { event.stopPropagation(); onFavorite(exercise.id); }}
      ><Ionicons name={favorite ? "star" : "star-outline"} size={24} color={favorite ? theme.primary : theme.muted} /></Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("exercisePickerV2AddExercise")}
        hitSlop={5}
        style={[localStyles.addButton, { borderColor: theme.primary }]}
        onPress={(event) => { event.stopPropagation(); onSelect(exercise.name); }}
      ><Ionicons name="add" size={27} color={theme.primary} /></Pressable>
    </Pressable>
  );
});

export function ExercisePickerV2({ disabled = false, favoriteExerciseIds, language, onChange, onToggleFavorite, placeholder, stageType, t, theme, usageById, value }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<PickerTab>("all");
  const [muscles, setMuscles] = useState<Set<MuscleKey>>(new Set());
  const [equipment, setEquipment] = useState<Set<EquipmentKey>>(new Set());
  const [categories, setCategories] = useState<Set<ExerciseCategory>>(new Set());
  const [tiers, setTiers] = useState<Set<ExerciseLibraryTier>>(new Set(exercisePickerLibraryTiers));
  const [filterSection, setFilterSection] = useState<FilterSection | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const insets = useSafeAreaInsets();
  const debouncedQuery = useDebouncedValue(query, 140);
  const deferredQuery = useDeferredValue(debouncedQuery);
  const filters = useMemo<ExerciseSearchFilters>(() => ({ muscles, equipment, categories, tiers }), [categories, equipment, muscles, tiers]);
  const allowedExerciseIds = useMemo(() => new Set(exercises
    .filter((exercise) => isExerciseAvailableForStageType(exercise, stageType, exercisePickerLibraryTiers))
    .map((exercise) => exercise.id)), [stageType]);
  const results = useMemo(() => searchExercises({
    query: deferredQuery,
    language,
    filters,
    favoriteExerciseIds,
    usageById,
    allowedExerciseIds,
    mode: tab,
    limit: 250
  }), [allowedExerciseIds, deferredQuery, favoriteExerciseIds, filters, language, tab, usageById]);
  const recents = useMemo(() => searchExercises({
    query: "", language, filters, favoriteExerciseIds, usageById, allowedExerciseIds, mode: "recent", limit: 4
  }), [allowedExerciseIds, favoriteExerciseIds, filters, language, usageById]);
  const hasFilters = muscles.size + equipment.size + categories.size > 0 || tiers.size !== exercisePickerLibraryTiers.length;

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setKeyboardVisible(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const close = useCallback(() => { Keyboard.dismiss(); setOpen(false); }, []);
  const requestClose = useCallback(() => {
    if (keyboardVisible) Keyboard.dismiss();
    else close();
  }, [close, keyboardVisible]);
  const select = useCallback((name: string) => { onChange(name); close(); }, [close, onChange]);
  const clearFilters = useCallback(() => {
    setMuscles(new Set()); setEquipment(new Set()); setCategories(new Set()); setTiers(new Set(exercisePickerLibraryTiers));
  }, []);
  const toggle = useCallback(<T,>(setter: React.Dispatch<React.SetStateAction<Set<T>>>, value: T) => {
    setter((current) => { const next = new Set(current); if (next.has(value)) next.delete(value); else next.add(value); return next; });
  }, []);

  const renderResult = useCallback(({ item }: { item: ExerciseSearchResult }) => (
    <ResultRow favorite={favoriteExerciseIds.has(item.exercise.id)} item={item} language={language} onFavorite={onToggleFavorite} onSelect={select} t={t} theme={theme} />
  ), [favoriteExerciseIds, language, onToggleFavorite, select, t, theme]);

  const recentHeader = !query && tab === "all" && recents.length > 0 ? (
    <View style={[localStyles.recentPanel, { borderColor: theme.border, backgroundColor: theme.card }]}>
      <View style={localStyles.sectionHeader}><Text style={[localStyles.sectionTitle, { color: theme.text }]}>{t("exercisePickerV2RecentlyUsed")}</Text><Pressable onPress={() => setTab("recent")}><Text style={[localStyles.sectionLink, { color: theme.primary }]}>{t("exercisePickerV2SeeAll")}</Text></Pressable></View>
      <View style={localStyles.recentItems}>{recents.slice(0, 2).map((item) => <Pressable key={item.exercise.id} style={[localStyles.recentItem, { borderColor: theme.border }]} onPress={() => select(item.exercise.name)}><Text numberOfLines={2} style={[localStyles.recentName, { color: theme.text }]}>{getExerciseDisplayName(item.exercise.name, language)}</Text><Ionicons name="add-circle-outline" size={26} color={theme.primary} /></Pressable>)}</View>
    </View>
  ) : null;

  function filterChip(section: FilterSection, label: string, count: number) {
    return <Pressable key={section} style={[localStyles.filterChip, { backgroundColor: count ? theme.primary : theme.card, borderColor: count ? theme.primary : theme.border }]} onPress={() => setFilterSection(section)}><Text numberOfLines={1} style={[localStyles.filterChipText, { color: count ? theme.white : theme.text }]}>{label}{count ? `: ${count}` : ""}</Text><Ionicons name="chevron-down" size={15} color={count ? theme.white : theme.muted} /></Pressable>;
  }

  const filterOptions = filterSection === "muscle"
    ? muscleKeys.map((key) => ({ id: key, label: muscleLabels[language][key], selected: muscles.has(key), onPress: () => toggle(setMuscles, key) }))
    : filterSection === "equipment"
      ? equipmentKeys.map((key) => ({ id: key, label: equipmentLabels[language][key], selected: equipment.has(key), onPress: () => toggle(setEquipment, key) }))
      : filterSection === "category"
        ? exerciseCategoryValues.map((key) => ({ id: key, label: categoryLabel(key, language), selected: categories.has(key), onPress: () => toggle(setCategories, key) }))
      : exercisePickerLibraryTiers.map((key) => ({ id: key, label: t(exercisePickerTierTranslationKeys[key]), selected: tiers.has(key), onPress: () => toggle(setTiers, key) }));

  return <>
    <Pressable disabled={disabled} style={[localStyles.trigger, { backgroundColor: disabled ? theme.secondaryBand : theme.control, borderColor: theme.border, opacity: disabled ? 0.72 : 1 }]} onPress={() => setOpen(true)}>
      <Text numberOfLines={1} style={[localStyles.triggerText, { color: value ? theme.inputText : theme.muted }]}>{value ? getExerciseDisplayName(value, language) : placeholder}</Text><Ionicons name="chevron-down" size={19} color={theme.muted} />
    </Pressable>
    <Modal animationType="slide" visible={open} onRequestClose={requestClose}>
      <View style={[localStyles.screen, { backgroundColor: theme.background, paddingTop: insets.top }]}>
        <StatusBar backgroundColor={theme.card} barStyle={theme.statusBar === "dark" ? "dark-content" : "light-content"} />
        <View style={[localStyles.header, { backgroundColor: theme.card, borderColor: theme.border }]}><Pressable style={localStyles.headerButton} onPress={close}><Ionicons name="arrow-back" size={27} color={theme.text} /></Pressable><Text style={[localStyles.title, { color: theme.text }]}>{t("exercisePickerTitle")}</Text><Pressable style={localStyles.headerButton} onPress={() => setFilterSection("more")}><Ionicons name="options-outline" size={25} color={theme.text} /></Pressable></View>
        <View style={[localStyles.searchBox, { backgroundColor: theme.control, borderColor: theme.border }]}><Ionicons name="search" size={22} color={theme.muted} /><TextInput ref={inputRef} autoCapitalize="none" autoCorrect={false} clearButtonMode="never" placeholder={t("searchExercise")} placeholderTextColor={theme.muted} returnKeyType="search" style={[localStyles.searchInput, { color: theme.inputText }]} value={query} onChangeText={setQuery} />{query ? <Pressable style={localStyles.clearButton} onPress={() => setQuery("")}><Ionicons name="close" size={22} color={theme.muted} /></Pressable> : null}</View>
        <View style={[localStyles.tabs, { backgroundColor: theme.secondaryBand }]}>{(["all", "favorites", "recent"] as const).map((item) => <Pressable key={item} style={[localStyles.tab, { backgroundColor: tab === item ? theme.primary : "transparent" }]} onPress={() => setTab(item)}><Text style={[localStyles.tabText, { color: tab === item ? theme.white : theme.text }]}>{item === "all" ? (language === "pl" ? "Wszystkie" : "All") : item === "favorites" ? (language === "pl" ? "Ulubione" : "Favorites") : (language === "pl" ? "Ostatnie" : "Recent")}</Text></Pressable>)}</View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={localStyles.filterScroll} contentContainerStyle={localStyles.filterRow}>{filterChip("muscle", language === "pl" ? "Mięsień" : "Muscle", muscles.size)}{filterChip("equipment", language === "pl" ? "Sprzęt" : "Equipment", equipment.size)}{filterChip("category", language === "pl" ? "Typ ruchu" : "Movement", categories.size)}{filterChip("more", language === "pl" ? "Więcej" : "More", tiers.size === exercisePickerLibraryTiers.length ? 0 : tiers.size)}{hasFilters ? <Pressable style={localStyles.clearFilters} onPress={clearFilters}><Text style={{ color: theme.primary, fontWeight: "800" }}>{language === "pl" ? "Wyczyść" : "Clear"}</Text></Pressable> : null}</ScrollView>
        <FlatList data={results} renderItem={renderResult} keyExtractor={(item) => item.exercise.id} extraData={favoriteExerciseIds} ListHeaderComponent={recentHeader} ListEmptyComponent={<View style={localStyles.empty}><Ionicons name="search-outline" size={34} color={theme.muted} /><Text style={[localStyles.emptyTitle, { color: theme.text }]}>{language === "pl" ? "Nie znaleziono ćwiczenia" : "No exercise found"}</Text><Text style={[localStyles.emptyCopy, { color: theme.muted }]}>{language === "pl" ? "Zmień nazwę lub wyczyść część filtrów." : "Change the query or clear some filters."}</Text>{hasFilters ? <Pressable onPress={clearFilters}><Text style={{ color: theme.primary, fontWeight: "800" }}>{language === "pl" ? "Wyczyść filtry" : "Clear filters"}</Text></Pressable> : null}</View>} contentContainerStyle={localStyles.listContent} initialNumToRender={10} maxToRenderPerBatch={12} updateCellsBatchingPeriod={40} windowSize={7} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" removeClippedSubviews={Platform.OS === "android"} />
      </View>
    </Modal>
    <Modal transparent animationType="slide" visible={filterSection !== null} onRequestClose={() => setFilterSection(null)}><Pressable style={localStyles.sheetBackdrop} onPress={() => setFilterSection(null)} /><View style={[localStyles.sheet, { backgroundColor: theme.card, borderColor: theme.border, paddingBottom: Math.max(insets.bottom + 16, 28) }]}><View style={localStyles.sheetHandleWrap}><View style={[localStyles.sheetHandle, { backgroundColor: theme.border }]} /></View><View style={localStyles.sheetHeader}><Text style={[localStyles.sheetTitle, { color: theme.text }]}>{filterSection === "muscle" ? (language === "pl" ? "Mięśnie" : "Muscles") : filterSection === "equipment" ? (language === "pl" ? "Sprzęt" : "Equipment") : filterSection === "category" ? (language === "pl" ? "Typ ruchu" : "Movement") : (language === "pl" ? "Więcej filtrów" : "More filters")}</Text><Pressable style={localStyles.headerButton} onPress={() => setFilterSection(null)}><Ionicons name="close" size={25} color={theme.text} /></Pressable></View><ScrollView contentContainerStyle={localStyles.sheetOptions}>{filterOptions.map((option) => <Pressable key={option.id} accessibilityRole="checkbox" accessibilityState={{ checked: option.selected }} style={[localStyles.sheetOption, { borderColor: theme.border, backgroundColor: option.selected ? theme.secondaryBand : theme.card }]} onPress={option.onPress}><Ionicons name={option.selected ? "checkmark-circle" : "ellipse-outline"} size={22} color={option.selected ? theme.primary : theme.muted} /><Text style={[localStyles.sheetOptionText, { color: theme.text }]}>{option.label}</Text></Pressable>)}</ScrollView><View style={localStyles.sheetActions}><Pressable style={[localStyles.sheetAction, { borderColor: theme.border }]} onPress={clearFilters}><Text style={{ color: theme.text, fontWeight: "800" }}>{language === "pl" ? "Resetuj" : "Reset"}</Text></Pressable><Pressable style={[localStyles.sheetAction, { backgroundColor: theme.primary, borderColor: theme.primary }]} onPress={() => setFilterSection(null)}><Text style={{ color: theme.white, fontWeight: "800" }}>{language === "pl" ? "Zastosuj" : "Apply"}</Text></Pressable></View></View></Modal>
  </>;
}

const localStyles = StyleSheet.create({
  trigger: { alignItems: "center", borderRadius: 8, borderWidth: 1, flexDirection: "row", gap: 10, justifyContent: "space-between", minHeight: 46, paddingHorizontal: 12 },
  triggerText: { flex: 1, fontSize: 16, minWidth: 0 }, screen: { flex: 1 }, header: { alignItems: "center", borderBottomWidth: 1, flexDirection: "row", minHeight: 74, paddingHorizontal: 12 }, headerButton: { alignItems: "center", height: 44, justifyContent: "center", width: 44 }, title: { flex: 1, fontSize: 21, fontWeight: "800" },
  searchBox: { alignItems: "center", borderRadius: 12, borderWidth: 1, flexDirection: "row", marginHorizontal: 16, marginTop: 12, minHeight: 50, paddingHorizontal: 13 }, searchInput: { flex: 1, fontSize: 16, minHeight: 48, paddingHorizontal: 10 }, clearButton: { alignItems: "center", height: 42, justifyContent: "center", width: 38 },
  tabs: { borderRadius: 10, flexDirection: "row", marginHorizontal: 16, marginTop: 12, overflow: "hidden" }, tab: { alignItems: "center", flex: 1, justifyContent: "center", minHeight: 43, paddingHorizontal: 6 }, tabText: { fontSize: 14, fontWeight: "800" },
  filterScroll: { marginTop: 12 }, filterRow: { alignItems: "center", gap: 8, paddingBottom: 12, paddingHorizontal: 16 }, filterChip: { alignItems: "center", borderRadius: 999, borderWidth: 1, flexDirection: "row", gap: 6, minHeight: 38, paddingHorizontal: 12 }, filterChipText: { fontSize: 13, fontWeight: "700", maxWidth: 145 }, clearFilters: { justifyContent: "center", minHeight: 38, paddingHorizontal: 6 },
  listContent: { gap: 8, paddingBottom: 80, paddingHorizontal: 16 }, resultRow: { alignItems: "center", borderRadius: 12, borderWidth: 1, flexDirection: "row", minHeight: 76, padding: 8 }, thumbnail: { alignItems: "center", borderRadius: 9, height: 58, justifyContent: "center", overflow: "hidden", width: 58 }, thumbnailImage: { height: "100%", width: "100%" }, resultCopy: { flex: 1, gap: 3, minWidth: 0, paddingHorizontal: 10 }, resultName: { fontSize: 15, fontWeight: "800" }, resultMeta: { fontSize: 11, fontWeight: "600" }, contextBadge: { alignSelf: "flex-start", borderRadius: 5, fontSize: 9, fontWeight: "800", overflow: "hidden", paddingHorizontal: 5, paddingVertical: 2 }, rowAction: { alignItems: "center", height: 44, justifyContent: "center", width: 38 }, addButton: { alignItems: "center", borderRadius: 999, borderWidth: 1.5, height: 42, justifyContent: "center", width: 42 },
  recentPanel: { borderRadius: 12, borderWidth: 1, gap: 8, padding: 10 }, sectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, sectionTitle: { fontSize: 14, fontWeight: "800" }, sectionLink: { fontSize: 12, fontWeight: "800" }, recentItems: { flexDirection: "row", gap: 8 }, recentItem: { alignItems: "center", borderRadius: 9, borderWidth: 1, flex: 1, flexDirection: "row", gap: 5, minHeight: 58, padding: 8 }, recentName: { flex: 1, fontSize: 12, fontWeight: "700" },
  empty: { alignItems: "center", gap: 8, padding: 38 }, emptyTitle: { fontSize: 18, fontWeight: "800", textAlign: "center" }, emptyCopy: { fontSize: 14, textAlign: "center" },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "#000", opacity: 0.45 }, sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, bottom: 0, left: 0, maxHeight: "78%", position: "absolute", right: 0 }, sheetHandleWrap: { alignItems: "center", padding: 10 }, sheetHandle: { borderRadius: 99, height: 4, width: 44 }, sheetHeader: { alignItems: "center", flexDirection: "row", paddingHorizontal: 18 }, sheetTitle: { flex: 1, fontSize: 20, fontWeight: "800" }, sheetOptions: { flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 16 }, sheetOption: { alignItems: "center", borderRadius: 9, borderWidth: 1, flexDirection: "row", gap: 7, minHeight: 42, paddingHorizontal: 11 }, sheetOptionText: { fontSize: 13, fontWeight: "700" }, sheetActions: { flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 8 }, sheetAction: { alignItems: "center", borderRadius: 9, borderWidth: 1, flex: 1, justifyContent: "center", minHeight: 48 }
});
