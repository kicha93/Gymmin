import { useCallback, useEffect, useRef, useState } from "react";

import { buildApiHeaders, requestApi } from "../../api/apiClient";
import {
  createOfflineSystemStatus,
  normalizeSystemStatusResponse,
  shouldFetchSystemStatus,
  type SystemStatusState
} from "../../domain/systemStatus";

export function useSystemStatusController(apiBaseUrl: string, isHomeActive: boolean) {
  const [systemStatus, setSystemStatus] = useState<SystemStatusState>({
    kind: "ok",
    message: null,
    updatedAt: null
  });
  const [isSystemStatusRefreshing, setIsSystemStatusRefreshing] = useState(false);
  const fetchedAtRef = useRef<number | null>(null);

  const refreshSystemStatus = useCallback(async (force = false) => {
    if (!force && !shouldFetchSystemStatus(fetchedAtRef.current, Date.now())) {
      return;
    }

    setIsSystemStatusRefreshing(true);
    try {
      const response = await requestApi(apiBaseUrl, "/api/system/status", {
        headers: buildApiHeaders(null),
        method: "GET"
      });
      if (!response.ok) {
        throw new Error(`System status failed with status ${response.status}`);
      }

      const nextStatus = normalizeSystemStatusResponse(
        await response.json().catch(() => null)
      );
      setSystemStatus(nextStatus);
      fetchedAtRef.current = Date.now();
    } catch (error) {
      console.error("Failed to refresh system status", error);
      setSystemStatus(createOfflineSystemStatus());
      fetchedAtRef.current = Date.now();
    } finally {
      setIsSystemStatusRefreshing(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    if (isHomeActive) {
      void refreshSystemStatus(false);
    }
  }, [isHomeActive, refreshSystemStatus]);

  return {
    isSystemStatusRefreshing,
    refreshSystemStatus,
    systemStatus
  };
}
