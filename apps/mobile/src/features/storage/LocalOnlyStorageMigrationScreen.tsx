import { Ionicons } from "@expo/vector-icons";
import { Pressable, SafeAreaView, ScrollView, StatusBar, Text, View } from "react-native";

import type { LanguageCode } from "../../i18n/translations";

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
  theme: MigrationTheme;
  onRetry: () => void;
};

const copy = {
  en: {
    description: "Gymmin could not open its local data. Try again. Your data has not been deleted.",
    retry: "Try again",
    title: "Local data could not be opened"
  },
  pl: {
    description: "Gymmin nie mógł otworzyć lokalnych danych. Spróbuj ponownie. Twoje dane nie zostały usunięte.",
    retry: "Spróbuj ponownie",
    title: "Nie udało się otworzyć danych lokalnych"
  }
} as const;

export function LocalOnlyStorageMigrationScreen(props: Props) {
  const text = copy[props.language];

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

        <View style={{ alignItems: "center", gap: 12 }}>
          <Text accessibilityRole="alert" style={{ color: "#b4233c", fontSize: 14, textAlign: "center" }}>
            {props.error}
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={props.isSelecting}
            style={{ borderColor: props.theme.primary, borderRadius: 12, borderWidth: 1, opacity: props.isSelecting ? 0.6 : 1, paddingHorizontal: 24, paddingVertical: 12 }}
            onPress={props.onRetry}
          >
            <Text style={{ color: props.theme.primary, fontWeight: "800" }}>{text.retry}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
