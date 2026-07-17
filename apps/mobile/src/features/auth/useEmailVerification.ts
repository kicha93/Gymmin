import { useEffect, useState } from "react";

import type { createAuthApiClient } from "../../api/authApi";
import { getErrorMessageOrFallback } from "../../domain/apiErrors";
import type { UserSession } from "../../domain/auth";
import type { LanguageCode, TranslationKey } from "../../i18n/translations";

type UseEmailVerificationOptions = {
  api: ReturnType<typeof createAuthApiClient>;
  getHeaders: (session: UserSession) => Record<string, string>;
  language: LanguageCode;
  onUnauthorized: () => void;
  t: (key: TranslationKey) => string;
  updateUser: (user: UserSession) => Promise<void>;
  user: UserSession | null;
};

export function useEmailVerification(options: UseEmailVerificationOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (options.user && !options.user.emailVerified) {
      setIsOpen(true);
    }
  }, [options.user?.id, options.user?.emailVerified]);

  async function requestCode() {
    const user = options.user;
    if (!user || user.emailVerified || isSubmitting) return;
    setIsSubmitting(true);
    setMessage("");
    try {
      const fallback = options.language === "pl" ? "Nie udało się wysłać kodu." : "Could not send the code.";
      await options.api.requestEmailVerification(options.getHeaders(user), fallback);
      setMessage(options.language === "pl" ? "Nowy kod został wysłany." : "A new code has been sent.");
    } catch (error) {
      if ((error as { status?: number }).status === 401) {
        options.onUnauthorized();
        return;
      }
      setMessage(getErrorMessageOrFallback(
        error,
        options.language === "pl" ? "Nie udało się wysłać kodu." : "Could not send the code.",
        options.t("serverProblemMessage")
      ));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function confirmCode() {
    const user = options.user;
    if (!user || user.emailVerified || isSubmitting) return;
    const normalizedCode = code.trim();
    if (!/^\d{6}$/.test(normalizedCode)) {
      setMessage(options.language === "pl" ? "Wpisz sześciocyfrowy kod." : "Enter the six-digit code.");
      return;
    }
    setIsSubmitting(true);
    setMessage("");
    try {
      const invalidCodeMessage = options.language === "pl"
        ? "Kod jest nieprawidłowy lub wygasł."
        : "The code is invalid or expired.";
      await options.api.confirmEmailVerification(normalizedCode, options.getHeaders(user), invalidCodeMessage);
      await options.updateUser({ ...user, emailVerified: true });
      setCode("");
      setMessage("");
      setIsOpen(false);
    } catch (error) {
      const status = (error as { status?: number }).status;
      if (status === 401) {
        options.onUnauthorized();
        return;
      }
      const fallback = options.language === "pl" ? "Nie udało się potwierdzić emaila." : "Could not verify email.";
      setMessage(status === 400
        ? (options.language === "pl" ? "Kod jest nieprawidłowy lub wygasł." : "The code is invalid or expired.")
        : getErrorMessageOrFallback(error, fallback, options.t("serverProblemMessage")));
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    code,
    confirmCode,
    isOpen,
    isSubmitting,
    message,
    requestCode,
    setCode,
    setIsOpen,
    setMessage
  };
}
