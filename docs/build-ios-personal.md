# Prywatny build iOS na 7 dni

Komenda tworzy niepodpisany plik IPA na runnerze macOS w GitHub Actions. Nie wymaga płatnego Apple Developer Program ani podawania danych Apple w repozytorium.

```powershell
npm run mobile:ios:personal
```

Skrypt wykonuje lokalne kontrole, wysyła bieżący commit, uruchamia workflow `ios-unsigned.yml`, czeka na build, pobiera IPA na Windows i sprawdza brak `embedded.mobileprovision` oraz `_CodeSignature`. IPA pozostaje również jako GitHub Artifact przy wykonaniu workflow w publicznym repozytorium `kicha93/Gymmin`.

Niepodpisanego IPA nie można zainstalować bezpośrednio. AltStore, SideStore albo Sideloadly podpisuje je podczas instalacji darmowym Apple ID. Taki podpis jest ważny 7 dni i wymaga późniejszego odświeżenia aplikacji. Ograniczenie 7 dni pochodzi od Apple, a nie od Gymmin.

Pliki artefaktu:

- `Gymmin-<wersja>-build<numer>-unsigned.ipa`,
- suma SHA-256 wersjonowanej paczki.

Workflow nie posiada sekretów Apple, certyfikatów ani profili provisioning i nie może opublikować aplikacji w App Store.
