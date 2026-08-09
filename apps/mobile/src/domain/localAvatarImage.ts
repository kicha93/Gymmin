import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

const maxAvatarDimension = 1024;
type AvatarExtension = "jpg" | "png" | "webp";

export type PreparedLocalAvatar = {
  extension: AvatarExtension;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  uri: string;
};

export async function prepareAvatarForLocalStorage(uri: string, mimeType?: string | null): Promise<PreparedLocalAvatar> {
  const extension = getAvatarExtension(mimeType) ?? "jpg";
  const details = extension === "png"
    ? { format: SaveFormat.PNG, mimeType: "image/png" as const }
    : extension === "webp"
      ? { format: SaveFormat.WEBP, mimeType: "image/webp" as const }
      : { format: SaveFormat.JPEG, mimeType: "image/jpeg" as const };
  type Context = ReturnType<typeof ImageManipulator.manipulate>;
  type Image = Awaited<ReturnType<Context["renderAsync"]>>;
  let context: Context | null = null;
  let image: Image | null = null;
  try {
    context = ImageManipulator.manipulate(uri);
    image = await context.renderAsync();
    const { width, height } = image;
    if (Math.max(width, height) > maxAvatarDimension) {
      image.release();
      context.release();
      context = ImageManipulator.manipulate(uri);
      context.resize(width >= height ? { width: maxAvatarDimension } : { height: maxAvatarDimension });
      image = await context.renderAsync();
    }
    const result = await image.saveAsync({
      compress: extension === "png" ? 1 : 0.85,
      format: details.format
    });
    return { extension, mimeType: details.mimeType, uri: result.uri };
  } finally {
    image?.release();
    context?.release();
  }
}

export function clearPreparedLocalAvatar(prepared: PreparedLocalAvatar | null) {
  if (!prepared?.uri.startsWith("file:")) return;
  const file = new File(prepared.uri);
  if (file.exists) file.delete();
}

function getAvatarExtension(contentType?: string | null): AvatarExtension | null {
  const normalized = (contentType ?? "").split(";")[0].trim().toLowerCase();
  if (normalized === "image/png") return "png";
  if (normalized === "image/webp") return "webp";
  return normalized === "image/jpeg" || normalized === "image/jpg" ? "jpg" : null;
}
