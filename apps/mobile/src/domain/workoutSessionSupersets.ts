import type {
  WorkoutSession,
  WorkoutSessionEntry,
  WorkoutSessionSuperset
} from "./workoutSessions";

export type WorkoutSessionExerciseGroup = {
  entries: WorkoutSessionEntry[];
  firstIndex: number;
  key: string;
  restEntry?: WorkoutSessionEntry;
};

export type WorkoutSessionGuidedStep = {
  firstGroupIndex: number;
  firstIndex: number;
  groups: WorkoutSessionExerciseGroup[];
  key: string;
  lastGroupIndex: number;
  superset?: WorkoutSessionSuperset;
};

export type WorkoutSessionSupersetCandidate =
  | { entryIds: [string, string]; status: "ready" }
  | { status: "ineligible" | "no-next" | "overlap" };

export type WorkoutSessionSupersetRound = {
  entryA: WorkoutSessionEntry | null;
  entryB: WorkoutSessionEntry | null;
  index: number;
  isCompleted: boolean;
  number: number;
};

export type WorkoutSessionSupersetSide = "A" | "B";
export type WorkoutSessionSupersetValueField = "actualReps" | "actualWeight";

function getExerciseGroupKey(entry: WorkoutSessionEntry) {
  return [entry.sourceStageId, entry.sourceSeriesId, entry.sourceElementId ?? entry.id]
    .filter(Boolean)
    .join(":");
}

function getGroupAnchorId(group: WorkoutSessionExerciseGroup) {
  return group.entries[0]?.id ?? "";
}

function isEligibleGroup(group?: WorkoutSessionExerciseGroup) {
  const entry = group?.entries[0];
  return Boolean(
    entry &&
    entry.type !== "rest" &&
    (entry.exerciseId?.trim() || entry.exerciseName?.trim() || entry.sourceElementId?.trim())
  );
}

function getGroupIndexForEntryId(groups: WorkoutSessionExerciseGroup[], entryId: string) {
  return groups.findIndex((group) => group.entries.some((entry) => entry.id === entryId));
}

function normalizeTimestamp(value: unknown, fallback: string) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    return fallback;
  }
  return new Date(value).toISOString();
}

export function getWorkoutSessionExerciseGroups(
  session: Pick<WorkoutSession, "entries">
): WorkoutSessionExerciseGroup[] {
  const exerciseEntries = session.entries.filter((entry) => entry.type !== "rest");
  const sourceEntries = exerciseEntries.length ? exerciseEntries : session.entries;
  const groups: WorkoutSessionExerciseGroup[] = [];
  const grouped = new Map<string, WorkoutSessionExerciseGroup>();

  sourceEntries.forEach((entry) => {
    const key = getExerciseGroupKey(entry);
    const firstIndex = session.entries.findIndex((item) => item.id === entry.id);
    const existing = grouped.get(key);

    if (existing) {
      existing.entries.push(entry);
      return;
    }

    const group = { entries: [entry], firstIndex, key };
    grouped.set(key, group);
    groups.push(group);
  });

  return groups.map((group) => {
    const referenceEntry = group.entries[0];
    const restEntry = session.entries.find(
      (entry) =>
        entry.type === "rest" &&
        entry.sourceSeriesId === referenceEntry.sourceSeriesId &&
        entry.elementIndex > referenceEntry.elementIndex
    );

    return { ...group, restEntry };
  });
}

export function normalizeWorkoutSessionSupersets(
  value: unknown,
  entries: WorkoutSessionEntry[],
  fallbackTimestamp: string
): WorkoutSessionSuperset[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const groups = getWorkoutSessionExerciseGroups({ entries });
  const usedEntryIds = new Set<string>();
  const normalized: WorkoutSessionSuperset[] = [];

  value.forEach((item) => {
    if (!item || typeof item !== "object") {
      return;
    }

    const record = item as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id.trim() : "";
    const rawEntryIds = Array.isArray(record.entryIds)
      ? record.entryIds.filter((entryId): entryId is string => typeof entryId === "string" && Boolean(entryId.trim()))
      : [];
    if (!id || rawEntryIds.length !== 2 || rawEntryIds[0] === rawEntryIds[1]) {
      return;
    }

    const groupIndexes = rawEntryIds.map((entryId) => getGroupIndexForEntryId(groups, entryId));
    if (groupIndexes.some((index) => index < 0)) {
      return;
    }

    const [firstGroupIndex, secondGroupIndex] = [...groupIndexes].sort((left, right) => left - right);
    if (secondGroupIndex !== firstGroupIndex + 1) {
      return;
    }

    const firstGroup = groups[firstGroupIndex];
    const secondGroup = groups[secondGroupIndex];
    if (!isEligibleGroup(firstGroup) || !isEligibleGroup(secondGroup)) {
      return;
    }

    const entryIds: [string, string] = [getGroupAnchorId(firstGroup), getGroupAnchorId(secondGroup)];
    if (!entryIds[0] || !entryIds[1] || entryIds.some((entryId) => usedEntryIds.has(entryId))) {
      return;
    }

    entryIds.forEach((entryId) => usedEntryIds.add(entryId));
    const createdAt = normalizeTimestamp(record.createdAt, fallbackTimestamp);
    normalized.push({
      createdAt,
      entryIds,
      id,
      updatedAt: normalizeTimestamp(record.updatedAt, createdAt)
    });
  });

  return normalized;
}

