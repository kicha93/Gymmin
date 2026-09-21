# Kreator treningów — aktualny kontrakt

Status: implementacja produkcyjna local-only, stan na 2026-09-21.

Ten dokument jest źródłem prawdy dla obecnego kreatora przed jego kolejną przebudową. Opisuje zachowanie istniejące, a nie przyszły projekt UX.

## Zakres

Kreator pomaga przygotować nowy plan za pomocą trybu Głębokie badanie w ChatGPT. Gymmin nie wywołuje API AI, nie włącza tego trybu automatycznie, nie wysyła formularza i nie tworzy zdalnego zadania. Przepływ jest jawny:

1. użytkownik wypełnia formularz;
2. Gymmin przygotowuje prompt lokalnie;
3. użytkownik wybiera `+ → Głębokie badanie` w ChatGPT i wkleja prompt;
4. użytkownik odpowiada na ewentualne pytania doprecyzowujące ChatGPT;
5. użytkownik wkleja odpowiedź JSON do Gymmin;
6. Gymmin waliduje, pozwala naprawić nierozpoznane ćwiczenia i zapisuje nowe treningi lokalnie.

Kreator nie modyfikuje istniejącego zapisanego treningu. Do tego służy zwykły edytor.

## Formularz

Formularz ma pięć zwijanych sekcji. Pierwsza jest otwarta, a kolejne domyślnie zwinięte, aby ograniczyć długi początkowy scroll:

- cele treningowe: cel główny, cele dodatkowe, termin, priorytetowe partie;
- doświadczenie: wiek, płeć, wzrost, masa, staż, regularność, lubiane i unikane ćwiczenia, aktualne wyniki;
- zdrowie i ograniczenia: jawna deklaracja braku/opisania/niepewności ograniczeń, kontuzje, ból, operacje, zalecenia lekarza, wiele chorób przewlekłych, leki;
- styl życia: rodzaj pracy, siedzenie, sen, jakość snu, stres, kroki;
- logistyka: liczba dni, czas sesji, rzeczywiście dostępny sprzęt, dostęp do siłowni, trening domowy, FBW/split.

Wymagane minimum to cel główny, deklaracja zdrowotna, liczba dni, czas sesji i dostępny sprzęt. Wartości liczbowe są walidowane w realistycznych zakresach, a sekcje z błędami automatycznie się otwierają. Obecny formularz nie wykonuje diagnozy medycznej ani nie potwierdza, że odpowiedź jest klinicznie bezpieczna.

## Profile lokalne

Użytkownik może przygotować prompt bez zapisywania danych albo zapisać formularz jako lokalny profil. Profil zawiera `id`, nazwę oraz kopię odpowiedzi.

Limity ochronne:

- maksymalnie 25 profili;
- nazwa do 120 znaków;
- do 100 pól w profilu;
- wartość tekstowa do 4000 znaków;
- lista do 50 wartości po maksymalnie 500 znaków.

Profile są przechowywane w `gymmin.local.v1.*`, wchodzą do backupu `.gymmin.json` i są usuwane przez `Usuń wszystkie dane`. Można rozpocząć nowy profil i usunąć istniejący. Przekroczenie limitu lub błąd zapisu nie są wyciszane. Wycofane pole `readyWarmupSet` jest usuwane podczas klonowania i normalizacji historycznego profilu.

Wartości wyborów są zapisywane jako stabilne kody domenowe. Historyczne etykiety PL/EN są migrowane przy odczycie, dlatego zmiana języka nie psuje profilu.

## Odzyskiwanie pracy

Draft formularza, etap, nazwa profilu, prompt oraz wklejona odpowiedź są automatycznie zapisywane lokalnie z krótkim debounce. Po ubiciu aplikacji można wrócić do przerwanego przepływu Deep Research. Dane sesji są czyszczone po skutecznym zapisaniu planu lub po wybraniu nowego profilu. Wyjście z uzupełnionego formularza wymaga potwierdzenia, a Back z widoku kopiowania wraca najpierw do formularza.

## Prompt

`buildAiWorkoutPrompt` generuje wersjonowany Prompt V2 zoptymalizowany dla Deep Research i dołącza:

- język tekstów użytkowych PL albo EN;
- odpowiedzi formularza jako JSON;
- rzeczywisty JSON Schema z limitami odpowiedzi;
- zakaz tworzenia własnych `exerciseId`;
- kryteria skutecznego, realistycznego planu i prywatną autoweryfikację;
- zasady bezpieczeństwa dla bólu, urazów, chorób, leków i zaleceń lekarza;
- politykę brakujących i sprzecznych danych oraz zakaz zgadywania ciężaru;
- oznaczenie formularza jako niezaufanych danych, a nie instrukcji;
- zakaz samodzielnych elementów odpoczynku;
- katalog wszystkich canonical exercises w formacie `id|English name|Polish name|category|required equipment|primary muscles`.

Prompt poleca przeprowadzenie badania i analizy wewnętrznie, bez ujawniania chain-of-thought. Wynik końcowy musi być dokładnie jednym obiektem JSON bez raportu, cytowań ani Markdownu. Pytania doprecyzowujące mogą wystąpić przed rozpoczęciem badania w interfejsie ChatGPT, ale nie są typem odpowiedzi importowanym do Gymmin. Gymmin nie normalizuje katalogu ponownie dla każdego renderu; kompaktowy katalog jest buforowany dla źródła danych.

