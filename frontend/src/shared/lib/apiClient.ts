import { env } from "@/shared/config/environment";
import { APIError } from "@/shared/errors/errors";

const ACCESS_TOKEN_KEY = "samadhan_access_token";
const REFRESH_TOKEN_KEY = "samadhan_refresh_token";

export const tokenStore = {
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },
  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },
  clear(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = tokenStore.getRefreshToken();
  if (!refreshToken) return null;

  const resp = await fetch(`${env.apiBaseUrl}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!resp.ok) {
    tokenStore.clear();
    return null;
  }
  const data = await resp.json();
  tokenStore.setTokens(data.accessToken, refreshToken);
  return data.accessToken as string;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
}

/** Thin fetch wrapper: JSON in/out, auto Bearer token, one 401 refresh-and-retry. */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true } = options;

  const doFetch = async (): Promise<Response> => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (auth) {
      const token = tokenStore.getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    return fetch(`${env.apiBaseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  let response: Response;
  try {
    response = await doFetch();
  } catch {
    // fetch() only rejects on network-level failure.
    throw new APIError(
      navigator.onLine
        ? "Can't reach the Samadhan server. Please try again in a moment."
        : "You appear to be offline. Reconnect and try again.",
      0
    );
  }

  if (response.status === 401 && auth && tokenStore.getRefreshToken()) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      response = await doFetch();
    }
  }

  // A 401 that survives the refresh attempt means the session is genuinely
  // gone. Clear it and announce that, so guards can send the user to sign in
  // instead of leaving a signed-in shell that fails every request.
  if (response.status === 401 && auth) {
    tokenStore.clear();
    window.dispatchEvent(new CustomEvent("samadhan_session_expired"));
    throw new APIError("Your session has expired. Please sign in again.", 401);
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new APIError(
      errorBody?.error?.message || `Request failed: ${response.status}`,
      response.status,
      errorBody
    );
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}
