import { requireOptionalNativeModule } from "expo-modules-core";

export type SavedPublicDownload = {
  notificationShown: boolean;
  uri: string;
};

type GymminFileExportNativeModule = {
  openFileAsync(uri: string, mimeType: string): Promise<void>;
  saveToDownloadsAsync(
    filename: string,
    mimeType: string,
    contentBase64: string,
    notificationTitle: string,
    notificationOpenLabel: string,
    showNotification: boolean
  ): Promise<SavedPublicDownload>;
};

const nativeModule = requireOptionalNativeModule<GymminFileExportNativeModule>("GymminFileExport");

export function isNativeFileExportAvailable() {
  return nativeModule !== null;
}

export async function openPublicDownloadAsync(uri: string, mimeType: string) {
  if (!nativeModule) {
    throw new Error("Native file export module is unavailable.");
  }
  await nativeModule.openFileAsync(uri, mimeType);
}

export async function savePublicDownloadAsync(
  filename: string,
  mimeType: string,
  contentBase64: string,
  notificationTitle: string,
  notificationOpenLabel: string,
  showNotification: boolean
) {
  if (!nativeModule) {
    throw new Error("Native file export module is unavailable.");
  }
  return nativeModule.saveToDownloadsAsync(
    filename,
    mimeType,
    contentBase64,
    notificationTitle,
    notificationOpenLabel,
    showNotification
  );
}
