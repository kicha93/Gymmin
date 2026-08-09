import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File, Paths } from "expo-file-system";

import { clearPreparedLocalAvatar, prepareAvatarForLocalStorage } from "./localAvatarImage";
import { getLocalOnlyStorageKey } from "./localOnlyStorageMigration";
import { base64ToBytes, bytesToBase64 } from "./workoutExport/workoutExportEncoding";

export const LOCAL_USER_PROFILE_STORAGE_BASE_KEY = "userProfile.v1";
export const LOCAL_AVATAR_BACKUP_MAX_BYTES = 1_000_000;

export type LocalUserProfile = {
  avatarPath?: string;
  displayName?: string;
  updatedAt: string;
  version: 1;
};

export type LocalUserProfileBackup = {
  avatar?: {
    base64: string;
    mimeType: "image/jpeg";
  };
  displayName?: string;
};

export type StagedLocalUserProfileImport = {
  nextProfile: LocalUserProfile;
  newAvatarPath?: string;
  previousAvatarPath?: string;
};

export const emptyLocalUserProfile: LocalUserProfile = {
  updatedAt: new Date(0).toISOString(),
  version: 1
};

function profileStorageKey() {
  return getLocalOnlyStorageKey(LOCAL_USER_PROFILE_STORAGE_BASE_KEY);
}

function profileDirectory() {
  return new Directory(Paths.document, "gymmin-profile");
}

function normalizeDisplayName(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 120) : "";
}

export function normalizeLocalUserProfile(value: unknown): LocalUserProfile {
  const record = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const displayName = normalizeDisplayName(record.displayName);
  const avatarPath = typeof record.avatarPath === "string" && record.avatarPath.startsWith("file:")
    ? record.avatarPath
    : undefined;
  return {
    ...(avatarPath ? { avatarPath } : {}),
    ...(displayName ? { displayName } : {}),
    updatedAt: typeof record.updatedAt === "string" && Number.isFinite(Date.parse(record.updatedAt))
      ? new Date(record.updatedAt).toISOString()
      : new Date(0).toISOString(),
    version: 1
  };
}

export async function loadLocalUserProfile() {
  const raw = await AsyncStorage.getItem(profileStorageKey());
  if (!raw) return emptyLocalUserProfile;
  try {
    return normalizeLocalUserProfile(JSON.parse(raw));
  } catch {
    return emptyLocalUserProfile;
  }
}

export async function saveLocalUserProfile(profile: LocalUserProfile) {
  const normalized = normalizeLocalUserProfile(profile);
  await AsyncStorage.setItem(profileStorageKey(), JSON.stringify(normalized));
  return normalized;
}

export async function updateLocalUserDisplayName(profile: LocalUserProfile, displayName: string) {
  return saveLocalUserProfile({
    ...profile,
    displayName: normalizeDisplayName(displayName) || undefined,
    updatedAt: new Date().toISOString(),
    version: 1
  });
}

export function getUsableLocalAvatarUri(profile: LocalUserProfile) {
  if (!profile.avatarPath) return null;
  try {
    const file = new File(profile.avatarPath);
    return file.exists && file.size > 0 ? file.uri : null;
  } catch {
    return null;
  }
}

export async function replaceLocalAvatar(
  profile: LocalUserProfile,
  sourceUri: string,
  mimeType?: string | null
) {
  const prepared = await prepareAvatarForLocalStorage(sourceUri, mimeType);
  let pendingFile: File | null = null;
  try {
    const bytes = await new File(prepared.uri).bytes();
    if (!bytes.byteLength) throw new Error("Prepared avatar is empty.");
    const directory = profileDirectory();
    directory.create({ idempotent: true, intermediates: true });
    const stamp = Date.now();
    pendingFile = new File(directory, `avatar-${stamp}.pending.jpg`);
    const finalFile = new File(directory, `avatar-${stamp}.jpg`);
    pendingFile.create({ intermediates: true, overwrite: true });
    pendingFile.write(bytes);
    await pendingFile.move(finalFile, { overwrite: true });
    pendingFile = null;
    const next = await saveLocalUserProfile({
      ...profile,
      avatarPath: finalFile.uri,
      updatedAt: new Date().toISOString(),
      version: 1
    });
    deleteAvatarFile(profile.avatarPath, finalFile.uri);
    return next;
  } finally {
    if (pendingFile?.exists) pendingFile.delete();
    clearPreparedLocalAvatar(prepared);
  }
}

