# Google Play — pozostałe kroki

Status: 2026-09-21. Stan techniczny aplikacji i materiały sklepu są przygotowane. Ta lista obejmuje czynności, których nie da się wiarygodnie zakończyć wyłącznie w repozytorium. Status dotyczy bieżącego źródła; wcześniejsze wdrożenie `1.0` na tor wewnętrzny nie zastępuje świeżego AAB po kolejnych zmianach.

## 1. Dostęp do produkcji i test zamknięty

- [ ] Sprawdź w `Play Console → Panel` / `Produkcja`, czy konto ma już dostęp do publikacji produkcyjnej.
- [ ] Jeżeli Play Console wymaga testu zamkniętego dla tego konta, zbierz co najmniej 12 rzeczywistych testerów zapisanych przez 14 kolejnych dni.
- [ ] Po spełnieniu wymogu testowego złóż w Play Console wniosek o dostęp do produkcji.

Wymóg 12 testerów przez 14 dni jest warunkowy — rozstrzygający jest komunikat widoczny na tym konkretnym koncie Play Console. Nie należy próbować go obchodzić.

## 2. Publiczna polityka prywatności

- [x] Opublikowano wyłącznie statyczne dokumenty w publicznym repozytorium `kicha93/gymmin-privacy`.
- [x] Zweryfikowano odpowiedzi HTTPS `200` dla wariantów PL, EN oraz obu instrukcji usunięcia danych.
- [x] Wklejono publiczny URL polityki do Play Console.

Zweryfikowane adresy:

- PL: `https://kicha93.github.io/gymmin-privacy/`
- EN: `https://kicha93.github.io/gymmin-privacy/en/`
- usunięcie danych PL: `https://kicha93.github.io/gymmin-privacy/delete-data/`
- usunięcie danych EN: `https://kicha93.github.io/gymmin-privacy/en/delete-data/`

Główne repozytorium `kicha93/Gymmin` jest publiczne. Osobne repozytorium Pages nadal utrzymuje stabilne adresy polityki niezależnie od workflow aplikacji.

## 3. Karta aplikacji

- [x] Wklejono polski opis z `docs/google-play/listing-pl.md` i zapisano wersję roboczą.
- [x] Wklejono angielski opis z `docs/google-play/listing-en.md` i zapisano wersję roboczą.
- [x] Przygotowano ikonę `docs/google-play/assets/app-icon-512.png` w repozytorium.
- [x] Przygotowano grafikę wyróżniającą `docs/google-play/assets/feature-graphic-1024x500.png` w repozytorium.
- [ ] Potwierdź w Play Console, że bieżące wersje ikony i grafiki są przesłane.
- [ ] Wykonaj i dodaj zrzuty ekranu zgodnie z `docs/google-play/screenshot-plan.md`.
- [ ] Sprawdź podgląd karty aplikacji na telefonie przed wysłaniem do weryfikacji.

## 4. Deklaracje Play Console

Wypełnij je zgodnie z faktycznym zachowaniem wersji local-only i wskazówkami w `docs/google-play/console-declarations.md`:

- [x] Dostęp do aplikacji.
- [x] Reklamy.
- [x] Data Safety.
- [x] Aplikacje zdrowotne / funkcje zdrowotne.
- [x] Klasyfikacja treści IARC.
- [x] Grupa docelowa i treści.
- [x] Pozostałe deklaracje wyświetlane przez Play Console dla tego konta i typu aplikacji.

## 5. Wersja i artefakt

- [ ] Przed wysłaniem sprawdź najwyższy `versionCode`, jaki kiedykolwiek trafił do Play Console; nowy AAB musi mieć wartość większą.
- [x] Uruchomiono pełne release gates oraz walidację Google Play dla historycznego kandydata 1.0 / versionCode 2.
- [x] Zbudowano podpisany AAB historycznego kandydata 1.0 / versionCode 2.
- [x] Wersja 1.0 / versionCode 2 została wcześniej udostępniona w teście wewnętrznym.
- [ ] Po następnych zmianach zbuduj i prześlij świeży AAB z wyższym `versionCode`.
- [ ] Wykonaj końcowy smoke test wersji pobranej przez Google Play.
- [ ] Dopiero potem utwórz wdrożenie produkcyjne.

Historyczny kandydat 1.0 / versionCode 2 i zasady tworzenia kolejnego rekordu są opisane w [rejestrze kandydatów](../releases/README.md). Plik w `.artifacts` jest lokalnym artefaktem roboczym i nie jest częścią repozytorium.

## 6. Kontrole przed publikacją

- [ ] Przejdź pozostałe scenariusze manualne z `docs/release-checklist.md` i zapisuj wyłącznie rzeczywiste wyniki z fizycznego urządzenia.
- [ ] Potwierdź działanie backupu i odtworzenia po restarcie.
- [ ] Potwierdź tworzenie nowego treningu przez ręczny copy/paste z ChatGPT Deep Research. Gymmin nie uruchamia narzędzia ani API automatycznie. Modyfikowanie zapisanego treningu przez AI nie jest funkcją produktu.
- [ ] Potwierdź przypomnienia po restarcie telefonu.
- [ ] Potwierdź raport błędu przez klienta pocztowego i jego fallback kopiowania.
- [ ] Potwierdź pełne usunięcie danych lokalnych i stan fresh install po restarcie.
- [ ] Oceń przed publikacją ryzyko regulaminowe zewnętrznego, dobrowolnego linku Buy Me a Coffee; wsparcie nie może dawać funkcji ani korzyści w aplikacji.

## Ukończone w repozytorium

- [x] Architektura mobile-only i local-only.
- [x] Brak własnego backendu, kont, synchronizacji, kredytów i Billing.
- [x] Statyczne dokumenty polityki prywatności PL/EN opublikowane z publicznego repozytorium `kicha93/gymmin-privacy`.
- [x] Materiały i teksty karty Google Play PL/EN.
- [x] Walidator materiałów i podstawowych parametrów wydania: `npm run google-play:validate`.
- [x] Podpisany AAB oraz automatyczne gates przeszły lokalnie dla historycznego kandydata opisanego wyżej.
