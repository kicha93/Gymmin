# Gymmin - stan aplikacji

Ten dokument opisuje aktualny zakres aplikacji Gymmin i powinien być traktowany jako szybki przegląd: co działa, co jest częściowe i czego jeszcze brakuje.

## Cel aplikacji

Gymmin to mobilna aplikacja do treningów siłowych. Aplikacja jest local-first: bez konta można tworzyć treningi, wykonywać je, mieć historię i progres lokalnie na telefonie. Konto służy do synchronizacji danych z backendem oraz do funkcji wymagających identyfikacji użytkownika, takich jak kreator AI.

Docelowo Gymmin ma być przygotowany pod synchronizację z Garminem, dlatego ćwiczenia pochodzą z katalogu aplikacji i mają stabilne identyfikatory.

## Stack

### Mobile

- Standalone Android APK jako podstawowy tryb testowania na telefonie.
- Expo SDK 54 jako warstwa natywna projektu.
- React Native 0.81, React 19, TypeScript.
- Gluestack UI, Ionicons, React Native SVG.
- AsyncStorage jako lokalny storage.
- Expo Notifications dla lokalnych przypomnień treningowych w standalone APK.
- React Error Boundary.
- GitHub Release jako domyślny kanał dystrybucji APK.

Uwaga: nie testujemy już głównego przepływu przez Expo Go. Expo nadal jest częścią stacka technicznego, ale użytkowe testy robimy przez instalowany APK.

### Backend

- ASP.NET Core Web API.
- Minimal API.
- Bearer token auth.
- Storage wybierany konfiguracją: `File | Database`.
- File provider jako fallback developerski.
- EF Core database provider z migracjami, lokalnym SQLite i PostgreSQL pod staging/production.
- OpenAI Responses API dla kreatora i modyfikowania treningów.
- SMTP dla zgłoszeń błędów.

## Najważniejsze moduły mobile

### Nawigacja

Aplikacja ma prostą nawigację opartą o stan aktywnego ekranu. Główne widoki:

- Strona główna.
- Treningi.
- Ustawienia.
- Dodawanie i edycja treningu.
- Podgląd treningu read-only.
- Kreator treningu AI.
- Modyfikacja treningu z AI.
- Wykonywanie treningu.
- Historia treningów.
- Progres.
- Ulubione ćwiczenia.
- Artykuły.
- Regulamin.
- Kontakt.
- Zgłoś błąd.
- Profil / Logowanie.

Android back button jest obsłużony i prowadzi użytkownika krokami w stronę ekranu głównego.

### Logowanie i rejestracja

Działa backendowe logowanie i rejestracja:

- `POST /api/auth/register`.
- `POST /api/auth/login`.
- `GET /api/auth/me`.
- `POST /api/auth/logout`.
- `GET /api/auth/sessions`.
- `DELETE /api/auth/sessions/{sessionId}`.
- `POST /api/auth/logout-all`.
- `POST /api/auth/change-password`.
- `POST /api/auth/password-reset/request`.
- `POST /api/auth/password-reset/confirm`.
- token sesji w `AsyncStorage`.
- odtworzenie sesji po starcie aplikacji.

Formularz rejestracji ma:

- nazwę użytkownika,
- email,
- hasło,
- powtórzenie hasła,
- ikonę podglądu hasła,
- walidację zgodności haseł po stronie mobile.

Hasła są haszowane na backendzie przez PBKDF2, a tokeny sesji są zapisywane jako hash. Sesje mają `ExpiresAt`, a wygasłe lub unieważnione tokeny zwracają `401`.

Działa:

- reset hasła przez email/token,
- zmiana hasła,
- lista aktywnych sesji,
- wylogowanie pojedynczej sesji,
- wylogowanie wszystkich sesji,
- unieważnianie innych sesji po zmianie hasła,
- unieważnianie wszystkich sesji po resecie hasła.

