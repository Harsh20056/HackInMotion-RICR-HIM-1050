// TEMPORARY — backend pending (Phase 2)
// Local, browser-only auth adapter that stands in for a real backend auth service.
// Credentials are stored in localStorage for the sole purpose of letting
// the existing UI (sign up / sign in / session-gated routes) keep working
// with no backend. This is NOT a secure auth system and must be replaced
// by the Phase 2 backend.

import { AuthUser, AuthSession, AuthChangeEvent } from "@/shared/types/domain/AuthUser";
import { profileRepository } from "@/features/profile/repositories/profileRepository";

const USERS_KEY = "samadhan_mock_auth_users";
const SESSION_KEY = "samadhan_mock_auth_session";
const AUTH_EVENT = "samadhan_mock_auth_change";

interface StoredUser {
  id: string;
  email: string;
  password: string;
  full_name?: string;
}

function readUsers(): StoredUser[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(USERS_KEY);
    return raw ? (JSON.parse(raw) as StoredUser[]) : [];
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function toAuthUser(u: StoredUser): AuthUser {
  return { id: u.id, email: u.email, user_metadata: { full_name: u.full_name } };
}

function readSessionUserId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SESSION_KEY);
}

function buildSession(userId: string | null): AuthSession | null {
  if (!userId) return null;
  const user = readUsers().find((u) => u.id === userId);
  if (!user) return null;
  return { user: toAuthUser(user), access_token: `mock-token-${user.id}` };
}

function emitAuthChange(event: AuthChangeEvent, session: AuthSession | null): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: { event, session } }));
}

function genId(): string {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export const mockAuthAdapter = {
  async signUp(input: { email: string; password: string; fullName?: string }): Promise<AuthSession> {
    const users = readUsers();
    if (users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
      throw new Error("An account with this email already exists.");
    }
    const user: StoredUser = {
      id: genId(),
      email: input.email,
      password: input.password,
      full_name: input.fullName,
    };
    users.push(user);
    writeUsers(users);
    profileRepository.seedProfileFromAuth(user.id, user.full_name);
    // Account is created but not signed in yet — mirrors the sign-up-then-sign-in flow.
    return buildSession(user.id) ?? { user: toAuthUser(user), access_token: `mock-token-${user.id}` };
  },

  async signIn(input: { email: string; password: string }): Promise<AuthSession> {
    const users = readUsers();
    const user = users.find(
      (u) => u.email.toLowerCase() === input.email.toLowerCase() && u.password === input.password
    );
    if (!user) {
      throw new Error("Invalid email or password.");
    }
    window.localStorage.setItem(SESSION_KEY, user.id);
    profileRepository.seedProfileFromAuth(user.id, user.full_name);
    const session = buildSession(user.id)!;
    emitAuthChange("SIGNED_IN", session);
    return session;
  },

  async signOut(): Promise<void> {
    window.localStorage.removeItem(SESSION_KEY);
    emitAuthChange("SIGNED_OUT", null);
  },

  async getSession(): Promise<AuthSession | null> {
    return buildSession(readSessionUserId());
  },

  onAuthStateChange(callback: (event: AuthChangeEvent, session: AuthSession | null) => void) {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { event: AuthChangeEvent; session: AuthSession | null };
      callback(detail.event, detail.session);
    };
    window.addEventListener(AUTH_EVENT, handler);
    return {
      unsubscribe: () => window.removeEventListener(AUTH_EVENT, handler),
    };
  },
};
