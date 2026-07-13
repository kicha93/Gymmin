# Refaktor katalogu ćwiczeń

## Podsumowanie

- Liczba ćwiczeń przed zmianami: **978**
- Liczba ćwiczeń po zmianach: **964**
- Scalonych duplikatów: **14**
- Zmienionych pól nazw: **34**
- Poprawionych wpisów sprzętu: **11**
- Poprawionych kategorii fazy 1: **44**
- Poprawionych kategorii fazy 2: **24**
- main: **683**
- advanced: **16**
- sportSpecific: **67**
- rehab: **26**
- variation: **169**
- progression: **2**
- deprecated: **1**

## Scalenia

| Usunięty rekord | Rekord kanoniczny | Przyczyna |
|---|---|---|
| Farmer's Carry (carry-farmers-carry-150) | Farmer's Walk (carry-farmers-walk-153) | same loaded carry |
| Farmer's Carry on Toes (carry-farmers-carry-on-toes-151) | Farmer's Walk on Toes (carry-farmers-walk-on-toes-154) | same loaded carry on toes |
| Squat (squat-squat-1299) | Air Squat (squat-air-squat-1246) | same bodyweight squat |
| Back Squats (squat-back-squats-1249) | Barbell Back Squat (squat-barbell-back-squat-1251) | same barbell back squat |
| Barbell Shoulder Press (shoulder-press-barbell-shoulder-press-1114) | Barbell Overhead Press (shoulder-press-overhead-barbell-press-1125) | same strict standing barbell press |
| Military Press (shoulder-press-military-press-1123) | Barbell Overhead Press (shoulder-press-overhead-barbell-press-1125) | historical name for strict barbell overhead press |
| Strict Press (shoulder-press-strict-press-1133) | Barbell Overhead Press (shoulder-press-overhead-barbell-press-1125) | same strict barbell overhead press |
| Dumbbell Shoulder Press (shoulder-press-dumbbell-shoulder-press-1120) | Overhead Dumbbell Press (shoulder-press-overhead-dumbbell-press-1126) | same standing dumbbell overhead press |
| Standing Dumbbell Biceps Curl (curl-standing-dumbbell-biceps-curl-363) | Dumbbell Biceps Curl (curl-dumbbell-biceps-curl-339) | standing is the default dumbbell curl |
| Standing Alternating Dumbbell Curls (curl-standing-alternating-dumbbell-curls-362) | Alternating Dumbbell Biceps Curl (curl-alternating-dumbbell-biceps-curl-323) | same alternating standing dumbbell curl |
| Cable Crunch (crunch-cable-crunch-238) | Kneeling Cable Crunch (crunch-kneeling-cable-crunch-255) | generic record describes kneeling cable crunch |
| Reverse-grip Press-down (triceps-extension-reverse-grip-pressdown-1414) | Reverse-grip Triceps Press-down (triceps-extension-reverse-grip-triceps-pressdown-1415) | same reverse-grip cable press-down |
| Calf Raise (calf-raise-calf-raise-107) | Standing Calf Raise (calf-raise-standing-calf-raise-118) | same unweighted standing calf raise |

## Kontrola ryzykownych scaleń

| Źródło | Cel | Decyzja | Dowody |
|---|---|---|---|
| curl-dead-hang-biceps-curl-337 | curl-ez-bar-preacher-curl-344 | reverted | Source has a Garmin identity and a forward free-hanging arm position; target is an EZ-bar preacher-bench curl. Position and support differ despite matching muscle/equipment flags. |
| stage2-back-extension | hyperextension-hyperextension-496 | alias_removed_not_restored | No source catalog record, technique content, image or historical source payload exists in repository history; equivalence cannot be demonstrated and inventing a duplicate record would violate catalog validation. |

## Zmiany nazw

