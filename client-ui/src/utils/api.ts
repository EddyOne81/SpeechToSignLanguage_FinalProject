export const BACKEND_BASE_URL =
  import.meta.env.VITE_BACKEND_URL ?? "";

const TOKEN_KEY = "s2s_token";

export const getToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token: string | null) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* localStorage unavailable (private mode) — fall back to cookie auth */
  }
};

export const clearToken = () => setToken(null);

/**
 * Adds the stored JWT as an Authorization header so auth works even when the
 * cross-site session cookie is blocked by the browser (third-party cookies).
 */
export const withAuthHeaders = (init: HeadersInit | undefined): Headers => {
  const headers = new Headers(init);
  const token = getToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return headers;
};

/**
 * Broadcast that the server rejected our credentials (401). The app shell
 * listens for this to clear the cached login state and prompt re-login,
 * instead of silently showing a logged-in UI that no longer works.
 */
export const UNAUTHORIZED_EVENT = "s2s:unauthorized";

export const notifyUnauthorized = () => {
  clearToken();
  window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
};

export const unwrapApiResponse = (body: any) => {
  if (body?.data?.data !== undefined) {
    return body.data.data;
  }
  if (body?.data !== undefined) {
    return body.data;
  }
  return body;
};

export const extractPayloadFromApiResponse = (body: any) => {
  const payload = unwrapApiResponse(body);
  if (payload?.recognized_text_en) {
    return payload;
  }
  return null;
};

export const extractPageContent = (body: any) => {
  const payload = unwrapApiResponse(body);
  if (payload?.content && Array.isArray(payload.content)) {
    return payload;
  }
  if (Array.isArray(payload)) {
    return { content: payload };
  }
  return { content: [] };
};

export const extractErrorMessage = (body: any) => {
  if (!body) {
    return "Server connection failed.";
  }
  return (
    body.message || body.detail || body.error || "Server connection failed."
  );
};
