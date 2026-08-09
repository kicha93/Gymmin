import { describe, expect, it, vi } from "vitest";

import { copyAiPrompt, pasteAiResponse } from "../aiClipboard";

describe("AI clipboard adapter", () => {
  it("copies a prompt", async () => {
    const adapter = { getStringAsync: vi.fn(async () => ""), setStringAsync: vi.fn(async () => {}) };
    await expect(copyAiPrompt(adapter, "prompt")).resolves.toBe(true);
    expect(adapter.setStringAsync).toHaveBeenCalledWith("prompt");
  });

  it("pastes a response and handles an empty clipboard", async () => {
    const adapter = { getStringAsync: vi.fn(async () => "response"), setStringAsync: vi.fn(async () => {}) };
    await expect(pasteAiResponse(adapter)).resolves.toBe("response");
    adapter.getStringAsync.mockResolvedValue("");
    await expect(pasteAiResponse(adapter)).resolves.toBe("");
  });
});
