import { Ionicons } from "@expo/vector-icons";
import type { FallbackProps } from "react-error-boundary";
import { SafeAreaView, StatusBar, Text, View } from "react-native";

import { addDiagnosticEvent } from "../domain/appDiagnostics";
import { styles } from "../theme/appStyles";
import { themes } from "../theme/theme";
import { AppButton } from "./AppControls";

export function GlobalErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const theme = themes.light;
  const errorMessage = error instanceof Error ? error.message : "Nieznany błąd aplikacji";
  addDiagnosticEvent({
    area: "ui",
    level: "error",
    message: errorMessage,
    screen: "error-boundary"
  });

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={theme.statusBar === "dark" ? "dark-content" : "light-content"} />
      <View style={styles.errorScreen}>
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
            <Text style={[styles.errorDetailsText, { color: theme.muted }]} numberOfLines={3}>
              Szczegóły błędu zostały zapisane diagnostycznie.
            </Text>
          </View>
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
              style={styles.errorActionButton}
              theme={theme}
              variant="outline"
            >
              Kontakt
            </AppButton>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
