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
  copyText: string;
  mailtoUrl: string;
  subject: string;
};

export function prepareBugReportEmail(input: BugReportEmailInput): PreparedBugReport {
  const isPolish = input.language.toLowerCase().startsWith("pl");
  const subjectTitle = sanitizeLine(input.title).slice(0, 80);
  const subjectPrefix = isPolish ? "Gymmin - zgłoszenie błędu" : "Gymmin - bug report";
  const subject = `${subjectPrefix}${subjectTitle ? ` - ${subjectTitle}` : ""}`;
  const description = sanitizeText(input.description).slice(0, maxDescriptionLength);
  const events = input.recentEvents.slice(-10).map(formatEvent);
  const labels = isPolish
    ? {
        appVersion: "Wersja aplikacji",
        build: "Build",
        description: "Opis użytkownika",
        deviceModel: "Model",
        diagnostics: "Ostatnie bezpieczne zdarzenia diagnostyczne",
        language: "Język",
        noEvents: "Brak zdarzeń.",
        os: "System",
        platform: "Platforma",
        screen: "Ekran"
      }
    : {
        appVersion: "App version",
        build: "Build",
        description: "User description",
        deviceModel: "Model",
        diagnostics: "Recent safe diagnostic events",
        language: "Language",
        noEvents: "No events.",
        os: "Operating system",
        platform: "Platform",
        screen: "Screen"
      };
  const lines = [
    `${labels.description}:`,
    description,
    "",
    `${labels.appVersion}: ${input.device.appVersion}`,
    `${labels.build}: ${input.device.buildVersion}`,
    `${labels.platform}: ${input.device.platform}`,
    `${labels.os}: ${input.device.osVersion}`,
    `${labels.deviceModel}: ${input.device.model}`,
    `${labels.language}: ${sanitizeLine(input.language)}`,
    `${labels.screen}: ${sanitizeLine(input.currentScreen)}`,
    "",
    `${labels.diagnostics}:`,
    ...(events.length ? events : [labels.noEvents])
  ];
  const body = lines.join("\n").slice(0, maxMailBodyLength);
  return {
    body,
    copyText: `To: ${BUG_REPORT_EMAIL}\nSubject: ${subject}\n\n${body}`,
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
