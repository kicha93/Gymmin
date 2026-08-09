import AsyncStorage from "@react-native-async-storage/async-storage";

import { isLocalOnlyMigrationComplete } from "./localOnlyStorageMigration";

export const GYMMIN_STORAGE_PREFIX = "gymmin.";

export async function assertLocalDataDeletionAllowed() {
  if (!(await isLocalOnlyMigrationComplete())) {
    throw new Error("Local-only migration must finish before all local data can be deleted.");
  }
}

export async function deleteAllGymminUserData() {
  await assertLocalDataDeletionAllowed();

  const keys = await AsyncStorage.getAllKeys();
  const gymminKeys = keys.filter((key) => key.startsWith(GYMMIN_STORAGE_PREFIX));
  if (gymminKeys.length > 0) {
    await Promise.all(gymminKeys.map((key) => AsyncStorage.removeItem(key)));
  }
  return gymminKeys;
}
