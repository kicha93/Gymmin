# Gymmin - stan aplikacji

Ten dokument opisuje aktualny zakres aplikacji Gymmin po audycie produkcyjnym i audycie aktualizacji Expo z 16 lipca 2026. Powinien być traktowany jako szybki przegląd: co działa, co jest częściowe i czego jeszcze brakuje.

## Cel aplikacji

Gymmin to mobilna aplikacja do treningów siłowych. Aplikacja jest local-first: bez konta można tworzyć treningi, wykonywać je, mieć historię i progres lokalnie na telefonie. Konto służy do synchronizacji danych z backendem oraz do funkcji wymagających identyfikacji użytkownika, takich jak kreator AI.

## Prywatność i zgoda na dane wrażliwe

- ustawienia zawierają ekran polityki prywatności PL/EN dostępny także offline,
- backend udostępnia publiczną politykę bez logowania pod
  `GET /privacy?lang=pl|en`; produkcyjny adres tego endpointu jest przeznaczony
  również do pola Privacy Policy w Google Play Console,
- polityka opisuje kategorie danych, cele, retencję i usuwanie konta oraz
  odbiorców: hosting/bazę danych, OpenAI, operatora SMTP i Google Play,
- przed przesłaniem profilu kreatora AI użytkownik musi osobno zaznaczyć
  świadomą zgodę obejmującą dane zdrowotne, urazy, leki i styl życia,
- zgoda nie jest domyślnie zaznaczona ani trwale zapamiętywana; jest wymagana
  dla każdego nowego wysłania,
- backend wymaga `sensitiveDataConsent: true` i odrzuca brak zgody przed
  pobraniem kredytu oraz przed wywołaniem OpenAI.
- publiczny endpoint `GET /account-deletion?lang=pl|en` opisuje usunięcie
  bezpośrednio w aplikacji oraz żądanie wysłane spoza aplikacji z adresu email
  przypisanego do konta; zawiera zakres danych usuwanych i ograniczone wyjątki
  retencyjne,
- ekran polityki prywatności prowadzi także do publicznej instrukcji usunięcia,
  a jej produkcyjny URL jest przeznaczony do pola Account deletion w Google Play.

Docelowo Gymmin ma być przygotowany pod synchronizację z Garminem, dlatego ćwiczenia pochodzą z katalogu aplikacji i mają stabilne identyfikatory.

## Stack

### Mobile

- Standalone Android APK jako podstawowy tryb testowania na telefonie.
- Expo SDK 57 jako warstwa natywna projektu.
- React Native 0.86, React 19.2, TypeScript 6.
- Gluestack UI, Ionicons, React Native SVG.
- AsyncStorage jako lokalny storage danych local-first; bearer tokeny są w OS SecureStore/Keychain.
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
- SMTP dla weryfikacji emaila, resetu hasła i powiadomień o zgłoszeniach.
- Google Play Developer API oraz uwierzytelniony Pub/Sub RTDN.
- Produkcyjne health probes, JSON logs, retencja danych technicznych i opcjonalne admin API.

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
- Osiągnięcia.
- Kredyty.
- Ulubione ćwiczenia.
- Artykuły.
- Regulamin.
- Kontakt.
- Zgłoś błąd.
- Profil / Logowanie.

Android back button jest obsłużony i prowadzi użytkownika krokami w stronę ekranu głównego.

Warstwa widoku Osiągnięć jest wydzielona z głównego `App.tsx`: ekran utrzymuje lokalny filtr `Wszystkie/Odblokowane/Zablokowane`, sortuje odblokowane po dacie i obsługuje pełnoekranowy podgląd grafik. Metryki, zapis per konto, synchronizacja i toast po lokalnym odblokowaniu nadal korzystają z istniejącego systemu domenowego.

Warstwa widoku Kredytów jest wydzielona z `App.tsx`: ekran prezentuje saldo, koszty, pakiety, trzy ostatnie transakcje z lokalną akcją `Zobacz wszystkie`, informacje oraz warunkowe odtwarzanie zakupów. Backend nadal jest źródłem prawdy dla salda, a zakup i weryfikacja Google Play nie zostały przeniesione do UI.

Warstwa dashboardu Postępu jest wydzielona z `App.tsx`: ekran utrzymuje lokalną frazę wyszukiwania i filtr `Wszystkie/Siła/Objętość`, pokazuje statystyki miesiąca, kompaktowe karty ćwiczeń oraz sparklines. Dane nadal są wyliczane local-first z ukończonych `WorkoutSession`, a otwarcie szczegółów progresu pozostaje częścią głównej nawigacji aplikacji.

Widok Progresu ćwiczenia również jest osobnym ekranem: prezentuje grid metryk, filtry zakresu, pogrupowane sesje treningowe, zwijane wiersze serii oraz przyrostowe pokazywanie starszych wyników. Stan prezentacyjny jest lokalny dla ekranu, natomiast grupowanie i filtrowanie danych korzysta z testowanych helperów domenowych.

Historia treningów i szczegóły wykonanej sesji są wydzielone do osobnych ekranów. Historia zachowuje podsumowanie, filtry, wyszukiwanie i usuwanie wpisów, a szczegóły zachowują kartę sesji oraz poziomo przewijaną tabelę ćwiczeń i serii z obsługą szerokości ekranu w orientacji poziomej. Dane, potwierdzenia operacji i nawigacja nadal są koordynowane przez `App.tsx`.

Widok definicji treningu jest wydzielony do `WorkoutDetailScreen`. Ekran prezentuje notatki, start treningu, modyfikację AI, podsumowanie mięśni, zwijane etapy z seriami oraz skróconą historię. Wspólne elementy prezentacji ćwiczeń i panel zwijany zostały przeniesione do `src/components`, natomiast operacje na danych i nawigacja pozostają w `App.tsx`.

Formularz Kreatora AI jest wydzielony do `WorkoutCreatorScreen`, a definicja ankiety i helpery profili do `src/domain/workoutCreator.ts`. Ekran zachowuje profile, zwijane sekcje, kontrolę salda kredytów i wszystkie fazy prezentacji, natomiast wysyłanie ankiety, polling joba, import treningów oraz local-first zapis i synchronizacja profili są nadal koordynowane przez `App.tsx`. Profile Kreatora i wybrany profil należą do payloadu ustawień konta, więc po zalogowaniu odtwarzają się na innych urządzeniach. Starsze profile zapisane wyłącznie lokalnie są jednorazowo dosyłane, gdy odpowiedź serwera pochodzi ze starego kontraktu bez pola `creatorProfiles`.

