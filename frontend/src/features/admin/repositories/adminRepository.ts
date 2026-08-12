// TEMPORARY — backend pending (Phase 2)
// Backed by the localStorage mock store instead of a real backend. There is
// no real RBAC enforcement here — user_roles is just a local table, seeded
// empty, so no account is an admin by default.

import { mockTable } from "@/shared/mock/mockLocalStore";
import { UserRole } from "@/shared/types/domain/UserRole";
import { IssueResponse } from "@/shared/contracts/IssueResponse";
import { IssueStatus } from "@/shared/types/domain/IssueStatus";

interface UserRoleRow {
  user_id: string;
  role: UserRole;
  department: string | null;
}

const ADMIN_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.DEPARTMENT_ADMIN];

export const adminRepository = {
  async checkIsAdmin(userId: string): Promise<boolean> {
    const roles = mockTable.getAll<UserRoleRow>("user_roles");
    const row = roles.find((r) => r.user_id === userId);
    return !!row && ADMIN_ROLES.includes(row.role);
  },

  async getUserRole(userId: string): Promise<{ role: UserRole | null; department: string | null }> {
    const roles = mockTable.getAll<UserRoleRow>("user_roles");
    const row = roles.find((r) => r.user_id === userId);
    return {
      role: row?.role ?? null,
      department: row?.department ?? null,
    };
  },

  async fetchAllIssuesAdmin(): Promise<IssueResponse[]> {
    const issues = mockTable.getAll<IssueResponse>("reported_issues");
    return issues
      .filter((i) => !i.master_issue_id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async updateIssueStatusAdmin(id: string, status: IssueStatus): Promise<void> {
    mockTable.update<IssueResponse>("reported_issues", "id", id, {
      status,
      updated_at: new Date().toISOString(),
    });
  },

  async deleteIssueAdmin(id: string): Promise<void> {
    mockTable.remove<IssueResponse>("reported_issues", "id", id);
  },
};
