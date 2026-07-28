# Backend i synchronizacja

Ten dokument opisuje backend Gymmin, synchronizację danych i najważniejsze kontrakty API.

## Zasada local-first

Gymmin działa lokalnie bez logowania:

1. Użytkownik anonimowy może tworzyć treningi.
2. Może wykonywać treningi.
3. Ma lokalną historię i progres.
4. Ma lokalne ulubione ćwiczenia.
5. Może korzystać z lokalnych ustawień i przypomnień.

Po zalogowaniu dane kontowe są synchronizowane z backendem i dalej zostają lokalnie jako cache/offline copy.

## Autoryzacja

Backend używa bearer tokenów:

```http
Authorization: Bearer {token}
```

Token jest zwracany po logowaniu lub rejestracji. Mobile zapisuje token i odtwarza sesję przez:

```http
GET /api/auth/me
```

Endpointy kontowe wymagają bearer tokena. Dotyczy to settings, workouts, favorite exercises, workout sessions, achievements, AI credits i AI creator jobs.

## Storage backendu

Backend wspiera:

```text
Gymmin:Storage:Provider = File | Database
```

### File provider

Dane są w `backend/Gymmin.Api/App_Data`:

- `users.json`
- `user-settings.json`
- `workouts.json`
- `favorite-exercises.json`
- `workout-sessions.json`
- `user-achievements.json`
- `user-app-usage-stats.json`
- `workout-creator-jobs.json`
- `bug-reports.json`
- `avatars/` for profile avatar image files

### Database provider

EF Core + migracje. Database mode ma osobny wybor providera:

```text
Gymmin:Storage:DatabaseProvider = SQLite | PostgreSQL
```

Lokalnie SQLite:

```text
ConnectionStrings:DefaultConnection = Data Source=App_Data/gymmin-dev.db
```

Włączenie database mode:

```powershell
$env:Gymmin__Storage__Provider = "Database"
$env:Gymmin__Storage__DatabaseProvider = "SQLite"
$env:Gymmin__Storage__ApplyMigrationsOnStartup = "true"
```

PostgreSQL jest przygotowany pod staging/production:

```powershell
$env:Gymmin__Storage__Provider = "Database"
$env:Gymmin__Storage__DatabaseProvider = "PostgreSQL"
$env:ConnectionStrings__DefaultConnection = "Host=...;Database=...;Username=...;Password=..."
```

Szczegoly lokalnego PostgreSQL, migracji i checklisty deploymentu sa w `docs/deployment.md`.

Uwaga implementacyjna: obecne migracje uzywaja wspolnego schematu zgodnego z SQLite. Dla PostgreSQL backend mapuje `DateTimeOffset`, `Guid` i bool przez konwertery EF do typow tekstowo/liczbowych zgodnych z tym schematem.

Migracje ręcznie:

```powershell
cd backend/Gymmin.Api
dotnet tool restore
dotnet tool run dotnet-ef database update
```

## Auth

## System status

```http
GET /api/system/status
```

Public endpoint used by mobile to show a homepage system callout. It does not
require bearer auth and must not expose stack traces, infrastructure details or
secrets.

Response:

```json
{
  "kind": "ok",
  "message": null,
  "updatedAt": "2026-07-06T10:00:00Z"
}
```

Allowed configured values are `ok`, `degraded`, `maintenance` and `update`.
Invalid values fall back to `ok`. Mobile uses local `offline` when the request
fails.

Configuration:

```json
{
  "SystemStatus": {
    "Kind": "maintenance",
    "MessagePl": "Przerwa techniczna potrwa kilka minut.",
    "MessageEn": "Maintenance should take a few minutes."
  }
}
```

### Register

```http
POST /api/auth/register
Content-Type: application/json
```

Request:

```json
{
  "email": "user@example.com",
  "password": "test1234",
  "name": "Jan"
}
```

Mobile ma pole `powtórz hasło`, ale backendowy kontrakt pozostaje prosty i przyjmuje jedno pole `password`.

### Login

```http
POST /api/auth/login
Content-Type: application/json
```

Request:

```json
{
  "email": "user@example.com",
  "password": "test1234"
}
```

### Current user

```http
GET /api/auth/me
Authorization: Bearer {token}
```

Response includes basic account data and optional avatar metadata:

```json
{
  "id": "user-id",
  "email": "user@example.com",
  "name": "Jan",
  "avatarUrl": "/api/profile/avatar?v=...",
  "avatarUpdatedAt": "2026-07-04T10:00:00Z"
}
```

### Profile avatar

```http
GET /api/profile/avatar
POST /api/profile/avatar
DELETE /api/profile/avatar
Authorization: Bearer {token}
```

`POST /api/profile/avatar` accepts `multipart/form-data` with field `avatar`.
Allowed image types are JPEG, PNG and WebP. The backend validates content type
and file magic bytes, rejects empty files, unsupported formats and files larger
than 2 MB. Database mode stores image bytes and metadata on the user record, so
the avatar is shared across replicas and included in PostgreSQL backup/restore.
File mode uses `App_Data/avatars` only as a development fallback. `GET
/api/profile/avatar` returns only the current user's
avatar with private/no-cache headers. `DELETE` is idempotent and clears avatar
metadata. Mobile uses `avatarUpdatedAt` as a cache buster and does not store
base64 image data in AsyncStorage.

