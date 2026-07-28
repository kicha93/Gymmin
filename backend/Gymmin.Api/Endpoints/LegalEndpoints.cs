using System.Net;
using System.Text;

namespace Gymmin.Api.Endpoints;

internal static class LegalEndpoints
{
    private const string UpdatedDate = "2026-07-28";

    public static void MapLegalEndpoints(this WebApplication app)
    {
        app.MapGet("/privacy", (HttpRequest request) =>
        {
            var language = string.Equals(request.Query["lang"], "en", StringComparison.OrdinalIgnoreCase)
                ? "en"
                : "pl";
            return Results.Text(BuildPrivacyPolicy(language), "text/html; charset=utf-8", Encoding.UTF8);
        })
        .AllowAnonymous();

        app.MapGet("/account-deletion", (HttpRequest request) =>
        {
            var language = string.Equals(request.Query["lang"], "en", StringComparison.OrdinalIgnoreCase)
                ? "en"
                : "pl";
            return Results.Text(BuildAccountDeletionPage(language), "text/html; charset=utf-8", Encoding.UTF8);
        })
        .AllowAnonymous();
    }

    internal static string BuildPrivacyPolicy(string language)
    {
        var isEnglish = string.Equals(language, "en", StringComparison.OrdinalIgnoreCase);
        var title = isEnglish ? "Gymmin Privacy Policy" : "Polityka prywatności Gymmin";
        var sections = isEnglish ? EnglishSections : PolishSections;
        var body = string.Join(
            Environment.NewLine,
            sections.Select(section =>
                $"<section><h2>{WebUtility.HtmlEncode(section.Title)}</h2><p>{WebUtility.HtmlEncode(section.Text)}</p></section>"));

        return $"""
            <!doctype html>
            <html lang="{(isEnglish ? "en" : "pl")}">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <title>{WebUtility.HtmlEncode(title)}</title>
            </head>
            <body>
              <main>
                <h1>{WebUtility.HtmlEncode(title)}</h1>
                <p>{(isEnglish ? "Last updated" : "Ostatnia aktualizacja")}: {UpdatedDate}</p>
                {body}
                <p><a href="/account-deletion?lang={(isEnglish ? "en" : "pl")}">{(isEnglish ? "Account and data deletion instructions" : "Instrukcja usunięcia konta i danych")}</a></p>
              </main>
            </body>
            </html>
            """;
    }