Avatar uzytkownika jest obslugiwany w Profilu. Zalogowany uzytkownik moze
zmienic albo usunac avatar. Mobile wysyla obraz przez `multipart/form-data`,
backend zapisuje go jako plik w `App_Data/avatars`, a `GET /api/auth/me`
zwraca `avatarUrl` i `avatarUpdatedAt`. Header aplikacji pokazuje avatar, jesli
jest ustawiony; anonymous user widzi domyslna ikone.

Profil obsluguje tez trwale usuniecie konta. Opcja `Usun konto` znajduje sie w
sekcji Konto nad `Wyloguj` i wymaga mocnego potwierdzenia przez wpisanie `USUŃ`
albo `DELETE`. Backend udostepnia `DELETE /api/account`, usuwa konto, sesje,
avatar oraz prywatne dane usera. Mobile po sukcesie czysci tylko lokalny
namespace usuwanego konta, bez kasowania danych anonymous ani innych kont na
urzadzeniu.

Brakuje jeszcze:

- potwierdzania emaila,
- OAuth/social login,
- 2FA,
- deeplinka resetu hasła.

### Strona główna

Na stronie głównej są:

- opcjonalny panel logowania/rejestracji,
- pigułka z ciekawostką treningową zmieniana cyklicznie,
- przycisk `Kreator treningu`,
- panel treningów,
- panel artykułów.

Panel treningów na stronie głównej pokazuje maksymalnie 5 treningów i prowadzi do pełnej listy, jeśli treningów jest więcej.

Panel logowania można zamknąć. Decyzja jest zapamiętywana. Jeżeli panel jest widoczny dla niezalogowanego użytkownika, ikona profilu w headerze jest ukryta.

### Treningi

Użytkownik może:

- tworzyć trening ręcznie,
- edytować trening,
- usuwać trening,
- przeglądać trening read-only,
- wyszukiwać treningi,
- sortować listę treningów.

Sortowanie treningów:

- domyślnie: data stworzenia, malejąco, czyli najnowsze na górze,
- opcje sortowania: data stworzenia albo alfabetycznie,
- kierunek: rosnąco albo malejąco,
- stan sortowania jest zapisywany lokalnie razem z listą treningów,
- sortowanie działa na stronie głównej i na ekranie `Treningi`.

### Model treningu

Aktualny model:

- trening ma nazwę i uwagi,
- trening ma wiele etapów,
- etap ma nazwę, typ, uwagi i wiele serii,
- seria ma liczbę serii,
- seria ma wiele elementów,
- element ma typ, ćwiczenie, typ celu, cel, ciężar i uwagi.

Element typu `Odpoczynek` ukrywa pole ćwiczenia i ciężaru. Element typu `Rozgrzewka` także ukrywa pole ćwiczenia. Pole ćwiczenia jest dostępne dopiero po wybraniu typu. Liczba serii jest ograniczona do 20.

### Katalog ćwiczeń

Ćwiczenia pochodzą z lokalnego katalogu Garmin-compatible. Katalog zawiera:

- stabilne `exerciseId`,
- nazwę EN,
- nazwę PL,
- kategorię Garmin,
- sprzęt,
- wpływ na mięśnie,
- metadane używane przez przegląd mięśni i progres.

Nie wspieramy własnych ćwiczeń w produkcie. To świadoma decyzja pod przyszłe mapowanie do Garmin.

### Ulubione ćwiczenia

Ulubione ćwiczenia działają:

- lokalnie bez logowania,
- offline,
- tylko dla ćwiczeń katalogowych,
- z synchronizacją po zalogowaniu.

Picker ćwiczeń ma:

- gwiazdkę ulubionych,
- filtr `Wszystkie ćwiczenia / Tylko ulubione`,
- wyszukiwarkę,
- grupowanie po wpływie na mięśnie.

### Przegląd mięśni

Panel `Przegląd` pokazuje sylwetkę przód/tył i koloruje mięśnie zależnie od ćwiczeń użytych w treningu. Działa w podglądzie read-only oraz w edycji treningu. W edycji jest domyślnie zwinięty i ukryty, jeśli trening nie ma ćwiczeń.

### Wykonywanie treningu

Dostępne tryby:

- `guided` / Krok po kroku,
- `readonly-post-workout` / Tylko podgląd, uzupełnię po treningu,
- `inline-table` / Tabela do uzupełniania na bieżąco.
- Inline table mode has a top-left orientation control and a synced per-user
  default orientation setting (`vertical` / `horizontal`) in Settings. Horizontal
  mode widens the table for landscape use; screen rotation is handled by the
  device/system auto-rotate setting, not by a manual CSS transform.

Sesja wykonania jest osobnym obiektem od planu treningowego. Plan nie jest nadpisywany wynikami. Sesja zapisuje snapshot treningu i entries do wykonania.

Sesje:

- działają offline,
- są zapisywane w account-scoped AsyncStorage,
- synchronizują się z kontem po zalogowaniu,
- mogą mieć status `active`, `completed`, `abandoned`,
- mogą być kontynuowane po restarcie aplikacji.

### Historia i progres

Historia i progres są liczone lokalnie z `WorkoutSession`.

Aktualne zachowanie historii:

- uzytkownik moze usunac pojedynczy wpis historii,
- usuniecie wpisu historii ustawia `deletedAt` na `WorkoutSession`,
- usuniety wpis znika z historii i progresu lokalnie,
- tombstone jest synchronizowany przez `POST /api/sync/workout-sessions`,
- usuniecie definicji treningu nie usuwa zapisanej historii,
- przy usuwaniu treningu z historia aplikacja pokazuje mocniejsze potwierdzenie,
- statusy sesji sa lokalizowane, wiec w PL `abandoned` jest wyswietlane jako `Przerwany`.

Read-only workout view ma zwijane/rozwijane sekcje, m.in. przeglad, notatki,
etapy i historie wykonania. Sekcja `Ostatni wynik` zostala usunieta z tego
widoku.
Wiersze cwiczen uzywaja kompaktowych kafelkow celu, np. `[3] x [8]`, a odpoczynek
pokazuje pojedynczy kafelek, np. `[2m]`. Ikona `body-outline` w wierszu cwiczenia
otwiera strone szczegolow cwiczenia, tak samo jak tapniecie wiersza.

Historia pokazuje:

- aktywne, ukończone i przerwane sesje,
- filtrowanie po statusie,
- wyszukiwanie po nazwie treningu,
- szczegóły sesji,
- ostatnie wykonania konkretnego treningu.

Progres liczy tylko sesje `completed` i ignoruje `active`, `abandoned` oraz `deletedAt`.

Metryki progresu:

- ostatni wynik,
- najlepszy ciężar,
- najwięcej powtórzeń,
- najlepsza objętość,
- szacowane 1RM według wzoru Epleya.

### Kreator AI

Kreator AI jest dostępny tylko dla zalogowanych użytkowników. Backend także wymaga bearer tokena.

Flow:

1. Mobile wysyła ankietę.
2. Backend tworzy asynchroniczny job.
3. Mobile zapisuje `jobId`.
4. Mobile odpytuje status joba.
5. Po wyniku importuje jeden lub wiele treningów.

Kreator dodaje rozgrzewkę zależnie od odpowiedzi użytkownika. Odpoczynki z API są mapowane na osobne elementy typu `Odpoczynek`.

### Modyfikowanie treningu z AI

Zalogowany użytkownik może wybrać `Modyfikuj z AI` w podglądzie treningu. Mobile wysyła aktualny trening i instrukcję do backendu przez endpoint rewrite. Wynik jest pokazywany jako propozycja AI.

Użytkownik może:

- zapisać propozycję jako nowy trening,
- zastąpić obecny trening po potwierdzeniu,
- odrzucić propozycję.

Ćwiczenia z AI są mapowane best-effort do katalogowego `exerciseId`. Jeśli nie uda się dopasować ćwiczenia, nazwa zostaje fallbackiem, ale nie powstaje własne ćwiczenie.

Znane ryzyko przed releasem: warto rozważyć ostrzejszą politykę dla niedopasowanych ćwiczeń z AI. Opcje: wymagać od użytkownika ręcznego przeglądu i zamiany ćwiczeń przed zapisem albo bardzo jasno pokazywać w UI, że część ćwiczeń nie ma dopasowania katalogowego.