Formularz modyfikowania treningu przez AI i ekran propozycji mają osobne moduły `WorkoutAiRewriteScreen` oraz `WorkoutAiProposalScreen`. Podgląd zachowuje hierarchię etapów, serii i ćwiczeń oraz informację o dopasowaniu do katalogu. Endpoint rewrite, polling, rozliczenie kredytu, zapis jako nowy trening i zastąpienie istniejącego planu pozostają w kompozycji aplikacji.

Warstwa prezentacyjna Ustawień jest wydzielona do `SettingsScreen` i `SettingsSheetContent`. Ekran zachowuje sekcje preferencji, treningu, przypomnień i informacji; pusty panel przyszłych integracji jest obecnie ukryty. Arkusze zachowują edycję języka, wartości domyślnych oraz godzin per dzień. Normalizacja znajduje się w `src/domain/appSettings.ts`, account-scoped persystencja w `useAccountScopedSettings`, transport w `src/api/accountDataApi.ts`, natomiast `App.tsx` koordynuje uprawnienia powiadomień i decyzje synchronizacji ustawień.

Wszystkie widoki nawigacyjne mobile mają obecnie własne moduły w `src/screens`. Dotyczy to również homepage, listy treningów, planu tygodnia, buildera treningu, aktywnej sesji, szczegółów ćwiczenia, ulubionych ćwiczeń i artykułu. Elementy używane przez kilka ekranów zostały przeniesione do `src/components`, a typy i czyste helpery do `src/domain`. `App.tsx` pozostaje kompozytorem stanu, storage, API, synchronizacji i nawigacji; nie zawiera już pełnych implementacji ekranów.

Account-scoped ulubione ćwiczenia i osiągnięcia mają własne kontrolery w `src/features`. Synchronizacja ulubionych odrzuca spóźnione odpowiedzi, a osiągnięcia oraz czas użycia korzystają z jednego debounce zamiast dwóch konkurujących timerów. Kontrakty, normalizacja odpowiedzi i merge znajdują się odpowiednio w `src/domain/favoriteExerciseSync.ts` i `src/domain/achievementSync.ts`.

Pierwszą synchronizację treningów, ustawień, ulubionych, sesji i osiągnięć po zalogowaniu koordynuje `useInitialAccountSync`. Każda dziedzina ma jawny stan synchronizacji, a odpowiedź rozpoczęta dla poprzedniego konta jest unieważniana po zmianie użytkownika lub właściciela lokalnego storage.

HTTP dla CRUD treningów, ustawień oraz synchronizacji treningów, ulubionych,
sesji i osiągnięć jest skupione w typowanym `src/api/accountDataApi.ts`. Moduły
domenowe nadal budują payloady, zapisują metadata i wykonują merge, dzięki czemu
transport nie zawiera decyzji UI ani storage. Odpowiedź listy treningów jest
walidowana w runtime; rekordy bez stabilnego ID i wadliwe kroki są odrzucane
przed przekazaniem do mappera oraz merge.

Klienty API są składane przez `src/api/mobileApiClients.ts` z jednego transportu
HTTP i jednej fabryki błędów z correlation ID. `App.tsx` memoizuje zestaw, więc
klienty nie są rekonstruowane podczas każdej zmiany stanu lub renderu ekranu.

Pozostałe procesy frontendu mają osobne kontrolery: politykę zmiany konta i
danych anonimowych, billing kredytów AI, weryfikację emaila i aktywne sesje auth,
harmonogram przypomnień, polling jobów Kreatora, aktywny trening oraz edytor
treningu. Czyste operacje na hierarchii etapów/serii/ćwiczeń są w
`src/domain/workoutEditor.ts`; composition root koordynuje już głównie
nawigację, dialogi i przepływ danych między funkcjami.

Ścieżka dodawania elementów w builderze nie inicjalizuje już katalogu 964
ćwiczeń. Pusty element montuje tylko pola typu i celu, wybór typu sprawdza
zgodność istniejącego ćwiczenia przez indeks katalogowy bez budowania tablicy
opcji, a `ExercisePicker` tworzy sekcje dopiero po faktycznym otwarciu. Domyślne
sekcje dla typu `exercise` są przygotowywane po zakończeniu interakcji wejścia na
ekran. Hierarchia etap → serie → elementy jest grupowana liniowo i memoizowana
zamiast wielokrotnie filtrować cały draft podczas każdego renderu.

Startowa migracja starszych kluczy AsyncStorage jest skupiona w
`src/features/storage/useAccountStorageMigration.ts`. Moduł zachowuje komplet
dziesięciu mapowań treningów, ustawień, profili i joba Kreatora, sesji oraz
ulubionych; account-scoped kontrolery rozpoczynają odczyt dopiero po zakończeniu
migracji. Lista źródeł legacy ma test regresyjny, aby refaktoryzacja nie zgubiła
lokalnych danych istniejących instalacji.

Mapowanie treningów pomiędzy lokalnym `SavedWorkout` i kontraktem konta oraz
deterministyczny merge po stabilnym ID znajdują się w
`src/domain/accountWorkouts.ts`. Dane konta mają pierwszeństwo przed lokalnym
duplikatem, a brakujące rekordy lokalne są zachowywane.

Kolejne zmiany ustawień są zapisywane zdalnie przez `useAccountSettingsAutoSave`. Kontroler stosuje debounce 400 ms, utrzymuje najwyżej jeden aktywny `PUT /api/settings` i po zakończeniu wysyła wyłącznie najnowszą oczekującą rewizję. Odpowiedź starego konta ani starszej rewizji nie aktualizuje lokalnego `updatedAt`. Zastosowanie ustawień z serwera aktualizuje bazę obserwacji bez odsyłania ich echem, natomiast pierwsza późniejsza zmiana użytkownika jest zapisywana normalnie. Duży klucz zmian obejmujący profile Kreatora i plan tygodnia jest memoizowany, więc nie jest ponownie serializowany przy każdym renderze aplikacji.

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
- sześciocyfrowa weryfikacja emaila wymagana przed AI, z kodem przechowywanym wyłącznie jako hash,
- token sesji mobile w OS SecureStore/Keychain z migracją legacy AsyncStorage,
- współdzielone limity rejestracji i AI per IP/użytkownik w Database provider,
- usunięcie konta z ponownym potwierdzeniem aktualnym hasłem i limitem prób,
- produkcyjne limity rozmiaru requestów/kolekcji oraz allowlista CORS i nagłówki bezpieczeństwa,
- zmiana hasła,
- lista aktywnych sesji,
- wylogowanie pojedynczej sesji,
- wylogowanie wszystkich sesji,
- unieważnianie innych sesji po zmianie hasła,
- unieważnianie wszystkich sesji po resecie hasła.

