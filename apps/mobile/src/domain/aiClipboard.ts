export type AiClipboardAdapter = {
  getStringAsync: () => Promise<string>;
  setStringAsync: (value: string) => Promise<unknown>;
};

export async function copyAiPrompt(clipboard: AiClipboardAdapter, prompt: string) {
  if (!prompt) return false;
  await clipboard.setStringAsync(prompt);
  return true;
}

export async function pasteAiResponse(clipboard: AiClipboardAdapter) {
  const value = await clipboard.getStringAsync();
  return typeof value === "string" ? value : "";
}
