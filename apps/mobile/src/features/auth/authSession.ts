import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

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