Mobile używa typowanego `src/api/authApi.ts` dla logowania, rejestracji,
weryfikacji emaila, resetu/zmiany hasła i aktywnych sesji. Klient waliduje
odpowiedzi przed aktualizacją UI. Akcja wylogowania wszystkich urządzeń czyści
lokalną sesję dopiero po potwierdzonym sukcesie API.

Odtworzenie zapisanej sesji korzysta z walidowanego `authApi.getCurrentUser`, a
best-effort wylogowanie bieżącego urządzenia z `authApi.logout`. `App.tsx` nie
interpretuje już surowej odpowiedzi `/api/auth/me` ani nie wykonuje requestu
logout bezpośrednio.

Pełny cykl startowego odtworzenia znajduje się w
`src/features/auth/authSession.ts`: moduł migruje legacy token do SecureStore,
odrzuca cache bez poprawnego ID/emaila, korzysta z cache podczas awarii sieci i
usuwa zarówno token, jak i metadata sesji po `401/403` albo wadliwej odpowiedzi
`/auth/me`.

Efekt montowania i stan gotowości odtworzenia obsługuje
`src/features/auth/useStoredAuthRestoration.ts`. Kontroler wykonuje ten cykl
jednorazowo, nie publikuje wyniku po odmontowaniu i dopiero po zakończeniu
otwiera pierwszą synchronizację account-scoped danych. `App.tsx` przekazuje mu
typowany odczyt `/auth/me` oraz setter nadrzędnej sesji.

Ten sam moduł zapisuje sesję po logowaniu/rejestracji, aktualizuje cache po
zmianie avatara lub weryfikacji emaila i czyści AsyncStorage razem z SecureStore
po logout albo usunięciu konta. `App.tsx` nie zna już fizycznego klucza lokalnej
sesji.

Mutacje profilu korzystają z `src/api/profileApi.ts`. Moduł obsługuje upload i
usunięcie avatara oraz zdalny krok usunięcia konta; picker, prywatny cache pliku
i czyszczenie account-scoped danych po sukcesie pozostają poza transportem HTTP.

Cykl życia prywatnego cache avatara jest wydzielony do
`src/features/profile/useCachedAvatar.ts`. Hook wybiera istniejący plik,
odświeża go po zmianie `avatarUpdatedAt`, nie zapisuje cache na webie, czyści go
po usunięciu avatara i udostępnia wspólny stan błędu obrazu dla nagłówka oraz
profilu. Na Androidzie i iOS chroniony obraz jest pobierany z nagłówkiem bearer
bezpośrednio do pliku przez natywny downloader Expo, a następnie normalizowany
do lokalnego JPEG. Omija to zawodny most `Response.arrayBuffer()` dla danych
binarnych i nie uruchamia równoległego żądania komponentu `Image`, które na
Androidzie gubiło nagłówek autoryzacji. `App.tsx` nie zarządza już osobnym
efektem pobierania avatara.

Transport Kreatora AI korzysta z `src/api/workoutCreatorApi.ts`. Moduł uruchamia
plan/rewrite, koduje identyfikator joba i normalizuje statusy
`queued/processing/completed/failed`. Lokalny pending job jest walidowany przez
`src/domain/workoutCreatorJob.ts` i utrzymywany per konto przez
`useAccountScopedCreatorJob`. Polling, saldo kredytów, import treningu oraz
nawigacja pozostają koordynowane przez `App.tsx`.

Import wyniku AI znajduje się w `src/domain/workoutCreatorImport.ts`. Obsługuje
tablice bezpośrednie, wrappery `result/workouts`, JSON osadzony w Markdown,
polskie i angielskie nazwy pól, mapowanie ćwiczeń do katalogu, odpoczynek oraz
wariant rozgrzewki gotowej, przycisku potwierdzenia albo bez rozgrzewki.

Transport kredytów AI korzysta z `src/api/aiCreditsApi.ts`. Klient pobiera i
normalizuje saldo, historię oraz pakiety, waliduje odpowiedź weryfikacji zakupu
Google Play i obsługuje endpoint deweloperskiego zasilenia. `App.tsx` zachowuje
koordynację natywnego billing UI, lokalnych komunikatów i reakcji na wygaśnięcie
sesji.

Avatar uzytkownika jest obslugiwany w Profilu. Zalogowany uzytkownik moze
zmienic albo usunac avatar. Mobile wysyla obraz przez `multipart/form-data`,
produkcyjny Database provider zapisuje bajty i metadane w bazie, a File provider
pozostaje lokalnym fallbackiem. `GET /api/auth/me`
zwraca `avatarUrl` i `avatarUpdatedAt`. Header aplikacji pokazuje avatar, jesli
jest ustawiony; anonymous user widzi domyslna ikone. W natywnej aplikacji avatar
jest pobierany z bearer tokenem do prywatnego cache per konto. Kopia pobierana
oraz nowe obrazy przed uploadem sa ograniczane do 1024 px na dluzszym boku, aby
zdjecia z aparatu o bardzo duzej rozdzielczosci nie powodowaly bledu renderowania
lub nadmiernego zuzycia pamieci na Androidzie.

Profil obsluguje tez trwale usuniecie konta. Opcja `Usun konto` znajduje sie w
sekcji Konto nad `Wyloguj` i wymaga mocnego potwierdzenia przez wpisanie `USUŃ`
albo `DELETE`. Backend udostepnia `DELETE /api/account`, usuwa konto, sesje,
avatar oraz prywatne dane usera. Mobile po sukcesie czysci tylko lokalny
namespace usuwanego konta, bez kasowania danych anonymous ani innych kont na
urzadzeniu.

Brakuje jeszcze:

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

Panel treningów na stronie głównej pokazuje bez limitu wyłącznie unikalne,
niezarchiwizowane treningi przypisane do aktywnego planu tygodnia. Nie ma już
osobnej akcji `Zobacz wszystkie`; pełna biblioteka pozostaje na ekranie
`Treningi`.

