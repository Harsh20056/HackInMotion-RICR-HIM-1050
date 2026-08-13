import { NotificationChannel, Prisma } from "@prisma/client";
import { prisma } from "../../shared/lib/prisma.js";
import { logger } from "../../shared/lib/logger.js";
import { eventBus } from "../../shared/lib/eventBus.js";

/**
 * Notification templates. Keeping the copy here (rather than at each call
 * site) means the in-app feed and the email body can never drift apart.
 */
export type NotificationTemplate =
  | "work_order.assigned"
  | "work_order.status_changed"
  | "work_order.transfer_requested"
  | "work_order.transfer_decided"
  | "work_order.note_added"
  | "sla.breached"
  | "sla.escalated"
  | "issue.resolution_confirmation_request";

interface TemplateCopy {
  title: string;
  body: string;
}

export function renderTemplate(
  template: NotificationTemplate,
  payload: Record<string, any>
): TemplateCopy {
  const ref = payload.publicRef ?? payload.issueRef ?? "";
  switch (template) {
    case "work_order.assigned":
      return {
        title: "New work order assigned to you",
        body: `${ref} — ${payload.issueTitle ?? "A work order"} has been assigned to you.`,
      };
    case "work_order.status_changed":
      return {
        title: "Work order status changed",
        body: `${ref} moved from ${payload.from} to ${payload.to}.`,
      };
    case "work_order.transfer_requested":
      return {
        title: "Referral awaiting your approval",
        body: `${payload.fromDepartment} has referred ${ref} to your department: ${payload.reason}`,
      };
    case "work_order.transfer_decided":
      return {
        title: `Referral ${payload.decision}`,
        body: `Your referral of ${ref} to ${payload.toDepartment} was ${payload.decision}.`,
      };
    case "work_order.note_added":
      return {
        title: "New note on a shared work order",
        body: `${payload.authorName ?? "A colleague"} commented on ${ref}.`,
      };
    case "sla.breached":
      return {
        title: "SLA breached",
        body: `${ref} has passed its resolution deadline by ${payload.overdueMinutes} minutes.`,
      };
    case "sla.escalated":
      return {
        title: `Escalation level ${payload.level}`,
        body: `${ref} is ${payload.overdueMinutes} minutes overdue and has escalated to level ${payload.level}.`,
      };
    case "issue.resolution_confirmation_request":
      return {
        title: "Please confirm your issue is fixed",
        body: `${ref} has been marked resolved. Tell us whether the problem is actually gone.`,
      };
    default:
      return { title: "Samadhan update", body: "You have a new notification." };
  }
}

/** Which preference flag governs each template. */
function preferenceKeyFor(template: NotificationTemplate): "statusChanges" | "assignments" | "slaAlerts" {
  if (template === "work_order.assigned") return "assignments";
  if (template === "sla.breached" || template === "sla.escalated") return "slaAlerts";
  return "statusChanges";
}

export interface EnqueueInput {
  recipientId: string;
  template: NotificationTemplate;
  payload?: Record<string, unknown>;
}

export const notificationsService = {
  /**
   * Queues a notification per enabled channel. Rows are written as
   * `pending`; the pg-boss worker delivers them and flips the status, so a
   * delivery failure is visible in the table instead of vanishing.
   */
  async enqueue(input: EnqueueInput): Promise<void> {
    const prefs = await prisma.notificationPreference.findUnique({
      where: { userId: input.recipientId },
    });

    const key = preferenceKeyFor(input.template);
    // Absent preferences mean "not yet configured", which we treat as opted in.
    if (prefs && prefs[key] === false) {
      logger.debug({ template: input.template }, "Notification suppressed by user preference");
      return;
    }

    const channels: NotificationChannel[] = [];
    if (!prefs || prefs.inAppEnabled) channels.push("in_app");
    if (prefs?.emailEnabled) channels.push("email");
    if (channels.length === 0) return;

    await prisma.notification.createMany({
      data: channels.map((channel) => ({
        recipientId: input.recipientId,
        channel,
        template: input.template,
        payload: (input.payload ?? {}) as Prisma.InputJsonValue,
      })),
    });

    // Nudge any open SSE connection so the bell updates without a refresh.
    eventBus.emitIssueEvent({
      type: "issue.status_changed",
      issueId: String(input.payload?.issueId ?? ""),
      departmentIds: [],
      payload: { notificationFor: input.recipientId },
      at: new Date().toISOString(),
    });
  },

  /** Fan-out helper: same notification to many recipients, de-duplicated. */
  async enqueueMany(recipientIds: string[], template: NotificationTemplate, payload?: Record<string, unknown>) {
    const unique = [...new Set(recipientIds.filter(Boolean))];
    await Promise.all(unique.map((recipientId) => this.enqueue({ recipientId, template, payload })));
  },

  async listForUser(userId: string, opts: { unreadOnly?: boolean; limit?: number } = {}) {
    const rows = await prisma.notification.findMany({
      where: {
        recipientId: userId,
        channel: "in_app",
        ...(opts.unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: opts.limit ?? 30,
    });

    return rows.map((n) => {
      const copy = renderTemplate(n.template as NotificationTemplate, (n.payload ?? {}) as Record<string, any>);
      return {
        id: n.id,
        template: n.template,
        title: copy.title,
        body: copy.body,
        payload: n.payload,
        readAt: n.readAt,
        createdAt: n.createdAt,
      };
    });
  },

  async unreadCount(userId: string) {
    return prisma.notification.count({
      where: { recipientId: userId, channel: "in_app", readAt: null },
    });
  },

  async markRead(userId: string, ids?: string[]) {
    await prisma.notification.updateMany({
      where: {
        recipientId: userId,
        channel: "in_app",
        readAt: null,
        ...(ids?.length ? { id: { in: ids } } : {}),
      },
      data: { readAt: new Date() },
    });
  },
};
