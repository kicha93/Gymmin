import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalogDir = path.join(root, "apps", "mobile", "src", "domain", "exerciseCatalog");
const aliasPath = path.join(root, "apps", "mobile", "src", "domain", "exerciseAliases.ts");
const idAliasPath = path.join(root, "apps", "mobile", "src", "domain", "exerciseIdAliases.ts");
const reportPath = path.join(root, "docs", "reports", "exercise-catalog-refactor.json");

function literal(source, endMarker) {
  return JSON.parse(source.slice(source.indexOf("{"), source.lastIndexOf(endMarker) + 1));
}

const catalog = [];
for (const file of await readdir(catalogDir)) {
  if (!file.endsWith(".ts") || file === "index.ts") continue;
  const source = await readFile(path.join(catalogDir, file), "utf8");
  const start = source.indexOf("[");
  const end = source.lastIndexOf("] satisfies");
  catalog.push(...JSON.parse(source.slice(start, end + 1)));
}

const byId = new Map(catalog.map((exercise) => [exercise.id, exercise]));
const validNames = new Set(catalog.flatMap((exercise) => [exercise.name, exercise.polishName]));
const aliasSource = await readFile(aliasPath, "utf8");
const aliases = literal(aliasSource, "} as const");
const idAliases = literal(await readFile(idAliasPath, "utf8"), "} as const");
const report = JSON.parse(await readFile(reportPath, "utf8"));
const replacement = new Map();

for (const merge of report.merges) {
  const currentTarget = byId.get(idAliases[merge.removed.id] ?? merge.canonical.id);
  if (!currentTarget) continue;
  replacement.set(merge.removed.name, currentTarget.name);
  replacement.set(merge.canonical.name, currentTarget.name);
}
for (const change of report.nameChanges) {
  replacement.set(change.before, change.after);
}

function resolveTarget(target) {
  let current = target;
  const visited = new Set();
  while (!validNames.has(current) && replacement.has(current) && !visited.has(current)) {
    visited.add(current);
    current = replacement.get(current);
  }
  return current;
}

const normalized = {};
for (const [source, target] of Object.entries(aliases)) {
  const resolved = resolveTarget(target);
  if (source !== resolved) normalized[source] = resolved;
}

await writeFile(aliasPath, `export const exerciseAliasMap = ${JSON.stringify(Object.fromEntries(Object.entries(normalized).sort(([a], [b]) => a.localeCompare(b))), null, 2)} as const;\n`, "utf8");