Troubleshooting: avatar upload depends on the same `ApiBaseUrl` as auth and
sync. Standalone APKs embed this URL at build time. If `/health` for that URL
returns `404` or does not respond, upload may show a network error. Rebuild the
APK with the current backend URL.

### Account deletion

```http
DELETE /api/account
Authorization: Bearer {token}
```

The endpoint deletes the currently authenticated account and invalidates its
sessions by removing the user record. Database mode relies on user-scoped
cascade deletes for settings, workouts, workout sessions, favorite exercises,
achievements/app usage, AI credit records and creator jobs. File mode removes
the same user-scoped data from the JSON stores. Database avatar content, or the
File-provider fallback under `App_Data/avatars/{userId}`, is deleted as part of
the operation.

Mobile exposes this as `Profile -> Account -> Delete account`. The user must
type `USUŃ` in PL or `DELETE` in EN before the final destructive action is
enabled. After a successful backend delete, mobile clears bearer auth and only
the deleted account namespace in AsyncStorage; anonymous data and other local
accounts remain untouched.

### Logout

```http
POST /api/auth/logout
Authorization: Bearer {token}
```

### Session hardening

Nowe sesje auth mają `ExpiresAt`. Domyślny czas życia tokenu to 30 dni i można go zmienić konfiguracją:

```json
{
  "Gymmin": {
    "Auth": {
      "SessionLifetimeDays": 30,
      "PasswordResetTokenMinutes": 30
    }
  }
}
```

Wygasły albo unieważniony token zwraca `401`. `GET /api/auth/me` i walidacja bearer tokena aktualizują `LastSeenAt`.

Endpointy zarządzania sesjami:

```http
GET /api/auth/sessions
DELETE /api/auth/sessions/{sessionId}
POST /api/auth/logout-all
POST /api/auth/change-password
POST /api/auth/password-reset/request
POST /api/auth/password-reset/confirm
```

`GET /api/auth/sessions` zwraca tylko aktywne sesje aktualnego użytkownika i nie zwraca hashy tokenów. `DELETE /api/auth/sessions/{sessionId}` może unieważnić pojedynczą sesję. `POST /api/auth/logout-all` unieważnia wszystkie sesje, opcjonalnie z `exceptCurrent=true`.

Zmiana hasła wymaga bearer tokena i obecnego hasła. Polityka Gymmin: po poprawnej zmianie hasła bieżąca sesja zostaje aktywna, a pozostałe sesje użytkownika są unieważniane.

Reset hasła jest dwuetapowy:

1. `POST /api/auth/password-reset/request` zawsze zwraca neutralny sukces i nie ujawnia, czy email istnieje.
2. `POST /api/auth/password-reset/confirm` przyjmuje token/kod resetu i nowe hasło.

Reset token jest przechowywany wyłącznie jako hash. Po poprawnym resecie hasła wszystkie aktywne sesje użytkownika są unieważniane. Email resetu używa SMTP (`Auth:Smtp`, fallback do `BugReports:Smtp`). W testach używany jest fake sender. Deeplink resetu hasła jest TODO; mobile MVP pozwala ręcznie wkleić token/kod z emaila.

Nowe konta otrzymują sześciocyfrowy kod weryfikacji emaila. Kod jest przechowywany wyłącznie jako hash, wygasa domyślnie po 30 minutach i może zostać potwierdzony tylko przez sesję tego samego konta przez `POST /api/auth/email-verification/confirm`. Do czasu potwierdzenia endpointy AI zwracają `403 email_not_verified`. Istniejące konta są oznaczane jako zweryfikowane podczas migracji. Mobile przechowuje bearer token w `expo-secure-store`; AsyncStorage zawiera wyłącznie cache profilu, a legacy token jest jednorazowo przenoszony i usuwany.

Limity rejestracji i kreatora AI są liczone osobno per IP oraz per email/użytkownik. W Database provider liczniki są atomowo współdzielone przez tabelę `AbuseRateLimitBuckets`, dzięki czemu obowiązują pomiędzy replikami backendu. File provider używa lokalnego limitera wyłącznie jako fallback developerski.

Usunięcie konta wymaga jednocześnie ważnej sesji i ponownego podania aktualnego hasła w body `DELETE /api/account` (`{ "password": "..." }`). Próby są limitowane per konto i IP; fraza `USUŃ`/`DELETE` pozostaje dodatkowym zabezpieczeniem UX, ale backend nie polega na niej jako dowodzie tożsamości.

Warstwa HTTP nakłada limit 4 MiB na request domyślny, około 2 MiB na avatar, 64 KiB na zgłoszenie błędu i 512 KiB na AI. Synchronizacja ma osobne limity liczby elementów i częstotliwości per użytkownik. Produkcja używa allowlisty `Gymmin:Cors:AllowedOrigins`, HSTS, HTTPS redirect oraz nagłówków bezpieczeństwa API.

## Settings sync

Endpointy:

```http
GET /api/settings
PUT /api/settings
```

Jeśli ustawień brak, backend zwraca `204 No Content`.

Settings include the workout execution defaults used by mobile, including
`defaultWorkoutExecutionMode`. Older payloads may still contain
`defaultWorkoutTableOrientation`; mobile accepts this legacy field for compatibility,
but orientation is now controlled by device auto-rotate and is not exposed in Settings.

Synchronizowane pola obejmują:

- `language`
- `themeName`
- `defaultSetCount`
- `defaultWeight`
- `defaultStageType`
- `defaultWorkoutExecutionMode`
- `collapsedPanels`
- `isAuthPanelDismissed`
- `showRestTimer`
- `workoutReminders`
- `creatorProfiles`
- `selectedCreatorProfileId`
- `weeklyPlan`
- `updatedAt`

`showRestTimer` steruje widocznością kontrolki timera odpoczynku podczas aktywnego
treningu. Jest ustawieniem konta: zapisuje się local-first, a po zalogowaniu jest
wysyłane i odtwarzane razem z pozostałym payloadem `/api/settings`. Wyłączenie
timera nie zmienia zaplanowanych czasów odpoczynku w definicji treningu.

`creatorProfiles` przechowuje maksymalnie 25 nazwanych profili ankiety Kreatora AI,
a `selectedCreatorProfileId` wskazuje aktualnie wybrany profil tylko wtedy, gdy jego
ID istnieje w tej liście. Profile zapisują się local-first w account-scoped
AsyncStorage i są wysyłane tym samym mechanizmem debounce oraz rozstrzygania
`updatedAt`, co pozostałe ustawienia. Po zalogowaniu na drugim telefonie odpowiedź
`GET /api/settings` odtwarza profile i wybór. Odpowiedź starszego backendu bez pola
`creatorProfiles` uruchamia jednorazową migrację istniejących profili lokalnych;
jawna pusta lista z nowego kontraktu pozostaje usunięciem i nie odtwarza starych
danych z cache. W bazie `NULL` oznacza rekord konta sprzed pierwszej synchronizacji,
natomiast zapisane `[]` oznacza świadomie pustą listę. Backend ogranicza rozmiar
całej kolekcji do 128 KiB i waliduje
liczbę profili, długości nazw/ID, liczbę pól oraz tekstowe wartości draftu. W
Database provider dane są zapisane w `UserSettings.CreatorProfilesJson` oraz
`UserSettings.SelectedCreatorProfileId`.

`weeklyPlan` zawiera aktywność planu, maksymalnie 100 przypisań
`workoutId + weekday`, kolejność oraz własne `updatedAt`. Mobile przechowuje plan
local-first pod `gymmin.account.{owner}.weeklyPlan.v1`, a po zalogowaniu porównuje
czas zmiany planu niezależnie od głównego `settings.updatedAt`. Świeże urządzenie
pobiera plan konta, nowsza zmiana offline jest dosyłana przy synchronizacji, a
jawna pusta lista usuwa plan również na innych urządzeniach. Plan anonimowy jest
scalany z planem konta po świadomym wyborze użytkownika. Backend waliduje dni
tygodnia, unikalność par trening/dzień, identyfikatory, kolejność oraz limit
64 KiB. `NULL` w kolumnie oznacza plan jeszcze niesynchronizowany; jawny pusty
obiekt planu oznacza usunięcie. Database provider zapisuje obiekt w
`UserSettings.WeeklyPlanJson`.

Przykład `workoutReminders`:

```json
{
  "enabled": true,
  "weeklySchedule": [
    { "day": "monday", "enabled": true, "time": "18:00" },
    { "day": "tuesday", "enabled": false, "time": "18:00" },
    { "day": "wednesday", "enabled": true, "time": "19:30" },
    { "day": "thursday", "enabled": false, "time": "18:00" },
    { "day": "friday", "enabled": true, "time": "17:00" },
    { "day": "saturday", "enabled": false, "time": "18:00" },
    { "day": "sunday", "enabled": false, "time": "18:00" }
  ],
  "message": "Czas na trening",
  "description": "Otwórz Gymmin i wykonaj zaplanowany trening.",
  "onlyIfNoWorkoutToday": true
}
```

Nowe ustawienia używają nazw dni `monday` ... `sunday`. Stare ustawienia `daysOfWeek + time` są nadal normalizowane po stronie mobile do `weeklySchedule`; konwencja legacy to `1 = Monday`, `7 = Sunday`.

Notification IDs nie są synchronizowane. Zostają lokalnie pod:

```text
gymmin.account.{owner}.workoutReminderNotificationIds
```

Workout reminders są lokalnymi powiadomieniami systemowymi na urządzeniu. Działają w standalone Android APK / dev buildzie. Backend nie wysyła powiadomień, nie ma schedulera i nie używa FCM. Backend przechowuje tylko ustawienia `workoutReminders` przez `/api/settings`; mobile planuje/anuluje lokalne powiadomienia i po logout/account switch przelicza je dla aktualnego kontekstu. `onlyIfNoWorkoutToday` działa best-effort na podstawie lokalnych `WorkoutSession`.

## Workouts sync

Endpointy:

```http
GET /api/workouts
GET /api/workouts/{clientWorkoutId}
POST /api/workouts
PUT /api/workouts/{clientWorkoutId}
DELETE /api/workouts/{clientWorkoutId}
POST /api/sync/workouts
```

Wszystkie wymagają bearer tokena.

`POST /api/workout-creator/plan` dodatkowo wymaga
`sensitiveDataConsent: true`. Mobile pokazuje osobną, domyślnie odznaczoną zgodę
bezpośrednio przed wysłaniem odpowiedzi mogących zawierać dane zdrowotne i
stylu życia. Backend odrzuca brak zgody kodem
`sensitive_data_consent_required` przed pobraniem kredytu i wywołaniem OpenAI.

