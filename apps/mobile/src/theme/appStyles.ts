import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  screen: {
    flex: 1
  },
  splashScreen: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 32
  },
  header: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    minHeight: 62,
    paddingHorizontal: 20,
    paddingBottom: 8
  },
  headerTitleBlock: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 10,
    minWidth: 0
  },
  headerBackButton: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "900",
    minWidth: 0
  },
  headerWorkoutTitleRow: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 10,
    minWidth: 0
  },
  headerWorkoutTitle: {
    flex: 0,
    maxWidth: "56%"
  },
  headerWorkoutTitleSeparator: {
    height: 24,
    width: 1
  },
  headerElapsedTimeRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    minWidth: 0
  },
  headerElapsedTime: {
    fontSize: 16,
    fontWeight: "900"
  },
  profileHeaderButton: {
    alignItems: "center",
    borderRadius: 19,
    height: 38,
    justifyContent: "center",
    overflow: "hidden",
    width: 38
  },
  profileHeaderAvatarImage: {
    height: "100%",
    width: "100%"
  },
  content: {
    gap: 18,
    padding: 20
  },
  keyboardAvoidingContent: {
    flex: 1
  },
  closeButton: {
    alignItems: "center",
    height: 36,
    justifyContent: "center",
    width: 36
  },
  fieldGroup: {
    gap: 8
  },
  stepParagraph: {
    gap: 12,
    marginTop: 8
  },
  label: {
    fontSize: 13,
    fontWeight: "700"
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 46,
    paddingHorizontal: 12
  },
  gluestackInput: {
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 46
  },
  gluestackInputField: {
    flex: 1,
    fontSize: 16,
    fontWeight: "400",
    minHeight: 44,
    paddingHorizontal: 12
  },
  passwordInput: {
    alignItems: "center",
    flexDirection: "row"
  },
  passwordInputField: {
    paddingRight: 4
  },
  passwordVisibilityButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    paddingHorizontal: 12
  },
  gluestackTextarea: {
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 84,
    overflow: "hidden"
  },
  gluestackTextareaInput: {
    fontSize: 16,
    fontWeight: "400",
    height: "100%",
    minHeight: 84,
    paddingHorizontal: 12,
    paddingTop: 12,
    textAlignVertical: "top"
  },
  gluestackSelectTrigger: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 46
  },
  gluestackSelectInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "400",
    paddingHorizontal: 12
  },
  gluestackSelectContent: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: 1,
    bottom: 0,
    left: 0,
    maxHeight: "46%",
    paddingBottom: 18,
    paddingHorizontal: 12,
    paddingTop: 8,
    position: "absolute",
    right: 0,
    width: "100%"
  },
  gluestackSelectScrollView: {
    width: "100%"
  },
  gluestackSelectItem: {
    minHeight: 48,
    width: "100%"
  },
  gluestackSelectItemText: {
    fontSize: 16,
    fontWeight: "400"
  },
  inlineSelectItem: {
    borderRadius: 6,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 12,
    width: "100%"
  },
  inlineSelectItemText: {
    fontSize: 16,
    fontWeight: "400"
  },
  selectSheetRoot: {
    flex: 1,
    justifyContent: "flex-end"
  },
  selectSheetBackdrop: {
    ...StyleSheet.absoluteFill,
    opacity: 0.5
  },
  selectSheetHandleWrap: {
    alignItems: "center",
    paddingVertical: 10
  },
  selectSheetHandle: {
    borderRadius: 999,
    height: 4,
    width: 44
  },
  gluestackSelectBackdrop: {
    opacity: 0.5
  },
  exercisePickerTrigger: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    minHeight: 46,
    paddingHorizontal: 12
  },
  exercisePickerTriggerText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "400",
    minWidth: 0
  },
  exercisePickerScreen: {
    flex: 1
  },
  exercisePickerContent: {
    flex: 1
  },
  exercisePickerHeader: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 14,
    minHeight: 78,
    paddingHorizontal: 18
  },
  exercisePickerHeaderButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44
  },
  exercisePickerHeaderActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  exercisePickerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "800"
  },
  exercisePickerSearchInput: {
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 48
  },
  exercisePickerFilters: {
    gap: 10,
    marginBottom: 18,
    marginHorizontal: 22,
    marginTop: 12
  },
  exercisePickerMuscleFilter: {
    gap: 6
  },
  exerciseFavoriteFilterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
    marginHorizontal: 22,
    marginTop: 12
  },
  exerciseFavoriteFilterButton: {
    alignItems: "center",
    borderRadius: 8,
    flex: 1,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: 10
  },
  exerciseFavoriteFilterText: {
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center"
  },
  exerciseTierFilterPanel: {
    gap: 8,
    marginBottom: 8,
    marginHorizontal: 22
  },
  exerciseTierFilterToggle: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 40,
    paddingHorizontal: 12
  },
  exerciseTierFilterToggleText: {
    fontSize: 14,
    fontWeight: "800"
  },
  exerciseTierFilterOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  exerciseTierFilterChip: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    minHeight: 36,
    paddingHorizontal: 10
  },
  exerciseTierFilterChipText: {
    fontSize: 13,
    fontWeight: "700"
  },
  exercisePickerSearchText: {
    fontSize: 16,
    paddingHorizontal: 14
  },
  exercisePickerList: {
    flex: 1
  },
  exercisePickerListContent: {
    paddingBottom: 220
  },
  exercisePickerLetter: {
    fontSize: 12,
    fontWeight: "600",
    paddingHorizontal: 22,
    paddingVertical: 6
  },
  exercisePickerRow: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 34
  },
  exercisePickerRowText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "400",
    minWidth: 0
  },
  exercisePickerTierBadge: {
    borderRadius: 6,
    fontSize: 10,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 6,
    paddingVertical: 3
  },
  exercisePickerFavoriteButton: {
    alignItems: "center",
    height: 42,
    justifyContent: "center",
    width: 42
  },
  exercisePickerEmpty: {
    fontSize: 17,
    padding: 24
  },
  favoriteExerciseList: {
    gap: 10
  },
  favoriteExerciseRow: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 12
  },
  favoriteExerciseInfo: {
    flex: 1,
    gap: 4,
    minWidth: 0
  },
  favoriteExerciseRemoveButton: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44
  },
  emptyStatePanel: {
    alignItems: "center",
    borderRadius: 8,
    gap: 8,
    padding: 18
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center"
  },
  emptyStateCopy: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    textAlign: "center"
  },
  gluestackButton: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 12
  },
  workoutCreatorButton: {
    minHeight: 52
  },
  workoutCreatorButtonWrap: {
    position: "relative",
    zIndex: 5
  },
  trainingFactPill: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  trainingFactIcon: {
    alignItems: "center",
    borderRadius: 15,
    height: 30,
    justifyContent: "center",
    width: 30
  },
  trainingFactText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18
  },
  historyEntryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  historyEntryButton: {
    flex: 1,
    minWidth: 150
  },
  historyScreen: {
    gap: 14
  },
  progressStatsRow: {
    alignItems: "stretch",
    flexDirection: "row",
    gap: 8,
    width: "100%"
  },
  progressStatCard: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    gap: 7,
    height: 140,
    justifyContent: "flex-start",
    minWidth: 0,
    paddingHorizontal: 7,
    paddingVertical: 10
  },
  progressStatIcon: {
    alignItems: "center",
    borderRadius: 999,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  progressStatCopy: {
    alignItems: "center",
    minWidth: 0
  },
  progressStatTitle: {
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    textAlign: "center",
    width: "100%"
  },
  progressStatValue: {
    fontSize: 21,
    fontWeight: "900",
    lineHeight: 27,
    textAlign: "center",
    width: "100%"
  },
  progressStatCaption: {
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15,
    minHeight: 30,
    textAlign: "center",
    width: "100%"
  },
  progressFilterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  progressFilterChip: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 42,
    minWidth: 104,
    paddingHorizontal: 18
  },
  progressFilterChipText: {
    fontSize: 14,
    fontWeight: "900"
  },
  progressExerciseList: {
    gap: 12
  },
  progressExerciseCard: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14
  },
  progressExerciseHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between"
  },
  progressExerciseTitleBlock: {
    flex: 1,
    minWidth: 0
  },
  progressExerciseHeaderRight: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    gap: 6
  },
  progressSparkline: {
    alignItems: "center",
    height: 38,
    justifyContent: "center",
    width: 112
  },
  progressMetricsRow: {
    alignItems: "center",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingTop: 12
  },
  progressMetric: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 8,
    minWidth: 0
  },
  progressMetricIcon: {
    alignItems: "center",
    borderRadius: 999,
    flexShrink: 0,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  progressMetricCopy: {
    flex: 1,
    minWidth: 0
  },
  progressMetricLabel: {
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 15
  },
  progressMetricValue: {
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18
  },
  progressMetricDivider: {
    height: 42,
    width: 1
  },
  exerciseDetailTopActions: {
    alignItems: "flex-end"
  },
  exerciseDetailHeroCard: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    padding: 16
  },
  exerciseDetailHeroHeader: {
    gap: 10
  },
  exerciseDetailHeroMuscles: {
    gap: 4,
    marginTop: 2
  },
  exerciseDetailHeroMuscleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginTop: 6
  },
  exerciseDetailHeroMuscleIcon: {
    alignItems: "center",
    borderRadius: 999,
    height: 52,
    justifyContent: "center",
    width: 52
  },
  exerciseDetailHeroMuscleCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0
  },
  exerciseDetailCompactCard: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14
  },
  exerciseDetailTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6
  },
  exerciseDetailTag: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  exerciseDetailTagText: {
    fontSize: 12,
    fontWeight: "800"
  },
  exerciseDetailBulletList: {
    gap: 8
  },
  exerciseDetailBulletRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8
  },
  exerciseDetailBulletMarker: {
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 22
  },
  exerciseDetailBulletText: {
    flex: 1,
    minWidth: 0
  },
  exerciseDetailStepList: {
    gap: 10
  },
  exerciseDetailStepRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10
  },
  exerciseDetailStepBadge: {
    alignItems: "center",
    borderRadius: 999,
    height: 26,
    justifyContent: "center",
    marginTop: 1,
    width: 26
  },
  exerciseDetailStepBadgeText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900"
  },
  exerciseDetailStepText: {
    flex: 1,
    minWidth: 0
  },
  exerciseDetailMusclesHeader: {
    gap: 8
  },
  exerciseDetailSideToggle: {
    flexDirection: "row",
    gap: 0
  },
  exerciseDetailSideButton: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 10
  },
  exerciseDetailSideButtonText: {
    fontSize: 12,
    fontWeight: "900"
  },
  exerciseDetailMuscleContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12
  },
  advancedMuscleParent: {
    gap: 8,
    marginBottom: 12
  },
  advancedMuscleParentHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between"
  },
  advancedMuscleCategory: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "right"
  },
  advancedMuscleRow: {
    flexDirection: "row",
    minHeight: 38,
    paddingLeft: 7
  },
  advancedMuscleBranch: {
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    height: 18,
    marginRight: 8,
    width: 10
  },
  advancedMuscleRowContent: {
    flex: 1,
    gap: 5
  },
  advancedMuscleName: {
    fontSize: 12,
    fontWeight: "600"
  },
  advancedMuscleTrack: {
    borderRadius: 999,
    height: 6,
    overflow: "hidden"
  },
  exerciseDetailSingleFigure: {
    alignItems: "center",
    flexShrink: 0,
    justifyContent: "center",
    width: 128
  },
  exerciseDetailHumanFigure: {
    height: 210,
    maxWidth: 128,
    width: 128
  },
  exerciseDetailHistoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  exerciseDetailHistoryTile: {
    borderRadius: 8,
    flex: 1,
    gap: 4,
    minWidth: 130,
    padding: 10
  },
  segmentedControl: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  segmentButton: {
    borderRadius: 8,
    minHeight: 38,
    justifyContent: "center",
    paddingHorizontal: 12
  },
  segmentButtonText: {
    fontSize: 13,
    fontWeight: "800"
  },
  statsPanel: {
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    padding: 12
  },
  statTile: {
    flex: 1,
    minWidth: 120
  },
  statValue: {
    fontSize: 19,
    fontWeight: "900"
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17
  },
  activeSessionCard: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14
  },
  activeSessionActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  compactButton: {
    flex: 1,
    minHeight: 40,
    minWidth: 130,
    paddingHorizontal: 10
  },
  compactButtonText: {
    fontSize: 13
  },
  gluestackButtonText: {
    fontSize: 15,
    fontWeight: "800"
  },
  notesInput: {
    minHeight: 84,
    paddingTop: 12,
    textAlignVertical: "top"
  },
  searchBox: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 48,
    paddingHorizontal: 12
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    minWidth: 0
  },
  goalField: {
    flex: 3,
    gap: 8
  },
  weightField: {
    flex: 1,
    gap: 8
  },
  suffixedInput: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 46,
    paddingHorizontal: 12
  },
  suffixedTextInput: {
    flex: 1,
    fontSize: 16,
    minWidth: 0,
    padding: 0
  },
  inputSuffix: {
    fontSize: 14,
    fontWeight: "800",
    paddingLeft: 8
  },
  timeTargetRow: {
    flexDirection: "row",
    gap: 10
  },
  timeTargetPart: {
    flex: 1,
    gap: 5,
    minWidth: 0
  },
  timeTargetTextInput: {
    flex: 1,
    fontSize: 16,
    minWidth: 0,
    padding: 0,
    textAlign: "center"
  },
  timeTargetLabel: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center"
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  sectionHeaderCopy: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12
  },
  workoutDetailActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-end",
    maxWidth: "100%"
  },
  workoutDetailHeaderCompact: {
    alignItems: "stretch",
    flexDirection: "column",
    gap: 12
  },
  workoutDetailHeaderCopyCompact: {
    paddingRight: 0
  },
  workoutDetailActionsCompact: {
    flexWrap: "nowrap",
    justifyContent: "flex-start",
    width: "100%"
  },
  workoutDetailActionButton: {
    minWidth: 0,
    paddingHorizontal: 8
  },
  workoutDetailActionButtonCompact: {
    flex: 1,
    paddingHorizontal: 5
  },
  workoutDetailPrimaryActions: {
    flexDirection: "row",
    gap: 8,
    width: "100%"
  },
  workoutDetailPrimaryAction: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 6
  },
  workoutDetailPrimaryActionText: {
    flexShrink: 1,
    fontSize: 13,
    textAlign: "center"
  },
  workoutExportDescription: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20
  },
  workoutExportOption: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minHeight: 86,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  workoutExportIcon: {
    alignItems: "center",
    borderRadius: 8,
    height: 46,
    justifyContent: "center",
    width: 46
  },
  workoutExportOptionCopy: {
    flex: 1,
    minWidth: 0
  },
  workoutExportOptionTitle: {
    fontSize: 16,
    fontWeight: "800"
  },
  workoutExportOptionDescription: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    marginTop: 3
  },
  workoutExportCancel: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46
  },
  workoutExportCancelText: {
    fontSize: 15,
    fontWeight: "800"
  },
  workoutDetailDescription: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    marginTop: -8
  },
  muscleOverviewPanel: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    padding: 14
  },
  muscleOverviewTitle: {
    fontSize: 18,
    fontWeight: "900"
  },
  muscleOverviewFigures: {
    alignItems: "center",
    justifyContent: "center"
  },
  muscleOverviewSingleFigure: {
    height: 320,
    maxWidth: "100%",
    width: 192
  },
  workoutMuscleLegendList: {
    gap: 8
  },
  workoutMuscleLegendRow: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden"
  },
  workoutMuscleLegendPressable: {
    gap: 9,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  workoutMuscleLegendHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9
  },
  workoutMuscleLegendDot: {
    borderRadius: 9,
    height: 18,
    width: 18
  },
  workoutMuscleLegendLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    minWidth: 0
  },
  workoutMuscleLegendBadge: {
    alignItems: "center",
    borderRadius: 8,
    height: 28,
    justifyContent: "center",
    minWidth: 32,
    paddingHorizontal: 8
  },
  workoutMuscleLegendBadgeText: {
    fontSize: 12,
    fontWeight: "900"
  },
  workoutMuscleLegendTrack: {
    borderRadius: 3,
    height: 5,
    marginLeft: 27,
    overflow: "hidden"
  },
  workoutMuscleLegendFill: {
    borderRadius: 3,
    height: "100%"
  },
  workoutMuscleLegendDetails: {
    borderTopWidth: 1,
    gap: 7,
    marginHorizontal: 12,
    paddingBottom: 11,
    paddingLeft: 27,
    paddingTop: 9
  },
  workoutMuscleLegendMuscleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  workoutMuscleLegendMuscleDot: {
    borderRadius: 3,
    height: 6,
    width: 6
  },
  workoutMuscleLegendMuscleText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17
  },
  humanMuscleFigure: {
    aspectRatio: 0.6,
    height: 250,
    maxWidth: "48%",
    width: "48%"
  },
  muscleOverviewLegend: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center"
  },
  muscleLegendItem: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7
  },
  muscleLegendDot: {
    borderRadius: 8,
    height: 16,
    width: 16
  },
  muscleLegendText: {
    fontSize: 12,
    fontWeight: "700"
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800"
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 3
  },
  builderBackButton: {
    flexShrink: 0,
    minHeight: 38,
    paddingHorizontal: 10
  },
  builderBackButtonText: {
    fontSize: 13
  },
  iconButton: {
    alignItems: "center",
    borderRadius: 8,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  panel: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden"
  },
  panelHeader: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    minHeight: 56,
    paddingHorizontal: 14
  },
  panelHeaderActions: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    gap: 8
  },
  panelActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: "800"
  },
  panelTitleBlock: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 44,
    minWidth: 0
  },
  panelTitleButton: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 44,
    minWidth: 0
  },
  panelBody: {
    gap: 10,
    padding: 12
  },
  panelIconButton: {
    alignItems: "center",
    borderRadius: 8,
    height: 38,
    justifyContent: "center",
    minHeight: 38,
    minWidth: 38,
    width: 38
  },
  panelCountBadge: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    minWidth: 38,
    paddingHorizontal: 10
  },
  panelCountBadgeText: {
    fontSize: 16,
    fontWeight: "900"
  },
  panelToggleButton: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  sessionEntryActions: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    gap: 8
  },
  sessionDeleteButton: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  workoutList: {
    gap: 10
  },
  workoutEmptyText: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19
  },
  workoutSearchLabelRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
    minHeight: 30
  },
  workoutArchiveFilterChip: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    minHeight: 28,
    paddingHorizontal: 9,
    paddingVertical: 3
  },
  workoutArchiveFilterChipText: {
    fontSize: 11,
    fontWeight: "800"
  },
  addWorkoutPanel: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
    minHeight: 48
  },
  addWorkoutIcon: {
    alignItems: "center",
    borderRadius: 8,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  addWorkoutName: {
    fontSize: 15
  },
  addWorkoutMeta: {
    fontSize: 12,
    lineHeight: 16
  },
  workoutRow: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 56,
    paddingBottom: 8
  },
  workoutIcon: {
    alignItems: "center",
    borderRadius: 8,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  workoutInfo: {
    flex: 1,
    gap: 3,
    minWidth: 0
  },
  workoutNameRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  workoutArchivedBadge: {
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2
  },
  workoutArchivedBadgeText: {
    fontSize: 10,
    fontWeight: "800"
  },
  workoutName: {
    fontSize: 15,
    fontWeight: "800"
  },
  workoutMeta: {
    fontSize: 12,
    fontWeight: "700"
  },
  workoutDetailStages: {
    gap: 12
  },
  workoutDetailStage: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14
  },
  workoutDetailStageHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12
  },
  workoutDetailStageBadge: {
    alignItems: "center",
    borderRadius: 8,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  workoutDetailStageBadgeText: {
    fontSize: 15,
    fontWeight: "900"
  },
  workoutDetailNotes: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19
  },
  workoutDetailTable: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden"
  },
  workoutDetailTableHeader: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 8,
    paddingVertical: 7
  },
  workoutDetailTableHeaderText: {
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  workoutDetailTableRow: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 50,
    paddingHorizontal: 8,
    paddingVertical: 7
  },
  workoutDetailTableRowLast: {
    borderBottomWidth: 0
  },
  workoutDetailTableIndexCell: {
    alignItems: "center",
    flexShrink: 0,
    width: 34
  },
  workoutDetailTableExerciseCell: {
    flex: 1,
    minWidth: 0
  },
  workoutDetailTableSmallCell: {
    flexShrink: 0,
    textAlign: "center",
    width: 42
  },
  workoutDetailTableRestCell: {
    flexShrink: 0,
    textAlign: "center",
    width: 58
  },
  workoutDetailTableResultCell: {
    flexShrink: 0,
    textAlign: "center",
    width: 72
  },
  workoutDetailTableActionCell: {
    flexShrink: 0,
    height: 34,
    width: 34
  },
  workoutDetailTableBadge: {
    alignItems: "center",
    borderRadius: 8,
    height: 30,
    justifyContent: "center",
    width: 30
  },
  workoutDetailTableExerciseName: {
    fontSize: 13,
    fontWeight: "900"
  },
  workoutDetailTableNote: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2
  },
  workoutDetailTableValue: {
    fontSize: 12,
    fontWeight: "900"
  },
  workoutSessionDetailTableScroll: {
    marginHorizontal: -2
  },
  workoutSessionDetailTableScrollContent: {
    paddingHorizontal: 2
  },
  workoutSessionDetailTable: {
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 552,
    overflow: "hidden"
  },
  inlineWorkoutTable: {
    minWidth: 688
  },
  inlineWorkoutTableHorizontal: {
    minWidth: 900
  },
  inlineWorkoutTableFrame: {
    gap: 8
  },
  inlineWorkoutRotateButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  inlineWorkoutRotateButtonText: {
    fontSize: 12,
    fontWeight: "900"
  },
  workoutSessionDetailTableHeader: {
    alignItems: "stretch",
    borderBottomWidth: 1,
    flexDirection: "row",
    minHeight: 54
  },
  workoutSessionDetailHeaderText: {
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
    textTransform: "uppercase"
  },
  workoutSessionDetailHeaderCell: {
    alignItems: "center",
    borderRightWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 6,
    paddingVertical: 7
  },
  workoutSessionDetailExerciseGroup: {
    borderBottomWidth: 2,
    flexDirection: "row"
  },
  workoutSessionDetailExerciseGroupLast: {
    borderBottomWidth: 0
  },
  workoutSessionDetailExerciseCell: {
    borderRightWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    width: 204
  },
  inlineWorkoutExerciseCell: {
    borderRightWidth: 1,
    justifyContent: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 12,
    width: 260
  },
  inlineWorkoutExerciseCellHorizontal: {
    width: 360
  },
  inlineWorkoutExerciseCopy: {
    gap: 8,
    width: "100%"
  },
  inlineWorkoutExerciseTitleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
    minWidth: 0
  },
  inlineWorkoutExerciseName: {
    flex: 1,
    minWidth: 0
  },
  inlineWorkoutExerciseNotes: {
    marginTop: 0
  },
  workoutSessionDetailSetsCell: {
    flex: 1
  },
  workoutSessionDetailSetRow: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    minHeight: 46,
    paddingHorizontal: 8,
    paddingVertical: 6
  },
  inlineWorkoutSetRow: {
    minHeight: 58,
    paddingHorizontal: 6
  },
  workoutSessionDetailSetRowLast: {
    borderBottomWidth: 0
  },
  workoutSessionDetailSetCell: {
    borderRightWidth: 1,
    flexShrink: 0,
    textAlign: "center",
    width: 48
  },
  workoutSessionDetailRepsHeader: {
    alignItems: "center",
    borderRightWidth: 1,
    justifyContent: "center",
    paddingTop: 7,
    width: 136
  },
  inlineWorkoutRepsHeader: {
    width: 136
  },
  workoutSessionDetailRepsSubHeader: {
    borderTopWidth: 1,
    flexDirection: "row",
    marginTop: 5,
    width: "100%"
  },
  workoutSessionDetailRepsCell: {
    borderRightWidth: 1,
    flexShrink: 0,
    paddingHorizontal: 4,
    paddingVertical: 5,
    textAlign: "center",
    width: 68
  },
  inlineWorkoutRepsCell: {
    width: 68
  },
  workoutSessionDetailWeightCell: {
    borderRightWidth: 1,
    flexShrink: 0,
    paddingHorizontal: 4,
    textAlign: "center",
    width: 80
  },
  inlineWorkoutWeightCell: {
    borderRightWidth: 1,
    flexShrink: 0,
    paddingHorizontal: 4,
    textAlign: "center",
    width: 104
  },
  inlineWorkoutInputCell: {
    justifyContent: "center",
    paddingHorizontal: 4,
    paddingVertical: 3
  },
  inlineWorkoutLastHeaderCell: {
    borderRightWidth: 0
  },
  workoutSessionDetailLastHeaderCell: {
    borderRightWidth: 0
  },
  workoutSessionDetailVolumeCell: {
    flexShrink: 0,
    paddingHorizontal: 4,
    textAlign: "center",
    width: 90
  },
  inlineTooltip: {
    alignSelf: "stretch",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  inlineTooltipText: {
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center"
  },
  disabledActionButton: {
    opacity: 0.58
  },
  workoutDetailSeriesList: {
    gap: 8
  },
  workoutDetailSeriesRow: {
    borderBottomWidth: 1,
    paddingBottom: 12,
    paddingTop: 4
  },
  workoutDetailSeriesRowLast: {
    borderBottomWidth: 0
  },
  workoutDetailSeriesBadge: {
    alignItems: "center",
    borderRadius: 8,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  workoutDetailSeriesTitle: {
    flex: 1
  },
  workoutDetailElementRow: {
    gap: 3,
    paddingTop: 8
  },
  workoutDetailExerciseName: {
    fontSize: 15,
    fontWeight: "800"
  },
  exerciseSummaryContainer: {
    gap: 8,
    paddingVertical: 4
  },
  exerciseSummaryRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    minHeight: 54,
    paddingVertical: 4
  },
  exerciseSummaryCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0
  },
  exerciseSummaryTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    minWidth: 0
  },
  exerciseSummaryRestCopy: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-start",
    minWidth: 0
  },
  exerciseSummaryRight: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    gap: 8
  },
  exerciseSummaryTiles: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5
  },
  exerciseSummaryTile: {
    alignItems: "center",
    borderRadius: 8,
    justifyContent: "center",
    minHeight: 34,
    minWidth: 36,
    paddingHorizontal: 8
  },
  exerciseSummarySingleTile: {
    minWidth: 52
  },
  exerciseSummaryTileText: {
    fontSize: 13,
    fontWeight: "900"
  },
  exerciseSummaryTimes: {
    fontSize: 13,
    fontWeight: "900"
  },
  exerciseMuscleButton: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  modalOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.52)",
    flex: 1,
    justifyContent: "center",
    padding: 18
  },
  appDialogBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.52)",
    flex: 1,
    justifyContent: "center",
    padding: 24
  },
  appDialogPanel: {
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: 420,
    overflow: "hidden",
    width: "100%"
  },
  appDialogBody: {
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 22
  },
  appDialogTitle: {
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 26
  },
  appDialogMessage: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22
  },
  appDialogFooter: {
    borderTopWidth: 1,
    flexDirection: "row",
    minHeight: 54
  },
  appDialogFooterButton: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 12
  },
  appDialogFooterButtonText: {
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
    textTransform: "uppercase"
  },
  exerciseMuscleModal: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 16,
    maxHeight: "92%",
    padding: 16,
    width: "100%"
  },
  exerciseMuscleModalContent: {
    gap: 16
  },
  exerciseMuscleLists: {
    flex: 1,
    gap: 10,
    minWidth: 0
  },
  exerciseAnimationPlaceholder: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    justifyContent: "center",
    minHeight: 104,
    padding: 16
  },
  exerciseImageStrip: {
    gap: 12,
    paddingVertical: 2
  },
  exerciseImageFrame: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    height: 190,
    justifyContent: "center",
    overflow: "hidden",
    width: 150
  },
  exerciseDetailImage: {
    height: "100%",
    width: "100%"
  },
  sessionHistoryList: {
    gap: 10
  },
  sessionHistoryRow: {
    borderBottomWidth: 1,
    gap: 3,
    paddingBottom: 10
  },
  exerciseProgressOverviewCard: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden"
  },
  exerciseProgressOverviewTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    padding: 14
  },
  exerciseProgressOverviewIcon: {
    alignItems: "center",
    borderRadius: 8,
    height: 48,
    justifyContent: "center",
    width: 48
  },
  exerciseProgressOverviewTitleBlock: {
    flex: 1,
    gap: 4,
    minWidth: 0
  },
  exerciseProgressOverviewMetrics: {
    borderTopWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 8
  },
  exerciseProgressOverviewMetric: {
    alignItems: "center",
    flexBasis: "50%",
    flexDirection: "row",
    gap: 8,
    minWidth: 0,
    padding: 8
  },
  exerciseProgressOverviewMetricIcon: {
    alignItems: "center",
    borderRadius: 8,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  exerciseProgressOverviewMetricCopy: {
    flex: 1,
    minWidth: 0
  },
  exerciseProgressOverviewMetricLabel: {
    fontSize: 12,
    fontWeight: "700"
  },
  exerciseProgressOverviewMetricValue: {
    fontSize: 16,
    fontWeight: "900"
  },
  exerciseProgressHistoryPanel: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 12
  },
  exerciseProgressHistoryPanelHeader: {
    gap: 10
  },
  exerciseProgressRangeChips: {
    gap: 8
  },
  exerciseProgressRangeChip: {
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 34,
    justifyContent: "center",
    paddingHorizontal: 12
  },
  exerciseProgressRangeChipText: {
    fontSize: 13,
    fontWeight: "800"
  },
  exerciseProgressHistoryList: {
    gap: 10
  },
  exerciseProgressHistoryEmpty: {
    fontSize: 14,
    fontWeight: "600",
    paddingVertical: 14,
    textAlign: "center"
  },
  exerciseProgressHistoryCard: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden"
  },
  exerciseProgressHistoryHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    padding: 12
  },
  exerciseProgressHistoryCalendar: {
    alignItems: "center",
    borderRadius: 8,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  exerciseProgressHistoryTitleBlock: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  exerciseProgressHistoryDate: {
    fontSize: 14,
    fontWeight: "900"
  },
  exerciseProgressHistoryWorkout: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18
  },
  exerciseProgressHistoryHeaderRight: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7
  },
  exerciseProgressHistoryBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6
  },
  exerciseProgressHistoryBadgeText: {
    fontSize: 12,
    fontWeight: "900"
  },
  exerciseProgressTable: {
    borderTopWidth: 1
  },
  exerciseProgressSeriesRow: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 9,
    minHeight: 44,
    paddingHorizontal: 12
  },
  exerciseProgressSeriesValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center"
  },
  exerciseProgressSeriesVolume: {
    flex: 1.15,
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right"
  },
  exerciseProgressSetBadge: {
    alignItems: "center",
    borderRadius: 999,
    height: 26,
    justifyContent: "center",
    width: 26
  },
  exerciseProgressSetBadgeText: {
    fontSize: 13,
    fontWeight: "900"
  },
  exerciseProgressTotalRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  exerciseProgressTotalLabel: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6
  },
  exerciseProgressTotalText: {
    fontSize: 14,
    fontWeight: "900"
  },
  exerciseProgressTotalValue: {
    fontSize: 14,
    fontWeight: "900"
  },
  exerciseProgressHistorySummary: {
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 12
  },
  exerciseProgressHistorySummaryLabel: {
    fontSize: 11,
    fontWeight: "700"
  },
  exerciseProgressHistorySummaryValue: {
    fontSize: 14,
    fontWeight: "900",
    marginTop: 2
  },
  exerciseProgressOlderButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    justifyContent: "center",
    minHeight: 40
  },
  exerciseProgressOlderButtonText: {
    fontSize: 14,
    fontWeight: "900"
  },
  sessionScreen: {
    gap: 14
  },
  sessionCard: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14
  },
  sessionActions: {
    flexDirection: "row",
    gap: 10
  },
  sessionProgressCard: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  sessionProgressIcon: {
    alignItems: "center",
    borderRadius: 8,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  sessionProgressCardText: {
    flexShrink: 0,
    fontSize: 15,
    fontWeight: "900"
  },
  sessionProgressTrack: {
    borderRadius: 999,
    flex: 1,
    height: 8,
    minWidth: 70,
    overflow: "hidden"
  },
  sessionProgressFill: {
    borderRadius: 999,
    height: "100%"
  },
  sessionProgressPercent: {
    flexShrink: 0,
    fontSize: 13,
    fontWeight: "900",
    minWidth: 38,
    textAlign: "right"
  },
  sessionProgressRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between"
  },
  sessionProgressCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  sessionProgressText: {
    fontSize: 16,
    fontWeight: "900"
  },
  sessionNavButton: {
    flex: 1
  },
  sessionInputGrid: {
    gap: 10
  },
  sessionCheckboxRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  sessionCheckbox: {
    alignItems: "center",
    borderRadius: 6,
    borderWidth: 1,
    height: 26,
    justifyContent: "center",
    width: 26
  },
  sessionCheckboxText: {
    fontSize: 14,
    fontWeight: "800"
  },
  sessionInlineFields: {
    flexDirection: "row",
    gap: 10
  },
  sessionInlineInput: {
    flex: 1
  },
  sessionNoteInput: {
    minHeight: 76
  },
  sessionQuickFillRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginLeft: 44
  },
  sessionQuickFillRowCompact: {
    marginLeft: 0,
    marginTop: 2
  },
  sessionQuickFillSlot: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0
  },
  sessionQuickFillButton: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: 8,
    paddingVertical: 7,
    width: "100%"
  },
  sessionQuickFillButtonText: {
    fontSize: 12,
    fontWeight: "900"
  },
  guidedPlanPreview: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 18,
    padding: 18
  },
  guidedExerciseHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12
  },
  guidedExerciseNumber: {
    alignItems: "center",
    borderRadius: 8,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  guidedExerciseNumberText: {
    fontSize: 16,
    fontWeight: "900"
  },
  guidedExerciseTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 23,
    minWidth: 0
  },
  guidedExerciseNotes: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 22
  },
  guidedExerciseMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  guidedRestGroup: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 1,
    gap: 10,
    minWidth: 0
  },
  guidedRestLabel: {
    fontSize: 15,
    fontWeight: "900"
  },
  guidedRestPill: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 10
  },
  guidedRestPillText: {
    fontSize: 13,
    fontWeight: "900"
  },
  guidedTargetGroup: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    gap: 8
  },
  guidedTargetPill: {
    alignItems: "center",
    borderRadius: 8,
    minHeight: 36,
    minWidth: 44,
    justifyContent: "center",
    paddingHorizontal: 10
  },
  guidedTargetText: {
    fontSize: 15,
    fontWeight: "900"
  },
  guidedTargetSeparator: {
    fontSize: 13,
    fontWeight: "900"
  },
  guidedSupersetBadgeRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between"
  },
  guidedSupersetBadge: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    minHeight: 38,
    paddingHorizontal: 13
  },
  guidedSupersetBadgeText: {
    fontSize: 14,
    fontWeight: "900"
  },
  guidedSupersetSplitButton: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 11
  },
  guidedSupersetSplitText: {
    fontSize: 12,
    fontWeight: "900"
  },
  guidedSupersetCard: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 16,
    padding: 18
  },
  guidedSupersetExercise: {
    gap: 16
  },
  guidedSupersetExercisePrefix: {
    fontWeight: "900"
  },
  guidedSupersetSeparator: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  guidedSupersetSeparatorLine: {
    flex: 1,
    height: 1
  },
  guidedSupersetSeparatorText: {
    fontSize: 12,
    fontWeight: "900"
  },
  guidedSupersetTableCard: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
    paddingVertical: 8
  },
  guidedSupersetTableScrollContent: {
    paddingBottom: 2,
    paddingHorizontal: 8
  },
  guidedSupersetTable: {
    width: 548
  },
  guidedSupersetTableRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    minHeight: 54
  },
  guidedSupersetTableHeader: {
    minHeight: 44
  },
  guidedSupersetPrefillRow: {
    minHeight: 48
  },
  guidedSupersetStatusCell: {
    alignItems: "center",
    justifyContent: "center",
    width: 44
  },
  guidedSupersetValueCell: {
    alignItems: "stretch",
    justifyContent: "center",
    paddingVertical: 4
  },
  guidedSupersetWeightCell: {
    width: 148
  },
  guidedSupersetRepsCell: {
    width: 88
  },
  guidedSupersetHeaderText: {
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 15,
    textAlign: "center"
  },
  guidedSupersetPrefillButton: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 5
  },
  guidedSupersetPrefillEmpty: {
    minHeight: 40
  },
  guidedSupersetPrefillText: {
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center"
  },
  guidedSupersetInputDisabled: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 44
  },
  guidedSupersetRestTimer: {
    gap: 8
  },
  guidedSupersetRestLabel: {
    fontSize: 14,
    fontWeight: "900"
  },
  guidedEntryTable: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 8
  },
  guidedEntryRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  guidedEntryDone: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    minHeight: 46,
    width: 34
  },
  guidedEntryFields: {
    flex: 1,
    flexDirection: "row",
    gap: 10
  },
  guidedEntryInput: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0
  },
  restTimerCard: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    padding: 10
  },
  restTimerCopy: {
    flex: 1,
    minWidth: 0
  },
  restTimerValue: {
    fontSize: 24,
    fontWeight: "900"
  },
  restTimerActions: {
    flexDirection: "row",
    gap: 8
  },
  restTimerButton: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 36,
    minWidth: 62,
    justifyContent: "center",
    paddingHorizontal: 10
  },
  restTimerButtonText: {
    fontSize: 12,
    fontWeight: "900"
  },
  sessionList: {
    gap: 10
  },
  sessionEntryCard: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 12
  },
  sessionEntryHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between"
  },
  sessionDoneButton: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  modeSheetButton: {
    flex: 1,
    minWidth: 140
  },
  detailsButton: {
    minHeight: 36,
    paddingHorizontal: 10
  },
  detailsButtonText: {
    fontSize: 12
  },
  builderBlock: {
    gap: 14
  },
  workoutEditorStepper: {
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    overflow: "hidden",
    padding: 3
  },
  workoutEditorStepperItem: {
    alignItems: "center",
    borderRadius: 9,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 5,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 6
  },
  workoutEditorStepperText: {
    fontSize: 13,
    fontWeight: "800"
  },
  workoutEditorCard: {
    borderRadius: 14,
    borderWidth: 1,
    gap: 16,
    padding: 16
  },
  workoutEditorCardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between"
  },
  workoutEditorCardTitle: {
    flexShrink: 1,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 25
  },
  workoutEditorEyebrow: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 3,
    textTransform: "uppercase"
  },
  workoutEditorFieldError: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18
  },
  workoutEditorCompactSummary: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14
  },
  workoutEditorSummaryIcon: {
    alignItems: "center",
    borderRadius: 10,
    height: 46,
    justifyContent: "center",
    width: 46
  },
  workoutEditorStagePicker: {
    gap: 8
  },
  workoutEditorStageTabs: {
    gap: 9,
    paddingRight: 4
  },
  workoutEditorStageTab: {
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: "center",
    maxWidth: 170,
    minHeight: 46,
    minWidth: 100,
    paddingHorizontal: 16
  },
  workoutEditorStageTabText: {
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center"
  },
  workoutEditorAddStageTab: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    height: 46,
    justifyContent: "center",
    width: 52
  },
  workoutEditorElementActions: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    gap: 14,
    minHeight: 40,
    paddingHorizontal: 4
  },
  workoutEditorListSection: {
    gap: 4
  },
  workoutEditorSectionTitle: {
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 5
  },
  workoutEditorRow: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 11,
    minHeight: 64,
    paddingVertical: 9
  },
  workoutEditorRowIndex: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  workoutEditorRowIndexText: {
    fontSize: 14,
    fontWeight: "900"
  },
  workoutEditorRowCopy: {
    flex: 1,
    minWidth: 0
  },
  workoutEditorSetExercises: {
    flex: 1,
    gap: 7,
    minWidth: 0
  },
  workoutEditorSetExercise: {
    minWidth: 0
  },
  workoutEditorSectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  workoutEditorSupersetLabel: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5
  },
  workoutEditorSupersetLabelText: {
    fontSize: 13,
    fontWeight: "800"
  },
  workoutEditorSupersetHint: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
    marginTop: -4
  },
  workoutEditorRowTitle: {
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 20
  },
  workoutEditorRowMeta: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    marginTop: 2
  },
  workoutEditorEmptyText: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    paddingVertical: 8
  },
  workoutEditorPreview: {
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    padding: 14
  },
  workoutEditorPreviewHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  workoutEditorPreviewItem: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20
  },
  workoutEditorBreadcrumb: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 7,
    minHeight: 38
  },
  workoutEditorBreadcrumbText: {
    fontSize: 14,
    fontWeight: "800"
  },
  workoutEditorValidation: {
    borderRadius: 10,
    gap: 7,
    padding: 12
  },
  workoutEditorValidationRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8
  },
  workoutEditorValidationText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18
  },
  workoutEditorSummaryName: {
    fontSize: 22,
    fontWeight: "900"
  },
  workoutEditorSummaryNotes: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20
  },
  workoutEditorSummaryCounts: {
    fontSize: 14,
    fontWeight: "900"
  },
  workoutEditorSummaryStages: {
    gap: 2
  },
  workoutEditorSummaryStage: {
    borderBottomWidth: 1,
    flexDirection: "row",
    minHeight: 58,
    paddingVertical: 9
  },
  workoutEditorContextActions: {
    borderTopWidth: 1,
    marginHorizontal: -20,
    paddingHorizontal: 20,
    paddingTop: 12
  },
  workoutEditorActionRow: {
    flexDirection: "row",
    gap: 10
  },
  workoutEditorActionButton: {
    flex: 1,
    minHeight: 50,
    paddingHorizontal: 8
  },
  emptyBuilder: {
    alignItems: "flex-start",
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 16
  },
  emptyBuilderTitle: {
    fontSize: 17,
    fontWeight: "800"
  },
  emptyBuilderCopy: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20
  },
  secondaryButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 12
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "800"
  },
  profileScreen: {
    gap: 14
  },
  profileActionsRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-end"
  },
  profileAvatarPanel: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 18
  },
  profileAvatarFrame: {
    alignItems: "center",
    borderRadius: 48,
    height: 96,
    justifyContent: "center",
    overflow: "hidden",
    width: 96
  },
  profileAvatarImage: {
    height: "100%",
    width: "100%"
  },
  profileAvatarActions: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center"
  },
  profileDashboardCard: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    padding: 18
  },
  profileDashboardTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16
  },
  profileDashboardAvatarWrap: {
    flexShrink: 0,
    position: "relative"
  },
  profileDashboardAvatarFrame: {
    alignItems: "center",
    flexShrink: 0,
    justifyContent: "center",
    overflow: "hidden"
  },
  profileDashboardAvatarImage: {
    height: "100%",
    width: "100%"
  },
  profileDashboardAvatarEdit: {
    alignItems: "center",
    borderRadius: 22,
    borderWidth: 3,
    bottom: -2,
    height: 44,
    justifyContent: "center",
    position: "absolute",
    right: -2,
    width: 44
  },
  profileDashboardIdentity: {
    flex: 1,
    gap: 5,
    minWidth: 0
  },
  profileDashboardName: {
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 27
  },
  profileDashboardNameCompact: {
    fontSize: 19,
    lineHeight: 23
  },
  profileDashboardStats: {
    alignItems: "stretch",
    borderTopWidth: 1,
    flexDirection: "row",
    marginTop: 7,
    paddingTop: 9
  },
  profileDashboardStat: {
    alignItems: "center",
    flex: 1,
    gap: 1,
    minWidth: 0
  },
  profileDashboardStatValue: {
    fontSize: 20,
    fontWeight: "900"
  },
  profileDashboardStatLabel: {
    fontSize: 11,
    fontWeight: "800"
  },
  profileDashboardStatDivider: {
    alignSelf: "stretch",
    marginHorizontal: 7,
    width: 1
  },
  profileDashboardAvatarActions: {
    flexDirection: "row",
    gap: 10,
    width: "100%"
  },
  profileDashboardAvatarActionsStacked: {
    flexDirection: "column"
  },
  profileDashboardAvatarButton: {
    flex: 1,
    minHeight: 40,
    minWidth: 0,
    paddingHorizontal: 8
  },
  profileDashboardAvatarButtonText: {
    fontSize: 12
  },
  profileDashboardMessage: {
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center"
  },
  profileAchievementCard: {
    alignItems: "stretch",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    padding: 14
  },
  profileAchievementIcon: {
    alignItems: "center",
    alignSelf: "stretch",
    borderRadius: 10,
    justifyContent: "center",
    minHeight: 132,
    width: 96
  },
  profileAchievementCopy: {
    flex: 1,
    gap: 9,
    minWidth: 0
  },
  profileAchievementTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between"
  },
  profileAchievementCount: {
    fontSize: 18,
    fontWeight: "900"
  },
  profileAchievementCta: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    gap: 6,
    justifyContent: "space-between",
    marginTop: 2,
    minHeight: 42,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  profileAchievementCtaText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "900"
  },
  profileAchievementLinkRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4
  },
  profileQuickActionsSection: {
    gap: 10
  },
  profileSectionHeading: {
    fontSize: 20,
    fontWeight: "900"
  },
  profileQuickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12
  },
  profileQuickActionCard: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 82,
    padding: 14,
    width: "100%"
  },
  profileQuickActionIcon: {
    alignItems: "center",
    borderRadius: 8,
    flexShrink: 0,
    height: 52,
    justifyContent: "center",
    width: 52
  },
  profileQuickActionCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0
  },
  profileQuickActionLabel: {
    fontSize: 16,
    fontWeight: "900"
  },
  profileQuickActionDescription: {
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16
  },
  achievementSummaryCard: {
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14
  },
  achievementList: {
    gap: 10
  },
  achievementCard: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    padding: 12
  },
  achievementIcon: {
    alignItems: "center",
    borderRadius: 10,
    height: 82,
    justifyContent: "center",
    overflow: "hidden",
    width: 82
  },
  achievementImage: {
    height: 82,
    width: 82
  },
  achievementImageSlot: {
    alignItems: "center",
    height: 82,
    justifyContent: "center",
    width: 82
  },
  achievementPreviewBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    flex: 1,
    justifyContent: "center",
    padding: 20
  },
  achievementPreviewImage: {
    alignSelf: "center",
    aspectRatio: 1,
    maxHeight: 560,
    width: "100%"
  },
  achievementCopy: {
    flex: 1,
    gap: 8,
    minWidth: 0
  },
  achievementTitleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between"
  },
  achievementStatus: {
    flexShrink: 0,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  achievementCount: {
    fontSize: 17,
    fontWeight: "900"
  },
  achievementLink: {
    fontSize: 13,
    fontWeight: "900"
  },
  achievementProgressTrack: {
    borderRadius: 8,
    height: 8,
    overflow: "hidden"
  },
  achievementProgressFill: {
    borderRadius: 8,
    height: "100%"
  },
  achievementProgressRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between"
  },
  achievementToast: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    elevation: 4,
    flexDirection: "row",
    gap: 10,
    left: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    position: "absolute",
    right: 18,
    top: 94,
    zIndex: 20
  },
  achievementToastIcon: {
    alignItems: "center",
    borderRadius: 8,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  achievementToastCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  achievementToastTitle: {
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  achievementToastText: {
    fontSize: 14,
    fontWeight: "800"
  },
  stepCard: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14
  },
  stageNameRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  stageNameInput: {
    flex: 1,
    minWidth: 0
  },
  stageConfigToggle: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    height: 46,
    justifyContent: "center",
    width: 46
  },
  seriesBlock: {
    borderTopWidth: 1,
    gap: 12,
    marginTop: 8,
    paddingTop: 14
  },
  seriesHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  seriesTitle: {
    fontSize: 16,
    fontWeight: "800"
  },
  seriesAddButton: {
    minHeight: 38,
    paddingHorizontal: 10
  },
  seriesAddButtonText: {
    fontSize: 13
  },
  seriesList: {
    gap: 10
  },
  seriesContent: {
    gap: 12
  },
  seriesCard: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 12
  },
  emptySeries: {
    borderRadius: 8,
    padding: 12
  },
  emptySeriesText: {
    fontSize: 13,
    fontWeight: "700"
  },
  stepTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  stepTitleButton: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 38,
    minWidth: 0
  },
  stepTitleCopy: {
    flex: 1,
    minWidth: 0
  },
  stepTitle: {
    fontSize: 17,
    fontWeight: "800"
  },
  stepKind: {
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
    textTransform: "uppercase"
  },
  stepActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4
  },
  stepActionButton: {
    alignItems: "center",
    height: 36,
    justifyContent: "center",
    width: 36
  },
  row: {
    flexDirection: "row",
    gap: 12
  },
  flexField: {
    flex: 1,
    gap: 8
  },
  segmented: {
    borderRadius: 8,
    flexDirection: "row",
    padding: 4
  },
  segment: {
    alignItems: "center",
    borderRadius: 6,
    flex: 1,
    paddingVertical: 9
  },
  segmentText: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  buttonGroup: {
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    overflow: "hidden"
  },
  buttonGroupItem: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 6,
    paddingVertical: 8
  },
  buttonGroupItemText: {
    fontSize: 11,
    fontWeight: "800"
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: 8,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 52
  },
  buttonPlusIcon: {
    fontSize: 22,
    lineHeight: 26,
    width: 24
  },
  addWorkoutPlusIcon: {
    fontSize: 22,
    lineHeight: 25,
    width: 24
  },
  plusIcon: {
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 32,
    textAlign: "center",
    width: 30
  },
  stickyActionBar: {
    borderTopWidth: 1,
    left: 0,
    paddingHorizontal: 20,
    paddingVertical: 12,
    position: "absolute",
    right: 0
  },
  stickyActionRow: {
    flexDirection: "row",
    gap: 8
  },
  stickySmallButton: {
    flex: 0.8,
    minHeight: 52,
    paddingHorizontal: 8
  },
  stickySaveButton: {
    flex: 1.6,
    minHeight: 52,
    paddingHorizontal: 8
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800"
  },
  textButton: {
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 4
  },
  textButtonLabel: {
    fontSize: 14,
    fontWeight: "800"
  },
  articleRow: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingBottom: 12
  },
  articleContent: {
    flex: 1,
    gap: 6,
    minWidth: 0
  },
  articleCategory: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  articleTitle: {
    fontSize: 18,
    fontWeight: "800"
  },
  articleMeta: {
    fontSize: 13,
    fontWeight: "700"
  },
  articleDetail: {
    gap: 16
  },
  articleDetailPanel: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 16,
    padding: 16
  },
  articleDetailTitle: {
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 33
  },
  articleLead: {
    borderRadius: 8,
    padding: 14
  },
  articleLeadText: {
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 24
  },
  articleSectionBlock: {
    gap: 12,
    paddingTop: 8
  },
  articleBlockHeading: {
    fontSize: 19,
    fontWeight: "900",
    lineHeight: 25
  },
  articleParagraph: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 24
  },
  articleBulletRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 9
  },
  articleBulletText: {
    flex: 1
  },
  articlePlanList: {
    gap: 10
  },
  articlePlanTitle: {
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 24
  },
  articlePlanCard: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 12
  },
  articlePlanDayBadge: {
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  articlePlanDayBadgeText: {
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  articlePlanItems: {
    gap: 8
  },
  articlePlanItemRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 9
  },
  articlePlanBullet: {
    borderRadius: 3,
    height: 6,
    marginTop: 8,
    width: 6
  },
  articlePlanDescription: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 21
  },
  articleTableValueRow: {
    gap: 2
  },
  articleTableValueLabel: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  infoLinkRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minHeight: 70,
    paddingVertical: 4
  },
  infoLinkIcon: {
    alignItems: "center",
    borderRadius: 8,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  settingsOptionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minHeight: 58
  },
  settingsSelectRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minHeight: 82
  },
  settingsSelectContent: {
    flex: 1,
    gap: 8,
    minWidth: 0
  },
  settingsOptionLabel: {
    flexBasis: "50%",
    flexGrow: 0,
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "800",
    minWidth: 0
  },
  settingsOptionValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    minWidth: 0,
    textAlign: "right"
  },
  settingsHint: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19
  },
  authorSupportCard: {
    borderRadius: 18,
    borderWidth: 1,
    elevation: 2,
    gap: 14,
    marginBottom: 8,
    overflow: "hidden",
    padding: 20,
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 7
  },
  authorSupportDecoration: {
    alignItems: "center",
    flexDirection: "row",
    opacity: 0.07,
    position: "absolute",
    right: 12,
    top: 20
  },
  authorSupportDecorationLeaf: {
    marginLeft: -22,
    marginTop: 42,
    transform: [{ rotate: "-18deg" }]
  },
  authorSupportHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
    paddingRight: 20
  },
  authorSupportIcon: {
    alignItems: "center",
    borderRadius: 16,
    height: 88,
    justifyContent: "center",
    position: "relative",
    width: 88
  },
  authorSupportIconHeart: {
    position: "absolute",
    top: 39
  },
  authorSupportHeading: {
    flex: 1,
    gap: 3,
    minWidth: 0
  },
  authorSupportTitle: {
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 31
  },
  authorSupportDivider: {
    height: 1,
    marginRight: 128
  },
  authorSupportCopy: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 22
  },
  authorSupportButton: {
    alignItems: "center",
    alignSelf: "stretch",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 2,
    minHeight: 52,
    paddingHorizontal: 18,
    position: "relative"
  },
  authorSupportButtonText: {
    fontSize: 16,
    fontWeight: "900"
  },
  authorSupportButtonExternalIcon: {
    position: "absolute",
    right: 18
  },
  reminderWeeklyBlock: {
    gap: 12,
    paddingVertical: 10
  },
  reminderWeeklyRows: {
    gap: 8
  },
  reminderWeeklyRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  reminderWeeklyDayBadge: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexShrink: 0,
    height: 54,
    justifyContent: "center",
    width: 72
  },
  reminderWeeklyDayText: {
    fontSize: 15,
    fontWeight: "900"
  },
  reminderWeeklyDetail: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 54,
    paddingHorizontal: 12
  },
  reminderWeeklyStatusDot: {
    borderRadius: 5,
    flexShrink: 0,
    height: 10,
    width: 10
  },
  reminderWeeklyStatus: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    minWidth: 0
  },
  reminderWeeklyTime: {
    fontSize: 15,
    fontWeight: "900",
    minWidth: 50,
    textAlign: "right"
  },
  reminderDayEditorToggle: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 54,
    paddingHorizontal: 12
  },
  reminderMessageBlock: {
    gap: 10,
    paddingVertical: 8
  },
  reminderFieldLabel: {
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 20
  },
  reminderDescriptionTextarea: {
    minHeight: 58
  },
  reminderDescriptionInput: {
    minHeight: 58,
    paddingBottom: 10
  },
  panelHeroHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minWidth: 0
  },
  legalPanel: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 18
  },
  termsScreen: {
    gap: 14
  },
  termsHeroCard: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden"
  },
  termsHeroTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    padding: 16
  },
  termsHeroIcon: {
    alignItems: "center",
    borderRadius: 8,
    height: 78,
    justifyContent: "center",
    width: 78
  },
  termsHeroCopy: {
    flex: 1,
    gap: 6,
    minWidth: 0
  },
  termsHeroTitle: {
    fontSize: 21,
    fontWeight: "900",
    lineHeight: 27
  },
  termsHeroDescription: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22
  },
  termsBenefits: {
    borderTopWidth: 1,
    flexDirection: "row",
    padding: 10
  },
  termsBenefit: {
    alignItems: "center",
    flex: 1,
    gap: 7,
    paddingHorizontal: 5
  },
  termsBenefitIcon: {
    alignItems: "center",
    borderRadius: 999,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  termsBenefitText: {
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 17,
    textAlign: "center"
  },
  termsSectionTitle: {
    fontSize: 21,
    fontWeight: "900"
  },
  termsSummaryCard: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden"
  },
  termsSummaryRow: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 13
  },
  termsSummaryRowLast: {
    borderBottomWidth: 0
  },
  termsSummaryIcon: {
    alignItems: "center",
    borderRadius: 8,
    height: 48,
    justifyContent: "center",
    width: 48
  },
  termsSummaryCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0
  },
  termsSummaryTitle: {
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 20
  },
  termsSummaryText: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20
  },
  termsBugCallout: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 12
  },
  termsBugCalloutHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10
  },
  termsBugCalloutText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    minWidth: 0
  },
  termsInfoButton: {
    alignItems: "center",
    alignSelf: "flex-end",
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: 12
  },
  termsInfoButtonText: {
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center"
  },
  termsDetailedHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  termsExpandAllButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    minHeight: 34
  },
  termsExpandAllText: {
    fontSize: 14,
    fontWeight: "900"
  },
  termsAccordion: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden"
  },
  termsAccordionItem: {
    borderBottomWidth: 1
  },
  termsAccordionItemLast: {
    borderBottomWidth: 0
  },
  termsAccordionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    minHeight: 60,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  termsAccordionIcon: {
    alignItems: "center",
    borderRadius: 8,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  termsAccordionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 20,
    minWidth: 0
  },
  termsAccordionText: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 21,
    paddingBottom: 16,
    paddingHorizontal: 14
  },
  weeklyPlanHomeCard: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden"
  },
  weeklyPlanHomeTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    padding: 14
  },
  weeklyPlanCardIcon: {
    alignItems: "center",
    borderRadius: 8,
    height: 48,
    justifyContent: "center",
    width: 48
  },
  weeklyPlanHomeCopy: {
    flex: 1,
    minWidth: 0
  },
  weeklyPlanHomeTitle: {
    fontSize: 17,
    fontWeight: "900"
  },
  weeklyPlanHomeMeta: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 3
  },
  weeklyPlanProgressCopy: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7
  },
  weeklyPlanProgressText: {
    fontSize: 17,
    fontWeight: "900"
  },
  weeklyPlanProgressRing: {
    borderRadius: 999,
    borderWidth: 5,
    height: 35,
    overflow: "hidden",
    width: 35
  },
  weeklyPlanProgressRingFill: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0
  },
  weeklyPlanHomeStats: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  weeklyMuscleVolumeSection: {
    borderTopWidth: 1
  },
  weeklyMuscleVolumeHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    minHeight: 54,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  weeklyMuscleVolumeIcon: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  weeklyMuscleVolumeTitle: {
    flex: 1,
    fontFamily: "Inter_700Bold",
    fontSize: 16
  },
  weeklyMuscleVolumeContent: {
    gap: 9,
    paddingTop: 2
  },
  weeklyMuscleVolumeControls: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14
  },
  weeklyMuscleVolumeControlsStacked: {
    flexDirection: "column"
  },
  weeklyMuscleVolumeSegments: {
    borderRadius: 12,
    flex: 1,
    flexDirection: "row",
    minWidth: 0,
    padding: 2
  },
  weeklyMuscleVolumeSegment: {
    alignItems: "center",
    borderRadius: 10,
    flex: 1,
    justifyContent: "center",
    minHeight: 38,
    minWidth: 0,
    paddingHorizontal: 4
  },
  weeklyMuscleVolumeSegmentText: {
    fontFamily: "Inter_700Bold",
    fontSize: 13
  },
  weeklyMuscleVolumePlanHint: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    lineHeight: 16,
    marginHorizontal: 16,
    marginTop: -3,
    textAlign: "center"
  },
  weeklyMuscleVolumeDashboard: {
    alignItems: "stretch",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 10
  },
  weeklyMuscleVolumeRows: {
    flex: 1,
    minWidth: 0
  },
  weeklyMuscleVolumeRow: {
    borderBottomWidth: 1,
    gap: 5,
    minHeight: 62,
    paddingBottom: 7,
    paddingTop: 6
  },
  weeklyMuscleVolumeRowDisabled: {
    opacity: 0.62
  },
  weeklyMuscleVolumeRowTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    justifyContent: "space-between"
  },
  weeklyMuscleVolumeRowTopStacked: {
    alignItems: "flex-start",
    flexDirection: "column",
    gap: 2
  },
  weeklyMuscleVolumeNameWrap: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 1,
    gap: 6
  },
  weeklyMuscleVolumeDot: {
    borderRadius: 4,
    height: 8,
    width: 8
  },
  weeklyMuscleVolumeName: {
    flexShrink: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    lineHeight: 14
  },
  weeklyMuscleVolumeValue: {
    flexShrink: 0,
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    textAlign: "right"
  },
  weeklyMuscleVolumeTrack: {
    borderRadius: 4,
    height: 6,
    overflow: "hidden",
    position: "relative"
  },
  weeklyMuscleVolumeFill: {
    borderRadius: 4,
    bottom: 0,
    left: 0,
    position: "absolute",
    top: 0
  },
  weeklyMuscleVolumeBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 7,
    justifyContent: "center",
    minHeight: 20,
    paddingHorizontal: 6,
    width: 78
  },
  weeklyMuscleVolumeBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    textAlign: "center"
  },
  weeklyMuscleVolumeFigureWrap: {
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    minWidth: 0,
    overflow: "hidden",
    paddingHorizontal: 2,
    paddingVertical: 2
  },
  weeklyMuscleVolumeEmpty: {
    alignItems: "stretch",
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  weeklyMuscleVolumeEmptyCopyWrap: {
    flex: 1,
    gap: 6,
    justifyContent: "center",
    minWidth: 0
  },
  weeklyMuscleVolumeEmptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    textAlign: "left"
  },
  weeklyMuscleVolumeEmptyCopy: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "left"
  },
  weeklyMuscleVolumeInfoButton: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    gap: 5,
    minHeight: 34,
    paddingHorizontal: 12
  },
  weeklyMuscleVolumeInfoButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11
  },
  weeklyMuscleVolumeInfo: {
    borderTopWidth: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    lineHeight: 17,
    marginHorizontal: 16,
    paddingTop: 10
  },
  weeklyMuscleVolumeCollapse: {
    alignItems: "center",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    minHeight: 46
  },
  weeklyMuscleVolumeCollapseText: {
    fontFamily: "Inter_700Bold",
    fontSize: 12
  },
  weeklyPlanToday: {
    minWidth: 0,
    width: "100%"
  },
  weeklyPlanTodayLabel: {
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 20
  },
  weeklyPlanTodayName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 19,
    minWidth: 0
  },
  weeklyPlanTodayLink: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2,
    marginTop: 3,
    minWidth: 0
  },
  weeklyPlanEmptyCard: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 12
  },
  weeklyPlanEmptyCopy: {
    flex: 1,
    minWidth: 0
  },
  weeklyPlanEmptyTitle: {
    fontSize: 15,
    fontWeight: "900"
  },
  weeklyPlanEmptyText: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    marginTop: 3
  },
  weeklyPlanSetupButton: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 9
  },
  weeklyPlanSetupButtonText: {
    fontSize: 12,
    fontWeight: "900"
  },
  weeklyPlanScreen: {
    gap: 14
  },
  weeklyPlanDetailHeader: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14
  },
  weeklyPlanListCard: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden"
  },
  weeklyPlanItem: {
    borderBottomWidth: 1,
    gap: 9,
    padding: 12
  },
  weeklyPlanItemLast: {
    borderBottomWidth: 0
  },
  weeklyPlanItemHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  weeklyPlanStatusIcon: {
    alignItems: "center",
    borderRadius: 999,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  weeklyPlanChooseDayLabel: {
    fontSize: 12,
    fontWeight: "700"
  },
  weeklyPlanDayChips: {
    flexDirection: "row",
    gap: 5
  },
  weeklyPlanDayChip: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 35
  },
  weeklyPlanDayChipText: {
    fontSize: 11,
    fontWeight: "900"
  },
  weeklyPlanNoItems: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 16
  },
  weeklyPlanAddCard: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 12
  },
  weeklyPlanAddRow: {
    alignItems: "center",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingTop: 10
  },
  weeklyPlanAddName: {
    flex: 1
  },
  weeklyPlanAddButton: {
    alignItems: "center",
    borderRadius: 8,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  creatorPanel: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 18,
    padding: 18
  },
  creatorForm: {
    gap: 16
  },
  creatorDescription: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20
  },
  creatorSection: {
    borderTopWidth: 1,
    gap: 14,
    paddingTop: 16
  },
  creatorSectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    minHeight: 42
  },
  creatorSectionTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "900",
    minWidth: 0
  },
  creatorSectionFields: {
    gap: 14
  },
  creatorProfilesBlock: {
    gap: 10
  },
  creatorProfileGrid: {
    gap: 10
  },
  creatorProfileCard: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 68,
    padding: 12
  },
  creatorPromptTitle: {
    fontSize: 18,
    fontWeight: "900"
  },
  creatorPromptActions: {
    gap: 16,
    paddingBottom: 10,
    paddingTop: 10
  },
  creatorChoiceList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  creatorChoiceChip: {
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 38,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  creatorChoiceText: {
    fontSize: 13,
    fontWeight: "800"
  },
  creatorConsentRow: {
    alignItems: "flex-start",
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14
  },
  creatorConsentCheckbox: {
    alignItems: "center",
    borderRadius: 5,
    borderWidth: 1,
    height: 24,
    justifyContent: "center",
    width: 24
  },
  creatorConsentCopy: {
    flex: 1,
    gap: 6
  },
  creatorConsentText: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19
  },
  creatorConsentLink: {
    fontSize: 13,
    fontWeight: "900"
  },
  creatorTextarea: {
    height: 132,
    minHeight: 132
  },
  creatorWaitingActions: {
    gap: 14
  },
  creatorPlanBox: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 14
  },
  creatorPlanText: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 21
  },
  legalIcon: {
    alignItems: "center",
    borderRadius: 8,
    height: 48,
    justifyContent: "center",
    width: 48
  },
  legalTitle: {
    flexShrink: 1,
    fontSize: 24,
    fontWeight: "800"
  },
  legalContent: {
    gap: 12
  },
  legalSection: {
    gap: 6
  },
  legalSectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 22
  },
  legalText: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22
  },
  legalDivider: {
    height: 1,
    marginVertical: 4,
    opacity: 0.12
  },
  faqItem: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    overflow: "hidden"
  },
  faqHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    minHeight: 58,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  faqIcon: {
    alignItems: "center",
    borderRadius: 999,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  faqQuestion: {
    flex: 1,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 20
  },
  faqAnswer: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 21,
    paddingBottom: 14,
    paddingHorizontal: 14
  },
  contactBox: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    padding: 16
  },
  contactLabel: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  contactValue: {
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 8
  },
  contactIntroBlock: {
    gap: 4,
    paddingHorizontal: 2,
    paddingTop: 2
  },
  contactIntroTitle: {
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 27
  },
  contactIntroCopy: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 23
  },
  contactInfoPill: {
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 60,
    padding: 10
  },
  contactCalloutIcon: {
    alignItems: "center",
    borderRadius: 8,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  contactInfoPillText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20
  },
  contactBugCallout: {
    alignItems: "flex-start",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 12
  },
  contactBugCalloutCopy: {
    flex: 1,
    gap: 7,
    minWidth: 0
  },
  contactBugCalloutText: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20
  },
  contactBugAction: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 4,
    minHeight: 28
  },
  contactBugActionText: {
    fontSize: 14,
    fontWeight: "900"
  },
  contactFaqTitle: {
    fontSize: 22,
    fontWeight: "900",
    marginTop: 6
  },
  bugReportForm: {
    gap: 18
  },
  bugReportTextarea: {
    height: 132,
    minHeight: 132
  },
  bugSuccessBox: {
    alignItems: "flex-start",
    borderRadius: 8,
    gap: 14,
    padding: 16
  },
  bugSuccessHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12
  },
  bugSuccessIcon: {
    alignItems: "center",
    borderRadius: 8,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  bugSuccessText: {
    flex: 1,
    flexShrink: 1,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 23
  },
  bugSuccessIdBox: {
    alignSelf: "stretch",
    borderRadius: 8,
    gap: 5,
    padding: 12
  },
  bugSuccessIdText: {
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18
  },
  errorScreen: {
    flex: 1,
    justifyContent: "center",
    padding: 20
  },
  errorPanel: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    padding: 18
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "800"
  },
  errorCopy: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22
  },
  inlineError: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 8
  },
  errorDetails: {
    borderRadius: 8,
    padding: 12
  },
  errorDetailsText: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18
  },
  errorActions: {
    flexDirection: "row",
    gap: 10
  },
  errorActionButton: {
    flex: 1
  },
  bottomNav: {
    borderTopWidth: 1,
    bottom: 0,
    flexDirection: "row",
    left: 0,
    paddingHorizontal: 10,
    paddingTop: 7,
    position: "absolute",
    right: 0
  },
  bottomSheetRoot: {
    flex: 1,
    justifyContent: "flex-end"
  },
  bottomSheetBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.52)"
  },
  bottomSheetPanel: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 24
  },
  bottomSheetTitle: {
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 30
  },
  bottomSheetOptionGroup: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden"
  },
  bottomSheetOptionRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 56,
    paddingHorizontal: 16
  },
  bottomSheetOptionText: {
    fontSize: 16,
    fontWeight: "800"
  },
  timePickerRow: {
    flexDirection: "row",
    gap: 12
  },
  timePickerColumn: {
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    overflow: "hidden"
  },
  timePickerScroll: {
    maxHeight: 240
  },
  timePickerOption: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44
  },
  bottomSheetButton: {
    minHeight: 56
  },
  navButton: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 5,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 2
  },
  navLabel: {
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "800"
  }
});
