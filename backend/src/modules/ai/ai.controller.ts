import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../shared/lib/prisma.js";
import { validate } from "../../shared/middleware/validate.js";
import { authenticate, optionalAuthenticate } from "../../shared/middleware/authenticate.js";
import { uuidParam } from "../../shared/schemas/common.js";
import { writeAuditLog } from "../../shared/lib/auditLog.js";
import { ForbiddenError } from "../../shared/errors/AppError.js";
import { isAdministrator } from "../../shared/middleware/rbac.js";
import { decompositionService } from "./decomposition.service.js";
import { categoriseService } from "./categorise.service.js";
import { hotspotsService } from "./hotspots.service.js";
import { visionService } from "./vision.service.js";
import { aiEnabled, visionEnabled } from "./providers/index.js";

export const aiRouter = Router();

/** Lets the UI hide AI affordances instead of showing dead controls. */
aiRouter.get("/status", async (_req, res) => {
  res.json({ enabled: aiEnabled(), vision: visionEnabled() });
});

// ── Coordination plans ─────────────────────────────────────────────────────

/** The rationale behind an issue's routing. Read by the admin panel. */
aiRouter.get(
  "/issues/:id/coordination-plan",
  optionalAuthenticate,
  validate(uuidParam("id"), "params"),
  async (req, res, next) => {
    try {
      res.json({ items: await decompositionService.forIssue(req.params.id as string) });
    } catch (err) {
      next(err);
    }
  }
);

const overrideSchema = z.object({
  action: z.enum(["apply", "reject"]),
  note: z.string().max(1000).optional(),
});

/** A human accepting or rejecting a suggested plan. Always audited. */
aiRouter.post(
  "/coordination-plans/:id/override",
  authenticate,
  validate(uuidParam("id"), "params"),
  validate(overrideSchema),
  async (req, res, next) => {
    try {
      const id = req.params.id as string;
      const updated = await decompositionService.override(id, req.body, req.auth!);
      await writeAuditLog(req, {
        action: `ai.coordination_plan.${req.body.action}`,
        entityType: "coordination_plan",
        entityId: id,
        after: { action: req.body.action, note: req.body.note ?? null },
      });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  }
);

// ── Category suggestion ────────────────────────────────────────────────────

const suggestSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().min(1).max(5000),
  imageUrl: z.string().url().optional(),
});

/**
 * Suggestion for the report form. Returns 200 with suggestion:null when AI is
 * unavailable, so the form never has to special-case an error.
 */
aiRouter.post("/suggest-category", authenticate, validate(suggestSchema), async (req, res, next) => {
  try {
    res.json({ suggestion: await categoriseService.suggest(req.body) });
  } catch (err) {
    next(err);
  }
});

// ── Metrics + review queues ────────────────────────────────────────────────

/** Suggestion-vs-citizen agreement, plus per-kind call stats for the demo. */
aiRouter.get("/metrics", authenticate, async (req, res, next) => {
  try {
    if (!isAdministrator(req.auth!.role)) {
      throw new ForbiddenError("Staff only.");
    }
    const [accuracy, calls] = await Promise.all([
      categoriseService.accuracy(),
      prisma.aiCall.groupBy({
        by: ["kind", "provider", "ok"],
        _count: { _all: true },
        _avg: { latencyMs: true },
        _sum: { promptTokens: true, outputTokens: true },
      }),
    ]);
    res.json({
      categorisation: accuracy,
      calls: calls.map((c) => ({
        kind: c.kind,
        provider: c.provider,
        ok: c.ok,
        count: c._count._all,
        avgLatencyMs: Math.round(c._avg.latencyMs ?? 0),
        promptTokens: c._sum.promptTokens ?? 0,
        outputTokens: c._sum.outputTokens ?? 0,
      })),
    });
  } catch (err) {
    next(err);
  }
});

/** Closures the model thought were worth a second look. Advisory queue. */
aiRouter.get("/flagged-resolutions", authenticate, async (req, res, next) => {
  try {
    if (req.auth!.role !== "super_admin") throw new ForbiddenError("Super admin only.");
    res.json({ items: await visionService.flaggedResolutions() });
  } catch (err) {
    next(err);
  }
});

// ── Recurring hotspots (statistical) ───────────────────────────────────────

const hotspotQuery = z.object({
  // Default 2: a pattern needs at least two years to be a pattern. Lowerable
  // for a dataset that does not yet span multiple years.
  minYears: z.coerce.number().int().min(1).max(10).default(2),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

aiRouter.get("/hotspots/recurring", validate(hotspotQuery, "query"), async (req, res, next) => {
  try {
    const q = req.validatedQuery as z.infer<typeof hotspotQuery>;
    res.json(await hotspotsService.recurring(q));
  } catch (err) {
    next(err);
  }
});
