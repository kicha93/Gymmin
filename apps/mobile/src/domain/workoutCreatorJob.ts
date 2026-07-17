export type PendingWorkoutCreatorJob =
  | {
      createdAt: string;
      jobId: string;
      profileId: string | null;
      type: "plan";
      version: 1;
    }
  | {
      createdAt: string;
      jobId: string;
      sourceWorkoutId: string;
      type: "rewrite";
      version: 1;
    };

export function normalizePendingWorkoutCreatorJob(
  value: unknown,
  fallbackCreatedAt = new Date().toISOString()
): PendingWorkoutCreatorJob | null {
  if (!isRecord(value)) {
    return null;
  }

  const jobId = normalizeRequiredString(value.jobId);
  if (!jobId) {
    return null;
  }

  const createdAt = normalizeRequiredString(value.createdAt) ?? fallbackCreatedAt;
  if (value.type === "rewrite") {
    const sourceWorkoutId = normalizeRequiredString(value.sourceWorkoutId);
    if (!sourceWorkoutId) {
      return null;
    }

    return {
      createdAt,
      jobId,
      sourceWorkoutId,
      type: "rewrite",
      version: 1
    };
  }

  if (value.type !== undefined && value.type !== "plan") {
    return null;
  }

  return {
    createdAt,
    jobId,
    profileId: normalizeRequiredString(value.profileId),
    type: "plan",
    version: 1
  };
}

function normalizeRequiredString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
