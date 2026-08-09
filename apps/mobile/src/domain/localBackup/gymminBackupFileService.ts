import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";

import { bytesToBase64, encodeUtf8 } from "../workoutExport/workoutExportEncoding";
import { createGymminBackupFilename, serializeGymminBackup, type GymminBackupV1 } from "./gymminBackup";

export class GymminBackupCancelledError extends Error {}

export async function exportGymminBackupFile(backup: GymminBackupV1, locale: "pl" | "en") {
  const { Platform } = await import("react-native");
  const filename = createGymminBackupFilename(new Date(backup.createdAt));
  const bytes = encodeUtf8(serializeGymminBackup(backup));
  if (Platform.OS === "android" && Number(Platform.Version) >= 29) {
    const nativeExport = await import("../../../modules/gymmin-file-export/src");
    if (!nativeExport.isNativeFileExportAvailable()) throw new Error("Native public Downloads export is unavailable.");
    return nativeExport.savePublicDownloadAsync(filename, "application/json", bytesToBase64(bytes),
      locale === "pl" ? "Kopia Gymmin została zapisana" : "Gymmin backup saved",
      locale === "pl" ? "Otwórz" : "Open", false);
  }
  if (Platform.OS === "android") {
    const { EncodingType, StorageAccessFramework } = await import("expo-file-system/legacy");
    const permission = await StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!permission.granted) throw new GymminBackupCancelledError();
    const uri = await StorageAccessFramework.createFileAsync(permission.directoryUri, filename, "application/json");
    await StorageAccessFramework.writeAsStringAsync(uri, bytesToBase64(bytes), { encoding: EncodingType.Base64 });
    return { notificationShown: false, uri };
  }
  try {
    const { Directory } = await import("expo-file-system");
    const directory = await Directory.pickDirectoryAsync();
    const file = directory.createFile(filename, "application/json");
    file.write(bytes);
    return { notificationShown: false, uri: file.uri };
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes("cancel")) throw new GymminBackupCancelledError();
    throw error;
  }
}

export async function pickGymminBackupFile() {
  const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false, type: ["application/json", "text/json", "*/*"] });
  if (result.canceled) throw new GymminBackupCancelledError();
  const asset = result.assets[0];
  if (!asset || (!asset.name.toLowerCase().endsWith(".gymmin.json") && !asset.name.toLowerCase().endsWith(".json"))) {
    throw new Error("Select a .gymmin.json file.");
  }
  return new File(asset.uri).text();
}
