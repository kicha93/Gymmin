import { Ionicons } from "@expo/vector-icons";
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { AppButton, AppInput, PasswordInput } from "./AppControls";
import type { TranslationKey } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

type Translate = (key: TranslationKey) => string;

export type AuthMode = "login" | "register";

type LoginPanelProps = {
  authError: string;
  authMode: AuthMode;
  displayName: string;
  email: string;
  isAuthenticated: boolean;
  isAuthSubmitting: boolean;
  logIn: () => void;
  password: string;
  passwordConfirm: string;
  register: () => void;
  setAuthError: Dispatch<SetStateAction<string>>;
  setAuthMode: Dispatch<SetStateAction<AuthMode>>;
  setDisplayName: Dispatch<SetStateAction<string>>;
  setEmail: Dispatch<SetStateAction<string>>;
  setPassword: Dispatch<SetStateAction<string>>;
  setPasswordConfirm: Dispatch<SetStateAction<string>>;
  setShowLoginForm: Dispatch<SetStateAction<boolean>>;
  showLoginForm: boolean;
  t: Translate;
  theme: Theme;
  onDismiss?: () => void;
  onForgotPassword?: () => void;
};

export function LoginPanel({
  authError,
  authMode,
  displayName,
  email,
  isAuthenticated,
  isAuthSubmitting,
  logIn,
  password,
  passwordConfirm,
  register,
  setAuthError,
  setAuthMode,
  setDisplayName,
  setEmail,
  setPassword,
  setPasswordConfirm,
  setShowLoginForm,
  showLoginForm,
  t,
  theme,
  onDismiss,
  onForgotPassword
}: LoginPanelProps) {
  const isRegisterMode = authMode === "register";
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  function switchAuthMode(nextMode: AuthMode) {
    setAuthMode(nextMode);
    setAuthError("");
    setPasswordConfirm("");
  }

  if (isAuthenticated) {
    return null;
  }

  if (!showLoginForm) {
    return (
      <View style={[styles.loginPanel, { backgroundColor: theme.primaryStrong }]}>
        <View style={styles.loginPanelHeader}>
          <View style={styles.loginCopy}>
            <Text style={styles.loginEyebrow}>{t("userAccount")}</Text>
            <Text style={styles.loginTitle}>{t("loginIntro")}</Text>
          </View>
          {onDismiss ? (
            <Pressable
              accessibilityLabel={t("loginPanelDismiss")}
              accessibilityRole="button"
              style={styles.loginDismissButton}
              onPress={onDismiss}
            >
              <Ionicons name="close" size={22} color="#ffffff" />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.loginActions}>
          <AppButton
            icon="person-outline"
            style={styles.loginButton}
            textStyle={styles.loginButtonText}
            theme={theme}
            variant="light"
            onPress={() => {
              setAuthMode("login");
              setAuthError("");
              setShowLoginForm(true);
            }}
          >
            {t("loginCta")}
          </AppButton>
          <AppButton
            icon="person-add-outline"
            style={styles.loginButton}
            textStyle={styles.loginButtonText}
            theme={theme}
            variant="light"
            onPress={() => {
              setAuthMode("register");
              setAuthError("");
              setShowLoginForm(true);
            }}
          >
            {t("register")}
          </AppButton>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.authPanel, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.authHeader}>
        <View style={styles.loginCopy}>
          <Text style={[styles.authEyebrow, { color: theme.primary }]}>
            {isRegisterMode ? t("register") : t("login")}
          </Text>
          {isRegisterMode ? (
            <Text style={[styles.authTitle, { color: theme.text }]}>{t("createAccount")}</Text>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          style={styles.closeButton}
          onPress={onDismiss ?? (() => setShowLoginForm(false))}
        >
          <Ionicons name="close" size={22} color={theme.muted} />
        </Pressable>
      </View>

      <View style={styles.authFields}>
        <View style={[styles.authModeSwitch, { backgroundColor: theme.secondaryBand }]}>
          <Pressable
            accessibilityRole="button"
            style={[styles.authModeButton, authMode === "login" && { backgroundColor: theme.card }]}
            onPress={() => switchAuthMode("login")}
          >
            <Text
              style={[
                styles.authModeButtonText,
                { color: authMode === "login" ? theme.primary : theme.muted }
              ]}
            >
              {t("login")}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={[styles.authModeButton, authMode === "register" && { backgroundColor: theme.card }]}
            onPress={() => switchAuthMode("register")}
          >
            <Text
              style={[
                styles.authModeButtonText,
                { color: authMode === "register" ? theme.primary : theme.muted }
              ]}
            >
              {t("register")}
            </Text>
          </Pressable>
        </View>

        <View style={styles.authInputStack}>
          {isRegisterMode ? (
            <AppInput
              placeholder={t("username")}
              theme={theme}
              value={displayName}
              onChangeText={setDisplayName}
            />
          ) : null}
          <AppInput
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="email"
            theme={theme}
            value={email}
            onChangeText={setEmail}
          />
          <PasswordInput
            isVisible={isPasswordVisible}
            placeholder={t("password")}
            setIsVisible={setIsPasswordVisible}
            theme={theme}
            value={password}
            onChangeText={setPassword}
          />
          {isRegisterMode ? (
            <PasswordInput
              isVisible={isPasswordVisible}
              placeholder={t("passwordConfirm")}
              setIsVisible={setIsPasswordVisible}
              theme={theme}
              value={passwordConfirm}
              onChangeText={setPasswordConfirm}
            />
          ) : null}
        </View>

        {authError ? <Text style={[styles.authError, { color: theme.danger }]}>{authError}</Text> : null}

        {!isRegisterMode && onForgotPassword ? (
          <Pressable accessibilityRole="button" onPress={onForgotPassword}>
            <Text style={[styles.authForgotPassword, { color: theme.primary }]}>{t("forgotPassword")}</Text>
          </Pressable>
        ) : null}

        <View style={[styles.authButtonSpacer, isRegisterMode && styles.authRegisterButtonSpacer]} />
        <View style={styles.authButtonWrap}>
          <AppButton
            disabled={isAuthSubmitting}
            icon="log-in-outline"
            style={styles.authButton}
            textStyle={styles.authButtonText}
            theme={theme}
            onPress={isRegisterMode ? register : logIn}
          >
            {isAuthSubmitting
              ? isRegisterMode
                ? t("authRegisterSubmitting")
                : t("authLoginSubmitting")
              : isRegisterMode
                ? t("registerAction")
                : t("loginAction")}
          </AppButton>
        </View>
      </View>
    </View>
  );
}
