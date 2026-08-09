export type DiagnosticLevel = "info" | "warn" | "error";
export type DiagnosticArea = "workout" | "ai" | "reminders" | "storage" | "ui";

export type DiagnosticEvent = {
  area: DiagnosticArea;
  extra?: Record<string, string | number | boolean | null | undefined>;
  level: DiagnosticLevel;
  message: string;
  screen?: string;
  timestamp: string;
};

const maxEvents = 100;
const events: DiagnosticEvent[] = [];

export function addDiagnosticEvent(event: Omit<DiagnosticEvent, "timestamp">) {
  events.push(sanitizeDiagnosticEvent({ ...event, timestamp: new Date().toISOString() }));
  while (events.length > maxEvents) {
    events.shift();
  }
}

export function getDiagnosticsSnapshot() {
  return { recentEvents: [...events] };
}

function sanitizeDiagnosticEvent(event: DiagnosticEvent): DiagnosticEvent {
  const extra = event.extra
    ? Object.fromEntries(Object.entries(event.extra).filter(([key]) => !isSensitiveKey(key)))
    : undefined;
  return { ...event, extra };
}

function isSensitiveKey(key: string) {
  const normalized = key.toLowerCase();
  return normalized.includes("password") ||
    normalized.includes("token") ||
    normalized.includes("authorization") ||
    normalized.includes("secret") ||
    normalized.includes("prompt") ||
    normalized.includes("response") ||
    normalized.includes("correlation") ||
    normalized.includes("userid");
}
