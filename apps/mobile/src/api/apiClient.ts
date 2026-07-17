import {
  createCorrelationId,
  recordApiError,
  recordCorrelationId
} from "../domain/appDiagnostics";

export type ApiSession = {
  token: string;
} | null;

export type ApiError = Error & {
  code?: string;
  correlationId?: string;
  status?: number;
};

type ApiErrorBody = {
  detail?: string;
  error?: string | {
    code?: string;
    correlationId?: string;
    message?: string;
  };
  message?: string;
};

export function buildApiHeaders(
  session: ApiSession,
  additionalHeaders: Record<string, string> = {}
): Record<string, string> {
  const headers: Record<string, string> = {
    "ngrok-skip-browser-warning": "true",
    "X-Correlation-Id": createCorrelationId(),
    ...additionalHeaders
  };

  if (session?.token) {
    headers.Authorization = `Bearer ${session.token}`;
  }

  return headers;
}

export async function requestApi(
  apiBaseUrl: string,
  endpoint: string,
  init: RequestInit = {}
) {
  const response = await fetch(`${apiBaseUrl}${endpoint}`, init);
  recordCorrelationId(response.headers.get("X-Correlation-Id"));
  return response;
}

export async function createApiError(
  response: Response,
  endpoint: string,
  method: string,
  fallbackMessage: string,
  rateLimitMessage: string
): Promise<ApiError> {
  const correlationId = response.headers.get("X-Correlation-Id") ?? undefined;
  recordCorrelationId(correlationId);
  const body = await response.json().catch(() => null) as ApiErrorBody | null;
  const errorObject = typeof body?.error === "object" ? body.error : null;
  const code = errorObject?.code ?? (response.status === 429 ? "rate_limited" : undefined);
  const message = response.status === 429
    ? rateLimitMessage
    : errorObject?.message
      ?? (typeof body?.error === "string" ? body.error : body?.detail ?? body?.message ?? fallbackMessage);
  const apiError = {
    code,
    correlationId: errorObject?.correlationId ?? correlationId,
    endpoint,
    message,
    method,
    status: response.status
  };
  recordApiError(apiError);

  const error = new Error(message) as ApiError;
  error.code = code;
  error.correlationId = apiError.correlationId;
  error.status = response.status;
  return error;
}
