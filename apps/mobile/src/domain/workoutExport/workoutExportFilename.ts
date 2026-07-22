import type { WorkoutExportFormat } from "./workoutExportTypes";

const maximumWorkoutNameLength = 80;

export function createWorkoutExportFilename(
  workoutName: string,
  extension: WorkoutExportFormat,
  date = new Date()
): string {
  const safeName = workoutName
    .trim()
    .replace(/[\\/:*?"<>|\u0000-\u001F]/g, " ")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, maximumWorkoutNameLength)
    .replace(/[._-]+$/g, "");
  const datePart = date.toISOString().slice(0, 10);
  return safeName
    ? `Gymmin_${safeName}_${datePart}.${extension}`
    : `Gymmin_trening_${datePart}.${extension}`;
}
