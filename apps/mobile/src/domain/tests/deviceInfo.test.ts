import { describe, expect, it } from "vitest";

import { buildSafeDeviceReportInfo, type DeviceInfoSnapshot } from "../../platform/deviceInfo";

function snapshot(overrides: Partial<DeviceInfoSnapshot> = {}): DeviceInfoSnapshot {
  return {
    expoConstants: {},
    os: "android",
    osVersion: 15,
    platformConstants: {},
    ...overrides
  };
}

describe("safe device report info", () => {
  it("includes only bounded non-identifying device fields", () => {
    expect(buildSafeDeviceReportInfo(snapshot({
      expoConstants: { expoConfig: { android: { versionCode: 7 }, version: "1.2.3" }, sessionId: "private" },
      platformConstants: { Fingerprint: "private", Model: "Pixel", Release: "16", Serial: "private" }
    }))).toEqual({
      appVersion: "1.2.3",
      buildVersion: "7",
      model: "Pixel",
      osVersion: "16",
      platform: "android"
    });
  });
});
