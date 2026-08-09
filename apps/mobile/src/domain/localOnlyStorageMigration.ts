import AsyncStorage from "@react-native-async-storage/async-storage";

import { getAccountStorageKey, type LegacyAccountStorageMapping } from "./accountStorage";

// COMPATIBILITY FREEZE: this is an import bridge from the former account/auth/sync
// architecture, not active account storage. Users may upgrade directly from any old
// Gymmin APK, so do not remove or redesign it before the explicitly agreed compatibility
// window ends. No removal date has been set.

export const LOCAL_ONLY_STORAGE_PREFIX = "gymmin.local.v1";
export const LOCAL_ONLY_MIGRATION_STATE_KEY = "gymmin.localOnlyMigration.v1";
export const LOCAL_ONLY_RUNTIME_CUTOVER_KEY = "gymmin.localRuntimeCutover.v1";
export const LOCAL_ONLY_MIGRATION_VERSION = 1;

export type LocalOnlyStorageSourceKind = "account" | "legacy";

export type LocalOnlyStorageSourceSummary = {
  achievementCount: number;
  creatorProfileCount: number;
  displayName: string | null;
  email: string | null;
  favoriteCount: number;
  id: string;
  kind: LocalOnlyStorageSourceKind;
  label: string;
  lastActivityAt: string | null;
  ownerId: string | null;
  sessionCount: number;
  workoutCount: number;
};

export type LocalOnlyMigrationResult =
  | { status: "ready"; sourceId: string | null }
  | { status: "selection-required"; sources: LocalOnlyStorageSourceSummary[] };

type LocalOnlyMigrationState = {
  completedAt?: string;
  copiedBaseKeys: string[];
  sourceId: string | null;
  startedAt: string;
  status: "copying" | "complete";
  version: 1;
};

type SourceRecord = LocalOnlyStorageSourceSummary & {
  values: Map<string, string>;
};

export function getLocalOnlyStorageKey(baseKey: string) {
  return `${LOCAL_ONLY_STORAGE_PREFIX}.${baseKey}`;
}

export async function markLocalOnlyRuntimeCutover(sourceId: string | null, now = new Date()) {
  await AsyncStorage.setItem(LOCAL_ONLY_RUNTIME_CUTOVER_KEY, JSON.stringify({
    completedAt: now.toISOString(),
    sourceId,
    version: 1
  }));
}

export async function isLocalOnlyMigrationComplete() {
  const state = await loadMigrationState();
  return state?.status === "complete";
}

export async function prepareLocalOnlyStorageMigration(
  baseKeys: string[],
  legacyMappings: LegacyAccountStorageMapping[],
  now = new Date()
): Promise<LocalOnlyMigrationResult> {
  const normalizedBaseKeys = normalizeBaseKeys(baseKeys);
  const state = await loadMigrationState();
  if (state?.status === "complete") {
    return { sourceId: state.sourceId, status: "ready" };
  }

  const sources = await discoverLocalOnlyStorageSources(normalizedBaseKeys, legacyMappings);
  if (state?.status === "copying" && state.sourceId) {
    const interruptedSource = sources.find((source) => source.id === state.sourceId);
    if (!interruptedSource) {
      throw new Error("The local data source selected before interruption is no longer available.");
    }
    await copySourceToLocalOnlyStorage(interruptedSource, normalizedBaseKeys, now, state);
    return { sourceId: interruptedSource.id, status: "ready" };
  }

  if (sources.length === 0) {
    await markMigrationComplete(null, [], now);
    return { sourceId: null, status: "ready" };
  }

  if (sources.length === 1) {
    await copySourceToLocalOnlyStorage(sources[0], normalizedBaseKeys, now);
    return { sourceId: sources[0].id, status: "ready" };
  }

  return {
    sources: sources.map(({ values: _values, ...summary }) => summary),
    status: "selection-required"
  };
}

