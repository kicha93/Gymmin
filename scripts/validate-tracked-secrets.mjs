import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const forbiddenTrackedPaths = [
  {
    pattern: /(^|\/)\.env(?:\.|$)/iu,
    allow: /(^|\/)\.env\.example$/iu,
    reason: "environment file",
  },
  {
    pattern: /(^|\/)upload-keystore\.properties$/iu,
    reason: "Android upload-keystore properties",
  },
  {
    pattern: /(^|\/)google-services\.json$/iu,
    reason: "Firebase Android configuration",
  },
  {
    pattern: /(^|\/)GoogleService-Info\.plist$/u,
    reason: "Firebase iOS configuration",
  },
  {
    pattern: /(^|\/)(?:[^/]*service[-_.]?account[^/]*)\.json$/iu,
    reason: "service-account JSON",
  },
  {
    pattern: /(^|\/)secrets\.json$/iu,
    reason: "user-secrets file",
  },
  {
    pattern: /\.(?:jks|keystore|p12|pfx|pkcs12|mobileprovision)$/iu,
    allow: /^apps\/mobile\/android\/app\/debug\.keystore$/iu,
    reason: "signing key or provisioning profile",
  },
];

const secretSignatures = [
  {
    pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/u,
    reason: "private key",
  },
  {
    pattern: /\bAKIA[0-9A-Z]{16}\b/u,
    reason: "AWS access key",
  },
  {
    pattern: /\bASIA[0-9A-Z]{16}\b/u,
    reason: "AWS temporary access key",
  },
  {
    pattern: /\bAIza[0-9A-Za-z_-]{35}\b/u,
    reason: "Google API key",
  },
  {
    pattern: /\bgh(?:p|o|u|s|r)_[A-Za-z0-9]{36,}\b/u,
    reason: "GitHub token",
  },
  {
    pattern: /\bgithub_pat_[A-Za-z0-9_]{40,}\b/u,
    reason: "GitHub fine-grained token",
  },
  {
    pattern: /\bnpm_[A-Za-z0-9]{36}\b/u,
    reason: "npm access token",
  },
  {
    pattern: /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}\b/u,
    reason: "OpenAI-style secret key",
  },
  {
    pattern: /\bsk_live_[A-Za-z0-9]{16,}\b/u,
    reason: "Stripe live secret key",
  },
  {
    pattern: /\bxox(?:b|p|a|r|s)-[A-Za-z0-9-]{20,}\b/u,
    reason: "Slack token",
  },
  {
    pattern: /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\b/u,
    reason: "SendGrid API key",
  },
];

const literalSecretAssignment =
  /(?:OPENAI_API_KEY|GYMMIN_UPLOAD_STORE_PASSWORD|GYMMIN_UPLOAD_KEY_PASSWORD|Gymmin__OpenAI__ApiKey|Gymmin__Smtp__Password|Gymmin__GooglePlay__ServiceAccountJsonBase64)\s*[:=]\s*["']?([^\s"',;]+)/giu;
const safeLiteralMarkers =
  /(?:\$\{|\$\(|\$env:|process\.env|<[^>]+>|example|dummy|invalid|placeholder|test|ci-password|changeme|not-set|redacted)/iu;
const maxTextScanBytes = 2 * 1024 * 1024;
const privateKeyHeader = ["-----BEGIN", "PRIVATE KEY-----"].join(" ");
const googleServiceAccountPrivateKeyPattern = new RegExp(
  `"private_key"\\s*:\\s*"${privateKeyHeader}`,
  "u",
);

function findContentFailures(content) {
  const failures = [];
  for (const signature of secretSignatures) {
    if (signature.pattern.test(content)) {
      failures.push(signature.reason);
    }
  }

  if (
    /"type"\s*:\s*"service_account"/u.test(content) &&
    googleServiceAccountPrivateKeyPattern.test(content)
  ) {
    failures.push("Google service-account private key");
  }

  for (const match of content.matchAll(literalSecretAssignment)) {
    const value = match[1];
    if (value && value.length >= 12 && !safeLiteralMarkers.test(value)) {
      failures.push(`literal value assigned to ${match[0].split(/[:=]/u)[0].trim()}`);
    }
  }

  return [...new Set(failures)];
}

function runSelfChecks() {
  const detectedSamples = [
    [`${privateKeyHeader}\nabc`, "private key"],
    [`OPENAI_API_KEY=${"sk-" + "a".repeat(32)}`, "OpenAI-style secret key"],
    [
      `{"type":"service_account","private_key":"${privateKeyHeader}\\nabc"}`,
      "Google service-account private key",
    ],
    [
      `Gymmin__Smtp__Password=${"real-production-value"}`,
      "literal value assigned",
    ],
  ];
  for (const [sample, expected] of detectedSamples) {
    if (!findContentFailures(sample).some((failure) => failure.includes(expected))) {
      throw new Error(`Secret scanner self-check failed to detect ${expected}.`);
    }
  }

  const safeSamples = [
    "OPENAI_API_KEY=sk-...",
    "GYMMIN_UPLOAD_STORE_PASSWORD=gymmin-ci-password",
    "Gymmin__Smtp__Password=${SMTP_PASSWORD}",
    "const key = process.env.OPENAI_API_KEY;",
  ];
  for (const sample of safeSamples) {
    if (findContentFailures(sample).length > 0) {
      throw new Error(`Secret scanner self-check rejected safe sample: ${sample}`);
    }
  }
}

runSelfChecks();

const trackedFiles = execFileSync("git", ["ls-files", "-z"], {
  cwd: repositoryRoot,
  encoding: "utf8",
})
  .split("\0")
  .filter(Boolean);
const failures = [];
let scannedTextFiles = 0;

for (const trackedFile of trackedFiles) {
  const normalizedPath = trackedFile.replaceAll("\\", "/");
  for (const forbidden of forbiddenTrackedPaths) {
    if (
      forbidden.pattern.test(normalizedPath) &&
      !(forbidden.allow?.test(normalizedPath) ?? false)
    ) {
      failures.push(`${normalizedPath}: tracked ${forbidden.reason}`);
    }
  }

  const absolutePath = path.join(repositoryRoot, trackedFile);
  const fileSize = statSync(absolutePath).size;
  if (fileSize === 0 || fileSize > maxTextScanBytes) {
    continue;
  }

  const buffer = readFileSync(absolutePath);
  if (buffer.includes(0)) {
    continue;
  }

  scannedTextFiles += 1;
  const content = buffer.toString("utf8");
  for (const reason of findContentFailures(content)) {
    failures.push(`${normalizedPath}: detected ${reason}`);
  }
}

if (failures.length > 0) {
  console.error("Tracked-secret validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  console.error(
    "Remove the material from Git, rotate any exposed credential, and provide production values through the approved secret manager/environment.",
  );
  process.exit(1);
}

console.log(
  `Tracked-secret validation passed: ${trackedFiles.length} tracked paths checked, ${scannedTextFiles} text files scanned.`,
);