Panel logowania można zamknąć. Decyzja jest zapamiętywana. Jeżeli panel jest widoczny dla niezalogowanego użytkownika, ikona profilu w headerze jest ukryta.

### Treningi

Użytkownik może:

- tworzyć trening ręcznie,
- edytować trening,
- eksportować definicję wybranego treningu do CSV albo XLSX bez backendu i bez internetu,
- usuwać trening,
- przeglądać trening read-only,
- wyszukiwać treningi,
- sortować listę treningów.
- archiwizować i odarchiwizowywać treningi bez usuwania ich danych.

Treningi archiwalne są domyślnie ukryte na liście. Filtr `Pokaż archiwalne`
dołącza je do aktualnych wyników wyszukiwania i oznacza badge'em. Archiwizacja
zachowuje definicję, historię oraz przypisania planu tygodnia, ale wyklucza
trening z homepage, podsumowania tygodnia i selektora planu. Po
odarchiwizowaniu zachowane przypisania ponownie zaczynają obowiązywać. Pole
`archivedAt` jest local-first i synchronizuje się razem z definicją treningu.

Eksport jest dostępny na ekranie szczegółów między akcjami `Edytuj` i `Usuń`.
CSV używa UTF-8 BOM oraz separatora `;`, dzięki czemu zachowuje polskie znaki i
jest zgodny z polskim Excelem. CSV i XLSX zawierają tę samą prostą tabelę:
etap, typ, ćwiczenie, serie, powtórzenia/cel, ciężar, uwagi i przerwę.
XLSX ma tylko jeden arkusz `Trening/Workout`, a nazwa pliku odpowiada
oczyszczonej nazwie treningu bez prefiksu i daty. Oba formaty obejmują wyłącznie definicję wybranego
treningu (etapy, serie, elementy, cele i uwagi), bez historii wykonań, sesji,
osiągnięć i danych konta. Android zapisuje plik bez selektora bezpośrednio w
publicznej kolekcji `Pobrane/Gymmin` przez MediaStore, bez panelu udostępniania
i bez szerokiego dostępu do pamięci. Na Androidzie 13+ aplikacja prosi przed
zapisem o zgodę na powiadomienia. Po zakończeniu wyświetla systemową notyfikację
z akcją `Otwórz`, która przekazuje lokalny URI pliku do zgodnej aplikacji.
CSV jest zapisywany jako jawne bajty UTF-8 z pojedynczym BOM, a XLSX jako dokładne
bajty binarne, żeby nie uszkodzić skoroszytu. Funkcja działa dla konta i
użytkownika anonimowego.

Sortowanie treningów:

- domyślnie: data stworzenia, malejąco, czyli najnowsze na górze,
- opcje sortowania: data stworzenia albo alfabetycznie,
- kierunek: rosnąco albo malejąco,
- stan sortowania jest zapisywany lokalnie razem z listą treningów,
- sortowanie działa na ekranie `Treningi` i dla aktywnych treningów na homepage.

### Model treningu

Seria zawierająca dokładnie dwa prawidłowe ćwiczenia jest oznaczana w
edytorze jako planowana superseria. Wykorzystuje istniejącą strukturę
etap/seria/element, więc `WorkoutDraft` i jego format synchronizacji nie
otrzymują dodatkowego pola.

Ręczne tworzenie i edycja treningu korzystają z kreatora `Dane -> Etapy -> Zapis`.
Krok `Etapy` pokazuje poziome zakładki etapów i tylko jeden kontekst edycji:
aktywny etap, jedną serię albo jedno ćwiczenie. Pełna hierarchia nie jest już
renderowana jako zagnieżdżone formularze w jednym scrollu. Podsumowanie i
walidacja są liczone przez czyste helpery `workoutBuilderFlow.ts`. Definicja
`WorkoutStep` ma opcjonalne `restSeconds`, które synchronizuje się razem z
pozostałymi polami ćwiczenia.

Lista `Serie w etapie` nie pokazuje już samej liczby elementów. Każdy wiersz
wypisuje nazwy zawartych ćwiczeń i ich parametry `serie×cel`, spójnie z szybkim
podglądem. W serii wieloelementowej ćwiczenia są ułożone pionowo. Prosta
rozgrzewka potwierdzana przyciskiem nie pokazuje sztucznego `1×-`.

Aktualny model:

- trening ma nazwę i uwagi,
- trening ma wiele etapów,
- etap ma nazwę, typ, uwagi i wiele serii,
- seria ma liczbę serii,
- seria ma wiele elementów,
- element ma typ, ćwiczenie, typ celu, cel, ciężar, przerwę między seriami i uwagi.

Przerwę ustawia się w formularzu `Edytuj ćwiczenie` jako godziny, minuty i
sekundy. Nie jest już dodawana jako osobny element serii. Import planu z
Kreatora AI mapuje `restSeconds` bezpośrednio na ćwiczenie. Przy odczycie starsze
poprawne elementy `Odpoczynek` są automatycznie przenoszone na poprzedzające
ćwiczenie w tej samej serii; osierocone lub uszkodzone elementy są zachowywane,
aby migracja nie usuwała danych. Zmigrowana definicja jest od razu zapisywana
lokalnie. Jeżeli stary trening został dopiero pobrany z konta, mobile odsyła jego
nową postać do backendu jeszcze w tym samym cyklu synchronizacji. Podczas
uruchamiania treningu przerwa tworzy
wyłącznie techniczny wpis sesji dla istniejącego timera, nie osobny element
definicji treningu. Element typu `Rozgrzewka` nadal ukrywa pole ćwiczenia. Pole
ćwiczenia jest dostępne dopiero po wybraniu typu. Liczba serii jest ograniczona
do 20.

Synchronizacja zachowuje też przejściowy element `*-rest-compat` obok
`restSeconds`. Dzięki temu backend uruchomiony jeszcze na kontrakcie sprzed
`restSeconds` nie zgubi wartości: zachowa element odpoczynku, a aktualny backend
scala go z poprzedzającym ćwiczeniem i nie zapisuje duplikatu. Jeżeli wartość
została już utracona w definicji treningu, mobile próbuje odzyskać ją z
`WorkoutSession.planSnapshot`, a następnie z technicznego wpisu odpoczynku
zapisanej sesji. Odzyskane dane są utrwalane lokalnie i ponownie synchronizowane.
Plany bez historii sesji mogą zostać naprawione z zachowanego wyniku Kreatora AI
przez kontrolowane narzędzie serwisowe, które wymaga jednoznacznego dopasowania
i wykonuje kopię danych przed zapisem. Backend odróżnia brak pola w starszym
kliencie od jawnego `"0"` wysyłanego przez aktualną aplikację, więc starszy
payload nie usuwa odzyskanego czasu, a świadome wyzerowanie nadal działa.

