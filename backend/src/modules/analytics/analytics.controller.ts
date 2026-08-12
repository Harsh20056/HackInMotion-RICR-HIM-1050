import { Router } from "express";
import { z } from "zod";
import { analyticsService } from "./analytics.service.js";
import { validate } from "../../shared/middleware/validate.js";

export const analyticsRouter = Router();

// Analytics are aggregate counts over public civic data — no per-citizen
// rows are ever returned, so these stay readable without auth (the citizen
// dashboard renders them too).

analyticsRouter.get("/overview", async (_req, res, next) => {
  try {
    res.json(await analyticsService.overview());
  } catch (err) {
    next(err);
  }
});

analyticsRouter.get("/departments", async (_req, res, next) => {
  try {
    res.json(await analyticsService.departments());
  } catch (err) {
    next(err);
  }
});

const hotspotsQuery = z.object({
  precision: z.coerce.number().min(0.001).max(1).optional(),
  minCount: z.coerce.number().int().min(1).max(100).optional(),
});

analyticsRouter.get("/hotspots", validate(hotspotsQuery, "query"), async (req, res, next) => {
  try {
    res.json(await analyticsService.hotspots(req.validatedQuery as z.infer<typeof hotspotsQuery>));
  } catch (err) {
    next(err);
  }
});

const trendsQuery = z.object({ months: z.coerce.number().int().min(1).max(24).default(6) });

analyticsRouter.get("/trends", validate(trendsQuery, "query"), async (req, res, next) => {
  try {
    const { months } = req.validatedQuery as z.infer<typeof trendsQuery>;
    res.json(await analyticsService.trends(months));
  } catch (err) {
    next(err);
  }
});
