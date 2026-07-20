import { Directory, File, Paths } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

import {
  buildAvatarImageSource,
  getAvatarExtension,
  getSafeAvatarCacheKey,
  type AvatarUser
} from "./avatar";

const avatarExtensions = ["jpg", "png", "webp"] as const;
const maxAvatarDimension = 1024;

type AvatarExtension = (typeof avatarExtensions)[number];

export type PreparedAvatar = {
  extension: AvatarExtension;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  uri: string;
};

function getAvatarSaveDetails(extension: AvatarExtension) {
  if (extension === "png") {
    return { format: SaveFormat.PNG, mimeType: "image/png" as const };
  }
  if (extension === "webp") {
    return { format: SaveFormat.WEBP, mimeType: "image/webp" as const };
  }
  return { format: SaveFormat.JPEG, mimeType: "image/jpeg" as const };
}

async function prepareAvatarImage(uri: string, extension: AvatarExtension): Promise<PreparedAvatar> {
  const saveDetails = getAvatarSaveDetails(extension);
  type ManipulatorContext = ReturnType<typeof ImageManipulator.manipulate>;
  type ManipulatedImage = Awaited<ReturnType<ManipulatorContext["renderAsync"]>>;
  let context: ManipulatorContext | null = null;
  let image: ManipulatedImage | null = null;

  try {
    context = ImageManipulator.manipulate(uri);
    image = await context.renderAsync();
    const sourceWidth = image.width;
    const sourceHeight = image.height;
    const longestDimension = Math.max(sourceWidth, sourceHeight);
    if (longestDimension > maxAvatarDimension) {
      image.release();
      image = null;
      context.release();
      context = null;

      context = ImageManipulator.manipulate(uri);
      if (sourceWidth >= sourceHeight) {
        context.resize({ width: maxAvatarDimension });
      } else {
        context.resize({ height: maxAvatarDimension });
      }
      image = await context.renderAsync();
    }

    const result = await image.saveAsync({
      compress: extension === "png" ? 1 : 0.85,
      format: saveDetails.format
    });
    return {
      extension,
      mimeType: saveDetails.mimeType,
      uri: result.uri
    };
  } finally {
    image?.release();
    context?.release();
  }
}

export function prepareAvatarForUpload(uri: string, mimeType?: string | null) {
  const extension = getAvatarExtension(mimeType ?? null) ?? "jpg";
  return prepareAvatarImage(uri, extension);
}

export function clearPreparedAvatar(preparedAvatar: PreparedAvatar | null) {
  if (!preparedAvatar?.uri.startsWith("file:")) {
    return;
  }

  const file = new File(preparedAvatar.uri);
  if (file.exists) {
    file.delete();
  }
}

function getAvatarCacheDirectory() {
  return new Directory(Paths.document, "gymmin-avatars");
}

function getAvatarCacheFiles(userId: string) {
  const key = getSafeAvatarCacheKey(userId);
  const directory = getAvatarCacheDirectory();
  return avatarExtensions.map((extension) => new File(directory, `${key}.${extension}`));
}

export function getCachedAvatarUri(userId: string) {
  return getAvatarCacheFiles(userId).find((file) => file.exists)?.uri ?? null;
}

export function clearCachedAvatar(userId: string) {
  for (const file of getAvatarCacheFiles(userId)) {
    if (file.exists) {
      file.delete();
    }
  }
}

export async function refreshCachedAvatar(
  apiBaseUrl: string,
  user: AvatarUser & { id: string; token: string }
) {
  const source = buildAvatarImageSource(apiBaseUrl, user);
  if (!source) {
    clearCachedAvatar(user.id);
    return null;
  }

  const directory = getAvatarCacheDirectory();
  directory.create({ idempotent: true, intermediates: true });

  const key = getSafeAvatarCacheKey(user.id);
  const downloadedFile = new File(Paths.cache, `gymmin-avatar-${key}.download`);
  let preparedFile: File | null = null;

  try {
    // Force a body response even if the native HTTP cache has a validator for
    // the versioned avatar URL. A 304 has no bytes that can seed a missing file.
    const separator = source.uri.includes("?") ? "&" : "?";
    const downloadUri = `${source.uri}${separator}nativeCache=${Date.now()}`;
    await File.downloadFileAsync(downloadUri, downloadedFile, {
      headers: source.headers,
      idempotent: true
    });
    if (!downloadedFile.exists || downloadedFile.size === 0) {
      throw new Error("Downloaded avatar is empty.");
    }

    // The native downloader streams the protected response straight to disk.
    // This avoids Expo's native Response -> ArrayBuffer bridge, which can fail
    // for binary payloads on Android. The manipulator detects the input format
    // from its bytes and normalizes every cached avatar to JPEG.
    const prepared = await prepareAvatarImage(downloadedFile.uri, "jpg");
    preparedFile = new File(prepared.uri);
    const preparedBytes = await preparedFile.bytes();
    if (preparedBytes.byteLength === 0) {
      throw new Error("Prepared avatar is empty.");
    }

    const file = new File(directory, `${key}.${prepared.extension}`);
    const pendingFile = new File(directory, `${key}.pending.${prepared.extension}`);
    pendingFile.create({ intermediates: true, overwrite: true });
    pendingFile.write(preparedBytes);
    await pendingFile.move(file, { overwrite: true });

    for (const staleFile of getAvatarCacheFiles(user.id)) {
      if (staleFile.uri !== file.uri && staleFile.exists) {
        staleFile.delete();
      }
    }

    return file.uri;
  } finally {
    if (downloadedFile.exists) {
      downloadedFile.delete();
    }
    if (preparedFile?.exists) {
      preparedFile.delete();
    }
  }
}