### Katalog ćwiczeń

Font Ionicons jest ładowany lokalnie podczas istniejącego splash screena.
Aplikacja odsłania interfejs dopiero po zakończeniu preloadu, dzięki czemu małe
ikony akcji (np. plus, chevron lub kosz) nie pojawiają się z opóźnieniem po
wyrenderowaniu panelu. Ładowanie odbywa się równolegle z minimalnym czasem
ekranu startowego i nie wymaga sieci.

Ćwiczenia pochodzą z lokalnego katalogu Garmin-compatible. Katalog zawiera:

- stabilne `exerciseId`,
- nazwę EN,
- nazwę PL,
- kategorię Garmin,
- sprzęt,
- wpływ na mięśnie,
- metadane używane przez przegląd mięśni i progres.

Po kontrolnej fazie refaktoru katalog zawiera 964 rekordy. Ryzykowne scalenie `Dead-hang Biceps Curl` zostało cofnięte, a nieudowodniony alias `stage2-back-extension` usunięty. Stare identyfikatory zatwierdzonych scaleń są rozwiązywane centralnie przy odczycie planów, sesji, progresu, ulubionych, treści technicznych i obrazów. Rekordy mają `libraryTier`: `main`, `advanced`, `sportSpecific`, `rehab`, `variation`, `progression` albo `deprecated`; domyślny picker pokazuje wyłącznie poziom `main`.

Walidacja `npm run exercise:catalog:validate` sprawdza unikalność ID i nazw, kategorie, sprzęt, aliasy, mapping ID oraz poziomy biblioteki. Pełny raport zmian: `docs/exercise-catalog-refactor.md`.

Media ćwiczeń wspierają opcjonalne lokalne MP4. Jeżeli animacja jest
zarejestrowana dla ćwiczenia, ekran szczegółów odtwarza ją automatycznie, bez
dźwięku i kontrolek, w nieskończonej pętli. Dotychczasowe obrazy start/end
pozostają w paczce i są używane jako fallback przy błędzie odtwarzania. Pierwszym
wdrożonym przykładem jest `squat-barbell-front-squat-1253`.

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

Panel `Przegląd` pokazuje sylwetkę przód/tył i koloruje mięśnie zależnie od ćwiczeń użytych w treningu. Działa w podglądzie read-only. Kreator edycji korzysta zamiast niego z lekkiego, tekstowego szybkiego podglądu aktywnego etapu lub serii, aby nie renderować ciężkiej prezentacji podczas wprowadzania danych.

### Wykonywanie treningu

Dostępne tryby:

- `guided` / Krok po kroku,
- `readonly-post-workout` / Tylko podgląd, uzupełnię po treningu,
- `inline-table` / Tabela do uzupełniania na bieżąco.
- Workout tables follow the current device orientation. The manual orientation
  control and its Settings row were removed; with system auto-rotate enabled,
  the screen rotates natively and tables adapt to the available width.

Sesja wykonania jest osobnym obiektem od planu treningowego. Plan nie jest nadpisywany wynikami. Sesja zapisuje snapshot treningu i entries do wykonania.

Sesje:

- działają offline,
- są zapisywane w account-scoped AsyncStorage,
- synchronizują się z kontem po zalogowaniu,
- mogą mieć status `active`, `completed`, `abandoned`,
- mogą być kontynuowane po restarcie aplikacji.

Tryb `guided` obsługuje tymczasowe superserie na poziomie aktywnej sesji:

- MVP łączy dokładnie dwa sąsiadujące ćwiczenia i nie zmienia definicji treningu,
- połączony krok pokazuje zakres, np. `Ćwiczenia 2–3/8`, oba opisy ćwiczeń i wspólną tabelę rund,
- liczba rund jest większą z liczb serii ćwiczenia A/B; brakująca strona ostatniej rundy jest nieaktywna,
- pola poprzedniego ciężaru i powtórzeń pozostają dostępne osobno dla ćwiczenia A i B,
- wyniki są nadal zapisywane do oryginalnych `entries`, dlatego historia, progres i achievements działają bez osobnego modelu wyników,
- Wstecz/Dalej traktuje superserię jako jeden krok i pomija drugi element,
- rozłączenie usuwa wyłącznie powiązanie i zachowuje wyniki,
- `supersets` jest normalizowane przy odczycie, zapisuje się w account-scoped AsyncStorage i synchronizuje w pełnym `SessionJson`.

### Historia i progres

W trybie guided nowa sesja automatycznie tworzy `WorkoutSession.supersets` dla
każdej zapisanej serii zawierającej dokładnie dwa prawidłowe ćwiczenia. Dzięki
temu para od razu otwiera wspólny ekran A/B. Rozłączenie usuwa powiązanie tylko
z bieżącej sesji i zachowuje wyniki; zapisany plan pozostaje bez zmian i utworzy
superserię ponownie podczas kolejnego wykonania. Pozostałe tryby wykonania nie
inicjalizują planowanych superserii.

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
Wiersze ćwiczeń pokazują pod opisem taki sam pasek parametrów jak tryb guided:
etykietę i kafelek odpoczynku oraz kompaktowe kafelki celu, np.
`Odpoczynek [2m 30s]` i `[3] x [8]`. Brak czasu jest prezentowany jako `-`.
Ikona `body-outline` w wierszu ćwiczenia otwiera stronę szczegółów ćwiczenia,
tak samo jak tapnięcie wiersza.

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

Kreator dodaje rozgrzewkę zależnie od odpowiedzi użytkownika. Przerwa między
seriami jest normalizowana do `restSeconds` konkretnego ćwiczenia; starsze osobne
elementy odpoczynku są migrowane do tego pola i nie pozostają ćwiczeniami na liście.

### Modyfikowanie treningu z AI

