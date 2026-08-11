import { describe, expect, it } from "vitest";

import { GYMMIN_CONTACT_EMAIL, buildContactMailUrl } from "../contact";

describe("contact", () => {
  it("builds the contact mail URL with an encoded subject", () => {
    expect(buildContactMailUrl("pl")).toBe("mailto:kontakt@gymmin.app?subject=Gymmin%20-%20kontakt");
    expect(buildContactMailUrl("en")).toBe("mailto:kontakt@gymmin.app?subject=Gymmin%20-%20contact");
    expect(GYMMIN_CONTACT_EMAIL).toBe("kontakt@gymmin.app");
  });
});
