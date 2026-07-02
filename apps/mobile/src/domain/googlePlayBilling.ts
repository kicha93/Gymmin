import { Platform } from "react-native";

export type BillingProduct = {
  productId: string;
  localizedPrice?: string | null;
  title?: string | null;
};

export type BillingPurchase = {
  productId: string;
  purchaseToken: string;
  orderId?: string | null;
};

type ReactNativeIapModule = {
  initConnection?: () => Promise<boolean>;
  endConnection?: () => Promise<void>;
  fetchProducts?: (request: { skus: string[]; type?: "in-app" | "subs" | "all" }) => Promise<Array<Record<string, unknown>> | null>;
  getProducts?: (productIds: string[]) => Promise<Array<Record<string, unknown>>>;
  requestPurchase?: (options: unknown) => Promise<unknown>;
  getAvailablePurchases?: () => Promise<Array<Record<string, unknown>>>;
  purchaseErrorListener?: (listener: (error: unknown) => void) => { remove?: () => void };
  purchaseUpdatedListener?: (listener: (purchase: unknown) => void) => { remove?: () => void };
};

declare const require: ((moduleName: string) => unknown) | undefined;

export async function initBilling() {
  const iap = getIapModule();
  if (!iap || Platform.OS !== "android") {
    return false;
  }

  return await iap.initConnection?.() === true;
}

export async function getAiCreditProducts(productIds: string[]): Promise<BillingProduct[]> {
  const iap = getIapModule();
  if (!iap || Platform.OS !== "android" || productIds.length === 0) {
    return [];
  }

  const products =
    await iap.fetchProducts?.({ skus: productIds, type: "in-app" }) ??
    await iap.getProducts?.(productIds) ??
    [];
  return products.flatMap((product) => {
    const productId = readString(product, "productId") ?? readString(product, "sku") ?? readString(product, "id");
    if (!productId) {
      return [];
    }

    return [{
      localizedPrice: readString(product, "localizedPrice") ?? readString(product, "displayPrice") ?? readString(product, "price"),
      productId,
      title: readString(product, "title")
    }];
  });
}

export async function purchaseAiCreditPack(productId: string): Promise<BillingPurchase> {
  const iap = getIapModule();
  if (!iap || Platform.OS !== "android") {
    throw createBillingError("billing_unavailable", "Google Play Billing is unavailable in this build.");
  }

  await iap.initConnection?.();
  const result = await iap.requestPurchase?.({
    request: {
      android: { skus: [productId] },
      google: { skus: [productId] },
      ios: { sku: productId }
    },
    skus: [productId],
    sku: productId,
    type: "in-app"
  });
  const purchase = Array.isArray(result) ? result[0] : result;
  return normalizeBillingPurchase(purchase, productId);
}

export async function getPendingAiCreditPurchases(productIds: string[]): Promise<BillingPurchase[]> {
  const iap = getIapModule();
  if (!iap || Platform.OS !== "android") {
    return [];
  }

  await iap.initConnection?.();
  const purchases = await iap.getAvailablePurchases?.() ?? [];
  return purchases.flatMap((purchase) => {
    const productId = readString(purchase, "productId") ?? readString(purchase, "sku") ?? readString(purchase, "id");
    if (!productId || !productIds.includes(productId)) {
      return [];
    }

    try {
      return [normalizeBillingPurchase(purchase, productId)];
    } catch {
      return [];
    }
  });
}

export function mapBillingError(error: unknown): { code: string; message: string; isCancelled: boolean } {
  const record = isRecord(error) ? error : {};
  const code = readString(record, "code") ?? readString(record, "responseCode") ?? "billing_error";
  const message = readString(record, "message") ?? "Google Play Billing error.";
  const lower = `${code} ${message}`.toLowerCase();
  return {
    code,
    isCancelled: lower.includes("cancel"),
    message
  };
}

function normalizeBillingPurchase(value: unknown, fallbackProductId: string): BillingPurchase {
  if (!isRecord(value)) {
    throw createBillingError("billing_purchase_missing", "Billing purchase result was empty.");
  }

  const purchaseToken =
    readString(value, "purchaseToken") ??
    readString(value, "transactionReceipt") ??
    readString(value, "purchaseTokenAndroid");
  if (!purchaseToken) {
    throw createBillingError("billing_purchase_token_missing", "Billing purchase token was missing.");
  }

  return {
    orderId: readString(value, "orderId") ?? readString(value, "transactionId"),
    productId: readString(value, "productId") ?? readString(value, "sku") ?? readString(value, "id") ?? fallbackProductId,
    purchaseToken
  };
}

function getIapModule(): ReactNativeIapModule | null {
  try {
    if (typeof require !== "function") {
      return null;
    }

    return require("react-native-iap") as ReactNativeIapModule;
  } catch {
    return null;
  }
}

function createBillingError(code: string, message: string) {
  const error = new Error(message) as Error & { code?: string };
  error.code = code;
  return error;
}

function readString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
