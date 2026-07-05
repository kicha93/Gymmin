export type AiCreditBalance = {
  balance: number;
  planCost: number;
  rewriteCost: number;
};

export type AiCreditTransaction = {
  id: string;
  amount: number;
  type: string;
  reason?: string | null;
  relatedJobId?: string | null;
  balanceAfter: number;
  createdAt: string;
};

export type AiCreditPack = {
  productId: string;
  credits: number;
  displayName: string;
  active: boolean;
  localizedPrice?: string | null;
};

export type AiCreditPurchaseVerifyResponse = {
  status: "credited" | "already_processed" | "credited_consume_pending" | string;
  creditsAdded: number;
  balance: number;
  transactionId?: string | null;
  purchaseId: string;
};

export type AiCreditDisplayLanguage = "pl" | "en";

export const emptyAiCreditBalance: AiCreditBalance = {
  balance: 0,
  planCost: 1,
  rewriteCost: 1
};

export function normalizeAiCreditBalance(value: unknown): AiCreditBalance {
  const record = isRecord(value) ? value : {};
  return {
    balance: normalizeNonNegativeInteger(record.balance, emptyAiCreditBalance.balance),
    planCost: normalizeNonNegativeInteger(record.planCost, emptyAiCreditBalance.planCost),
    rewriteCost: normalizeNonNegativeInteger(record.rewriteCost, emptyAiCreditBalance.rewriteCost)
  };
}

export function normalizeAiCreditTransactions(value: unknown): AiCreditTransaction[] {
  const transactions = isRecord(value) && Array.isArray(value.transactions) ? value.transactions : [];

  return transactions.flatMap((item) => {
    if (!isRecord(item) || typeof item.id !== "string" || !item.id.trim()) {
      return [];
    }

    return [{
      amount: normalizeInteger(item.amount, 0),
      balanceAfter: normalizeNonNegativeInteger(item.balanceAfter, 0),
      createdAt: typeof item.createdAt === "string" ? item.createdAt : "",
      id: item.id.trim(),
      reason: typeof item.reason === "string" ? item.reason : null,
      relatedJobId: typeof item.relatedJobId === "string" ? item.relatedJobId : null,
      type: typeof item.type === "string" ? item.type : ""
    }];
  });
}

export function normalizeAiCreditPacks(value: unknown): AiCreditPack[] {
  const packs = isRecord(value) && Array.isArray(value.packs) ? value.packs : [];

  return packs.flatMap((item) => {
    if (!isRecord(item) || typeof item.productId !== "string" || !item.productId.trim()) {
      return [];
    }

    return [{
      active: item.active === true,
      credits: normalizeNonNegativeInteger(item.credits, 0),
      displayName: typeof item.displayName === "string" ? item.displayName : item.productId,
      localizedPrice: typeof item.localizedPrice === "string" ? item.localizedPrice : null,
      productId: item.productId.trim()
    }];
  }).filter((pack) => pack.credits > 0);
}

export function formatAiCreditPackName(credits: number, language: AiCreditDisplayLanguage) {
  if (language === "pl") {
    if (credits === 1) {
      return "1 kredyt";
    }

    const lastTwoDigits = credits % 100;
    const lastDigit = credits % 10;
    const suffix = lastDigit >= 2 && lastDigit <= 4 && !(lastTwoDigits >= 12 && lastTwoDigits <= 14)
      ? "kredyty"
      : "kredytów";

    return `${credits} ${suffix}`;
  }

  return credits === 1 ? "1 credit" : `${credits} credits`;
}

export function getAiCreditPackDescription(credits: number, language: AiCreditDisplayLanguage) {
  if (credits >= 10) {
    return language === "pl" ? "Najlepsze dla częstego korzystania." : "Best for frequent use.";
  }

  if (credits >= 3) {
    return language === "pl" ? "Dobre do regularnych zmian planu." : "Good for regular plan changes.";
  }

  return language === "pl" ? "Idealne na start." : "Great to start.";
}

export function getRecentAiCreditTransactions(transactions: AiCreditTransaction[], limit = 3) {
  return transactions.slice(0, Math.max(0, limit));
}

export function normalizeAiCreditPurchaseVerifyResponse(value: unknown): AiCreditPurchaseVerifyResponse | null {
  if (!isRecord(value) || typeof value.purchaseId !== "string" || !value.purchaseId.trim()) {
    return null;
  }

  return {
    balance: normalizeNonNegativeInteger(value.balance, 0),
    creditsAdded: normalizeNonNegativeInteger(value.creditsAdded, 0),
    purchaseId: value.purchaseId.trim(),
    status: typeof value.status === "string" ? value.status : "",
    transactionId: typeof value.transactionId === "string" ? value.transactionId : null
  };
}

export function isGooglePlayPurchaseError(error: unknown): boolean {
  if (!isRecord(error)) {
    return false;
  }

  return typeof error.code === "string" && (
    error.code === "invalid_google_play_purchase" ||
    error.code === "purchase_token_already_used" ||
    error.code.startsWith("google_play_")
  );
}

export function isInsufficientAiCreditsError(error: unknown): boolean {
  if (!isRecord(error)) {
    return false;
  }

  return error.code === "insufficient_ai_credits" || error.message === "Not enough AI credits";
}

function normalizeNonNegativeInteger(value: unknown, fallback: number) {
  const parsed = normalizeInteger(value, fallback);
  return parsed < 0 ? fallback : parsed;
}

function normalizeInteger(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
