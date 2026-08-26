# Google Play — pozostałe kroki

Stan techniczny aplikacji i materiały sklepu są przygotowane. Ta lista obejmuje czynności, których nie da się wiarygodnie zakończyć wyłącznie w repozytorium.

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

Główne repozytorium pozostaje prywatne. Publiczne repozytorium Pages zawiera tylko dokumenty przeznaczone do publikacji.

## 3. Karta aplikacji

- [x] Wklejono polski opis z `docs/google-play/listing-pl.md` i zapisano wersję roboczą.
- [x] Wklejono angielski opis z `docs/google-play/listing-en.md` i zapisano wersję roboczą.
- [ ] Dodaj ikonę `docs/google-play/assets/app-icon-512.png`.
- [ ] Dodaj grafikę wyróżniającą `docs/google-play/assets/feature-graphic-1024x500.png`.
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
- [x] Uruchomiono pełne release gates oraz walidację Google Play dla bieżącego kandydata.
- [x] Zbudowano świeży, podpisany AAB skryptem produkcyjnym.
- [ ] Prześlij AAB najpierw do testu wewnętrznego albo zamkniętego.
- [ ] Wykonaj końcowy smoke test wersji pobranej przez Google Play.
- [ ] Dopiero potem utwórz wdrożenie produkcyjne.

Ostatni lokalnie zweryfikowany kandydat miał:

- package: `com.gymmin.app`,
- versionName: `1.0`,
- versionCode: `2`,
- AAB: `.artifacts/Gymmin-release-latest.aab`,
- rozmiar: `43 846 492 B` (`41,82 MiB`),
- SHA-256: `D06DF82AA54A273EEAD431B85D89BAD17B5060D75311AF50A5ED1B1163966C68`.

Plik w `.artifacts` jest lokalnym artefaktem roboczym i nie jest częścią repozytorium.

## 6. Kontrole przed publikacją

- [ ] Przejdź pozostałe scenariusze manualne z `docs/release-checklist.md` i zapisuj wyłącznie rzeczywiste wyniki z fizycznego urządzenia.
- [ ] Potwierdź działanie backupu i odtworzenia po restarcie.
- [ ] Potwierdź tworzenie i modyfikowanie treningu przez copy/paste z zewnętrznym AI.
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
- [x] Podpisany AAB oraz automatyczne gates przeszły lokalnie dla bieżącego kandydata.
