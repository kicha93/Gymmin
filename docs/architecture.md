# Architektura Gymmin

Ten dokument opisuje aktualny układ aplikacji i granice odpowiedzialności między mobile, backendem i lokalnym storage.

## Wysoki poziom

```text
Standalone Android APK / Expo React Native
  -> local-first UI i cache danych
  -> ręczne treningi
  -> wykonywanie treningu
  -> historia i progres liczone lokalnie
  -> lokalne przypomnienia treningowe
  -> synchronizacja po zalogowaniu

ASP.NET Core API
  -> auth i bearer tokeny
  -> settings / workouts / favorites / workout sessions sync
  -> AI creator plan/rewrite jobs
  -> SMTP bug reports
  -> File albo Database storage
```

## Mobile

Mobile odpowiada za:

- renderowanie aplikacji React Native,
- obsługę nawigacji,
- formularze logowania i rejestracji,
- walidację formularzy podstawowych,
- lokalny zapis danych,
- per-user local storage,
- ręczne tworzenie i edycję treningów,
- sortowanie i wyszukiwanie treningów,
- katalog ćwiczeń i picker ćwiczeń,
- ulubione ćwiczenia,
- przegląd mięśni,
- wykonywanie treningu,
- historię i progres,
- lokalne przypomnienia treningowe,
- integrację z backendem,
- import wyników AI.

### Local storage

Mobile używa account-scoped AsyncStorage.

Format kluczy:

```text
gymmin.account.anonymous.{baseKey}
gymmin.account.{userId}.{baseKey}
```

Przykładowe dane per-user:

- `workouts`
- `settings`
- `favoriteExercises`
- `favoriteExercisesSync`
- `workoutSessions`
- `workoutSessionsSync`
- `localCreatorJob.v1`
- `workoutReminderNotificationIds`

Globalne stare klucze są migrowane do przestrzeni `anonymous`. Zmiana konta nie powoduje silent merge danych poprzedniego użytkownika.

### Treningi

Trening jest zapisany lokalnie jako `SavedWorkout`.

Ważne pola:

- `id` / client workout id,
- `createdAt`,
- `name`,
- `draft`.

Sortowanie listy treningów jest częścią lokalnego storage treningów:

```ts
type WorkoutSortSettings = {
  field: "createdAt" | "name";
  direction: "asc" | "desc";
};
```

Domyślnie treningi są sortowane po `createdAt` malejąco, czyli najnowsze są na górze. Użytkownik może zmienić sortowanie przez ikonę w headerze panelu treningów.

### Auth

Mobile zapisuje token i użytkownika lokalnie. Po starcie aplikacja próbuje odtworzyć sesję przez:

```http
GET /api/auth/me
Authorization: Bearer {token}
```

Rejestracja ma potwierdzenie hasła i podgląd hasła po stronie UI. Backend nadal przyjmuje tylko `email`, `password`, `name`.

Auth hardening obejmuje wygasanie tokenów, `RevokedAt`, listę aktywnych sesji, wylogowanie pojedynczej sesji, logout-all, zmianę hasła i reset hasła przez email/token. Token resetu hasła jest zapisywany wyłącznie jako hash. Po zmianie hasła aktywna zostaje tylko bieżąca sesja; po resecie hasła unieważniane są wszystkie sesje użytkownika.

### AI jobs

Aktywny job kreatora jest local-first i account-scoped. Mobile rozróżnia:

- job generowania planu,
- job modyfikowania istniejącego treningu.

Po restarcie aplikacja może kontynuować polling, jeżeli ma aktywny job i token użytkownika.

### AI credits

AI credits sa kontowym limitem uzycia AI creator/rewrite. W UI nazywamy je tokenami AI, ale w kodzie backend/mobile uzywamy nazwy `AiCredits`, zeby nie mylic ich z bearer/auth tokens.

Backend trzyma:

- materializowane saldo per user,
- append-only ledger transakcji,
- koszt plan/rewrite z konfiguracji,
- initial grant przyznawany idempotentnie,
- techniczny refund, gdy job AI nie dostarczy uzywalnej propozycji.
- transakcyjny consume w Database providerze przez atomowy warunkowy update salda,
- idempotency scoped po uzytkowniku, typie operacji i `X-Idempotency-Key`,
- idempotentny refund powiazany z jobem,
- Google Play purchase records w `AiCreditPurchases`,
- server-side Google Play purchase validation i consume dla produktow consumable.

