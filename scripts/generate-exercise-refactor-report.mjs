import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(root, "docs", "reports", "exercise-catalog-refactor.json");
const outputPath = path.join(root, "docs", "exercise-catalog-refactor.md");
const report = JSON.parse(await readFile(sourcePath, "utf8"));
const escape = (value) => String(value ?? "—").replaceAll("|", "\\|").replaceAll("\n", " ");
const list = [];

list.push("# Refaktor katalogu ćwiczeń", "", "## Podsumowanie", "");
list.push(`- Liczba ćwiczeń przed zmianami: **${report.beforeCount}**`);
list.push(`- Liczba ćwiczeń po zmianach: **${report.afterCount}**`);
list.push(`- Scalonych duplikatów: **${report.mergedCount}**`);
list.push(`- Zmienionych pól nazw: **${report.nameChanges.length}**`);
list.push(`- Poprawionych wpisów sprzętu: **${report.equipmentChanges.length}**`);
list.push(`- Poprawionych kategorii: **${report.categoryChanges.length}**`);
for (const [tier, count] of Object.entries(report.tierCounts)) list.push(`- ${tier}: **${count}**`);

list.push("", "## Scalenia", "", "| Usunięty rekord | Rekord kanoniczny | Przyczyna |", "|---|---|---|");
for (const merge of report.merges) list.push(`| ${escape(merge.removed.name)} (${merge.removed.id}) | ${escape(merge.canonical.name)} (${merge.canonical.id}) | ${escape(merge.reason)} |`);

list.push("", "## Zmiany nazw", "", "| ID | Pole | Przed | Po |", "|---|---|---|---|");
for (const change of report.nameChanges) list.push(`| ${change.id} | ${change.field} | ${escape(change.before)} | ${escape(change.after)} |`);

list.push("", "## Zmiany sprzętu", "", "| Ćwiczenie | Przed | Po |", "|---|---|---|");
for (const change of report.equipmentChanges) list.push(`| ${escape(change.name)} (${change.id}) | ${escape(change.before.join(", "))} | ${escape(change.after.join(", "))} |`);

list.push("", "## Zmiany kategorii", "", "| Ćwiczenie | Przed | Po |", "|---|---|---|");
for (const change of report.categoryChanges) list.push(`| ${escape(change.name)} (${change.id}) | ${change.before} | ${change.after} |`);

list.push("", "## Przypadki pozostawione do decyzji produktowej", "");
for (const item of report.ambiguousNotMerged) list.push(`- ${item}`);
list.push("", "Pełny raport maszynowy znajduje się w `docs/reports/exercise-catalog-refactor.json`. Mapping kompatybilności znajduje się w `apps/mobile/src/domain/exerciseIdAliases.ts`.", "");

await writeFile(outputPath, `${list.join("\n")}\n`, "utf8");
