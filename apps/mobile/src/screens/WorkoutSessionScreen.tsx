import { Ionicons } from "@expo/vector-icons";
import type { Dispatch, SetStateAction } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { AppButton } from "../components/AppControls";
import { CollapsiblePanel } from "../components/CollapsiblePanel";
import { ExerciseSummaryRow, WorkoutMuscleOverviewContent } from "../components/WorkoutPresentation";
import { parseTimerSecondsValue, RestTimerControl, SessionValueInput } from "../components/WorkoutSessionControls";
import { getExerciseDisplayName } from "../domain/exercises";
import {
  calculateEntryVolume,
  type WorkoutSession,
  type WorkoutSessionEntry
} from "../domain/workoutSessions";
import {
  getPreviousExerciseValues,
  getSessionEntryPreviewStep,
  getSessionEntrySetTarget,
  groupInlineWorkoutEntries
} from "../domain/workoutSessionPresentation";
import {
  getSupersetRoundRows,
  getWorkoutSessionExerciseGroups,
  getWorkoutSessionGuidedStepIndex,
  getWorkoutSessionGuidedSteps,
  type WorkoutSessionExerciseGroup,
  type WorkoutSessionSupersetSide,
  type WorkoutSessionSupersetValueField
} from "../domain/workoutSessionSupersets";
import { formatRestDuration, formatWorkoutProgressPercent, getWorkoutProgress } from "../domain/workoutSessionUi";
import { groupWorkoutBuilderSteps } from "../domain/workoutEditor";
import { formatExerciseSetTarget, isRestTargetStep } from "../domain/workoutExerciseSummary";
import { type WorkoutDraft, type WorkoutStep } from "../domain/workouts";
import type { LanguageCode, TranslationKey } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

type WorkoutSessionScreenProps = {
  activeWorkoutSession: WorkoutSession | null;
  activeWorkoutSessionId: string | null;
  formatNumber: (value: number | null | undefined, suffix?: string) => string;
  formatSessionEntryTitle: (entry: WorkoutSessionEntry) => string;
  getSessionEntryIterationLabel: (entry: WorkoutSessionEntry) => string;
  insets: { left: number; right: number };
  isLandscape: boolean;
  isPostWorkoutFillMode: boolean;
  isReadOnlyWorkoutPanelCollapsed: (panelId: string) => boolean;
  isWorkoutSessionEntryFillRequired: (entry: WorkoutSessionEntry) => boolean;
  language: LanguageCode;
  openExerciseDetail: (step: WorkoutStep) => void;
  requestCreateWorkoutSessionSuperset: (currentEntryId: string) => void;
  requestFinishActiveWorkoutSession: () => void;
  requestRemoveWorkoutSessionSuperset: (supersetId: string) => void;
  sessionEntryIndex: number;
  setIsPostWorkoutFillMode: (value: boolean) => void;
  setSelectedExerciseMuscleStep: (step: WorkoutStep | null) => void;
  setSessionEntryIndex: (value: number) => void;
  setWorkoutSessions: Dispatch<SetStateAction<WorkoutSession[]>>;
  showRestTimer: boolean;
  t: (key: TranslationKey) => string;
  theme: Theme;
  toggleReadOnlyWorkoutPanel: (panelId: string) => void;
  toggleWorkoutSessionSupersetRound: (supersetId: string, roundIndex: number) => void;
  updateWorkoutSessionEntry: (entryId: string, patch: Partial<WorkoutSessionEntry>) => void;
  updateWorkoutSessionSupersetRound: (
    supersetId: string,
    roundIndex: number,
    exerciseSide: WorkoutSessionSupersetSide,
    field: WorkoutSessionSupersetValueField,
    value: string
  ) => void;
  visibleWorkoutSessions: WorkoutSession[];
  windowSize: { width: number };
  abandonActiveWorkoutSession: () => void;
};

