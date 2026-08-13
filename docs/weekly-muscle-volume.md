# Weekly muscle volume

Status: implemented as a local-only hypertrophy-oriented estimate.

## Metric

Gymmin reports **weekly fractional working sets per dashboard muscle group**.
It does not use `sets x repetitions` or `weight x repetitions x sets` as the
homepage hypertrophy metric. Those products describe performed work, but they
do not map cleanly to the weekly per-muscle dose that this feature communicates.

Gymmin does not currently collect a reliable RIR/RPE value for every set. The
result must therefore be described as an estimate based on completed sets and
catalog muscle involvement, not as physiologically proven "effective sets".

## Direct and indirect sets

The existing exercise catalog is the only muscle data source. Its involvement
levels are reduced to an intentionally small fractional model:

| Catalog influence | Fractional contribution |
| --- | ---: |
| 5 - primary | 1.0 |
| 4 - major contributor | 0.5 |
| 3 - significant contributor | 0.5 |
| 2 - secondary | 0 |
| 1 - stabilizing | 0 |
| 0 - inactive | 0 |

Levels 1-2 are not assigned an invented `0.25` contribution. When multiple
catalog muscles belong to one dashboard group, a physical set contributes the
maximum member weight rather than their sum. A row that affects lats, traps and
lower back therefore remains at most one set for the grouped Back row.

## Reference range and statuses

The same broad reference range is used for every dashboard group:

- target range: 10-20 fractional working sets per week;
- below: more than zero but less than 7.5;
- near range: 7.5 to less than 10;
- in range: 10 through 20;
- high volume: more than 20.

The range and the 75% "near" boundary are Gymmin product heuristics, not sharp
biological or medical thresholds. Current evidence supports a positive
dose-response with diminishing returns, but not precise universal targets for
each individual muscle. Gymmin therefore does not present different
muscle-specific numbers as scientific facts.

## Evidence and product heuristics

Evidence-supported decisions:

- weekly set count is a useful practical volume measure for hypertrophy;
- the dose-response is positive with diminishing returns;
- meaningful indirect work can be counted fractionally;
- when weekly volume is equated, frequency is primarily a way to distribute
  work and does not need its own multiplier in this model.

Gymmin heuristics:

- translating catalog scores 5/4/3/2/1 to 1/0.5/0.5/0/0;
- the shared 10-20 reference range;
- the 7.5 near-range boundary;
- grouping 17 catalog muscle IDs into a compact homepage overview.

## Completed and projected volume

`Completed` uses only sessions that are completed, not deleted and started in
the current local Monday-Sunday week. An exercise entry counts only when it is
marked complete and has execution evidence: a completion timestamp or an
actual reps, weight, duration or target value. This preserves the guided
workout's existing preselected-checkbox UX while preventing untouched empty
entries from being counted as performed volume.

`Plan` means projected end-of-week volume:

```text
completed volume + remaining planned workout volume
```

Existing weekly-plan semantics are preserved. A completed session consumes one
matching planned occurrence even if it was performed on another weekday. A
completed occurrence is not added again from the workout definition. An
unplanned completed workout still contributes to completed volume.

Supersets need no multiplier or wrapper handling: their exercise results remain
the original session entries and each actual set is counted once.

Warm-up, recovery, rest, cooldown and `other` stages are excluded. Repetitions
and weight are not volume multipliers. Missing catalog exercises are skipped
without failing the dashboard, and historical IDs use the canonical resolver.

## Dashboard grouping

Front: chest; shoulders; biceps; core (abs and obliques); quadriceps; hips and
adductors (hips, abductors and adductors).

Back: back (lats, traps and lower back); triceps; glutes; hamstrings; calves;
forearms.

Shoulders and forearms can be visible on both anatomy sides but remain one
logical group and are never counted twice. The homepage reuses the same SVG
anatomy component and body maps as Exercise Detail.

## Dashboard interaction and responsive layout

- `Completed | Plan` and `Front | Back` are independent segmented controls. They share one row on normal phones and stack only below 340 dp.
- The result list occupies the flexible part of the dashboard. The anatomy column uses width-aware dimensions: 122 x 292 below 340 dp, 138 x 322 below 390 dp, and 154 x 350 on wider phones.
- The figure preserves its aspect ratio, uses nearly the full anatomy column and shows only the selected body side.
- Every visible muscle-group row is pressable. Turning a group off grays both the row and its anatomy regions; turning it on restores the color for the current volume status.
- Hidden groups are transient UI state. They remain part of the calculation and are not persisted or included in backup.
- The list, progress bars and anatomy always read the same completed/projected mode and the same status model. Empty weeks use a neutral figure rather than presenting every muscle as a warning.

## Limitations

- no per-set RIR/RPE, velocity loss or technique-quality data;
- a completed set is not guaranteed to have been sufficiently close to failure;
- the catalog involvement score is an editorial classification, not a direct
  physiological measurement;
- experience, recovery and individual response do not personalize the range;
- the current SVG has no dedicated adductor region;
- this is a hypertrophy-oriented educational estimate, not medical advice.

## Research references

- Pelland J. et al. *The Resistance Training Dose Response: Meta-Regressions
  Exploring the Effects of Weekly Volume and Frequency on Muscle Hypertrophy
  and Strength Gains*. Sports Medicine (2026).
  [PubMed](https://pubmed.ncbi.nlm.nih.gov/41343037/).
- Schoenfeld B.J., Ogborn D., Krieger J.W. *Dose-response relationship between
  weekly resistance training volume and increases in muscle mass* (2017).
  [PubMed](https://pubmed.ncbi.nlm.nih.gov/27433992/).
- Baz-Valle E. et al. *A Systematic Review of the Effects of Different
  Resistance Training Volumes on Muscle Hypertrophy* (2022).
  [PubMed](https://pubmed.ncbi.nlm.nih.gov/35291645/).
- Grgic J., Schoenfeld B.J., Latella C. *Resistance training frequency and
  skeletal muscle hypertrophy: a review of available evidence* (2019).
  [PubMed](https://pubmed.ncbi.nlm.nih.gov/30236847/).
- Refalo M.C. et al. *Influence of Resistance Training Proximity-to-Failure on
  Skeletal Muscle Hypertrophy: A Systematic Review with Meta-analysis* (2023).
  [PubMed](https://pubmed.ncbi.nlm.nih.gov/36334240/).
