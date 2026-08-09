export function encodeUtf8(value: string): Uint8Array {
  const bytes: number[] = [];

  for (let index = 0; index < value.length; index += 1) {
    const codePoint = value.codePointAt(index);
    if (codePoint === undefined) continue;
    if (codePoint > 0xffff) index += 1;

    if (codePoint <= 0x7f) {
      bytes.push(codePoint);
    } else if (codePoint <= 0x7ff) {
      bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f));
    } else if (codePoint <= 0xffff) {
      bytes.push(
        0xe0 | (codePoint >> 12),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f)
      );
    } else {
      bytes.push(
        0xf0 | (codePoint >> 18),
        0x80 | ((codePoint >> 12) & 0x3f),
        0x80 | ((codePoint >> 6) & 0x3f),
        0x80 | (codePoint & 0x3f)
      );
    }
  }

  return Uint8Array.from(bytes);
}

const base64Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function bytesToBase64(bytes: Uint8Array): string {
  const chunks: string[] = [];
  let chunk = "";

  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index] ?? 0;
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    const triplet = (first << 16) | ((second ?? 0) << 8) | (third ?? 0);

    chunk += base64Alphabet[(triplet >> 18) & 0x3f];
    chunk += base64Alphabet[(triplet >> 12) & 0x3f];
    chunk += second === undefined ? "=" : base64Alphabet[(triplet >> 6) & 0x3f];
    chunk += third === undefined ? "=" : base64Alphabet[triplet & 0x3f];

    if (chunk.length >= 16_384) {
      chunks.push(chunk);
      chunk = "";
    }
  }

  if (chunk) chunks.push(chunk);
  return chunks.join("");
}

export function base64ToBytes(value: string): Uint8Array {
  const normalized = value.replace(/\s/g, "");
  if (!normalized || normalized.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) {
    return new Uint8Array();
  }
  const output: number[] = [];
  for (let index = 0; index < normalized.length; index += 4) {
    const first = base64Alphabet.indexOf(normalized[index]);
    const second = base64Alphabet.indexOf(normalized[index + 1]);
    const third = normalized[index + 2] === "=" ? 0 : base64Alphabet.indexOf(normalized[index + 2]);
    const fourth = normalized[index + 3] === "=" ? 0 : base64Alphabet.indexOf(normalized[index + 3]);
    if (first < 0 || second < 0 || third < 0 || fourth < 0) return new Uint8Array();
    const triplet = (first << 18) | (second << 12) | (third << 6) | fourth;
    output.push((triplet >> 16) & 0xff);
    if (normalized[index + 2] !== "=") output.push((triplet >> 8) & 0xff);
    if (normalized[index + 3] !== "=") output.push(triplet & 0xff);
  }
  return Uint8Array.from(output);
}