export function WorkoutSessionScreen({
  abandonActiveWorkoutSession,
  activeWorkoutSession,
  activeWorkoutSessionId,
  formatNumber,
  formatSessionEntryTitle,
  getSessionEntryIterationLabel,
  insets,
  isLandscape,
  isPostWorkoutFillMode,
  isReadOnlyWorkoutPanelCollapsed,
  isWorkoutSessionEntryFillRequired,
  language,
  openExerciseDetail,
  requestCreateWorkoutSessionSuperset,
  requestFinishActiveWorkoutSession,
  requestRemoveWorkoutSessionSuperset,
  sessionEntryIndex,
  setIsPostWorkoutFillMode,
  setSelectedExerciseMuscleStep,
  setSessionEntryIndex,
  setWorkoutSessions,
  showRestTimer,
  t,
  theme,
  toggleReadOnlyWorkoutPanel,
  toggleWorkoutSessionSupersetRound,
  updateWorkoutSessionEntry,
  updateWorkoutSessionSupersetRound,
  visibleWorkoutSessions,
  windowSize
}: WorkoutSessionScreenProps) {
  function toggleWorkoutSessionEntryCompleted(entry: WorkoutSessionEntry) {
    if (entry.isCompleted) {
      updateWorkoutSessionEntry(entry.id, {
        actualDuration: undefined,
        actualReps: undefined,
        actualTarget: undefined,
        actualWeight: undefined,
        completedAt: undefined,
        isCompleted: false,
        notes: undefined
      });
      return;
    }

    updateWorkoutSessionEntry(entry.id, {
      completedAt: new Date().toISOString(),
      isCompleted: true
    });
  }

  function updateWorkoutSessionEntryTableValue(entry: WorkoutSessionEntry, patch: Pick<Partial<WorkoutSessionEntry>, "actualReps" | "actualWeight">) {
    const actualReps = patch.actualReps ?? entry.actualReps ?? "";
    const actualWeight = patch.actualWeight ?? entry.actualWeight ?? "";
    const hasAnyValue = Boolean(actualReps.trim() || actualWeight.trim());

    updateWorkoutSessionEntry(entry.id, {
      ...patch,
      completedAt: hasAnyValue ? entry.completedAt ?? new Date().toISOString() : undefined,
      isCompleted: hasAnyValue
    });
  }

  function applyPreviousExerciseValue(
    entries: WorkoutSessionEntry[],
    field: "actualReps" | "actualWeight",
    value: string
  ) {
    if (!activeWorkoutSessionId || !value.trim()) {
      return;
    }

    const entryIds = new Set(entries.map((entry) => entry.id));
    const updatedAt = new Date().toISOString();

    setWorkoutSessions((current) =>
      current.map((session) => {
        if (session.id !== activeWorkoutSessionId) {
          return session;
        }

        let hasChanged = false;
        const nextEntries = session.entries.map((entry) => {
          if (!entryIds.has(entry.id) || entry[field]?.trim()) {
            return entry;
          }

          hasChanged = true;
          const nextEntry = { ...entry, [field]: value } as WorkoutSessionEntry;
          const hasAnyValue = Boolean(nextEntry.actualReps?.trim() || nextEntry.actualWeight?.trim());

          return {
            ...nextEntry,
            completedAt: hasAnyValue ? nextEntry.completedAt ?? updatedAt : undefined,
            isCompleted: hasAnyValue
          };
        });

        return hasChanged
          ? {
              ...session,
              entries: nextEntries,
              updatedAt
            }
          : session;
      })
    );
  }

  function renderPreviousExerciseValueButtons(entries: WorkoutSessionEntry[], compact = false) {
    const previousValues = getPreviousExerciseValues(entries, visibleWorkoutSessions);

    if (!previousValues.reps && !previousValues.weight) {
      return null;
    }

    return (
      <View style={[styles.sessionQuickFillRow, compact ? styles.sessionQuickFillRowCompact : null]}>
        <View style={styles.sessionQuickFillSlot}>
          {previousValues.weight ? (
            <Pressable
              accessibilityRole="button"
              style={[styles.sessionQuickFillButton, { backgroundColor: theme.control, borderColor: theme.border }]}
              onPress={() => applyPreviousExerciseValue(entries, "actualWeight", previousValues.weight)}
            >
              <Text style={[styles.sessionQuickFillButtonText, { color: theme.primary }]}>
                {t("previousWeight")}: {previousValues.weight} kg
              </Text>
            </Pressable>
          ) : null}
        </View>
        <View style={styles.sessionQuickFillSlot}>
          {previousValues.reps ? (
            <Pressable
              accessibilityRole="button"
              style={[styles.sessionQuickFillButton, { backgroundColor: theme.control, borderColor: theme.border }]}
              onPress={() => applyPreviousExerciseValue(entries, "actualReps", previousValues.reps)}
            >
              <Text style={[styles.sessionQuickFillButtonText, { color: theme.primary }]}>
                {t("previousReps")}: {previousValues.reps}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  function renderGuidedEntryTable(entries: WorkoutSessionEntry[]) {
    return (
      <View style={[styles.guidedEntryTable, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {renderPreviousExerciseValueButtons(entries)}
        {entries.map((entry) => (
          <View key={entry.id} style={styles.guidedEntryRow}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: entry.isCompleted }}
              style={styles.guidedEntryDone}
              onPress={() => toggleWorkoutSessionEntryCompleted(entry)}
            >
              <View
                style={[
                  styles.sessionCheckbox,
                  {
                    backgroundColor: entry.isCompleted ? theme.primary : theme.control,
                    borderColor: entry.isCompleted ? theme.primary : theme.border
                  }
                ]}
              >
                {entry.isCompleted ? <Ionicons name="checkmark" size={16} color={theme.white} /> : null}
              </View>
            </Pressable>
            {entry.isCompleted ? (
              <View style={styles.guidedEntryFields}>
                <View style={styles.guidedEntryInput}>
                  <SessionValueInput
                    keyboardType="decimal-pad"
                    placeholder={t("actualWeight")}
                    suffix="kg"
                    theme={theme}
                    value={entry.actualWeight ?? ""}
                    onChangeText={(actualWeight) => updateWorkoutSessionEntry(entry.id, { actualWeight })}
                  />
                </View>
                <View style={styles.guidedEntryInput}>
                  <SessionValueInput
                    keyboardType="number-pad"
                    placeholder={t("actualReps")}
                    theme={theme}
                    value={entry.actualReps ?? ""}
                    onChangeText={(actualReps) => updateWorkoutSessionEntry(entry.id, { actualReps })}
                  />
                </View>
              </View>
            ) : null}
          </View>
        ))}
      </View>
    );
  }

  function renderInlineWorkoutTable(session: WorkoutSession) {
    const groupedSessionEntries = groupInlineWorkoutEntries(
      session,
      isWorkoutSessionEntryFillRequired,
      language,
      formatSessionEntryTitle
    );

    if (!groupedSessionEntries.length) {
      return (
        <View style={[styles.emptyBuilder, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.emptyBuilderTitle, { color: theme.text }]}>{t("noData")}</Text>
        </View>
      );
    }

    const responsiveTableMinWidth = isLandscape
      ? Math.max(windowSize.width - insets.left - insets.right - 44, 688)
      : undefined;

    return (
      <View style={styles.inlineWorkoutTableFrame}>
        <ScrollView
          horizontal
          keyboardShouldPersistTaps="handled"
          showsHorizontalScrollIndicator
          style={styles.workoutSessionDetailTableScroll}
          contentContainerStyle={styles.workoutSessionDetailTableScrollContent}
        >
        <View
          style={[
            styles.workoutSessionDetailTable,
            styles.inlineWorkoutTable,
            responsiveTableMinWidth ? { minWidth: responsiveTableMinWidth } : null,
            { borderColor: theme.border }
          ]}
        >
          <View
            style={[
              styles.workoutSessionDetailTableHeader,
              { backgroundColor: theme.secondaryBand, borderBottomColor: theme.border }
            ]}
          >
            <View
              style={[
                styles.workoutSessionDetailHeaderCell,
                styles.inlineWorkoutExerciseCell,
                isLandscape ? styles.inlineWorkoutExerciseCellHorizontal : null,
                { borderRightColor: theme.border }
              ]}
            >
              <Text style={[styles.workoutSessionDetailHeaderText, { color: theme.primary }]}>{t("exercise")}</Text>
            </View>
            <View
              style={[
                styles.workoutSessionDetailHeaderCell,
                styles.workoutSessionDetailSetCell,
                { borderRightColor: theme.border }
              ]}
            >
              <Text style={[styles.workoutSessionDetailHeaderText, { color: theme.primary }]}>{t("set")}</Text>
            </View>
            <View style={[styles.workoutSessionDetailRepsHeader, styles.inlineWorkoutRepsHeader, { borderRightColor: theme.border }]}>
              <Text style={[styles.workoutSessionDetailHeaderText, { color: theme.primary }]}>{t("actualReps")}</Text>
              <View style={[styles.workoutSessionDetailRepsSubHeader, { borderTopColor: theme.border }]}>
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.88}
                  numberOfLines={1}
                  style={[
                    styles.workoutSessionDetailHeaderText,
                    styles.workoutSessionDetailRepsCell,
                    styles.inlineWorkoutRepsCell,
                    { color: theme.primary, borderRightColor: theme.border }
                  ]}
                >
                  {t("repsDone")}
                </Text>
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.88}
                  numberOfLines={1}
                  style={[
                    styles.workoutSessionDetailHeaderText,
                    styles.workoutSessionDetailRepsCell,
                    styles.inlineWorkoutRepsCell,
                    { color: theme.primary, borderRightWidth: 0 }
                  ]}
                >
                  {t("repsPlanned")}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.workoutSessionDetailHeaderCell,
                styles.inlineWorkoutWeightCell,
                { borderRightColor: theme.border }
              ]}
            >
              <Text style={[styles.workoutSessionDetailHeaderText, { color: theme.primary }]}>{t("weight")}</Text>
            </View>
            <View style={[styles.workoutSessionDetailHeaderCell, styles.workoutSessionDetailVolumeCell, styles.inlineWorkoutLastHeaderCell]}>
              <Text style={[styles.workoutSessionDetailHeaderText, { color: theme.primary }]}>{t("volume")}</Text>
            </View>
          </View>
          {groupedSessionEntries.map((group, groupIndex) => (
            <View
              key={group.key}
              style={[
                styles.workoutSessionDetailExerciseGroup,
                { borderBottomColor: theme.border },
                groupIndex === groupedSessionEntries.length - 1 ? styles.workoutSessionDetailExerciseGroupLast : null
              ]}
            >
              <View
                style={[
                  styles.inlineWorkoutExerciseCell,
                  isLandscape ? styles.inlineWorkoutExerciseCellHorizontal : null,
                  { borderRightColor: theme.border }
                ]}
              >
                <Pressable
                  accessibilityRole="button"
                  style={styles.inlineWorkoutExerciseCopy}
                  onPress={() => openExerciseDetail(group.previewStep)}
                >
                  <View style={styles.inlineWorkoutExerciseTitleRow}>
                    <Text style={[styles.workoutDetailTableExerciseName, styles.inlineWorkoutExerciseName, { color: theme.text }]} numberOfLines={3}>
                      {group.title}
                    </Text>
                    <Pressable
                      accessibilityLabel={t("showDetails")}
                      accessibilityRole="button"
                      hitSlop={8}
                      style={[styles.exerciseMuscleButton, { backgroundColor: theme.control, borderColor: theme.border }]}
                      onPress={(event) => {
                        event.stopPropagation();
                        setSelectedExerciseMuscleStep(group.previewStep);
                      }}
                    >
                      <Ionicons name="body-outline" size={20} color={theme.primary} />
                    </Pressable>
                  </View>
                  {group.previewStep.notes ? (
                    <Text style={[styles.workoutDetailNotes, styles.inlineWorkoutExerciseNotes, { color: theme.muted }]} numberOfLines={4}>
                      {group.previewStep.notes}
                    </Text>
                  ) : null}
                </Pressable>
                {renderPreviousExerciseValueButtons(group.entries, true)}
              </View>
              <View style={styles.workoutSessionDetailSetsCell}>
                {group.entries.map((entry, entryIndex) => {
                  const volume = calculateEntryVolume(entry);
                  const plannedReps = entry.plannedTargetType === "repetitions" ? entry.plannedTarget : "";

                  return (
                    <View
                      key={entry.id}
                      style={[
                        styles.workoutSessionDetailSetRow,
                        styles.inlineWorkoutSetRow,
                        { borderBottomColor: theme.border },
                        entryIndex === group.entries.length - 1 ? styles.workoutSessionDetailSetRowLast : null
                      ]}
                    >
                      <Text
                        style={[
                          styles.workoutDetailTableValue,
                          styles.workoutSessionDetailSetCell,
                          { color: theme.text, borderRightColor: theme.border }
                        ]}
                        numberOfLines={1}
                      >
                        {getSessionEntryIterationLabel(entry)}
                      </Text>
                      <View style={[styles.inlineWorkoutInputCell, styles.workoutSessionDetailRepsCell, styles.inlineWorkoutRepsCell, { borderRightColor: theme.border }]}>
                        <SessionValueInput
                          keyboardType="number-pad"
                          placeholder="-"
                          theme={theme}
                          value={entry.actualReps ?? ""}
                          onChangeText={(actualReps) => updateWorkoutSessionEntryTableValue(entry, { actualReps })}
                        />
                      </View>
                      <Text
                        style={[
                          styles.workoutDetailTableValue,
                          styles.workoutSessionDetailRepsCell,
                          styles.inlineWorkoutRepsCell,
                          { color: theme.text, borderRightColor: theme.border }
                        ]}
                        numberOfLines={1}
                      >
                        {plannedReps?.trim() || "-"}
                      </Text>
                      <View style={[styles.inlineWorkoutInputCell, styles.inlineWorkoutWeightCell, { borderRightColor: theme.border }]}>
                        <SessionValueInput
                          keyboardType="decimal-pad"
                          placeholder="-"
                          suffix="kg"
                          theme={theme}
                          value={entry.actualWeight ?? ""}
                          onChangeText={(actualWeight) => updateWorkoutSessionEntryTableValue(entry, { actualWeight })}
                        />
                      </View>
                      <Text style={[styles.workoutDetailTableValue, styles.workoutSessionDetailVolumeCell, { color: theme.text }]} numberOfLines={1}>
                        {volume ? formatNumber(volume, "kg") : "-"}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
        </ScrollView>
      </View>
    );
  }

  function renderRestTimer(entry?: WorkoutSessionEntry) {
    if (!showRestTimer || !entry?.plannedTarget) {
      return null;
    }

    const plannedSeconds = parseTimerSecondsValue(entry.plannedTarget);
    if (plannedSeconds <= 0) {
      return null;
    }

    return (
      <RestTimerControl
        key={entry.id}
        labels={{
          pause: t("pauseTimer"),
          reset: t("resetTimer"),
          restTimer: t("restTimer"),
          start: t("startTimer")
        }}
        plannedSeconds={plannedSeconds}
        theme={theme}
      />
    );
  }

  function renderWorkoutSessionProgressCard(current: number, total: number, rangeEnd = current) {
    const progress = getWorkoutProgress(current, total);
    const progressLabel = rangeEnd > current ? `${progress.current}–${rangeEnd}` : String(progress.current);

    return (
      <View style={[styles.sessionProgressCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={[styles.sessionProgressIcon, { backgroundColor: theme.secondaryBand }]}>
          <Ionicons name="barbell-outline" size={20} color={theme.primary} />
        </View>
        <Text style={[styles.sessionProgressCardText, { color: theme.text }]} numberOfLines={1}>
          {t("exercisePlural")} {progressLabel}/{progress.total}
        </Text>
        <View style={[styles.sessionProgressTrack, { backgroundColor: theme.secondaryBand }]}>
          <View style={[styles.sessionProgressFill, { backgroundColor: theme.primary, width: `${progress.percent}%` }]} />
        </View>
        <Text style={[styles.sessionProgressPercent, { color: theme.primary }]} numberOfLines={1}>
          {formatWorkoutProgressPercent(progress.current, progress.total)}
        </Text>
      </View>
    );
  }

  function renderGuidedPlanPreview(
    session: WorkoutSession,
    group: { entries: WorkoutSessionEntry[]; restEntry?: WorkoutSessionEntry },
    exerciseNumber: number,
    embedded = false,
    supersetSide?: WorkoutSessionSupersetSide
  ) {
    const entry = group.entries[0];
    const setCount = String(group.entries.length || 1);
    const previewStep = getSessionEntryPreviewStep(session, entry);
    const isUntimedWarmup = entry.type === "warmup" && !entry.plannedTarget?.trim();
    const title = entry.type === "warmup"
      ? entry.sourceStageName?.trim() || t("stageWarmup")
      : getExerciseDisplayName(previewStep.exerciseName, language);
    const plannedTarget = entry.plannedTargetType === "repetitions"
      ? entry.plannedTarget?.trim()
      : entry.plannedTarget?.trim() || getSessionEntrySetTarget(entry);
    const restSeconds = group.restEntry?.plannedTarget ? parseTimerSecondsValue(group.restEntry.plannedTarget) : 0;
    const restText = formatRestDuration(restSeconds);

    const content = (
      <>
        <View style={styles.guidedExerciseHeader}>
          {!embedded ? (
            <View style={[styles.guidedExerciseNumber, { backgroundColor: theme.secondaryBand }]}>
              <Text style={[styles.guidedExerciseNumberText, { color: theme.primary }]}>{exerciseNumber}</Text>
            </View>
          ) : null}
          <Text style={[styles.guidedExerciseTitle, { color: theme.text }]} numberOfLines={3}>
            {supersetSide ? (
              <Text style={[styles.guidedSupersetExercisePrefix, { color: theme.primary }]}>
                {t(supersetSide === "A" ? "supersetExerciseA" : "supersetExerciseB")}:{" "}
              </Text>
            ) : null}
            {title}
          </Text>
          {!isUntimedWarmup ? (
            <Pressable
              accessibilityLabel={t("showDetails")}
              accessibilityRole="button"
              hitSlop={8}
              style={[styles.exerciseMuscleButton, { backgroundColor: theme.control, borderColor: theme.border }]}
              onPress={() => openExerciseDetail(previewStep)}
            >
              <Ionicons name="body-outline" size={20} color={theme.primary} />
            </Pressable>
          ) : null}
        </View>
        {entry.notes || previewStep.notes ? (
          <Text style={[styles.guidedExerciseNotes, { color: theme.muted }]} numberOfLines={5}>
            {entry.notes || previewStep.notes}
          </Text>
        ) : null}
        {!isUntimedWarmup ? (
          <View style={styles.guidedExerciseMetaRow}>
            <View style={styles.guidedRestGroup}>
              <Text style={[styles.guidedRestLabel, { color: theme.text }]}>{t("stageRest")}</Text>
              <View style={[styles.guidedRestPill, { backgroundColor: theme.secondaryBand }]}>
                <Ionicons name="time-outline" size={16} color={theme.text} />
                <Text style={[styles.guidedRestPillText, { color: theme.primary }]}>{restText}</Text>
              </View>
            </View>
            <View style={styles.guidedTargetGroup}>
              <View style={[styles.guidedTargetPill, { backgroundColor: theme.secondaryBand }]}>
                <Text style={[styles.guidedTargetText, { color: theme.primary }]}>{setCount}</Text>
              </View>
              <Text style={[styles.guidedTargetSeparator, { color: theme.text }]}>x</Text>
              <View style={[styles.guidedTargetPill, { backgroundColor: theme.secondaryBand }]}>
                <Text style={[styles.guidedTargetText, { color: theme.primary }]}>{plannedTarget || "-"}</Text>
              </View>
            </View>
          </View>
        ) : null}
        {!embedded ? renderRestTimer(group.restEntry) : null}
      </>
    );

    return embedded ? (
      <View style={styles.guidedSupersetExercise}>{content}</View>
    ) : (
      <View style={[styles.guidedPlanPreview, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {content}
      </View>
    );
  }

  function renderSupersetRestTimer(
    supersetId: string,
    groups: [WorkoutSessionExerciseGroup, WorkoutSessionExerciseGroup]
  ) {
    if (!showRestTimer) {
      return null;
    }

    const plannedSeconds = Math.max(
      ...groups.map((group) => group.restEntry?.plannedTarget
        ? parseTimerSecondsValue(group.restEntry.plannedTarget)
        : 0)
    );
    if (plannedSeconds <= 0) {
      return null;
    }

    return (
      <View style={styles.guidedSupersetRestTimer}>
        <Text style={[styles.guidedSupersetRestLabel, { color: theme.text }]}>
          {t("supersetRestAfter")}: {formatRestDuration(plannedSeconds)}
        </Text>
        <RestTimerControl
          key={`${supersetId}-${plannedSeconds}`}
          labels={{
            pause: t("pauseTimer"),
            reset: t("resetTimer"),
            restTimer: t("supersetRestAfter"),
            start: t("startTimer")
          }}
          plannedSeconds={plannedSeconds}
          theme={theme}
        />
      </View>
    );
  }

  function renderSupersetPrefillButton(
    entries: WorkoutSessionEntry[],
    field: WorkoutSessionSupersetValueField,
    value: string
  ) {
    if (!value) {
      return <View style={styles.guidedSupersetPrefillEmpty} />;
    }

    return (
      <Pressable
        accessibilityRole="button"
        style={[styles.guidedSupersetPrefillButton, { backgroundColor: theme.control, borderColor: theme.border }]}
        onPress={() => applyPreviousExerciseValue(entries, field, value)}
      >
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          numberOfLines={1}
          style={[styles.guidedSupersetPrefillText, { color: theme.primary }]}
        >
          {field === "actualWeight" ? `${t("previousWeight")}: ${value} kg` : `${t("previousReps")}: ${value}`}
        </Text>
      </Pressable>
    );
  }

  function renderSupersetInput(
    entry: WorkoutSessionEntry | null,
    supersetId: string,
    roundIndex: number,
    exerciseSide: WorkoutSessionSupersetSide,
    field: WorkoutSessionSupersetValueField
  ) {
    if (!entry) {
      return (
        <View style={[styles.guidedSupersetInputDisabled, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <Text style={{ color: theme.muted }}>—</Text>
        </View>
      );
    }

    return (
      <SessionValueInput
        keyboardType={field === "actualWeight" ? "decimal-pad" : "number-pad"}
        placeholder="-"
        suffix={field === "actualWeight" ? "kg" : undefined}
        theme={theme}
        value={entry[field] ?? ""}
        onChangeText={(value) =>
          updateWorkoutSessionSupersetRound(supersetId, roundIndex, exerciseSide, field, value)
        }
      />
    );
  }

  function renderSupersetRoundTable(session: WorkoutSession, supersetId: string) {
    const rounds = getSupersetRoundRows(session, supersetId);
    const superset = session.supersets?.find((item) => item.id === supersetId);
    const exerciseGroups = getWorkoutSessionExerciseGroups(session);
    const groupA = exerciseGroups.find((group) => group.entries[0]?.id === superset?.entryIds[0]);
    const groupB = exerciseGroups.find((group) => group.entries[0]?.id === superset?.entryIds[1]);
    const previousA = getPreviousExerciseValues(groupA?.entries ?? [], visibleWorkoutSessions);
    const previousB = getPreviousExerciseValues(groupB?.entries ?? [], visibleWorkoutSessions);
    const hasPrefillValues = Boolean(
      previousA.weight || previousA.reps || previousB.weight || previousB.reps
    );

    return (
      <View style={[styles.guidedSupersetTableCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <ScrollView
          horizontal
          keyboardShouldPersistTaps="handled"
          showsHorizontalScrollIndicator
          contentContainerStyle={styles.guidedSupersetTableScrollContent}
        >
          <View style={styles.guidedSupersetTable}>
            <View style={[styles.guidedSupersetTableRow, styles.guidedSupersetTableHeader]}>
              <View style={styles.guidedSupersetStatusCell} />
              <View style={[styles.guidedSupersetValueCell, styles.guidedSupersetWeightCell]}>
                <Text style={[styles.guidedSupersetHeaderText, { color: theme.primary }]}>{t("supersetAWeight")}</Text>
              </View>
              <View style={[styles.guidedSupersetValueCell, styles.guidedSupersetRepsCell]}>
                <Text style={[styles.guidedSupersetHeaderText, { color: theme.primary }]}>{t("supersetAReps")}</Text>
              </View>
              <View style={[styles.guidedSupersetValueCell, styles.guidedSupersetWeightCell]}>
                <Text style={[styles.guidedSupersetHeaderText, { color: theme.primary }]}>{t("supersetBWeight")}</Text>
              </View>
              <View style={[styles.guidedSupersetValueCell, styles.guidedSupersetRepsCell]}>
                <Text style={[styles.guidedSupersetHeaderText, { color: theme.primary }]}>{t("supersetBReps")}</Text>
              </View>
            </View>
            {hasPrefillValues ? (
              <View style={[styles.guidedSupersetTableRow, styles.guidedSupersetPrefillRow]}>
                <View style={styles.guidedSupersetStatusCell} />
                <View style={[styles.guidedSupersetValueCell, styles.guidedSupersetWeightCell]}>
                  {renderSupersetPrefillButton(groupA?.entries ?? [], "actualWeight", previousA.weight)}
                </View>
                <View style={[styles.guidedSupersetValueCell, styles.guidedSupersetRepsCell]}>
                  {renderSupersetPrefillButton(groupA?.entries ?? [], "actualReps", previousA.reps)}
                </View>
                <View style={[styles.guidedSupersetValueCell, styles.guidedSupersetWeightCell]}>
                  {renderSupersetPrefillButton(groupB?.entries ?? [], "actualWeight", previousB.weight)}
                </View>
                <View style={[styles.guidedSupersetValueCell, styles.guidedSupersetRepsCell]}>
                  {renderSupersetPrefillButton(groupB?.entries ?? [], "actualReps", previousB.reps)}
                </View>
              </View>
            ) : null}
            {rounds.map((round) => (
              <View key={`${supersetId}-${round.number}`} style={styles.guidedSupersetTableRow}>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: round.isCompleted }}
                  style={styles.guidedSupersetStatusCell}
                  onPress={() => toggleWorkoutSessionSupersetRound(supersetId, round.index)}
                >
                  <View
                    style={[
                      styles.sessionCheckbox,
                      {
                        backgroundColor: round.isCompleted ? theme.primary : theme.control,
                        borderColor: round.isCompleted ? theme.primary : theme.border
                      }
                    ]}
                  >
                    {round.isCompleted ? <Ionicons name="checkmark" size={16} color={theme.white} /> : null}
                  </View>
                </Pressable>
                <View style={[styles.guidedSupersetValueCell, styles.guidedSupersetWeightCell]}>
                  {renderSupersetInput(round.entryA, supersetId, round.index, "A", "actualWeight")}
                </View>
                <View style={[styles.guidedSupersetValueCell, styles.guidedSupersetRepsCell]}>
                  {renderSupersetInput(round.entryA, supersetId, round.index, "A", "actualReps")}
                </View>
                <View style={[styles.guidedSupersetValueCell, styles.guidedSupersetWeightCell]}>
                  {renderSupersetInput(round.entryB, supersetId, round.index, "B", "actualWeight")}
                </View>
                <View style={[styles.guidedSupersetValueCell, styles.guidedSupersetRepsCell]}>
                  {renderSupersetInput(round.entryB, supersetId, round.index, "B", "actualReps")}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  function renderGuidedSuperset(
    session: WorkoutSession,
    supersetId: string,
    groups: [WorkoutSessionExerciseGroup, WorkoutSessionExerciseGroup],
    firstExerciseNumber: number
  ) {
    return (
      <>
        <View style={styles.guidedSupersetBadgeRow}>
          <View style={[styles.guidedSupersetBadge, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="link-outline" size={18} color={theme.primary} />
            <Text style={[styles.guidedSupersetBadgeText, { color: theme.primary }]}>{t("supersetA")}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            style={[styles.guidedSupersetSplitButton, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => requestRemoveWorkoutSessionSuperset(supersetId)}
          >
            <Ionicons name="remove-circle-outline" size={18} color={theme.primary} />
            <Text style={[styles.guidedSupersetSplitText, { color: theme.primary }]}>{t("supersetSplitAction")}</Text>
          </Pressable>
        </View>
        <View style={[styles.guidedSupersetCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {renderGuidedPlanPreview(session, groups[0], firstExerciseNumber, true, "A")}
          <View style={styles.guidedSupersetSeparator}>
            <View style={[styles.guidedSupersetSeparatorLine, { backgroundColor: theme.border }]} />
            <Text style={[styles.guidedSupersetSeparatorText, { color: theme.primary }]}>{t("supersetAlternate")}</Text>
            <View style={[styles.guidedSupersetSeparatorLine, { backgroundColor: theme.border }]} />
          </View>
          {renderGuidedPlanPreview(session, groups[1], firstExerciseNumber + 1, true, "B")}
        </View>
        {renderSupersetRoundTable(session, supersetId)}
        {renderSupersetRestTimer(supersetId, groups)}
      </>
    );
  }

  function renderReadOnlyWorkoutPlan(workout: WorkoutDraft, panelPrefix: string) {
    const stageGroups = groupWorkoutBuilderSteps(workout.steps)
      .filter(({ stage }) => stage.stageType !== "warmup");

    return (
      <>
        {workout.notes ? (
          <CollapsiblePanel
            collapseLabel={t("collapse")}
            expandLabel={t("expand")}
            isCollapsed={isReadOnlyWorkoutPanelCollapsed(`${panelPrefix}-notes`)}
            theme={theme}
            title={t("workoutNotes")}
            onToggle={() => toggleReadOnlyWorkoutPanel(`${panelPrefix}-notes`)}
          >
            <Text style={[styles.workoutDetailDescription, { color: theme.muted }]}>
              {workout.notes}
            </Text>
          </CollapsiblePanel>
        ) : null}

        <CollapsiblePanel
          collapseLabel={t("collapse")}
          expandLabel={t("expand")}
          isCollapsed={isReadOnlyWorkoutPanelCollapsed(`${panelPrefix}-overview`)}
          theme={theme}
          title={t("overview")}
          onToggle={() => toggleReadOnlyWorkoutPanel(`${panelPrefix}-overview`)}
        >
          <WorkoutMuscleOverviewContent language={language} theme={theme} workout={workout} />
        </CollapsiblePanel>

        <View style={styles.workoutDetailStages}>
          {stageGroups.map(({ stage, series }, index) => {
            const exerciseCount = series.reduce(
              (total, item) => total + item.elements.filter((element) => !isRestTargetStep(element)).length,
              0
            );

            return (
              <CollapsiblePanel
                actions={
                  <View style={[styles.panelCountBadge, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[styles.panelCountBadgeText, { color: theme.primary }]}>{exerciseCount}</Text>
                  </View>
                }
                collapseLabel={t("collapse")}
                expandLabel={t("expand")}
                key={stage.id}
                isCollapsed={isReadOnlyWorkoutPanelCollapsed(`${panelPrefix}-stage-${stage.id}`)}
                theme={theme}
                title={stage.label || `${t("stage")} ${index + 1}`}
                onToggle={() => toggleReadOnlyWorkoutPanel(`${panelPrefix}-stage-${stage.id}`)}
              >
                {stage.notes ? (
                  <Text style={[styles.workoutDetailNotes, { color: theme.muted }]}>{stage.notes}</Text>
                ) : null}

                {series.length ? (
                  <View style={styles.workoutDetailSeriesList}>
                    {series.map(({ set, elements }, setIndex) => {
                      const headerElement = elements.find((element) => !isRestTargetStep(element)) ?? elements[0];

                      return (
                        <View
                          key={set.id}
                          style={[
                            styles.workoutDetailSeriesRow,
                            { borderColor: theme.border },
                            setIndex === series.length - 1 ? styles.workoutDetailSeriesRowLast : null
                          ]}
                        >
                          <View style={styles.workoutInfo}>
                            {elements.map((element) => (
                              <View key={element.id} style={styles.workoutDetailElementRow}>
                                <ExerciseSummaryRow
                                  language={language}
                                  pairedTargetText={
                                    isRestTargetStep(element)
                                      ? (() => {
                                        const elementIndex = elements.findIndex((item) => item.id === element.id);
                                        const previousExercise = [...elements]
                                          .slice(0, Math.max(0, elementIndex))
                                          .reverse()
                                          .find((item) => !isRestTargetStep(item));

                                        return previousExercise
                                          ? formatExerciseSetTarget({ ...previousExercise, setCount: set.setCount || "1" })
                                          : undefined;
                                      })()
                                      : undefined
                                  }
                                  seriesIndex={headerElement?.id === element.id ? setIndex + 1 : undefined}
                                  step={element}
                                  targetText={formatExerciseSetTarget({ ...element, setCount: set.setCount || "1" })}
                                  theme={theme}
                                  t={t}
                                  onPressDetails={() => openExerciseDetail(element)}
                                  onPressMuscles={() => openExerciseDetail(element)}
                                />
                              </View>
                            ))}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </CollapsiblePanel>
            );
          })}
        </View>
      </>
    );
  }

  function renderWorkoutSession() {
    const session = activeWorkoutSession;

    if (!session) {
      return (
        <View style={[styles.emptyBuilder, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.emptyBuilderTitle, { color: theme.text }]}>{t("noWorkout")}</Text>
        </View>
      );
    }

    if (!session.entries.length) {
      return (
        <View style={[styles.emptyBuilder, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.emptyBuilderTitle, { color: theme.text }]}>{t("emptyWorkoutSession")}</Text>
          <AppButton icon="close-outline" theme={theme} onPress={abandonActiveWorkoutSession}>
            {t("abandonWorkout")}
          </AppButton>
        </View>
      );
    }

    const currentEntry = session.entries[Math.min(sessionEntryIndex, session.entries.length - 1)];

    if (session.executionMode === "guided") {
      const exerciseGroups = getWorkoutSessionExerciseGroups(session);
      const guidedSteps = getWorkoutSessionGuidedSteps(session);
      const guidedStepIndex = getWorkoutSessionGuidedStepIndex(guidedSteps, sessionEntryIndex, currentEntry);
      const currentStep = guidedSteps[guidedStepIndex];
      const currentGroup = currentStep?.groups[0] ?? {
        entries: [currentEntry],
        firstIndex: Math.min(sessionEntryIndex, session.entries.length - 1),
        key: currentEntry.id
      };
      const canGoBack = guidedStepIndex > 0;
      const canGoNext = guidedStepIndex < guidedSteps.length - 1;
      const shouldShowGuidedEntryTable = currentGroup.entries.some(isWorkoutSessionEntryFillRequired);
      const firstExerciseNumber = (currentStep?.firstGroupIndex ?? 0) + 1;
      const lastExerciseNumber = (currentStep?.lastGroupIndex ?? currentStep?.firstGroupIndex ?? 0) + 1;
      const isSuperset = Boolean(currentStep?.superset && currentStep.groups.length === 2);

      return (
        <View style={styles.sessionScreen}>
          {renderWorkoutSessionProgressCard(firstExerciseNumber, exerciseGroups.length, lastExerciseNumber)}
          {isSuperset && currentStep?.superset ? renderGuidedSuperset(
            session,
            currentStep.superset.id,
            currentStep.groups as [WorkoutSessionExerciseGroup, WorkoutSessionExerciseGroup],
            firstExerciseNumber
          ) : (
            <>
              {renderGuidedPlanPreview(session, currentGroup, firstExerciseNumber)}
              <AppButton
                icon="link-outline"
                theme={theme}
                variant="outline"
                onPress={() => requestCreateWorkoutSessionSuperset(currentGroup.entries[0]?.id ?? currentEntry.id)}
              >
                {t("supersetCreateAction")}
              </AppButton>
              {shouldShowGuidedEntryTable
                ? renderGuidedEntryTable(currentGroup.entries.filter(isWorkoutSessionEntryFillRequired))
                : null}
            </>
          )}
          <View style={styles.sessionActions}>
            <AppButton
              disabled={!canGoBack}
              icon="chevron-back-outline"
              style={styles.sessionNavButton}
              theme={theme}
              variant="outline"
              onPress={() => {
                const previousStep = guidedSteps[Math.max(0, guidedStepIndex - 1)];
                setSessionEntryIndex(previousStep?.firstIndex ?? 0);
              }}
            >
              {t("back")}
            </AppButton>
            <AppButton
              disabled={!canGoNext}
              icon="chevron-forward-outline"
              style={styles.sessionNavButton}
              theme={theme}
              variant="outline"
              onPress={() => {
                const nextStep = guidedSteps[Math.min(guidedSteps.length - 1, guidedStepIndex + 1)];
                setSessionEntryIndex(nextStep?.firstIndex ?? sessionEntryIndex);
              }}
            >
              {t("next")}
            </AppButton>
          </View>
          <View style={styles.sessionActions}>
            <AppButton icon="flag-outline" style={styles.sessionNavButton} theme={theme} onPress={requestFinishActiveWorkoutSession}>
              {t("finish")}
            </AppButton>
            <AppButton icon="close-outline" style={styles.sessionNavButton} theme={theme} variant="outline" onPress={abandonActiveWorkoutSession}>
              {t("cancel")}
            </AppButton>
          </View>
        </View>
      );
    }

    if (session.executionMode === "readonly-post-workout" && !isPostWorkoutFillMode) {
      return (
        <View style={styles.sessionScreen}>
          {renderReadOnlyWorkoutPlan(session.planSnapshot, `active-session-${session.id}`)}
          <AppButton icon="create-outline" theme={theme} onPress={() => setIsPostWorkoutFillMode(true)}>
            {t("finishAndFill")}
          </AppButton>
          <AppButton icon="close-outline" theme={theme} variant="outline" onPress={abandonActiveWorkoutSession}>
            {t("cancelWorkout")}
          </AppButton>
        </View>
      );
    }

    return (
      <View style={styles.sessionScreen}>
        {renderInlineWorkoutTable(session)}
        <View style={styles.sessionActions}>
          <AppButton icon="flag-outline" style={styles.sessionNavButton} theme={theme} onPress={requestFinishActiveWorkoutSession}>
            {t("finish")}
          </AppButton>
          <AppButton icon="close-outline" style={styles.sessionNavButton} theme={theme} variant="outline" onPress={abandonActiveWorkoutSession}>
            {t("cancel")}
          </AppButton>
        </View>
      </View>
    );
  }

  return renderWorkoutSession();
}
