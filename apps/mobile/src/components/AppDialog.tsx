import { Modal, Pressable, Text, View } from "react-native";

import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

export type AppDialogAction = {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "outline" | "destructive";
};

export type AppDialogState = {
  actions: AppDialogAction[];
  message: string;
  title: string;
};

export function AppDialog({
  dialog,
  onClose,
  theme
}: {
  dialog: AppDialogState | null;
  onClose: (action?: AppDialogAction) => void;
  theme: Theme;
}) {
  if (!dialog) {
    return null;
  }
  return (
    <Modal animationType="fade" transparent visible onRequestClose={() => onClose()}>
      <View style={styles.appDialogBackdrop}>
        <View style={[styles.appDialogPanel, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.appDialogBody}>
            <Text style={[styles.appDialogTitle, { color: theme.text }]}>{dialog.title}</Text>
            <Text style={[styles.appDialogMessage, { color: theme.muted }]}>{dialog.message}</Text>
          </View>
          <View style={[styles.appDialogFooter, { borderTopColor: theme.border }]}>
            {dialog.actions.map((action, index) => {
              const isDestructive = action.variant === "destructive";
              const isLast = index === dialog.actions.length - 1;
              return (
                <Pressable
                  key={`${action.label}-${index}`}
                  accessibilityRole="button"
                  style={[
                    styles.appDialogFooterButton,
                    !isLast ? { borderRightColor: theme.border, borderRightWidth: 1 } : null
                  ]}
                  onPress={() => onClose(action)}
                >
                  <Text
                    style={[
                      styles.appDialogFooterButtonText,
                      { color: isDestructive ? theme.danger : theme.primary }
                    ]}
                  >
                    {action.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}
