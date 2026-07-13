import { Ionicons } from "@expo/vector-icons";
import {
  Button,
  ButtonText,
  ChevronDownIcon,
  Input,
  InputField,
  Select,
  SelectBackdrop,
  SelectContent,
  SelectIcon,
  SelectInput,
  SelectItem,
  SelectPortal,
  SelectScrollView,
  SelectTrigger,
  Textarea,
  TextareaInput
} from "@gluestack-ui/themed";
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { TextInputProps } from "react-native";

import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

type AppInputProps = TextInputProps & {
  inputStyle?: object | object[];
  theme: Theme;
};

export function AppInput({ theme, style, ...props }: AppInputProps) {
  return (
    <Input
      style={[
        styles.gluestackInput,
        { backgroundColor: theme.control, borderColor: theme.border },
        style
      ]}
    >
      <InputField
        placeholderTextColor={theme.muted}
        style={[styles.gluestackInputField, { color: theme.inputText }]}
        {...props}
      />
    </Input>
  );
}

type PasswordInputProps = AppInputProps & {
  isVisible: boolean;
  setIsVisible: Dispatch<SetStateAction<boolean>>;
};

export function PasswordInput({ isVisible, setIsVisible, theme, style, ...props }: PasswordInputProps) {
  return (
    <Input
      style={[
        styles.gluestackInput,
        styles.passwordInput,
        { backgroundColor: theme.control, borderColor: theme.border },
        style
      ]}
    >
      <InputField
        placeholderTextColor={theme.muted}
        secureTextEntry={!isVisible}
        style={[styles.gluestackInputField, styles.passwordInputField, { color: theme.inputText }]}
        {...props}
      />
      <Pressable
        accessibilityLabel={isVisible ? "Ukryj hasło" : "Pokaż hasło"}
        accessibilityRole="button"
        style={styles.passwordVisibilityButton}
        onPress={() => setIsVisible((current) => !current)}
      >
        <Ionicons
          name={isVisible ? "eye-off-outline" : "eye-outline"}
          size={22}
          color={theme.muted}
        />
      </Pressable>
    </Input>
  );
}

export function AppTextarea({ inputStyle, theme, style, ...props }: AppInputProps) {
  return (
    <Textarea
      style={[
        styles.gluestackTextarea,
        { backgroundColor: theme.control, borderColor: theme.border },
        style
      ]}
    >
      <TextareaInput
        multiline
        placeholderTextColor={theme.muted}
        style={[styles.gluestackTextareaInput, inputStyle, { color: theme.inputText }]}
        {...props}
      />
    </Textarea>
  );
}

type AppButtonProps = {
  children: string;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  style?: object | object[];
  textStyle?: object | object[];
  theme: Theme;
  variant?: "primary" | "light" | "outline";
};

export function AppButton({
  children,
  disabled = false,
  icon,
  onPress,
  style,
  textStyle,
  theme,
  variant = "primary"
}: AppButtonProps) {
  const isLight = variant === "light";
  const isOutline = variant === "outline";
  const flattenedTextStyle = StyleSheet.flatten(textStyle) as { color?: string } | undefined;
  const textColorOverride = flattenedTextStyle?.color;
  const foreground = textColorOverride ?? (isLight ? theme.primaryStrong : isOutline ? theme.primary : theme.white);

  return (
    <Button
      accessibilityRole="button"
      isDisabled={disabled}
      style={[
        styles.gluestackButton,
        {
          backgroundColor: isLight ? theme.white : isOutline ? theme.card : theme.primary,
          borderColor: isOutline ? theme.primary : "transparent",
          borderWidth: isOutline ? 1 : 0,
          opacity: disabled ? 0.64 : 1
        },
        style
      ]}
      onPress={disabled ? undefined : onPress}
    >
      {icon === "add" ? (
        <Text style={[styles.plusIcon, styles.buttonPlusIcon, { color: foreground }]}>+</Text>
      ) : icon ? (
        <Ionicons name={icon} size={18} color={foreground} />
      ) : null}
      <ButtonText style={[styles.gluestackButtonText, { color: foreground }, textStyle]}>
        {children}
      </ButtonText>
    </Button>
  );
}

type AppIconButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  theme: Theme;
};