export async function removeLocalAvatar(profile: LocalUserProfile) {
  const previousPath = profile.avatarPath;
  const next = await saveLocalUserProfile({
    ...profile,
    avatarPath: undefined,
    updatedAt: new Date().toISOString(),
    version: 1
  });
  deleteAvatarFile(previousPath);
  return next;
}

export async function createLocalUserProfileBackup(profile: LocalUserProfile): Promise<LocalUserProfileBackup> {
  const displayName = normalizeDisplayName(profile.displayName);
  const avatarUri = getUsableLocalAvatarUri(profile);
  if (!avatarUri) return displayName ? { displayName } : {};
  const bytes = await new File(avatarUri).bytes();
  if (bytes.byteLength > LOCAL_AVATAR_BACKUP_MAX_BYTES) {
    return displayName ? { displayName } : {};
  }
  return {
    avatar: { base64: bytesToBase64(bytes), mimeType: "image/jpeg" },
    ...(displayName ? { displayName } : {})
  };
}

export function normalizeLocalUserProfileBackup(value: unknown): LocalUserProfileBackup | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  const displayName = normalizeDisplayName(record.displayName);
  let avatar: LocalUserProfileBackup["avatar"];
  if (record.avatar && typeof record.avatar === "object" && !Array.isArray(record.avatar)) {
    const candidate = record.avatar as Record<string, unknown>;
    if (candidate.mimeType === "image/jpeg" && typeof candidate.base64 === "string"
      && candidate.base64.length <= Math.ceil(LOCAL_AVATAR_BACKUP_MAX_BYTES * 4 / 3) + 8
      && isJpegBase64(candidate.base64)) {
      avatar = { base64: candidate.base64, mimeType: "image/jpeg" };
    }
  }
  return avatar || displayName ? { ...(avatar ? { avatar } : {}), ...(displayName ? { displayName } : {}) } : {};
}

export async function stageLocalUserProfileBackupImport(value: LocalUserProfileBackup | undefined): Promise<StagedLocalUserProfileImport> {
  const current = await loadLocalUserProfile();
  if (value === undefined) {
    return {
      nextProfile: current,
      ...(current.avatarPath ? { newAvatarPath: current.avatarPath, previousAvatarPath: current.avatarPath } : {})
    };
  }
  let avatarPath: string | undefined;
  if (value?.avatar?.base64) {
    const directory = profileDirectory();
    directory.create({ idempotent: true, intermediates: true });
    const file = new File(directory, `avatar-import-${Date.now()}.jpg`);
    file.create({ intermediates: true, overwrite: true });
    file.write(base64ToBytes(value.avatar.base64));
    if (!file.exists || file.size <= 0 || file.size > LOCAL_AVATAR_BACKUP_MAX_BYTES) {
      if (file.exists) file.delete();
      throw new Error("The backup avatar is invalid.");
    }
    avatarPath = file.uri;
  }
  const nextProfile = normalizeLocalUserProfile({
    ...(avatarPath ? { avatarPath } : {}),
    ...(value?.displayName ? { displayName: value.displayName } : {}),
    updatedAt: new Date().toISOString(),
    version: 1
  });
  return {
    nextProfile,
    ...(avatarPath ? { newAvatarPath: avatarPath } : {}),
    ...(current.avatarPath ? { previousAvatarPath: current.avatarPath } : {})
  };
}

export function commitLocalUserProfileBackupImport(staged: StagedLocalUserProfileImport) {
  deleteAvatarFile(staged.previousAvatarPath, staged.newAvatarPath);
}

export function rollbackLocalUserProfileBackupImport(staged: StagedLocalUserProfileImport) {
  deleteAvatarFile(staged.newAvatarPath, staged.previousAvatarPath);
}

export async function importLocalUserProfileBackup(value: LocalUserProfileBackup | undefined) {
  const staged = await stageLocalUserProfileBackupImport(value);
  try {
    const saved = await saveLocalUserProfile(staged.nextProfile);
    commitLocalUserProfileBackupImport(staged);
    return saved;
  } catch (error) {
    rollbackLocalUserProfileBackupImport(staged);
    throw error;
  }
}

function deleteAvatarFile(path?: string, except?: string) {
  if (!path || path === except) return;
  try {
    const file = new File(path);
    if (file.exists) file.delete();
  } catch {
    // Missing or damaged local avatar references safely fall back to the default UI.
  }
}

function isJpegBase64(value: string) {
  const bytes = base64ToBytes(value);
  return bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}
