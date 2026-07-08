import { describe, expect, it } from "vitest";

import {
  getDeleteAccountConfirmationPhrase,
  isDeleteAccountConfirmationValid
} from "../accountDeletion";

describe("accountDeletion", () => {
  it("requires exact localized confirmation text", () => {
    expect(getDeleteAccountConfirmationPhrase("pl")).toBe("USUŃ");
    expect(getDeleteAccountConfirmationPhrase("en")).toBe("DELETE");

    expect(isDeleteAccountConfirmationValid("USUŃ", "pl")).toBe(true);
    expect(isDeleteAccountConfirmationValid("USUN", "pl")).toBe(false);
    expect(isDeleteAccountConfirmationValid(" usuń ", "pl")).toBe(false);

    expect(isDeleteAccountConfirmationValid("DELETE", "en")).toBe(true);
    expect(isDeleteAccountConfirmationValid("delete", "en")).toBe(false);
    expect(isDeleteAccountConfirmationValid(" DELETE ", "en")).toBe(false);
  });
});
