# Legacy: Expo tunnel

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

`scripts/start-expo-tunnel.ps1` może jeszcze istnieć jako awaryjny/deweloperski helper dla starego trybu. Nie jest to obecnie zalecana ścieżka testowania na telefonie.
