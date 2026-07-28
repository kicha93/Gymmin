import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const androidSourceRoot = path.join(
  repositoryRoot,
  "apps",
  "mobile",
  "android",
  "app",
  "src",
);

const readSource = (...segments) =>
  readFileSync(path.join(androidSourceRoot, ...segments), "utf8");

const failures = [];
const assertContains = (source, pattern, message) => {
  if (!pattern.test(source)) {
    failures.push(message);
  }
};

const releaseManifest = readSource("main", "AndroidManifest.xml");
assertContains(
  releaseManifest,
  /android:allowBackup="false"/,
  'Release manifest must set android:allowBackup="false".',
);
assertContains(
  releaseManifest,
  /android:usesCleartextTraffic="false"/,
  'Release manifest must set android:usesCleartextTraffic="false".',
);
assertContains(
  releaseManifest,
  /android:networkSecurityConfig="@xml\/network_security_config"/,
  "Release manifest must reference the production network security config.",
);
assertContains(
  releaseManifest,
  /android:fullBackupContent="@xml\/backup_rules"/,
  "Release manifest must reference Android 11 backup rules.",
);
assertContains(
  releaseManifest,
  /android:dataExtractionRules="@xml\/data_extraction_rules"/,
  "Release manifest must reference Android 12+ extraction rules.",
);

const networkSecurityConfig = readSource(
  "main",
  "res",
  "xml",
  "network_security_config.xml",
);
assertContains(
  networkSecurityConfig,
  /<base-config\s+cleartextTrafficPermitted="false"\s*\/>/,
  "Production network security config must reject cleartext traffic.",
);

const backupDomains = [
  "root",
  "file",
  "database",
  "sharedpref",
  "external",
  "device_root",
  "device_file",
  "device_database",
  "device_sharedpref",
];
const backupRules = readSource("main", "res", "xml", "backup_rules.xml");
const extractionRules = readSource(
  "main",
  "res",
  "xml",
  "data_extraction_rules.xml",
);

for (const domain of backupDomains) {
  const exclusion = new RegExp(
    `<exclude\\s+domain="${domain}"\\s+path="\\."\\s*\\/>`,
    "g",
  );
  const legacyMatches = backupRules.match(exclusion) ?? [];
  if (legacyMatches.length !== 1) {
    failures.push(`Legacy backup rules must exclude the ${domain} domain.`);
  }

  const modernMatches = extractionRules.match(exclusion) ?? [];
  if (modernMatches.length !== 2) {
    failures.push(
      `Android 12+ rules must exclude the ${domain} domain from cloud backup and device transfer.`,
    );
  }
}

for (const variant of ["debug", "debugOptimized"]) {
  const manifest = readSource(variant, "AndroidManifest.xml");
  assertContains(
    manifest,
    /android:usesCleartextTraffic="true"/,
    `${variant} manifest must explicitly allow local HTTP development traffic.`,
  );
  assertContains(
    manifest,
    /android:networkSecurityConfig="@xml\/network_security_config_debug"/,
    `${variant} manifest must use the debug-only network security config.`,
  );
  const debugNetworkConfig = readSource(
    variant,
    "res",
    "xml",
    "network_security_config_debug.xml",
  );
  assertContains(
    debugNetworkConfig,
    /<base-config\s+cleartextTrafficPermitted="true"\s*\/>/,
    `${variant} network security config must allow local HTTP development traffic.`,
  );
}

if (failures.length > 0) {
  console.error("Android release security validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(
  "Android release security validation passed: HTTPS-only release traffic and backup exclusions are configured.",
);