### Kredyty

Kreator AI i modyfikowanie treningu z AI korzystaja z kontowych `AiCredits`.
W UI nazywamy je `Kredyty`; nazwa techniczna `AiCredits` zostaje w kodzie i API.

Aktualnie dziala:

- saldo kredytow przypisane do konta,
- initial grant dla nowych lub istniejacych kont bez konta kredytow,
- append-only ledger transakcji,
- koszt `plan` i `rewrite` konfigurowany backendowo,
- blokada AI przy braku tokenow przez `402 insufficient_ai_credits`,
- techniczny refund tokena, jesli job AI nie dostarczy uzywalnej propozycji,
- production-grade safety dla Database provider: atomowy consume tokena na poziomie bazy i idempotentny refund,
- unikalny constraint dla `UserId + operation type + IdempotencyKey`, zeby retry nie pobieral drugiego tokena,
- Google Play purchase validation po stronie backendu dla paczek `ai_tokens_1`, `ai_tokens_3`, `ai_tokens_10`,
- tabela `AiCreditPurchases` z hashem purchase tokena, statusem przetwarzania i powiazaniem do ledger transaction,
- endpoint `POST /api/ai-credits/purchases/google-play/verify`,
- idempotentne naliczanie zakupow: ponowne wyslanie tego samego purchase tokena nie dodaje tokenow drugi raz,
- server-side consume po poprawnym naliczeniu zakupu,
- natywne zaleznosci mobile `react-native-iap` i `react-native-nitro-modules` oraz Android permission `com.android.vending.BILLING`,
- Android debug APK build smoke przechodzi z natywnym Google Play Billing stackiem,
- release AAB build smoke przechodzi przez skrypt `mobile:store:aab`, ktory buduje z krotkiej sciezki roboczej dla Windows/CMake,
- build smoke wymaga Android SDK (`ANDROID_HOME` / `ANDROID_SDK_ROOT`); bez podlaczonego emulatora lub telefonu potwierdza linkowanie natywne, ale nie runtime UI,
- widok mobile `Kredyty` z saldem, kosztami, kompaktowymi kartami pakietow, ostatnimi transakcjami, informacjami i akcja zakupu/restore pending purchases,
- dev/test grant poza Production.

File provider nadal dziala jako dev fallback, ale produkcyjna sciezka dla kredytow to Database/PostgreSQL. Realne testy zakupow nie sa jeszcze zakonczone: wymagaja aplikacji w Play Console, aktywnych produktow, license testers, skonfigurowanego service account i instalacji builda z Internal Testing.

Dogrywka 12A.1: AiCredits concurrency, idempotency i refund zostaly sprawdzone na realnym lokalnym PostgreSQL bez Dockera. Migracja `HardenAiCreditsConcurrency` przeszla, `GET /api/health` potwierdzil `Database/PostgreSQL`, rownolegle requesty przy saldzie `1` zakonczyly sie jako jeden zaakceptowany job i jeden `402`, idempotency key nie pobral drugiego tokena, a techniczny failure joba utworzyl pojedynczy `Refund`.

### Artykuły

Artykuły są lokalne. Widok artykułu ma datę publikacji, czas czytania, nagłówki, akapity i czytelne karty planu tygodniowego zamiast szerokiej tabeli.
Model artykulu obsluguje `translations` per jezyk oraz `defaultLanguage`. Lista i szczegoly artykulu wybieraja wersje zgodna z jezykiem aplikacji, a jesli jej brakuje, wracaja do jezyka domyslnego albo pierwszej dostepnej wersji. Aktualny artykul o tworzeniu planu treningowego ma wariant PL i EN.

### Ustawienia

Sekcje:

- Preferencje,
- Trening,
- Powiadomienia,
- Integracje,
- Informacje.

Działa:

- język PL/EN,
- motyw dzienny/nocny,
- liczba serii,
- domyślny ciężar,
- domyślny typ etapu,
- domyślny tryb wykonywania treningu,
- lokalne przypomnienia treningowe,
- ulubione ćwiczenia,
- zwijanie paneli i zapis ich stanu.

