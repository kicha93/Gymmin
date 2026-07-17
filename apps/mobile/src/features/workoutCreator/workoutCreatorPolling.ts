import type { WorkoutCreatorJobStatus } from "../../api/workoutCreatorApi";

type PollWorkoutCreatorJobOptions = {
  cancelled?: () => boolean;
  delay?: (milliseconds: number) => Promise<void>;
  failedMessage: string;
  getJob: () => Promise<WorkoutCreatorJobStatus>;
  intervalMs?: number;
  maxAttempts?: number;
  sessionExpiredMessage: string;
};

const defaultDelay = (milliseconds: number) => new Promise<void>((resolve) => {
  setTimeout(resolve, milliseconds);
});

export async function pollWorkoutCreatorJob(options: PollWorkoutCreatorJobOptions) {
  const cancelled = options.cancelled ?? (() => false);
  const delay = options.delay ?? defaultDelay;
  const maxAttempts = options.maxAttempts ?? 360;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (cancelled()) {
      return null;
    }

    let jobStatus: WorkoutCreatorJobStatus;
    try {
      jobStatus = await options.getJob();
    } catch (error) {
      if ((error as { status?: number }).status === 401) {
        throw new Error(options.sessionExpiredMessage);
      }
      throw error;
    }

    if (jobStatus.status === "completed") {
      return jobStatus.result;
    }
    if (jobStatus.status === "failed") {
      throw new Error(jobStatus.error || options.failedMessage);
    }

    await delay(options.intervalMs ?? 5000);
  }

  throw new Error(options.failedMessage);
}
