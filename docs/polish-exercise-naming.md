# Polish exercise naming

Gymmin uses names that Polish gym users can recognize quickly. Exercise names are not literal translations of the English catalog.

## Rules

- Prefer the established Polish gym name: `wspięcia na palce`, `francuskie wyciskanie`, `szrugsy`.
- Keep an established English term when it is more common and clearer in Polish usage: `dead bug`, `good morning`, `hip thrust`, `face pull`, `mountain climbers`, `rack pull`, `wood chop`.
- Add a short Polish qualifier only when it distinguishes the variant, equipment, position, angle, or direction.
- Avoid word-for-word calques such as `martwy robak`, `rąbanie drewna`, `kopnięcia osła`, or `toczenie koła do ćwiczeń`.
- Keep `exerciseId`, the English canonical name, category, equipment, and muscle data unchanged during a naming correction.
- Former names may remain as search/import aliases, but they must never be the displayed canonical name.

## Audit baseline

The complete 805-exercise baseline catalog was reviewed in August 2026. After explicit resistance-band, alternating, and duplicate weighted/unweighted variants were merged into canonical base exercises, the active catalog contains 729 canonical exercises. The audit prioritized literal calques, established gym loanwords, inconsistent family naming, spelling errors, and unnecessarily descriptive names. Corrections were applied by exercise family so variants use one vocabulary. Smith-machine and sliding-disc variants remain when their equipment materially defines the movement.

The catalog validator rejects the known literal-calque patterns found during this audit. A future catalog regeneration must preserve these naming rules and pass `npm run exercise:catalog:validate`.
