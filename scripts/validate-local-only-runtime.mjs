import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtimeRoots = [path.join(root, "apps", "mobile", "App.tsx"), path.join(root, "apps", "mobile", "src")];
const forbidden = [
  [/\bfetch\s*\(/, "fetch request"],
  [/\baxios\b/, "axios transport"],
  [/\bXMLHttpRequest\b/, "XMLHttpRequest transport"],
  [/\bWebSocket\s*\(/, "WebSocket transport"],
  [/EXPO_PUBLIC_API_BASE_URL|BUILD_API_BASE_URL|GYMMIN_APK_API_BASE_URL/, "backend build URL"],
  [/bugReportsApi|workoutCreatorApi|profileApi|mobileApiClients|apiClient/, "legacy API client"],
  [/Authorization\s*:|Bearer\s+/, "bearer transport"],
  [/react-native-iap|react-native-nitro-modules/, "billing dependency"],
];
const failures = [];

for (const file of walkInputs(runtimeRoots)) {
  if (!/\.(ts|tsx|js|jsx)$/.test(file) || file.includes(`${path.sep}tests${path.sep}`)) continue;
  const source = fs.readFileSync(file, "utf8");
  const relative = path.relative(root, file).replaceAll(path.sep, "/");
  for (const [pattern, description] of forbidden) {
    if (pattern.test(source)) failures.push(`${relative}: ${description}`);
  }
  if (relative !== "apps/mobile/src/domain/localOnlyStorageMigration.ts" &&
      /AsyncStorage\.setItem\s*\(\s*["'`]gymmin\.account\./.test(source)) {
    failures.push(`${relative}: writes to legacy account namespace`);
  }
}

const packageSource = fs.readFileSync(path.join(root, "apps", "mobile", "package.json"), "utf8");
for (const name of ["react-native-iap", "react-native-nitro-modules"]) {
  if (packageSource.includes(`\"${name}\"`)) failures.push(`package.json: ${name} must not return`);
}
const manifest = fs.readFileSync(path.join(root, "apps", "mobile", "android", "app", "src", "main", "AndroidManifest.xml"), "utf8");
for (const permission of ["android.permission.INTERNET", "com.android.vending.BILLING"]) {
  const removal = new RegExp(`<uses-permission\\s+android:name=[\"']${permission.replaceAll(".", "\\.")}[\"']\\s+tools:node=[\"']remove[\"']\\s*/>`);
  if (!removal.test(manifest)) failures.push(`AndroidManifest.xml: ${permission} must be explicitly removed from the merged app`);
}

if (failures.length) {
  console.error("Local-only runtime guard failed:\n" + failures.map((x) => `- ${x}`).join("\n"));
  process.exit(1);
}
console.log("Local-only runtime guard passed: no runtime HTTP, backend URL, auth transport, credits, or billing dependency.");

function* walkInputs(inputs) {
  for (const input of inputs) {
    const stat = fs.statSync(input);
    if (stat.isFile()) { yield input; continue; }
    for (const entry of fs.readdirSync(input, { withFileTypes: true })) {
      const full = path.join(input, entry.name);
      if (entry.isDirectory()) yield* walkInputs([full]);
      else yield full;
    }
  }
}
