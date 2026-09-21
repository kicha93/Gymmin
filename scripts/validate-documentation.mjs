import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const docsRoot = path.join(root, "docs");
const failures = [];

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

const markdownFiles = [
  path.join(root, "README.md"),
  path.join(root, "CONTRIBUTING.md"),
  path.join(root, "SECURITY.md"),
  ...walk(docsRoot).filter((file) => file.endsWith(".md"))
];

const requiredFiles = [
  "LICENSE",
  "SECURITY.md",
  "CONTRIBUTING.md",
  "docs/README.md",
  "docs/archive/README.md",
  "docs/workout-creator.md",
  "docs/privacy/index.html",
  "docs/privacy/en/index.html"
];

for (const relative of requiredFiles) {
  if (!fs.existsSync(path.join(root, relative))) failures.push(`Missing required documentation file: ${relative}`);
}

for (const file of markdownFiles) {
  const source = fs.readFileSync(file, "utf8");
  const relativeFile = path.relative(root, file).replaceAll(path.sep, "/");
  for (const match of source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const rawTarget = match[1].trim().replace(/^<|>$/g, "");
    if (!rawTarget || /^(?:https?:|mailto:|#|codex:)/i.test(rawTarget)) continue;
    const withoutAnchor = rawTarget.split("#", 1)[0];
    if (!withoutAnchor) continue;
    const decoded = decodeURIComponent(withoutAnchor);
    const resolved = path.resolve(path.dirname(file), decoded);
    if (!fs.existsSync(resolved)) failures.push(`${relativeFile}: broken local link ${rawTarget}`);
  }
}

const rootPackage = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const mobilePackage = JSON.parse(fs.readFileSync(path.join(root, "apps/mobile/package.json"), "utf8"));
const activeFiles = markdownFiles.filter((file) => !file.includes(`${path.sep}docs${path.sep}archive${path.sep}`));
for (const file of activeFiles) {
  const source = fs.readFileSync(file, "utf8");
  const relativeFile = path.relative(root, file).replaceAll(path.sep, "/");
  for (const match of source.matchAll(/npm run ([a-zA-Z0-9:_-]+)/g)) {
    if (!rootPackage.scripts?.[match[1]]) failures.push(`${relativeFile}: unknown root npm script ${match[1]}`);
  }
  for (const match of source.matchAll(/npm --prefix apps\/mobile run ([a-zA-Z0-9:_-]+)/g)) {
    if (!mobilePackage.scripts?.[match[1]]) failures.push(`${relativeFile}: unknown mobile npm script ${match[1]}`);
  }
}

const staleClaims = [
  /application repository is private/i,
  /główne repozytorium pozostaje prywatne/i,
  /legacy picker remains in the repository/i,
  /private GitHub Release/i
];
for (const file of activeFiles) {
  const source = fs.readFileSync(file, "utf8");
  for (const pattern of staleClaims) {
    if (pattern.test(source)) failures.push(`${path.relative(root, file)}: stale claim matched ${pattern}`);
  }
}

if (failures.length) {
  console.error(`Documentation validation failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Documentation validation passed: ${markdownFiles.length} Markdown files checked.`);
