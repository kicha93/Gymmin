import { describe, expect, it } from "vitest";

import {
  shouldScheduleAccountSettingsSave
} from "../../features/settings/useAccountSettingsAutoSave";

describe("account settings auto-save decisions", () => {
  it("does not echo remote state but saves the first subsequent user change", () => {
    expect(shouldScheduleAccountSettingsSave({
      enabled: true,
      isApplyingRemoteSettings: true,
      nextChangeKey: "remote",
      observedChangeKey: "local"
    })).toBe(false);

    expect(shouldScheduleAccountSettingsSave({
      enabled: true,
      isApplyingRemoteSettings: false,
      nextChangeKey: "first-user-change",
      observedChangeKey: "remote"
    })).toBe(true);
  });

  it("ignores unchanged and disabled state", () => {
    expect(shouldScheduleAccountSettingsSave({
      enabled: true,
      isApplyingRemoteSettings: false,
      nextChangeKey: "same",
      observedChangeKey: "same"
    })).toBe(false);
    expect(shouldScheduleAccountSettingsSave({
      enabled: false,
      isApplyingRemoteSettings: false,
      nextChangeKey: "changed",
      observedChangeKey: "same"
    })).toBe(false);
  });
});