| ID | Pole | Przed | Po |
|---|---|---|---|
| pull-up-chin-up-902 | polishName | Podciąganie na drążku | Podciąganie na drążku podchwytem |
| pull-up-pull-up-918 | polishName | Podciąganie na drążku | Podciąganie na drążku nachwytem |
| pull-up-band-assisted-chin-up-898 | polishName | Podciąganie na drążku (z gumą oporową) | Podciąganie na drążku podchwytem z pomocą gumy |
| pull-up-band-assisted-pull-up-899 | polishName | Podciąganie na drążku (z gumą oporową) | Podciąganie na drążku nachwytem z pomocą gumy |
| plank-rolling-side-plank-763 | polishName | Deska boczna z rotacją | Przejścia między deskami bocznymi |
| plank-side-plank-to-plank-with-reach-under-768 | polishName | Deska boczna z rotacją | Deska boczna z przejściem do deski i sięganiem pod tułów |
| plank-side-plank-with-reach-under-774 | polishName | Deska boczna z rotacją | Deska boczna z sięganiem pod tułów |
| squat-air-squat-1246 | name | Air Squat | Bodyweight Squat |
| squat-air-squat-1246 | polishName | Przysiady (bez obciążenia) | Przysiad bez obciążenia |
| shoulder-press-overhead-dumbbell-press-1126 | name | Overhead Dumbbell Press | Dumbbell Shoulder Press |
| crunch-kneeling-cable-crunch-255 | polishName | Spięcia brzucha z linką wyciągu górnego w klęku | Spięcia brzucha na wyciągu w klęku |
| triceps-extension-reverse-grip-triceps-pressdown-1415 | polishName | Wyciskanie tricepsów z linką wyciągu górnego podchwytem | Prostowanie ramion na wyciągu podchwytem |
| calf-raise-standing-calf-raise-118 | polishName | Wznosy łydek stojąc | Wspięcia na palce stojąc |
| hyperextension-hyperextension-496 | name | Hyperextension | Back Extension |
| hyperextension-hyperextension-496 | polishName | Unoszenie tułowia na ławce dodatniej | Wyprost grzbietu |
| triceps-extension-dumbbell-kickback-1404 | name | Dumbbell Kick-back | Dumbbell Triceps Kickback |
| triceps-extension-dumbbell-kickback-1404 | polishName | Wiosłowanie hantlem w opadzie tułowia | Prostowanie ramienia z hantlem w opadzie tułowia |
| flye-cable-crossover-398 | polishName | Odwodzenie ramion z użyciem linek wyciągu górnego | Rozpiętki na bramie |
| lateral-raise-seated-rear-lateral-raise-560 | polishName | Wznosy wyprostowanych ramion przodem siedząc | Unoszenie hantli bokiem w opadzie tułowia siedząc |
| calf-raise-seated-dumbbell-toe-raise-110 | polishName | Wspięcia na palce z hantlami siedząc | Unoszenie palców stóp z hantlem siedząc |
| hip-raise-barbell-hip-thrust-on-floor-407 | name | Barbell Hip Thrust on Floor | Barbell Glute Bridge |
| hip-raise-barbell-hip-thrust-on-floor-407 | polishName | Hip thrust ze sztangą z podłogi | Mostek biodrowy ze sztangą |
| banded-exercises-external-rotation-at-90-degree-abduction-11 | polishName | Rotacja zewnętrzna ramienia z linką wyciągu pod kątem 90 Stopni (z gumą oporową) | Rotacja zewnętrzna ramienia z gumą przy odwiedzeniu do 90 stopni |
| banded-exercises-kneeling-crunch-21 | polishName | Spięcia brzucha na wyciągu w klęku (z gumą oporową) | Spięcia brzucha w klęku z gumą oporową |
| squat-wall-ball-squat-and-press-1317 | polishName | Przysiady przy ścianie z piłką gimnastyczną i z wyciskaniem | Przysiad z wyrzutem piłki lekarskiej o ścianę |
| shoulder-press-dumbbell-push-press-1119 | polishName | Wyciskanie hantli | Wyciskanie hantli nad głowę z wybiciem z nóg |
| core-cable-core-press-186 | name | Cable Core Press | Pallof Press |
| core-cable-core-press-186 | polishName | Wyciskanie tułowia na wyciągu | Pallof press na wyciągu |
| cardio-ski-moguls-132 | polishName | Ski Moguls | Skoki narciarskie na boki |
| indoor-bike-assault-bike-532 | polishName | Assault Bike | Rower powietrzny Assault Bike |
| lateral-raise-scaption-558 | polishName | Scaption | Unoszenie ramion w płaszczyźnie łopatki |
| run-sprint-1086 | polishName | Sprint | Bieg sprinterski |
| squat-goblet-squat-1280 | polishName | Goblet Squat | Przysiad goblet |
| total-body-burpee-1381 | polishName | Burpee | Burpee (padnij-powstań) |

## Zmiany sprzętu

