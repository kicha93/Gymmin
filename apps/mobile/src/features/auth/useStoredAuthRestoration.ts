import { useEffect, useRef, useState } from "react";

import type { AuthUserResponse, UserSession } from "../../domain/auth";
import { restoreStoredAuthSession } from "./authSession";

type UseStoredAuthRestorationOptions = {
  fallbackName: string;
  getCurrentUser: (cachedSession: UserSession) => Promise<AuthUserResponse | null>;
  onRestored: (session: UserSession) => void;
};

export function useStoredAuthRestoration(options: UseStoredAuthRestorationOptions) {
  const initialOptionsRef = useRef(options);
  const [hasLoadedLocalAuth, setHasLoadedLocalAuth] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function restore() {
      try {
        const initialOptions = initialOptionsRef.current;
        const restoredSession = await restoreStoredAuthSession({
          fallbackName: initialOptions.fallbackName,
          getCurrentUser: initialOptions.getCurrentUser
        });
        if (isMounted && restoredSession) {
          initialOptions.onRestored(restoredSession);
        }
      } catch (error) {
        console.error("Failed to load local auth", error);
      } finally {
        if (isMounted) {
          setHasLoadedLocalAuth(true);
        }
      }
    }

    void restore();

    return () => {
      isMounted = false;
    };
  }, []);

  return hasLoadedLocalAuth;
}
