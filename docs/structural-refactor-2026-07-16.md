# Refaktoryzacja strukturalna Gymmin — 2026-07-16

## Cel

Audyt objął granice odpowiedzialności w mobile i API, rozmiar modułów, powieloną
logikę infrastrukturalną oraz możliwość testowania reguł bez uruchamiania React
Native lub serwera HTTP.

Zmiany nie modyfikują publicznych kontraktów API, kluczy storage ani formatu
zsynchronizowanych danych.

## Wdrożone zmiany

### Mobile

- Wszystkie standardowe requesty aplikacji przechodzą przez
  `src/api/apiClient.ts`. Moduł odpowiada za nagłówki, bearer token,
  correlation id, diagnostykę, parsowanie odpowiedzi i jednolity `ApiError`.
- Account-scoped treningi i profile Kreatora mają własne hooki w `src/features`.
- Account-scoped sesje treningowe mają własny kontroler, który spójnie odtwarza
  listę sesji, aktywną sesję i indeks bieżącego wpisu oraz zapisuje je w
  przestrzeni aktualnego właściciela.
- Kontrakt synchronizacji sesji, walidacja odpowiedzi, budowanie tombstone'ów,
  metadata pull/push i scalanie local-first znajdują się w
  `src/domain/workoutSessionSync.ts`. Debounce, anulowanie nieaktualnych żądań
  i ochrona przed pętlą zapisu obsługuje
  `src/features/workoutSessions/useWorkoutSessionAutoSync.ts`.
- Normalizacja ustawień i ich domyślne wartości znajdują się w
  `src/domain/appSettings.ts`, a account-scoped odczyt, zapis i zastosowanie
  ustawień obsługuje `src/features/settings/useAccountScopedSettings.ts`.
- Ulubione ćwiczenia mają osobny kontrakt transportowy w
  `src/domain/favoriteExerciseSync.ts` i account-scoped kontroler w
  `src/features/favorites/useAccountScopedFavoriteExercises.ts`. Kontroler
  odrzuca nieaktualne odpowiedzi, więc wolniejszy request nie może nadpisać
  późniejszej zmiany użytkownika.
- Osiągnięcia, czas użycia aplikacji i metadata synchronizacji są zarządzane
  przez `src/features/achievements/useAccountScopedAchievements.ts`, a kontrakt
  API i merge znajdują się w `src/domain/achievementSync.ts`. Dwa konkurujące
  wcześniej timery zostały zastąpione jednym debounce i numerowaniem żądań.
- Pierwszą synchronizację danych po zalogowaniu koordynuje wspólny
  `src/features/sync/useInitialAccountSync.ts`. Kontroler ma jawne stany
  `idle/syncing/synced/failed`, nie uruchamia duplikatów i unieważnia odpowiedź,
  jeżeli w trakcie requestu zmieni się konto, właściciel storage albo gotowość
  danych lokalnych.
- Automatyczny zapis zmian ustawień obsługuje
  `src/features/settings/useAccountSettingsAutoSave.ts`. Zmiany są grupowane
  przez debounce, requesty wykonywane szeregowo, a odpowiedź starszej rewizji
  lub poprzedniego konta nie aktualizuje lokalnego timestampa.
- Typowany `src/api/authApi.ts` obsługuje transport logowania/rejestracji,
  weryfikacji emaila, resetu i zmiany hasła oraz aktywnych sesji. Moduł waliduje
  poprawne odpowiedzi i kieruje nieudane statusy przez wspólną diagnostykę API;
  obsługuje również odświeżenie `/auth/me` i logout bieżącej sesji. Widoki nadal
  odpowiadają za lokalizację i stan formularzy.
- `src/api/bugReportsApi.ts` izoluje wysłanie raportu, stabilny idempotency key,
  walidację ID odpowiedzi oraz szczegóły błędów. Dobór danych diagnostycznych i
  stan formularza pozostają w composition root.
