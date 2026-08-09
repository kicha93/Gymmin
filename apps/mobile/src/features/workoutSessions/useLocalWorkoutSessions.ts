import { useEffect, useRef, useState } from "react";

import { clampWorkoutSessionEntryIndex } from "../../domain/workoutSessionPresentation";
import { normalizeWorkoutSessions, type WorkoutSession } from "../../domain/workoutSessions";
import {
  loadLocalActiveWorkoutSession,
  loadLocalWorkoutSessions,
  saveLocalActiveWorkoutSession,
  saveLocalWorkoutSessions
} from "../../storage/localDataRepositories";

export function useLocalWorkoutSessions(
  hasLoadedAccountStorageMigration: boolean
) {
  const [workoutSessions, setWorkoutSessions] = useState<WorkoutSession[]>([]);
  const [activeWorkoutSessionId, setActiveWorkoutSessionId] = useState<string | null>(null);
  const [sessionEntryIndex, setSessionEntryIndex] = useState(0);
  const [hasLoadedWorkoutSessions, setHasLoadedWorkoutSessions] = useState(false);
  const activeWorkoutSessionEntryIndexRef = useRef<Record<string, number>>({});

  useEffect(() => {
    let isMounted = true;

    async function loadSessions() {
      if (!hasLoadedAccountStorageMigration) {
        return;
      }

      setHasLoadedWorkoutSessions(false);
      activeWorkoutSessionEntryIndexRef.current = {};

      const [normalizedSessions, activeProgress] = await Promise.all([
        loadLocalWorkoutSessions(),
        loadLocalActiveWorkoutSession()
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
      setHasLoadedWorkoutSessions(true);
    }

    void loadSessions();
    return () => {
      isMounted = false;
    };
  }, [hasLoadedAccountStorageMigration]);

  useEffect(() => {
    if (!hasLoadedWorkoutSessions) {
      return;
    }

    saveLocalWorkoutSessions(
      normalizeWorkoutSessions(workoutSessions)
    ).catch((error) => {
      console.error("Failed to save workout sessions", error);
    });
  }, [
    hasLoadedWorkoutSessions,
    workoutSessions
  ]);

  useEffect(() => {
    if (!hasLoadedWorkoutSessions) {
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

    saveLocalActiveWorkoutSession(
      session?.id ?? null,
      entryIndex
    ).catch((error) => {
      console.error("Failed to save active workout session progress", error);
    });
  }, [
    activeWorkoutSessionId,
    hasLoadedWorkoutSessions,
    sessionEntryIndex,
    workoutSessions
  ]);

  return {
    activeWorkoutSessionEntryIndexRef,
    activeWorkoutSessionId,
    hasLoadedWorkoutSessions,
    sessionEntryIndex,
    setActiveWorkoutSessionId,
    setSessionEntryIndex,
    setWorkoutSessions,
    workoutSessions
  };
}
