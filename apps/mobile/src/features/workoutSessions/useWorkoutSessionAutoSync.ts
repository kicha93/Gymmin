import { useEffect, useRef, type Dispatch, type MutableRefObject, type SetStateAction } from "react";

import { normalizeWorkoutSessions, type WorkoutSession } from "../../domain/workoutSessions";

const activeWorkoutSessionSyncDebounceMs = 1600;
const idleWorkoutSessionSyncDebounceMs = 250;

type WorkoutSessionAutoSyncOptions = {
  hasActiveWorkoutSession: boolean;
  isApplyingRemoteSessionsRef: MutableRefObject<boolean>;
  isLoadedForOwner: boolean;
  isRemoteSyncReady: boolean;
  ownerId: string;
  sessions: WorkoutSession[];
  setSessions: Dispatch<SetStateAction<WorkoutSession[]>>;
  syncSessions: ((sessions: WorkoutSession[]) => Promise<WorkoutSession[]>) | null;
};

export function useWorkoutSessionAutoSync(options: WorkoutSessionAutoSyncOptions) {
  const hasObservedLocalBaselineRef = useRef(false);
  const requestIdRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncSessionsRef = useRef(options.syncSessions);
  syncSessionsRef.current = options.syncSessions;

  useEffect(() => {
    hasObservedLocalBaselineRef.current = false;
    requestIdRef.current += 1;
    options.isApplyingRemoteSessionsRef.current = false;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [options.isApplyingRemoteSessionsRef, options.ownerId]);

  useEffect(() => {
    if (!options.isLoadedForOwner) {
      return;
    }

    const clearPendingSync = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    if (options.isApplyingRemoteSessionsRef.current || !options.isRemoteSyncReady) {
      hasObservedLocalBaselineRef.current = true;
      clearPendingSync();
      return;
    }

    if (!hasObservedLocalBaselineRef.current) {
      hasObservedLocalBaselineRef.current = true;
      return;
    }

    const syncSessions = syncSessionsRef.current;
    if (!syncSessions) {
      clearPendingSync();
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    clearPendingSync();

    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      void syncSessions(normalizeWorkoutSessions(options.sessions))
        .then((mergedSessions) => {
          if (requestIdRef.current !== requestId) {
            return;
          }

          options.isApplyingRemoteSessionsRef.current = true;
          options.setSessions(mergedSessions);
          setTimeout(() => {
            options.isApplyingRemoteSessionsRef.current = false;
          }, 0);
        })
        .catch((error) => {
          if (requestIdRef.current === requestId) {
            console.error("Failed to sync workout sessions", error);
          }
        });
    }, options.hasActiveWorkoutSession
      ? activeWorkoutSessionSyncDebounceMs
      : idleWorkoutSessionSyncDebounceMs);

    return clearPendingSync;
  }, [
    options.hasActiveWorkoutSession,
    options.isApplyingRemoteSessionsRef,
    options.isLoadedForOwner,
    options.isRemoteSyncReady,
    options.sessions,
    options.setSessions
  ]);
}