## Kontrakt odpowiedzi

Odpowiedź ma `schemaVersion: 1` i tablicę `workouts`. Każdy trening zawiera nazwę, opcjonalne uwagi i etapy. Etap zawiera nazwę, opcjonalne uwagi, typ oraz serie. Seria zawiera dodatnią liczbę powtórzeń serii i ćwiczenia.

Obsługiwane typy etapu:

- `warmup`;
- `exercise`;
- `cooldown`;
- `other`.

Obsługiwane cele ćwiczenia:

- `repetitions`;
- `time`;
- `buttonPress`.

Ćwiczenie wskazuje canonical `exerciseId`, cel, `targetValue`, `restSeconds` oraz opcjonalnie `loadKg` i uwagi. `restSeconds` musi być liczbą całkowitą od 0 do 86400. `setCount` musi być liczbą całkowitą od 1 do 100. Obciążenie nie może być ujemne i jest pomijane, gdy profil nie zawiera jednoznacznego porównywalnego wyniku. Dla powtórzeń `targetValue` jest dodatnią liczbą całkowitą, dla czasu ma format `HH:MM:SS`, a dla `buttonPress` wynosi `1`.

Importer przyjmuje maksymalnie 7 treningów, 12 etapów na trening, 20 serii na etap i 4 ćwiczenia w grupie. Limity odpowiadają kontraktowi przekazywanemu w promptcie i chronią aplikację przed niekontrolowanym rozmiarem wygenerowanej struktury.

Parser przyjmuje czysty JSON, JSON w bloku Markdown oraz pojedynczy możliwy do odzyskania obiekt otoczony tekstem. Odpowiedź powyżej 1 000 000 znaków jest odrzucana. Importer egzekwuje również `additionalProperties: false`, a komunikaty walidacji są lokalizowane PL/EN.

## Dopasowanie ćwiczeń i zapis

Rozwiązywane jest canonical ID, w tym historyczny alias, ale wynik musi należeć do aktywnego katalogu przekazanego w promptcie. Dopasowanie wyłącznie po nazwie nie omija kontraktu ID. Nierozpoznane ćwiczenie blokuje zapis i otrzymuje maksymalnie pięć propozycji z katalogu. Po ręcznym zastąpieniu wszystkich nieznanych pozycji i usunięciu błędów można zapisać wynik.

Przed zapisem działa dodatkowy lokalny audyt jakości: liczba treningów musi odpowiadać deklarowanej liczbie dni, szacowany czas nie może rażąco przekraczać limitu, ćwiczenie nie może wymagać niezadeklarowanego sprzętu ani powtarzać się w części głównej tego samego treningu. Kategoria ćwiczenia musi pasować do typu etapu.

Podgląd przed zapisem pokazuje etapy, liczbę serii, ćwiczenia, cele, odpoczynek, obciążenie i uwagi. Zapis tworzy nowe lokalne definicje treningów. Prompt i odpowiedź istnieją tylko jako odzyskiwalna, lokalna sesja robocza i są usuwane po zapisie; nie tworzą historii AI i nie zmieniają istniejących treningów.

## Prywatność i bezpieczeństwo

Formularz może zawierać dane dotyczące zdrowia, urazów i leków. Pozostają lokalne, dopóki użytkownik sam nie skopiuje promptu. Po wklejeniu do zewnętrznej usługi obowiązują jej zasady prywatności. Ostrzeżenie jest wyświetlane przed kopiowaniem.

Kreator nie zastępuje lekarza ani fizjoterapeuty. Prompt nakazuje traktować ograniczenia lekarza jako nadrzędne, unikać diagnozowania i dobierać wariant konserwatywny przy niejasnych danych. Nie stanowi to medycznej oceny planu; użytkownik nadal powinien sprawdzić wynik przed zapisaniem.

## Testy regresyjne

Minimalny zestaw obejmuje:

- normalizację i limity profili;
- usunięcie `readyWarmupSet`;
- zgodność sekcji i unikalność identyfikatorów pól;
- budowę promptu PL/EN z aktywnego katalogu;
- obecność instrukcji Deep Research, kryteriów sukcesu, ochrony przed instrukcjami w formularzu i zakazu zgadywania ciężaru;
- metadata sprzętu, kategorii i głównych mięśni w katalogu promptu;
- brak pól backend/auth/billing;
- czysty, fenced i otoczony tekstem JSON;
- błędny schemat, typy, liczby ujemne i limit rozmiaru;
- semantykę `targetValue` i limity zagnieżdżonej struktury;
- aktywne ID, odrzucanie wpisów wyłącznie po nazwie i ścisłe dodatkowe pola;
- blokadę nieznanych ćwiczeń i ręczne zastąpienie.
- odzyskiwanie i czyszczenie sesji kreatora;
- lokalny audyt liczby dni, czasu, sprzętu i duplikatów;
- budżet rozmiaru promptu.

Testy znajdują się w `apps/mobile/src/domain/tests/workoutCreator.test.ts`, `aiCopyPaste.test.ts`, `aiWorkoutPlanQuality.test.ts` i `workoutCreatorSession.test.ts`.