Treningi są scoped po `UserId`. Usunięcie jest soft delete.

Mobile przechowuje treningi lokalnie per-user. Lokalny storage treningów zawiera także:

- `selectedWorkoutId`,
- `sort`.

Sortowanie jest tylko preferencją UI mobile i nie jest osobnym polem backendowym.

Definicja treningu ma opcjonalne `archivedAt`. Aktualny mobile wysyła także
jawne `isArchived`, aby odarchiwizowanie było odróżnialne od payloadu starego
klienta, który nie zna archiwizacji. Backend zachowuje istniejący stan, gdy
`isArchived` nie występuje, dzięki czemu starsza wersja aplikacji nie
odarchiwizuje treningu przypadkowo. Pole jest przechowywane w `WorkoutJson`, nie
wymaga osobnej migracji kolumny i synchronizuje się przez CRUD oraz
`POST /api/sync/workouts`.

Każdy krok ćwiczenia może zawierać `restSeconds` jako tekstową, nieujemną liczbę
sekund (maksymalnie `359999`). Pole jest częścią kontraktu workout CRUD/sync i
przenosi przerwę między seriami pomiędzy urządzeniami. Mobile nie zapisuje już
nowych przerw jako oddzielnych elementów `StageType.Rest`; starsze poprawne
elementy są migrowane lokalnie na `restSeconds`. Wynik migracji jest utrwalany
w account-scoped storage, a trening pobrany wyłącznie z backendu jest odsyłany
w nowej strukturze w tym samym cyklu synchronizacji. Podczas tworzenia
`WorkoutSession` mobile generuje techniczny wpis odpoczynku dla timera, więc
format sesji i historia wyników pozostają kompatybilne.

W okresie przejściowym request mobile zawiera również element zgodności z
identyfikatorem kończącym się na `-rest-compat`. Starszy backend, który nie zna
`restSeconds`, zachowuje dzięki niemu czas jako zwykły krok odpoczynku. Aktualny
backend rozpoznaje taki krok, scala go z poprzedzającym ćwiczeniem i zapisuje
wyłącznie kanoniczne `restSeconds`. Konfliktowych lub osieroconych odpoczynków
nie usuwa automatycznie.

Mobile potrafi również naprawić definicję, z której wcześniejsza synchronizacja
usunęła oba warianty. Źródłem jest najpierw snapshot planu w zapisanej
`WorkoutSession`, a następnie techniczny wpis odpoczynku dopasowany do
oryginalnego elementu i iteracji serii. Naprawiony workout jest zapisywany
local-first i wysyłany w kolejnym cyklu synchronizacji.

Dla historycznych planów z Kreatora AI dostępne jest narzędzie serwisowe
`scripts/repair-workout-rest-from-creator-jobs.mjs`. Domyślnie wykonuje dry-run,
a z flagą `--apply` uzupełnia wyłącznie puste wartości po jednoznacznym
dopasowaniu użytkownika, nazwy planu, liczby i kolejności ćwiczeń, celów oraz
notatek. Przed zapisem tworzy kopię `workouts.json`.

Brak pola lub pusty `restSeconds` w starszym payloadzie nie usuwa już dodatniej
wartości istniejącej na serwerze. Aktualny klient wysyła jawne `"0"` dla
świadomego braku odpoczynku, dzięki czemu użytkownik nadal może wyzerować czas,
a stara kopia aplikacji nie cofnie przeprowadzonej naprawy.

Domyślne sortowanie:

```json
{
  "field": "createdAt",
  "direction": "desc"
}
```

## Favorite exercises sync

Endpointy:

```http
GET /api/favorite-exercises
PUT /api/favorite-exercises
POST /api/sync/favorite-exercises
```

Zasady:

- favorites są katalogowe,
- rekord zawiera `exerciseId`, `createdAt`, `updatedAt`, `deletedAt`,
- `deletedAt` działa jako tombstone,
- backend normalizuje duplikaty,
- backend odrzuca puste `exerciseId`,
- request jest limitowany do rozsądnej liczby rekordów,
- dane są scoped po `UserId`.

Mobile storage:

```text
gymmin.account.{owner}.favoriteExercises
gymmin.account.{owner}.favoriteExercisesSync
```

## Workout sessions sync

Endpointy:

```http
GET /api/workout-sessions
GET /api/workout-sessions/{clientSessionId}
PUT /api/workout-sessions/{clientSessionId}
DELETE /api/workout-sessions/{clientSessionId}
POST /api/sync/workout-sessions
```

Zasady:

- `clientSessionId` = mobile `WorkoutSession.id`,
- backend przechowuje pełną sesję jako `SessionJson`,
- opcjonalne `WorkoutSession.supersets` (dwa sąsiadujące entry IDs, session-only) jest częścią tego samego `SessionJson`; nie ma osobnej tabeli ani endpointu superserii,
- najważniejsze metadane są osobnymi polami,
- `active`, `completed`, `abandoned` są synchronizowane,
- `deletedAt` jest tombstone,
- dane są scoped po `UserId`.

Conflict resolution:

Planowana superseria nie wymaga nowego kontraktu planu ani backendu. Mobile
rozpoznaje serię z dokładnie dwoma ćwiczeniami przy tworzeniu sesji guided i
zapisuje standardowe, usuwalne powiązanie w istniejącym
`WorkoutSession.supersets`. Dalej synchronizuje się ono w pełnym `SessionJson`.

