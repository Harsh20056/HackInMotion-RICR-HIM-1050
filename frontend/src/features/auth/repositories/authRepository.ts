// Backed by the real Phase 2 backend (/auth/*) instead of the local mock.

import { apiRequest, tokenStore } from "@/shared/lib/apiClient";
import { AuthChangeEvent, AuthSession, AuthUser } from "@/shared/types/domain/AuthUser";
import { LoginInput } from "../validation/loginSchema";
import { SignupInput } from "../validation/signupSchema";
import { AuthError } from "@/shared/errors/errors";
import { profileRepository } from "@/features/profile/repositories/profileRepository";
import { DEMO_CREDENTIALS } from "../config/demoCredentials";

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
  return { id: u.id, email: u.email, user_metadata: { full_name: u.fullName, phone: u.phone || undefined, role: u.role, departmentId: u.departmentId } };
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
      profileRepository.seedProfileFromAuth(data.user.id, data.user.fullName, data.user.phone, input.city, input.state);
      return { user: toAuthUser(data.user), access_token: data.accessToken };
    } catch (error: any) {
      throw new AuthError(error.message, error);
    }
  },

  async signIn(input: LoginInput): Promise<AuthSession> {
    const demo = DEMO_CREDENTIALS.find(c => c.email.toLowerCase() === input.email.toLowerCase());
    if (demo) {
      if (input.password !== demo.password) {
        throw new AuthError("Invalid password for demo account");
      }
      const demoToken = `demo-token-${demo.id}`;
      tokenStore.setTokens(demoToken, `demo-refresh-${demo.id}`);
      profileRepository.seedProfileFromAuth(`demo-${demo.id}`, demo.fullName, null, demo.city, demo.state);
      
      const apiUser: ApiUser = {
        id: `demo-${demo.id}`,
        email: demo.email,
        fullName: demo.fullName,
        phone: null,
        role: demo.role,
        departmentId: demo.departmentId,
      };
      
      const session: AuthSession = { user: toAuthUser(apiUser), access_token: demoToken };
      emitAuthChange("SIGNED_IN", session);
      return session;
    }

    try {
      const data = await apiRequest<{ user: ApiUser; accessToken: string; refreshToken: string }>("/auth/login", {
        method: "POST",
        auth: false,
        body: { email: input.email, password: input.password },
      });
      tokenStore.setTokens(data.accessToken, data.refreshToken);
      profileRepository.seedProfileFromAuth(data.user.id, data.user.fullName, data.user.phone);
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
    const token = tokenStore.getAccessToken();
    if (!token) return null;
    
    if (token.startsWith("demo-token-")) {
      const id = token.substring("demo-token-".length);
      const demo = DEMO_CREDENTIALS.find(c => c.id === id);
      if (demo) {
        const apiUser: ApiUser = {
          id: `demo-${demo.id}`,
          email: demo.email,
          fullName: demo.fullName,
          phone: null,
          role: demo.role,
          departmentId: demo.departmentId,
        };
        profileRepository.seedProfileFromAuth(apiUser.id, demo.fullName, null, demo.city, demo.state);
        return { user: toAuthUser(apiUser), access_token: token };
      }
    }

    try {
      const user = await apiRequest<ApiUser>("/auth/me");
      profileRepository.seedProfileFromAuth(user.id, user.fullName, user.phone);
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
