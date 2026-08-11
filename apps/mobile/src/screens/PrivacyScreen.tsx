import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import type { LanguageCode } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

type PrivacyScreenProps = { language: LanguageCode; theme: Theme };

const content = {
  pl: {
    title: "Polityka prywatności Gymmin",
    intro: "Gymmin jest aplikacją local-only: nie wymaga konta, nie synchronizuje danych i nie przechowuje ich na serwerze Gymmin. Dane mogą opuścić urządzenie wyłącznie po Twojej świadomej akcji.",
    updated: "Ostatnia aktualizacja: 11 sierpnia 2026",
    sections: [
      { title: "Autor i kontakt", text: "Gymmin jest niezależną aplikacją stworzoną przez Pawła Kaliszewskiego. W sprawach prywatności napisz na kontakt@gymmin.app." },
      { title: "Dane przechowywane lokalnie", text: "Treningi, sesje i historia, ustawienia aplikacji, plan tygodnia, ulubione, przypomnienia, osiągnięcia, lokalne profile kreatora oraz profil i avatar pozostają w prywatnej pamięci aplikacji. Gymmin nie tworzy konta i nie synchronizuje tych danych między urządzeniami." },
      { title: "AI przez copy/paste", text: "Gymmin tworzy prompt lokalnie i nie łączy się z OpenAI ani innym dostawcą AI. Dopiero Ty możesz skopiować treść i wkleić ją do wybranej usługi, której własna polityka prywatności zaczyna wtedy obowiązywać." },
      { title: "Eksport, email i linki zewnętrzne", text: "Dane opuszczają Gymmin tylko po świadomej akcji: utworzeniu eksportu lub backupu, wklejeniu treści do innej aplikacji albo wysłaniu wiadomości przez systemowego klienta poczty. Buy Me a Coffee, polityka prywatności i inne jawne linki HTTPS otwierają zewnętrzną aplikację. Gymmin nie wysyła danych w tle." },
      { title: "Zgłoszenia błędów i kontakt", text: "Formularz działa lokalnie: przygotowuje ograniczoną wiadomość do kontakt@gymmin.app i otwiera klienta poczty. Dopiero Ty sprawdzasz i wysyłasz email. Raport może zawierać opis, wersję aplikacji i systemu, model urządzenia, język, bieżący ekran oraz maksymalnie 10 bezpiecznych zdarzeń diagnostycznych. Nie dołączamy treningów, historii, ciężarów, promptów AI, tokenów ani dawnych identyfikatorów konta." },
      { title: "Retencja, usuwanie i kopie", text: "Gymmin nie ma serwerowej kopii Twoich danych. Dane pozostają na urządzeniu do czasu ich zmiany, importu backupu, użycia funkcji „Usuń wszystkie dane” albo odinstalowania aplikacji. W Ustawieniach możesz wcześniej utworzyć lokalną kopię .gymmin.json. Nie jest potrzebny osobny wniosek o usunięcie danych ani usunięcie konta, ponieważ Gymmin nie posiada kont użytkowników." },
      { title: "Dobrowolne wsparcie", text: "Przycisk „Postaw mi kawę” jedynie otwiera https://buymeacoffee.com/atomicjumpr. Wsparcie jest dobrowolne, nie daje funkcji premium i Gymmin nie przekazuje tam danych użytkownika." }
    ]
  },
  en: {
    title: "Gymmin Privacy Policy",
    intro: "Gymmin is local-only: it requires no account, performs no data sync, and stores no user data on a Gymmin server. Data may leave the device only after your explicit action.",
    updated: "Last updated: August 11, 2026",
    sections: [
      { title: "Author and contact", text: "Gymmin is an independent app created by Paweł Kaliszewski. For privacy matters, email kontakt@gymmin.app." },
      { title: "Locally stored data", text: "Workouts, sessions and history, app settings, weekly plan, favorites, reminders, achievements, local creator profiles, and the profile and avatar remain in the app's private storage. Gymmin creates no account and does not sync these data between devices." },
      { title: "AI via copy/paste", text: "Gymmin creates prompts locally and does not connect to OpenAI or another AI provider. You may copy the content into a service of your choice, at which point that service's privacy policy applies." },
      { title: "Exports, email, and external links", text: "Data leaves Gymmin only after an explicit action: creating an export or backup, pasting content into another app, or sending an email with the system email client. Buy Me a Coffee, the privacy policy, and other explicit HTTPS links open an external app. Gymmin sends nothing in the background." },
      { title: "Bug reports and contact", text: "The form works locally: it prepares a limited message to kontakt@gymmin.app and opens your email app. You review and send the email. A report may contain your description, app and OS versions, device model, language, current screen, and at most 10 safe diagnostic events. It excludes workouts, history, weights, AI prompts, tokens, and former account identifiers." },
      { title: "Retention, deletion, and backups", text: "Gymmin has no server copy of your data. Data remains on the device until it is changed, replaced by a backup import, removed with “Delete all data,” or deleted when the app is uninstalled. Settings lets you create a local .gymmin.json backup first. No separate data-deletion or account-deletion request is needed because Gymmin has no user accounts." },
      { title: "Optional support", text: "The “Buy me a coffee” button only opens https://buymeacoffee.com/atomicjumpr. Support is optional, grants no premium functionality, and Gymmin sends no user data there." }
    ]
  }
} as const;

export function PrivacyScreen({ language, theme }: PrivacyScreenProps) {
  const copy = content[language];
  return (
    <View style={styles.termsScreen}>
      <View style={[styles.termsHeroCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.termsHeroTop}>
          <View style={[styles.termsHeroIcon, { backgroundColor: theme.secondaryBand }]}>
            <Ionicons name="lock-closed-outline" size={38} color={theme.primary} />
          </View>
          <View style={styles.termsHeroCopy}>
            <Text style={[styles.termsHeroTitle, { color: theme.text }]}>{copy.title}</Text>
            <Text style={[styles.termsHeroDescription, { color: theme.muted }]}>{copy.intro}</Text>
            <Text style={[styles.workoutMeta, { color: theme.muted }]}>{copy.updated}</Text>
          </View>
        </View>
      </View>
      <View style={[styles.termsAccordion, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {copy.sections.map((section, index) => (
          <View key={section.title} style={[styles.termsAccordionItem, { borderBottomColor: theme.border }, index === copy.sections.length - 1 ? styles.termsAccordionItemLast : null]}>
            <View style={styles.termsAccordionHeader}>
              <View style={[styles.termsAccordionIcon, { backgroundColor: theme.secondaryBand }]}>
                <Ionicons name="shield-checkmark-outline" size={19} color={theme.primary} />
              </View>
              <Text style={[styles.termsAccordionTitle, { color: theme.text }]}>{section.title}</Text>
            </View>
            <Text style={[styles.termsAccordionText, { color: theme.muted }]}>{section.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
