import { spawnSync } from "node:child_process";

const allowedAdvisories = new Map([
  ["https://github.com/advisories/GHSA-w3rx-r6r6-pgpr", {
    name: "image-size",
    reason: "Expo/Metro upstream parser advisory; no untrusted ICNS input is processed by Gymmin runtime."
  }],
  ["https://github.com/advisories/GHSA-5p2g-fcmc-qvqq", {
    name: "image-size",
    reason: "Expo/Metro upstream parser advisory; no untrusted JXL/HEIF input is processed by Gymmin runtime."
  }],
  ["https://github.com/advisories/GHSA-w5hq-g745-h8pq", {
    name: "uuid",
    reason: "Expo xcode/config build-tool chain; the vulnerable buffer API is not used by Gymmin runtime."
  }]
]);

const command = process.platform === "win32" ? process.env.ComSpec ?? "cmd.exe" : "npm";
const args = process.platform === "win32"
  ? ["/d", "/s", "/c", "npm audit --json"]
  : ["audit", "--json"];
const result = spawnSync(command, args, {
  cwd: process.cwd(),
  encoding: "utf8",
  maxBuffer: 16 * 1024 * 1024,
  shell: false
});

if (!result.stdout?.trim()) {
  console.error(result.stderr || "npm audit returned no JSON output.");
  process.exit(1);
}

let report;
try {
  report = JSON.parse(result.stdout);
} catch {
  console.error("npm audit returned invalid JSON.");
  process.exit(1);
}

const advisories = new Map();
for (const vulnerability of Object.values(report.vulnerabilities ?? {})) {
  for (const via of vulnerability.via ?? []) {
    if (typeof via === "object" && via?.url) advisories.set(via.url, via);
  }
}

const blocked = [];
for (const advisory of advisories.values()) {
  const allowed = allowedAdvisories.get(advisory.url);
  if (allowed?.name === advisory.name) continue;
  if (advisory.severity === "high" || advisory.severity === "critical") blocked.push(advisory);
}

if (blocked.length > 0) {
  for (const advisory of blocked) {
    console.error(`Blocked npm advisory: ${advisory.severity} ${advisory.name} ${advisory.url}`);
  }
  process.exit(1);
}

for (const [url, allowance] of allowedAdvisories) {
  if (advisories.has(url)) console.warn(`Allowed upstream advisory: ${allowance.name} - ${allowance.reason}`);
}

const counts = report.metadata?.vulnerabilities ?? {};
console.log(`npm audit policy passed: ${counts.critical ?? 0} critical, ${counts.high ?? 0} high, ${counts.moderate ?? 0} moderate; only documented upstream advisories are allowed.`);
