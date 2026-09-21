# Rejestr kandydatów wydania

Ten katalog oddziela trwałą dokumentację produktu od chwilowych danych artefaktu. Każdy nowy kandydat powinien otrzymać osobny plik `YYYY-MM-DD-version-vc.md` utworzony przed manualnym smoke testem.

Wymagane pola:

- commit i stan working tree;
- `versionName`, `versionCode`, package ID;
- typ artefaktu i ścieżka/nazwa;
- rozmiar i SHA-256;
- wynik automatycznych gates;
- urządzenie, wersja systemu i wyniki manualnej macierzy;
- tor Play Console oraz data uploadu;
- znane odstępstwa i decyzja release/no-release.

## Historyczny kandydat 1.0 / versionCode 2

Lokalny artefakt opisany 2026-08-25:

- package: `com.gymmin.app`;
- versionName: `1.0`;
- versionCode: `2`;
- AAB: `.artifacts/Gymmin-release-latest.aab`;
- rozmiar: `43 846 492 B` (`41,82 MiB`);
- SHA-256: `D06DF82AA54A273EEAD431B85D89BAD17B5060D75311AF50A5ED1B1163966C68`;
- wersja została udostępniona w teście wewnętrznym Google Play.

To zapis historyczny. Po kolejnych zmianach kodu nie wolno traktować tej sumy ani artefaktu jako bieżącego kandydata.

## Bieżący stan

Po zmianach następujących po versionCode 2 nie przypisano jeszcze nowego kandydata. Następny upload do Play Console musi używać wyższego `versionCode`, świeżego AAB i nowego rekordu.
