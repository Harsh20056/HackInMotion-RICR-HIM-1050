import { apiRequest } from "@/shared/lib/apiClient";
import { logger } from "@/shared/services/logger";
import { gamificationService } from "../../profile/services/gamificationService";

export interface VerificationState {
  confirmations: number;
  disagreements: number;
  confidence: number;
  isVerified: boolean;
  userVote: "confirm" | "disagree" | null;
}

interface ApiVerificationState {
  confirmations: number;
  disagreements: number;
  confidence: number;
  isVerified: boolean;
  userVote: boolean | null;
}

const EMPTY: VerificationState = {
  confirmations: 0,
  disagreements: 0,
  confidence: 0,
  isVerified: false,
  userVote: null,
};

function fromApi(state: ApiVerificationState): VerificationState {
  return {
    confirmations: state.confirmations,
    disagreements: state.disagreements,
    confidence: state.confidence,
    isVerified: state.isVerified,
    userVote: state.userVote === null ? null : state.userVote ? "confirm" : "disagree",
  };
}

/**
 * Community verification, backed by the citizen_verifications table.
 *
 * Several call sites (Leaflet popup HTML, dashboard summaries) need a
 * synchronous read, so states are cached in memory and served from there.
 * Call `prefetch()` with the visible issue ids first; anything not yet
 * loaded reports zeroes rather than inventing plausible-looking counts.
 */
class IssueVerificationService {
  private cache = new Map<string, VerificationState>();
  private inFlight = new Map<string, Promise<void>>();

  /** Bulk-loads verification state for the given issues into the cache. */
  async prefetch(issueIds: string[]): Promise<void> {
    const missing = issueIds.filter((id) => !this.cache.has(id) && !this.inFlight.has(id));
    if (missing.length === 0) return;

    // The API exposes per-issue state; fetch the missing ones concurrently
    // and de-duplicate so a re-render can't storm the backend.
    const load = async (id: string) => {
      try {
        const state = await apiRequest<ApiVerificationState>(`/issues/${id}/verification`);
        this.cache.set(id, fromApi(state));
      } catch (err) {
        logger.error(`Failed to load verification state for ${id}:`, err);
        this.cache.set(id, EMPTY);
      } finally {
        this.inFlight.delete(id);
      }
    };

    const promises = missing.map((id) => {
      const p = load(id);
      this.inFlight.set(id, p);
      return p;
    });

    await Promise.all(promises);
    this.notifyChanged();
  }

  /**
   * Synchronous cache read. Returns zeroes until `prefetch` has resolved —
   * deliberately, so the UI never shows a number the server didn't provide.
   */
  getComputedState(issueId: string): VerificationState {
    return this.cache.get(issueId) ?? EMPTY;
  }

  async refresh(issueId: string): Promise<VerificationState> {
    try {
      const state = await apiRequest<ApiVerificationState>(`/issues/${issueId}/verification`);
      const mapped = fromApi(state);
      this.cache.set(issueId, mapped);
      this.notifyChanged(issueId);
      return mapped;
    } catch (err) {
      logger.error(`Failed to refresh verification state for ${issueId}:`, err);
      return this.getComputedState(issueId);
    }
  }

  /** Casts (or changes) the signed-in citizen's vote. */
  async voteOnIssue(issueId: string, vote: "confirm" | "disagree"): Promise<VerificationState> {
    const state = await apiRequest<ApiVerificationState>(`/issues/${issueId}/verify`, {
      method: "POST",
      body: { vote: vote === "confirm" },
    });
    const mapped = fromApi(state);
    this.cache.set(issueId, mapped);
    this.notifyChanged(issueId);
    gamificationService.dispatchGamificationUpdate();
    return mapped;
  }

  /** Drops cached state — call on sign-out so votes don't leak between users. */
  clear(): void {
    this.cache.clear();
  }

  private notifyChanged(issueId?: string) {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("issue_verifications_changed", { detail: { issueId } }));
  }
}

export const issueVerificationService = new IssueVerificationService();