| Ćwiczenie | Przed | Po |
|---|---|---|
| Decline Dumbbell Bench Press (bench-press-decline-dumbbell-bench-press-81) | barbell, bench | dumbbell, bench |
| Standing Dumbbell Calf Raise (calf-raise-standing-dumbbell-calf-raise-119) |  | dumbbell |
| Standing Cable Hip Abduction (hip-stability-standing-cable-hip-abduction-468) |  | cableMachine |
| Ring Plank Sprawls (plank-ring-plank-sprawls-762) |  | rings |
| Swiss Ball Plank with Feet on Bench (plank-swiss-ball-plank-with-feet-on-bench-784) | swissBall | swissBall, bench |
| Overhead Dumbbell Shrug (shrug-overhead-dumbbell-shrug-1185) | barbell | dumbbell |
| Dumbbell Step-over (squat-dumbbell-stepover-1276) | barbell, box | dumbbell, box |
| Ankle Dorsiflexion with Band (warm-up-ankle-dorsiflexion-with-band-1481) |  | band |
| Swiss Ball Hip Crossover (warm-up-swiss-ball-hip-crossover-1501) |  | swissBall |
| Swiss Ball Reach, Roll, and Lift (warm-up-swiss-ball-reach-roll-and-lift-1502) |  | swissBall |
| Swiss Ball Windshield Wipers (warm-up-swiss-ball-windshield-wipers-1503) |  | swissBall |

## Zmiany kategorii

| Ćwiczenie | Przed | Po |
|---|---|---|
| Hollow, Hold, and Roll (hyperextension-hollow-hold-and-roll-495) | HYPEREXTENSION | CORE |
| Knee Raises (hyperextension-knee-raises-498) | HYPEREXTENSION | LEG_RAISE |
| Lat Pull-down with Row (hyperextension-lat-pull-down-with-row-500) | HYPEREXTENSION | ROW |
| Medicine Ball Deadlift-to-Reach (hyperextension-medicine-ball-deadlift-to-reach-501) | HYPEREXTENSION | DEADLIFT |
| One-arm One-leg Row (hyperextension-one-arm-one-leg-row-502) | HYPEREXTENSION | ROW |
| One-arm Row with Band (hyperextension-one-arm-row-with-band-503) | HYPEREXTENSION | ROW |
| Overhead Lunge with Medicine Ball (hyperextension-overhead-lunge-with-medicine-ball-504) | HYPEREXTENSION | LUNGE |
| Plank Knee Tucks (hyperextension-plank-knee-tucks-505) | HYPEREXTENSION | PLANK |
| Side Step (hyperextension-side-step-506) | HYPEREXTENSION | HIP_STABILITY |
| Leg Extensions (crunch-leg-extensions-260) | SQUAT | LEG_EXTENSION |
| Alternating Box Dumbbell Step-ups (squat-alternating-box-dumbbell-step-ups-1247) | SQUAT | LUNGE |
| Barbell Lateral Step-up (squat-barbell-lateral-step-up-1256) | SQUAT | LUNGE |
| Barbell Step-up (squat-barbell-step-up-1261) | SQUAT | LUNGE |
| Barbell Step-over (squat-barbell-stepover-1262) | SQUAT | LUNGE |
| Crossover Dumbbell Step-up (squat-crossover-dumbbell-step-up-1268) | SQUAT | LUNGE |
| Dumbbell Step-up (squat-dumbbell-step-up-1275) | SQUAT | LUNGE |
| Dumbbell Step-over (squat-dumbbell-stepover-1276) | SQUAT | LUNGE |
| Lateral Dumbbell Step-up (squat-lateral-dumbbell-step-up-1284) | SQUAT | LUNGE |
| Step-up (squat-step-up-1305) | SQUAT | LUNGE |
| Barbell Hang Squat Snatch (squat-barbell-hang-squat-snatch-1255) | SQUAT | OLYMPIC_LIFT |
| Barbell Squat Snatch (squat-barbell-squat-snatch-1259) | SQUAT | OLYMPIC_LIFT |
| Dumbbell Squat Clean (squat-dumbbell-squat-clean-1273) | SQUAT | OLYMPIC_LIFT |
| Dumbbell Squat Snatch (squat-dumbbell-squat-snatch-1274) | SQUAT | OLYMPIC_LIFT |
| American Swing (squat-squat-american-swing-1300) | SQUAT | HIP_SWING |
| Kettlebell Swing Overhead (squat-kettlebell-swing-overhead-1282) | SQUAT | HIP_SWING |
| Dumbbell Front Raise (shoulder-press-dumbbell-front-raise-1117) | SHOULDER_PRESS | LATERAL_RAISE |
| Weight-plate Front Raise (shoulder-press-weight-plate-front-raise-1135) | SHOULDER_PRESS | LATERAL_RAISE |
| Band Good Morning (leg-curl-band-good-morning-571) | LEG_CURL | DEADLIFT |
| Bar Good Morning (leg-curl-bar-good-morning-572) | LEG_CURL | DEADLIFT |
| Good Morning (leg-curl-good-morning-573) | LEG_CURL | DEADLIFT |
| Seated Barbell Good Morning (leg-curl-seated-barbell-good-morning-575) | LEG_CURL | DEADLIFT |
| Single-leg Barbell Good Morning (leg-curl-single-leg-barbell-good-morning-576) | LEG_CURL | DEADLIFT |
| Split Barbell Good Morning (leg-curl-split-barbell-good-morning-579) | LEG_CURL | DEADLIFT |
| Staggered-stance Good Morning (leg-curl-staggered-stance-good-morning-581) | LEG_CURL | DEADLIFT |
| Zercher Good Morning (leg-curl-zercher-good-morning-584) | LEG_CURL | DEADLIFT |
| Rowing Machine (row-indoor-row-1046) | ROW | CARDIO |
| Calorie Row (lateral-raise-calorie-row-542) | ROW | CARDIO |
| EZ-Bar Pull-over (pull-up-ez-bar-pullover-906) | PULL_UP | PULLOVER |
| Standing Cable Pull-over (pull-up-standing-cable-pullover-920) | PULL_UP | PULLOVER |
| Straight-arm Pull-down (pull-up-straight-arm-pulldown-921) | PULL_UP | PULLOVER |
| Swiss Ball EZ-Bar Pull-over (pull-up-swiss-ball-ez-bar-pullover-923) | PULL_UP | PULLOVER |
| Rope Climb (lateral-raise-rope-climb-557) | PULL_UP | FLOOR_CLIMB |
| Hanging Hurdle (pull-up-hanging-hurdle-907) | PULL_UP | CORE |
| GHD Back Extensions (core-ghd-back-extensions-192) | CORE | HYPEREXTENSION |