Transport, joby i ekrany modyfikowania treningu przez endpoint rewrite pozostają
zaimplementowane, ale wejście `Modyfikuj z AI` jest celowo ukryte w aktualnym
wydaniu produkcyjnym. Użytkownik nie może rozpocząć nowej modyfikacji z podglądu
treningu; wznowienie już zapisanego joba nadal pozostaje bezpieczne.

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
- Google Play purchase validation po stronie backendu dla aktualnych paczek `ai_tokens_1`, `ai_tokens_3`, `ai_tokens_10` odpowiadajacych 1/3/10 kredytom,
- uwierzytelniony RTDN/Pub/Sub push z kontrolą OIDC audience, konta usługi, package name i idempotencją `messageId`,
- techniczny inbox `GooglePlayRtdnEvents`, który przechowuje wyłącznie hash purchase tokena,
- tabela `AiCreditPurchases` z hashem purchase tokena, statusem przetwarzania i powiazaniem do ledger transaction,
- endpoint `POST /api/ai-credits/purchases/google-play/verify`,
- cykliczne uzgadnianie refundow i chargebackow przez Voided Purchases API z trwalym checkpointem, idempotentnym clawbackiem i kolejka manualnej obslugi,
- `obfuscatedAccountId` w mobilnym Billing flow oraz backendowa kontrola przypisania zakupu do konta, gdy Google zwraca ten identyfikator,
- idempotentne naliczanie zakupow: ponowne wyslanie tego samego purchase tokena nie dodaje tokenow drugi raz,
- server-side consume po poprawnym naliczeniu zakupu,
- natywne zaleznosci mobile `react-native-iap` i `react-native-nitro-modules` oraz Android permission `com.android.vending.BILLING`,
- Android debug APK build smoke przechodzi z natywnym Google Play Billing stackiem,
- release AAB build smoke przechodzi przez skrypt `mobile:store:aab`, ktory buduje z krotkiej sciezki roboczej dla Windows/CMake,
- po aktualizacji Expo 57 potwierdzono `expo-doctor` 19/19, eksport Hermes dla Androida, debug APK oraz czysty `bundleRelease` dla `arm64-v8a`,
- release Android blokuje nieszyfrowany ruch HTTP także na poziomie natywnego
  Network Security Config; osobny wyjątek istnieje wyłącznie w wariantach
  debug dla lokalnego backendu,
- prywatne pliki, bazy i preferencje aplikacji są wyłączone z Android Auto
  Backup oraz transferu urządzenie-urządzenie; dane konta są odtwarzane przez
  kontrolowaną synchronizację Gymmin,
- skrypt `mobile:security:android` i production gate wykrywają regresję tych
  ustawień, a CI sprawdza również scalony manifest release,
- finalny manifest release ma automatyczną allowlistę eksportowanych komponentów:
  launcher aplikacji oraz odbiornik AndroidX Profile Installer chroniony
  uprawnieniem systemowym; niejawny `android:exported`, nowy wystawiony komponent,
  `debuggable`/`testOnly` albo uprawnienie z listy wysokiego ryzyka przerywa CI,
- uprawnienie aparatu zostało usunięte z release, ponieważ aktualny wybór avatara
  korzysta wyłącznie z biblioteki multimediów,
- powiadomienia są lokalne: release zachowuje nieeksportowany receiver Expo i
  akcje boot potrzebne do odtwarzania przypomnień, ale usuwa serwisy FCM,
  Firebase Instance ID receiver oraz uprawnienie odbioru C2DM,
- aplikacja nie zarządza licznikami badge na ikonie, dlatego release usuwa 16
  legacy uprawnień launcherów OEM dostarczanych tranzytywnie przez bibliotekę
  powiadomień; CI blokuje ich przypadkowy powrót,
- widoczność pakietów Androida (`<queries>`) ma ścisłą allowlistę: HTTPS,
  wybór obrazu `image/*`, picker katalogu Downloads dla starszych urządzeń oraz
  dwa bindingi Google Play Billing; nieużywane zapytania aparatu/wideo i szeroki
  selektor `*/*` zostały usunięte,
- build smoke wymaga Android SDK (`ANDROID_HOME` / `ANDROID_SDK_ROOT`); bez podlaczonego emulatora lub telefonu potwierdza linkowanie natywne, ale nie runtime UI,
- widok mobile `Kredyty` z saldem, kosztami, kompaktowymi kartami pakietow, ostatnimi transakcjami, informacjami i akcja zakupu/restore pending purchases,
- dev/test grant poza Production.

File provider nadal dziala jako dev fallback, ale produkcyjna sciezka dla kredytow to Database/PostgreSQL. Realne testy zakupow nie sa jeszcze zakonczone: wymagaja aplikacji w Play Console, aktywnych produktow, license testers, skonfigurowanego service account i instalacji builda z Internal Testing.

Dogrywka 12A.1: AiCredits concurrency, idempotency i refund zostaly sprawdzone na realnym lokalnym PostgreSQL bez Dockera. Migracja `HardenAiCreditsConcurrency` przeszla, `GET /api/health` potwierdzil `Database/PostgreSQL`, rownolegle requesty przy saldzie `1` zakonczyly sie jako jeden zaakceptowany job i jeden `402`, idempotency key nie pobral drugiego tokena, a techniczny failure joba utworzyl pojedynczy `Refund`.

### Artykuły

Artykuły są lokalne. Widok artykułu ma datę publikacji, czas czytania, nagłówki, akapity i czytelne karty planu tygodniowego zamiast szerokiej tabeli.
Model artykulu obsluguje `translations` per jezyk oraz `defaultLanguage`. Lista i szczegoly artykulu wybieraja wersje zgodna z jezykiem aplikacji, a jesli jej brakuje, wracaja do jezyka domyslnego albo pierwszej dostepnej wersji. Artykuly o tworzeniu planu, skutecznej progresji, doborze serii i powtorzen oraz doborze ciezaru i intensywnosci maja warianty PL i EN. Renderer obsluguje naglowki, listy i responsywne tabele wielokolumnowe.

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
- widoczność timera odpoczynku,
- lokalne przypomnienia treningowe,
- ulubione ćwiczenia,
- zwijanie paneli i zapis ich stanu.

Cały model `AppSettings` jest local-first i account-scoped. Po zalogowaniu
język, motyw, domyślna liczba serii, domyślny ciężar, domyślny typ etapu,
domyślny tryb wykonywania, widoczność timera odpoczynku, stan zwiniętych paneli,
stan ukrycia panelu logowania oraz konfiguracja przypomnień synchronizują się
przez `GET/PUT /api/settings`. Na innym urządzeniu zostają odtworzone po
pierwszej synchronizacji konta. Lokalne identyfikatory już zaplanowanych
powiadomień nie są synchronizowane, ponieważ należą do konkretnego urządzenia.

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