export async function selectLocalOnlyStorageMigrationSource(
  sourceId: string,
  baseKeys: string[],
  legacyMappings: LegacyAccountStorageMapping[],
  now = new Date()
): Promise<LocalOnlyMigrationResult> {
  const normalizedBaseKeys = normalizeBaseKeys(baseKeys);
  const sources = await discoverLocalOnlyStorageSources(normalizedBaseKeys, legacyMappings);
  const source = sources.find((candidate) => candidate.id === sourceId);
  if (!source) {
    throw new Error("Selected local data source is no longer available.");
  }

  await copySourceToLocalOnlyStorage(source, normalizedBaseKeys, now);
  return { sourceId: source.id, status: "ready" };
}

export async function discoverLocalOnlyStorageSources(
  baseKeys: string[],
  legacyMappings: LegacyAccountStorageMapping[]
): Promise<SourceRecord[]> {
  const normalizedBaseKeys = normalizeBaseKeys(baseKeys);
  const allKeys = await AsyncStorage.getAllKeys();
  const cachedUser = await loadCachedAuthUser();
  const ownerIds = new Set<string>();

  for (const key of allKeys) {
    for (const baseKey of normalizedBaseKeys) {
      const suffix = `.${baseKey}`;
      if (!key.startsWith("gymmin.account.") || !key.endsWith(suffix)) {
        continue;
      }
      const ownerId = key.slice("gymmin.account.".length, -suffix.length);
      if (ownerId) {
        ownerIds.add(ownerId);
      }
    }
  }

  const sources: SourceRecord[] = [];
  for (const ownerId of [...ownerIds].sort()) {
    const values = await readAccountSource(ownerId, normalizedBaseKeys);
    if (isMeaningfulSource(values)) {
      sources.push(buildSourceRecord(
        `account:${ownerId}`,
        "account",
        ownerId,
        values,
        cachedUser?.id === ownerId ? cachedUser : null
      ));
    }
  }

  const legacyValues = await readLegacySource(normalizedBaseKeys, legacyMappings);
  if (isMeaningfulSource(legacyValues) && !sources.some((source) => mapsHaveSameValues(source.values, legacyValues))) {
    sources.push(buildSourceRecord("legacy", "legacy", null, legacyValues));
  }

  return sources.sort(compareSources);
}

async function copySourceToLocalOnlyStorage(
  source: SourceRecord,
  baseKeys: string[],
  now: Date,
  existingState?: LocalOnlyMigrationState
) {
  const copiedBaseKeys = new Set(existingState?.copiedBaseKeys ?? []);
  await saveMigrationState({
    copiedBaseKeys: [...copiedBaseKeys],
    sourceId: source.id,
    startedAt: existingState?.startedAt ?? now.toISOString(),
    status: "copying",
    version: LOCAL_ONLY_MIGRATION_VERSION
  });

  for (const baseKey of baseKeys) {
    const sourceValue = source.values.get(baseKey);
    if (sourceValue === undefined) {
      continue;
    }

    const destinationKey = getLocalOnlyStorageKey(baseKey);
    const destinationValue = await AsyncStorage.getItem(destinationKey);
    if (destinationValue === null) {
      await AsyncStorage.setItem(destinationKey, sourceValue);
    } else if (destinationValue !== sourceValue) {
      throw new Error(`Local migration destination conflict for ${baseKey}.`);
    }

    copiedBaseKeys.add(baseKey);
    await saveMigrationState({
      copiedBaseKeys: [...copiedBaseKeys],
      sourceId: source.id,
      startedAt: existingState?.startedAt ?? now.toISOString(),
      status: "copying",
      version: LOCAL_ONLY_MIGRATION_VERSION
    });
  }

  for (const baseKey of copiedBaseKeys) {
    const sourceValue = source.values.get(baseKey);
    const destinationValue = await AsyncStorage.getItem(getLocalOnlyStorageKey(baseKey));
    if (sourceValue === undefined || destinationValue !== sourceValue) {
      throw new Error(`Local migration integrity check failed for ${baseKey}.`);
    }
  }

  await markMigrationComplete(source.id, [...copiedBaseKeys], now, existingState?.startedAt);
}

