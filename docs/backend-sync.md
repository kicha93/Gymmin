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
than 2 MB. Images are stored as backend files under `App_Data/avatars`, while
the user record stores only `AvatarFileName`, `AvatarContentType` and
`AvatarUpdatedAt`. `GET /api/profile/avatar` returns only the current user's
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
the same user-scoped data from the JSON stores. The avatar file under
`App_Data/avatars/{userId}` is deleted as part of the operation.

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

## Settings sync

Endpointy:

```http
GET /api/settings
PUT /api/settings
```

Jeśli ustawień brak, backend zwraca `204 No Content`.

Settings include the workout execution defaults used by mobile, including
`defaultWorkoutExecutionMode` and `defaultWorkoutTableOrientation`. The table
orientation value is `vertical` or `horizontal`; missing legacy values fall back
to `vertical`.

Synchronizowane pola obejmują:

- `language`
- `themeName`
- `defaultSetCount`
- `defaultWeight`
- `defaultStageType`
- `defaultWorkoutExecutionMode`
- `collapsedPanels`
- `isAuthPanelDismissed`
- `workoutReminders`
- `updatedAt`

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

Treningi są scoped po `UserId`. Usunięcie jest soft delete.

Mobile przechowuje treningi lokalnie per-user. Lokalny storage treningów zawiera także:

- `selectedWorkoutId`,
- `sort`.

Sortowanie jest tylko preferencją UI mobile i nie jest osobnym polem backendowym.

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
- najważniejsze metadane są osobnymi polami,
- `active`, `completed`, `abandoned` są synchronizowane,
- `deletedAt` jest tombstone,
- dane są scoped po `UserId`.

Conflict resolution:

- nowszy `clientUpdatedAt` wygrywa,
- `deletedAt` nowszy niż aktywny rekord wygrywa,
- tombstone nie powinien zostać utracony przed wypchnięciem do backendu.

Mobile storage:

```text
gymmin.account.{owner}.workoutSessions
gymmin.account.{owner}.workoutSessionsSync
```

Historia i progres nadal liczą dane lokalnie po scaleniu cache.

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
- idempotentnie dodaje `AiCredits` transakcja `Purchase`,
- po naliczeniu probuje wykonac server-side consume,
- retry tego samego `purchaseToken` nie nalicza tokenow drugi raz,
- ten sam `purchaseToken` u innego usera zwraca konflikt.

Mobile uzywa `react-native-iap` oraz `react-native-nitro-modules` jako natywnego stacka Google Play Billing. Jezeli Billing/Play Store nie jest dostepny w danym buildzie lub na urzadzeniu, ekran `Kredyty` pokazuje kontrolowany fallback i nie crashuje aplikacji.

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

Zakupy sa zapisywane w `AiCreditPurchases`. Tabela trzyma hash tokena zakupu, ostatnie znaki tokena do diagnostyki, `GoogleOrderId`, status przetwarzania i powiazana transakcje ledger. `purchaseToken` nie trafia do response, logow ani metadata transakcji.

TODO po 12B:

- dodac Real-time Developer Notifications przez Google Pub/Sub,
- obsluzyc refund/chargeback/cancel lifecycle z Google Play,
- wykonac manualny test w Play Console internal testing/license testers; kod, backend verify i AAB build sa gotowe, ale realny zakup wymaga konfiguracji Play Console i service account,
- utrzymywac Android build smoke dla `react-native-iap` / `react-native-nitro-modules` po zmianach natywnych zaleznosci,
- dodac CI/manual smoke dla produkcyjnej konfiguracji Google Play API.

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

## Bug reports

Endpoint:

```http
POST /api/bug-reports
```

Request zawiera tytuł, opis i kontekst urządzenia. Backend wysyła mail SMTP z tematem:

```text
Błąd {GUID}
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
- bug report dołącza diagnostic context: app/platform/screen/language/storage owner, ostatni API error, ostatnie correlation ids i ostatnie zdarzenia diagnostyczne.

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

`GET /api/diagnostics` jest dostępny tylko w development/testing albo po ustawieniu `Gymmin:Diagnostics:Enabled=true`. Endpoint pokazuje status konfiguracji typu storage/OpenAI/SMTP i czas serwera, ale nie ujawnia sekretów, tokenów ani connection stringów.

TODO: podłączyć produkcyjną agregację logów i zewnętrzny crash/error monitoring, np. Sentry/Crashlytics.

## Backend API tests

Projekt testowy:

```text
backend/Gymmin.Api.Tests
```

Uruchomienie:

```powershell
dotnet test backend/Gymmin.Api.Tests/Gymmin.Api.Tests.csproj
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
- bug reports success path i walidacja.

TODO:

- File provider smoke tests,
- rozszerzenie mobile unit tests poza aktualne helpery sync/local-first/reminders/diagnostics,
- mobile UI/E2E.

## Garmin

Endpoint:

```http
POST /api/workouts/{clientWorkoutId}/garmin-sync
```

To nadal placeholder. Nie ma jeszcze adaptera Garmin, OAuth Garmin ani eksportu treningów. Garmin integration remains a placeholder and is out of scope for the current development track.

## Ograniczenia

- Brak resetu hasła.
- Brak wygasania tokenów.
- Brak produkcyjnego hostingu DB.
- Brak zaawansowanego UX konfliktów.
- Brak backendowych statystyk progresu.
- Testy backend API pokrywają krytyczne ścieżki, ale nie mają jeszcze pełnego pokrycia wszystkich edge case'ów.
- Garmin sync jest placeholderem i pozostaje poza aktualnym zakresem prac.
