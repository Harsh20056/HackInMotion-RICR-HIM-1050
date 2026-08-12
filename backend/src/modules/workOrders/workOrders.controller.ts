import { Router } from "express";
import { workOrdersService } from "./workOrders.service.js";
import { updateWorkOrderStatusSchema } from "./workOrders.schemas.js";
import { validate } from "../../shared/middleware/validate.js";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { requireRole } from "../../shared/middleware/rbac.js";
import { uuidParam } from "../../shared/schemas/common.js";

export const workOrdersRouter = Router();

workOrdersRouter.patch(
  "/:id/status",
  authenticate,
  requireRole("dept_admin", "super_admin"),
  validate(uuidParam("id"), "params"),
  validate(updateWorkOrderStatusSchema),
  async (req, res, next) => {
    try {
      const workOrder = await workOrdersService.updateStatus(req.params.id as string, req.body, req.auth!);
      res.status(200).json(workOrder);
    } catch (err) {
      next(err);
    }
  }
);