async function markMigrationComplete(
  sourceId: string | null,
  copiedBaseKeys: string[],
  now: Date,
  startedAt = now.toISOString()
) {
  await saveMigrationState({
    completedAt: now.toISOString(),
    copiedBaseKeys,
    sourceId,
    startedAt,
    status: "complete",
    version: LOCAL_ONLY_MIGRATION_VERSION
  });
}

async function readAccountSource(ownerId: string, baseKeys: string[]) {
  const values = new Map<string, string>();
  for (const baseKey of baseKeys) {
    const value = await AsyncStorage.getItem(getAccountStorageKey(baseKey, ownerId));
    if (value !== null) {
      values.set(baseKey, value);
    }
  }
  return values;
}

async function readLegacySource(baseKeys: string[], mappings: LegacyAccountStorageMapping[]) {
  const values = new Map<string, string>();
  for (const baseKey of baseKeys) {
    const matchingMappings = mappings.filter((mapping) => mapping.baseKey === baseKey);
    for (const mapping of matchingMappings) {
      const value = await AsyncStorage.getItem(mapping.legacyKey);
      if (value !== null) {
        values.set(baseKey, value);
        break;
      }
    }
  }
  return values;
}

function buildSourceRecord(
  id: string,
  kind: LocalOnlyStorageSourceKind,
  ownerId: string | null,
  values: Map<string, string>,
  identity: { email: string | null; name: string | null } | null = null
): SourceRecord {
  const workouts = parseRecord(values.get("localWorkouts.v1"));
  const sessions = parseRecord(values.get("workoutSessions"));
  const profiles = parseRecord(values.get("localCreatorProfiles.v1"));
  const favorites = parseRecord(values.get("favoriteExercises"));
  const achievements = parseJson(values.get("achievements"));
  const lastActivityAt = findLatestDate([...values.values()]);

  return {
    achievementCount: Array.isArray(achievements)
      ? achievements.length
      : arrayLength(achievements, "achievements"),
    creatorProfileCount: arrayLength(profiles, "profiles"),
    displayName: identity?.name ?? null,
    email: identity?.email ?? null,
    favoriteCount: arrayLength(favorites, "favorites"),
    id,
    kind,
    label: identity?.name || identity?.email || (kind === "legacy"
      ? "Dane z wcześniejszej wersji aplikacji"
      : ownerId === "anonymous"
        ? "Lokalne dane bez konta"
        : `Lokalne dane konta ${ownerId}`),
    lastActivityAt,
    ownerId,
    sessionCount: arrayLength(sessions, "sessions"),
    values,
    workoutCount: arrayLength(workouts, "workouts")
  };
}

function isMeaningfulSource(values: Map<string, string>) {
  if (values.size === 0) {
    return false;
  }

  for (const [baseKey, rawValue] of values) {
    const parsed = parseJson(rawValue);
    if (parsed === null && [
      "localWorkouts.v1",
      "workoutSessions",
      "localCreatorProfiles.v1",
      "favoriteExercises",
      "achievements",
      "appUsageStats",
      "activeWorkoutSession.v1",
      "weeklyPlan.v1"
    ].includes(baseKey)) return true;
    if (baseKey === "localWorkouts.v1" && arrayLength(parsed, "workouts") > 0) return true;
    if (baseKey === "workoutSessions" && arrayLength(parsed, "sessions") > 0) return true;
    if (baseKey === "localCreatorProfiles.v1" && arrayLength(parsed, "profiles") > 0) return true;
    if (baseKey === "favoriteExercises" && arrayLength(parsed, "favorites") > 0) return true;
    if (baseKey === "achievements" && (Array.isArray(parsed) ? parsed.length : arrayLength(parsed, "achievements")) > 0) return true;
    if (baseKey === "appUsageStats" && isRecord(parsed) && Number(parsed.totalForegroundSeconds) > 0) return true;
    if (baseKey === "activeWorkoutSession.v1" && isRecord(parsed) && typeof parsed.sessionId === "string" && parsed.sessionId) return true;
    if (baseKey === "weeklyPlan.v1" && isRecord(parsed) && arrayLength(parsed, "items") > 0) return true;
    if (baseKey === "localSettings.v1" && isRecord(parsed)) return true;
  }

  return false;
}

