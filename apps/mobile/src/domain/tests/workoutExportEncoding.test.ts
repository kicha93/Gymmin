import { describe, expect, it } from "vitest";

import { bytesToBase64, encodeUtf8 } from "../workoutExport/workoutExportEncoding";

describe("workout export binary encoding", () => {
  it("encodes ASCII, Polish characters and surrogate pairs as UTF-8", () => {
    const value = "Zażółć gęślą 🏋️";
    const bytes = encodeUtf8(value);
    expect(new TextDecoder("utf-8").decode(bytes)).toBe(value);
  });

  it("encodes byte arrays as padded base64 without changing binary content", () => {
    expect(bytesToBase64(Uint8Array.from([]))).toBe("");
    expect(bytesToBase64(Uint8Array.from([0x50]))).toBe("UA==");
    expect(bytesToBase64(Uint8Array.from([0x50, 0x4b]))).toBe("UEs=");
    expect(bytesToBase64(Uint8Array.from([0x50, 0x4b, 0x03, 0x04]))).toBe("UEsDBA==");
  });

  it("encodes large byte arrays correctly across internal chunks", () => {
    const bytes = new Uint8Array(18_000);
    bytes.fill(0x61);

    expect(bytesToBase64(bytes)).toBe("YWFh".repeat(6_000));
  });
});
