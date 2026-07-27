import { createWorkoutCsvBytes } from "./workoutCsvExporter";
import { bytesToBase64 } from "./workoutExportEncoding";
import { createWorkoutExportFilename } from "./workoutExportFilename";
import { buildWorkoutExportData } from "./workoutExportMapper";
import type { WorkoutDraft } from "../workouts";
import type { WorkoutExportFormat, WorkoutExportLocale } from "./workoutExportTypes";

const mimeTypes: Record<WorkoutExportFormat, string> = {
  csv: "text/csv",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
};

export class WorkoutExportCancelledError extends Error {
  constructor() {
    super("Workout export was cancelled.");
    this.name = "WorkoutExportCancelledError";
  }
}

export type WorkoutExportFileDependencies = {
  now: () => Date;
  saveFile: (
    filename: string,
    mimeType: string,
    content: Uint8Array,
    notificationCopy: WorkoutExportNotificationCopy
  ) => Promise<SavedWorkoutExportFile>;
};

export type WorkoutExportNotificationCopy = {
  openLabel: string;
  title: string;
};

export type SavedWorkoutExportFile = {
  notificationShown: boolean;
  uri: string;
};

function getDefaultNotificationCopy(locale: WorkoutExportLocale): WorkoutExportNotificationCopy {
  return locale === "pl"
    ? { openLabel: "Otwórz", title: "Plik treningu został pobrany" }
    : { openLabel: "Open", title: "Workout file downloaded" };
}

async function requestExportNotificationPermission() {
  try {
    const notifications = await import("expo-notifications");
    await notifications.setNotificationChannelAsync("workout-exports", {
      importance: notifications.AndroidImportance.DEFAULT,
      name: "Workout exports"
    });
    const current = await notifications.getPermissionsAsync();
    if (current.granted) return true;
    return (await notifications.requestPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

async function saveFileToPublicDownloads(
  filename: string,
  mimeType: string,
  content: Uint8Array,
  notificationCopy: WorkoutExportNotificationCopy
): Promise<SavedWorkoutExportFile> {
  const { Platform } = await import("react-native");

  if (Platform.OS === "android") {
    const androidVersion = typeof Platform.Version === "string"
      ? Number.parseInt(Platform.Version, 10)
      : Platform.Version;
    if (androidVersion >= 29) {
      const notificationAllowed = await requestExportNotificationPermission();
      const nativeExport = await import("../../../modules/gymmin-file-export/src");
      if (!nativeExport.isNativeFileExportAvailable()) {
        throw new Error("Native public Downloads export is unavailable.");
      }
      return nativeExport.savePublicDownloadAsync(
        filename,
        mimeType,
        bytesToBase64(content),
        notificationCopy.title,
        notificationCopy.openLabel,
        notificationAllowed
      );
    }

    const { EncodingType, StorageAccessFramework } = await import("expo-file-system/legacy");
    const downloadsUri = StorageAccessFramework.getUriForDirectoryInRoot("Download");
    const permission = await StorageAccessFramework.requestDirectoryPermissionsAsync(downloadsUri);
    if (!permission.granted) throw new WorkoutExportCancelledError();

    const fileUri = await StorageAccessFramework.createFileAsync(
      permission.directoryUri,
      filename,
      mimeType
    );
    await StorageAccessFramework.writeAsStringAsync(fileUri, bytesToBase64(content), {
      encoding: EncodingType.Base64
    });
    return { notificationShown: false, uri: fileUri };
  }

  const { Directory } = await import("expo-file-system");
  try {
    const directory = await Directory.pickDirectoryAsync();
    const file = directory.createFile(filename, mimeType);
    file.write(content);
    return { notificationShown: false, uri: file.uri };
  } catch (error) {
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("cancel")) throw new WorkoutExportCancelledError();
    throw error;
  }
}

const defaultDependencies: WorkoutExportFileDependencies = {
  now: () => new Date(),
  saveFile: saveFileToPublicDownloads
};

export async function openWorkoutExportFile(uri: string, format: WorkoutExportFormat) {
  const { Platform } = await import("react-native");
  if (Platform.OS !== "android") {
    const { Linking } = await import("react-native");
    await Linking.openURL(uri);
    return;
  }

  const nativeExport = await import("../../../modules/gymmin-file-export/src");
  await nativeExport.openPublicDownloadAsync(uri, mimeTypes[format]);
}

export async function exportWorkoutToFile({
  dependencies = defaultDependencies,
  format,
  locale,
  notificationCopy = getDefaultNotificationCopy(locale),
  workout
}: {
  dependencies?: WorkoutExportFileDependencies;
  format: WorkoutExportFormat;
  locale: WorkoutExportLocale;
  notificationCopy?: WorkoutExportNotificationCopy;
  workout: WorkoutDraft;
}): Promise<{ filename: string; notificationShown: boolean; uri: string }> {
  const now = dependencies.now();
  const data = buildWorkoutExportData(workout, locale);
  const filename = createWorkoutExportFilename(workout.name, format, now);
  const content = format === "csv"
    ? createWorkoutCsvBytes(data, locale)
    : await import("./workoutXlsxExporter").then((module) => module.createWorkoutXlsx(data, locale));
  const savedFile = await dependencies.saveFile(
    filename,
    mimeTypes[format],
    content,
    notificationCopy
  );

  return { filename, ...savedFile };
}
