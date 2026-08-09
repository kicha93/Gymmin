export const ANONYMOUS_LOCAL_OWNER = "anonymous";

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

// Legacy key description only. Active Gymmin data is stored under
// gymmin.local.v1.*; this module exists solely to import old installations.
