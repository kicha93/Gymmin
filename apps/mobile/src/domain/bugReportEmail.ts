import type { DiagnosticEvent } from "./appDiagnostics";
import type { SafeDeviceReportInfo } from "../platform/deviceInfo";

export const BUG_REPORT_EMAIL = "kontakt@gymmin.app";
const maxDescriptionLength = 3000;
const maxEventMessageLength = 240;
const maxMailBodyLength = 6000;

export type BugReportEmailInput = {
  currentScreen: string;
  description: string;
  device: SafeDeviceReportInfo;
  language: string;
  recentEvents: DiagnosticEvent[];
  title: string;
};

export type PreparedBugReport = {
  body: string;
  mailtoUrl: string;
  subject: string;
};

export function prepareBugReportEmail(input: BugReportEmailInput): PreparedBugReport {
  const subjectTitle = sanitizeLine(input.title).slice(0, 80);
  const subject = `Gymmin - zgłoszenie błędu${subjectTitle ? ` - ${subjectTitle}` : ""}`;
  const description = sanitizeText(input.description).slice(0, maxDescriptionLength);
  const events = input.recentEvents.slice(-10).map(formatEvent);
  const lines = [
    "Opis użytkownika:",
    description,
    "",
    "Informacje techniczne:",
    `Wersja aplikacji: ${input.device.appVersion}`,
    `Build: ${input.device.buildVersion}`,
    `Platforma: ${input.device.platform}`,
    `System: ${input.device.osVersion}`,
    `Model: ${input.device.model}`,
    `Język: ${sanitizeLine(input.language)}`,
    `Ekran: ${sanitizeLine(input.currentScreen)}`,
    "",
    "Ostatnie bezpieczne zdarzenia diagnostyczne:",
    ...(events.length ? events : ["Brak zdarzeń."])
  ];
  const body = lines.join("\n").slice(0, maxMailBodyLength);
  return {
    body,
    mailtoUrl: `mailto:${BUG_REPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    subject
  };
}

function formatEvent(event: DiagnosticEvent) {
  return [
    event.timestamp,
    event.level.toUpperCase(),
    event.area,
    event.screen ? `screen=${sanitizeLine(event.screen)}` : "",
    sanitizeLine(event.message).slice(0, maxEventMessageLength)
  ].filter(Boolean).join(" | ");
}

function sanitizeLine(value: string) {
  return sanitizeText(value).replace(/[\r\n]+/g, " ").trim();
}

function sanitizeText(value: string) {
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim();
}
