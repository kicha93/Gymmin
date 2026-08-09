import { useCallback, useEffect, useRef, useState } from "react";

import {
  emptyLocalUserProfile,
  getUsableLocalAvatarUri,
  loadLocalUserProfile,
  removeLocalAvatar,
  replaceLocalAvatar,
  updateLocalUserDisplayName
} from "../../domain/localUserProfile";

export function useLocalUserProfile(isReady: boolean) {
  const [profile, setProfile] = useState(emptyLocalUserProfile);
  const [hasLoaded, setHasLoaded] = useState(false);
  const loadedRef = useRef(false);
  const profileRef = useRef(profile);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    let active = true;
    if (!isReady) return () => { active = false; };
    void loadLocalUserProfile().then((loaded) => {
      if (active) {
        profileRef.current = loaded;
        setProfile(loaded);
        setHasLoaded(true);
        loadedRef.current = true;
      }
    });
    return () => { active = false; };
  }, [isReady]);

  useEffect(() => {
    if (!loadedRef.current) return;
    const timeout = setTimeout(() => {
      const current = profileRef.current;
      void updateLocalUserDisplayName(current, current.displayName ?? "");
    }, 250);
    return () => clearTimeout(timeout);
  }, [profile.displayName]);

  const setDisplayName = useCallback((value: string) => {
    setProfile((current) => {
      const next = {
        ...current,
        displayName: value.slice(0, 120),
        updatedAt: new Date().toISOString(),
        version: 1 as const
      };
      profileRef.current = next;
      return next;
    });
  }, []);

  const setAvatar = useCallback(async (uri: string, mimeType?: string | null) => {
    const next = await replaceLocalAvatar(profileRef.current, uri, mimeType);
    profileRef.current = next;
    setProfile(next);
    return next;
  }, []);

  const clearAvatar = useCallback(async () => {
    const next = await removeLocalAvatar(profileRef.current);
    profileRef.current = next;
    setProfile(next);
    return next;
  }, []);

  const replaceProfile = useCallback((next: typeof profile) => {
    profileRef.current = next;
    setProfile(next);
  }, []);

  return {
    avatarUri: getUsableLocalAvatarUri(profile),
    clearAvatar,
    hasLoaded,
    profile,
    setAvatar,
    setDisplayName,
    setProfile: replaceProfile
  };
}
