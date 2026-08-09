import { NativeModules, Platform } from "react-native";

export type SafeDeviceReportInfo = {
  appVersion: string;
  buildVersion: string;
  model: string;
  osVersion: string;
  platform: string;
};

export type DeviceInfoSnapshot = {
  expoConstants: Record<string, unknown>;
  os: string;
  osVersion: unknown;
  platformConstants: Record<string, unknown>;
};

export function getSafeDeviceReportInfo(): SafeDeviceReportInfo {
  return buildSafeDeviceReportInfo(readDeviceInfoSnapshot());
}

export function buildSafeDeviceReportInfo(snapshot: DeviceInfoSnapshot): SafeDeviceReportInfo {
  const expoConfig = asRecord(snapshot.expoConstants.expoConfig);
  const manifest = asRecord(snapshot.expoConstants.manifest);
  const manifest2 = asRecord(asRecord(snapshot.expoConstants.manifest2).extra);
  const expoClient = asRecord(manifest2.expoClient);

  return {
    appVersion: firstValue(expoConfig.version, expoClient.version, manifest.version) || "unknown",
    buildVersion: firstValue(
      asRecord(expoConfig.android).versionCode,
      asRecord(expoConfig.ios).buildNumber,
      expoClient.runtimeVersion,
      manifest.revisionId
    ) || "unknown",
    model: firstValue(snapshot.platformConstants.Model, snapshot.platformConstants.model) || "unknown",
    osVersion: firstValue(
      snapshot.platformConstants.Release,
      snapshot.platformConstants.osVersion,
      snapshot.osVersion
    ) || "unknown",
    platform: snapshot.os
  };
}

function readDeviceInfoSnapshot(): DeviceInfoSnapshot {
  return {
    expoConstants: (NativeModules.ExponentConstants ?? NativeModules.ExpoConstants ?? {}) as Record<string, unknown>,
    os: Platform.OS,
    osVersion: Platform.Version,
    platformConstants: {
      ...((NativeModules.PlatformConstants ?? {}) as Record<string, unknown>),
      ...(Platform.constants as unknown as Record<string, unknown>)
    }
  };
}

function firstValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}
