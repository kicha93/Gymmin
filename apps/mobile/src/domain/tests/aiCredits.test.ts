import { describe, expect, it } from "vitest";

import {
  emptyAiCreditBalance,
  formatAiCreditPackName,
  getAiCreditPackDescription,
  getRecentAiCreditTransactions,
  isGooglePlayPurchaseError,
  isInsufficientAiCreditsError,
  normalizeAiCreditBalance,
  normalizeAiCreditPacks,
  normalizeAiCreditPurchaseVerifyResponse,
  normalizeAiCreditTransactions
} from "../aiCredits";
import { buildGooglePlayObfuscatedAccountId, mapBillingError } from "../googlePlayBilling";

describe("aiCredits", () => {
  it("normalizes balance response with safe fallbacks", () => {
    expect(normalizeAiCreditBalance({
      balance: 7.9,
      planCost: 2,
      rewriteCost: -1
    })).toEqual({
      balance: 7,
      planCost: 2,
      rewriteCost: emptyAiCreditBalance.rewriteCost
    });

    expect(normalizeAiCreditBalance(null)).toEqual(emptyAiCreditBalance);
  });

  it("normalizes transactions and drops malformed records", () => {
    const transactions = normalizeAiCreditTransactions({
      transactions: [
        {
          amount: -1,
          balanceAfter: 2,
          createdAt: "2026-06-30T10:00:00Z",
          id: " tx-1 ",
          reason: "WorkoutCreatorPlan",
          relatedJobId: "job-1",
          type: "Consume"
        },
        { amount: 10, id: "   " },
        null
      ]
    });

    expect(transactions).toEqual([
      {
        amount: -1,
        balanceAfter: 2,
        createdAt: "2026-06-30T10:00:00Z",
        id: "tx-1",
        reason: "WorkoutCreatorPlan",
        relatedJobId: "job-1",
        type: "Consume"
      }
    ]);
  });

  it("normalizes active credit packs", () => {
    const packs = normalizeAiCreditPacks({
      packs: [
        { active: true, credits: 10, displayName: "10 kredytow", localizedPrice: "9,99 zl", productId: " ai_tokens_10 " },
        { active: true, credits: 0, displayName: "Broken", productId: "broken" },
        { active: true, credits: 5, displayName: "Missing id" }
      ]
    });

    expect(packs).toEqual([
      {
        active: true,
        credits: 10,
        displayName: "10 kredytow",
        localizedPrice: "9,99 zl",
        productId: "ai_tokens_10"
      }
    ]);
  });

  it("formats user-facing credit pack copy with credit wording", () => {
    expect(formatAiCreditPackName(1, "pl")).toBe("1 kredyt");
    expect(formatAiCreditPackName(1, "en")).toBe("1 credit");
    expect(formatAiCreditPackName(3, "pl")).toBe("3 kredyty");
    expect(formatAiCreditPackName(10, "pl")).toBe("10 kredytów");
    expect(formatAiCreditPackName(10, "en")).toBe("10 credits");
    expect(getAiCreditPackDescription(1, "pl")).toBe("Idealne na start.");
    expect(getAiCreditPackDescription(3, "en")).toBe("Good for regular plan changes.");
    expect(getAiCreditPackDescription(10, "pl")).toBe("Najlepsze dla częstego korzystania.");
  });

  it("limits recent credit transactions preview", () => {
    const transactions = normalizeAiCreditTransactions({
      transactions: [
        { amount: -1, balanceAfter: 2, createdAt: "2026-06-30T10:00:00Z", id: "tx-1", type: "Consume" },
        { amount: 10, balanceAfter: 12, createdAt: "2026-06-30T11:00:00Z", id: "tx-2", type: "Purchase" },
        { amount: -1, balanceAfter: 11, createdAt: "2026-06-30T12:00:00Z", id: "tx-3", type: "Consume" },
        { amount: -1, balanceAfter: 10, createdAt: "2026-06-30T13:00:00Z", id: "tx-4", type: "Consume" }
      ]
    });

    expect(getRecentAiCreditTransactions(transactions)).toHaveLength(3);
    expect(getRecentAiCreditTransactions(transactions).map((transaction) => transaction.id)).toEqual(["tx-1", "tx-2", "tx-3"]);
  });

  it("normalizes Google Play purchase verification responses", () => {
    expect(normalizeAiCreditPurchaseVerifyResponse({
      balance: 13,
      creditsAdded: 10,
      purchaseId: " purchase-1 ",
      status: "credited",
      transactionId: "tx-1"
    })).toEqual({
      balance: 13,
      creditsAdded: 10,
      purchaseId: "purchase-1",
      status: "credited",
      transactionId: "tx-1"
    });

    expect(normalizeAiCreditPurchaseVerifyResponse({ status: "credited" })).toBeNull();
  });

  it("detects insufficient credit errors without relying on UI text", () => {
    expect(isInsufficientAiCreditsError({ code: "insufficient_ai_credits" })).toBe(true);
    expect(isInsufficientAiCreditsError(new Error("Not enough AI credits"))).toBe(true);
    expect(isInsufficientAiCreditsError({ code: "network_error" })).toBe(false);
  });

  it("detects Google Play purchase API errors", () => {
    expect(isGooglePlayPurchaseError({ code: "invalid_google_play_purchase" })).toBe(true);
    expect(isGooglePlayPurchaseError({ code: "purchase_token_already_used" })).toBe(true);
    expect(isGooglePlayPurchaseError({ code: "google_play_api_unavailable" })).toBe(true);
    expect(isGooglePlayPurchaseError({ code: "rate_limited" })).toBe(false);
  });

  it("maps billing cancellation errors", () => {
    expect(mapBillingError({ code: "E_USER_CANCELLED", message: "User cancelled purchase" })).toEqual({
      code: "E_USER_CANCELLED",
      isCancelled: true,
      message: "User cancelled purchase"
    });
  });

  it("builds a stable non-PII Google Play account identifier", () => {
    expect(buildGooglePlayObfuscatedAccountId("A1234567890BCDEF1234567890ABCDEF"))
      .toBe("gymmin_a1234567890bcdef1234567890abcdef");
    expect(() => buildGooglePlayObfuscatedAccountId("user@example.com"))
      .toThrow("account identifier is invalid");
  });
});
