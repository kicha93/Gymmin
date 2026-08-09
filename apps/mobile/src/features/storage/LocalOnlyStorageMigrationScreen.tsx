import { Ionicons } from "@expo/vector-icons";
import { Pressable, SafeAreaView, ScrollView, StatusBar, Text, View } from "react-native";

import type { LanguageCode } from "../../i18n/translations";
import type { LocalOnlyStorageSourceSummary } from "../../domain/localOnlyStorageMigration";

type MigrationTheme = {
  background: string;
  border: string;
  card: string;
  muted: string;
  primary: string;
  statusBar: "dark" | "light";
  text: string;
};

type Props = {
  error: string;
  isSelecting: boolean;
  language: LanguageCode;
  sources: LocalOnlyStorageSourceSummary[];
  theme: MigrationTheme;
  onRetry: () => void;
  onSelect: (sourceId: string) => void;
};

const copy = {
  en: {
    achievements: "achievements",
    choose: "Use this data",
    description: "More than one local data space was found. Choose the one that Gymmin should use. Nothing will be deleted and the other spaces will remain untouched.",
    lastActivity: "Last activity",
    profiles: "creator profiles",
    retry: "Try again",
    sessions: "completed or saved sessions",
    title: "Choose your local Gymmin data",
    workouts: "workouts"
  },
  pl: {
    achievements: "osiągnięć",
    choose: "Użyj tych danych",
    description: "Znaleźliśmy więcej niż jedną lokalną przestrzeń danych. Wybierz tę, z której Gymmin ma korzystać. Niczego nie usuniemy, a pozostałe przestrzenie pozostaną nietknięte.",
    lastActivity: "Ostatnia aktywność",
    profiles: "profili kreatora",
    retry: "Spróbuj ponownie",
    sessions: "zapisanych lub ukończonych sesji",
    title: "Wybierz lokalne dane Gymmin",
    workouts: "treningów"
  }
} as const;

export function LocalOnlyStorageMigrationScreen(props: Props) {
  const text = copy[props.language];
  const locale = props.language === "pl" ? "pl-PL" : "en-US";

  return (
    <SafeAreaView style={{ backgroundColor: props.theme.background, flex: 1 }}>
      <StatusBar
        backgroundColor={props.theme.background}
        barStyle={props.theme.statusBar === "dark" ? "dark-content" : "light-content"}
      />
      <ScrollView contentContainerStyle={{ gap: 18, padding: 24 }}>
        <View style={{ alignItems: "center", gap: 12, paddingVertical: 12 }}>
          <View style={{ alignItems: "center", backgroundColor: props.theme.card, borderColor: props.theme.border, borderRadius: 22, borderWidth: 1, height: 64, justifyContent: "center", width: 64 }}>
            <Ionicons color={props.theme.primary} name="folder-open-outline" size={32} />
          </View>
          <Text style={{ color: props.theme.text, fontSize: 25, fontWeight: "800", textAlign: "center" }}>
            {text.title}
          </Text>
          <Text style={{ color: props.theme.muted, fontSize: 15, lineHeight: 22, textAlign: "center" }}>
            {text.description}
          </Text>
        </View>

        {props.sources.map((source) => (
          <View
            key={source.id}
            style={{ backgroundColor: props.theme.card, borderColor: props.theme.border, borderRadius: 18, borderWidth: 1, gap: 12, padding: 18 }}
          >
            <View style={{ gap: 3 }}>
              <Text style={{ color: props.theme.text, fontSize: 18, fontWeight: "800" }}>{source.label}</Text>
              {source.email ? <Text style={{ color: props.theme.muted, fontSize: 14 }}>{source.email}</Text> : null}
            </View>
            <Text style={{ color: props.theme.muted, fontSize: 14, lineHeight: 21 }}>
              {source.workoutCount} {text.workouts} · {source.sessionCount} {text.sessions}{"\n"}
              {source.creatorProfileCount} {text.profiles} · {source.achievementCount} {text.achievements}
              {source.lastActivityAt
                ? `\n${text.lastActivity}: ${new Date(source.lastActivityAt).toLocaleString(locale)}`
                : ""}
            </Text>
            <Pressable
              accessibilityRole="button"
              disabled={props.isSelecting}
              style={{ alignItems: "center", backgroundColor: props.theme.primary, borderRadius: 12, justifyContent: "center", minHeight: 48, opacity: props.isSelecting ? 0.6 : 1 }}
              onPress={() => props.onSelect(source.id)}
            >
              <Text style={{ color: props.theme.card, fontSize: 16, fontWeight: "800" }}>{text.choose}</Text>
            </Pressable>
          </View>
        ))}

        {props.error ? (
          <View style={{ alignItems: "center", gap: 12 }}>
            <Text accessibilityRole="alert" style={{ color: "#b4233c", fontSize: 14, textAlign: "center" }}>
              {props.error}
            </Text>
            {props.sources.length === 0 ? (
              <Pressable accessibilityRole="button" disabled={props.isSelecting} style={{ borderColor: props.theme.primary, borderRadius: 12, borderWidth: 1, opacity: props.isSelecting ? 0.6 : 1, paddingHorizontal: 24, paddingVertical: 12 }} onPress={props.onRetry}>
                <Text style={{ color: props.theme.primary, fontWeight: "800" }}>{text.retry}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