function getNormalizedSupersets(session: WorkoutSession) {
  return normalizeWorkoutSessionSupersets(
    session.supersets,
    session.entries,
    session.startedAt
  );
}

export function getWorkoutSessionSupersetCandidate(
  session: WorkoutSession,
  currentEntryId: string
): WorkoutSessionSupersetCandidate {
  if (session.executionMode !== "guided") {
    return { status: "ineligible" };
  }

  const groups = getWorkoutSessionExerciseGroups(session);
  const currentGroupIndex = getGroupIndexForEntryId(groups, currentEntryId);
  if (currentGroupIndex < 0 || !isEligibleGroup(groups[currentGroupIndex])) {
    return { status: "ineligible" };
  }

  const nextGroup = groups[currentGroupIndex + 1];
  if (!nextGroup) {
    return { status: "no-next" };
  }
  if (!isEligibleGroup(nextGroup)) {
    return { status: "ineligible" };
  }

  const entryIds: [string, string] = [
    getGroupAnchorId(groups[currentGroupIndex]),
    getGroupAnchorId(nextGroup)
  ];
  const usedEntryIds = new Set(getNormalizedSupersets(session).flatMap((superset) => superset.entryIds));
  if (entryIds.some((entryId) => usedEntryIds.has(entryId))) {
    return { status: "overlap" };
  }

  return { entryIds, status: "ready" };
}

export function createWorkoutSessionSuperset(
  session: WorkoutSession,
  currentEntryId: string,
  now = new Date().toISOString()
): WorkoutSession {
  const candidate = getWorkoutSessionSupersetCandidate(session, currentEntryId);
  if (candidate.status !== "ready") {
    return session;
  }

  const supersets = getNormalizedSupersets(session);
  const safeIdPart = candidate.entryIds.join("-").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 100);
  const superset: WorkoutSessionSuperset = {
    createdAt: now,
    entryIds: candidate.entryIds,
    id: `superset-${Date.parse(now) || 0}-${safeIdPart}`,
    updatedAt: now
  };

  return {
    ...session,
    supersets: [...supersets, superset],
    updatedAt: now
  };
}

export function removeWorkoutSessionSuperset(
  session: WorkoutSession,
  supersetId: string,
  now = new Date().toISOString()
): WorkoutSession {
  const supersets = getNormalizedSupersets(session);
  const nextSupersets = supersets.filter((superset) => superset.id !== supersetId);
  if (nextSupersets.length === supersets.length) {
    return session;
  }

  return {
    ...session,
    supersets: nextSupersets.length ? nextSupersets : undefined,
    updatedAt: now
  };
}

export function getSupersetForEntry(
  session: WorkoutSession,
  entryId: string
): WorkoutSessionSuperset | undefined {
  const groups = getWorkoutSessionExerciseGroups(session);
  const groupIndex = getGroupIndexForEntryId(groups, entryId);
  const anchorId = groupIndex >= 0 ? getGroupAnchorId(groups[groupIndex]) : "";
  return anchorId
    ? getNormalizedSupersets(session).find((superset) => superset.entryIds.includes(anchorId))
    : undefined;
}

export function getWorkoutSessionGuidedSteps(session: WorkoutSession): WorkoutSessionGuidedStep[] {
  const groups = getWorkoutSessionExerciseGroups(session);
  const supersets = getNormalizedSupersets(session);
  const supersetByFirstEntryId = new Map(supersets.map((superset) => [superset.entryIds[0], superset]));
  const steps: WorkoutSessionGuidedStep[] = [];

  for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
    const group = groups[groupIndex];
    const superset = supersetByFirstEntryId.get(getGroupAnchorId(group));
    const secondGroup = superset ? groups[groupIndex + 1] : undefined;

    if (superset && secondGroup && getGroupAnchorId(secondGroup) === superset.entryIds[1]) {
      steps.push({
        firstGroupIndex: groupIndex,
        firstIndex: group.firstIndex,
        groups: [group, secondGroup],
        key: superset.id,
        lastGroupIndex: groupIndex + 1,
        superset
      });
      groupIndex += 1;
      continue;
    }

    steps.push({
      firstGroupIndex: groupIndex,
      firstIndex: group.firstIndex,
      groups: [group],
      key: group.key,
      lastGroupIndex: groupIndex
    });
  }

  return steps;
}

