import { Dimensions, NativeModules, Platform } from "react-native";

export type DeviceInfoSnapshot = {
  expoConstants: Record<string, unknown>;
  isPad?: boolean;
  os: string;
  osVersion: unknown;
  platformConstants: Record<string, unknown>;
  screen: { fontScale: number; height: number; scale: number; width: number };
  window: { fontScale: number; height: number; scale: number; width: number };
};

export function getDeviceReportInfo() {
  return buildDeviceReportInfo(readDeviceInfoSnapshot());
}

export function getAuthDeviceName() {
  return buildAuthDeviceName(readDeviceInfoSnapshot());
}

export function buildDeviceReportInfo(snapshot: DeviceInfoSnapshot) {
  const fields: string[] = [];
  appendField(fields, "platform", snapshot.os);
  appendField(fields, "osVersion", snapshot.osVersion);
  appendField(fields, "isPad", snapshot.os === "ios" ? snapshot.isPad : undefined);
  appendField(fields, "brand", snapshot.platformConstants.Brand);
  appendField(fields, "manufacturer", snapshot.platformConstants.Manufacturer);
  appendField(fields, "model", snapshot.platformConstants.Model);
  appendField(fields, "release", snapshot.platformConstants.Release);
  appendField(fields, "serial", snapshot.platformConstants.Serial);
  appendField(fields, "fingerprint", snapshot.platformConstants.Fingerprint);
  appendField(fields, "systemName", snapshot.platformConstants.systemName);
  appendField(fields, "systemVersion", snapshot.platformConstants.osVersion);
  appendField(fields, "interfaceIdiom", snapshot.platformConstants.interfaceIdiom);
  appendField(fields, "reactNativeVersion", snapshot.platformConstants.reactNativeVersion);
  appendField(fields, "expoAppOwnership", snapshot.expoConstants.appOwnership);
  appendField(fields, "expoExecutionEnvironment", snapshot.expoConstants.executionEnvironment);
  appendField(fields, "expoSessionId", snapshot.expoConstants.sessionId);
  appendField(fields, "screen", formatDimensions(snapshot.screen));
  appendField(fields, "window", formatDimensions(snapshot.window));
  return fields.join("\n");
}

export function buildAuthDeviceName(snapshot: DeviceInfoSnapshot) {
  const brand = stringifyValue(snapshot.platformConstants.Brand);
  const manufacturer = stringifyValue(snapshot.platformConstants.Manufacturer);
  const model = stringifyValue(snapshot.platformConstants.Model);
  const systemName = stringifyValue(snapshot.platformConstants.systemName);
  const systemVersion = stringifyValue(snapshot.platformConstants.osVersion ?? snapshot.osVersion);
  const device = [brand || manufacturer, model].filter(Boolean).join(" ");
  const system = [systemName || snapshot.os, systemVersion].filter(Boolean).join(" ");
  const label = [device, system].filter(Boolean).join(" · ").trim();
  return label.slice(0, 120) || (snapshot.os === "ios" ? "iOS device" : "Android device");
}

function readDeviceInfoSnapshot(): DeviceInfoSnapshot {
  return {
    expoConstants: (NativeModules.ExponentConstants ?? NativeModules.ExpoConstants ?? {}) as Record<string, unknown>,
    isPad: Platform.OS === "ios"
      ? (Platform as unknown as { isPad?: boolean }).isPad
      : undefined,
    os: Platform.OS,
    osVersion: Platform.Version,
    platformConstants: {
      ...((NativeModules.PlatformConstants ?? {}) as Record<string, unknown>),
      ...(Platform.constants as unknown as Record<string, unknown>)
    },
    screen: Dimensions.get("screen"),
    window: Dimensions.get("window")
  };
}

function appendField(fields: string[], label: string, value: unknown) {
  const normalized = stringifyValue(value);
  if (normalized) {
    fields.push(`${label}: ${normalized}`);
  }
}

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function formatDimensions(value: DeviceInfoSnapshot["screen"]) {
  return `${value.width}x${value.height}, scale ${value.scale}, fontScale ${value.fontScale}`;
}