- nowszy `clientUpdatedAt` wygrywa,
- `deletedAt` nowszy niż aktywny rekord wygrywa,
- tombstone nie powinien zostać utracony przed wypchnięciem do backendu.

Mobile storage:

```text
gymmin.account.{owner}.workoutSessions
gymmin.account.{owner}.workoutSessionsSync
```

Historia i progres nadal liczą dane lokalnie po scaleniu cache.

Mobile normalizuje `supersets` przy odczycie: odrzuca uszkodzone odwołania,
niesąsiadujące pary i nakładające się grupy. Wyniki A/B pozostają w istniejących
`entries`, więc starszy backend i starsze sesje bez pola `supersets` są zgodne
wstecznie. Backend nie wymagał zmiany kontraktu, ponieważ `SessionJson` jest
przechowywany jako pełny dokument JSON.

Usuniecie pojedynczego wpisu historii na mobile oznacza `WorkoutSession`
przez `deletedAt`. Taki tombstone jest zachowywany lokalnie, znika z UI
historii/progresu i jest wysylany przez `POST /api/sync/workout-sessions`.
Usuniecie definicji treningu nie usuwa powiazanych sesji historii; historia
korzysta z `sourceWorkoutName` i snapshotu planu jako fallbacku display.

## Achievements sync

Endpointy:

```http
GET /api/achievements
POST /api/sync/achievements
```

Achievement definitions pozostają statyczne w mobile. Backend przechowuje tylko
stan użytkownika:

- odblokowane `achievementId`,
- `unlockedAt`,
- `progressAtUnlock`,
- `updatedAt`,
- `appUsageStats.totalForegroundSeconds`.

Merge rules:

- unlocked achievements są scalane jako union po `achievementId`,
- duplikat zachowuje najwcześniejsze `unlockedAt`,
- `progressAtUnlock` zachowuje większą wartość,
- achievementy nie mają tombstone i nie są cofane,
- app usage stats scalają się przez `max(totalForegroundSeconds)`, żeby nie
  podwajać czasu z wielu urządzeń,
- backend waliduje puste ID, limit requestu i ujemne wartości.

Mobile storage:

```text
gymmin.account.{owner}.achievements
gymmin.account.{owner}.appUsageStats
gymmin.account.{owner}.achievementsSync
```

Anonymous achievements biorą udział w istniejącym flow anonymous merge. Po
`Połącz` lokalne odblokowania i app usage trafiają do konta i są syncowane do
backendu. `Nie teraz` zostawia je w przestrzeni anonymous, a `Usuń dane lokalne`
usuwa je razem z innymi anonymous account-scoped danymi.

## Per-user local storage

Mobile oddziela dane:

```text
gymmin.account.anonymous.*
gymmin.account.{userId}.*
```

Zmiana user A -> user B:

- nie merguje danych A do B,
- przełącza lokalny kontekst storage,
- uruchamia sync dla B,
- dane A zostają lokalnie pod kluczem A.

Anonymous -> logged in:

- jeśli istnieją dane anonymous, aplikacja pokazuje dialog,
- `Połącz` scala anonymous dane z aktualnym kontem,
- `Nie teraz` zostawia anonymous dane osobno,
- `Usuń dane lokalne` usuwa tylko przestrzeń anonymous po potwierdzeniu.

## AI credits

AI credits, czyli `Kredyty` w UI, sa przypisane do konta uzytkownika. Backend jest jedynym zrodlem prawdy dla salda.

Zasady:

- `1 AI credit = 1` uzycie kreatora planu albo modyfikacji treningu z AI,
- anonymous users nie moga uzywac AI creator/rewrite,
- saldo nie jest akceptowane z mobile,
- ledger transakcji jest append-only,
- `Consume` jest tworzone przy zaakceptowaniu joba AI,
- `Refund` jest tworzone przy technicznej porazce joba zgodnie z polityka MVP.
- w Database provider consume dziala transakcyjnie przez atomowy warunkowy update salda: `Balance = Balance - cost WHERE Balance >= cost`,
- idempotency key jest scoped po `UserId + operation type + IdempotencyKey`,
- retry tego samego startu joba nie pobiera drugiego tokena,
- refund jest idempotentny i w Database provider zapisuje ledger oraz metadata joba w jednej transakcji,
- File provider jest tylko dev fallbackiem; produkcyjne kredyty powinny dzialac na Database/PostgreSQL.

Smoke test PostgreSQL:

- `HardenAiCreditsConcurrency` przechodzi na realnym PostgreSQL,
- przy saldzie `1` dwa rownolegle requesty AI koncza sie jako dokladnie jeden zaakceptowany job i jeden `402 insufficient_ai_credits`,
- saldo nie schodzi ponizej `0`, ledger ma jeden `Consume`, a `BalanceAfter` jest spojne,
- ten sam `X-Idempotency-Key` dla tego samego usera zwraca ten sam job i nie pobiera drugiego tokena,
- ten sam `X-Idempotency-Key` moze byc uzyty niezaleznie przez roznych userow,
- techniczny failure joba tworzy dokladnie jeden `Refund` i ponowne sprawdzenie nie podbija salda drugi raz,
- Docker nie jest wymagany do lokalnego smoke testu; mozna uzyc tymczasowego lokalnego klastra PostgreSQL.

