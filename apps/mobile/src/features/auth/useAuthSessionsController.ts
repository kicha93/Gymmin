import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

import type { createAuthApiClient } from "../../api/authApi";
import { getErrorMessageOrFallback } from "../../domain/apiErrors";
import type { UserSession } from "../../domain/auth";
import type { TranslationKey } from "../../i18n/translations";

type Options = {
  active: boolean;
  api: ReturnType<typeof createAuthApiClient>;
  deviceName: string;
  getHeaders: (session: UserSession) => Record<string, string>;
  onCurrentRevoked: () => void;
  onMessage: (message: string) => void;
  onUnauthorized: () => void;
  setError: Dispatch<SetStateAction<string>>;
  setSubmitting: Dispatch<SetStateAction<boolean>>;
  t: (key: TranslationKey) => string;
  user: UserSession | null;
};

export function useAuthSessionsController(options: Options) {
  const [sessions, setSessions] = useState<import("../../domain/auth").AuthSessionResponse[]>([]);

  async function refresh() {
    const user = options.user;
    if (!user) return;
    options.setSubmitting(true);
    options.setError("");
    try {
      setSessions(await options.api.getSessions({
        ...options.getHeaders(user),
        "X-Gymmin-Device-Name": options.deviceName
      }, options.t("authRequestError")));
    } catch (error) {
      if ((error as { status?: number }).status === 401) {
        options.onUnauthorized();
        return;
      }
      options.setError(getErrorMessageOrFallback(
        error,
        options.t("authRequestError"),
        options.t("serverProblemMessage")
      ));
    } finally {
      options.setSubmitting(false);
    }
  }

  async function revoke(sessionId: string) {
    const user = options.user;
    if (!user) return;
    try {
      await options.api.revokeSession(sessionId, options.getHeaders(user), options.t("authRequestError"));
      options.onMessage(options.t("sessionSignedOut"));
      if (sessions.find((session) => session.id === sessionId)?.isCurrent) {
        options.onCurrentRevoked();
        return;
      }
      await refresh();
    } catch (error) {
      if ((error as { status?: number }).status === 401) {
        options.onUnauthorized();
        return;
      }
      options.setError(getErrorMessageOrFallback(
        error,
        options.t("authRequestError"),
        options.t("serverProblemMessage")
      ));
    }
  }

  useEffect(() => {
    if (options.active && options.user) {
      void refresh();
    }
  }, [options.active, options.user?.id]);

  return { refresh, revoke, sessions };
}