export function getWorkoutSessionGuidedStepIndex(
  steps: WorkoutSessionGuidedStep[],
  entryIndex: number,
  currentEntry?: WorkoutSessionEntry
) {
  const directIndex = steps.findIndex((step) =>
    step.groups.some((group) => group.entries.some((entry) => entry.id === currentEntry?.id))
  );
  if (directIndex >= 0) {
    return directIndex;
  }

  const nextIndex = steps.findIndex((step) =>
    step.groups.some((group) => group.firstIndex >= entryIndex)
  );
  return nextIndex >= 0 ? nextIndex : Math.max(0, steps.length - 1);
}

export function getGuidedStepRangeForEntry(session: WorkoutSession, entryId: string) {
  const groups = getWorkoutSessionExerciseGroups(session);
  const steps = getWorkoutSessionGuidedSteps(session);
  const step = steps.find((item) =>
    item.groups.some((group) => group.entries.some((entry) => entry.id === entryId))
  );

  return step
    ? { end: step.lastGroupIndex + 1, start: step.firstGroupIndex + 1, total: groups.length }
    : null;
}

export function getNextGuidedEntryId(session: WorkoutSession, currentEntryId: string) {
  const steps = getWorkoutSessionGuidedSteps(session);
  const currentIndex = steps.findIndex((step) =>
    step.groups.some((group) => group.entries.some((entry) => entry.id === currentEntryId))
  );
  return currentIndex >= 0 ? steps[currentIndex + 1]?.groups[0]?.entries[0]?.id ?? null : null;
}

export function getPreviousGuidedEntryId(session: WorkoutSession, currentEntryId: string) {
  const steps = getWorkoutSessionGuidedSteps(session);
  const currentIndex = steps.findIndex((step) =>
    step.groups.some((group) => group.entries.some((entry) => entry.id === currentEntryId))
  );
  return currentIndex > 0 ? steps[currentIndex - 1]?.groups[0]?.entries[0]?.id ?? null : null;
}

export function getSupersetRoundRows(
  session: WorkoutSession,
  supersetId: string
): WorkoutSessionSupersetRound[] {
  const superset = getNormalizedSupersets(session).find((item) => item.id === supersetId);
  if (!superset) {
    return [];
  }

  const groups = getWorkoutSessionExerciseGroups(session);
  const groupA = groups.find((group) => getGroupAnchorId(group) === superset.entryIds[0]);
  const groupB = groups.find((group) => getGroupAnchorId(group) === superset.entryIds[1]);
  if (!groupA || !groupB) {
    return [];
  }

  const roundCount = Math.max(groupA.entries.length, groupB.entries.length);
  return Array.from({ length: roundCount }, (_, index) => {
    const entryA = groupA.entries[index] ?? null;
    const entryB = groupB.entries[index] ?? null;
    const existingEntries = [entryA, entryB].filter((entry): entry is WorkoutSessionEntry => Boolean(entry));
    return {
      entryA,
      entryB,
      index,
      isCompleted: existingEntries.length > 0 && existingEntries.every((entry) => entry.isCompleted),
      number: index + 1
    };
  });
}

export function updateSupersetRoundValue(
  session: WorkoutSession,
  supersetId: string,
  roundIndex: number,
  exerciseSide: WorkoutSessionSupersetSide,
  field: WorkoutSessionSupersetValueField,
  value: string,
  now = new Date().toISOString()
): WorkoutSession {
  const round = getSupersetRoundRows(session, supersetId)[roundIndex];
  const targetEntry = exerciseSide === "A" ? round?.entryA : round?.entryB;
  if (!targetEntry) {
    return session;
  }

  const entries = session.entries.map((entry) => {
    if (entry.id !== targetEntry.id) {
      return entry;
    }

    const nextEntry = { ...entry, [field]: value };
    const hasAnyValue = Boolean(nextEntry.actualReps?.trim() || nextEntry.actualWeight?.trim());
    return {
      ...nextEntry,
      completedAt: hasAnyValue ? nextEntry.completedAt ?? now : undefined,
      isCompleted: hasAnyValue
    };
  });

  return { ...session, entries, updatedAt: now };
}

export function toggleSupersetRoundCompleted(
  session: WorkoutSession,
  supersetId: string,
  roundIndex: number,
  now = new Date().toISOString()
): WorkoutSession {
  const round = getSupersetRoundRows(session, supersetId)[roundIndex];
  if (!round) {
    return session;
  }

  const targetIds = new Set([round.entryA?.id, round.entryB?.id].filter((id): id is string => Boolean(id)));
  const shouldComplete = !round.isCompleted;
  const entries = session.entries.map((entry) => targetIds.has(entry.id)
    ? {
        ...entry,
        completedAt: shouldComplete ? entry.completedAt ?? now : undefined,
        isCompleted: shouldComplete
      }
    : entry);

  return { ...session, entries, updatedAt: now };
}
