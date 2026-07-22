import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { createWorkoutCsv } from "./workoutCsvExporter";
import { createWorkoutExportFilename } from "./workoutExportFilename";
import { buildWorkoutExportData } from "./workoutExportMapper";
import type { WorkoutDraft } from "../workouts";
import type { WorkoutExportFormat, WorkoutExportLocale } from "./workoutExportTypes";

const mimeTypes: Record<WorkoutExportFormat, string> = {
  csv: "text/csv",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
};

export class WorkoutExportSharingUnavailableError extends Error {
  constructor() {
    super("File sharing is not available on this device.");
    this.name = "WorkoutExportSharingUnavailableError";
  }
}

export type WorkoutExportFileDependencies = {
  isSharingAvailable: () => Promise<boolean>;
  now: () => Date;
  shareFile: (uri: string, options: { dialogTitle: string; mimeType: string }) => Promise<void>;
  writeFile: (filename: string, content: string | Uint8Array) => Promise<string>;
};

const defaultDependencies: WorkoutExportFileDependencies = {
  isSharingAvailable: Sharing.isAvailableAsync,
  now: () => new Date(),
  shareFile: Sharing.shareAsync,
  writeFile: async (filename, content) => {
    const file = new File(Paths.cache, filename);
    file.create({ intermediates: true, overwrite: true });
    file.write(content);
    return file.uri;
  }
};

export async function exportWorkoutToFile({
  dependencies = defaultDependencies,
  format,
  locale,
  workout
}: {
  dependencies?: WorkoutExportFileDependencies;
  format: WorkoutExportFormat;
  locale: WorkoutExportLocale;
  workout: WorkoutDraft;
}): Promise<{ filename: string; uri: string }> {
  const now = dependencies.now();
  const data = buildWorkoutExportData(workout, locale);
  const filename = createWorkoutExportFilename(workout.name, format, now);
  const content = format === "csv"
    ? createWorkoutCsv(data, locale)
    : await import("./workoutXlsxExporter").then((module) => module.createWorkoutXlsx(data, locale, now));
  const uri = await dependencies.writeFile(filename, content);

  if (!await dependencies.isSharingAvailable()) {
    throw new WorkoutExportSharingUnavailableError();
  }

  await dependencies.shareFile(uri, {
    dialogTitle: locale === "pl" ? "Eksportuj trening" : "Export workout",
    mimeType: mimeTypes[format]
  });
  return { filename, uri };
}
