import { Router } from "express";
import { prisma } from "../../shared/lib/prisma.js";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { requireDepartmentAccess } from "../../shared/middleware/rbac.js";
import { validate } from "../../shared/middleware/validate.js";
import { uuidParam, paginationQuery } from "../../shared/schemas/common.js";

export const departmentsRouter = Router();

/** RBAC-scoped: super_admin sees any department's queue, dept_admin only their own. */
departmentsRouter.get(
  "/:departmentId/queue",
  authenticate,
  validate(uuidParam("departmentId"), "params"),
  requireDepartmentAccess("departmentId"),
  validate(paginationQuery, "query"),
  async (req, res, next) => {
    try {
      const { page, pageSize } = req.query as unknown as { page: number; pageSize: number };
      const departmentId = req.params.departmentId as string;

      const [workOrders, total] = await Promise.all([
        prisma.workOrder.findMany({
          where: { departmentId },
          include: {
            issue: { include: { category: true } },
            assignee: { select: { id: true, fullName: true } },
          },
          orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.workOrder.count({ where: { departmentId } }),
      ]);

      res.json({
        items: workOrders.map((wo) => ({
          workOrderId: wo.id,
          status: wo.status,
          role: wo.role,
          priority: wo.priority,
          assignee: wo.assignee,
          createdAt: wo.createdAt,
          issue: {
            id: wo.issue.id,
            publicRef: wo.issue.publicRef,
            title: wo.issue.title,
            category: { code: wo.issue.category.code, nameEn: wo.issue.category.nameEn },
            status: wo.issue.status,
            priority: wo.issue.priority,
          },
        })),
        page,
        pageSize,
        total,
      });
    } catch (err) {
      next(err);
    }
  }
);
