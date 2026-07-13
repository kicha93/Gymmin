import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { AppButton } from "../components/AppControls";
import {
  formatAiCreditPackName,
  getAiCreditPackDescription,
  getRecentAiCreditTransactions,
  type AiCreditBalance,
  type AiCreditPack,
  type AiCreditTransaction
} from "../domain/aiCredits";
import type { LanguageCode, TranslationKey } from "../i18n/translations";
import { styles } from "../theme/appStyles";
import type { Theme } from "../theme/theme";

type AiCreditsScreenProps = {
  balance: AiCreditBalance;
  canRestorePurchases: boolean;
  error: string;
  isDevBuild: boolean;
  isLoading: boolean;
  isPurchaseLoading: boolean;
  language: LanguageCode;
  packs: AiCreditPack[];
  purchaseMessage: string;
  t: (key: TranslationKey) => string;
  theme: Theme;
  transactions: AiCreditTransaction[];
  onBuyPack: (pack: AiCreditPack) => void;
  onGrantDevCredits: () => void;
  onRefresh: () => void;
  onRestorePurchases: () => void;
};

export function AiCreditsScreen({
  balance,
  canRestorePurchases,
  error,
  isDevBuild,
  isLoading,
  isPurchaseLoading,
  language,
  onBuyPack,
  onGrantDevCredits,
  onRefresh,
  onRestorePurchases,
  packs,
  purchaseMessage,
  t,
  theme,
  transactions
}: AiCreditsScreenProps) {
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const visibleTransactions = useMemo(
    () => showAllTransactions ? transactions : getRecentAiCreditTransactions(transactions, 3),
    [showAllTransactions, transactions]
  );

  return (
    <View style={styles.aiCreditsScreen}>
      <View style={[styles.aiCreditsBalanceCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.panelHeroHeader}>
          <View style={[styles.aiCreditsHeroIcon, { backgroundColor: theme.secondaryBand }]}>
            <Ionicons name="sparkles-outline" size={26} color={theme.primary} />
          </View>
          <View style={styles.workoutInfo}>
            <Text style={[styles.creatorPromptTitle, { color: theme.text }]}>{t("aiCredits")}</Text>
            <Text style={[styles.creatorDescription, { color: theme.muted }]}>{t("aiCreditsDescription")}</Text>
          </View>
        </View>

        <Text style={[styles.workoutMeta, { color: theme.muted }]}>{t("aiCreditsAvailable")}</Text>
        <Text style={[styles.aiCreditsBalanceValue, { color: theme.primary }]}>{balance.balance}</Text>
        <View style={[styles.aiCreditsDivider, { backgroundColor: theme.border }]} />
        <Text style={[styles.workoutMeta, { color: theme.muted }]}>
          {t("aiCreditsPlanCost")}: {balance.planCost} · {t("aiCreditsRewriteCost")}: {balance.rewriteCost}
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={isLoading || isPurchaseLoading}
          style={styles.aiCreditsRefreshFooterButton}
          onPress={onRefresh}
        >
          <Ionicons name="refresh-outline" size={18} color={theme.primary} />
          <Text style={[styles.aiCreditsRefreshText, { color: theme.primary }]}>
            {isLoading ? t("aiCreatorSubmitting") : t("refresh")}
          </Text>
        </Pressable>
      </View>

      {error ? <Text style={[styles.authError, { color: theme.danger }]}>{error}</Text> : null}
      {purchaseMessage ? (
        <Text style={[styles.workoutMeta, { color: theme.primary }]}>{purchaseMessage}</Text>
      ) : null}

      {isDevBuild ? (
        <AppButton
          disabled={isLoading || isPurchaseLoading}
          icon="add-circle-outline"
          theme={theme}
          variant="outline"
          onPress={onGrantDevCredits}
        >
          {t("aiCreditsDevGrant")}
        </AppButton>
      ) : null}

      <View style={styles.fieldGroup}>
        <Text style={[styles.creatorSectionTitle, { color: theme.text }]}>{t("aiCreditsPackages")}</Text>
        {packs.length ? (
          <View style={styles.aiCreditsPackageList}>
            {packs.slice(0, 3).map((pack) => (
              <View
                key={pack.productId}
                style={[styles.aiCreditsPackageCard, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <View style={[styles.aiCreditsPackageBadge, { backgroundColor: theme.secondaryBand }]}>
                  <Text style={[styles.aiCreditsPackageBadgeText, { color: theme.primary }]}>{pack.credits}</Text>
                </View>
                <View style={styles.workoutInfo}>
                  <Text style={[styles.aiCreditsPackageTitle, { color: theme.text }]}>
                    {formatAiCreditPackName(pack.credits, language)}
                  </Text>
                  <Text style={[styles.aiCreditsPackageDescription, { color: theme.muted }]}>
                    {getAiCreditPackDescription(pack.credits, language)}
                  </Text>
                </View>
                <View style={styles.aiCreditsPackageAction}>
                  {pack.localizedPrice ? (
                    <Text style={[styles.aiCreditsPackagePrice, { color: theme.text }]}>{pack.localizedPrice}</Text>
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    disabled={isPurchaseLoading || !pack.active}
                    style={({ pressed }) => [
                      styles.aiCreditsPackageButton,
                      {
                        backgroundColor: theme.primary,
                        opacity: pressed || isPurchaseLoading || !pack.active ? 0.72 : 1
                      }
                    ]}
                    onPress={() => onBuyPack(pack)}
                  >
                    <Text style={[styles.aiCreditsPackageButtonText, { color: theme.white }]}>
                      {isPurchaseLoading ? t("aiCreditsProcessingPurchase") : t("aiCreditsBuyNow")}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[styles.workoutMeta, { color: theme.muted }]}>{t("aiCreditsPurchaseSoon")}</Text>
        )}
      </View>

      <View style={styles.fieldGroup}>
        <View style={styles.aiCreditsSectionHeader}>
          <Text style={[styles.creatorSectionTitle, { color: theme.text }]}>{t("aiCreditsRecentTransactions")}</Text>
          {transactions.length > 3 && !showAllTransactions ? (
            <Pressable accessibilityRole="button" onPress={() => setShowAllTransactions(true)}>
              <Text style={[styles.aiCreditsViewAllText, { color: theme.primary }]}>{t("aiCreditsViewAll")}</Text>
            </Pressable>
          ) : null}
        </View>
        {visibleTransactions.length ? (
          <View style={[styles.aiCreditsTransactionsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {visibleTransactions.map((transaction, index) => (
              <View
                key={transaction.id}
                style={[
                  styles.aiCreditsTransactionRow,
                  { borderBottomColor: theme.border },
                  index === visibleTransactions.length - 1 ? styles.aiCreditsTransactionRowLast : null
                ]}
              >
                <View style={[styles.aiCreditsTransactionIcon, { backgroundColor: theme.primary }]}>
                  <Ionicons name="sparkles-outline" size={17} color={theme.white} />
                </View>
                <View style={styles.workoutInfo}>
                  <Text style={[styles.workoutName, { color: theme.text }]}>
                    {formatTransactionTitle(transaction, language, t)}
                  </Text>
                  <Text style={[styles.workoutMeta, { color: theme.muted }]}>
                    {formatTransactionDate(transaction.createdAt, language, t("noData"))}
                  </Text>
                </View>
                <Text style={[styles.workoutName, { color: transaction.amount < 0 ? theme.danger : theme.primary }]}>
                  {formatCreditAmount(transaction.amount, language)}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={[styles.aiCreditsTransactionsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.workoutMeta, { color: theme.muted }]}>{t("aiCreditsNoTransactions")}</Text>
          </View>
        )}
      </View>

      <View style={[styles.aiCreditsInfoCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.creatorSectionTitle, { color: theme.text }]}>{t("aiCreditsInfo")}</Text>
        {[t("aiCreditsInfoAccount"), t("aiCreditsInfoUsage"), t("aiCreditsInfoRefund")].map((item) => (
          <View key={item} style={styles.aiCreditsInfoRow}>
            <View style={[styles.aiCreditsInfoBullet, { backgroundColor: theme.primary }]} />
            <Text style={[styles.workoutMeta, styles.aiCreditsInfoText, { color: theme.muted }]}>{item}</Text>
          </View>
        ))}
        {canRestorePurchases ? (
          <Pressable
            accessibilityRole="button"
            disabled={isPurchaseLoading || !packs.length}
            style={styles.aiCreditsRestoreLink}
            onPress={onRestorePurchases}
          >
            <Ionicons name="reload-outline" size={16} color={theme.primary} />
            <Text style={[styles.aiCreditsViewAllText, { color: theme.primary }]}>{t("aiCreditsRestorePurchases")}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function formatTransactionDate(value: string, language: LanguageCode, fallback: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return fallback;
  }

  return date.toLocaleString(language === "pl" ? "pl-PL" : "en-US", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatTransactionTitle(
  transaction: AiCreditTransaction,
  language: LanguageCode,
  t: (key: TranslationKey) => string
) {
  const reason = (transaction.reason ?? "").toLowerCase();
  if (reason.includes("rewrite")) {
    return language === "pl" ? "Modyfikacja treningu" : "Workout modification";
  }

  if (reason.includes("plan")) {
    return language === "pl" ? "Wygenerowanie planu" : "Plan generation";
  }

  if (transaction.type.toLowerCase() === "purchase" || reason.includes("purchase")) {
    const credits = Math.abs(transaction.amount);
    return language === "pl" ? `Zakup pakietu ${credits} kredytów` : `${credits} credit package purchase`;
  }

  return transaction.amount < 0 ? t("aiCreditsUsed") : t("aiCreditsAdded");
}

function formatCreditAmount(amount: number, language: LanguageCode) {
  const suffix = Math.abs(amount) === 1
    ? (language === "pl" ? "kredyt" : "credit")
    : (language === "pl" ? "kredytów" : "credits");

  return `${amount > 0 ? "+" : ""}${amount} ${suffix}`;
}
