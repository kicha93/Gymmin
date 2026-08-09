import { describe, expect, it } from "vitest";

import {
  ANONYMOUS_LOCAL_OWNER,
  getAccountStorageKey,
  getAccountStorageOwnerId
} from "../accountStorage";

describe("legacy account storage key reader", () => {
  it("keeps exact pre-local-only anonymous and account namespaces", () => {
    expect(getAccountStorageOwnerId(null)).toBe(ANONYMOUS_LOCAL_OWNER);
    expect(getAccountStorageKey("workouts.v1", null)).toBe("gymmin.account.anonymous.workouts.v1");
    expect(getAccountStorageKey("workouts.v1", " user-7 ")).toBe("gymmin.account.user-7.workouts.v1");
  });
});
