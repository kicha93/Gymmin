export type AvatarUser = {
  avatarUrl?: string | null;
  avatarUpdatedAt?: string | null;
};

export type AvatarResponse = {
  avatarUrl?: string | null;
  avatarUpdatedAt?: string | null;
};

export function buildAvatarImageUri(apiBaseUrl: string, user?: AvatarUser | null) {
  const avatarUrl = user?.avatarUrl?.trim();
  if (!avatarUrl) {
    return null;
  }

  const baseUrl = apiBaseUrl.replace(/\/+$/, "");
  const resolvedUrl = avatarUrl.startsWith("http://") || avatarUrl.startsWith("https://")
    ? avatarUrl
    : `${baseUrl}${avatarUrl.startsWith("/") ? "" : "/"}${avatarUrl}`;

  if (!user?.avatarUpdatedAt || /[?&]v=/.test(resolvedUrl)) {
    return resolvedUrl;
  }

  const separator = resolvedUrl.includes("?") ? "&" : "?";
  return `${resolvedUrl}${separator}v=${encodeURIComponent(user.avatarUpdatedAt)}`;
}

export function applyAvatarResponse<TUser extends AvatarUser>(user: TUser, response: AvatarResponse): TUser {
  return {
    ...user,
    avatarUrl: response.avatarUrl ?? null,
    avatarUpdatedAt: response.avatarUpdatedAt ?? null
  };
}
