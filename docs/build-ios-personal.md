# Prywatny build iOS na 7 dni

Gymmin ma dwa równoważne technicznie sposoby zbudowania niepodpisanego IPA na macOS. Żaden nie wymaga płatnego Apple Developer Program, nie zawiera certyfikatu ani profilu provisioning i nie publikuje aplikacji w App Store.

## GitHub Actions — ścieżka one-click

Na Windows uruchom:

```powershell
npm run mobile:ios:personal
```

Skrypt:

1. sprawdza dostęp Git/GitHub i wersję z `apps/mobile/app.json`;
2. uruchamia lokalnie dependency audit, Expo dependency check, Expo Doctor, testy, typecheck i `git diff --check`; workflow macOS powtarza te kontrole przed prebuildem;
3. wypycha bieżący commit;
4. uruchamia `.github/workflows/ios-unsigned.yml` na `macos-latest`;
5. pobiera GitHub Artifact do `.artifacts`;
6. sprawdza, że IPA zawiera `Payload/*.app`, ale nie zawiera `embedded.mobileprovision` ani `_CodeSignature`;
7. zapisuje wersjonowany plik oraz `Gymmin-ios-unsigned-latest.ipa`.

GitHub przechowuje artefakt workflow przez 14 dni. Publiczne repozytorium oznacza, że źródła i dostępne publicznie artefakty/release assets nie powinny zawierać sekretów.

## Codemagic — alternatywny build macOS

Plik `codemagic.yaml` definiuje workflow `gymmin-ios-unsigned`. W panelu Codemagic wybierz aplikację Gymmin, ten workflow i bieżący commit, a następnie uruchom build. Artefakty:

- `Gymmin-<wersja>-build<numer>-unsigned.ipa`;
- odpowiadająca suma SHA-256;
- logi Xcode przy błędzie.

Codemagic buduje ten sam niepodpisany typ IPA i przed prebuildem uruchamia dokumentację, dependency audit, Expo dependency check, Expo Doctor, testy, typecheck oraz `git diff --check`. Nie wykonuje Androidowych zadań Gradle, ponieważ jego celem jest artefakt iOS. Te same kontrole można wykonać lokalnie:

```powershell
npm --prefix apps/mobile run test
npm --prefix apps/mobile run typecheck
git diff --check
```

GitHub Actions pozostaje kanoniczną ścieżką one-click. Codemagic jest alternatywą, gdy potrzebny jest ręcznie uruchamiany macOS runner.

## Instalacja testowa

Niepodpisanego IPA nie można zainstalować bezpośrednio ani podpisać wyłącznie w przeglądarce telefonu. Tester musi użyć narzędzia podpisującego, np. AltStore, SideStore albo Sideloadly, i własnego darmowego Apple ID.

Typowy przebieg:

1. pobrać IPA na komputer;
2. zainstalować i skonfigurować wybrane narzędzie zgodnie z jego aktualną dokumentacją;
3. połączyć iPhone z komputerem co najmniej podczas pierwszej instalacji, jeżeli wymaga tego narzędzie;
4. podpisać IPA własnym Apple ID i zainstalować je na urządzeniu;
5. zaufać profilowi deweloperskiemu w ustawieniach iOS, jeśli system o to poprosi;
6. odświeżyć podpis przed upływem 7 dni.

Darmowy podpis jest ważny 7 dni i podlega limitom Apple ID. Gymmin nie przechowuje danych logowania Apple. Dokładne ekrany instalatora mogą zmieniać się niezależnie od repozytorium, dlatego ten dokument nie zastępuje instrukcji aktualnej wersji AltStore/SideStore/Sideloadly.

## Weryfikacja artefaktu

Niepodpisany IPA musi:

- zawierać pojedynczy bundle aplikacji w `Payload/`;
- nie zawierać `embedded.mobileprovision`;
- nie zawierać katalogu `_CodeSignature`;
- odpowiadać `expo.version` i `expo.ios.buildNumber` z `apps/mobile/app.json`;
- mieć zgodną sumę SHA-256.

Jeżeli potrzebny będzie TestFlight lub instalacja bez 7-dniowego odnawiania, wymagane będą płatny Apple Developer Program, właściwy signing/provisioning i osobny zatwierdzony workflow wydawniczy.
