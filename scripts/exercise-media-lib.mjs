import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

export const EXPECTED_EXERCISE_IMAGE_COUNT = 182;
export const EXPECTED_EXERCISE_SET_COUNT = 103;
export const MAX_RUNTIME_WIDTH = 900;
export const MAX_RUNTIME_HEIGHT = 1140;
export const MAX_RUNTIME_WEBP_BYTES = 192 * 1024;

export async function fileExists(filePath) {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

export async function listFilesRecursive(root) {
  const files = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(entryPath);
      else if (entry.isFile()) files.push(entryPath);
    }
  }
  await visit(root);
  return files.sort((left, right) => left.localeCompare(right));
}

export function logicalAssetKey(root, filePath) {
  return path.relative(root, filePath).replaceAll(path.sep, "/").replace(/\.(png|webp)$/i, "");
}

export async function readPngDimensions(filePath) {
  const buffer = await readFile(filePath);
  const signature = "89504e470d0a1a0a";
  if (buffer.length < 26 || buffer.subarray(0, 8).toString("hex") !== signature) {
    throw new Error(`Invalid PNG header: ${filePath}`);
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    colorType: buffer[25]
  };
}

function readUInt24LE(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16);
}

export async function readWebpDimensions(filePath) {
  const buffer = await readFile(filePath);
  if (buffer.length < 30 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") {
    throw new Error(`Invalid WebP RIFF header: ${filePath}`);
  }
  const chunk = buffer.toString("ascii", 12, 16);
  const offset = 20;
  if (chunk === "VP8X") {
    return { width: readUInt24LE(buffer, offset + 4) + 1, height: readUInt24LE(buffer, offset + 7) + 1 };
  }
  if (chunk === "VP8 ") {
    if (buffer[offset + 3] !== 0x9d || buffer[offset + 4] !== 0x01 || buffer[offset + 5] !== 0x2a) {
      throw new Error(`Invalid lossy WebP frame header: ${filePath}`);
    }
    return { width: buffer.readUInt16LE(offset + 6) & 0x3fff, height: buffer.readUInt16LE(offset + 8) & 0x3fff };
  }
  if (chunk === "VP8L") {
    if (buffer[offset] !== 0x2f) throw new Error(`Invalid lossless WebP frame header: ${filePath}`);
    const b1 = buffer[offset + 1];
    const b2 = buffer[offset + 2];
    const b3 = buffer[offset + 3];
    const b4 = buffer[offset + 4];
    return {
      width: 1 + (((b2 & 0x3f) << 8) | b1),
      height: 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | (b2 >> 6))
    };
  }
  throw new Error(`Unsupported WebP chunk ${chunk}: ${filePath}`);
}

export async function collectImagePairs(root, extension) {
  const files = (await listFilesRecursive(root)).filter((filePath) => path.extname(filePath).toLowerCase() === extension);
  const byExercise = new Map();
  for (const filePath of files) {
    const relative = path.relative(root, filePath);
    const role = path.basename(filePath, extension);
    const exerciseId = path.dirname(relative).replaceAll(path.sep, "/");
    if (role !== "start" && role !== "end") throw new Error(`Unexpected exercise image role: ${relative}`);
    const pair = byExercise.get(exerciseId) ?? {};
    if (pair[role]) throw new Error(`Duplicate ${role} image: ${exerciseId}`);
    pair[role] = filePath;
    byExercise.set(exerciseId, pair);
  }
  return { files, byExercise };
}

export async function parseExerciseImageSourceMap(sourceMapPath) {
  const source = await readFile(sourceMapPath, "utf8");
  const pattern = /"(?<key>[^"\r\n]+\/(?:start|end))"\s*:\s*require\("\.\.\/assets\/exercises\/(?<relative>[^"\r\n]+\.(?:png|webp))"\)/g;
  const entries = [];
  for (const match of source.matchAll(pattern)) {
    entries.push({ key: match.groups.key, relative: match.groups.relative, extension: path.extname(match.groups.relative).toLowerCase() });
  }
  if (!entries.length) throw new Error(`No static exercise image require() entries found: ${sourceMapPath}`);
  const keys = new Set();
  for (const entry of entries) {
    if (keys.has(entry.key)) throw new Error(`Duplicate static exercise asset key: ${entry.key}`);
    if (entry.relative.replace(/\.(png|webp)$/i, "") !== entry.key) throw new Error(`Asset key/path mismatch: ${entry.key} -> ${entry.relative}`);
    keys.add(entry.key);
  }
  return entries;
}

export function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