- `src/platform/deviceInfo.ts` przejął odczyt `NativeModules`, `Platform` i
  wymiarów ekranu, budowę raportu urządzenia oraz ograniczonej do 120 znaków
  nazwy sesji auth. Czyste buildery są testowane na snapshotach platformy.
- `src/api/profileApi.ts` izoluje upload/usunięcie avatara i zdalne usunięcie
  konta. Picker, przygotowanie pliku, cache avatara i lokalne czyszczenie danych
  pozostają w aplikacji, a statusy i odpowiedzi HTTP są walidowane centralnie.
- `src/api/aiCreditsApi.ts` izoluje pobieranie salda, historii i pakietów,
  weryfikację zakupu Google Play oraz deweloperskie zasilenie. Warstwa zachowuje
  częściową odporność odczytu: niedostępna historia lub lista pakietów nie usuwa
  ostatnich poprawnych danych, ale saldo pozostaje wymaganym źródłem prawdy.
- `src/api/accountDataApi.ts` przejął CRUD treningów, odczyt/zapis ustawień oraz
  requesty synchronizacji treningów, ulubionych, sesji i osiągnięć. Composition
  root przekazuje do niego bearer headers i zachowuje wyłącznie decyzje o merge,
  obsługę zmiany konta oraz aktualizację stanu UI.
- `src/domain/accountWorkouts.ts` zawiera serializację treningu do API,
  odbudowanie lokalnego modelu ze zwalidowanej odpowiedzi oraz deterministyczny
  merge po ID. Te reguły nie są już globalnymi helperami composition root.
- `src/api/workoutCreatorApi.ts` izoluje start planu, start rewrite i odczyt
  statusu joba Kreatora. Obsługuje zarówno aktualne odpowiedzi asynchroniczne,
  jak i zgodność ze starszym bezpośrednim wynikiem; polling, kredyty, import i
  nawigacja pozostają w composition root.
- `src/domain/workoutCreatorJob.ts` normalizuje starszy i aktualny format
  oczekującego joba, a `useAccountScopedCreatorJob` obsługuje jego bezpieczny
  odczyt i zapis per konto. Zmiana konta zeruje stan przed załadowaniem danych
  nowego właściciela, natomiast `App.tsx` reaguje tylko na zakończony odczyt.
- `src/domain/workoutCreatorImport.ts` przejął tolerancyjne parsowanie odpowiedzi
  Kreatora, JSON osadzonego w Markdown, aliasów polskich/angielskich, mapowanie
  ćwiczeń do katalogu oraz budowę kroków i wariantów rozgrzewki. Composition root
  otrzymuje już gotowe `SavedWorkout[]` i tekst planu.
- Status systemu i jego cache są obsługiwane przez
  `useSystemStatusController`.
- Kontrakty auth, kompletowanie sesji i polityka hasła są w czystym
  `src/domain/auth.ts`, natomiast SecureStore i natywna persystencja tokenu są
  odseparowane w `src/features/auth/authSession.ts`. Ten sam moduł wykonuje
  migrację legacy tokenu, waliduje zapisany profil, odświeża `/auth/me`, używa
  cache przy awarii online, zapisuje nowe logowanie i aktualizacje profilu oraz
  czyści oba storage po `401/403`, logout i usunięciu konta.
- Odczyt, zapis, migracja i wykrywanie anonimowych danych zostały przeniesione
  do `src/storage/localDataRepositories.ts`.
- `useAccountScopedWeeklyPlan` przejął stan gotowości, owner tracking oraz
  odczyt/zapis planu tygodniowego. Przy zmianie konta poprzedni plan jest
  zerowany przed asynchronicznym odczytem, co zapobiega chwilowemu wyciekowi UI.
- Normalizacja zapisanych treningów i sortowania znajduje się w
  `src/domain/savedWorkoutNormalization.ts`.
- Reguły grupowania aktywnej sesji, wybór poprzednich wyników i przygotowanie
  danych tabeli zostały wydzielone do
  `src/domain/workoutSessionPresentation.ts`.
- Konfiguracja pól buildera i ograniczenie liczby serii znajdują się w
  `src/domain/workoutBuilderConfiguration.ts`.
