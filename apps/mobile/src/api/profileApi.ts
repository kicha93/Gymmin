import type { AvatarResponse } from "../domain/avatar";

type RequestApi = (endpoint: string, init?: RequestInit) => Promise<Response>;
type CreateApiError = (
  response: Response,
  endpoint: string,
  method: string,
  fallbackMessage: string
) => Promise<Error>;

export function createProfileApiClient(dependencies: {
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

  async function readAvatarResponse(response: Response, fallback: AvatarResponse) {
    const value = await response.json().catch(() => null);
    if (!isRecord(value)) {
      return fallback;
    }
    return {
      avatarUpdatedAt: typeof value.avatarUpdatedAt === "string" ? value.avatarUpdatedAt : null,
      avatarUrl: typeof value.avatarUrl === "string" ? value.avatarUrl : null
    } satisfies AvatarResponse;
  }

  return {
    async uploadAvatar(
      avatar: FormData,
      headers: Record<string, string>,
      fallbackMessage: string
    ) {
      const response = await requireSuccess("/api/profile/avatar", {
        body: avatar,
        headers,
        method: "POST"
      }, fallbackMessage);
      return readAvatarResponse(response, {});
    },

    async removeAvatar(
      headers: Record<string, string>,
      fallbackMessage: string
    ) {
      const response = await requireSuccess("/api/profile/avatar", {
        headers,
        method: "DELETE"
      }, fallbackMessage);
      return readAvatarResponse(response, { avatarUpdatedAt: null, avatarUrl: null });
    },

    async deleteAccount(
      password: string,
      headers: Record<string, string>,
      fallbackMessage: string
    ) {
      await requireSuccess("/api/account", {
        body: JSON.stringify({ password }),
        headers: { ...headers, "Content-Type": "application/json" },
        method: "DELETE"
      }, fallbackMessage);
    }
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
