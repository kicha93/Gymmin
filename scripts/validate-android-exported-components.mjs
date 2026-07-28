import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const defaultManifestCandidates = [
  path.join(
    repositoryRoot,
    "apps",
    "mobile",
    "android",
    "app",
    "build",
    "intermediates",
    "merged_manifests",
    "release",
    "processReleaseManifest",
    "AndroidManifest.xml",
  ),
  path.join(
    repositoryRoot,
    "apps",
    "mobile",
    "android",
    "app",
    "build",
    "intermediates",
    "merged_manifest",
    "release",
    "processReleaseMainManifest",
    "AndroidManifest.xml",
  ),
];

const componentTypes = new Set([
  "activity",
  "activity-alias",
  "provider",
  "receiver",
  "service",
]);

const allowedExportedComponents = new Map([
  [
    "activity:com.gymmin.app.MainActivity",
    {
      permission: "",
      reason: "Android launcher entry point",
    },
  ],
  [
    "receiver:androidx.profileinstaller.ProfileInstallReceiver",
    {
      permission: "android.permission.DUMP",
      reason: "AndroidX profile installer receiver protected by a system permission",
    },
  ],
]);

const forbiddenComponents = new Set([
  "receiver:com.google.firebase.iid.FirebaseInstanceIdReceiver",
  "service:com.google.firebase.messaging.FirebaseMessagingService",
  "service:expo.modules.notifications.service.ExpoFirebaseMessagingService",
]);

const unusedBadgePermissions = [
  "android.permission.READ_APP_BADGE",
  "com.anddoes.launcher.permission.UPDATE_COUNT",
  "com.htc.launcher.permission.READ_SETTINGS",
  "com.htc.launcher.permission.UPDATE_SHORTCUT",
  "com.huawei.android.launcher.permission.CHANGE_BADGE",
  "com.huawei.android.launcher.permission.READ_SETTINGS",
  "com.huawei.android.launcher.permission.WRITE_SETTINGS",
  "com.majeur.launcher.permission.UPDATE_BADGE",
  "com.oppo.launcher.permission.READ_SETTINGS",
  "com.oppo.launcher.permission.WRITE_SETTINGS",
  "com.sec.android.provider.badge.permission.READ",
  "com.sec.android.provider.badge.permission.WRITE",
  "com.sonyericsson.home.permission.BROADCAST_BADGE",
  "com.sonymobile.home.permission.PROVIDER_INSERT_BADGE",
  "me.everything.badger.permission.BADGE_COUNT_READ",
  "me.everything.badger.permission.BADGE_COUNT_WRITE",
];

const forbiddenPermissions = new Set([
  "android.permission.ACCESS_BACKGROUND_LOCATION",
  "android.permission.ACCESS_FINE_LOCATION",
  "android.permission.MANAGE_EXTERNAL_STORAGE",
  "android.permission.QUERY_ALL_PACKAGES",
  "android.permission.READ_CALL_LOG",
  "android.permission.READ_CONTACTS",
  "android.permission.READ_PHONE_STATE",
  "android.permission.READ_SMS",
  "android.permission.RECORD_AUDIO",
  "android.permission.REQUEST_INSTALL_PACKAGES",
  "android.permission.SYSTEM_ALERT_WINDOW",
  "android.permission.WRITE_CALL_LOG",
  "android.permission.WRITE_CONTACTS",
  "android.permission.WRITE_EXTERNAL_STORAGE",
  "com.google.android.c2dm.permission.RECEIVE",
  ...unusedBadgePermissions,
]);

const allowedQueryIntents = new Set([
  "android.intent.action.GET_CONTENT|category=android.intent.category.OPENABLE|mimeType=image/*",
  "android.intent.action.OPEN_DOCUMENT_TREE",
  "android.intent.action.VIEW|category=android.intent.category.BROWSABLE|scheme=https",
  "com.android.vending.billing.InAppBillingService.BIND",
  "com.google.android.apps.play.billingtestcompanion.BillingOverrideService.BIND",
]);

function readAttribute(attributes, name) {
  const match = attributes.match(
    new RegExp(`(?:^|\\s)android:${name}="([^"]*)"`, "u"),
  );
  return match?.[1] ?? "";
}

function parseOpeningTags(xml, names) {
  const tagPattern = /<([a-z-]+)\b([^>]*)>/gu;
  const results = [];
  let match;

  while ((match = tagPattern.exec(xml)) !== null) {
    if (names.has(match[1])) {
      results.push({
        type: match[1],
        attributes: match[2],
      });
    }
  }

  return results;
}

function getNestedTagAttributes(xml, tagName) {
  const pattern = new RegExp(`<${tagName}\\b([^>]*)\\/?\\s*>`, "gu");
  return Array.from(xml.matchAll(pattern), (match) => match[1]);
}

