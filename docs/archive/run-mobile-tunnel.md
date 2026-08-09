# ARCHIVED — Expo/backend tunnel workflow (historical)

This workflow is obsolete in the local-only product.

Ten dokument zostaje tylko jako zapis historyczny. Gymmin nie używa już Expo Go jako podstawowego sposobu testowania aplikacji na telefonie.

Aktualny zalecany przepływ:

1. Uruchom backend i wystaw go publicznie, jeżeli testujesz poza lokalną siecią.
2. Zbuduj standalone Android APK.
3. Opublikuj APK do prywatnego GitHub Release.
4. Pobierz i zainstaluj APK bezpośrednio na telefonie.

Szczegóły są w:

```text
docs/build-android-apk.md
```

Główny skrypt:

```powershell
npm run mobile:apk:share -- -ApiBaseUrl "https://publiczny-backend.example.com"
```

Domyślny kanał publikacji APK:

```text
kicha93/gymmin-apk
release: v1.0
```

## Backend URL w APK

Publiczny backend URL jest zaszywany w APK podczas builda. Jeżeli tunel
ngrok/Cloudflare wygaśnie albo zmieni adres, zainstalowana aplikacja dalej
próbuje łączyć się ze starym URL-em. Objawy to m.in. `Network request failed`
przy logowaniu, synchronizacji albo uploadzie avatara.

Przed buildem sprawdź aktualny backend:

```powershell
Invoke-WebRequest "https://twoj-backend-url/health" -UseBasicParsing
```

Główny build na GitHub Release powinien dostać aktualny URL:

```powershell
npm run mobile:github:apk:oneclick -- -ApiBaseUrl "https://publiczny-backend.example.com"
```

Alternatywnie ustaw:

```powershell
$env:GYMMIN_APK_API_BASE_URL = "https://publiczny-backend.example.com"
npm run mobile:github:apk:oneclick
```

`scripts/build-github-apk-oneclick.ps1` przerywa build, jeśli `/health` nie
zwraca statusu `ok`, żeby nie opublikować APK ze starym albo martwym adresem
backendu.

`scripts/start-expo-tunnel.ps1` może jeszcze istnieć jako awaryjny/deweloperski helper dla starego trybu. Nie jest to obecnie zalecana ścieżka testowania na telefonie.
