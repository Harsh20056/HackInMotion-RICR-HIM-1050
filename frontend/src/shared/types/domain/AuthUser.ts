// TEMPORARY — backend pending (Phase 2)
// Minimal local replacements for the auth types that used to flow through
// the app via the removed backend SDK. Shapes are kept intentionally
// close to that SDK's so a real backend can be swapped in later with
// minimal changes to consuming code.

export interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    [key: string]: unknown;
  };
}

export interface AuthSession {
  user: AuthUser;
  access_token: string;
}

export type AuthChangeEvent =
  "SIGNED_IN" | "SIGNED_OUT" | "TOKEN_REFRESHED" | "USER_UPDATED" | "INITIAL_SESSION";
