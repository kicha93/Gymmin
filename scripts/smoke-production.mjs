import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";

const requestTimeoutMs = 15_000;
const forbiddenProductionHosts = [
  /(^|\.)localhost$/iu,
  /\.trycloudflare\.com$/iu,
  /\.ngrok(?:-free)?\.(?:app|io)$/iu,
];

export function normalizeProductionBaseUrl(value) {
  if (!value) {
    throw new Error(
      "Production base URL is required as the first argument or GYMMIN_PRODUCTION_BASE_URL.",
    );
  }

  const url = new URL(value);
  if (url.protocol !== "https:") {
    throw new Error("Production smoke requires an HTTPS base URL.");
  }
  if (url.username || url.password) {
    throw new Error("Production base URL must not contain credentials.");
  }
  if (
    forbiddenProductionHosts.some((pattern) => pattern.test(url.hostname)) ||
    /^127\./u.test(url.hostname) ||
    url.hostname === "::1"
  ) {
    throw new Error("Production smoke rejects local and temporary tunnel hosts.");
  }

  url.pathname = url.pathname.replace(/\/+$/u, "");
  url.search = "";
  url.hash = "";
  return url;
}

function assertCommonSecurityHeaders(response, requestUrl) {
  const headers = response.headers;
  assert.equal(
    headers.get("x-content-type-options")?.toLowerCase(),
    "nosniff",
    `${requestUrl}: missing X-Content-Type-Options`,
  );
  assert.equal(
    headers.get("x-frame-options")?.toUpperCase(),
    "DENY",
    `${requestUrl}: missing X-Frame-Options`,
  );
  assert.match(
    headers.get("content-security-policy") ?? "",
    /frame-ancestors\s+'none'/iu,
    `${requestUrl}: restrictive Content-Security-Policy is missing`,
  );
  assert.match(
    headers.get("strict-transport-security") ?? "",
    /max-age=\d+/iu,
    `${requestUrl}: HSTS is missing`,
  );

  const server = headers.get("server") ?? "";
  assert.doesNotMatch(
    server,
    /(?:Kestrel|Microsoft-IIS|nginx\/\d|Apache\/\d)/iu,
    `${requestUrl}: Server header discloses software/version`,
  );
}

async function request(fetchImpl, url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetchImpl(url, {
      headers: { "User-Agent": "Gymmin-production-smoke/1.0" },
      redirect: "error",
      signal: controller.signal,
    });
    assert.equal(response.status, 200, `${url}: expected HTTP 200`);
    assertCommonSecurityHeaders(response, url);
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

async function assertJsonStatus(fetchImpl, baseUrl, path, expectedStatus, exactKeys) {
  const requestUrl = new URL(path, baseUrl).toString();
  const response = await request(fetchImpl, requestUrl);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^application\/json\b/iu,
    `${requestUrl}: expected JSON response`,
  );
  assert.match(
    response.headers.get("cache-control") ?? "",
    /(?:^|,)\s*no-store(?:,|$)/iu,
    `${requestUrl}: expected Cache-Control: no-store`,
  );
  const body = await response.json();
  assert.equal(body.status, expectedStatus, `${requestUrl}: unexpected status body`);
  if (exactKeys) {
    assert.deepEqual(
      Object.keys(body).sort(),
      exactKeys.toSorted(),
      `${requestUrl}: production response exposes unexpected fields`,
    );
  }
}

async function assertPublicHtml(fetchImpl, baseUrl, path) {
  const requestUrl = new URL(path, baseUrl).toString();
  const response = await request(fetchImpl, requestUrl);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/iu,
    `${requestUrl}: expected HTML response`,
  );
  const body = await response.text();
  assert.ok(body.length >= 500, `${requestUrl}: public document is unexpectedly short`);
}

export async function runProductionSmoke(baseUrl, fetchImpl = fetch) {
  await assertJsonStatus(fetchImpl, baseUrl, "/health/live", "ok");
  await assertJsonStatus(fetchImpl, baseUrl, "/health/ready", "ready");
  await assertJsonStatus(fetchImpl, baseUrl, "/api/health", "ok", ["status"]);
  await assertPublicHtml(fetchImpl, baseUrl, "/privacy?lang=pl");
  await assertPublicHtml(fetchImpl, baseUrl, "/privacy?lang=en");
  await assertPublicHtml(fetchImpl, baseUrl, "/account-deletion?lang=pl");
  await assertPublicHtml(fetchImpl, baseUrl, "/account-deletion?lang=en");
}

async function runSelfTest() {
  const secureHeaders = {
    "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
    "strict-transport-security": "max-age=15552000",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
  };
  const mockFetch = async (url) => {
    const path = new URL(url).pathname;
    const status = path === "/health/ready" ? "ready" : "ok";
    const isDocument = path === "/privacy" || path === "/account-deletion";
    return new Response(
      isDocument ? "x".repeat(500) : JSON.stringify({ status }),
      {
        status: 200,
        headers: {
          ...secureHeaders,
          "cache-control": isDocument ? "no-cache" : "no-store",
          "content-type": isDocument
            ? "text/html; charset=utf-8"
            : "application/json; charset=utf-8",
        },
      },
    );
  };

  const baseUrl = normalizeProductionBaseUrl("https://api.gymmin.example/");
  await runProductionSmoke(baseUrl, mockFetch);
  assert.throws(
    () => normalizeProductionBaseUrl("http://api.gymmin.example"),
    /HTTPS/u,
  );
  assert.throws(
    () => normalizeProductionBaseUrl("https://gymmin.trycloudflare.com"),
    /temporary tunnel/u,
  );
  console.log("Production smoke self-test passed.");
}

const isMainModule =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMainModule) {
  if (process.argv[2] === "--self-test") {
    await runSelfTest();
  } else {
    const baseUrl = normalizeProductionBaseUrl(
      process.argv[2] ?? process.env.GYMMIN_PRODUCTION_BASE_URL,
    );
    await runProductionSmoke(baseUrl);
    console.log(`Production smoke passed for ${baseUrl.origin}.`);
  }
}
