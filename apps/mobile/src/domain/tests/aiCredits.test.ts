import { describe, expect, it } from "vitest";

import {
  emptyAiCreditBalance,
  isInsufficientAiCreditsError,
  normalizeAiCreditBalance,
  normalizeAiCreditPacks,
  normalizeAiCreditTransactions
} from "../aiCredits";

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
        { active: true, credits: 10, displayName: "10 tokenów AI", productId: " ai_tokens_10 " },
        { active: true, credits: 0, displayName: "Broken", productId: "broken" },
        { active: true, credits: 5, displayName: "Missing id" }
      ]
    });

    expect(packs).toEqual([
      {
        active: true,
        credits: 10,
        displayName: "10 tokenów AI",
        productId: "ai_tokens_10"
      }
    ]);
  });

  it("detects insufficient credit errors without relying on UI text", () => {
    expect(isInsufficientAiCreditsError({ code: "insufficient_ai_credits" })).toBe(true);
    expect(isInsufficientAiCreditsError(new Error("Not enough AI credits"))).toBe(true);
    expect(isInsufficientAiCreditsError({ code: "network_error" })).toBe(false);
  });
});
