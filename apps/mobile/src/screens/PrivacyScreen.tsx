import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import type { LanguageCode } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

type PrivacyScreenProps = { language: LanguageCode; theme: Theme };

const content = {
  pl: {
    title: "Polityka prywatności Gymmin",
    intro: "Gymmin działa lokalnie. Poniżej wyjaśniamy, kiedy dane mogą opuścić urządzenie wyłącznie po Twojej świadomej akcji.",
    updated: "Ostatnia aktualizacja: 9 sierpnia 2026",
    sections: [
      { title: "Autor i kontakt", text: "Gymmin jest niezależną aplikacją stworzoną przez Pawła Kaliszewskiego. W sprawach prywatności napisz na kontakt@gymmin.app." },
      { title: "Dane przechowywane lokalnie", text: "Treningi, historia, ustawienia, plan tygodnia, przypomnienia, osiągnięcia, profil i avatar pozostają w prywatnej pamięci aplikacji. Gymmin nie wymaga konta i nie posiada serwera przechowującego te dane." },
      { title: "AI przez copy/paste", text: "Gymmin tworzy prompt lokalnie i nie łączy się z OpenAI ani innym dostawcą AI. Dopiero Ty możesz skopiować treść i wkleić ją do wybranej usługi, której własna polityka prywatności zaczyna wtedy obowiązywać." },
      { title: "Eksport, email i linki zewnętrzne", text: "Dane opuszczają Gymmin tylko po świadomej akcji: eksporcie lub backupie, wklejeniu treści do innej aplikacji albo wysłaniu zgłoszenia przez systemowego klienta poczty. Buy Me a Coffee i inne jawne linki HTTPS otwierają zewnętrzną aplikację. Gymmin nie wysyła danych w tle." },
      { title: "Zgłoszenia błędów", text: "Raport email może zawierać opis, wersję aplikacji i systemu, model urządzenia, język, bieżący ekran oraz maksymalnie 10 bezpiecznych zdarzeń diagnostycznych. Nie dołączamy treningów, historii, promptów AI, tokenów ani dawnych identyfikatorów konta." },
      { title: "Usuwanie i kopie", text: "W Ustawieniach możesz utworzyć lokalną kopię .gymmin.json albo nieodwracalnie usunąć wszystkie dane Gymmin. Odinstalowanie aplikacji również usuwa jej prywatną pamięć zgodnie z zasadami systemu urządzenia." },
      { title: "Dobrowolne wsparcie", text: "Przycisk „Postaw mi kawę” jedynie otwiera https://buymeacoffee.com/atomicjumpr. Wsparcie jest dobrowolne, nie daje funkcji premium i Gymmin nie przekazuje tam danych użytkownika." }
    ]
  },
  en: {
    title: "Gymmin Privacy Policy",
    intro: "Gymmin works locally. This policy explains when data may leave the device only after your explicit action.",
    updated: "Last updated: August 9, 2026",
    sections: [
      { title: "Author and contact", text: "Gymmin is an independent app created by Paweł Kaliszewski. For privacy matters, email kontakt@gymmin.app." },
      { title: "Locally stored data", text: "Workouts, history, settings, weekly plan, reminders, achievements, profile, and avatar remain in the app's private storage. Gymmin requires no account and has no server storing this data." },
      { title: "AI via copy/paste", text: "Gymmin creates prompts locally and does not connect to OpenAI or another AI provider. You may copy the content into a service of your choice, at which point that service's privacy policy applies." },
      { title: "Exports, email, and external links", text: "Data leaves Gymmin only after an explicit action: export or backup, pasting content into another app, or sending a report with the system email client. Buy Me a Coffee and other explicit HTTPS links open an external app. Gymmin sends nothing in the background." },
      { title: "Bug reports", text: "An email report may contain your description, app and OS versions, device model, language, current screen, and at most 10 safe diagnostic events. It excludes workouts, history, AI prompts, tokens, and former account identifiers." },
      { title: "Deletion and backups", text: "Settings lets you create a local .gymmin.json backup or irreversibly delete all Gymmin data. Uninstalling the app also removes its private storage according to the device platform's rules." },
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
