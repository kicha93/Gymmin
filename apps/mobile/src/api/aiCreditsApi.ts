import {
  normalizeAiCreditBalance,
  normalizeAiCreditPacks,
  normalizeAiCreditPurchaseVerifyResponse,
  normalizeAiCreditTransactions,
  type AiCreditPurchaseVerifyResponse
} from "../domain/aiCredits";

type RequestApi = (endpoint: string, init?: RequestInit) => Promise<Response>;
type CreateApiError = (
  response: Response,
  endpoint: string,
  method: string,
  fallbackMessage: string
) => Promise<Error>;

export function createAiCreditsApiClient(dependencies: {
  createError: CreateApiError;
  request: RequestApi;
}) {
  async function requireSuccess(
    response: Response,
    endpoint: string,
    method: string,
    fallbackMessage: string
  ) {
    if (!response.ok) {
      throw await dependencies.createError(response, endpoint, method, fallbackMessage);
    }
    return response;
  }

  return {
    async loadOverview(headers: Record<string, string>, fallbackMessage: string) {
      const endpoints = {
        balance: "/api/ai-credits/balance",
        packs: "/api/ai-credits/packs",
        transactions: "/api/ai-credits/transactions?limit=50"
      } as const;
      const [balanceResponse, transactionsResponse, packsResponse] = await Promise.all([
        dependencies.request(endpoints.balance, { headers }),
        dependencies.request(endpoints.transactions, { headers }),
        dependencies.request(endpoints.packs, { headers })
      ]);
      const unauthorizedResponse = [balanceResponse, transactionsResponse, packsResponse]
        .find((response) => response.status === 401);
      if (unauthorizedResponse) {
        throw await dependencies.createError(
          unauthorizedResponse,
          "/api/ai-credits",
          "GET",
          fallbackMessage
        );
      }

      await requireSuccess(balanceResponse, endpoints.balance, "GET", fallbackMessage);
      const balance = normalizeAiCreditBalance(await balanceResponse.json().catch(() => null));
      const transactions = transactionsResponse.ok
        ? normalizeAiCreditTransactions(await transactionsResponse.json().catch(() => null))
        : null;
      const packs = packsResponse.ok
        ? normalizeAiCreditPacks(await packsResponse.json().catch(() => null))
        : null;
      return { balance, packs, transactions };
    },

    async verifyGooglePlayPurchase(
      purchase: { orderId?: string | null; productId: string; purchaseToken: string },
      headers: Record<string, string>,
      fallbackMessage: string
    ): Promise<AiCreditPurchaseVerifyResponse> {
      const endpoint = "/api/ai-credits/purchases/google-play/verify";
      const response = await dependencies.request(endpoint, {
        body: JSON.stringify({
          orderId: purchase.orderId ?? null,
          productId: purchase.productId,
          purchaseToken: purchase.purchaseToken
        }),
        headers: { ...headers, "Content-Type": "application/json" },
        method: "POST"
      });
      await requireSuccess(response, endpoint, "POST", fallbackMessage);
      const result = normalizeAiCreditPurchaseVerifyResponse(await response.json().catch(() => null));
      if (!result) {
        throw new Error(fallbackMessage);
      }
      return result;
    },

    async grantDevelopmentCredits(
      amount: number,
      reason: string,
      headers: Record<string, string>,
      fallbackMessage: string
    ) {
      const endpoint = "/api/ai-credits/dev/grant";
      const response = await dependencies.request(endpoint, {
        body: JSON.stringify({ amount, reason }),
        headers: { ...headers, "Content-Type": "application/json" },
        method: "POST"
      });
      await requireSuccess(response, endpoint, "POST", fallbackMessage);
      return normalizeAiCreditBalance(await response.json().catch(() => null));
    }
  };
}
