const DEFAULT_TIMEOUT = 20000;

const safeJoinUrl = (base, path) => {
  const trimmedBase = String(base || "").trim().replace(/\/+$/, "");
  const normalizedPath = String(path || "").trim();
  if (!trimmedBase) {
    throw new Error("Missing backend base URL");
  }
  if (!normalizedPath) {
    throw new Error("Missing request path");
  }
  if (/^https?:\/\//i.test(normalizedPath)) {
    return normalizedPath;
  }
  return `${trimmedBase}${normalizedPath.startsWith("/") ? "" : "/"}${normalizedPath}`;
};

const withTimeout = async (promise, timeoutMs) => {
  const timeout = Number.isFinite(timeoutMs) ? timeoutMs : DEFAULT_TIMEOUT;
  return await Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Request timeout after ${timeout}ms`)), timeout);
    }),
  ]);
};

const parseResponseBody = async (response) => {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return await response.json();
  }
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
};

const doApiRequest = async (payload) => {
  const url = safeJoinUrl(payload.baseUrl, payload.path);
  const method = String(payload.method || "GET").toUpperCase();

  const headers = new Headers(payload.headers || {});
  let body;

  if (payload.body !== undefined && payload.body !== null) {
    if (typeof payload.body === "string") {
      body = payload.body;
      if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }
    } else {
      body = JSON.stringify(payload.body);
      if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }
    }
  }

  const response = await withTimeout(
    fetch(url, {
      method,
      headers,
      body,
      credentials: "omit",
    }),
    payload.timeoutMs
  );

  const data = await parseResponseBody(response);
  if (!response.ok) {
    const detail =
      (data && (data.detail || data.message || data.error)) ||
      `HTTP ${response.status}`;
    throw new Error(String(detail));
  }

  return { status: response.status, data };
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== "api-request") {
    return;
  }

  doApiRequest(message.payload || {})
    .then((result) => {
      sendResponse({ ok: true, ...result });
    })
    .catch((error) => {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : String(error || "Request failed"),
      });
    });

  return true;
});
