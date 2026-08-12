import { Router } from "express";
import { issuesService } from "./issues.service.js";
import { lifecycleService } from "./lifecycle.service.js";
import { verificationService } from "./verification.service.js";
import {
  createIssueSchema,
  listIssuesQuerySchema,
  confirmDuplicateSchema,
  transitionStatusSchema,
  reopenSchema,
  verifyIssueSchema,
} from "./issues.schemas.js";
import { validate } from "../../shared/middleware/validate.js";
import { authenticate, authenticateSse, optionalAuthenticate } from "../../shared/middleware/authenticate.js";
import { uuidParam } from "../../shared/schemas/common.js";
import { writeAuditLog } from "../../shared/lib/auditLog.js";
import { openSseStream } from "../../shared/lib/sse.js";
import { eventBus } from "../../shared/lib/eventBus.js";

export const issuesRouter = Router();

issuesRouter.get("/", validate(listIssuesQuerySchema, "query"), async (req, res, next) => {
  try {
    res.json(await issuesService.list(req.validatedQuery as any));
  } catch (err) {
    next(err);
  }
});

issuesRouter.get("/:id", validate(uuidParam("id"), "params"), async (req, res, next) => {
  try {
    res.json(await issuesService.getById(req.params.id as string));
  } catch (err) {
    next(err);
  }
});

issuesRouter.post("/", authenticate, validate(createIssueSchema), async (req, res, next) => {
  try {
    const result = await issuesService.create(req.body, req.auth!.sub);
    if ("duplicateCandidate" in result) {
      res.status(200).json(result);
      return;
    }
    await writeAuditLog(req, { action: "issue.create", entityType: "issue", entityId: result.issue.id, after: result.issue });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

issuesRouter.post(
  "/:id/confirm-duplicate",
  authenticate,
  validate(uuidParam("id"), "params"),
  validate(confirmDuplicateSchema),
  async (req, res, next) => {
    try {
      const issue = await issuesService.confirmDuplicate(req.body, req.auth!.sub);
      await writeAuditLog(req, { action: "issue.confirm_duplicate", entityType: "issue", entityId: issue.id });
      res.status(200).json(issue);
    } catch (err) {
      next(err);
    }
  }
);

issuesRouter.post("/:id/support", authenticate, validate(uuidParam("id"), "params"), async (req, res, next) => {
  try {
    const issue = await issuesService.support(req.params.id as string, req.auth!.sub);
    res.status(200).json(issue);
  } catch (err) {
    next(err);
  }
});

issuesRouter.delete("/:id/support", authenticate, validate(uuidParam("id"), "params"), async (req, res, next) => {
  try {
    await issuesService.unsupport(req.params.id as string, req.auth!.sub);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ── Lifecycle (PS #5) ──────────────────────────────────────────────────────

/** Canonical status transition. Illegal moves are rejected with 422. */
issuesRouter.patch(
  "/:id/status",
  authenticate,
  validate(uuidParam("id"), "params"),
  validate(transitionStatusSchema),
  async (req, res, next) => {
    try {
      const id = req.params.id as string;
      const updated = await lifecycleService.transition(id, req.body, req.auth!);
      await writeAuditLog(req, {
        action: `issue.status.${req.body.status}`,
        entityType: "issue",
        entityId: id,
        after: { status: req.body.status, reason: req.body.reason ?? null },
      });
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }
);

issuesRouter.get("/:id/history", validate(uuidParam("id"), "params"), async (req, res, next) => {
  try {
    res.json({ items: await lifecycleService.history(req.params.id as string) });
  } catch (err) {
    next(err);
  }
});

/** Citizen accepts the department's resolution -> verified. */
issuesRouter.post(
  "/:id/confirm-resolution",
  authenticate,
  validate(uuidParam("id"), "params"),
  async (req, res, next) => {
    try {
      const id = req.params.id as string;
      const updated = await lifecycleService.transition(
        id,
        { status: "verified", reason: req.body?.reason ?? "Citizen confirmed the resolution" },
        req.auth!
      );
      await writeAuditLog(req, { action: "issue.confirm_resolution", entityType: "issue", entityId: id });
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }
);

/** Citizen disputes a resolution or rejection -> reopened. */
issuesRouter.post(
  "/:id/reopen",
  authenticate,
  validate(uuidParam("id"), "params"),
  validate(reopenSchema),
  async (req, res, next) => {
    try {
      const id = req.params.id as string;
      const updated = await lifecycleService.transition(
        id,
        { status: "reopened", reason: req.body.reason },
        req.auth!
      );
      await writeAuditLog(req, { action: "issue.reopen", entityType: "issue", entityId: id });
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }
);

// ── Community verification (PS Challenge) ──────────────────────────────────

issuesRouter.get(
  "/:id/verification",
  optionalAuthenticate,
  validate(uuidParam("id"), "params"),
  async (req, res, next) => {
    try {
      res.json(await verificationService.getState(req.params.id as string, req.auth?.sub));
    } catch (err) {
      next(err);
    }
  }
);

issuesRouter.post(
  "/:id/verify",
  authenticate,
  validate(uuidParam("id"), "params"),
  validate(verifyIssueSchema),
  async (req, res, next) => {
    try {
      res.json(await verificationService.vote(req.params.id as string, req.auth!.sub, req.body.vote));
    } catch (err) {
      next(err);
    }
  }
);

// ── Real-time (PS #5) ──────────────────────────────────────────────────────

/** SSE stream of events for a single issue. Token may come via ?token=. */
issuesRouter.get("/:id/stream", authenticateSse, validate(uuidParam("id"), "params"), (req, res) => {
  const issueId = req.params.id as string;
  openSseStream(req, res, (push) => eventBus.onIssue(issueId, push));
});
