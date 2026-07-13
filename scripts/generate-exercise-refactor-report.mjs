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
list.push(`- Poprawionych kategorii fazy 1: **${report.categoryChanges.length}**`);
if (report.phase2) list.push(`- Poprawionych kategorii fazy 2: **${report.phase2.categoryChanges.length}**`);
for (const [tier, count] of Object.entries(report.tierCounts)) list.push(`- ${tier}: **${count}**`);

list.push("", "## Scalenia", "", "| Usunięty rekord | Rekord kanoniczny | Przyczyna |", "|---|---|---|");
for (const merge of report.merges) list.push(`| ${escape(merge.removed.name)} (${merge.removed.id}) | ${escape(merge.canonical.name)} (${merge.canonical.id}) | ${escape(merge.reason)} |`);

if (report.phase2) {
  list.push("", "## Kontrola ryzykownych scaleń", "", "| Źródło | Cel | Decyzja | Dowody |", "|---|---|---|---|");
  for (const item of report.phase2.riskyMergeDecisions) list.push(`| ${item.sourceId} | ${item.targetId} | ${item.decision} | ${escape(item.evidence)} |`);
}

list.push("", "## Zmiany nazw", "", "| ID | Pole | Przed | Po |", "|---|---|---|---|");
for (const change of report.nameChanges) list.push(`| ${change.id} | ${change.field} | ${escape(change.before)} | ${escape(change.after)} |`);

list.push("", "## Zmiany sprzętu", "", "| Ćwiczenie | Przed | Po |", "|---|---|---|");
for (const change of report.equipmentChanges) list.push(`| ${escape(change.name)} (${change.id}) | ${escape(change.before.join(", "))} | ${escape(change.after.join(", "))} |`);

list.push("", "## Zmiany kategorii", "", "| Ćwiczenie | Przed | Po |", "|---|---|---|");
for (const change of report.categoryChanges) list.push(`| ${escape(change.name)} (${change.id}) | ${change.before} | ${change.after} |`);
if (report.phase2) {
  list.push("", "### Faza kontrolna", "", "| Ćwiczenie | Przed | Po |", "|---|---|---|");
  for (const change of report.phase2.categoryChanges) list.push(`| ${escape(change.name)} (${change.id}) | ${change.before} | ${change.after} |`);
  list.push("", "## Klasyfikacja libraryTier", "", "| Tier | Przed audytem | Po audycie |", "|---|---:|---:|");
  for (const tier of Object.keys(report.phase2.tierCountsAfter)) list.push(`| ${tier} | ${report.phase2.tierCountsBefore[tier] ?? 0} | ${report.phase2.tierCountsAfter[tier]} |`);
  list.push("", `Pełna lista **${report.phase2.tierChanges.length}** zmian tierów wraz z przyczynami znajduje się w raporcie JSON.`);
  list.push("", "## Obsługa aliasów ID", "", "Centralny `resolveExerciseId(id)` jest używany przez:", "", "- lookup katalogu i wyszukiwanie rekordu;", "- normalizację zapisanych i synchronizowanych planów treningowych;", "- normalizację historii oraz aktywnych sesji;", "- progres i statystyki grupowane po ćwiczeniu;", "- ulubione wraz z synchronizacją;", "- treści techniczne ćwiczeń;", "- lookup obrazów i assetów.");
  list.push("", "Backend przechowuje identyfikator jako wartość opaque; kanonizacja odbywa się w mobile na granicy odczytu i przed kolejnym zapisem/synchronizacją.");
  list.push("", "## Testy fazy kontrolnej", "", "- rozdzielenie Dead-hang Biceps Curl i EZ-Bar Preacher Curl;", "- dedykowane kategorie front raise, step-up, good morning i rope climb;", "- kanonizacja ID w planach, sesjach, progresie, ulubionych i assetach;", "- brak cykli, wieloetapowych aliasów i brakujących celów w walidatorze;", "- domyślna biblioteka pokazuje tylko tier `main`.");
  list.push("", "## Weryfikacja", "");
  for (const [name, result] of Object.entries(report.phase2.verification ?? {})) list.push(`- ${name}: ${result}`);
}

list.push("", "## Przypadki pozostawione do decyzji produktowej", "");
for (const item of report.ambiguousNotMerged) list.push(`- ${item}`);
for (const item of report.phase2?.unresolvedProductDecisions ?? []) list.push(`- ${item}`);
list.push("", "Pełny raport maszynowy znajduje się w `docs/reports/exercise-catalog-refactor.json`. Mapping kompatybilności znajduje się w `apps/mobile/src/domain/exerciseIdAliases.ts`.", "");

await writeFile(outputPath, `${list.join("\n")}\n`, "utf8");
