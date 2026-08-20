import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import type { FallbackProps } from "react-error-boundary";
import { useEffect } from "react";
import { Alert, Linking, SafeAreaView, ScrollView, StatusBar, Text, View } from "react-native";

import { addDiagnosticEvent } from "../domain/appDiagnostics";
import { buildContactMailUrl, GYMMIN_CONTACT_EMAIL } from "../domain/contact";
import { styles } from "../theme/appStyles";
import { themes } from "../theme/theme";
import { AppButton } from "./AppControls";

type GlobalErrorFallbackProps = FallbackProps & {
  componentStack?: string;
};

export function GlobalErrorFallback({ componentStack = "", error, resetErrorBoundary }: GlobalErrorFallbackProps) {
  const theme = themes.light;
  const errorName = error instanceof Error ? error.name : typeof error;
  const errorMessage = error instanceof Error ? error.message : "Nieznany błąd aplikacji";
  const errorStack = error instanceof Error ? error.stack ?? "" : "";
  const errorProperties = serializeErrorProperties(error);
  const fullReport = [
    `Typ: ${errorName || "Nieznany"}`,
    `Komunikat: ${errorMessage}`,
    "",
    "JavaScript call stack:",
    errorStack || "Brak stosu JavaScript.",
    "",
    "Pełny obiekt błędu:",
    errorProperties,
    "",
    "React component stack:",
    componentStack.trim() || "Brak stosu komponentów React."
  ].join("\n");

  useEffect(() => {
    addDiagnosticEvent({
      area: "ui",
      level: "error",
      message: `${errorName}: ${errorMessage}`,
      screen: "error-boundary"
    });
  }, [errorMessage, errorName]);

  const openContact = async () => {
    const body = `W aplikacji Gymmin wystąpił błąd.\n\n${fullReport.slice(0, 2_500)}`;
    try {
      await Linking.openURL(buildContactMailUrl("pl", GYMMIN_CONTACT_EMAIL, body));
    } catch {
      await Clipboard.setStringAsync(GYMMIN_CONTACT_EMAIL);
      Alert.alert(
        "Kontakt",
        `Nie udało się otworzyć aplikacji pocztowej. Adres ${GYMMIN_CONTACT_EMAIL} został skopiowany.`
      );
    }
  };

  const copyError = async () => {
    await Clipboard.setStringAsync(fullReport);
    Alert.alert("Raport błędu", "Pełny raport błędu został skopiowany.");
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.statusBar === "dark" ? "dark-content" : "light-content"} />
      <ScrollView contentContainerStyle={styles.errorScreen}>
        <View style={[styles.errorPanel, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.legalIcon, { backgroundColor: theme.secondaryBand }]}>
            <Ionicons name="alert-circle-outline" size={28} color={theme.danger} />
          </View>
          <Text style={[styles.errorTitle, { color: theme.text }]}>Coś poszło nie tak</Text>
          <Text style={[styles.errorCopy, { color: theme.muted }]}>
            Widok nie mógł zostać wyświetlony. Możesz spróbować odświeżyć aplikację albo
            skontaktować się z nami, jeśli problem będzie wracał.
          </Text>
          <View style={[styles.errorDetails, { backgroundColor: theme.secondaryBand }]}>
            <Text selectable style={[styles.errorDetailsText, { color: theme.muted }]}>
              {fullReport}
            </Text>
          </View>
          <AppButton icon="copy-outline" theme={theme} variant="outline" onPress={() => { void copyError(); }}>
            Kopiuj pełny błąd
          </AppButton>
          <View style={styles.errorActions}>
            <AppButton
              icon="refresh-outline"
              style={styles.errorActionButton}
              theme={theme}
              onPress={resetErrorBoundary}
            >
              Spróbuj ponownie
            </AppButton>
            <AppButton
              icon="mail-outline"
              onPress={() => { void openContact(); }}
              style={styles.errorActionButton}
              theme={theme}
              variant="outline"
            >
              Kontakt
            </AppButton>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function serializeErrorProperties(error: unknown) {
  if (!error || typeof error !== "object") return String(error);

  try {
    const properties: Record<string, unknown> = {};
    for (const key of Object.getOwnPropertyNames(error)) {
      const value = (error as Record<string, unknown>)[key];
      properties[key] = value instanceof Error
        ? { message: value.message, name: value.name, stack: value.stack }
        : typeof value === "function"
          ? `[Function ${value.name || "anonymous"}]`
          : value;
    }
    return JSON.stringify(properties, createCircularReferenceReplacer(), 2) ?? String(error);
  } catch (serializationError) {
    return `Nie udało się zserializować błędu: ${String(serializationError)}`;
  }
}

function createCircularReferenceReplacer() {
  const seen = new WeakSet<object>();
  return (_key: string, value: unknown) => {
    if (!value || typeof value !== "object") return value;
    if (seen.has(value)) return "[Circular]";
    seen.add(value);
    return value;
  };
}
