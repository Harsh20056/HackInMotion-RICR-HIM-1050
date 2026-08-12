// Backed by the real Phase 2 backend (/issues, /uploads) instead of the
// local mock. Realtime subscription still uses the local pub-sub helper —
// the backend has no websocket/SSE channel yet (Phase 3).

import { apiRequest } from "@/shared/lib/apiClient";
import { subscribeToTable, mockTable } from "@/shared/mock/mockLocalStore";
import { IssueResponse } from "@/shared/contracts/IssueResponse";
import { SupportResponse } from "@/shared/contracts/SupportResponse";
import { CATEGORY_LABELS } from "@/shared/constants/categories";
import { validateFileSignature } from "@/shared/validation/magicBytes";
import { APIError, ValidationError } from "@/shared/errors/errors";

interface ApiIssue {
  id: string;
  publicRef: string;
  title: string;
  description: string;
  category: { code: string; nameEn: string };
  status: string;
  latitude: number;
  longitude: number;
  address: string | null;
  reportedBy: string;
  supportsCount: number;
  createdAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  media?: { id: string; kind: string; url: string }[];
  workOrders?: { id: string; departmentId: string; role: string; status: string }[];
}

// Reverse lookup: the frontend still stores/sends category as a translated
// display label (e.g. "Roads" / "सड़कें") — see issueService.reportNewIssue.
// The backend's category is an FK, addressed here by its stable code.
const LABEL_TO_CATEGORY_CODE: Record<string, string> = {};
for (const [code, labels] of Object.entries(CATEGORY_LABELS)) {
  LABEL_TO_CATEGORY_CODE[labels.en.toLowerCase()] = code;
  LABEL_TO_CATEGORY_CODE[labels.hi] = code;
}

function categoryLabelToCode(label: string): string {
  return LABEL_TO_CATEGORY_CODE[label.toLowerCase()] ?? LABEL_TO_CATEGORY_CODE[label] ?? label;
}

function toIssueResponse(issue: ApiIssue): IssueResponse {
  return {
    id: issue.id,
    user_id: issue.reportedBy,
    title: issue.title,
    description: issue.description,
    category: issue.category.nameEn,
    location: issue.address,
    latitude: issue.latitude,
    longitude: issue.longitude,
    status: issue.status,
    image_urls: issue.media?.map((m) => m.url) ?? null,
    supports_count: issue.supportsCount,
    master_issue_id: null,
    created_at: issue.createdAt,
    updated_at: issue.resolvedAt ?? issue.acknowledgedAt ?? issue.createdAt,
  };
}

const REALTIME_TABLE = "reported_issues"; // kept for the local pub-sub channel name only

export const issueRepository = {
  async fetchAllIssues(limitCount = 20): Promise<IssueResponse[]> {
    const data = await apiRequest<{ items: ApiIssue[] }>(`/issues?page=1&pageSize=${limitCount}`, { auth: false });
    return data.items.map(toIssueResponse);
  },

  async fetchAllIssuesForMap(): Promise<IssueResponse[]> {
    const data = await apiRequest<{ items: ApiIssue[] }>(`/issues?page=1&pageSize=500`, { auth: false });
    return data.items.map(toIssueResponse);
  },

  async fetchIssueById(issueId: string): Promise<IssueResponse> {
    const issue = await apiRequest<ApiIssue>(`/issues/${issueId}`, { auth: false });
    return toIssueResponse(issue);
  },

  async fetchUserIssues(userId: string): Promise<IssueResponse[]> {
    const data = await apiRequest<{ items: ApiIssue[] }>(`/issues?reportedBy=${userId}&pageSize=100`, { auth: false });
    return data.items.map(toIssueResponse);
  },

  async insertIssue(issue: Omit<IssueResponse, "id" | "created_at" | "updated_at" | "supports_count">): Promise<IssueResponse> {
    if (issue.latitude == null || issue.longitude == null) {
      throw new ValidationError("A location is required to report an issue.");
    }

    const body = {
      title: issue.title,
      description: issue.description,
      categoryCode: categoryLabelToCode(issue.category),
      latitude: issue.latitude,
      longitude: issue.longitude,
      address: issue.location ?? undefined,
    };

    const result = await apiRequest<{ issue?: ApiIssue; duplicateCandidate?: { id: string; title: string } }>("/issues", {
      method: "POST",
      body,
    });

    if (result.duplicateCandidate) {
      // The backend found a nearby, still-open report in the same category.
      // Corroborate it instead of silently dropping the citizen's report.
      const confirmed = await apiRequest<ApiIssue>(`/issues/${result.duplicateCandidate.id}/confirm-duplicate`, {
        method: "POST",
        body: { duplicateOfId: result.duplicateCandidate.id, description: issue.description },
      });
      mockTable.insert(REALTIME_TABLE, toIssueResponse(confirmed) as unknown as Record<string, unknown>);
      return toIssueResponse(confirmed);
    }

    const created = toIssueResponse(result.issue!);
    mockTable.insert(REALTIME_TABLE, created as unknown as Record<string, unknown>);
    return created;
  },

  async uploadIssueImage(_userId: string, file: File): Promise<string> {
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) throw new ValidationError("File size exceeds the 5MB limit");

    const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!ALLOWED_MIMES.includes(file.type)) throw new ValidationError("Unsupported image MIME type");

    const isValidSignature = await validateFileSignature(file, ALLOWED_MIMES);
    if (!isValidSignature) throw new ValidationError("File signature mismatch. Upload rejected for security reasons.");

    const sig = await apiRequest<{ timestamp: number; folder: string; signature: string; apiKey: string; cloudName: string }>(
      "/uploads/signature",
      { method: "POST" }
    );

    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", sig.apiKey);
    formData.append("timestamp", String(sig.timestamp));
    formData.append("folder", sig.folder);
    formData.append("signature", sig.signature);

    const resp = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
      method: "POST",
      body: formData,
    });
    if (!resp.ok) throw new APIError("Image upload failed", resp.status);
    const data = await resp.json();
    return data.secure_url as string;
  },

  async fetchUserSupports(userId: string): Promise<SupportResponse[]> {
    // No dedicated "my supports" endpoint yet — derived client-side from the
    // local optimistic-update cache is not reliable across sessions, so this
    // currently reports none until the backend exposes it (Phase 3).
    return [];
  },

  async fetchUserSupportedIssues(userId: string): Promise<IssueResponse[]> {
    return [];
  },

  async addSupport(issueId: string, userId: string): Promise<SupportResponse> {
    const issue = await apiRequest<ApiIssue>(`/issues/${issueId}/support`, { method: "POST" });
    return { id: `${issueId}-${userId}`, issue_id: issueId, user_id: userId, created_at: new Date().toISOString() };
  },

  async removeSupport(issueId: string, userId: string): Promise<void> {
    // Unsupporting isn't implemented by the backend yet (supports are
    // append-only there); no-op so the optimistic UI rollback stays consistent.
  },

  subscribeToIssuesChange(onChange: (payload: any) => void): () => void {
    return subscribeToTable(REALTIME_TABLE, onChange);
  },
};
