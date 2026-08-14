# Advanced Muscle Mode

## Cel i zakres

Tryb zaawansowany jest opcjonalnym, lokalnym rozszerzeniem ekranu szczegółów ćwiczenia. Nie zmienia standardowego modelu `MuscleKey`, historii, treningów ani tygodniowej objętości. Ustawienie `advancedMuscleMode` jest domyślnie wyłączone i jest przechowywane razem z pozostałymi ustawieniami local-only.

Tryb standardowy nadal pokazuje 17 wysokopoziomowych grup i skalę wpływu 0–5. Tryb zaawansowany dodaje hierarchiczne podgrupy i paski względnego zaangażowania. Canonical wartością pozostaje liczba całkowita 0–5; paski nie są pomiarem fizjologicznym ani prognozą hipertrofii.

## Taksonomia v1

- Klatka: część obojczykowa, mostkowo-żebrowa i brzuszna (dolna).
- Barki: akton przedni, boczny i tylny.
- Triceps: głowa długa, boczna i przyśrodkowa.
- Zginacze łokcia: głowa długa i krótka bicepsa oraz mięsień ramienny.
- Przedramiona: zginacze, prostowniki i mięsień ramienno-promieniowy.
- Brzuch: mięsień prosty i poprzeczny brzucha.
- Mięśnie skośne: skośny zewnętrzny i wewnętrzny.
- Czworogłowe: prosty uda, obszerny boczny, przyśrodkowy i pośredni.
- Hamstrings: dwugłowy uda (głowa długa i krótka), półścięgnisty i półbłoniasty.
- Pośladki: wielki, średni i mały.
- Łydki: brzuchaty łydki i płaszczkowaty.
- Górne plecy: górna, środkowa i dolna część czworobocznego oraz równoległoboczne.
- Prostowniki grzbietu: region piersiowy i lędźwiowy.

`upperBack` jest rodziną prezentacyjną. Równoległoboczne nie są modelowane jako anatomiczna część mięśnia czworobocznego; jedynie korzystają z istniejącego uproszczonego standardowego klucza `traps`.

W v1 nie dzielimy sztucznie najszerszego grzbietu na „upper/lower lats”. Odwodziciele, przywodziciele i zbiorczy standardowy klucz bioder pozostają high-level. Głębokie albo niewidoczne powierzchniowo struktury mogą mieć `isAnatomyVisible: false`: są pokazywane na liście, ale nie otrzymują osobnego kształtu sylwetki.

## Model danych i generowanie

Źródłowe reguły rodzin znajdują się w `scripts/generate-advanced-muscle-profiles.mjs`. Generator tworzy deterministyczny statyczny profil dla każdego canonical `exerciseId`: `base family rule + variant override = generated profile`. Runtime nie analizuje nazw ćwiczeń. Alias jest najpierw normalizowany do canonical ID.

Każdy standardowy parent o poziomie 3–5 ma jawny status: `mapped`, `intentionallyNotDetailed` albo `needsReview`. Poziomy 1–2 pozostają standardowym high-level engagement. Dla zwykłych podgrup validator wymaga `max(subdivision levels) == parent level`. Profile nie są kopiowane do WorkoutSession.

## Metodologia

Evidence-supported są podział anatomiczny, funkcje stawowe i istnienie regionalnych różnic. Biomechanika i EMG są danymi wspierającymi; EMG nie jest traktowane jako bezpośrednia prognoza hipertrofii. Reguły rodzin są heurystyczną syntezą anatomii, biomechaniki i dostępnych badań. Przypisanie konkretnego ćwiczenia do integera 0–5 jest audytowalnym modelem Gymmin, a nie naukową jednostką ani laboratoryjnym pomiarem. `confidence: medium` nadal oznacza dane wystarczające do prezentacji. Niepewne przypadki nie dostają `confidence: low`.

## Pokrycie i walidacja

Raport znajduje się w `docs/reports/advanced-muscle-coverage.json`. `npm run exercise:muscles:validate` blokuje nieznane ID, duplikaty, błędne poziomy, profile należące do aliasów oraz ciche braki.

Baseline to 805 canonical exercises. Dla 2331 kwalifikujących się relacji parent 3–5 generator tworzy 1904 `mapped`, 427 `intentionallyNotDetailed`, 0 `needsReview` i 0 silent missing. Pokrycie oznacza klasyfikację każdej relacji, a nie laboratoryjną dokładność profili. Większość `intentionallyNotDetailed` dotyczy najszerszego grzbietu, zbiorczego klucza bioder, odwodzicieli, przywodzicieli lub ruchów bez wystarczająco określonej geometrii.

Jawne wyjątki po researchu: Bar Muscle-up, Muscle-up (progression) i Ring Muscle-up zachowują standardowy wpływ na klatkę, ale nie otrzymują podziału jej regionów, ponieważ ruch łączy fazy pull/transition/dip, a dostępne badania mierzą mięsień piersiowy jako całość. Biceps Push-up zachowuje standardowy wpływ na biceps, ale bez podziału głów i brachialis, ponieważ brak wystarczająco specyficznych danych dla tej nietypowej zamkniętej pozycji łańcucha kinematycznego.

## Ograniczenia anatomy

Sylwetka jest uproszczonym widokiem powierzchniowym. Engine obsługuje kolory konkretnych regionów SVG, ale kilka podgrup współdzieli jeden czytelny na telefonie kształt. Lista nadal je rozróżnia, a figura pokazuje najwyższy poziom widocznych podgrup w regionie. `isAnatomyVisible: false` oznacza ograniczenie wizualizacji, a nie brak udziału danego mięśnia. Głębokich struktur nie wizualizujemy w sposób sugerujący fałszywą precyzję.

## Przyszła tygodniowa objętość

Canonical subdivision IDs pozwolą później liczyć fractional weekly sets per subdivision. Obecny `weeklyMuscleVolume` celowo nadal korzysta wyłącznie z high-level engagement.

## Wybrane źródła

- Regional variation in muscle hypertrophy: https://pubmed.ncbi.nlm.nih.gov/35438660/
- Methodological considerations for regional hypertrophy: https://pubmed.ncbi.nlm.nih.gov/38513182/
- Deltoid activation systematic review: https://pubmed.ncbi.nlm.nih.gov/39593452/
- Bench angle and regional activation: https://pubmed.ncbi.nlm.nih.gov/34644424/
- Overhead versus neutral-arm triceps extensions: https://pubmed.ncbi.nlm.nih.gov/35819335/
- Regional quadriceps adaptations: https://pubmed.ncbi.nlm.nih.gov/34743671/
- Squat depth and quadriceps hypertrophy: https://pubmed.ncbi.nlm.nih.gov/36498298/
- Seated versus prone leg curl: https://pubmed.ncbi.nlm.nih.gov/33009197/
- Standing versus seated calf raise: https://pubmed.ncbi.nlm.nih.gov/38156065/
- Gluteus maximus review: https://pubmed.ncbi.nlm.nih.gov/40276368/
- Gluteus medius/minimus review: https://pubmed.ncbi.nlm.nih.gov/33344003/
- Hip thrust versus squat: https://pubmed.ncbi.nlm.nih.gov/37877099/
- Ring versus bar muscle-up activation: https://pmc.ncbi.nlm.nih.gov/articles/PMC10824315/
