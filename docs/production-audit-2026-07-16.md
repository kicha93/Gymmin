# Audyt produkcyjny Gymmin — 2026-07-16

## Wniosek

Blokery wykryte w audycie zostały zamknięte w bieżącym drzewie roboczym:

1. prywatne endpointy ustawień, treningów i synchronizacji akceptują wyłącznie
   prawidłową sesję bearer,
2. avatary w produkcyjnym trybie Database są przechowywane razem z metadanymi
   w bazie danych,
3. zadania Kreatora AI obsługuje kontrolowany worker z atomowym claim/lease,
   heartbeatem i odzyskiwaniem po wygaśnięciu lease,
4. `production-gate` działa dla gałęzi `master` i buduje natywny release AAB,
5. Android release ma włączone R8/resource shrinking, wyłączone nieużywane GIF
   i ograniczony manifest produkcyjny.

Kod jest gotowy do wdrożeniowego smoke. Publiczne wydanie nadal wymaga
zastosowania migracji na docelowym PostgreSQL, backup/restore, prawdziwego
upload key, device smoke oraz testu kilku replik.

## Wynik automatycznej weryfikacji

- mobile unit tests: 184/184,
- backend tests: 105/105; dwa pełne przebiegi zakończone sukcesem,
- TypeScript typecheck: zaliczony,
- backend Release build z `--warnaserror`: zaliczony, 0 ostrzeżeń,
- Expo Doctor: 19/19,
- Android Hermes/Metro export: zaliczony,
- natywny Android release AAB z R8 i resource shrinking: zbudowany,
- podpis testowego AAB: `jarsigner -verify` zaliczony,
- EF Core: brak zmian modelu bez migracji,
- katalog ćwiczeń: 964 rekordy, 0 błędów i 0 ostrzeżeń,
- NuGet vulnerability audit: brak znanych podatnych pakietów,
- npm audit: 10 podatności `moderate` w przechodnim łańcuchu narzędzi
  Expo/Xcode/`uuid`; wymuszony fix obniża Expo do niezgodnej wersji,
- nie znaleziono śledzonych `.env`, keystore ani prywatnych kluczy.

Lokalny AAB został podpisany efemerycznym kluczem wyłącznie na potrzeby smoke
i nie może być opublikowany w Google Play.

## Zamknięte blokery

### AUTH-1: legacy `X-Gymmin-User-Id`

Usunięto fallback przyjmujący identyfikator użytkownika z nagłówka.
`/api/settings`, CRUD `/api/workouts`, `/api/sync/workouts` i placeholder Garmin
korzystają wyłącznie z bearer tokenu. Test regresyjny sprawdza sam legacy header,
nieprawidłowy bearer oraz ich kombinację i oczekuje `401`.

### DATA-1: trwałość avatarów

Tryb Database zapisuje zawartość JPEG/PNG/WebP oraz metadane w rekordzie
użytkownika. Zapewnia to wspólny odczyt na wielu replikach i objęcie avatara
backupem PostgreSQL. Importer przenosi istniejące pliki `App_Data/avatars` do
bazy. File provider pozostaje fallbackiem developerskim; zapisuje wersjonowany
plik przed zmianą metadanych i sprząta również stare nazwy `avatar.png/jpg/webp`.

Test API sprawdza zgodność pobranych bajtów z uploadem, obecność blobu w bazie
oraz wyczyszczenie zawartości po usunięciu avatara.

### AI-1: wielokrotne wykonanie zadania

Usunięto nieśledzone `Task.Run` z bazy jobów. `WorkoutPlanJobWorker` pobiera
zadania przez warunkowy update, zapisuje `LeaseId`, `LeaseExpiresAt`
i `AttemptCount`, odnawia lease heartbeatem i akceptuje wynik tylko od aktualnego
właściciela. Po restarcie wygasły lease może zostać bezpiecznie odzyskany.

Test dwóch procesorów potwierdza pojedynczy claim, blokadę aktywnego lease,
odzyskanie wygasłego lease i zwiększenie licznika prób.

### CI-1: natywna bramka wydania

Workflow działa na push do `master`, uruchamia PostgreSQL migration smoke,
generuje efemeryczny klucz CI, buduje `bundleRelease` dla `arm64-v8a`, weryfikuje
podpis oraz merged manifest. Release odrzuca `SYSTEM_ALERT_WINDOW` i
`WRITE_EXTERNAL_STORAGE`.

### ANDROID-1: optymalizacja i uprawnienia

Release ma włączone minify i resource shrinking. Obsługa GIF jest wyłączona,
ponieważ animacje ćwiczeń przechodzą na MP4. `SYSTEM_ALERT_WINDOW` nie występuje
w main/release manifest, a `WRITE_EXTERNAL_STORAGE` jest jawnie usuwane z merged
manifest. `READ_EXTERNAL_STORAGE` może pozostać tylko z `maxSdkVersion=32` dla
systemowego wyboru zdjęcia na starszym Androidzie.

## Ryzyka nieblokujące

- `App.tsx` pozostaje dużym composition root, ale klient API, repozytoria
  local-first, account-scoped ustawienia i sesje, automatyczny debounce sync,
  kontrakty transportowe sesji/ulubionych/osiągnięć, account-scoped kontrolery
  ulubionych i osiągnięć, kontrolery treningów/profili/statusu oraz logika
  prezentacji sesji zostały wydzielone. Pierwsza synchronizacja po logowaniu ma
  wspólną bramkę stanu i ignoruje wyniki requestów poprzedniego konta. Dalszy
  automatyczny zapis ustawień jest debounced i serializowany, więc szybkie
  zmiany nie tworzą wyścigu równoległych `PUT`. Dalszy podział auth i procesów
  AI należy wykonywać etapami.
- Operacje credentials, weryfikacji emaila, haseł i aktywnych sesji korzystają
  z typowanego klienta auth. `logout-all` usuwa lokalną sesję dopiero po udanym
  statusie backendu; błąd serwera pozostawia użytkownika zalogowanego.
- Upload/usunięcie avatara i zdalne usunięcie konta korzystają z typowanego
  klienta profilu, który zachowuje rozróżnienie `401/403` dla step-up auth i nie
  uruchamia lokalnego czyszczenia po nieudanym statusie API.
- `Program.cs` jest już composition root bez implementacji endpointów
  biznesowych. Wszystkie grupy tras mają osobne moduły ze wspólną autoryzacją,
  obsługą request metadata i odpowiedziami infrastrukturalnymi.
- Brakuje pełnych testów mobile UI/E2E.
- Patch updates zależności należy wykonywać osobnymi zmianami z pełnym smoke.
- Należy ustawić budżety rozmiaru AAB, startu, pamięci i płynności list.
- PNG ćwiczeń są świadomym fallbackiem podczas migracji do zapętlonych MP4.

## Czynności wdrożeniowe przed publicznym wydaniem

1. Zastosować wszystkie migracje na PostgreSQL i sprawdzić `/health/ready`.
2. Wykonać backup oraz udokumentowany restore test.
3. Uruchomić minimum dwie repliki i sprawdzić avatar oraz konkurencyjny job AI.
4. Zbudować AAB z trwałym Google Play upload key i docelowym HTTPS API URL.
5. Przejść device smoke oraz Google Play Internal Testing.
6. Podłączyć logi, alerty i mobile crash reporting.

Szczegóły audytu i wykonanej refaktoryzacji strukturalnej są w
`docs/structural-refactor-2026-07-16.md`.
