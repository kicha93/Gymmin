import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";

import type { UserSession } from "../../domain/auth";
import {
  clearCachedAvatar,
  getCachedAvatarUri,
  refreshCachedAvatar
} from "../../domain/avatarCache";

type UseCachedAvatarOptions = {
  apiBaseUrl: string;
  user: UserSession | null;
};

export function useCachedAvatar({ apiBaseUrl, user }: UseCachedAvatarOptions) {
  const [cachedAvatarUri, setCachedAvatarUri] = useState<string | null>(null);
  const [hasAvatarImageLoadFailed, setHasAvatarImageLoadFailed] = useState(false);

  useEffect(() => {
    let isActive = true;
    setHasAvatarImageLoadFailed(false);

    if (!user?.id || !user.avatarUrl) {
      setCachedAvatarUri(null);
      if (user?.id && Platform.OS !== "web") {
        clearCachedAvatar(user.id);
      }
      return () => {
        isActive = false;
      };
    }

    if (Platform.OS === "web") {
      setCachedAvatarUri(null);
      return () => {
        isActive = false;
      };
    }

    setCachedAvatarUri(getCachedAvatarUri(user.id));

    void refreshCachedAvatar(apiBaseUrl, user)
      .then((uri) => {
        if (isActive) {
          setCachedAvatarUri(uri);
          setHasAvatarImageLoadFailed(false);
        }
      })
      .catch((error) => {
        if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
          console.warn("Could not refresh cached avatar", error);
        }
      });

    return () => {
      isActive = false;
    };
  }, [apiBaseUrl, user?.avatarUpdatedAt, user?.avatarUrl, user?.id, user?.token]);

  const clearAvatarCache = useCallback(() => {
    if (user?.id && Platform.OS !== "web") {
      clearCachedAvatar(user.id);
    }
    setCachedAvatarUri(null);
  }, [user?.id]);

  const markAvatarImageLoadFailed = useCallback(() => {
    setHasAvatarImageLoadFailed(true);
  }, []);

  return {
    cachedAvatarUri,
    clearAvatarCache,
    hasAvatarImageLoadFailed,
    markAvatarImageLoadFailed
  };
}
