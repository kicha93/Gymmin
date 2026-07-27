import type { WorkoutExportFormat } from "./workoutExportTypes";

const maximumWorkoutNameLength = 80;

export function createWorkoutExportFilename(
  workoutName: string,
  extension: WorkoutExportFormat,
  _date = new Date()
): string {
  const safeName = workoutName
    .trim()
    .replace(/[\\/:*?"<>|\u0000-\u001F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, maximumWorkoutNameLength)
    .trim()
    .replace(/[._-]+$/g, "");
  return `${safeName || "Trening"}.${extension}`;
}
