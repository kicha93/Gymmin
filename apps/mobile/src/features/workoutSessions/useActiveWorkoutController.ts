import type { Dispatch, MutableRefObject, SetStateAction } from "react";

import { clampWorkoutSessionEntryIndex } from "../../domain/workoutSessionPresentation";
import {
  completeWorkoutSession,
  createWorkoutSessionFromWorkout,
  markWorkoutSessionDeleted,
  type WorkoutExecutionMode,
  type WorkoutSession,
  type WorkoutSessionEntry
} from "../../domain/workoutSessions";
import type { SavedWorkout } from "../../domain/savedWorkouts";

type UseActiveWorkoutControllerOptions = {
  activeSession: WorkoutSession | null;
  activeSessionId: string | null;
  entryIndex: number;
  entryIndexBySessionRef: MutableRefObject<Record<string, number>>;
  onEmptyWorkout: () => void;
  onFinished: () => void;
  onNavigate: (screen: "home" | "workoutDetail" | "workoutSession") => void;
  savedWorkouts: SavedWorkout[];
  selectedWorkoutId: string;
  sessions: WorkoutSession[];
  setActiveSessionId: Dispatch<SetStateAction<string | null>>;
  setEntryIndex: Dispatch<SetStateAction<number>>;
  setIsPostWorkoutFillMode: Dispatch<SetStateAction<boolean>>;
  setSelectedWorkoutId: Dispatch<SetStateAction<string>>;
  setSessions: Dispatch<SetStateAction<WorkoutSession[]>>;
};

export function useActiveWorkoutController(options: UseActiveWorkoutControllerOptions) {
  function resetActiveSession(sessionId: string) {
    delete options.entryIndexBySessionRef.current[sessionId];
    options.setActiveSessionId(null);
    options.setEntryIndex(0);
    options.setIsPostWorkoutFillMode(false);
  }

  function start(executionMode: WorkoutExecutionMode) {
    const savedWorkout = options.savedWorkouts.find((item) => item.id === options.selectedWorkoutId);
    if (!savedWorkout) return;

    const session = createWorkoutSessionFromWorkout(savedWorkout.draft, savedWorkout.id, executionMode);
    if (!session.entries.length) {
      options.onEmptyWorkout();
      return;
    }
    options.setSessions((current) => [session, ...current]);
    options.setActiveSessionId(session.id);
    options.entryIndexBySessionRef.current[session.id] = 0;
    options.setEntryIndex(0);
    options.setIsPostWorkoutFillMode(false);
    options.onNavigate("workoutSession");
  }

  function continueSession(sessionId = options.activeSessionId) {
    if (!sessionId) return;
    const session = options.sessions.find((item) => item.id === sessionId);
    if (session) {
      options.setSelectedWorkoutId(session.sourceWorkoutId);
    }
    options.setActiveSessionId(sessionId);
    options.setEntryIndex(clampWorkoutSessionEntryIndex(
      options.entryIndexBySessionRef.current[sessionId] ?? options.entryIndex,
      session
    ));
    options.setIsPostWorkoutFillMode(false);
    options.onNavigate("workoutSession");
  }

  function updateEntry(entryId: string, patch: Partial<WorkoutSessionEntry>) {
    if (!options.activeSessionId) return;
    options.setSessions((current) => current.map((session) => session.id === options.activeSessionId
      ? {
          ...session,
          entries: session.entries.map((entry) => entry.id === entryId ? { ...entry, ...patch } : entry),
          updatedAt: new Date().toISOString()
        }
      : session));
  }

  function finish() {
    if (!options.activeSession) return;
    const completed = completeWorkoutSession(options.activeSession);
    options.setSessions((current) => current.map((session) => session.id === completed.id ? completed : session));
    options.setSelectedWorkoutId(options.activeSession.sourceWorkoutId);
    resetActiveSession(options.activeSession.id);
    options.onNavigate("workoutDetail");
    options.onFinished();
  }

  function abandon() {
    if (!options.activeSession) return;
    const deleted = markWorkoutSessionDeleted(options.activeSession);
    options.setSessions((current) => current.map((session) => session.id === deleted.id ? deleted : session));
    resetActiveSession(options.activeSession.id);
    options.onNavigate("home");
  }

  return { abandon, continueSession, finish, start, updateEntry };
}
