import AsyncStorage from "@react-native-async-storage/async-storage";

export const ANONYMOUS_LOCAL_OWNER = "anonymous";
export const ACCOUNT_STORAGE_MIGRATION_KEY = "gymmin.accountStorageMigration.v1";
export const LAST_ACCOUNT_USER_ID_KEY = "gymmin.lastAccountUserId";

export type LegacyAccountStorageMapping = {
  baseKey: string;
  legacyKey: string;
};

export function getAccountStorageOwnerId(userId?: string | null): string {
  const normalizedUserId = typeof userId === "string" ? userId.trim() : "";
  return normalizedUserId || ANONYMOUS_LOCAL_OWNER;
}

export function getAccountStorageKey(baseKey: string, userId?: string | null): string {
  return `gymmin.account.${getAccountStorageOwnerId(userId)}.${baseKey}`;
}

export async function loadAccountJson<T>(baseKey: string, userId?: string | null): Promise<T | null> {
  const rawData = await AsyncStorage.getItem(getAccountStorageKey(baseKey, userId));
  if (!rawData) {
    return null;
  }

  return JSON.parse(rawData) as T;
}

export async function saveAccountJson(baseKey: string, value: unknown, userId?: string | null) {
  await AsyncStorage.setItem(getAccountStorageKey(baseKey, userId), JSON.stringify(value));
}

export async function removeAccountJson(baseKey: string, userId?: string | null) {
  await AsyncStorage.removeItem(getAccountStorageKey(baseKey, userId));
}

export async function removeAccountStorageKeys(baseKeys: string[], userId?: string | null) {
  const keys = [...new Set(baseKeys)]
    .filter((baseKey) => baseKey.trim().length > 0)
    .map((baseKey) => getAccountStorageKey(baseKey, userId));

  if (keys.length === 0) {
    return;
  }

  if (typeof AsyncStorage.multiRemove === "function") {
    await AsyncStorage.multiRemove(keys);
    return;
  }

  await Promise.all(keys.map((key) => AsyncStorage.removeItem(key)));
}

export async function migrateLegacyAccountStorage(mappings: LegacyAccountStorageMapping[]) {
  try {
    for (const mapping of mappings) {
      try {
        const legacyValue = await AsyncStorage.getItem(mapping.legacyKey);
        if (!legacyValue) {
          continue;
        }

        const anonymousKey = getAccountStorageKey(mapping.baseKey, ANONYMOUS_LOCAL_OWNER);
        const existingValue = await AsyncStorage.getItem(anonymousKey);
        if (!existingValue) {
          await AsyncStorage.setItem(anonymousKey, legacyValue);
        }
      } catch (error) {
        console.error("Failed to migrate legacy account storage key", mapping.legacyKey, error);
      }
    }

    await AsyncStorage.setItem(ACCOUNT_STORAGE_MIGRATION_KEY, JSON.stringify({
      migratedAt: new Date().toISOString(),
      version: 1
    }));
  } catch (error) {
    console.error("Failed to run account storage migration", error);
  }
}

export async function getLastAccountUserId(): Promise<string | null> {
  const userId = await AsyncStorage.getItem(LAST_ACCOUNT_USER_ID_KEY);
  return userId?.trim() || null;
}

export async function setLastAccountUserId(userId: string | null) {
  if (!userId) {
    await AsyncStorage.removeItem(LAST_ACCOUNT_USER_ID_KEY);
    return;
  }

  await AsyncStorage.setItem(LAST_ACCOUNT_USER_ID_KEY, userId);
}

export function detectAccountSwitch(previousUserId: string | null, currentUserId: string | null) {
  return Boolean(previousUserId && currentUserId && previousUserId !== currentUserId);
}