    internal static string BuildAccountDeletionPage(string language)
    {
        var isEnglish = string.Equals(language, "en", StringComparison.OrdinalIgnoreCase);
        var title = isEnglish ? "Delete your Gymmin account and data" : "Usuń konto i dane Gymmin";
        var inAppTitle = isEnglish ? "Immediate deletion in the app" : "Natychmiastowe usunięcie w aplikacji";
        var inAppText = isEnglish
            ? "Sign in and go to Profile → Account → Delete account. Confirm the operation with your current password. Deletion is permanent and signs out all active sessions."
            : "Zaloguj się i przejdź do Profil → Konto → Usuń konto. Potwierdź operację aktualnym hasłem. Usunięcie jest trwałe i wylogowuje wszystkie aktywne sesje.";
        var outsideTitle = isEnglish ? "Request deletion outside the app" : "Żądanie usunięcia poza aplikacją";
        var outsideText = isEnglish
            ? "Email kontakt@gymmin.app from the address registered to your Gymmin account with the subject “Delete my Gymmin account”. We will verify ownership using the registered email address. Never send us your password or verification code."
            : "Napisz z adresu przypisanego do konta Gymmin na kontakt@gymmin.app, używając tematu „Usuń moje konto Gymmin”. Własność konta zweryfikujemy przez zarejestrowany adres email. Nigdy nie wysyłaj nam hasła ani kodu weryfikacyjnego.";
        var deletedTitle = isEnglish ? "Data covered by deletion" : "Dane objęte usunięciem";
        var deletedText = isEnglish
            ? "Deletion covers the account, authentication sessions, profile and avatar, synchronized settings, workouts, weekly plan data, workout sessions and results, favorites, achievements, AI creator profiles and jobs, and AI credit data associated with the account. Bug reports are detached from the account and account identifiers are removed from their diagnostics."
            : "Usunięcie obejmuje konto, sesje logowania, profil i avatar, synchronizowane ustawienia, treningi, plan tygodnia, sesje i wyniki treningowe, ulubione ćwiczenia, osiągnięcia, profile i zadania kreatora AI oraz dane kredytów AI powiązane z kontem. Zgłoszenia błędów są odłączane od konta, a identyfikatory konta usuwane z diagnostyki.";
        var retainedTitle = isEnglish ? "Limited retention" : "Ograniczone przechowywanie";
        var retainedText = isEnglish
            ? "Security logs, backups and records required for fraud prevention, settlements or legal obligations may remain for a limited period and are then deleted or anonymized. Google Play keeps its own purchase history under Google's policies. Local data on other offline devices must be removed in the app or by clearing/uninstalling the app."
            : "Logi bezpieczeństwa, kopie zapasowe i zapisy wymagane do zapobiegania nadużyciom, rozliczeń lub wykonania obowiązków prawnych mogą pozostać przez ograniczony okres, po czym są usuwane lub anonimizowane. Google Play przechowuje własną historię zakupów zgodnie ze swoimi zasadami. Dane lokalne na innych urządzeniach offline trzeba usunąć w aplikacji albo przez wyczyszczenie/odinstalowanie aplikacji.";
        var contactLabel = isEnglish ? "Request deletion by email" : "Wyślij żądanie usunięcia";
        var mailSubject = Uri.EscapeDataString(isEnglish ? "Delete my Gymmin account" : "Usuń moje konto Gymmin");

        return $"""
            <!doctype html>
            <html lang="{(isEnglish ? "en" : "pl")}">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <title>{WebUtility.HtmlEncode(title)}</title>
            </head>
            <body>
              <main>
                <h1>{WebUtility.HtmlEncode(title)}</h1>
                <p>{(isEnglish ? "Last updated" : "Ostatnia aktualizacja")}: {UpdatedDate}</p>
                <section><h2>{WebUtility.HtmlEncode(inAppTitle)}</h2><p>{WebUtility.HtmlEncode(inAppText)}</p></section>
                <section><h2>{WebUtility.HtmlEncode(outsideTitle)}</h2><p>{WebUtility.HtmlEncode(outsideText)}</p></section>
                <p><a href="mailto:kontakt@gymmin.app?subject={mailSubject}">{WebUtility.HtmlEncode(contactLabel)}</a></p>
                <section><h2>{WebUtility.HtmlEncode(deletedTitle)}</h2><p>{WebUtility.HtmlEncode(deletedText)}</p></section>
                <section><h2>{WebUtility.HtmlEncode(retainedTitle)}</h2><p>{WebUtility.HtmlEncode(retainedText)}</p></section>
                <p><a href="/privacy?lang={(isEnglish ? "en" : "pl")}">{(isEnglish ? "Privacy policy" : "Polityka prywatności")}</a></p>
              </main>
            </body>
            </html>
            """;
    }

