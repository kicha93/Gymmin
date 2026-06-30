export type DiagnosticLevel = "info" | "warn" | "error";
export type DiagnosticArea = "auth" | "sync" | "workout" | "ai" | "reminders" | "api" | "ui";

export type DiagnosticEvent = {
  area: DiagnosticArea;
  correlationId?: string;
  endpoint?: string;
  extra?: Record<string, string | number | boolean | null | undefined>;
  level: DiagnosticLevel;
  message: string;
  method?: string;
  screen?: string;
  statusCode?: number;
  timestamp: string;
};

export type ApiErrorInfo = {
  code?: string;
  correlationId?: string;
  endpoint: string;
  message: string;
  method: string;
  status: number;
};

const maxEvents = 100;
const maxCorrelationIds = 20;
const events: DiagnosticEvent[] = [];
const correlationIds: string[] = [];
let lastApiError: ApiErrorInfo | null = null;

export function createCorrelationId() {
  return `mobile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function addDiagnosticEvent(event: Omit<DiagnosticEvent, "timestamp">) {
  const sanitized = sanitizeDiagnosticEvent({ ...event, timestamp: new Date().toISOString() });
  events.push(sanitized);
  while (events.length > maxEvents) {
    events.shift();
  }

  if (sanitized.correlationId) {
    recordCorrelationId(sanitized.correlationId);
  }
}

export function recordCorrelationId(correlationId?: string | null) {
  const normalized = correlationId?.trim();
  if (!normalized) return;
  const existingIndex = correlationIds.indexOf(normalized);
  if (existingIndex >= 0) {
    correlationIds.splice(existingIndex, 1);
  }
  correlationIds.unshift(normalized);
  while (correlationIds.length > maxCorrelationIds) {
    correlationIds.pop();
  }
}

export function recordApiError(error: ApiErrorInfo) {
  lastApiError = error;
  recordCorrelationId(error.correlationId);
  addDiagnosticEvent({
    area: "api",
    correlationId: error.correlationId,
    endpoint: error.endpoint,
    level: "error",
    message: error.message,
    method: error.method,
    statusCode: error.status
  });
}

export function getDiagnosticsSnapshot() {
  return {
    lastApiError,
    lastCorrelationIds: [...correlationIds],
    recentEvents: [...events]
  };
}

function sanitizeDiagnosticEvent(event: DiagnosticEvent): DiagnosticEvent {
  const extra = event.extra
    ? Object.fromEntries(Object.entries(event.extra).filter(([key]) => !isSensitiveKey(key)))
    : undefined;

  return {
    ...event,
    extra
  };
}

function isSensitiveKey(key: string) {
  const normalized = key.toLowerCase();
  return normalized.includes("password") ||
    normalized.includes("token") ||
    normalized.includes("authorization") ||
    normalized.includes("secret");
}
