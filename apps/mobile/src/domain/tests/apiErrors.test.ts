import { describe, expect, it } from "vitest";

import { getErrorMessageOrFallback, isNetworkRequestFailure } from "../apiErrors";

describe("API error messages", () => {
  it("treats the Expo 57 NativeResponse SharedObject failure as a network error", () => {
    const error = new Error(
      "The 1st argument cannot be cast to type class expo.modules.fetch.NativeResponse (received class java.lang.Integer) -> Caused by: Cannot convert provided JavaScriptObject to the SharedObject"
    );

    expect(isNetworkRequestFailure(error)).toBe(true);
    expect(getErrorMessageOrFallback(error, "fallback", "server unavailable")).toBe("server unavailable");
  });

  it("keeps safe API messages unchanged", () => {
    expect(getErrorMessageOrFallback(new Error("Invalid code."), "fallback", "server unavailable"))
      .toBe("Invalid code.");
  });
});