Endpointy:

```http
GET /api/ai-credits/balance
GET /api/ai-credits/transactions?limit=50
GET /api/ai-credits/packs
POST /api/ai-credits/dev/grant
POST /api/ai-credits/purchases/google-play/verify
GET /api/ai-credits/purchases
```

Wszystkie wymagaja bearer tokena. `dev/grant` dziala tylko poza Production i tylko gdy `Gymmin:AiCredits:DevGrantEnabled=true`.

Konfiguracja:

```json
{
  "Gymmin": {
    "AiCredits": {
      "InitialGrant": 1,
      "PlanCost": 1,
      "RewriteCost": 1,
      "DevGrantEnabled": true,
      "Packs": [
        { "ProductId": "ai_tokens_1", "Credits": 1, "DisplayName": "1 kredyt", "Active": true },
        { "ProductId": "ai_tokens_3", "Credits": 3, "DisplayName": "3 kredyty", "Active": true },
        { "ProductId": "ai_tokens_10", "Credits": 10, "DisplayName": "10 kredytow", "Active": true }
      ]
    },
    "GooglePlay": {
      "Enabled": true,
      "PackageName": "com.gymmin.app",
      "ServiceAccountJsonPath": "",
      "ServiceAccountJsonBase64": "",
      "ValidatePurchases": true,
      "ConsumePurchases": true
    }
  }
}
```

Current product IDs intentionally match the visible package sizes: `ai_tokens_1`
adds 1 credit, `ai_tokens_3` adds 3 credits and `ai_tokens_10` adds 10 credits.
Older 10/30/100 package examples are obsolete for the current UI/configuration.

Brak tokenow dla AI zwraca `402`:

```json
{
  "error": {
    "code": "insufficient_ai_credits",
    "message": "Not enough AI credits",
    "correlationId": "..."
  }
}
```

### Google Play Billing purchase validation

Kredyty sa produktami jednorazowymi/consumable w Google Play. Mobile uruchamia zakup i wysyla `productId` oraz `purchaseToken` do backendu. Mobile nigdy nie dodaje kredytow lokalnie.

Backendowy endpoint:

```http
POST /api/ai-credits/purchases/google-play/verify
Authorization: Bearer {token}
Content-Type: application/json
```

Request:

```json
{
  "productId": "ai_tokens_10",
  "purchaseToken": "token-from-google-play",
  "orderId": "optional-order-id"
}
```

Backend:

- sprawdza, czy `productId` jest aktywna paczka z konfiguracji,
- hashuje `purchaseToken` i nie zapisuje go plaintext w DB,
- waliduje zakup przez Google Play Developer API,
- sprawdza stan zakupu i dopasowanie produktu,
- porownuje zwrocony przez Google `obfuscatedExternalAccountId` z zalogowanym
  kontem, jezeli pole jest dostepne,
- idempotentnie dodaje `AiCredits` transakcja `Purchase`,
- po naliczeniu probuje wykonac server-side consume,
- retry tego samego `purchaseToken` nie nalicza tokenow drugi raz,
- ten sam `purchaseToken` u innego usera zwraca konflikt.

Mobile uzywa `react-native-iap` oraz `react-native-nitro-modules` jako natywnego stacka Google Play Billing. Do zakupu przekazuje stabilny, nieosobowy identyfikator `gymmin_{userId}`, co pomaga Google wykrywac naduzycia i pozwala backendowi sprawdzic przypisanie zakupu. Jezeli Billing/Play Store nie jest dostepny w danym buildzie lub na urzadzeniu, ekran `Kredyty` pokazuje kontrolowany fallback i nie crashuje aplikacji.

Success:

```json
{
  "status": "credited",
  "creditsAdded": 10,
  "balance": 13,
  "transactionId": "transaction-id",
  "purchaseId": "purchase-id"
}
```

Duplicate/idempotent success:

```json
{
  "status": "already_processed",
  "creditsAdded": 0,
  "balance": 13,
  "transactionId": "existing-transaction-id",
  "purchaseId": "purchase-id"
}
```

Zakupy sa zapisywane w `AiCreditPurchases`. Tabela trzyma hash tokena zakupu, ostatnie znaki tokena do diagnostyki, `GoogleOrderId`, status przetwarzania i powiazana transakcje ledger. `purchaseToken` nie trafia do response, logow ani metadata transakcji. Diagnostyczny JSON zwrocony przez Google jest sanitizowany przed zapisem: `purchaseToken` i `developerPayload` sa redagowane.

Stan po 12B:

- RTDN przez Google Pub/Sub jest obsługiwane przez uwierzytelniony push OIDC,
- `messageId` jest idempotentny, package name jest walidowany, a jawny purchase token nie jest utrwalany,
- znane zakupy są ponownie walidowane po RTDN; nieznane trafiają do inbox jako `unmatched`,
- refund/chargeback jest cyklicznie uzgadniany przez Voided Purchases API z
  trwalym checkpointem i oknem overlap,
- znany zakup jest oznaczany jako `Voided`; worker odbiera tylko niewykorzystane
  kredyty, nie tworzy ujemnego salda, a brakujaca kwote zapisuje jako
  `UnrecoveredCredits` do obslugi administracyjnej,
