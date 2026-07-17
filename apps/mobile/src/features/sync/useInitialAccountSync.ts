import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject
} from "react";

export type InitialAccountSyncStatus = "idle" | "syncing" | "synced" | "failed";

export function useInitialAccountSync(params: {
  enabled: boolean;
  onError: (error: unknown) => void;
  ownerId: string;
  syncedUserIdRef?: MutableRefObject<string | null>;
  synchronize: () => Promise<void>;
  userId: string | null;
}) {
  const [status, setStatus] = useState<InitialAccountSyncStatus>("idle");
  const generationRef = useRef(0);
  const synchronizeRef = useRef(params.synchronize);
  const onErrorRef = useRef(params.onError);
  synchronizeRef.current = params.synchronize;
  onErrorRef.current = params.onError;

  const reset = useCallback(() => {
    generationRef.current += 1;
    if (params.syncedUserIdRef) {
      params.syncedUserIdRef.current = null;
    }
    setStatus("idle");
  }, [params.syncedUserIdRef]);

  const markSyncing = useCallback(() => {
    generationRef.current += 1;
    if (params.syncedUserIdRef) {
      params.syncedUserIdRef.current = params.userId ? `syncing:${params.userId}` : null;
    }
    setStatus("syncing");
  }, [params.syncedUserIdRef, params.userId]);

  const markSynced = useCallback(() => {
    if (params.syncedUserIdRef) {
      params.syncedUserIdRef.current = params.userId;
    }
    setStatus("synced");
  }, [params.syncedUserIdRef, params.userId]);

  const markFailed = useCallback((error?: unknown) => {
    generationRef.current += 1;
    if (params.syncedUserIdRef) {
      params.syncedUserIdRef.current = null;
    }
    setStatus("failed");
    if (error !== undefined) {
      onErrorRef.current(error);
    }
  }, [params.syncedUserIdRef]);

  useEffect(() => {
    reset();
    return () => {
      generationRef.current += 1;
      if (params.syncedUserIdRef) {
        params.syncedUserIdRef.current = null;
      }
    };
  }, [params.ownerId, params.userId, reset]);

  useEffect(() => {
    if (!params.enabled && status === "syncing") {
      reset();
    }
  }, [params.enabled, reset, status]);

  useEffect(() => {
    if (!params.enabled || !params.userId || status !== "idle") {
      return;
    }

    const generation = generationRef.current + 1;
    generationRef.current = generation;
    if (params.syncedUserIdRef) {
      params.syncedUserIdRef.current = `syncing:${params.userId}`;
    }
    setStatus("syncing");

    void synchronizeRef.current().then(() => {
      if (generationRef.current === generation) {
        if (params.syncedUserIdRef) {
          params.syncedUserIdRef.current = params.userId;
        }
        setStatus("synced");
      }
    }).catch((error) => {
      if (generationRef.current !== generation) {
        return;
      }
      if (params.syncedUserIdRef) {
        params.syncedUserIdRef.current = null;
      }
      setStatus("failed");
      onErrorRef.current(error);
    });
  }, [params.enabled, params.syncedUserIdRef, params.userId, status]);

  return {
    isSynced: status === "synced",
    markFailed,
    markSynced,
    markSyncing,
    reset,
    status
  };
}
