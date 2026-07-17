type RequestApi = (endpoint: string, init?: RequestInit) => Promise<Response>;
type CreateApiError = (
  response: Response,
  endpoint: string,
  method: string,
  fallbackMessage: string
) => Promise<Error>;

export type WorkoutCreatorQuestionAnswer = {
  Answer: string;
  Question: string;
};

export type WorkoutCreatorJobStatus = {
  error: string;
  result: unknown;
  status: string;
};

export function createWorkoutCreatorApiClient(dependencies: {
  createError: CreateApiError;
  request: RequestApi;
}) {
  async function requestJson(
    endpoint: string,
    init: RequestInit,
    fallbackMessage: string
  ) {
    const response = await dependencies.request(endpoint, init);
    if (!response.ok) {
      throw await dependencies.createError(
        response,
        endpoint,
        init.method ?? "GET",
        fallbackMessage
      );
    }
    return response.json().catch(() => null) as Promise<unknown>;
  }

  return {
    startPlan(
      body: {
        language: string;
        profileId: string | null;
        questionsAndAnswers: WorkoutCreatorQuestionAnswer[];
      },
      headers: Record<string, string>,
      fallbackMessage: string
    ) {
      return requestJson("/api/workout-creator/plan", {
        body: JSON.stringify(body),
        headers,
        method: "POST"
      }, fallbackMessage);
    },

    startRewrite(
      body: {
        instruction: string;
        language: string;
        preferences: { catalogOnly: boolean };
        workout: unknown;
      },
      headers: Record<string, string>,
      fallbackMessage: string
    ) {
      return requestJson("/api/workout-creator/rewrite", {
        body: JSON.stringify(body),
        headers,
        method: "POST"
      }, fallbackMessage);
    },

    async getJob(
      jobId: string,
      headers: Record<string, string>,
      fallbackMessage: string
    ): Promise<WorkoutCreatorJobStatus> {
      const value = await requestJson(
        `/api/workout-creator/plan/${encodeURIComponent(jobId)}`,
        { headers },
        fallbackMessage
      );
      return normalizeWorkoutCreatorJobStatus(value);
    }
  };
}

export function getWorkoutCreatorJobId(value: unknown) {
  if (!isRecord(value)) {
    return "";
  }
  return normalizeString(value.jobId) || normalizeString(value.id);
}

export function isWorkoutCreatorJobResponse(value: unknown) {
  if (!isRecord(value)) {
    return false;
  }
  const status = normalizeString(value.status).toLowerCase();
  return Boolean(getWorkoutCreatorJobId(value)) && (status === "processing" || status === "queued");
}

export function normalizeWorkoutCreatorJobStatus(value: unknown): WorkoutCreatorJobStatus {
  if (!isRecord(value)) {
    return { error: "", result: null, status: "" };
  }

  const status = normalizeString(value.status).toLowerCase();
  return {
    error: getFirstString(value, ["error", "detail", "title"]),
    result: status === "completed" ? extractCompletedResult(value) : null,
    status
  };
}

function extractCompletedResult(value: Record<string, unknown>) {
  const result = value.result;
  if (!isRecord(result)) {
    return result ?? value;
  }
  if (isRecord(result.response) && result.response.data !== undefined) {
    return result.response.data;
  }
  if (result.data !== undefined) {
    return result.data;
  }
  return result;
}

function getFirstString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = normalizeString(record[key]);
    if (value) {
      return value;
    }
  }
  return "";
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
