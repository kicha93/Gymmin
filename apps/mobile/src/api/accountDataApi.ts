import type { FavoriteExerciseSyncRequest } from "../domain/favoriteExerciseSync";
import type { AchievementSyncRequest } from "../domain/achievementSync";
import type { WorkoutSessionSyncRequest } from "../domain/workoutSessionSync";
import type {
  GoalType,
  StageType,
  TargetComparator,
  WorkoutStepKind
} from "../domain/workouts";

type RequestApi = (endpoint: string, init?: RequestInit) => Promise<Response>;
type CreateApiError = (
  response: Response,
  endpoint: string,
  method: string,
  fallbackMessage: string
) => Promise<Error>;

export type ApiWorkoutStep = {
  clientStepId: string;
  exerciseId?: string;
  exerciseName?: string;
  goalType?: GoalType | null;
  kind: WorkoutStepKind;
  label?: string;
  loadKg?: string;
  notes?: string;
  parentSetClientId?: string;
  parentStageClientId?: string;
  setCount?: string;
  stageType?: StageType | null;
  targetComparator?: TargetComparator | null;
  targetValue?: string;
};

export type ApiWorkout = {
  clientWorkoutId: string;
  createdAt?: string;
  name: string;
  notes?: string;
  sport: "strength";
  steps: ApiWorkoutStep[];
};

export type WorkoutSyncPayload = {
  deletedClientWorkoutIds: string[];
  lastPulledAt: string | null;
  workouts: unknown[];
};

export function createAccountDataApiClient(dependencies: {
  createError: CreateApiError;
  request: RequestApi;
}) {
  async function requireSuccess(
    endpoint: string,
    init: RequestInit,
    fallbackMessage: string,
    acceptedStatuses: number[] = []
  ) {
    const response = await dependencies.request(endpoint, init);
    if (!response.ok && !acceptedStatuses.includes(response.status)) {
      throw await dependencies.createError(
        response,
        endpoint,
        init.method ?? "GET",
        fallbackMessage
      );
    }
    return response;
  }

  async function postJson(endpoint: string, body: unknown, headers: Record<string, string>, fallbackMessage: string) {
    const response = await requireSuccess(endpoint, {
      body: JSON.stringify(body),
      headers: { ...headers, "Content-Type": "application/json" },
      method: "POST"
    }, fallbackMessage);
    return response.json().catch(() => null) as Promise<unknown>;
  }

  return {
    async getWorkouts(headers: Record<string, string>, fallbackMessage: string): Promise<ApiWorkout[]> {
      const response = await requireSuccess("/api/workouts/", { headers }, fallbackMessage);
      const value = await response.json().catch(() => []);
      return normalizeApiWorkouts(value);
    },

    async syncWorkouts(
      payload: WorkoutSyncPayload,
      headers: Record<string, string>,
      fallbackMessage: string
    ) {
      await postJson("/api/sync/workouts", payload, headers, fallbackMessage);
    },

    async upsertWorkout(workout: unknown, headers: Record<string, string>, fallbackMessage: string) {
      await postJson("/api/workouts/", workout, headers, fallbackMessage);
    },

    async deleteWorkout(workoutId: string, headers: Record<string, string>, fallbackMessage: string) {
      await requireSuccess(`/api/workouts/${encodeURIComponent(workoutId)}`, {
        headers,
        method: "DELETE"
      }, fallbackMessage, [404]);
    },

    async getSettings(headers: Record<string, string>, fallbackMessage: string) {
      const response = await requireSuccess("/api/settings", { headers }, fallbackMessage, [404]);
      if (response.status === 204 || response.status === 404) {
        return null;
      }
      return response.json().catch(() => null) as Promise<unknown>;
    },

    async saveSettings(settings: unknown, headers: Record<string, string>, fallbackMessage: string) {
      const response = await requireSuccess("/api/settings", {
        body: JSON.stringify(settings),
        headers: { ...headers, "Content-Type": "application/json" },
        method: "PUT"
      }, fallbackMessage);
      return response.json().catch(() => null) as Promise<unknown>;
    },

    syncFavoriteExercises(
      body: FavoriteExerciseSyncRequest,
      headers: Record<string, string>,
      fallbackMessage: string
    ) {
      return postJson("/api/sync/favorite-exercises", body, headers, fallbackMessage);
    },

    syncWorkoutSessions(
      body: WorkoutSessionSyncRequest,
      headers: Record<string, string>,
      fallbackMessage: string
    ) {
      return postJson("/api/sync/workout-sessions", body, headers, fallbackMessage);
    },

    syncAchievements(
      body: AchievementSyncRequest,
      headers: Record<string, string>,
      fallbackMessage: string
    ) {
      return postJson("/api/sync/achievements", body, headers, fallbackMessage);
    }
  };
}

export function normalizeApiWorkouts(value: unknown): ApiWorkout[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }

    const clientWorkoutId = normalizeRequiredString(item.clientWorkoutId);
    if (!clientWorkoutId) {
      return [];
    }

    const steps = Array.isArray(item.steps)
      ? item.steps.flatMap(normalizeApiWorkoutStep)
      : [];
    return [{
      clientWorkoutId,
      createdAt: normalizeOptionalString(item.createdAt),
      name: normalizeRequiredString(item.name) ?? "Workout",
      notes: normalizeOptionalString(item.notes),
      sport: "strength" as const,
      steps
    }];
  });
}

function normalizeApiWorkoutStep(value: unknown): ApiWorkoutStep[] {
  if (!isRecord(value)) {
    return [];
  }

  const clientStepId = normalizeRequiredString(value.clientStepId);
  const kind = value.kind;
  if (!clientStepId || (kind !== "stage" && kind !== "set" && kind !== "exercise")) {
    return [];
  }

  const goalType = value.goalType;
  const stageType = value.stageType;
  const targetComparator = value.targetComparator;
  return [{
    clientStepId,
    exerciseId: normalizeOptionalString(value.exerciseId),
    exerciseName: normalizeOptionalString(value.exerciseName),
    goalType: goalType === "repetitions" || goalType === "time" || goalType === "buttonPress"
      || goalType === "calories" || goalType === "heartRate" ? goalType : null,
    kind,
    label: normalizeOptionalString(value.label),
    loadKg: normalizeOptionalString(value.loadKg),
    notes: normalizeOptionalString(value.notes),
    parentSetClientId: normalizeOptionalString(value.parentSetClientId),
    parentStageClientId: normalizeOptionalString(value.parentStageClientId),
    setCount: normalizeOptionalString(value.setCount),
    stageType: stageType === "warmup" || stageType === "exercise" || stageType === "recovery"
      || stageType === "rest" || stageType === "cooldown" || stageType === "other" ? stageType : null,
    targetComparator: targetComparator === "below" || targetComparator === "above" ? targetComparator : null,
    targetValue: normalizeOptionalString(value.targetValue)
  }];
}

function normalizeRequiredString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeOptionalString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
