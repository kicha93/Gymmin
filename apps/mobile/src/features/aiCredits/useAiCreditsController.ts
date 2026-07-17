import { useEffect, useState } from "react";

import type { createAiCreditsApiClient } from "../../api/aiCreditsApi";
import {
  emptyAiCreditBalance,
  type AiCreditPack
} from "../../domain/aiCredits";
import { addDiagnosticEvent } from "../../domain/appDiagnostics";
import { getErrorMessageOrFallback } from "../../domain/apiErrors";
import type { UserSession } from "../../domain/auth";
import {
  getAiCreditProducts,
  getPendingAiCreditPurchases,
  initBilling,
  mapBillingError,
  purchaseAiCreditPack
} from "../../domain/googlePlayBilling";
import type { TranslationKey } from "../../i18n/translations";

type AiCreditsApi = ReturnType<typeof createAiCreditsApiClient>;

type UseAiCreditsControllerOptions = {
  api: AiCreditsApi;
  getHeaders: (session: UserSession) => Record<string, string>;
  onUnauthorized: () => void;
  t: (key: TranslationKey) => string;
  user: UserSession | null;
};

export function useAiCreditsController(options: UseAiCreditsControllerOptions) {
  const [balance, setBalance] = useState(emptyAiCreditBalance);
  const [transactions, setTransactions] = useState<import("../../domain/aiCredits").AiCreditTransaction[]>([]);
  const [packs, setPacks] = useState<AiCreditPack[]>([]);
  const [error, setError] = useState("");
  const [purchaseMessage, setPurchaseMessage] = useState("");
  const [canRestorePurchases, setCanRestorePurchases] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPurchaseLoading, setIsPurchaseLoading] = useState(false);

  async function refresh(session = options.user) {
    if (!session) {
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const overview = await options.api.loadOverview(options.getHeaders(session), options.t("aiCreditsLoadError"));
      setBalance(overview.balance);
      if (overview.transactions) {
        setTransactions(overview.transactions);
      }
      if (overview.packs) {
        const products = await getAiCreditProducts(overview.packs.map((pack) => pack.productId)).catch(() => []);
        setPacks(overview.packs.map((pack) => {
          const product = products.find((item) => item.productId === pack.productId);
          return product?.localizedPrice ? { ...pack, localizedPrice: product.localizedPrice } : pack;
        }));
      }
    } catch (caughtError) {
      if ((caughtError as { status?: number }).status === 401) {
        options.onUnauthorized();
        return;
      }
      console.error("Failed to load AI credits", caughtError);
      setError(getErrorMessageOrFallback(
        caughtError,
        options.t("aiCreditsLoadError"),
        options.t("serverProblemMessage")
      ));
    } finally {
      setIsLoading(false);
    }
  }

  async function verifyPurchase(
    purchase: { productId: string; purchaseToken: string; orderId?: string | null },
    session = options.user
  ) {
    if (!session) {
      return null;
    }
    try {
      const result = await options.api.verifyGooglePlayPurchase(
        purchase,
        options.getHeaders(session),
        options.t("aiCreditsPurchaseVerifyError")
      );
      setBalance((current) => ({ ...current, balance: result.balance }));
      setPurchaseMessage(result.status === "already_processed"
        ? options.t("aiCreditsPurchaseCompleted")
        : options.t("aiCreditsPurchaseAdded"));
      setCanRestorePurchases(false);
      await refresh(session);
      return result;
    } catch (caughtError) {
      if ((caughtError as { status?: number }).status === 401) {
        options.onUnauthorized();
        return null;
      }
      throw caughtError;
    }
  }

  async function buyPack(pack: AiCreditPack) {
    const user = options.user;
    if (!user || isPurchaseLoading || !pack.active) {
      return;
    }
    setIsPurchaseLoading(true);
    setError("");
    setPurchaseMessage(options.t("aiCreditsPreparingPurchase"));
    setCanRestorePurchases(false);
    try {
      if (!(await initBilling())) {
        throw new Error(options.t("aiCreditsBillingUnavailable"));
      }
      setPurchaseMessage(options.t("aiCreditsProcessingPurchase"));
      const purchase = await purchaseAiCreditPack(pack.productId, user.id);
      addDiagnosticEvent({
        area: "ai",
        extra: { orderId: purchase.orderId ?? null, productId: purchase.productId },
        level: "info",
        message: "Google Play purchase returned for verification",
        screen: "aiCredits"
      });
      await verifyPurchase(purchase, user);
    } catch (caughtError) {
      const billingError = mapBillingError(caughtError);
      if (billingError.isCancelled) {
        setPurchaseMessage(options.t("aiCreditsPurchaseCancelled"));
      } else {
        console.error("Failed to buy AI credits", caughtError);
        setError(getErrorMessageOrFallback(
          caughtError,
          options.t("aiCreditsPurchaseVerifyError"),
          options.t("serverProblemMessage")
        ));
        setPurchaseMessage("");
        setCanRestorePurchases(true);
      }
    } finally {
      setIsPurchaseLoading(false);
    }
  }

  async function restorePurchases() {
    const user = options.user;
    if (!user || isPurchaseLoading) {
      return;
    }
    setIsPurchaseLoading(true);
    setError("");
    setPurchaseMessage(options.t("aiCreditsProcessingPurchase"));
    try {
      const pendingPurchases = await getPendingAiCreditPurchases(packs.map((pack) => pack.productId));
      if (!pendingPurchases.length) {
        setPurchaseMessage("");
        setCanRestorePurchases(false);
        return;
      }
      setCanRestorePurchases(true);
      for (const purchase of pendingPurchases) {
        await verifyPurchase(purchase, user);
      }
    } catch (caughtError) {
      console.error("Failed to restore AI credit purchases", caughtError);
      setError(getErrorMessageOrFallback(
        caughtError,
        options.t("aiCreditsPurchaseVerifyError"),
        options.t("serverProblemMessage")
      ));
      setPurchaseMessage("");
      setCanRestorePurchases(true);
    } finally {
      setIsPurchaseLoading(false);
    }
  }

  async function grantDevelopmentCredits() {
    const user = options.user;
    if (!user || isLoading) {
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      setBalance(await options.api.grantDevelopmentCredits(
        10,
        "Mobile dev top-up",
        options.getHeaders(user),
        options.t("aiCreditsLoadError")
      ));
      await refresh(user);
    } catch (caughtError) {
      if ((caughtError as { status?: number }).status === 401) {
        options.onUnauthorized();
        return;
      }
      console.error("Failed to grant development AI credits", caughtError);
      setError(getErrorMessageOrFallback(
        caughtError,
        options.t("aiCreditsLoadError"),
        options.t("serverProblemMessage")
      ));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!options.user) {
      setBalance(emptyAiCreditBalance);
      setTransactions([]);
      setPacks([]);
      setError("");
      return;
    }
    void refresh(options.user);
  }, [options.user?.id, options.user?.token]);

  return {
    balance,
    buyPack,
    canRestorePurchases,
    error,
    grantDevelopmentCredits,
    isLoading,
    isPurchaseLoading,
    packs,
    purchaseMessage,
    refresh,
    restorePurchases,
    transactions
  };
}
