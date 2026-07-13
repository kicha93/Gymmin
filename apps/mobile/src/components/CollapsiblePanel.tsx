import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

type CollapsiblePanelProps = {
  actions?: ReactNode;
  children: ReactNode;
  collapseLabel?: string;
  expandLabel?: string;
  isCollapsed: boolean;
  leadingAccessory?: ReactNode;
  onToggle: () => void;
  theme: Theme;
  title: string;
};

export function CollapsiblePanel({
  actions,
  children,
  collapseLabel = "Collapse",
  expandLabel = "Expand",
  isCollapsed,
  leadingAccessory,
  onToggle,
  theme,
  title
}: CollapsiblePanelProps) {
  return (
    <View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Pressable
        accessibilityLabel={`${isCollapsed ? expandLabel : collapseLabel}: ${title}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: !isCollapsed }}
        style={[styles.panelHeader, { borderBottomColor: theme.border }]}
        onPress={onToggle}
      >
        <View style={styles.panelTitleBlock}>
          {leadingAccessory}
          <Text style={[styles.panelTitle, { color: theme.text }]}>{title}</Text>
        </View>
        <View style={styles.panelHeaderActions} onStartShouldSetResponder={() => true}>
          {actions}
          <Pressable
            accessibilityLabel={`${isCollapsed ? expandLabel : collapseLabel}: ${title}`}
            accessibilityRole="button"
            accessibilityState={{ expanded: !isCollapsed }}
            hitSlop={8}
            style={[styles.panelToggleButton, { borderColor: theme.border, backgroundColor: theme.card }]}
            onPress={onToggle}
          >
            <Ionicons
              name={isCollapsed ? "chevron-forward" : "chevron-down"}
              size={20}
              color={theme.primary}
            />
          </Pressable>
        </View>
      </Pressable>
      {!isCollapsed && <View style={styles.panelBody}>{children}</View>}
    </View>
  );
}