### Faza kontrolna

| Ćwiczenie | Przed | Po |
|---|---|---|
| Banded Front Raise (banded-exercises-front-raise-14) | BANDED_EXERCISES | FRONT_RAISE |
| Band Good Morning (leg-curl-band-good-morning-571) | DEADLIFT | GOOD_MORNING |
| Bar Good Morning (leg-curl-bar-good-morning-572) | DEADLIFT | GOOD_MORNING |
| Good Morning (leg-curl-good-morning-573) | DEADLIFT | GOOD_MORNING |
| Seated Barbell Good Morning (leg-curl-seated-barbell-good-morning-575) | DEADLIFT | GOOD_MORNING |
| Single-leg Barbell Good Morning (leg-curl-single-leg-barbell-good-morning-576) | DEADLIFT | GOOD_MORNING |
| Split Barbell Good Morning (leg-curl-split-barbell-good-morning-579) | DEADLIFT | GOOD_MORNING |
| Staggered-stance Good Morning (leg-curl-staggered-stance-good-morning-581) | DEADLIFT | GOOD_MORNING |
| Zercher Good Morning (leg-curl-zercher-good-morning-584) | DEADLIFT | GOOD_MORNING |
| Rope Climb (lateral-raise-rope-climb-557) | FLOOR_CLIMB | ROPE_CLIMB |
| Cable Front Raise (lateral-raise-cable-front-raise-541) | LATERAL_RAISE | FRONT_RAISE |
| Dumbbell Front Raise (shoulder-press-dumbbell-front-raise-1117) | LATERAL_RAISE | FRONT_RAISE |
| Front Raise (lateral-raise-front-raise-547) | LATERAL_RAISE | FRONT_RAISE |
| Weight-plate Front Raise (shoulder-press-weight-plate-front-raise-1135) | LATERAL_RAISE | FRONT_RAISE |
| Lateral Step-over (leg-raise-lateral-stepover-589) | LEG_RAISE | STEP_UP |
| Barbell Lateral Step-up (squat-barbell-lateral-step-up-1256) | LUNGE | STEP_UP |
| Barbell Step-over (squat-barbell-stepover-1262) | LUNGE | STEP_UP |
| Barbell Step-up (squat-barbell-step-up-1261) | LUNGE | STEP_UP |
| Crossover Dumbbell Step-up (squat-crossover-dumbbell-step-up-1268) | LUNGE | STEP_UP |
| Dumbbell Step-over (squat-dumbbell-stepover-1276) | LUNGE | STEP_UP |
| Dumbbell Step-up (squat-dumbbell-step-up-1275) | LUNGE | STEP_UP |
| Lateral Dumbbell Step-up (squat-lateral-dumbbell-step-up-1284) | LUNGE | STEP_UP |
| Step-up (squat-step-up-1305) | LUNGE | STEP_UP |
| Single-arm Step-up and Press (shoulder-press-single-arm-step-up-and-press-1130) | SHOULDER_PRESS | STEP_UP |

