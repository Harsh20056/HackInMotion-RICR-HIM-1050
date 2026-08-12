import { EventEmitter } from "events";

/**
 * In-process pub/sub backing the SSE endpoints.
 *
 * Single-process only by design — the stack rules out Redis, so a
 * horizontally scaled deployment would need each instance's subscribers to
 * be fed from the database (e.g. LISTEN/NOTIFY) instead. Documented here so
 * the constraint is visible rather than discovered in production.
 */
export interface IssueEvent {
  type: "issue.created" | "issue.status_changed" | "issue.verification_changed" | "issue.supported";
  issueId: string;
  departmentIds: string[];
  payload: Record<string, unknown>;
  at: string;
}

class EventBus extends EventEmitter {
  emitIssueEvent(event: IssueEvent) {
    this.emit(`issue:${event.issueId}`, event);
    for (const departmentId of event.departmentIds) {
      this.emit(`department:${departmentId}`, event);
    }
    this.emit("all", event);
  }

  onIssue(issueId: string, listener: (e: IssueEvent) => void): () => void {
    const channel = `issue:${issueId}`;
    this.on(channel, listener);
    return () => this.off(channel, listener);
  }

  onDepartment(departmentId: string, listener: (e: IssueEvent) => void): () => void {
    const channel = `department:${departmentId}`;
    this.on(channel, listener);
    return () => this.off(channel, listener);
  }
}

export const eventBus = new EventBus();
// Each connected SSE client adds a listener; the default cap of 10 is far
// too low for a dashboard with several admins watching one department.
eventBus.setMaxListeners(0);