Mobile tylko wyswietla saldo i koszt. Backend zawsze decyduje, czy konto ma wystarczajace saldo. Brak salda zwraca `402 insufficient_ai_credits`. Przy zakupie mobile uruchamia Google Play Billing i wysyla `purchaseToken` do backendu; tokeny AI sa naliczane dopiero po pozytywnej walidacji backendowej. `purchaseToken` nie jest przechowywany plaintext ani zwracany w API.

File provider zachowuje poprawne zachowanie dev w pojedynczym procesie, ale produkcyjne kredyty AI powinny uzywac Database/PostgreSQL. In-memory lock nie jest glownym zabezpieczeniem salda.

### Historia i progres

Historia i progres są liczone z lokalnych `WorkoutSession`.

Backend synchronizuje dane źródłowe, ale nie liczy jeszcze statystyk. Dzięki temu historia i progres działają offline.

### Articles

Articles are local mobile content, not CMS-backed. The article model stores per-language `translations` with `title`, optional `summary` and `content`, plus `defaultLanguage`. Mobile resolves article text with `getArticleTranslation(article, language)`: current language first, default language second, first available translation third, and a safe empty-content fallback last. The current training-plan article has PL and EN variants.

### Przypomnienia

Przypomnienia są lokalnymi powiadomieniami systemowymi. Działają w standalone Android APK / dev buildzie. Backend synchronizuje tylko ustawienia `workoutReminders`. Identyfikatory zaplanowanych powiadomień są lokalne i per-user. Po logout albo zmianie konta mobile anuluje/przelicza przypomnienia dla aktualnego ownera. `onlyIfNoWorkoutToday` działa best-effort na podstawie lokalnych `WorkoutSession`.

## Backend

Backend odpowiada za:

- rejestrację i logowanie,
- bearer token validation,
- settings sync,
- workouts CRUD i sync,
- favorite exercises sync,
- workout sessions sync,
- AI creator plan/rewrite jobs,
- SMTP bug reports and password reset emails,
- placeholder Garmin sync. Integracja Garmin pozostaje poza aktualnym zakresem prac.

## Testy

Backend ma projekt `backend/Gymmin.Api.Tests` oparty o xUnit i `Microsoft.AspNetCore.Mvc.Testing`.

Test host uruchamia API blisko realnego hosta, ale wymusza Database provider na izolowanym SQLite w katalogu tymczasowym. OpenAI generator i SMTP sender są podmienione na fake implementacje.

Pokryte obszary:

- auth,
- settings z `workoutReminders`,
- workouts CRUD/sync,
- favorite exercises sync/tombstones,
- workout sessions sync/tombstones,
- AI creator auth i owner check,
- bug reports.

Komenda:

```powershell
dotnet test backend/Gymmin.Api.Tests/Gymmin.Api.Tests.csproj
```

Mobile ma unit tests dla krytycznych helperów local-first i sync:

```powershell
npm --prefix apps/mobile run test
```

Zakres mobile unit tests:

- per-user AsyncStorage key helpers i legacy migration,
- favorite exercises normalization, tombstones i merge,
- workout sessions merge, deletedAt filtering, progress filtering i stable updatedAt fallback,
- workout reminders pure scheduling logic,
- diagnostics ring buffer, correlation ids i sanitization.

Mobile ma też typecheck jako automatyczną kontrolę:

```powershell
npm --prefix apps/mobile run typecheck
```

TODO: dodać mobile UI tests i E2E. File provider wymaga jeszcze osobnego smoke suite.

## Diagnostyka i logowanie

Backend ma middleware correlation id. Każdy request dostaje `X-Correlation-Id`; jeśli klient wyśle ten header, backend go zachowuje i zwraca w response. Correlation id trafia do scope logów razem z danymi requestu.

Globalny exception handler zwraca bezpieczny JSON:

```json
{
  "error": {
    "code": "internal_error",
    "message": "Unexpected error",
    "correlationId": "..."
  }
}
```

Stack trace zostaje tylko w logach backendu. Logi requestów zawierają method, path, statusCode, elapsedMs i userId, jeśli został ustalony przez bearer token. Endpoint `/api/diagnostics` jest dostępny tylko w development/testing albo po jawnym włączeniu konfiguracją i nie pokazuje sekretów.

Mobile ma lekki ring buffer diagnostyczny w pamięci. Zapisuje ostatnie zdarzenia API/UI oraz correlation ids bez haseł, bearer tokenów i reset tokenów. Bug reporty dołączają snapshot diagnostyczny, żeby powiązać zgłoszenie z logami backendu.

TODO: dodać produkcyjną agregację logów i zewnętrzny crash/error monitoring, np. Sentry/Crashlytics.