## Klasyfikacja libraryTier

| Tier | Przed audytem | Po audycie |
|---|---:|---:|
| main | 900 | 682 |
| advanced | 49 | 16 |
| sportSpecific | 7 | 67 |
| rehab | 1 | 26 |
| variation | 3 | 170 |
| progression | 2 | 2 |
| deprecated | 1 | 1 |

Pełna lista **263** zmian tierów wraz z przyczynami znajduje się w raporcie JSON.

## Obsługa aliasów ID

Centralny `resolveExerciseId(id)` jest używany przez:

- lookup katalogu i wyszukiwanie rekordu;
- normalizację zapisanych i synchronizowanych planów treningowych;
- normalizację historii oraz aktywnych sesji;
- progres i statystyki grupowane po ćwiczeniu;
- ulubione wraz z synchronizacją;
- treści techniczne ćwiczeń;
- lookup obrazów i assetów.

Backend przechowuje identyfikator jako wartość opaque; kanonizacja odbywa się w mobile na granicy odczytu i przed kolejnym zapisem/synchronizacją.

## Picker ćwiczeń i libraryTier

Picker domyślnie pokazuje wyłącznie ćwiczenia `main`. Użytkownik może lokalnie, dla bieżącego otwarcia pickera, włączyć niezależnie tiery `variation`, `advanced`, `sportSpecific` i `rehab`. `deprecated` oraz `progression` nie są oferowane przy tworzeniu ani edycji nowych planów.

Po wpisaniu wyszukiwanej frazy picker przeszukuje wszystkie aktywne tiery, także niewłączone ręcznie, a wynik spoza `main` otrzymuje badge opisujący tier. Wyniki `main` są sortowane przed pozostałymi. Wybrane ćwiczenie zapisuje kanoniczne ID, a historyczne dane nadal korzystają z resolvera aliasów.

## Testy fazy kontrolnej

- rozdzielenie Dead-hang Biceps Curl i EZ-Bar Preacher Curl;
- dedykowane kategorie front raise, step-up, good morning i rope climb;
- kanonizacja ID w planach, sesjach, progresie, ulubionych i assetach;
- brak cykli, wieloetapowych aliasów i brakujących celów w walidatorze;
- domyślna biblioteka pokazuje tylko tier `main`.

## Weryfikacja

- catalogValidation: passed: 964 exercises, 13 aliases, 0 errors, 0 warnings
- mobileTests: passed: 119/119
- mobileTypecheck: passed
- backendTests: passed: 73/73 (Release)
- backendBuild: passed: Release, 0 warnings, 0 errors
- androidBuild: not confirmed: Gradle 8.14.3 download/build did not finish within 8 minutes; no new APK was produced

## Przypadki pozostawione do decyzji produktowej

- Band-assisted Pull-up vs Banded Pull-ups (Progression)
- Dynamic Push-up vs Explosive Push-up
- Body-weight Dip vs Incline Dip
- Seated vs standing single-arm overhead dumbbell triceps extensions
- Swiss-ball technical variants
- Whether users should get an explicit UI toggle for advanced, sport-specific, rehab and variation tiers; default creation remains main-only.

Pełny raport maszynowy znajduje się w `docs/reports/exercise-catalog-refactor.json`. Mapping kompatybilności znajduje się w `apps/mobile/src/domain/exerciseIdAliases.ts`.
