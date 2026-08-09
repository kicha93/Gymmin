import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export const LEGACY_AUTH_STORAGE_KEY = "gymmin.localAuth.v1";
export const LEGACY_AUTH_SECURE_TOKEN_KEY = "gymmin.auth.token.v1";
export const LEGACY_AUTH_CLEANUP_MARKER_KEY = "gymmin.local.v1.legacyAuthCleanup.v1";

export type LegacyAuthCleanupDependencies = {
  deleteSecureValue: (key: string) => Promise<void>;
  getMarker: () => Promise<string | null>;
  removeLegacyAuth: () => Promise<void>;
  setMarker: () => Promise<void>;
};

export async function cleanupLegacyAuthCredentials(
  dependencies: LegacyAuthCleanupDependencies = defaultDependencies
) {
  if (await dependencies.getMarker()) return "already-clean" as const;

  await dependencies.removeLegacyAuth().catch(() => undefined);
  await dependencies.deleteSecureValue(LEGACY_AUTH_SECURE_TOKEN_KEY).catch(() => undefined);
  await dependencies.setMarker();
  return "cleaned" as const;
}

const defaultDependencies: LegacyAuthCleanupDependencies = {
  deleteSecureValue: async (key) => {
    if (Platform.OS !== "web") await SecureStore.deleteItemAsync(key);
  },
  getMarker: () => AsyncStorage.getItem(LEGACY_AUTH_CLEANUP_MARKER_KEY),
  removeLegacyAuth: () => AsyncStorage.removeItem(LEGACY_AUTH_STORAGE_KEY),
  setMarker: () => AsyncStorage.setItem(LEGACY_AUTH_CLEANUP_MARKER_KEY, new Date().toISOString())
};
