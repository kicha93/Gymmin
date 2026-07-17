import { describe, expect, it } from "vitest";

import {
  AuthPasswordPolicy,
  createUserSession
} from "../auth";

describe("authSession", () => {
  it("enforces the shared password length boundary", () => {
    expect(AuthPasswordPolicy.isValid("1234567")).toBe(false);
    expect(AuthPasswordPolicy.isValid("12345678")).toBe(true);
    expect(AuthPasswordPolicy.isValid("x".repeat(201))).toBe(false);
  });

  it("normalizes optional user fields into a complete session", () => {
    expect(createUserSession({
      token: "token",
      user: {
        email: "user@example.com",
        id: "user-1",
        name: ""
      }
    }, "Fallback")).toEqual({
      avatarUpdatedAt: null,
      avatarUrl: null,
      createdOn: null,
      email: "user@example.com",
      emailVerified: false,
      id: "user-1",
      modifiedOn: null,
      name: "Fallback",
      token: "token"
    });
  });
});