Integracje są disabled/placeholder.

Opcje konta są w widoku Profil, nie w Ustawieniach. Profil ma dashboardowy układ:
jedna karta z avatarem, nazwą, emailem i akcjami avatara, karta osiągnięć
bezpośrednio pod profilem, grid `Szybkie akcje` dla kredytów, zmiany hasła,
sesji i zgłaszania błędów oraz dolną sekcję `Konto`. Wylogowanie jest ostatnią
akcją w sekcji Konto, a nie dominującym przyciskiem na górze.

### Przypomnienia treningowe

Przypomnienia są lokalnymi powiadomieniami systemowymi na telefonie. Zostały ręcznie zweryfikowane w standalone Android APK / dev buildzie. Backend nie wysyła powiadomień z serwera.

Aktualny model używa `weeklySchedule`: każdy dzień tygodnia ma osobne `enabled` i `time`, a `message` oraz `description` są wspólne dla wszystkich dni. Stare ustawienia `daysOfWeek + time` są migrowane lokalnie do nowego modelu.

Ustawienia:

- enabled,
- `weeklySchedule`,
- wiadomość,
- opis,
- `onlyIfNoWorkoutToday`.

Ustawienia synchronizują się przez `/api/settings`. Zaplanowane notification IDs są lokalne i per-user. Po logout albo zmianie konta aplikacja przelicza przypomnienia dla aktualnego kontekstu. `onlyIfNoWorkoutToday` działa best-effort na podstawie lokalnych `WorkoutSession`.

### Regulamin, kontakt i zgłaszanie błędów

Są ekrany:

- Regulamin,
- Kontakt,
- Zgłoś błąd.

Zgłoszenie błędu idzie do backendu przez `POST /api/bug-reports`. Aplikacja dołącza w tle informacje o urządzeniu, systemie, języku i ekranie. Backend wysyła mail SMTP z tematem `[Gymmin][Błąd] {Tytuł}` albo `[Gymmin][Bug] {Title}`. Jeśli tytuł jest pusty, backend używa bezpiecznego fallbacku.

### Diagnostyka i monitoring

Etap 9A dodaje lekki fundament diagnostyki bez zewnętrznego SaaS:

- backend dodaje `X-Correlation-Id` do każdej odpowiedzi i akceptuje ten sam header z requestu,
- correlation id trafia do scope logów backendu,
- backend loguje request method/path/status/elapsedMs oraz userId, jeśli jest znany,
- nieoczekiwane wyjątki wracają jako bezpieczny JSON `internal_error` z `correlationId`, bez stack trace w odpowiedzi,
- rate limit auth zwraca spójny błąd `rate_limited`,
- mobile wysyła `X-Correlation-Id` na requestach API i przechowuje ostatnie correlation ids,
- mobile ma lekki ring buffer ostatnich zdarzeń diagnostycznych,
- bug report dołącza kontekst: wersję, platformę, ekran, język, owner storage, ostatnie correlation ids, ostatni API error i ostatnie zdarzenia diagnostyczne.

`GET /api/diagnostics` jest dostępny tylko w development/testing albo po jawnym włączeniu konfiguracją `Gymmin:Diagnostics:Enabled`. Endpoint nie ujawnia sekretów ani connection stringów.

## Local-first i per-user storage

Mobile używa account-scoped AsyncStorage:

- anonymous: `gymmin.account.anonymous.*`,
- zalogowany użytkownik: `gymmin.account.{userId}.*`.

Dotyczy to:

- treningów,
- ustawień,
- sortowania treningów,
- ulubionych ćwiczeń,
- metadanych sync,
- sesji wykonania,
- profili kreatora,
- aktywnego joba kreatora,
- notification IDs przypomnień.

Zmiana konta nie wykonuje silent merge danych poprzedniego konta. Po loginie, jeśli istnieją dane anonymous, aplikacja pokazuje dialog:

- Połącz,
- Nie teraz,
- Usuń dane lokalne.

## Backend - aktualne endpointy

