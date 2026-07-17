import { describe, expect, it } from "vitest";

import {
  buildAuthDeviceName,
  buildDeviceReportInfo,
  type DeviceInfoSnapshot
} from "../../platform/deviceInfo";

function snapshot(overrides: Partial<DeviceInfoSnapshot> = {}): DeviceInfoSnapshot {
  return {
    expoConstants: {},
    os: "android",
    osVersion: 15,
    platformConstants: {},
    screen: { fontScale: 1, height: 2400, scale: 3, width: 1080 },
    window: { fontScale: 1, height: 2200, scale: 3, width: 1080 },
    ...overrides
  };
}

describe("deviceInfo", () => {
  it("builds a stable authentication device label", () => {
    expect(buildAuthDeviceName(snapshot({
      platformConstants: { Brand: "Google", Model: "Pixel", systemName: "Android", osVersion: "15" }
    }))).toBe("Google Pixel · Android 15");
  });

  it("uses a platform fallback and caps the label length", () => {
    expect(buildAuthDeviceName(snapshot())).toBe("android 15");
    expect(buildAuthDeviceName(snapshot({ platformConstants: { Brand: "x".repeat(200) } }))).toHaveLength(120);
  });

  it("formats diagnostic fields while omitting empty values", () => {
    const report = buildDeviceReportInfo(snapshot({
      expoConstants: { appOwnership: "standalone" },
      platformConstants: { Brand: "Google", Model: "Pixel", reactNativeVersion: { major: 0, minor: 86 } }
    }));
    expect(report).toContain("platform: android");
    expect(report).toContain("brand: Google");
    expect(report).toContain('reactNativeVersion: {"major":0,"minor":86}');
    expect(report).toContain("screen: 1080x2400, scale 3, fontScale 1");
    expect(report).not.toContain("serial:");
  });
});
