import {
  getClientSessionId,
  getDeletedWorkoutSessionIds,
  getWorkoutSessionUpdatedAt,
  mergeWorkoutSessions,
  normalizeWorkoutSessions,
  WORKOUT_SESSIONS_SYNC_STORAGE_BASE_KEY,
  type WorkoutSession,
  type WorkoutSessionsSyncMetadata
} from "./workoutSessions";
import { loadAccountJson, saveAccountJson } from "./accountStorage";

export type ApiWorkoutSessionEnvelope = {
  clientSessionId: string;
  clientUpdatedAt?: string;
  deletedAt?: string | null;
  serverUpdatedAt?: string;
  session?: WorkoutSession;
};

export type ApiWorkoutSessionsResponse = {
  sessions: ApiWorkoutSessionEnvelope[];
  serverTime?: string;
};

export type WorkoutSessionSyncRequest = {
  deletedClientSessionIds: string[];
  lastPulledAt: string | null;
  sessions: Array<{
    clientSessionId: string;
    clientUpdatedAt: string;
    deletedAt: string | null;
    session: WorkoutSession;
  }>;
};

export function buildWorkoutSessionSyncRequest(
  sessions: WorkoutSession[],
  lastPulledAt: string | null
): WorkoutSessionSyncRequest {
  const normalizedSessions = normalizeWorkoutSessions(sessions);
  return {
    deletedClientSessionIds: getDeletedWorkoutSessionIds(normalizedSessions),
    lastPulledAt,
    sessions: normalizedSessions.map((session) => ({
      clientSessionId: getClientSessionId(session),
      clientUpdatedAt: getWorkoutSessionUpdatedAt(session),
      deletedAt: session.deletedAt ?? null,
      session
    }))
  };
}

export function normalizeApiWorkoutSessionsResponse(value: unknown): ApiWorkoutSessionsResponse {
  if (!isRecord(value)) {
    return { sessions: [] };
  }

  const sessions = Array.isArray(value.sessions)
    ? value.sessions
        .filter(isRecord)
        .map((envelope): ApiWorkoutSessionEnvelope | null => {
          const clientSessionId = normalizeString(envelope.clientSessionId);
          if (!clientSessionId) {
            return null;
          }

          const normalizedSession = normalizeWorkoutSessions([
            isRecord(envelope.session)
              ? {
                  ...envelope.session,
                  deletedAt: typeof envelope.deletedAt === "string"
                    ? envelope.deletedAt
                    : envelope.session.deletedAt ?? null,
                  id: clientSessionId,
                  updatedAt: typeof envelope.clientUpdatedAt === "string"
                    ? envelope.clientUpdatedAt
                    : typeof envelope.session.updatedAt === "string"
                      ? envelope.session.updatedAt
                      : undefined
                }
              : null
          ])[0];
          if (!normalizedSession) {
            return null;
          }

          return {
            clientSessionId,
            clientUpdatedAt: typeof envelope.clientUpdatedAt === "string"
              ? envelope.clientUpdatedAt
              : normalizedSession.updatedAt,
            deletedAt: typeof envelope.deletedAt === "string" ? envelope.deletedAt : null,
            serverUpdatedAt: typeof envelope.serverUpdatedAt === "string"
              ? envelope.serverUpdatedAt
              : undefined,
            session: normalizedSession
          };
        })
        .filter((envelope): envelope is ApiWorkoutSessionEnvelope => envelope !== null)
    : [];

  return {
    sessions,
    serverTime: typeof value.serverTime === "string" ? value.serverTime : undefined
  };
}

export async function loadWorkoutSessionsSyncMetadata(
  userId: string
): Promise<WorkoutSessionsSyncMetadata> {
  try {
    const parsed = await loadAccountJson<Partial<WorkoutSessionsSyncMetadata>>(
      WORKOUT_SESSIONS_SYNC_STORAGE_BASE_KEY,
      userId
    );
    return {
      lastPulledAt: typeof parsed?.lastPulledAt === "string" ? parsed.lastPulledAt : null,
      lastPushedAt: typeof parsed?.lastPushedAt === "string" ? parsed.lastPushedAt : null,
      userId: typeof parsed?.userId === "string" ? parsed.userId : null
    };
  } catch (error) {
    console.error("Failed to load workout sessions sync metadata", error);
    return {};
  }
}

export async function saveWorkoutSessionsSyncMetadata(
  userId: string,
  metadata: WorkoutSessionsSyncMetadata
) {
  await saveAccountJson(WORKOUT_SESSIONS_SYNC_STORAGE_BASE_KEY, metadata, userId);
}

export async function synchronizeWorkoutSessions(params: {
  forceFullPull?: boolean;
  localSessions: WorkoutSession[];
  request: (body: WorkoutSessionSyncRequest) => Promise<unknown>;
  userId: string;
}) {
  const normalizedLocalSessions = normalizeWorkoutSessions(params.localSessions);
  const metadata = await loadWorkoutSessionsSyncMetadata(params.userId);
  const lastPulledAt = params.forceFullPull || metadata.userId !== params.userId
    ? null
    : metadata.lastPulledAt ?? null;
  const response = normalizeApiWorkoutSessionsResponse(
    await params.request(buildWorkoutSessionSyncRequest(normalizedLocalSessions, lastPulledAt))
  );
  const remoteSessions = normalizeWorkoutSessions(
    response.sessions.map((envelope) => envelope.session).filter(Boolean)
  );
  const mergedSessions = mergeWorkoutSessions(normalizedLocalSessions, remoteSessions);

  await saveWorkoutSessionsSyncMetadata(params.userId, {
    lastPulledAt: response.serverTime ?? new Date().toISOString(),
    lastPushedAt: new Date().toISOString(),
    userId: params.userId
  });
  return mergedSessions;
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
