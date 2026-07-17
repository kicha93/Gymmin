import type {
  AuthApiResponse,
  AuthSessionResponse,
  AuthUserResponse
} from "../domain/auth";

type RequestApi = (endpoint: string, init?: RequestInit) => Promise<Response>;
type CreateApiError = (
  response: Response,
  endpoint: string,
  method: string,
  fallbackMessage: string
) => Promise<Error>;

export function createAuthApiClient(dependencies: {
  createError: CreateApiError;
  request: RequestApi;
}) {
  async function requireSuccess(
    endpoint: string,
    init: RequestInit,
    fallbackMessage: string
  ) {
    const response = await dependencies.request(endpoint, init);
    if (!response.ok) {
      throw await dependencies.createError(
        response,
        endpoint,
        init.method ?? "GET",
        fallbackMessage
      );
    }
    return response;
  }

  return {
    async getCurrentUser(
      headers: Record<string, string>,
      fallbackMessage: string
    ): Promise<AuthUserResponse | null> {
      const response = await requireSuccess("/api/auth/me", { headers }, fallbackMessage);
      const value = await response.json().catch(() => null);
      return isAuthUserResponse(value) ? value : null;
    },

    async authenticate(
      endpoint: "login" | "register",
      body: Record<string, string>,
      headers: Record<string, string>,
      fallbackMessage: string
    ): Promise<AuthApiResponse> {
      const path = `/api/auth/${endpoint}`;
      const response = await requireSuccess(path, {
        body: JSON.stringify(body),
        headers,
        method: "POST"
      }, fallbackMessage);
      const value = await response.json().catch(() => null);
      if (!isAuthApiResponse(value)) {
        throw new Error(fallbackMessage);
      }
      return value;
    },

    async requestEmailVerification(
      headers: Record<string, string>,
      fallbackMessage: string
    ) {
      await requireSuccess("/api/auth/email-verification/request", {
        headers,
        method: "POST"
      }, fallbackMessage);
    },

    async confirmEmailVerification(
      code: string,
      headers: Record<string, string>,
      fallbackMessage: string
    ): Promise<AuthUserResponse> {
      const response = await requireSuccess("/api/auth/email-verification/confirm", {
        body: JSON.stringify({ code }),
        headers: { ...headers, "Content-Type": "application/json" },
        method: "POST"
      }, fallbackMessage);
      const value = await response.json().catch(() => null);
      if (!isAuthUserResponse(value)) {
        throw new Error(fallbackMessage);
      }
      return value;
    },

    async requestPasswordReset(
      email: string,
      headers: Record<string, string>,
      fallbackMessage: string
    ) {
      await requireSuccess("/api/auth/password-reset/request", {
        body: JSON.stringify({ email }),
        headers: { ...headers, "Content-Type": "application/json" },
        method: "POST"
      }, fallbackMessage);
    },

    async confirmPasswordReset(
      token: string,
      newPassword: string,
      headers: Record<string, string>,
      fallbackMessage: string
    ) {
      await requireSuccess("/api/auth/password-reset/confirm", {
        body: JSON.stringify({ token, newPassword }),
        headers: { ...headers, "Content-Type": "application/json" },
        method: "POST"
      }, fallbackMessage);
    },

    async changePassword(
      currentPassword: string,
      newPassword: string,
      headers: Record<string, string>,
      fallbackMessage: string
    ) {
      await requireSuccess("/api/auth/change-password", {
        body: JSON.stringify({ currentPassword, newPassword }),
        headers: { ...headers, "Content-Type": "application/json" },
        method: "POST"
      }, fallbackMessage);
    },

    async getSessions(
      headers: Record<string, string>,
      fallbackMessage: string
    ): Promise<AuthSessionResponse[]> {
      const response = await requireSuccess("/api/auth/sessions", { headers }, fallbackMessage);
      return normalizeAuthSessionsResponse(await response.json().catch(() => null));
    },

    async revokeSession(
      sessionId: string,
      headers: Record<string, string>,
      fallbackMessage: string
    ) {
      await requireSuccess(`/api/auth/sessions/${encodeURIComponent(sessionId)}`, {
        headers,
        method: "DELETE"
      }, fallbackMessage);
    },

    async logoutAll(
      headers: Record<string, string>,
      fallbackMessage: string
    ) {
      await requireSuccess("/api/auth/logout-all", {
        body: JSON.stringify({ exceptCurrent: false }),
        headers: { ...headers, "Content-Type": "application/json" },
        method: "POST"
      }, fallbackMessage);
    },

    async logout(
      headers: Record<string, string>,
      fallbackMessage: string
    ) {
      await requireSuccess("/api/auth/logout", {
        headers,
        method: "POST"
      }, fallbackMessage);
    }
  };
}

export function normalizeAuthSessionsResponse(value: unknown): AuthSessionResponse[] {
  if (!isRecord(value) || !Array.isArray(value.sessions)) {
    return [];
  }

  return value.sessions.flatMap((session) => {
    if (!isRecord(session)) {
      return [];
    }
    const id = normalizeString(session.id);
    const createdAt = normalizeString(session.createdAt);
    const expiresAt = normalizeString(session.expiresAt);
    const lastSeenAt = normalizeString(session.lastSeenAt);
    if (!id || !createdAt || !expiresAt || !lastSeenAt) {
      return [];
    }
    return [{
      createdAt,
      deviceName: typeof session.deviceName === "string" ? session.deviceName : null,
      expiresAt,
      id,
      isCurrent: session.isCurrent === true,
      lastSeenAt
    }];
  });
}

function isAuthApiResponse(value: unknown): value is AuthApiResponse {
  return isRecord(value) && normalizeString(value.token).length > 0 && isAuthUserResponse(value.user);
}

function isAuthUserResponse(value: unknown): value is AuthUserResponse {
  return isRecord(value)
    && normalizeString(value.id).length > 0
    && normalizeString(value.email).length > 0
    && typeof value.name === "string";
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
