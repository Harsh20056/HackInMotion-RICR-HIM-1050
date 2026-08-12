// Backed by the real Phase 2 backend (/auth/*) instead of the local mock.

import { apiRequest, tokenStore } from "@/shared/lib/apiClient";
import { AuthChangeEvent, AuthSession, AuthUser } from "@/shared/types/domain/AuthUser";
import { LoginInput } from "../validation/loginSchema";
import { SignupInput } from "../validation/signupSchema";
import { AuthError } from "@/shared/errors/errors";

const AUTH_EVENT = "samadhan_auth_change";

interface ApiUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: string;
  departmentId: string | null;
}

function toAuthUser(u: ApiUser): AuthUser {
  return { id: u.id, email: u.email, user_metadata: { full_name: u.fullName, role: u.role, departmentId: u.departmentId } };
}

function emitAuthChange(event: AuthChangeEvent, session: AuthSession | null): void {
  window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: { event, session } }));
}

export const authRepository = {
  async signUp(input: SignupInput): Promise<AuthSession> {
    try {
      const data = await apiRequest<{ user: ApiUser; accessToken: string; refreshToken: string }>("/auth/register", {
        method: "POST",
        auth: false,
        body: { email: input.email, password: input.password, fullName: input.fullName },
      });
      // Matches the prior sign-up-then-sign-in UX: account is created but
      // not persisted as the active session here.
      return { user: toAuthUser(data.user), access_token: data.accessToken };
    } catch (error: any) {
      throw new AuthError(error.message, error);
    }
  },

  async signIn(input: LoginInput): Promise<AuthSession> {
    try {
      const data = await apiRequest<{ user: ApiUser; accessToken: string; refreshToken: string }>("/auth/login", {
        method: "POST",
        auth: false,
        body: { email: input.email, password: input.password },
      });
      tokenStore.setTokens(data.accessToken, data.refreshToken);
      const session: AuthSession = { user: toAuthUser(data.user), access_token: data.accessToken };
      emitAuthChange("SIGNED_IN", session);
      return session;
    } catch (error: any) {
      throw new AuthError(error.message, error);
    }
  },

  async signOut(): Promise<void> {
    tokenStore.clear();
    emitAuthChange("SIGNED_OUT", null);
  },

  async getSession(): Promise<AuthSession | null> {
    if (!tokenStore.getAccessToken()) return null;
    try {
      const user = await apiRequest<ApiUser>("/auth/me");
      return { user: toAuthUser(user), access_token: tokenStore.getAccessToken()! };
    } catch {
      tokenStore.clear();
      return null;
    }
  },

  onAuthStateChange(callback: (event: AuthChangeEvent, session: AuthSession | null) => void) {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { event: AuthChangeEvent; session: AuthSession | null };
      callback(detail.event, detail.session);
    };
    window.addEventListener(AUTH_EVENT, handler);
    return { unsubscribe: () => window.removeEventListener(AUTH_EVENT, handler) };
  },
};
