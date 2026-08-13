// TEMPORARY — backend pending (Phase 2)
// Backed by the localStorage mock store instead of a real backend.

import { mockTable } from "@/shared/mock/mockLocalStore";
import { ProfileResponse } from "@/shared/contracts/ProfileResponse";
import { AuthUser } from "@/shared/types/domain/AuthUser";

const PROFILES_TABLE = "profiles";
const NOTIFS_TABLE = "notification_preferences";

interface NotificationPreferencesRow {
  id: string;
  user_id: string;
  email_notifications: boolean;
  sms_notifications: boolean;
  push_notifications: boolean;
  issue_updates: boolean;
  scheme_alerts: boolean;
  document_reminders: boolean;
  weekly_digest: boolean;
  created_at: string;
  updated_at: string;
}

export const profileRepository = {
  async fetchProfile(userId: string, authUser?: AuthUser | null): Promise<ProfileResponse> {
    const profiles = mockTable.getAll<ProfileResponse>(PROFILES_TABLE);
    const existing = profiles.find((p) => p.user_id === userId);
    
    const authFullName = (authUser?.user_metadata?.full_name as string) || "";
    const authPhone = (authUser?.user_metadata?.phone as string) || null;

    if (existing) {
      // If existing profile has default placeholder name "User" or empty, update with real name from authUser
      let needsUpdate = false;
      const patch: Partial<ProfileResponse> = {};

      if ((!existing.full_name || existing.full_name === "User") && authFullName && authFullName !== "User") {
        patch.full_name = authFullName;
        needsUpdate = true;
      }
      if (!existing.phone && authPhone) {
        patch.phone = authPhone;
        needsUpdate = true;
      }

      if (existing.city && existing.city === "BhopalBhopal") {
        patch.city = "Bhopal";
        needsUpdate = true;
      }

      if (needsUpdate) {
        const updated = mockTable.update<ProfileResponse>(PROFILES_TABLE, "user_id", userId, patch);
        return updated || existing;
      }
      return existing;
    }

    const now = new Date().toISOString();
    const created: ProfileResponse = {
      id: mockTable.genId(),
      user_id: userId,
      full_name: authFullName || "User",
      phone: authPhone,
      address: null,
      city: null,
      state: null,
      pincode: null,
      avatar_url: null,
      preferred_language: "en",
      created_at: now,
      updated_at: now,
    };
    return mockTable.insert<ProfileResponse>(PROFILES_TABLE, created);
  },

  seedProfileFromAuth(userId: string, fullName?: string, phone?: string | null, city?: string | null, state?: string | null): void {
    const profiles = mockTable.getAll<ProfileResponse>(PROFILES_TABLE);
    const existing = profiles.find((p) => p.user_id === userId);
    const now = new Date().toISOString();

    if (existing) {
      const patch: Partial<ProfileResponse> = {};
      if (fullName && (!existing.full_name || existing.full_name === "User")) {
        patch.full_name = fullName;
      }
      if (phone && !existing.phone) {
        patch.phone = phone;
      }
      if (city && !existing.city) {
        patch.city = city;
      }
      if (state && !existing.state) {
        patch.state = state;
      }
      if (Object.keys(patch).length > 0) {
        mockTable.update<ProfileResponse>(PROFILES_TABLE, "user_id", userId, patch);
      }
    } else {
      const created: ProfileResponse = {
        id: mockTable.genId(),
        user_id: userId,
        full_name: fullName || "User",
        phone: phone || null,
        address: null,
        city: city || null,
        state: state || null,
        pincode: null,
        avatar_url: null,
        preferred_language: "en",
        created_at: now,
        updated_at: now,
      };
      mockTable.insert<ProfileResponse>(PROFILES_TABLE, created);
    }
  },

  async updateProfile(userId: string, profile: Partial<Omit<ProfileResponse, "id" | "user_id" | "created_at" | "updated_at">>): Promise<ProfileResponse> {
    const updated = mockTable.update<ProfileResponse>(PROFILES_TABLE, "user_id", userId, {
      ...profile,
      updated_at: new Date().toISOString(),
    });
    if (!updated) throw new Error("Profile not found");
    return updated;
  },

  async fetchNotificationPreferences(userId: string): Promise<NotificationPreferencesRow> {
    const rows = mockTable.getAll<NotificationPreferencesRow>(NOTIFS_TABLE);
    const existing = rows.find((r) => r.user_id === userId);
    if (existing) return existing;

    const now = new Date().toISOString();
    const created: NotificationPreferencesRow = {
      id: mockTable.genId(),
      user_id: userId,
      email_notifications: true,
      sms_notifications: false,
      push_notifications: true,
      issue_updates: true,
      scheme_alerts: true,
      document_reminders: true,
      weekly_digest: false,
      created_at: now,
      updated_at: now,
    };
    return mockTable.insert<NotificationPreferencesRow>(NOTIFS_TABLE, created);
  },

  async updateNotificationPreferences(userId: string, key: string, value: boolean): Promise<NotificationPreferencesRow> {
    const updated = mockTable.update<NotificationPreferencesRow>(NOTIFS_TABLE, "user_id", userId, {
      [key]: value,
      updated_at: new Date().toISOString(),
    } as Partial<NotificationPreferencesRow>);
    if (!updated) throw new Error("Notification preferences not found");
    return updated;
  },
};
