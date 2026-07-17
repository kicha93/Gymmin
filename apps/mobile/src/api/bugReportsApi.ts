export type BugReportPayload = {
  appVersion: string;
  description: string;
  device: unknown;
  diagnostics: Record<string, unknown>;
  language: string;
  screen: string;
  title: string;
};

type RequestApi = (endpoint: string, init?: RequestInit) => Promise<Response>;
type CreateApiError = (
  response: Response,
  endpoint: string,
  method: string,
  fallbackMessage: string
) => Promise<Error>;

export function createBugReportsApiClient(dependencies: {
  createError: CreateApiError;
  request: RequestApi;
}) {
  return {
    async submit(
      payload: BugReportPayload,
      idempotencyKey: string,
      headers: Record<string, string>,
      fallbackMessage: string
    ) {
      const endpoint = "/api/bug-reports";
      const response = await dependencies.request(endpoint, {
        body: JSON.stringify(payload),
        headers: {
          ...headers,
          "Content-Type": "application/json",
          "X-Idempotency-Key": idempotencyKey
        },
        method: "POST"
      });
      const responseBody = await response.clone().json().catch(() => null) as unknown;

      if (!response.ok) {
        throw await dependencies.createError(
          response,
          endpoint,
          "POST",
          getErrorMessage(responseBody) || fallbackMessage
        );
      }

      const id = isRecord(responseBody) && typeof responseBody.id === "string"
        ? responseBody.id.trim()
        : "";
      if (!id) {
        throw new Error(fallbackMessage);
      }
      return { id };
    }
  };
}

function getErrorMessage(value: unknown) {
  if (!isRecord(value)) {
    return "";
  }
  if (typeof value.detail === "string" && value.detail.trim()) {
    return value.detail.trim();
  }
  return typeof value.error === "string" ? value.error.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