- Katalog techniki ćwiczeń został znormalizowany przez internowanie
  powtarzających się treści. Plik źródłowy zmniejszył się z około 9,96 MB i
  91 tys. linii do około 180 KB i 47 linii, zachowując lazy lookup po
  identyfikatorze ćwiczenia.
- Skrypt `scripts/normalize-exercise-technique-content.mjs` pozwala bezpiecznie
  odtworzyć normalizację przy kolejnej aktualizacji danych.

`App.tsx` pozostaje composition root, ale nie wykonuje już bezpośrednich requestów
HTTP i nie jest właścicielem części repozytoriów ani niezależnych cykli życia danych.

### Backend

- Endpointy liveness, readiness, statusu systemu, health i diagnostyki zostały
  przeniesione z `Program.cs` do `Endpoints/SystemEndpoints.cs`.
- Auth, profil/konto, ustawienia, treningi, ulubione ćwiczenia, sesje
  treningowe, osiągnięcia, zgłoszenia/admin, kredyty/zakupy AI, integracja
  Google Play i Kreator AI mają osobne moduły endpointów.
- `EndpointAuthorization` centralizuje odczyt bearer tokenu i przypisanie
  użytkownika do kontekstu diagnostycznego, a `EndpointResults` współdzielone
  odpowiedzi infrastrukturalne.
- `Program.cs` pozostaje miejscem konfiguracji hosta, DI, middleware i mapowania
  modułów endpointów.
- Kolejne grupy endpointów powinny stosować ten sam wzorzec, gdy będą
  modyfikowane funkcjonalnie. Nie należy wykonywać jednego dużego, czysto
  mechanicznego przeniesienia wszystkich tras tuż przed wydaniem.

## Testowalność

Dodano testy dla:

- wspólnego klienta API,
- repozytoriów local-first,
- normalizacji zapisanych treningów,
- grupowania i historii aktywnej sesji,
- konfiguracji buildera.
- normalizacji ustawień aplikacji,
- kontraktu, odpowiedzi i scalania synchronizacji sesji treningowych.
- kontraktów synchronizacji ulubionych ćwiczeń i osiągnięć.
- typowanego transportu danych konta i obsługi statusów HTTP.
- importu odpowiedzi Kreatora, wrapperów JSON, rozgrzewki i odpoczynku.
- odtwarzania auth: legacy migration, offline fallback i unauthorized cleanup.

Regresja wykryta podczas wydzielania sesji została poprawiona: identyfikator
ćwiczenia jest teraz kanonizowany przez `resolveExerciseId` również podczas
wyszukiwania poprzedniego ciężaru i liczby powtórzeń.

## Świadomie pozostawione granice

- `App.tsx` nadal inicjuje synchronizację po zmianie konta, auth, przypomnienia
  i procesy AI, ponieważ te cykle życia współdzielą transakcyjny stan nawigacji
  i konta. Mechanika automatycznej synchronizacji sesji, ulubionych,
  osiągnięć oraz persystencja ustawień nie znajdują się już w composition root.
- `WorkoutBuilderScreen` zachowuje lokalne komponenty pól formularza w jednym
  pliku; reguły domenowe są już poza JSX. Dalsze dzielenie samego layoutu ma
  sens dopiero przy zmianie jego UX.
- `Program.cs` jest composition root konfiguracji hosta, DI, middleware,
  zabezpieczeń startowych i mapowania modułów. Nie zawiera już implementacji
  endpointów biznesowych.
- Pełne testy React Native UI/E2E nadal są osobnym zadaniem przed szerokim
  publicznym rolloutem.

## Kryteria weryfikacji

Przed uznaniem refaktoryzacji za gotową wymagane są:

```powershell
npm --prefix apps/mobile run typecheck
npm --prefix apps/mobile test -- --run
dotnet build backend/Gymmin.Api/Gymmin.Api.csproj -c Release --warnaserror
dotnet test backend/Gymmin.Api.Tests/Gymmin.Api.Tests.csproj -c Release
git diff --check
```
