import { describe, expect, it } from "vitest";

import { decideAccountDataPolicy } from "../../features/account/useAccountDataPolicy";

describe("account data policy", () => {
  it("prioritizes a real account switch over anonymous adoption", () => {
    expect(decideAccountDataPolicy("user-a", "user-b", false, true)).toBe("account-switch");
  });

  it("offers anonymous data only once and only when it exists", () => {
    expect(decideAccountDataPolicy(null, "user-a", false, true)).toBe("anonymous-data");
    expect(decideAccountDataPolicy(null, "user-a", true, true)).toBe("none");
    expect(decideAccountDataPolicy(null, "user-a", false, false)).toBe("none");
  });
});
