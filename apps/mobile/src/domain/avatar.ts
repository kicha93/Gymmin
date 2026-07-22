export type AvatarUser = {
  avatarUrl?: string | null;
  avatarUpdatedAt?: string | null;
};

export type AvatarResponse = {
  avatarUrl?: string | null;
  avatarUpdatedAt?: string | null;
};

export type AvatarImageSource = {
  headers?: Record<string, string>;
  uri: string;
};

export function resolveAvatarImageSource(options: {
  cachedUri: string | null;
  hasLoadFailed: boolean;
  isWeb: boolean;
  remoteSource: AvatarImageSource | null;
}): AvatarImageSource | null {
  if (options.hasLoadFailed) {
    return null;
  }
  if (!options.isWeb && options.cachedUri) {
    return { uri: options.cachedUri };
  }
  if (!options.isWeb) {
    return null;
  }
  return options.remoteSource;
}

export function getSafeAvatarCacheKey(userId: string) {
  return userId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 100) || "user";
}

export function getAvatarExtension(contentType: string | null) {
  const normalized = (contentType ?? "").split(";")[0].trim().toLowerCase();
  if (normalized === "image/png") return "png";
  if (normalized === "image/webp") return "webp";
  return normalized === "image/jpeg" || normalized === "image/jpg" ? "jpg" : null;
}

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

export function buildAvatarImageSource(apiBaseUrl: string, user?: (AvatarUser & { token?: string | null }) | null): AvatarImageSource | null {
  const uri = buildAvatarImageUri(apiBaseUrl, user);
  if (!uri) {
    return null;
  }

  const token = user?.token?.trim();
  if (!token || !hasSameOrigin(apiBaseUrl, uri)) {
    return { uri };
  }

  return {
    headers: {
      Authorization: `Bearer ${token}`
    },
    uri
  };
}

function hasSameOrigin(apiBaseUrl: string, resourceUrl: string) {
  try {
    return new URL(apiBaseUrl).origin === new URL(resourceUrl).origin;
  } catch {
    return false;
  }
}

export function applyAvatarResponse<TUser extends AvatarUser>(user: TUser, response: AvatarResponse): TUser {
  return {
    ...user,
    avatarUrl: response.avatarUrl ?? null,
    avatarUpdatedAt: response.avatarUpdatedAt ?? null
  };
}
