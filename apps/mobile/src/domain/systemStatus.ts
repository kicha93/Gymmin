export type SystemStatusKind = "ok" | "degraded" | "maintenance" | "update" | "offline";
export type SystemStatusLanguage = "en" | "pl";

export type SystemStatusMessage = {
  en?: string | null;
  pl?: string | null;
};

export type SystemStatusState = {
  kind: SystemStatusKind;
  message?: SystemStatusMessage | null;
  updatedAt?: string | null;
};

export type SystemStatusCopy = {
  cta: string;
  description: string;
  title: string;
};

const statusCopies: Record<Exclude<SystemStatusKind, "ok">, Record<SystemStatusLanguage, SystemStatusCopy>> = {
  degraded: {
    en: {
      cta: "Refresh",
      description: "We detected temporary issues with online services. You can keep using the app, and sync will retry automatically.",
      title: "Some features may be slower"
    },
    pl: {
      cta: "Odśwież",
      description: "Wykryliśmy chwilowe problemy z usługami online. Możesz dalej korzystać z aplikacji, a synchronizacja spróbuje wznowić się automatycznie.",
      title: "Niektóre funkcje mogą działać wolniej"
    }
  },
  maintenance: {
    en: {
      cta: "Refresh status",
      description: "We are applying improvements to keep Gymmin stable. Some online features may be temporarily unavailable.",
      title: "Maintenance in progress"
    },
    pl: {
      cta: "Odśwież status",
      description: "Wprowadzamy poprawki, żeby Gymmin działał stabilniej. Część funkcji online może być chwilowo niedostępna.",
      title: "Trwa przerwa techniczna"
    }
  },
  offline: {
    en: {
      cta: "Try again",
      description: "Some online features may be temporarily unavailable. Your local workouts are still safe on this device.",
      title: "We cannot reach the server"
    },
    pl: {
      cta: "Spróbuj ponownie",
      description: "Część funkcji online może być chwilowo niedostępna. Twoje lokalne treningi nadal są bezpieczne na tym urządzeniu.",
      title: "Nie możemy połączyć się z serwerem"
    }
  },
  update: {
    en: {
      cta: "Check again",
      description: "A short system update is in progress. Everything should be back to normal soon.",
      title: "Gymmin is being updated"
    },
    pl: {
      cta: "Sprawdź ponownie",
      description: "Trwa krótka aktualizacja systemu. Za chwilę wszystko powinno wrócić do normy.",
      title: "Aktualizujemy Gymmin"
    }
  }
};

export const systemStatusCacheTtlMs = 2 * 60 * 1000;

export function normalizeSystemStatusKind(value: unknown): SystemStatusKind {
  return value === "degraded" || value === "maintenance" || value === "update" ? value : "ok";
}

export function normalizeSystemStatusResponse(value: unknown): SystemStatusState {
  if (!value || typeof value !== "object") {
    return { kind: "ok", message: null, updatedAt: null };
  }

  const raw = value as Partial<SystemStatusState>;
  return {
    kind: normalizeSystemStatusKind(raw.kind),
    message: raw.message && typeof raw.message === "object" ? raw.message : null,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : null
  };
}

export function createOfflineSystemStatus(updatedAt = new Date().toISOString()): SystemStatusState {
  return {
    kind: "offline",
    message: null,
    updatedAt
  };
}

export function getSystemStatusCopy(status: SystemStatusState, language: SystemStatusLanguage): SystemStatusCopy | null {
  if (status.kind === "ok") {
    return null;
  }

  const copy = statusCopies[status.kind][language];
  const customDescription = status.message?.[language]?.trim();
  return {
    ...copy,
    description: customDescription || copy.description
  };
}

export function shouldFetchSystemStatus(lastFetchedAt: number | null, now: number, ttlMs = systemStatusCacheTtlMs) {
  return !lastFetchedAt || now - lastFetchedAt >= ttlMs;
}
