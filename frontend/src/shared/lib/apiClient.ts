import { env } from "@/shared/config/environment";
import { APIError } from "@/shared/errors/errors";
import { DEMO_CREDENTIALS } from "@/features/auth/config/demoCredentials";

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

  if (tokenStore.getAccessToken()?.startsWith("demo-token-")) {
    const token = tokenStore.getAccessToken()!;
    const id = token.substring("demo-token-".length);
    const demo = DEMO_CREDENTIALS.find(c => c.id === id);
    if (demo) {
      if (path === "/auth/me") {
        return {
          id: `demo-${demo.id}`,
          email: demo.email,
          fullName: demo.fullName,
          phone: null,
          role: demo.role,
          departmentId: demo.departmentId,
        } as unknown as T;
      }
      if (path === "/departments") {
        return {
          items: [
            { id: "water_supply", code: "water_supply", nameEn: "Jal Board / Water Corporation", nameHi: "जल बोर्ड" },
            { id: "sanitation", code: "sanitation", nameEn: "Municipal Solid Waste Management", nameHi: "नगर निगम स्वच्छता विभाग" },
            { id: "electricity", code: "electricity", nameEn: "State Electricity Board / DISCOM", nameHi: "राज्य विद्युत बोर्ड" },
            { id: "roads", code: "roads", nameEn: "Public Works Department (PWD)", nameHi: "लोक निर्माण विभाग" },
            { id: "parks", code: "parks", nameEn: "Horticulture Department", nameHi: "उद्यान विभाग" },
            { id: "buildings", code: "buildings", nameEn: "Building & Construction Department", nameHi: "भवन एवं निर्माण विभाग" },
          ]
        } as unknown as T;
      }
      if (path.includes("/analytics/overview")) {
        return {
          totals: {
            issues: 58,
            geoTagged: 58,
            reportedThisWeek: 4,
            reopened: 2,
            resolved: 42,
            open: 16,
            supports: 112,
          },
          byStatus: [
            { status: "reported", count: 8 },
            { status: "in_progress", count: 8 },
            { status: "resolved", count: 42 },
          ],
          byCategory: [
            { code: "roads", nameEn: "Roads", count: 18 },
            { code: "sanitation", nameEn: "Sanitation", count: 15 },
            { code: "water", nameEn: "Water Supply", count: 12 },
            { code: "electricity", nameEn: "Electricity", count: 8 },
            { code: "parks", nameEn: "Parks & Gardens", count: 3 },
            { code: "buildings", nameEn: "Buildings", count: 2 },
          ],
          resolutionTime: { avgHours: 32, p90Hours: 72 }
        } as unknown as T;
      }
      if (path.includes("/analytics/departments")) {
        return { items: [] } as unknown as T;
      }
      if (path.includes("/analytics/hotspots")) {
        return { precision: 4, items: [] } as unknown as T;
      }
      if (path.includes("/analytics/trends")) {
        return { items: [] } as unknown as T;
      }
      if (path.includes("/supports")) {
        return { items: [] } as unknown as T;
      }
      if (path.includes("/queue")) {
        return { items: [], total: 0, page: 1 } as unknown as T;
      }
      if (path.includes("/notifications")) {
        return { items: [], unreadCount: 0 } as unknown as T;
      }
      if (path === "/users/me/stats") {
        return {
          reportCount: 12,
          supportCount: 45,
          verificationCount: 8,
          resolvedReportCount: 10,
          reportDates: [],
        } as unknown as T;
      }
      if (path.includes("/stats") || path.includes("/analytics")) {
        return { items: [], total: 0 } as unknown as T;
      }
      // Return status 200/empty mock collections for other operations
      return { items: [], total: 0 } as unknown as T;
    }
  }

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
    throw new APIError(errorBody?.error?.message || `Request failed: ${response.status}`, response.status, errorBody);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}
