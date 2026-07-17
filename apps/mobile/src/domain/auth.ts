export type AuthUserResponse = {
  avatarUpdatedAt?: string | null;
  avatarUrl?: string | null;
  createdOn?: string | null;
  email: string;
  emailVerified?: boolean;
  id: string;
  modifiedOn?: string | null;
  name: string;
};

export type AuthApiResponse = {
  token: string;
  user: AuthUserResponse;
};

export type UserSession = {
  avatarUpdatedAt?: string | null;
  avatarUrl?: string | null;
  createdOn?: string | null;
  email: string;
  emailVerified: boolean;
  id: string;
  modifiedOn?: string | null;
  name: string;
  token: string;
};

export type AuthSessionResponse = {
  createdAt: string;
  deviceName?: string | null;
  expiresAt: string;
  id: string;
  isCurrent: boolean;
  lastSeenAt: string;
};

export type AuthSessionsResponse = {
  sessions: AuthSessionResponse[];
};

export type LocalAuthStorage = {
  updatedAt: string;
  user: AuthUserResponse;
  version: 2;
};

export type LegacyLocalAuthStorage = Partial<LocalAuthStorage> & {
  token?: string;
  version?: number;
};

export const AuthPasswordPolicy = {
  isValid(password: string) {
    return password.trim().length >= 8 && password.length <= 200;
  }
};

export function createUserSession(
  authResponse: AuthApiResponse,
  fallbackName: string
): UserSession {
  return {
    avatarUpdatedAt: authResponse.user.avatarUpdatedAt ?? null,
    avatarUrl: authResponse.user.avatarUrl ?? null,
    createdOn: authResponse.user.createdOn ?? null,
    email: authResponse.user.email,
    emailVerified: authResponse.user.emailVerified === true,
    id: authResponse.user.id,
    modifiedOn: authResponse.user.modifiedOn ?? null,
    name: authResponse.user.name || fallbackName,
    token: authResponse.token
  };
}
