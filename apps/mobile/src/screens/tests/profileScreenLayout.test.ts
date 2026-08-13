import { describe, expect, it } from "vitest";

import { getProfileScreenLayout } from "../profileScreenLayout";

describe("profile screen layout", () => {
  it("stacks avatar actions on narrow Android screens", () => {
    expect(getProfileScreenLayout(320)).toEqual({
      actionsStacked: true,
      avatarSize: 104,
      compact: true
    });
  });

  it("keeps actions side by side on typical phones", () => {
    expect(getProfileScreenLayout(360)).toEqual({
      actionsStacked: false,
      avatarSize: 112,
      compact: true
    });
  });

  it("uses the largest avatar on wide phones", () => {
    expect(getProfileScreenLayout(430)).toEqual({
      actionsStacked: false,
      avatarSize: 132,
      compact: false
    });
  });
});
