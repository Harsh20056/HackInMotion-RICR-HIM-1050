// TEMPORARY — backend pending (Phase 2)
// Backed by mockAuthAdapter (localStorage) instead of a real backend auth service.

import { mockAuthAdapter } from "@/shared/mock/mockAuthAdapter";
import { AuthChangeEvent, AuthSession } from "@/shared/types/domain/AuthUser";
import { LoginInput } from "../validation/loginSchema";
import { SignupInput } from "../validation/signupSchema";
import { AuthError } from "@/shared/errors/errors";

export const authRepository = {
  async signUp(input: SignupInput) {
    try {
      return await mockAuthAdapter.signUp({
        email: input.email,
        password: input.password,
        fullName: input.fullName,
      });
    } catch (error: any) {
      throw new AuthError(error.message, error);
    }
  },

  async signIn(input: LoginInput) {
    try {
      return await mockAuthAdapter.signIn({ email: input.email, password: input.password });
    } catch (error: any) {
      throw new AuthError(error.message, error);
    }
  },

  async signOut() {
    await mockAuthAdapter.signOut();
  },

  async getSession(): Promise<AuthSession | null> {
    return mockAuthAdapter.getSession();
  },

  onAuthStateChange(callback: (event: AuthChangeEvent, session: AuthSession | null) => void) {
    return mockAuthAdapter.onAuthStateChange(callback);
  },
};