- wykonac manualny test w Play Console internal testing/license testers; kod, backend verify i AAB build sa gotowe, ale realny zakup wymaga konfiguracji Play Console i service account,
- utrzymywac Android build smoke dla `react-native-iap` / `react-native-nitro-modules` po zmianach natywnych zaleznosci,
- wykonac manualny smoke produkcyjnej konfiguracji Google Play API, RTDN i refundu.

## AI creator jobs

Endpointy:

```http
POST /api/workout-creator/plan
POST /api/workout-creator/rewrite
GET /api/workout-creator/plan/{jobId}
GET /api/workout-creator/jobs/{jobId}
```

Wszystkie wymagają bearer tokena.

Joby:

- mają właściciela `UserId`,
- cudzy job zwraca `404`,
- brak tokena zwraca `401`,
- są przechowywane w File albo Database providerze,
- mogą zostać wznowione po restarcie backendu.

`plan` generuje nowy plan. `rewrite` modyfikuje istniejący trening na podstawie instrukcji użytkownika.

AI import i AI rewrite mapują ćwiczenia best-effort do katalogowego `exerciseId`. Aplikacja nie tworzy własnych ćwiczeń. Jeśli dopasowanie się nie uda, nazwa ćwiczenia zostaje fallbackiem. Przed releasem warto rozważyć ostrzejszą politykę: niedopasowane ćwiczenia powinny wymagać review/replacement przed zapisem albo fallback powinien być jednoznacznie pokazany w UI.

Endpoint rewrite pozostaje obsługiwany przez backend ze względu na bezpieczne
wznowienie istniejących jobów, ale jego akcja startowa jest ukryta w aktualnym UI.

## Publiczne endpointy prawne

```http
GET /privacy?lang=pl|en
GET /account-deletion?lang=pl|en
```

Oba endpointy zwracają `text/html; charset=utf-8`, są dostępne bez logowania i
nie ujawniają danych użytkownika. `/account-deletion` zawiera:

- ścieżkę natychmiastowego usunięcia w aplikacji,
- zewnętrzne żądanie przez `kontakt@gymmin.app`,
- zakaz wysyłania hasła lub kodu weryfikacyjnego,
- zakres usuwanych danych i ograniczone wyjątki retencyjne,
- link zwrotny do polityki prywatności.

Publiczna strona jest wyłącznie instrukcją/uruchomieniem kontaktu. Nie omija
step-up authentication endpointu `DELETE /api/account`.

## Bug reports

Endpoint:

```http
POST /api/bug-reports
```

Production contract:

- request body is limited to 64 KiB,
- the default rate limit is 10 submissions per reporter/IP per 60 minutes,
- mobile sends a retry-stable `X-Idempotency-Key`; repeated delivery returns the original report id,
- `202 Accepted` includes a working `Location`, readable at `GET /api/bug-reports/{id}` with owner scoping for linked reports,
- SMTP is delivered asynchronously from a persistent lease-based outbox with five attempts and backoff,
- account deletion removes both `ReporterUserId` and account identifiers nested in stored diagnostics,
- `BugReportRewardTransactions` provides a unique, auditable one-reward-per-report ledger used by the admin API and future graphical panel.

Request zawiera tytuł, opis i kontekst urządzenia. Backend najpierw zapisuje zgłoszenie w `bug-reports.json` (File provider) albo tabeli `BugReports` (Database provider), a następnie próbuje wysłać powiadomienie SMTP. Awaria SMTP nie usuwa zgłoszenia i nie zmienia przyjętego requestu w błąd `503`; rekord otrzymuje `EmailDeliveryStatus=failed`.

Jeśli mobile wysyła poprawny bearer token, `ReporterUserId` jest ustalany po stronie backendu. Wartość autora nie jest przyjmowana z payloadu ani diagnostyki. Zgłoszenia anonimowe mają `ReporterUserId=null`. Usunięcie konta anonimizuje powiązanie, ale zachowuje raport.

Rekord jest obsługiwany przez admin API i przygotowany pod przyszły graficzny panel; zawiera m.in.:

- `Status` (początkowo `new`),
- `AdminResponse` i `AdminRespondedAt`,
- `RewardPoints` i `RewardedAt`,
- `EmailDeliveryStatus` i bezpiecznie ograniczony opis błędu dostarczenia,
- diagnostykę, daty utworzenia i aktualizacji.

Backendowa warstwa administracyjna jest dostępna opcjonalnie pod `/api/admin/bug-reports`.
Używa klucza przekazywanego w nagłówku, ale przechowuje w konfiguracji wyłącznie
jego SHA256. Dostęp jest limitowany per IP; zmiany statusu, odpowiedzi i pojedyncza
niezmienna nagroda są zapisywane razem z append-only `AdminAuditEvents`. Graficzny
panel administratora pozostaje przyszłym klientem tych endpointów.

Powiadomienie SMTP używa tematu:

```text
[Gymmin][Błąd] {Tytuł}
[Gymmin][Bug] {Title}
```

SMTP wymaga konfiguracji:

```text
BugReports:Smtp:Host
BugReports:Smtp:Port
BugReports:Smtp:Username
BugReports:Smtp:Password
BugReports:Smtp:From
BugReports:Smtp:To
BugReports:Smtp:EnableSsl
```

## Diagnostyka API

Etap 9A dodaje własny lekki fundament diagnostyczny, bez zewnętrznego SaaS:

