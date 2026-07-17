import { useEffect, useRef } from "react";

import type { UserSession } from "../../domain/auth";
import {
  detectAccountSwitch,
  getLastAccountUserId,
  setLastAccountUserId
} from "../../domain/accountStorage";
import {
  hasAnonymousAccountData,
  hasAnonymousMergeHandled
} from "../../storage/localDataRepositories";

export type AccountDataPolicyDecision = "account-switch" | "anonymous-data" | "none";

export function decideAccountDataPolicy(
  previousUserId: string | null,
  currentUserId: string,
  anonymousMergeHandled: boolean,
  hasAnonymousData: boolean
): AccountDataPolicyDecision {
  if (detectAccountSwitch(previousUserId, currentUserId)) {
    return "account-switch";
  }
  return !anonymousMergeHandled && hasAnonymousData ? "anonymous-data" : "none";
}

type UseAccountDataPolicyOptions = {
  anonymousDataBaseKeys: string[];
  enabled: boolean;
  onAccountSwitch: () => void;
  onAnonymousData: (user: UserSession) => void;
  user: UserSession | null;
};

export function useAccountDataPolicy(options: UseAccountDataPolicyOptions) {
  const handledUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!options.enabled || !options.user) {
      return;
    }
    if (handledUserIdRef.current === options.user.id) {
      return;
    }

    const currentUser = options.user;
    handledUserIdRef.current = currentUser.id;
    let isMounted = true;

    async function applyPolicy() {
      try {
        const [previousUserId, anonymousMergeHandled, anonymousDataExists] = await Promise.all([
          getLastAccountUserId(),
          hasAnonymousMergeHandled(currentUser.id),
          hasAnonymousAccountData(options.anonymousDataBaseKeys)
        ]);
        if (!isMounted) {
          return;
        }

        const decision = decideAccountDataPolicy(
          previousUserId,
          currentUser.id,
          anonymousMergeHandled,
          anonymousDataExists
        );
        if (decision === "account-switch") {
          options.onAccountSwitch();
        } else if (decision === "anonymous-data") {
          options.onAnonymousData(currentUser);
        }

        await setLastAccountUserId(currentUser.id);
      } catch (error) {
        console.error("Failed to apply account storage policy", error);
      }
    }

    void applyPolicy();

    return () => {
      isMounted = false;
    };
  }, [options.enabled, options.user?.id]);

  return {
    reset: () => {
      handledUserIdRef.current = null;
    }
  };
}
