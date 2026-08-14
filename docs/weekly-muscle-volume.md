# Weekly muscle volume V2

Status: implemented as a local-only, neutral estimate of weekly training
exposure. It is not a list of targets that every muscle must reach.

## What Gymmin calculates

Gymmin reports **weekly fractional working sets per dashboard muscle group**.
It does not use `sets x repetitions` or `weight x repetitions x sets` for this
view. Those measures describe performed work, but do not map cleanly to the
weekly per-muscle exposure shown on the homepage.

The application has no reliable RIR/RPE value for every set. The result is
therefore an estimate from completed sets, exercise classification and catalog
muscle involvement—not a laboratory measurement of "effective sets".

## Weekly-volume roles

Catalog involvement and the role used for weekly hypertrophy volume are
separate concepts. A deterministic development-time policy assigns one role:

| Weekly role | Contribution |
| --- | ---: |
| `direct` | 1.0 set |
| `indirect` | 0.5 set |
| `stabilizationOnly` | 0 sets |
| `notApplicable` | 0 sets |

The general rule treats catalog level 5 as direct, levels 3–4 as meaningful
indirect work, levels 1–2 as stabilization/small contribution and 0 as not
applicable. Conservative family rules refine that default:

- core counts from explicit trunk-training families such as crunches, chops,
  leg raises, planks, sit-ups and core work; ordinary compound stabilization
  does not become half a hypertrophy set;
- forearms count direct wrist/curl work, plus explicit grip-focused overrides;
  ordinary holding of a load remains stabilization exposure;
- lower back counts spinal-extension work directly and substantial deadlift or
  good-morning erector loading fractionally; incidental bracing does not count;
- explicit, stable-ID overrides cover exceptional movements such as renegade
  rows and dedicated grip holds.

In V2, a completed set of a catalogued direct isometric or anti-movement core
exercise (for example a plank, Pallof press or ab-wheel rollout) counts as one
direct core set. This is a deliberate, simple tracking heuristic—not a claim
that an isometric set and a dynamic weighted crunch produce an identical
hypertrophic stimulus.

When several catalog muscles belong to one dashboard group, one physical set
uses the highest applicable role rather than summing its members. Lats, traps
and lower back therefore cannot turn one row set into multiple Back sets.

## Neutral volume bands

The panel deliberately has no muscle-specific target or `/ 10–20` denominator.
It uses centrally defined Gymmin presentation bands:

| Fractional sets | Band |
| ---: | --- |
| 0 | none |
| 0.5–4.5 | low |
| 5–9.5 | moderate |
| 10–20 | high |
| above 20 | very high |

These boundaries make the visualization readable. They are not minimum
effective volume, an optimum, a hypertrophy threshold or a biological upper
limit. The bar is a visual 0–20 scale; values above 20 keep their real number
while the bar remains full.

`Low`, `Moderate`, `High` and `Very high` describe only the amount of estimated
training exposure recorded by Gymmin. They do **not** diagnose undertraining,
an optimum, overtraining or a recommendation to add volume. In particular,
`Very high` does not mean `too much`.

Current evidence supports a broad dose-response with diminishing returns, but
does not justify presenting the same mandatory 10–20-set target for chest,
abs, forearms, calves and every other group. Gymmin therefore describes the
observed exposure neutrally instead of telling the user that sets are "to do".

## Completed and projected volume

`Completed` uses only sessions that are completed, not deleted and started in
the current local Monday–Sunday week. An entry counts only when it is marked
complete and has execution evidence: a completion timestamp or an actual reps,
weight, duration or target value.

`Plan` is projected end-of-week exposure:

```text
completed volume + remaining planned workout volume
```

A completed session consumes one matching planned occurrence, including when
performed on a different weekday, so it is not counted twice. An unplanned
completed workout still contributes. Supersets retain their original entries
and receive no extra multiplier.

Warm-up, recovery, rest, cooldown and `other` stages are excluded. Repetitions
and weight are not multipliers. Historical exercise IDs resolve to canonical
catalog entries; missing exercises are skipped without crashing the dashboard.

## Dashboard grouping and presentation

Front: chest; shoulders; biceps; core (abs and obliques); quadriceps; hips and
adductors (hips, abductors and adductors).

Back: back (lats, traps and lower back); triceps; glutes; hamstrings; calves;
forearms.

Shoulders and forearms may be visible on both anatomy sides but remain one
logical group. List values, bars and anatomy colors always use the same selected
`Completed | Plan` mode and neutral band. Individual rows can be hidden from
the figure without changing calculations or storage.

## What Gymmin does not calculate

- an individual optimum, MEV, MAV or MRV;
- guaranteed hypertrophic stimulus;
- RIR/RPE-adjusted volume or velocity loss;
- a recommendation to train every listed muscle each week;
- separate targets for Advanced Muscle Mode subdivisions.

If advanced weekly subdivision exposure is added later, values such as upper,
middle and lower chest will describe how exposure is distributed. They must
not each receive an automatic 10–20-set target.

## Evidence and Gymmin heuristics

Evidence-supported product direction:

- weekly set count is a useful practical measure of resistance-training volume;
- hypertrophy generally shows a positive dose-response with diminishing returns;
- meaningful indirect work can be represented fractionally;
- when weekly volume is equated, frequency mainly distributes the work;
- proximity to failure and set quality matter, but Gymmin currently cannot
  measure them reliably for every set.

Gymmin heuristics:

- the `direct / indirect / stabilizationOnly / notApplicable` classifier;
- the 1.0 / 0.5 / 0 weights;
- the 0 / 5 / 10 / 20 presentation boundaries;
- grouping 17 catalog muscle IDs into 12 homepage groups.

## Limitations

- no per-set RIR/RPE, velocity loss or technique-quality data;
- completed sets can differ substantially in stimulus;
- catalog involvement and weekly roles are editorial classifications;
- exercise execution, experience, recovery and individual response are not
  modeled;
- muscle-specific dose-response evidence remains incomplete;
- SVG anatomy is an explanatory simplification, not a diagnostic tool.

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