- każdy response backendu ma header `X-Correlation-Id`,
- jeśli mobile wysyła `X-Correlation-Id`, backend zwraca ten sam identyfikator,
- correlation id jest dodawane do scope logów,
- backend loguje method/path/statusCode/elapsedMs oraz userId, jeśli request jest autoryzowany,
- global exception handler zwraca bezpieczny JSON `internal_error` z `correlationId` i nie ujawnia stack trace,
- rate limit auth zwraca `429` z kodem `rate_limited`,
- mobile trzyma ostatnie correlation ids i zdarzenia diagnostyczne w lekkim ring bufferze,
- bug report dołącza diagnostic context: app/platform/screen/language, ostatni API error, ostatnie correlation ids i ostatnie zdarzenia diagnostyczne; identyfikatory konta i storage owner nie są zapisywane.

Format globalnego błędu 500:

```json
{
  "error": {
    "code": "internal_error",
    "message": "Unexpected error",
    "correlationId": "..."
  }
}
```

`GET /api/diagnostics` jest dostępny tylko w development/testing. Produkcja odmawia
startu, jeżeli diagnostyka zostanie włączona. `/health/live` jest lekkim liveness,
a `/health/ready` zwraca `503`, gdy skonfigurowana baza nie jest osiągalna.

Produkcja emituje JSON console logs. Pozostaje podłączenie wybranego collectora i
mobile crash reportingu oraz weryfikacja alertów syntetycznych.

## Backend API tests

Projekt testowy:

```text
backend/Gymmin.Api.Tests
```

Uruchomienie:

```powershell
dotnet test backend/Gymmin.Api.Tests/Gymmin.Api.Tests.csproj
```

Opcjonalny smoke migracji na realnym PostgreSQL tworzy i usuwa wyłącznie tymczasową bazę:

```powershell
$env:GYMMIN_TEST_POSTGRES = "Host=localhost;Port=5432;Database=postgres;Username=...;Password=..."
dotnet test backend/Gymmin.Api.Tests/Gymmin.Api.Tests.csproj --filter FullyQualifiedName~PostgreSqlMigrationSmokeTests
```

Testy używają `Microsoft.AspNetCore.Mvc.Testing` i izolowanego SQLite w trybie Database provider. Każdy test factory dostaje osobną tymczasową bazę danych. Testy nie używają produkcyjnego/dev `App_Data`.

OpenAI i SMTP są fake/mockowane:

- `IWorkoutPlanGenerator` zwraca deterministyczny fake result,
- `IBugReportEmailSender` i `IPasswordResetEmailSender` nie wysyłają prawdziwych maili.

Pokrycie:

- auth register/login/me/logout, session expiry, revoked token, session list/revoke/logout-all, change password i password reset,
- settings 204/PUT/GET i `workoutReminders`,
- workouts CRUD/sync/soft delete/user isolation,
- favorite exercises GET/PUT/sync/tombstones/validation/user isolation,
- workout sessions GET/PUT/DELETE/sync/tombstones/validation/limit/user isolation,
- AI creator plan/rewrite auth i owner check,
- bug reports: trwały zapis, powiązanie autora z bearer tokena, zachowanie rekordu przy awarii SMTP, anonimizacja po usunięciu konta i walidacja,
- account deletion z aktualnym hasłem, email verification i produkcyjne limity requestów,
- Google Play RTDN OIDC/package/idempotency oraz brak jawnego purchase tokena,
- admin bug reports: hashowany klucz, pojedyncza nagroda i audit event,
- osobny liveness/readiness i bezpieczne correlation ids.

Workflow `.github/workflows/production-gate.yml` uruchamia ten zestaw na release
oraz realny smoke wszystkich migracji z PostgreSQL 16 service container.

Readiness produkcyjny nie ogranicza sie do `CanConnect`. Backend sprawdza rowniez
`GetPendingMigrations`, zwraca bezpieczne `schemaCurrent` i liczbe oczekujacych
migracji, a Production z `RequireCurrentSchema=true` odmawia startu na nieaktualnym
schemacie. Wynik readiness jest krotko cache'owany, aby czeste probe hostingu nie
obciazaly bazy. Odpowiedzi `/api` domyslnie maja `no-store` i `no-cache`;
jawnie prywatny cache z ETag, np. avatar, zachowuje polityke `private`.

Pozostałe testy:

- rozszerzenie File provider testów o symulowane awarie systemu plików,
- rozszerzenie mobile unit tests poza aktualne helpery sync/local-first/reminders/diagnostics,
- mobile UI/E2E.

## Garmin

Endpoint:

```http
POST /api/workouts/{clientWorkoutId}/garmin-sync
```

To nadal placeholder. Nie ma jeszcze adaptera Garmin, OAuth Garmin ani eksportu treningów. Garmin integration remains a placeholder and is out of scope for the current development track.

## Ograniczenia

- Brak produkcyjnego hostingu DB.
- Brak wybranego zewnętrznego collectora logów i mobile crash reportingu.
- Brak produkcyjnie uruchomionego harmonogramu backup/restore; worker Voided
  Purchases jest gotowy w kodzie, ale wymaga wlaczenia i monitoringu na hostingu.
- Brak zaawansowanego UX konfliktów.
- Brak backendowych statystyk progresu.
- Testy backend API pokrywają krytyczne ścieżki, ale nie mają jeszcze pełnego pokrycia wszystkich edge case'ów.
- Garmin sync jest placeholderem i pozostaje poza aktualnym zakresem prac.
