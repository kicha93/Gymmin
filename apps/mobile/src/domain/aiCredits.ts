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
};

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
      productId: item.productId.trim()
    }];
  }).filter((pack) => pack.credits > 0);
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