## Storage backendu

Backend ma dwa tryby:

```text
Gymmin:Storage:Provider = File | Database
```

### File provider

Fallback developerski. Dane są zapisywane w `backend/Gymmin.Api/App_Data`.

Przykładowe pliki:

- `users.json`
- `user-settings.json`
- `workouts.json`
- `favorite-exercises.json`
- `workout-sessions.json`
- `workout-creator-jobs.json`

### Database provider

EF Core + migracje. Database mode ma osobny wybor providera:

```text
Gymmin:Storage:DatabaseProvider = SQLite | PostgreSQL
```

SQLite zostaje lokalnym/defaultowym providerem developerskim. PostgreSQL jest przygotowany pod staging/production.

Domyślny connection string:

```text
ConnectionStrings:DefaultConnection = Data Source=App_Data/gymmin-dev.db
```

Lokalny PostgreSQL mozna uruchomic przez `docker-compose.postgres.yml`. Szczegoly produkcyjnej konfiguracji, migracji i checklisty sa w `docs/deployment.md`.

Poniewaz migracje powstaly na wspolnym schemacie SQLite, backend uzywa konwerterow EF dla `DateTimeOffset`, `Guid` i bool, aby te same kolumny `TEXT`/`INTEGER` dzialaly przewidywalnie rowniez na PostgreSQL.

Database provider obejmuje:

- users,
- sessions,
- settings,
- workouts,
- favorite exercises,
- workout sessions,
- workout creator jobs.

Workout plans i workout sessions są w dużej części przechowywane jako JSON z metadanymi sync w osobnych kolumnach. To jest świadomy etap pośredni: najpierw trwałość i sync, potem ewentualna normalizacja.

## Synchronizacja

Synchronizowane z kontem:

- settings,
- workouts,
- favorite exercises,
- workout sessions.

Nie są synchronizowane jako osobne backendowe moduły:

- progres jako metryki,
- historia jako widok,
- notification IDs,
- lokalny UI state poza settings,
- artykuły,
- katalog ćwiczeń.

Conflict resolution jest minimalne:

- nowsze `updatedAt` / `clientUpdatedAt` wygrywa,
- `deletedAt` działa jako tombstone,
- dane są scoped po `UserId`.

## Ćwiczenia i Garmin compatibility

Źródłem ćwiczeń jest katalog aplikacji. Użytkownik nie tworzy własnych ćwiczeń.

Powody:

- stabilne `exerciseId`,
- przyszłe mapowanie do Garmin,
- spójny progres,
- spójny przegląd mięśni.

AI import i AI rewrite próbują best-effort mapować nazwę ćwiczenia do katalogowego `exerciseId`. Brak dopasowania nie tworzy custom exercise.

Znane ograniczenie: przed releasem warto zdecydować, czy niedopasowane ćwiczenia z AI mają wymagać ręcznego review/replacement przed zapisem, czy obecny fallback ma być wyraźniej pokazany w UI.

## Dystrybucja Android APK

Preferowany flow:

```powershell
npm run mobile:apk:share -- -ApiBaseUrl "https://your-backend-url.example.com"
```

Skrypt:

1. uruchamia typecheck,
2. osadza backend URL w build config,
3. buduje release APK dla `arm64-v8a`,
4. kopiuje artefakt do `.artifacts`,
5. publikuje APK do GitHub Release.

Domyślny target:

```text
kicha93/gymmin-apk
release: v1.0
```

Ngrok i Cloudflare są fallbackiem, ale GitHub Release jest preferowany, bo pobieranie przez tunele potrafiło blokować się na 100%.

## Ograniczenia

- Brak produkcyjnego hostingu DB.
- Brak potwierdzania emaila, OAuth/social login i 2FA.
- Brak zaawansowanego UX konfliktów.
- Brak backendowych statystyk progresu.
- Garmin sync pozostaje placeholderem i jest poza aktualnym torem developmentu.
- Brak CMS dla artykułów.
- Backend ma testy integracyjne API dla krytycznych ścieżek; mobile ma unit tests dla krytycznych helperów; brakuje jeszcze pełnych mobile UI/E2E i osobnego smoke suite dla File provider.

## Najbliższe kroki techniczne

1. Mobile UI tests i krytyczne E2E.
2. Produkcyjny hosting DB.
3. Monitoring błędów i logów produkcyjnych.
4. UX konfliktów multi-device.
5. Potwierdzanie emaila, OAuth/social login i 2FA jako osobne przyszłe etapy.
6. Garmin integration pozostaje placeholderem i jest poza aktualnym zakresem prac.
