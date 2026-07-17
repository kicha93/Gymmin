import { describe, expect, it, vi } from "vitest";

import { createAiCreditsApiClient } from "../../api/aiCreditsApi";

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    headers: { "Content-Type": "application/json" },
    status
  });
}

describe("aiCreditsApi", () => {
  it("loads and normalizes the credits overview", async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ balance: 4, planCost: 1, rewriteCost: 1 }))
      .mockResolvedValueOnce(jsonResponse({ transactions: [{ amount: -1, balanceAfter: 4, id: "tx-1", type: "Consume" }] }))
      .mockResolvedValueOnce(jsonResponse({ packs: [{ active: true, credits: 3, productId: "pack-3" }] }));
    const client = createAiCreditsApiClient({
      createError: async () => new Error("api error"),
      request
    });

    await expect(client.loadOverview({ Authorization: "Bearer token" }, "fallback"))
      .resolves.toMatchObject({
        balance: { balance: 4 },
        packs: [{ credits: 3, productId: "pack-3" }],
        transactions: [{ id: "tx-1" }]
      });
  });

  it("routes unauthorized overview responses through the shared API error", async () => {
    const createError = vi.fn(async () => Object.assign(new Error("unauthorized"), { status: 401 }));
    const request = vi.fn()
      .mockResolvedValueOnce(jsonResponse({}, 200))
      .mockResolvedValueOnce(jsonResponse({}, 401))
      .mockResolvedValueOnce(jsonResponse({}, 200));
    const client = createAiCreditsApiClient({ createError, request });

    await expect(client.loadOverview({}, "fallback")).rejects.toMatchObject({ status: 401 });
    expect(createError).toHaveBeenCalledOnce();
  });

  it("validates purchase verification responses", async () => {
    const client = createAiCreditsApiClient({
      createError: async () => new Error("api error"),
      request: async () => jsonResponse({ balance: 7, creditsAdded: 3, purchaseId: "purchase-1", status: "credited" })
    });

    await expect(client.verifyGooglePlayPurchase({
      productId: "pack-3",
      purchaseToken: "token"
    }, {}, "fallback")).resolves.toMatchObject({ balance: 7, purchaseId: "purchase-1" });
  });
});