- `GET /health`
- `GET /api/health`
- `GET /api/diagnostics` tylko development/testing albo `Gymmin:Diagnostics:Enabled=true`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/settings`
- `PUT /api/settings`
- `GET /api/workouts`
- `GET /api/workouts/{clientWorkoutId}`
- `POST /api/workouts`
- `PUT /api/workouts/{clientWorkoutId}`
- `DELETE /api/workouts/{clientWorkoutId}`
- `POST /api/sync/workouts`
- `GET /api/favorite-exercises`
- `PUT /api/favorite-exercises`
- `POST /api/sync/favorite-exercises`
- `GET /api/workout-sessions`
- `GET /api/workout-sessions/{clientSessionId}`
- `PUT /api/workout-sessions/{clientSessionId}`
- `DELETE /api/workout-sessions/{clientSessionId}`
- `POST /api/sync/workout-sessions`
- `POST /api/workout-creator/plan`
- `POST /api/workout-creator/rewrite`
- `GET /api/workout-creator/plan/{jobId}`
- `GET /api/workout-creator/jobs/{jobId}`
- `POST /api/workouts/{clientWorkoutId}/garmin-sync`
- `POST /api/bug-reports`

## Testy automatyczne

Backend ma projekt testowy:

```text
backend/Gymmin.Api.Tests
```

Zakres testów backend API:

- auth: register, login, `GET /api/auth/me`, logout i 401 bez tokenu,
- settings: 204 dla nowego użytkownika, zapis/odczyt oraz `workoutReminders`,
- workouts: CRUD, soft delete, sync i izolacja userów,
- favorite exercises: zapis/odczyt, tombstone, walidacja pustego `exerciseId`, limit sync i izolacja userów,
- workout sessions: zapis/odczyt, tombstone, walidacja statusu/trybu, limit sync i izolacja userów,
- AI creator: 401 bez tokenu, owner check dla jobów plan/rewrite,
- bug reports: success path z fake senderem i walidacja pustego payloadu.

Testy backendu używają izolowanego SQLite w trybie Database provider. OpenAI i SMTP są fake/mockowane, więc testy nie wymagają prawdziwego klucza OpenAI i nie wysyłają maili.

Uruchomienie:

```powershell
dotnet test backend/Gymmin.Api.Tests/Gymmin.Api.Tests.csproj
```

Mobile ma unit tests dla krytycznych helperów local-first/sync/reminders/diagnostics:

```powershell
npm --prefix apps/mobile run test
```

Pokrycie mobile unit tests:

- account-scoped AsyncStorage keys i legacy migration,
- favorite exercises tombstones/merge,
- workout sessions conflict resolution, deletedAt filtering i progress filtering,
- Progress screen dashboard: top summary cards, all/strength/volume filters, compact exercise metric cards and optional local SVG sparkline,
- workout reminders pure scheduling rules,
- app diagnostics ring buffer i sanitization.

Mobile ma także typecheck:

```powershell
npm --prefix apps/mobile run typecheck
```

Brakuje jeszcze mobile UI tests i E2E. File provider ma status fallback/dev i nie ma jeszcze osobnego smoke suite.

## Co jest częściowe

- Konflikty multi-device mają prostą logikę `updatedAt` / `deletedAt`, ale brakuje dopracowanego UX konfliktów.
- Backend przechowuje `WorkoutSession`, ale progres jest liczony lokalnie, nie backendowo.
- Powiadomienia treningowe są lokalne i best-effort; backend nie wysyła powiadomień ani nie ma schedulera.
- Garmin sync jest placeholderem i pozostaje poza aktualnym zakresem prac.
- AI import/rewrite może zostawić ćwiczenie bez `exerciseId`, jeśli best-effort mapowanie do katalogu się nie powiedzie. Nie tworzy to custom exercise, ale przed releasem warto wymusić review/replacement albo mocniej pokazać ten fallback w UI.
- Artykuły są lokalne, bez CMS.
- Nie ma potwierdzania emaila, OAuth/social login ani 2FA.
- Testy backend API pokrywają krytyczne ścieżki, mobile ma unit tests helperów, ale brakuje pełnych testów mobile UI/E2E oraz osobnego smoke suite dla File provider.

## Najbliższe logiczne kroki

Aktualny tor produkcyjny dla backendu: PostgreSQL provider, jawne migracje i deployment checklist są opisane w `docs/deployment.md`.

1. Rozszerzyć testy mobile o UI tests i krytyczne E2E.
2. Uruchomić produkcyjny hosting DB na PostgreSQL według `docs/deployment.md`.
3. Dodać monitoring błędów i logów produkcyjnych.
4. Dopracować UX konfliktów synchronizacji i scenariusze multi-device.
5. Potwierdzanie emaila, OAuth/social login i 2FA zostają osobnymi przyszłymi etapami.
6. Garmin integration pozostaje placeholderem i jest poza aktualnym zakresem prac.

## Osiagniecia / achievements

Stage 13B completes achievements end-to-end. Achievements are still evaluated
on-device from local `WorkoutSession` history and foreground app usage stats,
but signed-in users now sync unlocked achievement state and app usage stats with
the backend. Unlocked achievements remain unlocked even if the user later
deletes a workout history entry.

Current scope:

- 30 static achievement definitions with PL/EN title and description fields.
- PNG achievement images bundled under `apps/mobile/assets/achievements`.
- Profile summary card with unlocked count, progress bar and latest unlock.
- Full Achievements screen with all/unlocked/locked filters.
- App usage tracking through React Native `AppState`.
- Weekly metrics include Monday-based weekly streaks and
  `maxCompletedWorkoutsInSingleWeek`.
- Backend `UserAchievements` and `UserAppUsageStats` storage for File and
  Database providers.
- `GET /api/achievements` and `POST /api/sync/achievements`.
- Anonymous achievements can be merged into an account through the existing
  anonymous data dialog.
- Lightweight unlock banner for newly unlocked local achievements.
- Unit/integration tests for metrics, unlock evaluation, storage isolation,
  backend validation, user scoping and sync merge rules.

Out of scope for this stage: leaderboards, public profiles, sharing,
backend-side definition versioning and anti-cheat.

## Exercise Detail Page UX

Widok szczegolow cwiczenia ma kompaktowy, panelowy layout:

- hero panel z nazwa, tagami i glownymi miesniami,
- opcjonalny panel animacji/obrazow, ukrywany gdy cwiczenie nie ma mapowanych obrazow,
- panel pracujacych miesni z przelacznikiem Przod / Tyl pod tytulem i domyslnym Przod,
- collapsible panele dla instrukcji, wskazowek, typowych bledow i historii,
- instrukcje renderowane jako numerowane kroki.

## APK poza Expo Go

Aktualny, sprawdzony sposob przygotowania paczki na telefon:

```powershell
npm run mobile:github:apk -- -ApiBaseUrl "https://your-backend-url.example.com"
```

Skrypt buduje release APK dla `arm64-v8a`, zapisuje go jako `.artifacts/Gymmin-arm64-v8a-release-latest.apk` i publikuje jako asset GitHub Release w prywatnym repo:

```text
kicha93/gymmin-apk
release: v1.0
```

To jest aktualny, sprawdzony flow pobierania i instalacji APK na Androidzie. Debug APK zostaje tylko jako awaryjna opcja developerska.

Google Play / Store nie uzywa tej paczki APK. Dla Store uzywamy release AAB:

```powershell
npm run mobile:store:aab -- -ApiBaseUrl "https://your-backend-url.example.com"
```

Tunele ngrok/Cloudflare zostaja tylko jako fallback, bo pobieranie APK przez tymczasowe tunele potrafilo zatrzymywac sie na 100% na Androidzie.

## System status callout

Homepage pokazuje spokojny komunikat systemowy, gdy publiczny
`GET /api/system/status` zwraca `degraded`, `maintenance` albo `update`, lub gdy
mobile lokalnie wykryje `offline`. Status `ok` nie pokazuje callouta. Komunikat
nie blokuje local-first uzycia aplikacji; dla `offline` informuje, ze lokalne
treningi zostaja bezpieczne na urzadzeniu. Szczegoly konfiguracji sa w
`docs/system-status.md`.
