import { describe, expect, it, vi } from "vitest";

import { createBugReportsApiClient, type BugReportPayload } from "../../api/bugReportsApi";

const payload: BugReportPayload = {
  appVersion: "dev",
  description: "Something failed",
  device: { platform: "android" },
  diagnostics: { screen: "home" },
  language: "pl",
  screen: "Home",
  title: "Bug"
};

describe("bugReportsApi", () => {
  it("submits a report with its stable idempotency key", async () => {
    const request = vi.fn(async () => new Response(JSON.stringify({ id: "report-1" }), { status: 201 }));
    const client = createBugReportsApiClient({
      createError: async () => new Error("api error"),
      request
    });

    await expect(client.submit(payload, "bug-key", { Authorization: "Bearer token" }, "failed"))
      .resolves.toEqual({ id: "report-1" });
    expect(request).toHaveBeenCalledWith("/api/bug-reports", expect.objectContaining({
      headers: expect.objectContaining({ "X-Idempotency-Key": "bug-key" }),
      method: "POST"
    }));
  });

  it("uses backend details when creating a shared API error", async () => {
    const createError = vi.fn(async (_response: Response, _endpoint: string, _method: string, message: string) => new Error(message));
    const client = createBugReportsApiClient({
      createError,
      request: async () => new Response(JSON.stringify({ detail: "Report limit reached" }), { status: 429 })
    });

    await expect(client.submit(payload, "bug-key", {}, "failed")).rejects.toThrow("Report limit reached");
    expect(createError).toHaveBeenCalledWith(expect.any(Response), "/api/bug-reports", "POST", "Report limit reached");
  });

  it("rejects a malformed successful response", async () => {
    const client = createBugReportsApiClient({
      createError: async () => new Error("api error"),
      request: async () => new Response("{}", { status: 201 })
    });

    await expect(client.submit(payload, "bug-key", {}, "invalid response"))
      .rejects.toThrow("invalid response");
  });
});
