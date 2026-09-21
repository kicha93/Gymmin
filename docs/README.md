# Dokumentacja Gymmin

Ten indeks rozdziela dokumentację aktualnego produktu, procesów wydawniczych, danych generowanych i usuniętej architektury. Pliki poza `docs/archive/` opisują bieżący produkt, chyba że mają jawnie podaną datę historycznego pomiaru.

## Produkt i architektura

- [Stan aplikacji](application-status.md)
- [Architektura local-only](architecture.md)
- [UX treningów](workout-ux.md)
- [Kreator treningów](workout-creator.md)
- [Migracja do local-only](local-only-migration.md)
- [Osiągnięcia](achievements.md)

## Ćwiczenia i anatomia

- [Exercise Picker V2](exercise-picker-v2.md)
- [Media ćwiczeń](exercise-media.md)
- [Szablon promptu obrazów](exercise-image-prompt-template.md)
- [Polskie nazewnictwo ćwiczeń](polish-exercise-naming.md)
- [Advanced Muscle Mode](advanced-muscle-mode.md)
- [Tygodniowa objętość mięśni](weekly-muscle-volume.md)
- [Reprezentatywny audyt advanced muscles](reports/advanced-muscle-representative-audit.md)

## Build i wydanie

- [Android APK/AAB](build-android-apk.md)
- [Prywatny build iOS](build-ios-personal.md)
- [Release checklist](release-checklist.md)
- [Rejestr kandydatów wydania](releases/README.md)
- [Google Play — pozostałe kroki](google-play/remaining-steps.md)
- [Deklaracje Play Console](google-play/console-declarations.md)
- [Listing PL](google-play/listing-pl.md)
- [Listing EN](google-play/listing-en.md)
- [Plan screenshotów](google-play/screenshot-plan.md)

## Prywatność

- [Notatki implementacyjne](privacy-notes.md)
- `privacy/` — kanoniczne statyczne strony PL/EN oraz instrukcje usuwania danych

## Dane generowane

Pliki `exercise-summary.json`, `exercise-catalog-for-ai-enrichment.json`, `exercise-names-en.txt` i raporty JSON są artefaktami developerskimi wygenerowanymi z katalogu. Nie należy edytować ich ręcznie. Po zmianie katalogu trzeba uruchomić właściwy generator i walidatory.

## Archiwum

Usunięta architektura backendowa, stare audyty i historyczne decyzje znajdują się w [archive/README.md](archive/README.md). Nie są instrukcją uruchomienia aktualnej aplikacji.

## Konwencje utrzymania

- PL jest preferowany dla instrukcji operacyjnych właściciela projektu; EN może pozostać w dokumentach technicznych utrzymywanych wcześniej w tym języku.
- Każdy dokument ze stanem lub wynikiem wydania musi zawierać datę i, jeśli dotyczy artefaktu, commit/versionCode.
- Trwałe reguły produktu nie powinny zawierać hashy chwilowego RC ani sum starego artefaktu.
- Zmiana zachowania produktu wymaga aktualizacji odpowiadającej dokumentacji w tym samym commicie.
- Przed push należy uruchomić `npm run docs:validate`.