function createQueryIntentKey(intentBody) {
  const actions = getNestedTagAttributes(intentBody, "action")
    .map((attributes) => readAttribute(attributes, "name"))
    .filter(Boolean)
    .sort();
  const categories = getNestedTagAttributes(intentBody, "category")
    .map((attributes) => readAttribute(attributes, "name"))
    .filter(Boolean)
    .sort();
  const data = getNestedTagAttributes(intentBody, "data")
    .flatMap((attributes) => [
      ["mimeType", readAttribute(attributes, "mimeType")],
      ["scheme", readAttribute(attributes, "scheme")],
    ])
    .filter(([, value]) => Boolean(value))
    .map(([name, value]) => `${name}=${value}`)
    .sort();

  return [
    actions.join(","),
    ...categories.map((category) => `category=${category}`),
    ...data,
  ].join("|");
}

const manifestArgument = process.argv[2];
const manifestPath = manifestArgument
  ? path.resolve(process.cwd(), manifestArgument)
  : defaultManifestCandidates.find(existsSync);

if (!manifestPath || !existsSync(manifestPath)) {
  console.error(
    "Merged Android release manifest was not found. Build/process the release manifest before running this validation.",
  );
  process.exit(1);
}

const manifest = readFileSync(manifestPath, "utf8").replace(
  /<!--[\s\S]*?-->/gu,
  "",
);
const failures = [];
const exportedComponents = [];

for (const component of parseOpeningTags(manifest, componentTypes)) {
  const name = readAttribute(component.attributes, "name");
  const exported = readAttribute(component.attributes, "exported");
  const permission = readAttribute(component.attributes, "permission");
  const key = `${component.type}:${name}`;

  if (!name) {
    failures.push(`A ${component.type} declaration has no android:name.`);
    continue;
  }

  if (forbiddenComponents.has(key)) {
    failures.push(
      `${key} belongs to unused remote push delivery and must not be packaged in release.`,
    );
  }

  if (!exported) {
    failures.push(
      `${key} does not declare android:exported explicitly in the merged release manifest.`,
    );
    continue;
  }

  if (exported !== "true") {
    continue;
  }

  exportedComponents.push({ key, permission });
  const allowed = allowedExportedComponents.get(key);
  if (!allowed) {
    failures.push(`${key} is exported but is not present in the release allowlist.`);
    continue;
  }
  if (permission !== allowed.permission) {
    failures.push(
      `${key} must be protected by "${allowed.permission || "(no permission)"}", received "${permission || "(no permission)"}".`,
    );
  }
}

for (const [key, allowed] of allowedExportedComponents) {
  if (!exportedComponents.some((component) => component.key === key)) {
    failures.push(
      `Expected exported component ${key} is missing (${allowed.reason}).`,
    );
  }
}

const applicationTag = manifest.match(/<application\b([^>]*)>/u)?.[1] ?? "";
if (readAttribute(applicationTag, "debuggable") === "true") {
  failures.push("Merged release application must not be debuggable.");
}
if (readAttribute(applicationTag, "testOnly") === "true") {
  failures.push("Merged release application must not be test-only.");
}

const permissionTags = parseOpeningTags(
  manifest,
  new Set(["uses-permission", "uses-permission-sdk-23"]),
);
for (const permissionTag of permissionTags) {
  const permission = readAttribute(permissionTag.attributes, "name");
  if (forbiddenPermissions.has(permission)) {
    failures.push(`Forbidden release permission detected: ${permission}.`);
  }
}

const queriesBody = manifest.match(/<queries\b[^>]*>([\s\S]*?)<\/queries>/u)?.[1] ?? "";
const queryIntents = Array.from(
  queriesBody.matchAll(/<intent\b[^>]*>([\s\S]*?)<\/intent>/gu),
  (match) => createQueryIntentKey(match[1]),
);
for (const queryIntent of queryIntents) {
  if (!allowedQueryIntents.has(queryIntent)) {
    failures.push(
      `Unexpected Android package-visibility query detected: ${queryIntent || "(empty intent)"}.`,
    );
  }
}
for (const allowedQueryIntent of allowedQueryIntents) {
  const count = queryIntents.filter((queryIntent) => queryIntent === allowedQueryIntent).length;
  if (count !== 1) {
    failures.push(
      `Expected exactly one Android package-visibility query "${allowedQueryIntent}", received ${count}.`,
    );
  }
}

if (failures.length > 0) {
  console.error(`Android exported-component validation failed for ${manifestPath}:`);
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Android exported-component validation passed for ${manifestPath}.`);
for (const component of exportedComponents) {
  console.log(
    `- ${component.key}${component.permission ? ` [${component.permission}]` : ""}`,
  );
}