Regulamin ma układ dashboardowy: hero z najważniejszymi zasadami, sekcję „W skrócie”, callout do zgłaszania błędów oraz siedem szczegółowych sekcji rozwijanych lokalnie przez użytkownika.

Homepage pokazuje kompaktowy panel aktywnego planu tygodnia. Plan jest local-first i account-scoped: użytkownik przypisuje zapisane treningi do dni tygodnia, a ukończone `WorkoutSession` są liczone od poniedziałku do niedzieli niezależnie od dnia faktycznego wykonania. Po zalogowaniu przypisania i aktywność planu synchronizują się przez `/api/settings` oraz odtwarzają na innych urządzeniach. Konflikty planu są rozstrzygane osobno na podstawie jego `updatedAt`, więc zmiana innej preferencji konta nie nadpisuje nowszego planu.

Cykl lokalny planu obsługuje `useAccountScopedWeeklyPlan`: hook śledzi ownera,
blokuje zapis do niewłaściwego klucza i zeruje poprzedni plan natychmiast przy
zmianie konta, zanim zakończy się odczyt danych nowego użytkownika. Odczyt czeka
na migrację account-scoped storage, a plan anonimowy jest scalany z planem konta
po zaakceptowaniu dialogu łączenia danych.

Kontakt ma zwarty układ: główny CTA otwiera klienta poczty dla `kontakt@gymmin.app`, informacja o czasie odpowiedzi jest krótkim paskiem, a problemy z aplikacją prowadzą do istniejącego formularza „Zgłoś błąd”. FAQ zawiera trzy zwijane odpowiedzi, dzięki czemu ekran nie powtarza długich bloków tekstu.

Zgłoszenie błędu idzie do backendu przez `POST /api/bug-reports` za pośrednictwem `src/api/bugReportsApi.ts`. Aplikacja dołącza informacje o urządzeniu, systemie, języku i ekranie, bearer token oraz stabilny dla retry `X-Idempotency-Key`; klient waliduje ID utworzonego raportu i wspólną diagnostykę błędu. Backend zapisuje raport przed dostarczeniem maila; trwały worker SMTP używa lease, retry i backoff. Request ma limit 64 KiB oraz domyślnie 10 zgłoszeń na użytkownika/IP na godzinę. `GET /api/bug-reports/{id}` zwraca status z kontrolą właściciela. Usunięcie konta usuwa powiązanie i identyfikatory z zagnieżdżonej diagnostyki. Opcjonalne endpointy admina obsługują status, odpowiedź i pojedynczą niezmienną nagrodę; klucz jest weryfikowany po SHA256, próby są limitowane per IP, a operacje zapisują `AdminAuditEvents`. Osobnym etapem pozostaje graficzny panel.

Snapshot platformy dla raportu oraz nazwa urządzenia wysyłana w nagłówkach auth
są budowane przez `src/platform/deviceInfo.ts`. Adapter zbiera wyłącznie znane
pola React Native/Expo, pomija puste wartości i ogranicza nazwę sesji do 120
znaków.

### Diagnostyka i monitoring

Readiness rozroznia dzialajacy proces od gotowej aplikacji: kontroluje polaczenie
z baza oraz brak oczekujacych migracji EF. Production domyslnie odmawia startu na
nieaktualnym schemacie. Odpowiedzi `/api` domyslnie blokuja cache HTTP; endpointy
z kontrolowanym prywatnym cache i ETag zachowuja `private`. Backend nie ujawnia
naglowka wersji serwera Kestrel.

Etap 9A dodaje lekki fundament diagnostyki bez zewnętrznego SaaS:

- backend dodaje `X-Correlation-Id` do każdej odpowiedzi i akceptuje ten sam header z requestu,
- correlation id trafia do scope logów backendu,
- backend loguje request method/path/status/elapsedMs oraz userId, jeśli jest znany,
- nieoczekiwane wyjątki wracają jako bezpieczny JSON `internal_error` z `correlationId`, bez stack trace w odpowiedzi,
- rate limit auth zwraca spójny błąd `rate_limited`,
- mobile wysyła `X-Correlation-Id` na requestach API i przechowuje ostatnie correlation ids,
- mobile ma lekki ring buffer ostatnich zdarzeń diagnostycznych,
- bug report dołącza kontekst: wersję, platformę, ekran, język, ostatnie correlation ids, ostatni API error i ostatnie zdarzenia diagnostyczne; nie zapisuje ownera storage ani identyfikatora konta w diagnostyce.

`GET /api/diagnostics` jest dostępny tylko w development/testing; produkcja odmawia startu z włączoną diagnostyką. `/health/live` sprawdza proces, `/health/ready` dostępność bazy, a produkcja emituje strukturalne logi JSON.

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
- profili kreatora (local-first cache; po zalogowaniu synchronizowanych przez `/api/settings`),
- planu tygodniowego (local-first cache; po zalogowaniu synchronizowanego przez `/api/settings`),
- aktywnego joba kreatora,
- notification IDs przypomnień.

Zmiana konta nie wykonuje silent merge danych poprzedniego konta. Po loginie, jeśli istnieją dane anonymous, aplikacja pokazuje dialog:

- Połącz,
- Nie teraz,
- Usuń dane lokalne.

## Backend - aktualne endpointy

