import { describe, expect, it } from "vitest";

import { GYMMIN_AUTHOR_NAME, GYMMIN_SUPPORT_URL } from "../appAttribution";

describe("app attribution", () => {
  it("keeps the public author attribution stable", () => {
    expect(GYMMIN_AUTHOR_NAME).toBe("Paweł Kaliszewski");
  });

  it("uses the exact support URL without user data or tracking parameters", () => {
    const supportUrl = new URL(GYMMIN_SUPPORT_URL);

    expect(GYMMIN_SUPPORT_URL).toBe("https://buymeacoffee.com/atomicjumpr");
    expect(supportUrl.search).toBe("");
    expect(supportUrl.hash).toBe("");
  });
});
