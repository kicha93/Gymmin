import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type {
  AuthApiResponse,
  AuthUserResponse,
  LegacyLocalAuthStorage,
  LocalAuthStorage,
  UserSession
} from "../../domain/auth";
import { createUserSession } from "../../domain/auth";

export const LOCAL_AUTH_STORAGE_KEY = "gymmin.localAuth.v1";
const secureAuthTokenKey = "gymmin.auth.token.v1";

export async function getSecureAuthToken() {
  return Platform.OS === "web"
    ? null
    : SecureStore.getItemAsync(secureAuthTokenKey);
}

export async function setSecureAuthToken(token: string) {
  if (Platform.OS === "web") {
    return;
  }

  await SecureStore.setItemAsync(secureAuthTokenKey, token, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY
  });
}

export async function deleteSecureAuthToken() {
  if (Platform.OS === "web") {
    return;
  }

  await SecureStore.deleteItemAsync(secureAuthTokenKey);
}

export async function clearStoredAuthSession() {
  await Promise.all([
    AsyncStorage.removeItem(LOCAL_AUTH_STORAGE_KEY),
    deleteSecureAuthToken()
  ]);
}

export type StoredAuthDependencies = {
  deleteToken: () => Promise<void>;
  getRaw: () => Promise<string | null>;
  getToken: () => Promise<string | null>;
  removeRaw: () => Promise<void>;
  setRaw: (value: string) => Promise<void>;
  setToken: (token: string) => Promise<void>;
};

const defaultStoredAuthDependencies: StoredAuthDependencies = {
  deleteToken: deleteSecureAuthToken,
  getRaw: () => AsyncStorage.getItem(LOCAL_AUTH_STORAGE_KEY),
  getToken: getSecureAuthToken,
  removeRaw: () => AsyncStorage.removeItem(LOCAL_AUTH_STORAGE_KEY),
  setRaw: (value) => AsyncStorage.setItem(LOCAL_AUTH_STORAGE_KEY, value),
  setToken: setSecureAuthToken
};

export async function restoreStoredAuthSession(params: {
  dependencies?: StoredAuthDependencies;
  fallbackName: string;
  getCurrentUser: (cachedSession: UserSession) => Promise<AuthUserResponse | null>;
}): Promise<UserSession | null> {
  const dependencies = params.dependencies ?? defaultStoredAuthDependencies;

  try {
    const rawData = await dependencies.getRaw();
    const storedData = parseStoredAuth(rawData);
    let token = await dependencies.getToken();
    if (!storedData?.user || !isRecord(storedData.user)) {
      await clearInvalidStoredAuth(dependencies, Boolean(rawData));
      return null;
    }

    if (!token && typeof storedData.token === "string" && storedData.token.trim()) {
      token = storedData.token.trim();
      await dependencies.setToken(token);
      await dependencies.setRaw(JSON.stringify({
        updatedAt: new Date().toISOString(),
        user: storedData.user,
        version: 2
      } satisfies LocalAuthStorage));
    }
    if (!token) {
      await dependencies.removeRaw();
      return null;
    }

    const cachedSession = createCachedSession(storedData.user, token, params.fallbackName);
    if (!cachedSession) {
      await clearInvalidStoredAuth(dependencies, true);
      return null;
    }

    try {
      const currentUser = await params.getCurrentUser(cachedSession);
      if (!currentUser) {
        await clearInvalidStoredAuth(dependencies, true);
        return null;
      }
      return createCachedSession(currentUser, token, params.fallbackName);
    } catch (error) {
      const status = (error as { status?: number }).status;
      if (status === 401 || status === 403) {
        await clearInvalidStoredAuth(dependencies, true);
        return null;
      }
      return cachedSession;
    }
  } catch (error) {
    console.error("Failed to restore stored auth session", error);
    try {
      const [rawData, token] = await Promise.all([
        dependencies.getRaw(),
        dependencies.getToken()
      ]);
      const storedData = parseStoredAuth(rawData);
      return token && storedData?.user
        ? createCachedSession(storedData.user, token, params.fallbackName)
        : null;
    } catch (fallbackError) {
      console.error("Failed to restore cached auth after auth check error", fallbackError);
      return null;
    }
  }
}

export async function persistStoredAuthSession(
  authResponse: AuthApiResponse,
  fallbackName: string,
  dependencies: StoredAuthDependencies = defaultStoredAuthDependencies
) {
  const session = createUserSession(authResponse, fallbackName);
  await dependencies.setToken(authResponse.token);
  await dependencies.setRaw(JSON.stringify({
    updatedAt: new Date().toISOString(),
    user: authResponse.user,
    version: 2
  } satisfies LocalAuthStorage));
  return session;
}

export async function updateStoredAuthUser(
  nextUser: UserSession,
  dependencies: StoredAuthDependencies = defaultStoredAuthDependencies
) {
  try {
    const storedData = parseStoredAuth(await dependencies.getRaw());
    if (!storedData) {
      return;
    }
    await dependencies.setRaw(JSON.stringify({
      updatedAt: new Date().toISOString(),
      user: {
        ...(isRecord(storedData.user) ? storedData.user : {}),
        avatarUpdatedAt: nextUser.avatarUpdatedAt ?? null,
        avatarUrl: nextUser.avatarUrl ?? null,
        createdOn: nextUser.createdOn ?? null,
        email: nextUser.email,
        emailVerified: nextUser.emailVerified,
        id: nextUser.id,
        modifiedOn: nextUser.modifiedOn ?? null,
        name: nextUser.name
      },
      version: 2
    } satisfies LocalAuthStorage));
  } catch (error) {
    console.error("Failed to update cached auth user", error);
  }
}

export function createCachedSession(
  value: unknown,
  token: string,
  fallbackName: string
): UserSession | null {
  if (!isRecord(value) || typeof value.id !== "string" || !value.id.trim()
    || typeof value.email !== "string" || !value.email.trim()) {
    return null;
  }
  const email = value.email.trim();
  return {
    avatarUpdatedAt: typeof value.avatarUpdatedAt === "string" ? value.avatarUpdatedAt : null,
    avatarUrl: typeof value.avatarUrl === "string" ? value.avatarUrl : null,
    createdOn: typeof value.createdOn === "string" ? value.createdOn : null,
    email,
    emailVerified: value.emailVerified === true,
    id: value.id.trim(),
    modifiedOn: typeof value.modifiedOn === "string" ? value.modifiedOn : null,
    name: typeof value.name === "string" && value.name.trim()
      ? value.name.trim()
      : email.split("@")[0] || fallbackName,
    token
  };
}

function parseStoredAuth(rawData: string | null): LegacyLocalAuthStorage | null {
  return rawData ? JSON.parse(rawData) as LegacyLocalAuthStorage : null;
}

async function clearInvalidStoredAuth(dependencies: StoredAuthDependencies, hasRawData: boolean) {
  await Promise.all([
    dependencies.deleteToken(),
    hasRawData ? dependencies.removeRaw() : Promise.resolve()
  ]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
