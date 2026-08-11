import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

validatePng("docs/google-play/assets/app-icon-512.png", {
  width: 512,
  height: 512,
  maxBytes: 1024 * 1024,
  colorTypes: [6],
  label: "Google Play app icon",
});
validatePng("docs/google-play/assets/feature-graphic-1024x500.png", {
  width: 1024,
  height: 500,
  maxBytes: 15 * 1024 * 1024,
  colorTypes: [2],
  label: "Google Play feature graphic",
});

for (const relative of ["docs/google-play/listing-pl.md", "docs/google-play/listing-en.md"]) {
  const source = read(relative);
  const match = source.match(/## (?:Krótki opis|Short description).*?\r?\n\r?\n([^\r\n]+)/s);
  if (!match) failures.push(`${relative}: short description was not found`);
  else if ([...match[1]].length > 80) failures.push(`${relative}: short description exceeds 80 characters`);
}

for (const relative of [
  "docs/privacy/index.html",
  "docs/privacy/delete-data/index.html",
  "docs/privacy/en/index.html",
  "docs/privacy/en/delete-data/index.html",
]) {
  const source = read(relative);
  if (!/<meta charset="utf-8">/.test(source)) failures.push(`${relative}: UTF-8 declaration is missing`);
  if (/[ÃÅÄÂ]|â(?:€|†|€™|€”)/u.test(source)) failures.push(`${relative}: likely mojibake detected`);
  if (!source.includes("kontakt@gymmin.app")) failures.push(`${relative}: public contact is missing`);
}

const app = JSON.parse(read("apps/mobile/app.json"));
if (app.expo?.android?.package !== "com.gymmin.app") failures.push("app.json: unexpected Android package");
if (!Number.isInteger(app.expo?.android?.versionCode) || app.expo.android.versionCode < 1) failures.push("app.json: invalid Android versionCode");
if (!app.expo?.version) failures.push("app.json: version is missing");

if (failures.length) {
  console.error("Google Play release validation failed:\n" + failures.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}

console.log(`Google Play release assets passed: ${app.expo.version} (${app.expo.android.versionCode}), ${app.expo.android.package}.`);

function read(relative) {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) {
    failures.push(`${relative}: file is missing`);
    return "";
  }
  return fs.readFileSync(absolute, "utf8");
}

function validatePng(relative, expected) {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) {
    failures.push(`${relative}: ${expected.label} is missing`);
    return;
  }
  const bytes = fs.readFileSync(absolute);
  const signature = "89504e470d0a1a0a";
  if (bytes.subarray(0, 8).toString("hex") !== signature || bytes.subarray(12, 16).toString("ascii") !== "IHDR") {
    failures.push(`${relative}: not a valid PNG`);
    return;
  }
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  const colorType = bytes[25];
  if (width !== expected.width || height !== expected.height) failures.push(`${relative}: expected ${expected.width}x${expected.height}, got ${width}x${height}`);
  if (bytes.length > expected.maxBytes) failures.push(`${relative}: exceeds ${expected.maxBytes} bytes`);
  if (!expected.colorTypes.includes(colorType)) failures.push(`${relative}: unexpected PNG color type ${colorType}`);
}
