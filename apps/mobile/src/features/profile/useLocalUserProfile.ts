import { useCallback, useEffect, useRef, useState } from "react";

import {
  emptyLocalUserProfile,
  getUsableLocalAvatarUri,
  loadLocalUserProfile,
  removeLocalAvatar,
  replaceLocalAvatar
} from "../../domain/localUserProfile";

export function useLocalUserProfile(isReady: boolean) {
  const [profile, setProfile] = useState(emptyLocalUserProfile);
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
      }
    });
    return () => { active = false; };
  }, [isReady]);

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
    profile,
    setAvatar,
    setProfile: replaceProfile
  };
}