function parseJson(value: string | undefined): unknown {
  if (value === undefined) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function parseRecord(value: string | undefined) {
  const parsed = parseJson(value);
  return isRecord(parsed) ? parsed : null;
}

function arrayLength(value: unknown, key: string) {
  return isRecord(value) && Array.isArray(value[key]) ? value[key].length : 0;
}

function findLatestDate(values: string[]) {
  let latest: string | null = null;
  let latestTime = Number.NEGATIVE_INFINITY;
  for (const value of values) {
    const parsed = parseJson(value);
    if (!isRecord(parsed)) continue;
    for (const key of ["updatedAt", "finishedAt", "startedAt", "lastOpenedAt"]) {
      if (typeof parsed[key] !== "string") continue;
      const time = Date.parse(parsed[key]);
      if (Number.isFinite(time) && time > latestTime) {
        latest = parsed[key] as string;
        latestTime = time;
      }
    }
  }
  return latest;
}

function mapsHaveSameValues(left: Map<string, string>, right: Map<string, string>) {
  if (left.size !== right.size) return false;
  return [...left].every(([key, value]) => right.get(key) === value);
}

function compareSources(left: SourceRecord, right: SourceRecord) {
  const leftTime = left.lastActivityAt ? Date.parse(left.lastActivityAt) : 0;
  const rightTime = right.lastActivityAt ? Date.parse(right.lastActivityAt) : 0;
  return rightTime - leftTime || left.label.localeCompare(right.label);
}

function normalizeBaseKeys(baseKeys: string[]) {
  return [...new Set(baseKeys.map((key) => key.trim()).filter(Boolean))];
}

async function loadMigrationState(): Promise<LocalOnlyMigrationState | null> {
  const raw = await AsyncStorage.getItem(LOCAL_ONLY_MIGRATION_STATE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<LocalOnlyMigrationState>;
    if (
      parsed.version !== LOCAL_ONLY_MIGRATION_VERSION
      || (parsed.status !== "copying" && parsed.status !== "complete")
      || !Array.isArray(parsed.copiedBaseKeys)
    ) {
      return null;
    }
    return parsed as LocalOnlyMigrationState;
  } catch {
    return null;
  }
}

async function saveMigrationState(state: LocalOnlyMigrationState) {
  await AsyncStorage.setItem(LOCAL_ONLY_MIGRATION_STATE_KEY, JSON.stringify(state));
}

export async function loadLocalOnlyJson<T>(baseKey: string): Promise<T | null> {
  const rawData = await AsyncStorage.getItem(getLocalOnlyStorageKey(baseKey));
  return rawData ? JSON.parse(rawData) as T : null;
}

export async function saveLocalOnlyJson(baseKey: string, value: unknown) {
  await AsyncStorage.setItem(getLocalOnlyStorageKey(baseKey), JSON.stringify(value));
}

export async function removeLocalOnlyValue(baseKey: string) {
  await AsyncStorage.removeItem(getLocalOnlyStorageKey(baseKey));
}

async function loadCachedAuthUser() {
  const raw = await AsyncStorage.getItem("gymmin.localAuth.v1");
  const parsed = parseJson(raw ?? undefined);
  const user = isRecord(parsed) && isRecord(parsed.user) ? parsed.user : null;
  if (!user || typeof user.id !== "string" || !user.id.trim()) return null;
  return {
    email: typeof user.email === "string" && user.email.trim() ? user.email.trim() : null,
    id: user.id.trim(),
    name: typeof user.name === "string" && user.name.trim() ? user.name.trim() : null
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