- `GET /health`
- `GET /health/live`
- `GET /health/ready`
- `GET /api/health`
- `GET /api/diagnostics` tylko development/testing
- `GET /api/system/status`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/auth/sessions`
- `DELETE /api/auth/sessions/{sessionId}`
- `POST /api/auth/logout-all`
- `POST /api/auth/change-password`
- `POST /api/auth/password-reset/request`
- `POST /api/auth/password-reset/confirm`
- `POST /api/auth/email-verification/request`
- `POST /api/auth/email-verification/confirm`
- `DELETE /api/account`
- `GET|POST|DELETE /api/profile/avatar`
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
- `GET /api/achievements`
- `POST /api/sync/achievements`
- `GET /api/ai-credits/balance`
- `GET /api/ai-credits/transactions`
- `GET /api/ai-credits/packs`
- `GET /api/ai-credits/purchases`
- `POST /api/ai-credits/purchases/google-play/verify`
- `POST /api/integrations/google-play/rtdn`
- `POST /api/workout-creator/plan`
- `POST /api/workout-creator/rewrite`
- `GET /api/workout-creator/plan/{jobId}`
- `GET /api/workout-creator/jobs/{jobId}`
- `POST /api/workouts/{clientWorkoutId}/garmin-sync`
- `POST /api/bug-reports`
- `GET /api/bug-reports/{reportId}`
- `GET /api/admin/bug-reports` (opcjonalne, wymaga klucza admina)
- `PUT /api/admin/bug-reports/{reportId}` (opcjonalne, audytowane)

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
- bug reports: zapis w bazie i pliku, idempotency, rate/size limits, owner-scoped status, trwały SMTP retry, anonimizacja diagnostyki po usunięciu konta i walidacja payloadu,
- produkcyjne zabezpieczenia requestów, account deletion z hasłem, email verification i współdzielone limity nadużyć,
- RTDN: uwierzytelnienie, package validation, idempotentny inbox i brak jawnego purchase tokena,
- admin bug reports: hashowany klucz, niezmienna nagroda i audit event.

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
- workout session supersets: tworzenie, walidacja sąsiedztwa/overlap, normalizacja po wznowieniu, rundy A/B, zachowanie wyników i nawigacja grupowa,
- active workout UI helpers for elapsed time, exercise progress percentage and rest-duration formatting,
- Progress screen dashboard: top summary cards, all/strength/volume filters, compact exercise metric cards and optional local SVG sparkline; per-exercise history groups all sets from one completed session into collapsible cards with compact rows and range filters,
- workout reminders pure scheduling rules,
- app diagnostics ring buffer i sanitization.
- account data API routes, JSON payloads, idempotent delete i wspólną diagnostykę błędów.

Mobile ma także typecheck:

```powershell
npm --prefix apps/mobile run typecheck
```

Brakuje jeszcze mobile UI tests i E2E. File provider pozostaje fallbackiem dev; jego trwałość, deduplikację i atomową podmianę pliku pokrywa dedykowany test backendu.

## Co jest częściowe

- Konflikty multi-device mają prostą logikę `updatedAt` / `deletedAt`, ale brakuje dopracowanego UX konfliktów.
- Backend przechowuje `WorkoutSession`, ale progres jest liczony lokalnie, nie backendowo.
- Powiadomienia treningowe są lokalne i best-effort; backend nie wysyła powiadomień ani nie ma schedulera.
- Garmin sync jest placeholderem i pozostaje poza aktualnym zakresem prac.
- AI import/rewrite może zostawić ćwiczenie bez `exerciseId`, jeśli best-effort mapowanie do katalogu się nie powiedzie. Nie tworzy to custom exercise, ale przed releasem warto wymusić review/replacement albo mocniej pokazać ten fallback w UI.
- Artykuły są lokalne, bez CMS.
- Potwierdzanie emaila działa dla nowych kont przed użyciem AI; nie ma jeszcze OAuth/social login ani 2FA.
- Testy backend API pokrywają krytyczne ścieżki, mobile ma unit tests helperów, ale brakuje pełnych testów mobile UI/E2E oraz osobnego smoke suite dla File provider.

## Najbliższe logiczne kroki

Aktualny tor produkcyjny dla backendu: PostgreSQL provider, jawne migracje i deployment checklist są opisane w `docs/deployment.md`.

Pełny audyt z 2026-07-16 jest w `docs/production-audit-2026-07-16.md`.
Wykryte w nim blokery legacy auth, trwałości avatarów i konkurencji jobów AI są
zamknięte w kodzie. Przed publicznym wydaniem pozostają wdrożeniowe smoke testy
na docelowym PostgreSQL, kilku replikach i fizycznym urządzeniu.

Audyt strukturalny i wykonane wydzielenia klienta API, repozytoriów local-first,
kontrolerów, logiki sesji/buildera, skompresowanego katalogu technik oraz
backendowych endpointów systemowych opisuje
`docs/structural-refactor-2026-07-16.md`.

Backendowy `Program.cs` jest obecnie composition root; endpointy biznesowe są
podzielone na moduły w `backend/Gymmin.Api/Endpoints`. Mobile oddziela czyste
kontrakty auth od natywnej persystencji SecureStore.

1. Rozszerzyć testy mobile o UI tests i krytyczne E2E.
2. Uruchomić produkcyjny PostgreSQL, backup poza hostem i okresowy test restore według `docs/deployment.md`.
3. Podłączyć gotowy strumień JSON logów i mobile crash reporting do wybranego providera.
4. Dopracować UX konfliktów synchronizacji i scenariusze multi-device.
5. OAuth/social login i 2FA zostają osobnymi przyszłymi etapami.
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

Aktualny, sprawdzony sposób przygotowania paczki na telefon:

```powershell
npm run mobile:github:apk:oneclick -- -ApiBaseUrl "https://your-backend-url.example.com"
```

Wrapper sprawdza backend `/health`, w razie potrzeby uruchamia lub podpina tunel,
buduje release APK dla `arm64-v8a`, zapisuje go jako
`.artifacts/Gymmin-arm64-v8a-release-latest.apk` i publikuje jako asset GitHub
Release w prywatnym repo:

```text
kicha93/gymmin-apk
release: v1.0
```

To jest jedyny preferowany one-click flow pobierania i instalacji APK na
Androidzie. Osobny wrapper budujący `x86_64` / universal APK dla emulatora został
wycofany; debug APK i niższe skrypty buildowe zostają wyłącznie jako narzędzia
developerskie.

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

## Security follow-up 2026-07-21

The follow-up audit is documented in `docs/security-audit-2026-07-21.md`.
Production `/api/health` no longer discloses infrastructure details, CI actions
are pinned to commit SHAs, the one-click published APK flow requires HTTPS, and
the dependency gate has no high or critical advisories. Ten moderate advisories
remain in Expo/Xcode build tooling; npm's proposed Expo 57 to 46 downgrade was
intentionally rejected.

## Security follow-up 2026-07-22

The current audit is documented in `docs/security-audit-2026-07-22.md`.
Bearer headers for avatars are now restricted to the configured API origin.
Login, password change, password reset and Google Play verification use
independent user/account and IP abuse buckets. External AI response bodies and
internal generator exceptions are no longer exposed through job status, AI
output size is bounded, completed AI jobs have a 90-day default retention, and
registration names are validated against the database limit. Automated checks
pass with no high or critical dependency advisory; ten moderate Expo/Xcode
build-tool advisories remain accepted and monitored.
