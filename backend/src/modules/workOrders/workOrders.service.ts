import { WorkOrderStatus, IssueStatus } from "@prisma/client";
import { prisma } from "../../shared/lib/prisma.js";
import { NotFoundError, ValidationError, ForbiddenError } from "../../shared/errors/AppError.js";
import { UpdateWorkOrderStatusInput } from "./workOrders.schemas.js";
import { AccessTokenClaims } from "../../shared/lib/jwt.js";

/** Allowed forward transitions — anything not listed here is rejected. */
const ALLOWED_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  pending: ["acknowledged", "rejected"],
  acknowledged: ["in_progress", "rejected"],
  in_progress: ["done"],
  done: [],
  rejected: [],
};

/** Only a work order in the "primary" role drives the parent issue's own status. */
const WORK_ORDER_TO_ISSUE_STATUS: Record<WorkOrderStatus, IssueStatus> = {
  pending: "reported",
  acknowledged: "acknowledged",
  in_progress: "in_progress",
  done: "resolved",
  rejected: "rejected",
};

export const workOrdersService = {
  async updateStatus(workOrderId: string, input: UpdateWorkOrderStatusInput, actor: AccessTokenClaims) {
    const workOrder = await prisma.workOrder.findUnique({ where: { id: workOrderId }, include: { issue: true } });
    if (!workOrder) throw new NotFoundError("Work order not found");

    if (actor.role === "dept_admin" && actor.departmentId !== workOrder.departmentId) {
      throw new ForbiddenError("Not authorized for this department's work orders");
    }

    const allowedNext = ALLOWED_TRANSITIONS[workOrder.status];
    if (!allowedNext.includes(input.status)) {
      throw new ValidationError(
        `Invalid status transition: ${workOrder.status} -> ${input.status}. Allowed: ${allowedNext.join(", ") || "(none — terminal state)"}`
      );
    }

    const now = new Date();
    const isTerminal = input.status === "done" || input.status === "rejected";

    await prisma.$transaction(async (tx) => {
      await tx.workOrder.update({
        where: { id: workOrderId },
        data: { status: input.status, completedAt: isTerminal ? now : undefined },
      });

      if (workOrder.role === "primary") {
        const newIssueStatus = WORK_ORDER_TO_ISSUE_STATUS[input.status];
        await tx.issue.update({
          where: { id: workOrder.issueId },
          data: {
            status: newIssueStatus,
            acknowledgedAt: newIssueStatus === "acknowledged" ? now : undefined,
            resolvedAt: newIssueStatus === "resolved" ? now : undefined,
            closedAt: newIssueStatus === "rejected" ? now : undefined,
          },
        });

        await tx.issueStatusHistory.create({
          data: {
            issueId: workOrder.issueId,
            workOrderId,
            fromStatus: workOrder.issue.status,
            toStatus: newIssueStatus,
            actorId: actor.sub,
            actorRole: actor.role,
            reason: input.reason,
          },
        });
      } else {
        // Supporting/notify work orders don't drive the issue's own status,
        // but the transition is still recorded for a full audit trail.
        await tx.issueStatusHistory.create({
          data: {
            issueId: workOrder.issueId,
            workOrderId,
            fromStatus: workOrder.status,
            toStatus: input.status,
            actorId: actor.sub,
            actorRole: actor.role,
            reason: input.reason,
          },
        });
      }
    });

    return prisma.workOrder.findUnique({ where: { id: workOrderId } });
  },
};