export function AppIconButton({ icon, onPress, theme }: AppIconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      style={[styles.panelIconButton, { backgroundColor: theme.primary }]}
      onPress={onPress}
    >
      {icon === "add" ? (
        <Text style={[styles.plusIcon, { color: theme.white }]}>+</Text>
      ) : (
        <Ionicons name={icon} size={22} color={theme.white} />
      )}
    </Pressable>
  );
}

type SelectControlProps<TValue extends string> = {
  disabled?: boolean;
  onChange: (value: TValue) => void;
  options: Array<{ label: string; value: TValue }>;
  placeholder?: string;
  theme: Theme;
  value: TValue | "";
};

type InlineSheetSelectControlProps<TValue extends string> = SelectControlProps<TValue>;

export function SelectControl<TValue extends string>({
  disabled = false,
  onChange,
  options,
  placeholder = "Wybierz",
  theme,
  value
}: SelectControlProps<TValue>) {
  const selectedOption = options.find((option) => option.value === value);

  return (
    <Select
      isDisabled={disabled}
      selectedLabel={selectedOption?.label}
      selectedValue={value}
      onValueChange={(nextValue: string) => onChange(nextValue as TValue)}
    >
      <SelectTrigger
        style={[
          styles.gluestackSelectTrigger,
          {
            backgroundColor: disabled ? theme.secondaryBand : theme.control,
            borderColor: theme.border,
            opacity: disabled ? 0.72 : 1
          }
        ]}
      >
        <SelectInput
          placeholder={placeholder}
          style={[
            styles.gluestackSelectInput,
            { color: selectedOption ? theme.inputText : theme.muted }
          ]}
        />
        <SelectIcon as={ChevronDownIcon} color={theme.muted} mr="$3" />
      </SelectTrigger>

      <SelectPortal snapPoints={[45]}>
        <SelectBackdrop
          style={[
            styles.gluestackSelectBackdrop,
            { backgroundColor: theme.background }
          ]}
        />
        <SelectContent
          style={[
            styles.gluestackSelectContent,
            { backgroundColor: theme.card, borderColor: theme.border }
          ]}
        >
          <View style={styles.selectSheetHandleWrap}>
            <View style={[styles.selectSheetHandle, { backgroundColor: theme.border }]} />
          </View>
          <SelectScrollView style={styles.gluestackSelectScrollView}>
            {options.map((option) => (
              <SelectItem
                key={option.value}
                label={option.label}
                style={styles.gluestackSelectItem}
                value={option.value}
                textStyle={{ color: theme.text, fontWeight: "400" }}
              />
            ))}
          </SelectScrollView>
        </SelectContent>
      </SelectPortal>
    </Select>
  );
}

export function InlineSheetSelectControl<TValue extends string>({
  onChange,
  options,
  placeholder = "Wybierz",
  theme,
  value
}: InlineSheetSelectControlProps<TValue>) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);

  function selectOption(nextValue: TValue) {
    onChange(nextValue);
    setIsOpen(false);
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        style={[
          styles.gluestackSelectTrigger,
          { backgroundColor: theme.control, borderColor: theme.border }
        ]}
        onPress={() => setIsOpen(true)}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.gluestackSelectInput,
            { color: selectedOption ? theme.inputText : theme.muted }
          ]}
        >
          {selectedOption?.label ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={theme.muted} />
      </Pressable>

      <Modal
        animationType="slide"
        transparent
        visible={isOpen}
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.selectSheetRoot}>
          <Pressable
            accessibilityRole="button"
            style={[styles.selectSheetBackdrop, { backgroundColor: theme.background }]}
            onPress={() => setIsOpen(false)}
          />
          <View
            style={[
              styles.gluestackSelectContent,
              { backgroundColor: theme.card, borderColor: theme.border }
            ]}
          >
            <View style={styles.selectSheetHandleWrap}>
              <View style={[styles.selectSheetHandle, { backgroundColor: theme.border }]} />
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" style={styles.gluestackSelectScrollView}>
              {options.map((option) => {
                const isSelected = option.value === value;

                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    style={[
                      styles.inlineSelectItem,
                      { backgroundColor: isSelected ? theme.selectedOption : theme.card }
                    ]}
                    onPress={() => selectOption(option.value)}
                  >
                    <Text style={[styles.inlineSelectItemText, { color: theme.text }]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