    private static readonly (string Title, string Text)[] PolishSections =
    [
        ("1. Administrator i kontakt", "Administratorem danych jest Gymmin. W sprawach prywatności skontaktuj się z nami pod adresem kontakt@gymmin.app."),
        ("2. Zakres danych", "Przetwarzamy dane potrzebne do działania aplikacji: email, nazwę użytkownika, sesje logowania, avatar, treningi, wyniki, ustawienia, przypomnienia, osiągnięcia, zakupy kredytów AI, zgłoszenia błędów i ograniczone dane diagnostyczne. Dane anonimowe mogą pozostawać wyłącznie lokalnie na urządzeniu."),
        ("3. Dane zdrowotne w kreatorze AI", "Odpowiedzi kreatora mogą zawierać wiek, płeć, wzrost, masę ciała, wyniki siłowe, urazy, ból, operacje, ograniczenia lekarskie, choroby, leki, informacje o śnie, stresie i aktywności. Są przesyłane do generatora AI wyłącznie po osobnej, świadomej zgodzie udzielonej przed wysłaniem."),
        ("4. Cele przetwarzania", "Dane służą do prowadzenia konta, synchronizacji urządzeń, planowania i wykonywania treningów, monitorowania postępu, realizowania zakupów, zabezpieczenia usługi, obsługi użytkownika, naprawy błędów i — za zgodą — wygenerowania planu treningowego."),
        ("5. Odbiorcy danych", "Dane mogą być przetwarzane przez dostawców hostingu i bazy danych, OpenAI podczas generowania planu AI, dostawcę poczty SMTP podczas wysyłki kodów i obsługi zgłoszeń oraz Google Play podczas obsługi zakupów. Nie sprzedajemy danych i nie wykorzystujemy ich do reklamy."),
        ("6. Przechowywanie", "Dane konta przechowujemy do usunięcia konta, a następnie tylko przez okres niezbędny ze względów bezpieczeństwa, rozliczeń, zapobiegania nadużyciom i obowiązków prawnych. Lokalne dane pozostają do ich usunięcia lub odinstalowania aplikacji. Kody i sesje wygasają zgodnie z ich terminami ważności; dane techniczne i kopie zapasowe są usuwane w ramach ograniczonych cykli retencji."),
        ("7. Usunięcie konta i danych", "Konto oraz powiązane dane możesz usunąć w aplikacji: Profil → Konto → Usuń konto. W sprawie dostępu, poprawienia, przeniesienia, ograniczenia lub usunięcia danych możesz też napisać na kontakt@gymmin.app."),
        ("8. Zgoda i prawa", "Możesz wycofać zgodę przed kolejnym użyciem generatora AI, nie zaznaczając pola zgody. Wycofanie nie wpływa na zgodność wcześniejszego przetwarzania. Przysługują Ci prawa wynikające z właściwych przepisów oraz prawo skargi do organu ochrony danych."),
        ("9. Bezpieczeństwo i zmiany", "Stosujemy szyfrowane połączenia HTTPS, kontrolę dostępu i ograniczenia techniczne. Polityka może być aktualizowana wraz ze zmianami aplikacji; aktualna wersja jest zawsze dostępna pod tym adresem.")
    ];

    private static readonly (string Title, string Text)[] EnglishSections =
    [
        ("1. Controller and contact", "Gymmin is the data controller. For privacy matters, contact kontakt@gymmin.app."),
        ("2. Data scope", "We process data required to operate the app: email, username, login sessions, avatar, workouts, results, settings, reminders, achievements, AI credit purchases, bug reports and limited diagnostics. Anonymous data may remain only on the device."),
        ("3. Health data in the AI creator", "Creator answers may include age, gender, height, body weight, strength results, injuries, pain, surgeries, medical limitations, conditions, medication, sleep, stress and activity. They are sent to the AI generator only after separate, informed consent immediately before submission."),
        ("4. Processing purposes", "Data is used to operate accounts, synchronize devices, plan and perform workouts, track progress, process purchases, secure the service, support users, fix issues and — with consent — generate a workout plan."),
        ("5. Data recipients", "Data may be processed by hosting and database providers, OpenAI while generating an AI plan, the SMTP email provider for codes and reports, and Google Play for purchases. We do not sell data or use it for advertising."),
        ("6. Retention", "Account data is retained until account deletion and afterwards only as needed for security, settlements, abuse prevention and legal obligations. Local data remains until deleted or the app is uninstalled. Codes and sessions expire according to their validity periods; technical data and backups are removed in limited retention cycles."),
        ("7. Account and data deletion", "Delete your account and associated data in the app under Profile → Account → Delete account. You may also contact kontakt@gymmin.app to request access, correction, portability, restriction or deletion."),
        ("8. Consent and rights", "You can withdraw consent before the next AI generation by leaving the consent checkbox clear. Withdrawal does not affect prior lawful processing. You have rights under applicable law and may complain to the competent data protection authority."),
        ("9. Security and changes", "We use encrypted HTTPS connections, access controls and technical safeguards. This policy may change as the app evolves; the current version is always available at this address.")
    ];
}
