// TEMPORARY — backend pending (Phase 2)
// Backed by the localStorage mock store instead of a real database, object
// storage, and realtime service. Uploaded images are kept only as in-memory
// object URLs — they will not persist across a page reload until the real
// backend lands.

import { mockTable, subscribeToTable } from "@/shared/mock/mockLocalStore";
import { SEED_ISSUES } from "@/shared/mock/mockSeedData";
import { IssueResponse } from "@/shared/contracts/IssueResponse";
import { SupportResponse } from "@/shared/contracts/SupportResponse";
import { validateFileSignature } from "@/shared/validation/magicBytes";
import { ValidationError } from "@/shared/errors/errors";

const TABLE = "reported_issues";
const SUPPORTS_TABLE = "issue_supports";

mockTable.seedIfEmpty<IssueResponse>(TABLE, SEED_ISSUES);

export const issueRepository = {
  async fetchAllIssues(limitCount = 20): Promise<IssueResponse[]> {
    const all = mockTable.getAll<IssueResponse>(TABLE);
    return [...all]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limitCount);
  },

  async fetchAllIssuesForMap(): Promise<IssueResponse[]> {
    const all = mockTable.getAll<IssueResponse>(TABLE);
    return [...all].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async fetchIssueById(issueId: string): Promise<IssueResponse> {
    const all = mockTable.getAll<IssueResponse>(TABLE);
    const found = all.find((i) => i.id === issueId);
    if (!found) throw new Error("Issue not found");
    return found;
  },

  async fetchUserIssues(userId: string): Promise<IssueResponse[]> {
    const all = mockTable.getAll<IssueResponse>(TABLE);
    return all
      .filter((i) => i.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async insertIssue(issue: Omit<IssueResponse, "id" | "created_at" | "updated_at" | "supports_count">): Promise<IssueResponse> {
    const now = new Date().toISOString();
    const row: IssueResponse = {
      ...issue,
      id: mockTable.genId(),
      supports_count: 0,
      created_at: now,
      updated_at: now,
    };
    return mockTable.insert<IssueResponse>(TABLE, row);
  },

  async uploadIssueImage(userId: string, file: File): Promise<string> {
    // 1. File size check (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      throw new ValidationError("File size exceeds the 5MB limit");
    }

    // 2. MIME type whitelist check
    const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!ALLOWED_MIMES.includes(file.type)) {
      throw new ValidationError("Unsupported image MIME type");
    }

    // 3. Magic Byte signature validation
    const isValidSignature = await validateFileSignature(file, ALLOWED_MIMES);
    if (!isValidSignature) {
      throw new ValidationError("File signature mismatch. Disguised executable or invalid image file detected.");
    }

    // TEMPORARY — backend pending (Phase 2): no real object storage yet,
    // so the image only lives as a blob URL for the current browser session.
    return URL.createObjectURL(file);
  },

  async fetchUserSupports(userId: string): Promise<SupportResponse[]> {
    const all = mockTable.getAll<SupportResponse>(SUPPORTS_TABLE);
    return all.filter((s) => s.user_id === userId);
  },

  async fetchUserSupportedIssues(userId: string): Promise<IssueResponse[]> {
    const supports = mockTable.getAll<SupportResponse>(SUPPORTS_TABLE).filter((s) => s.user_id === userId);
    const issues = mockTable.getAll<IssueResponse>(TABLE);
    return supports
      .map((s) => issues.find((i) => i.id === s.issue_id))
      .filter((i): i is IssueResponse => !!i);
  },

  async addSupport(issueId: string, userId: string): Promise<SupportResponse> {
    const row: SupportResponse = {
      id: mockTable.genId(),
      issue_id: issueId,
      user_id: userId,
      created_at: new Date().toISOString(),
    };
    mockTable.insert<SupportResponse>(SUPPORTS_TABLE, row);

    const issues = mockTable.getAll<IssueResponse>(TABLE);
    const issue = issues.find((i) => i.id === issueId);
    if (issue) {
      mockTable.update<IssueResponse>(TABLE, "id", issueId, {
        supports_count: (issue.supports_count || 0) + 1,
      });
    }

    return row;
  },

  async removeSupport(issueId: string, userId: string): Promise<void> {
    const supports = mockTable.getAll<SupportResponse>(SUPPORTS_TABLE);
    const match = supports.find((s) => s.issue_id === issueId && s.user_id === userId);
    if (match) {
      mockTable.remove<SupportResponse>(SUPPORTS_TABLE, "id", match.id);
    }

    const issues = mockTable.getAll<IssueResponse>(TABLE);
    const issue = issues.find((i) => i.id === issueId);
    if (issue) {
      mockTable.update<IssueResponse>(TABLE, "id", issueId, {
        supports_count: Math.max(0, (issue.supports_count || 0) - 1),
      });
    }
  },

  subscribeToIssuesChange(onChange: (payload: any) => void): () => void {
    return subscribeToTable<IssueResponse>(TABLE, onChange);
  },
};
