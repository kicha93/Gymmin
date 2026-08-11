import AsyncStorage from "@react-native-async-storage/async-storage";
import { beforeEach, describe, expect, it, vi } from "vitest";

const files = vi.hoisted(() => new Map<string, Uint8Array>());
vi.mock("expo-file-system", () => ({
  Directory: class {
    uri: string;
    constructor(base: { uri?: string } | string, name: string) { this.uri = `${typeof base === "string" ? base : base.uri}/${name}`; }
    create() {}
  },
  File: class {
    uri: string;
    constructor(base: { uri?: string } | string, name?: string) { this.uri = name ? `${typeof base === "string" ? base : base.uri}/${name}` : String(base); }
    get exists() { return files.has(this.uri); }
    get size() { return files.get(this.uri)?.byteLength ?? 0; }
    async bytes() { return files.get(this.uri) ?? new Uint8Array(); }
    create() { files.set(this.uri, new Uint8Array()); }
    delete() { files.delete(this.uri); }
    async move(target: { uri: string }) { files.set(target.uri, files.get(this.uri) ?? new Uint8Array()); files.delete(this.uri); this.uri = target.uri; }
    write(value: Uint8Array) { files.set(this.uri, value); }
  },
  Paths: { document: "file:///documents" }
}));
vi.mock("expo-image-manipulator", () => ({
  ImageManipulator: {
    manipulate: (uri: string) => ({
      release() {},
      resize() {},
      async renderAsync() {
        return {
          height: 100,
          width: 100,
          release() {},
          async saveAsync() { return { uri }; }
        };
      }
    })
  },
  SaveFormat: { JPEG: "jpeg", PNG: "png", WEBP: "webp" }
}));
vi.mock("../avatarCache", () => ({
  clearPreparedAvatar: () => {},
  prepareAvatarForUpload: async (uri: string) => ({ extension: "jpg", mimeType: "image/jpeg", uri })
}));

import {
  LOCAL_AVATAR_BACKUP_MAX_BYTES,
  LOCAL_USER_PROFILE_STORAGE_BASE_KEY,
  createLocalUserProfileBackup,
  loadLocalUserProfile,
  getUsableLocalAvatarUri,
  importLocalUserProfileBackup,
  normalizeLocalUserProfile,
  normalizeLocalUserProfileBackup,
  removeLocalAvatar,
  replaceLocalAvatar,
  saveLocalUserProfile
} from "../localUserProfile";
import { getLocalOnlyStorageKey } from "../localOnlyStorageMigration";

describe("local user profile", () => {
  beforeEach(async () => { files.clear(); await AsyncStorage.clear(); });

  it("supports a fresh install and drops obsolete display-name metadata", async () => {
    expect(await loadLocalUserProfile()).toMatchObject({ version: 1 });
    expect(normalizeLocalUserProfile({ displayName: "Legacy user" })).toEqual({
      updatedAt: new Date(0).toISOString(),
      version: 1
    });
  });

  it("stores only profile metadata in the neutral namespace", async () => {
    await saveLocalUserProfile({ avatarPath: "file:///documents/gymmin-profile/avatar.jpg", updatedAt: new Date().toISOString(), version: 1 });
    const raw = await AsyncStorage.getItem(getLocalOnlyStorageKey(LOCAL_USER_PROFILE_STORAGE_BASE_KEY));
    expect(raw).toContain("file:///documents");
    expect(raw).not.toContain("base64");
  });

  it("normalizes missing and damaged avatar paths to the default profile", () => {
    expect(normalizeLocalUserProfile(null).avatarPath).toBeUndefined();
    expect(normalizeLocalUserProfile({ avatarPath: "https://server/avatar.jpg" }).avatarPath).toBeUndefined();
  });

  it("copies, reloads and removes an avatar in private app storage", async () => {
    files.set("file:///picked.jpg", Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]));
    const withAvatar = await replaceLocalAvatar(await loadLocalUserProfile(), "file:///picked.jpg", "image/jpeg");
    expect(withAvatar.avatarPath).toContain("file:///documents/gymmin-profile/avatar-");
    expect(getUsableLocalAvatarUri(await loadLocalUserProfile())).toBe(withAvatar.avatarPath);
    const removed = await removeLocalAvatar(withAvatar);
    expect(removed.avatarPath).toBeUndefined();
    expect(files.has(withAvatar.avatarPath!)).toBe(false);
  });

  it("includes a small avatar in backup but not in AsyncStorage", async () => {
    files.set("file:///picked.jpg", Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]));
    const profile = await replaceLocalAvatar(await loadLocalUserProfile(), "file:///picked.jpg", "image/jpeg");
    expect(await createLocalUserProfileBackup(profile)).toMatchObject({
      avatar: { base64: "/9j/2Q==", mimeType: "image/jpeg" }
    });
    expect(await AsyncStorage.getItem(getLocalOnlyStorageKey(LOCAL_USER_PROFILE_STORAGE_BASE_KEY))).not.toContain("/9j/");
  });

  it("imports an optional v1 profile avatar", async () => {
    const imported = await importLocalUserProfileBackup({
      avatar: { base64: "/9j/2Q==", mimeType: "image/jpeg" }
    });
    expect(getUsableLocalAvatarUri(imported)).toBe(imported.avatarPath);
  });

  it("accepts backward-compatible backups, ignores legacy display names and validates optional avatar payload", () => {
    expect(normalizeLocalUserProfileBackup(undefined)).toBeUndefined();
    expect(normalizeLocalUserProfileBackup({ displayName: "Legacy user" })).toEqual({});
    expect(normalizeLocalUserProfileBackup({ avatar: { base64: "/9j/2Q==", mimeType: "image/jpeg" } })).toEqual({
      avatar: { base64: "/9j/2Q==", mimeType: "image/jpeg" }
    });
    expect(normalizeLocalUserProfileBackup({ avatar: { base64: "A".repeat(Math.ceil(LOCAL_AVATAR_BACKUP_MAX_BYTES * 4 / 3) + 20), mimeType: "image/jpeg" } })).toEqual({});
  });
});
