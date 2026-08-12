import { Router } from "express";
import { issuesService } from "./issues.service.js";
import { createIssueSchema, listIssuesQuerySchema, confirmDuplicateSchema } from "./issues.schemas.js";
import { validate } from "../../shared/middleware/validate.js";
import { authenticate } from "../../shared/middleware/authenticate.js";
import { uuidParam } from "../../shared/schemas/common.js";
import { writeAuditLog } from "../../shared/lib/auditLog.js";

export const issuesRouter = Router();

issuesRouter.get("/", validate(listIssuesQuerySchema, "query"), async (req, res, next) => {
  try {
    res.json(await issuesService.list(req.query as any));
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
