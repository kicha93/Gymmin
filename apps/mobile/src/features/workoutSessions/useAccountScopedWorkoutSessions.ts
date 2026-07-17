import { useEffect, useRef, useState } from "react";

import { clampWorkoutSessionEntryIndex } from "../../domain/workoutSessionPresentation";
import { normalizeWorkoutSessions, type WorkoutSession } from "../../domain/workoutSessions";
import {
  loadActiveWorkoutSessionForOwner,
  loadWorkoutSessionsForOwner,
  saveActiveWorkoutSessionForOwner,
  saveWorkoutSessionsForOwner
} from "../../storage/localDataRepositories";

export function useAccountScopedWorkoutSessions(
  storageOwnerId: string,
  hasLoadedAccountStorageMigration: boolean
) {
  const [workoutSessions, setWorkoutSessions] = useState<WorkoutSession[]>([]);
  const [activeWorkoutSessionId, setActiveWorkoutSessionId] = useState<string | null>(null);
  const [sessionEntryIndex, setSessionEntryIndex] = useState(0);
  const [hasLoadedWorkoutSessions, setHasLoadedWorkoutSessions] = useState(false);
  const [loadedWorkoutSessionsOwnerId, setLoadedWorkoutSessionsOwnerId] = useState<string | null>(null);
  const activeWorkoutSessionEntryIndexRef = useRef<Record<string, number>>({});

  useEffect(() => {
    let isMounted = true;

    async function loadSessions() {
      if (!hasLoadedAccountStorageMigration) {
        return;
      }

      const ownerId = storageOwnerId;
      setHasLoadedWorkoutSessions(false);
      setLoadedWorkoutSessionsOwnerId(null);
      activeWorkoutSessionEntryIndexRef.current = {};

      const [normalizedSessions, activeProgress] = await Promise.all([
        loadWorkoutSessionsForOwner(ownerId),
        loadActiveWorkoutSessionForOwner(ownerId)
      ]);
      if (!isMounted) {
        return;
      }

      setWorkoutSessions(normalizedSessions);
      const activeSession = normalizedSessions.find(
        (session) => session.status === "active" && !session.deletedAt
      );
      const restoredEntryIndex = activeSession && activeProgress.sessionId === activeSession.id
        ? clampWorkoutSessionEntryIndex(activeProgress.entryIndex, activeSession)
        : 0;

      setActiveWorkoutSessionId(activeSession?.id ?? null);
      setSessionEntryIndex(restoredEntryIndex);
      if (activeSession) {
        activeWorkoutSessionEntryIndexRef.current[activeSession.id] = restoredEntryIndex;
      }
      setLoadedWorkoutSessionsOwnerId(ownerId);
      setHasLoadedWorkoutSessions(true);
    }

    void loadSessions();
    return () => {
      isMounted = false;
    };
  }, [hasLoadedAccountStorageMigration, storageOwnerId]);

  useEffect(() => {
    if (!hasLoadedWorkoutSessions || loadedWorkoutSessionsOwnerId !== storageOwnerId) {
      return;
    }

    saveWorkoutSessionsForOwner(
      storageOwnerId,
      normalizeWorkoutSessions(workoutSessions)
    ).catch((error) => {
      console.error("Failed to save workout sessions", error);
    });
  }, [
    hasLoadedWorkoutSessions,
    loadedWorkoutSessionsOwnerId,
    storageOwnerId,
    workoutSessions
  ]);

  useEffect(() => {
    if (!hasLoadedWorkoutSessions || loadedWorkoutSessionsOwnerId !== storageOwnerId) {
      return;
    }

    const session = activeWorkoutSessionId
      ? workoutSessions.find(
          (item) => item.id === activeWorkoutSessionId && item.status === "active" && !item.deletedAt
        )
      : null;
    const entryIndex = session
      ? clampWorkoutSessionEntryIndex(sessionEntryIndex, session)
      : 0;

    if (session) {
      activeWorkoutSessionEntryIndexRef.current[session.id] = entryIndex;
    }

    saveActiveWorkoutSessionForOwner(
      storageOwnerId,
      session?.id ?? null,
      entryIndex
    ).catch((error) => {
      console.error("Failed to save active workout session progress", error);
    });
  }, [
    activeWorkoutSessionId,
    hasLoadedWorkoutSessions,
    loadedWorkoutSessionsOwnerId,
    sessionEntryIndex,
    storageOwnerId,
    workoutSessions
  ]);

  return {
    activeWorkoutSessionEntryIndexRef,
    activeWorkoutSessionId,
    hasLoadedWorkoutSessions,
    loadedWorkoutSessionsOwnerId,
    sessionEntryIndex,
    setActiveWorkoutSessionId,
    setSessionEntryIndex,
    setWorkoutSessions,
    workoutSessions
  };
}
