// TEMPORARY — backend pending (Phase 2)
// Backed by the localStorage mock store instead of a real backend.

import { mockTable } from "@/shared/mock/mockLocalStore";
import { ProfileResponse } from "@/shared/contracts/ProfileResponse";

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
  async fetchProfile(userId: string): Promise<ProfileResponse> {
    const profiles = mockTable.getAll<ProfileResponse>(PROFILES_TABLE);
    const existing = profiles.find((p) => p.user_id === userId);
    if (existing) return existing;

    const now = new Date().toISOString();
    const created: ProfileResponse = {
      id: mockTable.genId(),
      user_id: userId,
      full_name: "User",
      phone: null,
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
