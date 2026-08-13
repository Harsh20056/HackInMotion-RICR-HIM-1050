import { prisma } from "../shared/lib/prisma.js";
import { logger } from "../shared/lib/logger.js";
import { slaService, EscalationStep } from "../modules/sla/sla.service.js";
import { notificationsService } from "../modules/notifications/notifications.service.js";

/**
 * SLA sweeper. Runs every 5 minutes and is deliberately idempotent: the
 * unique (work_order_id, level) index on escalations means a re-run — or two
 * overlapping runs — cannot double-escalate or double-notify.
 */

const DEFAULT_CHAIN: EscalationStep[] = [
  { level: 1, afterMinutes: 0, notify: "department_head" },
  { level: 2, afterMinutes: 60 * 24, notify: "super_admin" },
];

/** Who should hear about a breach at this level. */
async function resolveRecipients(step: EscalationStep, departmentId: string): Promise<string[]> {
  if (step.notify === "super_admin") {
    const admins = await prisma.user.findMany({ where: { role: "super_admin" }, select: { id: true } });
    return admins.map((a) => a.id);
  }
  const heads = await prisma.user.findMany({
    where: { departmentId, role: "dept_admin" },
    select: { id: true },
  });
  return heads.map((h) => h.id);
}

export async function runSlaSweep(now = new Date()): Promise<{ breached: number; escalated: number }> {
  const overdue = await prisma.workOrder.findMany({
    where: {
      dueAt: { not: null, lt: now },
      status: { notIn: ["done", "rejected"] },
    },
    include: {
      slaPolicy: true,
      issue: { select: { id: true, publicRef: true, title: true } },
      department: { select: { id: true, nameEn: true } },
    },
    take: 500,
  });

  let breached = 0;
  let escalated = 0;

  for (const wo of overdue) {
    const overdueMinutes = Math.floor((now.getTime() - wo.dueAt!.getTime()) / 60_000);

    // First time past due: stamp the breach.
    if (!wo.breachedAt) {
      await prisma.workOrder.update({ where: { id: wo.id }, data: { breachedAt: now } });
      breached++;
    }

    const chain = wo.slaPolicy ? slaService.escalationChain(wo.slaPolicy) : DEFAULT_CHAIN;
    const steps = (chain.length > 0 ? chain : DEFAULT_CHAIN).sort((a, b) => a.level - b.level);

    // Highest level whose delay has already elapsed.
    const due = steps.filter((s) => overdueMinutes >= s.afterMinutes);
    if (due.length === 0) continue;
    const target = due[due.length - 1];
    if (target.level <= wo.escalationLevel) continue;

    // Fire every level between the current one and the target, so a long
    // outage doesn't skip the intermediate audit rows.
    for (const step of due.filter((s) => s.level > wo.escalationLevel)) {
      const recipients = await resolveRecipients(step, wo.departmentId);

      try {
        await prisma.escalation.create({
          data: {
            workOrderId: wo.id,
            level: step.level,
            reason: `Resolution SLA breached by ${overdueMinutes} minutes`,
            breachedAt: wo.breachedAt ?? now,
            overdueMinutes,
            notifiedUserId: recipients[0] ?? null,
          },
        });
      } catch (err: any) {
        // P2002 = this level already recorded by an earlier sweep.
        if (err?.code === "P2002") continue;
        throw err;
      }

      await notificationsService.enqueueMany(recipients, step.level === 1 ? "sla.breached" : "sla.escalated", {
        workOrderId: wo.id,
        issueId: wo.issueId,
        publicRef: wo.issue.publicRef,
        issueTitle: wo.issue.title,
        department: wo.department.nameEn,
        level: step.level,
        overdueMinutes,
      });

      escalated++;
    }

    await prisma.workOrder.update({
      where: { id: wo.id },
      data: { escalationLevel: target.level },
    });
  }

  if (breached || escalated) {
    logger.info({ breached, escalated }, "SLA sweep complete");
  }
  return { breached, escalated };
}
