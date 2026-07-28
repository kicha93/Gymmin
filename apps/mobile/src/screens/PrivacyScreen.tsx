import { Ionicons } from "@expo/vector-icons";
import { Linking, Pressable, Text, View } from "react-native";

import type { LanguageCode } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

type PrivacyScreenProps = {
  apiBaseUrl: string;
  language: LanguageCode;
  theme: Theme;
};

const content = {
  pl: {
    title: "Polityka prywatności Gymmin",
    intro:
      "Wyjaśniamy tu, jakie dane przetwarzamy, po co to robimy, komu mogą zostać przekazane i jak możesz je usunąć.",
    updated: "Ostatnia aktualizacja: 28 lipca 2026",
    publicPolicy: "Otwórz publiczną wersję polityki",
    accountDeletion: "Instrukcja usunięcia konta i danych",
    sections: [
      {
        title: "Administrator i kontakt",
        text: "Administratorem danych jest Gymmin. W sprawach prywatności skontaktuj się z nami pod adresem kontakt@gymmin.app."
      },
      {
        title: "Jakie dane przetwarzamy",
        text: "Możemy przetwarzać dane konta (email, nazwa użytkownika i sesje logowania), avatar, treningi, wyniki, ustawienia, przypomnienia, osiągnięcia, zakupy kredytów AI, zgłoszenia błędów i dane diagnostyczne. Kreator AI może zawierać dane o wieku, masie ciała, urazach, bólu, chorobach, lekach, śnie, stresie i stylu życia."
      },
      {
        title: "Cele i podstawy przetwarzania",
        text: "Dane są używane do prowadzenia konta, synchronizacji między urządzeniami, realizowania treningów, obsługi zakupów, bezpieczeństwa, wsparcia i naprawy błędów. Dane zdrowotne są wysyłane do generatora AI wyłącznie po osobnej, świadomej zgodzie udzielonej przed wysłaniem formularza."
      },
      {
        title: "Odbiorcy danych",
        text: "Dane mogą być przetwarzane przez dostawców hostingu i bazy danych, OpenAI przy generowaniu planów AI, dostawcę poczty SMTP przy wiadomościach systemowych i zgłoszeniach oraz Google Play przy zakupach. Nie sprzedajemy danych i nie używamy ich do reklam."
      },
      {
        title: "Przechowywanie i usuwanie",
        text: "Dane konta przechowujemy do usunięcia konta lub przez okres wymagany do obsługi bezpieczeństwa, rozliczeń i obowiązków prawnych. Lokalne dane pozostają na urządzeniu do ich usunięcia lub odinstalowania aplikacji. Konto i powiązane dane możesz usunąć w Profil → Konto → Usuń konto. Możesz też napisać na kontakt@gymmin.app."
      },
      {
        title: "Twoje prawa",
        text: "Możesz żądać dostępu, poprawienia, usunięcia, ograniczenia lub przeniesienia danych oraz wycofać zgodę. Wycofanie zgody nie wpływa na zgodność wcześniejszego przetwarzania. Masz też prawo złożyć skargę do właściwego organu ochrony danych."
      }
    ]
  },
  en: {
    title: "Gymmin Privacy Policy",
    intro:
      "This policy explains what data we process, why we use it, who may receive it, and how you can delete it.",
    updated: "Last updated: July 28, 2026",
    publicPolicy: "Open the public policy",
    accountDeletion: "Account and data deletion instructions",
    sections: [
      {
        title: "Controller and contact",
        text: "Gymmin is the data controller. For privacy matters, contact us at kontakt@gymmin.app."
      },
      {
        title: "Data we process",
        text: "We may process account data (email, username and login sessions), avatar, workouts, results, settings, reminders, achievements, AI credit purchases, bug reports and diagnostics. The AI creator may include age, body weight, injuries, pain, medical conditions, medication, sleep, stress and lifestyle data."
      },
      {
        title: "Purposes and legal bases",
        text: "Data is used to operate accounts, synchronize devices, run workouts, process purchases, secure the service, provide support and fix issues. Health data is sent to the AI generator only after separate, informed consent given before submitting the form."
      },
      {
        title: "Data recipients",
        text: "Data may be processed by hosting and database providers, OpenAI when generating AI plans, the SMTP email provider for system messages and reports, and Google Play for purchases. We do not sell data or use it for advertising."
      },
      {
        title: "Retention and deletion",
        text: "Account data is retained until account deletion or as required for security, settlement and legal obligations. Local data stays on the device until deleted or the app is uninstalled. Delete your account and associated data in Profile → Account → Delete account, or contact kontakt@gymmin.app."
      },
      {
        title: "Your rights",
        text: "You may request access, correction, deletion, restriction or portability and withdraw consent. Withdrawal does not affect prior lawful processing. You may also lodge a complaint with the competent data protection authority."
      }
    ]
  }
} as const;

export function PrivacyScreen({ apiBaseUrl, language, theme }: PrivacyScreenProps) {
  const copy = content[language];
  const publicPolicyUrl = `${apiBaseUrl.replace(/\/+$/, "")}/privacy?lang=${language}`;
  const accountDeletionUrl = `${apiBaseUrl.replace(/\/+$/, "")}/account-deletion?lang=${language}`;

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
          <View
            key={section.title}
            style={[
              styles.termsAccordionItem,
              { borderBottomColor: theme.border },
              index === copy.sections.length - 1 ? styles.termsAccordionItemLast : null
            ]}
          >
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

      <Pressable
        accessibilityRole="link"
        style={[styles.termsInfoButton, { borderColor: theme.primary }]}
        onPress={() => void Linking.openURL(publicPolicyUrl)}
      >
        <Text style={[styles.termsInfoButtonText, { color: theme.primary }]}>{copy.publicPolicy}</Text>
        <Ionicons name="open-outline" size={18} color={theme.primary} />
      </Pressable>
      <Pressable
        accessibilityRole="link"
        style={[styles.termsInfoButton, { borderColor: theme.primary }]}
        onPress={() => void Linking.openURL(accountDeletionUrl)}
      >
        <Text style={[styles.termsInfoButtonText, { color: theme.primary }]}>{copy.accountDeletion}</Text>
        <Ionicons name="person-remove-outline" size={18} color={theme.primary} />
      </Pressable>
    </View>
  );
}
