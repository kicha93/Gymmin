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
  -> durable bug report storage + SMTP notifications
  -> File albo Database storage
```

## Mobile

Warstwa natywna mobile jest obecnie oparta o Expo SDK 57, React Native 0.86,
React 19.2, Hermes i obowiazkowa New Architecture. Projekt Android jest
przechowywany w repozytorium i aktualizowany recznie; dlatego kontrola Expo
dotyczaca automatycznej synchronizacji pol app config z katalogiem natywnym jest
wylaczona, natomiast pozostale kontrole `expo-doctor` pozostaja aktywne.

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

Kod mobile jest dzielony według odpowiedzialności:

- `App.tsx` pozostaje głównym miejscem kompozycji ekranów, nawigacji i nadrzędnego stanu aplikacji,
- `src/api/apiClient.ts` centralizuje requesty HTTP, bearer token, correlation id, diagnostykę i bezpieczne błędy API,
- `src/api/mobileApiClients.ts` składa wszystkie klienty domenowe ze wspólnego transportu i fabryki błędów; `App.tsx` memoizuje gotowy zestaw zamiast rekonstruować klientów przy każdym renderze,
- `src/api/accountDataApi.ts` centralizuje CRUD treningów, ustawienia oraz endpointy synchronizacji treningów, ulubionych, sesji i osiągnięć; waliduje rekordy treningów w runtime, a algorytmy merge i metadata pozostają w modułach domenowych,
- `src/api/authApi.ts` jest typowanym klientem credentials, weryfikacji emaila, haseł i aktywnych sesji; waliduje kształt odpowiedzi przed przekazaniem danych do UI,
- `src/api/bugReportsApi.ts` obsługuje idempotentne wysłanie zgłoszenia, walidację odpowiedzi i szczegóły błędów backendu,
- `src/platform/deviceInfo.ts` jest adapterem React Native dla diagnostyki urządzenia i nazwy sesji auth; czyste buildery formatują snapshot bez zależności od UI,
- `src/api/profileApi.ts` obsługuje transport avatara i step-up account deletion; aplikacja zachowuje odpowiedzialność za picker, cache i czyszczenie account-scoped storage,
- `src/features/profile/useCachedAvatar.ts` zarządza natywnym cache avatara, odświeżeniem po zmianie metadanych, czyszczeniem po usunięciu oraz stanem fallbacku po błędzie obrazu; composition root otrzymuje gotowe URI i akcje,
- `src/api/aiCreditsApi.ts` obsługuje saldo, historię, pakiety, weryfikację Google Play i deweloperskie zasilenie kredytów; natywne billing UI i lokalizacja pozostają w kompozycji,
- `src/api/workoutCreatorApi.ts` definiuje transport startu planu/rewrite i statusu joba oraz normalizuje `queued/processing/completed/failed`; polling i zastosowanie wyniku pozostają w warstwie kompozycji,
- `src/domain/workoutCreatorJob.ts` waliduje i normalizuje lokalny kontrakt oczekującego joba, a `src/features/workoutCreator/useAccountScopedCreatorJob.ts` izoluje jego odczyt, zapis i zmianę właściciela storage,
- `src/domain/workoutCreatorImport.ts` parsuje bezpośrednie i opakowane odpowiedzi AI, odzyskuje JSON z tekstu Markdown oraz buduje lokalne treningi z opcjonalną rozgrzewką i mapowaniem do katalogu,
- `src/domain/accountWorkouts.ts` mapuje lokalne treningi na kontrakt konta, odbudowuje zwalidowane odpowiedzi API i scala rekordy po stabilnym ID z pierwszeństwem danych konta,
- `src/domain/auth.ts` zawiera czyste kontrakty sesji i politykę hasła, a `src/features/auth/authSession.ts` izoluje natywny SecureStore,
- `src/features/auth/authSession.ts` odpowiada za pełny lokalny lifecycle sesji: zapis logowania, odtworzenie, migrację legacy tokenu, aktualizację profilu, fallback offline i czyszczenie credentials,
- `src/features/auth/useStoredAuthRestoration.ts` uruchamia odtworzenie dokładnie w cyklu montowania aplikacji, wystawia bramkę gotowości i nie aktualizuje stanu po odmontowaniu; `App.tsx` zachowuje jedynie nadrzędny stan użytkownika dla operacji interaktywnych,
- `src/features/auth/useEmailVerification.ts` i `useAuthSessionsController.ts` posiadają stan oraz transport weryfikacji emaila i listy/revokacji sesji; ekrany otrzymują gotowe akcje i wartości,
- `src/features/account/useAccountDataPolicy.ts` wykonuje jednorazową decyzję o zmianie konta lub adopcji danych anonimowych i utrzymuje resetowalną bramkę per użytkownik,
- `src/features/aiCredits/useAiCreditsController.ts` zarządza saldem, pakietami, historią, zakupem Google Play, weryfikacją i odtwarzaniem oczekujących zakupów,
- `src/storage/localDataRepositories.ts` centralizuje account-scoped odczyt, zapis i obsługę anonimowych danych treningowych,
- `src/features/storage/useAccountStorageMigration.ts` jest jedyną bramką startowej migracji wszystkich wspieranych kluczy legacy do anonimowego account-scoped storage; kontrolery danych uruchamiają się dopiero po jej zakończeniu,
- `src/features` zawiera kontrolery/hooki niezależnych cykli życia danych, obecnie treningów, sesji, ustawień, profili Kreatora i statusu systemu,
- `src/features/workoutSessions/useAccountScopedWorkoutSessions.ts` wiąże listę sesji, aktywną sesję i pozycję wykonania z jednym właścicielem storage,
- `src/features/workoutSessions/useActiveWorkoutController.ts` centralizuje start, kontynuację, edycję wpisów, zakończenie i porzucenie aktywnego treningu,
- `src/features/workouts/useWorkoutEditorController.ts` posiada cykl nowego/edytowanego treningu, a czyste mutacje hierarchii kroków znajdują się w `src/domain/workoutEditor.ts`,
- `src/features/weeklyPlan/useAccountScopedWeeklyPlan.ts` izoluje odczyt i zapis planu tygodniowego per owner oraz zeruje stan podczas przełączania kont,
- `src/features/reminders/useWorkoutReminderScheduling.ts` synchronizuje język domyślnych treści, zmianę właściciela, anulowanie oraz ponowne planowanie lokalnych powiadomień,
- `src/features/workoutCreator/useWorkoutCreatorJobPolling.ts` posiada cykl wznowienia joba i anulowanie po zmianie zależności, a `workoutCreatorPolling.ts` testowalną pętlę statusów, timeout i mapowanie `401`,
- `src/features/workoutSessions/useWorkoutSessionAutoSync.ts` obsługuje debounce synchronizacji sesji, odrzucanie nieaktualnych odpowiedzi i ochronę przed pętlą remote/local,
- `src/domain/workoutSessionSync.ts` definiuje transportowy kontrakt synchronizacji sesji, waliduje odpowiedź API i zapisuje metadata pull/push,
- `src/domain/appSettings.ts` normalizuje ustawienia, a `src/features/settings/useAccountScopedSettings.ts` wiąże ich stan z aktualnym właścicielem storage,
- `src/features/favorites/useAccountScopedFavoriteExercises.ts` wiąże ulubione z właścicielem storage i chroni auto-sync przed spóźnionymi odpowiedziami; kontrakt transportowy znajduje się w `src/domain/favoriteExerciseSync.ts`,
- `src/features/achievements/useAccountScopedAchievements.ts` zarządza osiągnięciami, czasem użycia i jednym kontrolowanym debounce synchronizacji; walidacja i merge odpowiedzi API znajdują się w `src/domain/achievementSync.ts`,
- `src/features/sync/useInitialAccountSync.ts` jest wspólną bramką pierwszej synchronizacji po zalogowaniu dla treningów, ustawień, ulubionych, sesji i osiągnięć; zmiana konta unieważnia request poprzedniego użytkownika,
- `src/features/settings/useAccountSettingsAutoSave.ts` grupuje kolejne zmiany ustawień i serializuje zapisy `PUT /api/settings`, dzięki czemu równoległe odpowiedzi nie cofają rewizji ustawień,
- `src/i18n/translations.ts` zawiera typowane tłumaczenia PL/EN oraz helper `translate`,
- `src/theme/theme.ts` i `src/theme/appStyles.ts` zawierają motywy oraz wspólne style,
- `src/components/AppControls.tsx` zawiera współdzielone kontrolki formularzy i wyboru,
- `src/components/WorkoutSessionControls.tsx` zawiera kontrolki aktywnej sesji, czasu i timera odpoczynku,
- `src/components/CollapsiblePanel.tsx` zawiera wspólny panel zwijany używany przez ekrany treningów, ustawień, szczegółów ćwiczeń i treści informacyjnych,
- `src/components/WorkoutPresentation.tsx` zawiera wspólne podsumowanie ćwiczenia, mapę pracujących mięśni oraz renderowanie sylwetki SVG,
- `src/components/LegalContent.tsx` zawiera wspólną obudowę treści prawnych i accordion FAQ,
- `src/screens` zawiera kompletne ekrany funkcjonalne. Każdy widok nawigacyjny ma własny moduł ekranu; `App.tsx` nie renderuje już rozbudowanych widoków bezpośrednio,
- `src/screens/AchievementsScreen.tsx` odpowiada za prezentację osiągnięć, lokalne filtry i podgląd grafik; obliczanie metryk, trwałe odblokowania i synchronizacja pozostają w warstwie domenowej oraz kompozycji aplikacji,
- `src/screens/AiCreditsScreen.tsx` odpowiada za saldo, pakiety, lokalne rozwinięcie historii i informacje o kredytach; pobieranie danych, zakup, weryfikacja Google Play oraz odtwarzanie oczekujących zakupów pozostają w kompozycji aplikacji i warstwie domenowej,
- `src/screens/ProgressScreen.tsx` odpowiada za dashboard postępu, wyszukiwanie, lokalne filtry, statystyki, karty ćwiczeń i sparklines; sesje treningowe oraz nawigacja do progresu ćwiczenia pozostają w kompozycji aplikacji, a obliczenia korzystają z testowanych helperów `src/domain/progressDashboard.ts`,
- `src/screens/ExerciseProgressScreen.tsx` odpowiada za metryki pojedynczego ćwiczenia, lokalny filtr zakresu historii, stronicowanie oraz rozwijanie grup sesji; grupowanie wyników pozostaje w `src/domain/exerciseProgressHistory.ts`, a wybór ćwiczenia i nawigacja w kompozycji aplikacji,
- `src/screens/WorkoutHistoryScreen.tsx` odpowiada za podsumowanie historii, kontrolowane filtry statusu, wyszukiwanie i listę sesji; źródło danych, filtrowanie po treningu, usuwanie oraz nawigacja pozostają w kompozycji aplikacji,
- `src/screens/WorkoutSessionDetailScreen.tsx` odpowiada za kartę wykonanej sesji oraz poziomo przewijaną tabelę pogrupowanych ćwiczeń i serii; wybrana sesja, potwierdzenie usunięcia i wyliczenie szerokości dla orientacji poziomej pozostają w `App.tsx`,
- `src/screens/WorkoutDetailScreen.tsx` odpowiada za prezentację definicji treningu, etapy, serie, podsumowanie mięśni i skróconą historię; wybór treningu, start sesji, potwierdzenie usunięcia, dostępność AI i nawigacja pozostają w kompozycji aplikacji,
- `src/screens/WorkoutCreatorScreen.tsx` odpowiada za kontrolowany formularz Kreatora AI, wybór lokalnego profilu, stany wysyłania i prezentację wyniku; wywołania API, polling joba, kredyty oraz zapis profili pozostają w `App.tsx`,
- transport wywołań Kreatora jest w `src/api/workoutCreatorApi.ts`, a cykl lokalnego pending joba w `useAccountScopedCreatorJob`; `App.tsx` koordynuje polling, saldo kredytów, reakcję UI po odtworzeniu i import wyniku,
- `src/screens/WorkoutAiRewriteScreen.tsx` i `src/screens/WorkoutAiProposalScreen.tsx` rozdzielają formularz instrukcji modyfikacji od podglądu propozycji AI; zapis, zastąpienie treningu, kredyty, endpoint rewrite i polling pozostają w `App.tsx`,
- `src/domain/workoutCreator.ts` zawiera typy, statyczną definicję ankiety oraz czyste helpery kopiowania i porównywania profili Kreatora,
- `src/domain/workoutAi.ts` zawiera testowalne podsumowanie dopasowania ćwiczeń z propozycji AI do katalogu,
- `src/domain/workoutSessionPresentation.ts` zawiera grupowanie aktywnej sesji, dane tabeli i lookup poprzednich wyników,
- `src/domain/workoutBuilderConfiguration.ts` zawiera typowane opcje i normalizację wejścia buildera,
- `src/domain` pozostaje miejscem dla logiki domenowej i testowalnych helperów niezależnych od UI.

Podział warstwy mobile jest zakończony na poziomie ekranów:

- `src/screens` odpowiada za układ i lokalny stan prezentacyjny poszczególnych widoków,
- `src/components` zawiera współdzielone kontrolki, dialogi, pickery, widgety homepage i elementy prezentacji treningu,
- `src/domain` zawiera typy, normalizację i testowalne helpery niezależne od React Native,
- `src/navigation/appNavigation.ts` zawiera typy tras, dolną nawigację i mapowanie tytułów ekranów,
- `App.tsx` jest warstwą kompozycji: utrzymuje nadrzędny stan aplikacji, account-scoped storage i orkiestrację synchronizacji oraz przekazuje dane i callbacki do ekranów; requesty HTTP wykonują moduły `src/api`.

Taki podział nie zmienia publicznych kontraktów, storage ani modelu danych. Krótkie funkcje `render...` pozostające w `App.tsx` są adapterami kompozycyjnymi i nie zawierają samodzielnych layoutów ekranów.

`src/screens/SettingsScreen.tsx` prezentuje aktywne sekcje ustawień, harmonogram przypomnień i linki informacyjne. `src/components/SettingsSheetContent.tsx` zawiera kontrolowane arkusze wyboru języka, domyślnych parametrów treningu i godziny przypomnienia. Account-scoped stan i persystencja są w `useAccountScopedSettings`, normalizacja w `src/domain/appSettings.ts`, a `useAccountSettingsAutoSave` bezpiecznie grupuje i serializuje zdalne zapisy. `App.tsx` koordynuje uprawnienia do powiadomień, natomiast transport `/api/settings` obsługuje `accountDataApi.ts`.

### Local storage

Mobile używa account-scoped AsyncStorage.

Aktywny plan tygodnia jest przechowywany lokalnie pod `gymmin.account.{owner}.weeklyPlan.v1`. Nie jest jeszcze synchronizowany z backendem: przypisania treningów do dni tygodnia oraz podsumowanie bieżącego tygodnia są local-first.

Cykl lokalny obsługuje `useAccountScopedWeeklyPlan`: hook śledzi właściciela
odczytu, blokuje zapis do niewłaściwego klucza i natychmiast zeruje plan podczas
zmiany konta, zanim zostaną wczytane dane nowego ownera.

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

Auth hardening obejmuje wygasanie tokenów, `RevokedAt`, listę aktywnych sesji, wylogowanie pojedynczej sesji, logout-all, zmianę hasła i reset hasła przez email/token. Mobile przechowuje bearer token w OS SecureStore/Keychain, a nie w AsyncStorage. Nowe konta wymagają weryfikacji emaila przed AI. Kody resetu i weryfikacji są zapisywane wyłącznie jako hash. Limity rejestracji i AI są współdzielone między replikami przez PostgreSQL. Po zmianie hasła aktywna zostaje tylko bieżąca sesja; po resecie hasła unieważniane są wszystkie sesje użytkownika.

Transport tych operacji przechodzi przez `src/api/authApi.ts`. Klient odrzuca niepełne odpowiedzi logowania i sesji oraz wymaga udanego statusu backendu przed lokalnym wykonaniem `logout-all`; nieudany request nie usuwa lokalnej sesji.

Operacje destrukcyjne stosują step-up authentication: usunięcie konta wymaga ponownej weryfikacji aktualnego hasła po stronie API oraz limitu prób per użytkownik/IP. Warstwa HTTP ogranicza rozmiary requestów i kolekcji synchronizacji, a Production rozdziela allowlistę CORS od szerokiej polityki Development/Testing.

### Profile avatar

Profile avatar is an account feature. Mobile uses `expo-image-picker` to pick
an image, normalizes it with `expo-image-manipulator` to at most 1024 px on the
longest side and uploads it as `multipart/form-data` to `POST /api/profile/avatar`.
The backend validates MIME type and magic bytes. Production Database mode stores
the bytes and metadata atomically on the user record, so all replicas and
PostgreSQL backups see the same avatar. File mode stores versioned files under
`App_Data/avatars` only as a development fallback. `GET
/api/auth/me` returns optional `avatarUrl` and `avatarUpdatedAt`; mobile uses
those fields to refresh an account-scoped private file cache. Native image
downloads use an explicit bearer header because the avatar endpoint is protected;
the downloaded copy is also normalized to 1024 px before React Native renders it.
This avoids both anonymous image requests and Android failures on full-resolution
camera files. Web uses the authenticated remote image source directly.
Anonymous users keep the default profile icon.

The Profile screen uses a compact account-dashboard layout. A single profile
card combines avatar, name, email and avatar actions; achievements are surfaced
directly below it; quick actions link to credits, password change, sessions and
bug reports; logout lives at the bottom of the Account section.

Account deletion is an authenticated destructive action in `Profile -> Account`.
Mobile requires the localized confirmation phrase (`USUŃ` / `DELETE`) before
calling `DELETE /api/account`. On success it clears bearer auth and removes only
the deleted account namespace (`gymmin.account.{userId}.*`) from AsyncStorage.
The backend deletes the user, sessions, avatar file and private user-owned data.
Anonymous local data and other cached accounts are intentionally preserved.

### System status

Backend exposes public `GET /api/system/status` for user-facing operational
status. It returns only `kind`, optional localized message and `updatedAt`; it
does not expose infrastructure details. The configured backend kinds are `ok`,
`degraded`, `maintenance` and `update`, set through `SystemStatus:Kind`,
`SystemStatus:MessagePl` and `SystemStatus:MessageEn`.

Mobile checks this endpoint on the homepage with a short in-memory cache. `ok`
renders nothing. Non-OK statuses render an inline callout above the main home
cards. If the request fails, mobile creates a local `offline` status and keeps
the app local-first.

### AI jobs

Aktywny job kreatora jest local-first i account-scoped. Mobile rozróżnia:

- job generowania planu,
- job modyfikowania istniejącego treningu.

Po restarcie aplikacja może kontynuować polling, jeżeli ma aktywny job i token użytkownika.

W Database mode kontrolowany `BackgroundService` atomowo claimuje oczekujące lub
wygasłe zadanie. `LeaseId`, `LeaseExpiresAt`, heartbeat i warunkowy zapis wyniku
chronią przed równoległym wykonaniem tego samego joba na kilku replikach.

### AI credits

AI credits sa kontowym limitem uzycia AI creator/rewrite. W UI nazywamy je `Kredyty`, ale w kodzie backend/mobile uzywamy nazwy `AiCredits`, zeby nie mylic ich z bearer/auth tokens.

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
- server-side Google Play purchase validation i consume dla produktow consumable,
- `GooglePlayVoidedPurchases` oraz `IntegrationCheckpoints` dla refund/chargeback
  reconciliation bez przechowywania jawnego purchase tokena.

Mobile tylko wyswietla saldo i koszt. Backend zawsze decyduje, czy konto ma wystarczajace saldo. Brak salda zwraca `402 insufficient_ai_credits`. Przy zakupie mobile uruchamia Google Play Billing, przekazuje Google nieosobowy identyfikator konta i wysyla `purchaseToken` do backendu; kredyty sa naliczane dopiero po pozytywnej walidacji backendowej. `purchaseToken` nie jest przechowywany plaintext ani zwracany w API.

File provider zachowuje poprawne zachowanie dev w pojedynczym procesie, ale produkcyjne kredyty AI powinny uzywac Database/PostgreSQL. In-memory lock nie jest glownym zabezpieczeniem salda.

### Historia i progres

Historia i progres są liczone z lokalnych `WorkoutSession`.

Backend synchronizuje dane źródłowe, ale nie liczy jeszcze statystyk. Dzięki temu historia i progres działają offline.

### Articles

Articles are local mobile content, not CMS-backed. The article model stores per-language `translations` with `title`, optional `summary` and `content`, plus `defaultLanguage`. Mobile resolves article text with `getArticleTranslation(article, language)`: current language first, default language second, first available translation third, and a safe empty-content fallback last. The current training-plan article has PL and EN variants.

### Przypomnienia

Przypomnienia są lokalnymi powiadomieniami systemowymi. Działają w standalone Android APK / dev buildzie. Backend synchronizuje tylko ustawienia `workoutReminders`. Model mobile używa `weeklySchedule`: każdy dzień tygodnia ma własne `enabled` i `time`, a `message`/`description` są wspólne. Stare `daysOfWeek + time` są normalizowane do nowego modelu. Identyfikatory zaplanowanych powiadomień są lokalne i per-user. Po logout albo zmianie konta mobile anuluje/przelicza przypomnienia dla aktualnego ownera. `onlyIfNoWorkoutToday` działa best-effort na podstawie lokalnych `WorkoutSession`.

## Backend

Backend odpowiada za:

- rejestrację i logowanie,
- bearer token validation,
- settings sync,
- native device orientation for workout tables; current window dimensions drive responsive table widths while legacy orientation settings remain readable for compatibility,
- workouts CRUD i sync,
- favorite exercises sync,
- workout sessions sync,
- AI creator plan/rewrite jobs,
- durable bug report storage with optional account linkage, idempotent intake, rate/size limits and a persistent SMTP retry worker,
- authenticated Google Play RTDN inbox and known-purchase reconciliation,
- optional admin bug-report API with immutable rewards and append-only audit events,
- liveness/readiness probes, JSON production logs and automatic cleanup of expired security data,
- schema-aware database readiness with a short cache and production startup
  rejection when EF migrations are pending,
- placeholder Garmin sync. Integracja Garmin pozostaje poza aktualnym zakresem prac.

Wszystkie endpointy biznesowe są mapowane przez moduły w
`backend/Gymmin.Api/Endpoints`: system, auth, profil/konto, ustawienia, treningi,
ulubione, sesje, osiągnięcia, bug reporty/admin, kredyty i zakupy, RTDN oraz
Kreator AI. `EndpointAuthorization`, `EndpointRequest` i `EndpointResults`
stanowią wspólną warstwę infrastrukturalną. `Program.cs` jest composition root
konfiguracji hosta, DI, middleware i produkcyjnych kontroli startowych.

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
- bug reports, RTDN identity/idempotency, admin authorization/audit and production request hardening.

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
- Progress dashboard helpers for tracked exercises, current-month volume, strength/volume sorting and local SVG sparkline data,
- workout reminders pure scheduling logic,
- diagnostics ring buffer, correlation ids i sanitization.
- wspólny klient API i mapowanie błędów,
- repozytoria account-scoped i normalizację zapisanych treningów,
- grupowanie aktywnej sesji oraz konfigurację buildera.

Mobile ma też typecheck jako automatyczną kontrolę:

```powershell
npm --prefix apps/mobile run typecheck
```

Pozostaje dodać mobile UI tests i E2E. File-provider persistence and atomic replacement are covered by a dedicated backend test.

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

Stack trace zostaje tylko w logach backendu. Logi requestów zawierają method, path, statusCode, elapsedMs i userId, jeśli został ustalony przez bearer token. Produkcja używa JSON console logs, a endpoint `/api/diagnostics` jest dostępny wyłącznie w development/testing. Liveness i readiness są rozdzielone na `/health/live` oraz `/health/ready`.

Mobile ma lekki ring buffer diagnostyczny w pamięci. Zapisuje ostatnie zdarzenia API/UI oraz correlation ids bez haseł, bearer tokenów i reset tokenów. Bug reporty dołączają snapshot diagnostyczny, żeby powiązać zgłoszenie z logami backendu.

Produkcja emituje strukturalne JSON console logs. Pozostaje podłączyć wybrany
collector oraz zewnętrzny mobile crash/error monitoring i skonfigurować alerty.

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
- `bug-reports.json`

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

Database provider obejmuje glowne prywatne dane konta i moduly backendowe:

- users and auth sessions,
- user settings,
- workouts,
- favorite exercises,
- workout sessions,
- workout creator jobs,
- profile avatar metadata,
- achievements and app usage stats,
- AI credit accounts, ledger transactions and purchase records,
- bug reports with workflow, email-delivery, admin-response and immutable reward metadata,
- Google Play RTDN inbox and admin audit events,
- distributed abuse-rate buckets and ephemeral authentication artifacts covered by retention cleanup.

Workout plans i workout sessions są w dużej części przechowywane jako JSON z metadanymi sync w osobnych kolumnach. To jest świadomy etap pośredni: najpierw trwałość i sync, potem ewentualna normalizacja.

## Synchronizacja

Synchronizowane z kontem:

- settings,
- workouts,
- favorite exercises,
- workout sessions,
- unlocked achievements and app usage stats,
- AI credits as backend-owned balance/history,
- profile/account metadata through auth/profile endpoints.

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

Katalog jest podzielony na pliki w `apps/mobile/src/domain/exerciseCatalog`. Stabilnym kluczem pozostaje `exercise.id`. Scalone rekordy nie są przepisywane w historycznych payloadach; `exerciseIdAliases.ts` rozwiązuje stare ID w runtime, a normalizacja historii i ulubionych grupuje je pod ID kanonicznym. Alias nazw jest rozwiązywany łańcuchowo, co zachowuje kompatybilność z wcześniejszymi etapami czyszczenia.

`garminCategory` nadal jest kompatybilną kategorią filtrowania. Audyt kontrolny wydzielił osobne rodziny `FRONT_RAISE`, `STEP_UP`, `GOOD_MORNING` i `ROPE_CLIMB`, zamiast przypisywać je do podobnych, lecz biomechanicznie innych kategorii. Nie wdrożono połowicznej migracji do osobnych `movementPattern` i `mechanic`; rekomendowany model pozostaje opisany w raporcie katalogu. `libraryTier` kontroluje widoczność rekordów specjalistycznych bez usuwania ich z danych historycznych, a `resolveExerciseId` kanonizuje stare ID na granicach odczytu mobile.

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
- Brak OAuth/social login i 2FA; potwierdzanie emaila przed AI jest wdrożone.
- Brak zaawansowanego UX konfliktów.
- Brak backendowych statystyk progresu.
- Garmin sync pozostaje placeholderem i jest poza aktualnym torem developmentu.
- Brak CMS dla artykułów.
- Backend ma testy integracyjne API dla krytycznych ścieżek oraz test trwałości File provider; mobile ma unit tests dla krytycznych helperów. Brakuje jeszcze pełnych mobile UI/E2E.

## Najbliższe kroki techniczne

1. Mobile UI tests i krytyczne E2E.
2. Produkcyjny hosting PostgreSQL, harmonogram backupu i okresowy test restore.
3. Podłączenie JSON logów i mobile crash reportingu do wybranego providera.
4. UX konfliktów multi-device.
5. OAuth/social login i 2FA jako osobne przyszłe etapy.
6. Garmin integration pozostaje placeholderem i jest poza aktualnym zakresem prac.

## Achievements architecture note

Stage 13B keeps achievement definitions mobile-static and adds backend sync for
unlocked achievement state. Definitions live in
`apps/mobile/src/domain/achievements.ts`. Unlocked achievements and app usage
stats are stored with the same account-scoped AsyncStorage convention as other
local-first data:

```text
gymmin.account.anonymous.achievements
gymmin.account.{userId}.achievements
gymmin.account.anonymous.appUsageStats
gymmin.account.{userId}.appUsageStats
gymmin.account.anonymous.achievementsSync
gymmin.account.{userId}.achievementsSync
```

Metrics are derived from local `WorkoutSession` data. Only completed,
non-deleted sessions count for training achievements. Active, abandoned and
deleted sessions are ignored. Once unlocked, an achievement stays unlocked
locally even if a history entry is deleted later.
Weekly achievement metrics use Monday-based local calendar weeks, including
`longestWeeklyStreak` and `maxCompletedWorkoutsInSingleWeek`.

Signed-in users sync through `GET /api/achievements` and
`POST /api/sync/achievements`. The backend stores `UserAchievements` and
`UserAppUsageStats`, unions unlocked achievements by `achievementId`, preserves
the earliest `unlockedAt`, and merges app usage by max foreground seconds.
Anonymous achievements can be merged into an account through the existing
anonymous data merge dialog. Mobile unit tests cover achievements metrics,
foreground app usage clamping, storage isolation, merge helpers and unlock
evaluation; backend integration tests cover auth, validation, user scoping and
sync merge rules.
